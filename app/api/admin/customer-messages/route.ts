import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkCsrfSafety } from "@/lib/csrf";
import { verifyAdminSession } from "@/lib/admin-auth";

function normalizeString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeActionUrl(value: unknown): string | null {
  const input = normalizeString(value, 1000);
  if (!input) return null;
  if (input.startsWith("/") && !input.startsWith("//")) return input;

  try {
    const parsed = new URL(input);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = await checkCsrfSafety(req, true);
    if (!csrfCheck.safe) {
      return NextResponse.json({ success: false, error: csrfCheck.error }, { status: 403 });
    }

    const authResult = await verifyAdminSession(req);
    if ("error" in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ success: false, error: "Serveren mangler Supabase-konfiguration." }, { status: 500 });
    }

    const body = await req.json();
    const businessId = normalizeString(body.business_id, 80);
    const title = normalizeString(body.title, 160);
    const messageBody = normalizeString(body.body, 5000);
    const actionInput = normalizeString(body.action_url, 1000);
    const actionUrl = normalizeActionUrl(actionInput);
    const actionLabel = actionUrl ? normalizeString(body.action_label, 80) || "Åbn" : null;

    if (!businessId || !title || !messageBody) {
      return NextResponse.json({ success: false, error: "Udfyld kunde, overskrift og besked." }, { status: 400 });
    }
    if (actionInput && !actionUrl) {
      return NextResponse.json({ success: false, error: "Knappens link skal være en sikker https-adresse eller en intern sti." }, { status: 400 });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id,user_id")
      .eq("id", businessId)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json({ success: false, error: businessError?.message || "Kunden blev ikke fundet." }, { status: 404 });
    }
    if (!business.user_id) {
      return NextResponse.json({ success: false, error: "Kunden har endnu ikke et dashboard-login." }, { status: 409 });
    }

    const { data: customerMessage, error: insertError } = await supabase
      .from("customer_messages")
      .insert({
        business_id: businessId,
        sender: "admin",
        title,
        body: messageBody,
        action_url: actionUrl,
        action_label: actionLabel,
      })
      .select("id,business_id,sender,title,body,action_url,action_label,read_at,created_at")
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: customerMessage });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ukendt serverfejl." },
      { status: 500 },
    );
  }
}
