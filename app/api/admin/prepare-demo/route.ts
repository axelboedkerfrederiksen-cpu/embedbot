import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { checkCsrfSafety } from "@/lib/csrf";
import { verifyAdminSession } from "@/lib/admin-auth";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: "Serveren mangler database- eller AI-konfiguration." }, { status: 500 });
    }

    const body = await req.json();
    const businessId = typeof body.business_id === "string" ? body.business_id.trim() : "";
    if (!businessId) {
      return NextResponse.json({ success: false, error: "Mangler business_id." }, { status: 400 });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, website_url, support_email, activated")
      .eq("id", businessId)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json({ success: false, error: businessError?.message || "Virksomhed ikke fundet." }, { status: 404 });
    }

    if (business.activated) {
      return NextResponse.json({ success: false, error: "Virksomheden er allerede aktiv. Brug pilot-handlingen efter godkendelse." }, { status: 409 });
    }

    const websiteUrl = typeof business.website_url === "string" ? business.website_url.trim() : "";
    const supportEmail = typeof business.support_email === "string" ? business.support_email.trim() : "";
    if (!websiteUrl || !supportEmail) {
      return NextResponse.json({ success: false, error: "Virksomheden skal have både website og kontaktmail." }, { status: 400 });
    }

    const { count: existingDocumentCount, error: documentCountError } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    if (documentCountError) {
      return NextResponse.json({ success: false, error: `Kunne ikke kontrollere webshopviden: ${documentCountError.message}` }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!appUrl) {
      return NextResponse.json({ success: false, error: "Serveren mangler NEXT_PUBLIC_APP_URL." }, { status: 500 });
    }

    let ingestEndpoint: string;
    let previewUrl: string;
    try {
      ingestEndpoint = new URL("/api/ingest", appUrl).toString();
      previewUrl = new URL(`/preview/${encodeURIComponent(businessId)}`, appUrl).toString();
    } catch {
      return NextResponse.json({ success: false, error: "NEXT_PUBLIC_APP_URL er ugyldig." }, { status: 500 });
    }

    let chunks = 0;
    if (!existingDocumentCount) {
      const ingestResponse = await fetch(ingestEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl, business_id: businessId }),
      });
      const ingestData = await ingestResponse.json().catch(() => ({} as { success?: boolean; error?: string; chunks?: number }));
      if (!ingestResponse.ok || !ingestData.success) {
        return NextResponse.json({ success: false, error: ingestData.error || "Kunne ikke læse webshoppen." }, { status: ingestResponse.status || 502 });
      }
      chunks = typeof ingestData.chunks === "number" ? ingestData.chunks : 0;
    }

    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    if (!resend) {
      return NextResponse.json({ success: false, error: "Resend er ikke konfigureret." }, { status: 500 });
    }

    const businessName = typeof business.name === "string" && business.name.trim() ? business.name.trim() : "der";
    const firstName = escapeHtml(businessName.split(/\s+/)[0] || "der");
    const safeBusinessName = escapeHtml(businessName);
    const { error: mailError } = await resend.emails.send({
      from: "axel@embedbot.dk",
      to: supportEmail,
      subject: `Privat EmbedBot-demo til ${businessName}`,
      html: `
        <div style="margin:0;padding:32px 16px;background:#f9f9f9;font-family:Arial,sans-serif;color:#111;">
          <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6e6e6;border-radius:8px;padding:36px 32px;">
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">Hej ${firstName},</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">Jeg har bygget en privat EmbedBot-demo ud fra indholdet på ${safeBusinessName}.</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">Prøv den her: <a href="${escapeHtml(previewUrl)}" style="color:#111;font-weight:700;">Åbn privat demo</a></p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">Siden er kun til gennemgang. Intet bliver vist til jeres kunder, og ingen 14-dages pilot er startet endnu.</p>
            <p style="margin:0;font-size:15px;line-height:1.7;">Svar gerne med de spørgsmål, chatbotten skal kunne besvare — eller skriv bare, hvis I vil have den fjernet.</p>
            <p style="margin:20px 0 0;font-size:15px;line-height:1.7;">// Axel fra EmbedBot</p>
          </div>
        </div>
      `,
    });

    if (mailError) {
      return NextResponse.json({ success: false, error: `Kunne ikke sende demo-mailen: ${mailError.message}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, previewUrl, chunks, reusedExistingKnowledge: Boolean(existingDocumentCount) });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ukendt serverfejl." },
      { status: 500 },
    );
  }
}
