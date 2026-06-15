import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { checkCsrfSafety } from "@/lib/csrf";
import { verifyAdminSession } from "@/lib/admin-auth";

type BusinessRecord = {
  id: string;
  name: string | null;
  website_url: string | null;
  support_email: string | null;
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function buildCustomerEmailHtml(
  businessId: string,
  businessName: string | null,
) {
  const embedScript = `<script src="https://www.embedbot.dk/widget.js?id=${businessId}"></script>`;
  const firstName = (businessName || "").split(" ")[0] || "der";
  const escapedFirstName = firstName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedScript = embedScript
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `
    <div style="margin:0;padding:32px 16px;background:#f9f9f9;font-family:Arial,sans-serif;color:#111;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e6e6;border-radius:8px;padding:36px 32px;">
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#111;">Hej ${escapedFirstName},</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#111;">Din AI-chatbot er nu klar til at gå live på din webshop.</p>
        <p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#111;">Indsæt denne kode lige før <code style="font-family:Consolas,Monaco,monospace;font-size:13px;">&lt;/body&gt;</code> på din hjemmeside:</p>
        <div style="background:#111111;color:#f9f9f9;border-radius:6px;padding:16px;font-family:Consolas,Monaco,monospace;font-size:13px;line-height:1.5;word-break:break-all;margin:0 0 24px;">
          ${escapedScript}
        </div>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#111;">Det er det hele. Bogstaveligt talt.</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#111;">Har du spørgsmål, så svar bare på denne mail.</p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#111;">// Axel fra EmbedBot</p>
      </div>
    </div>
  `;
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

    const { business_id } = await req.json();

    if (!business_id || typeof business_id !== "string") {
      return NextResponse.json({ success: false, error: "Mangler business_id." }, { status: 400 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Serveren mangler environment variables." },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!appUrl) {
      return NextResponse.json(
        { success: false, error: "Serveren mangler NEXT_PUBLIC_APP_URL." },
        { status: 500 }
      );
    }

    let ingestEndpoint = "";
    try {
      ingestEndpoint = new URL("/api/ingest", appUrl).toString();
    } catch {
      return NextResponse.json(
        { success: false, error: "NEXT_PUBLIC_APP_URL er ugyldig." },
        { status: 500 }
      );
    }

    if (!resend) {
      return NextResponse.json(
        { success: false, error: "Resend-klient kunne ikke initialiseres." },
        { status: 500 }
      );
    }

    const { data: businessRows, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, website_url, support_email")
      .eq("id", business_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<BusinessRecord[]>();

    const business = businessRows?.[0] || null;

    if (businessError || !business) {
      return NextResponse.json(
        { success: false, error: businessError?.message || "Virksomhed ikke fundet." },
        { status: 404 }
      );
    }

    if (!business.website_url) {
      return NextResponse.json(
        { success: false, error: "Virksomheden mangler website_url." },
        { status: 400 }
      );
    }

    if (!business.support_email) {
      return NextResponse.json(
        { success: false, error: "Virksomheden mangler support_email." },
        { status: 400 }
      );
    }

    const ingestRes = await fetch(ingestEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: business.website_url, business_id }),
    });

    const ingestData = await ingestRes.json();
    if (!ingestRes.ok || !ingestData.success) {
      return NextResponse.json(
        { success: false, error: ingestData.error || "Ingest fejlede." },
        { status: ingestRes.status || 502 }
      );
    }

    await resend.emails.send({
      from: "axel@embedbot.dk",
      to: business.support_email,
      subject: "Din EmbedBot er klar! 🎉",
      html: buildCustomerEmailHtml(business_id, business.name),
    });

    const { error: updateError } = await supabase
      .from("businesses")
      .update({ activated: true })
      .eq("id", business_id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Kunne ikke opdatere aktiv status: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: false, error: "Ukendt serverfejl." }, { status: 500 });
  }
}
