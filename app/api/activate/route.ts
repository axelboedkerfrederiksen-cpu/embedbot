import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

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

const resend = new Resend(process.env.RESEND_API_KEY);

function buildCustomerEmailHtml(businessId: string, businessName: string | null) {
  const embedScript = `<script src="https://embedbot1.vercel.app/widget.js?id=${businessId}"></script>`;

  return `
    <div style="margin:0;padding:24px;background:#f5f5f5;font-family:Arial,sans-serif;color:#111;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e6e6e6;border-radius:12px;overflow:hidden;">
        <div style="padding:28px 24px 16px;">
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#000;">Din EmbedBot chatbot er klar! 🎉</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">
            Hej${businessName ? ` ${businessName}` : ""},
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">
            Din chatbot er nu aktiveret og klar til brug. Indsæt scriptet herunder i din hjemmeside,
            lige før <code style="background:#f0f0f0;padding:1px 5px;border-radius:4px;">&lt;/body&gt;</code>.
          </p>
          <div style="background:#111;color:#f9f9f9;border-radius:10px;padding:14px;font-family:Consolas,Monaco,monospace;font-size:13px;line-height:1.5;word-break:break-all;">
            ${embedScript
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}
          </div>
          <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#555;">
            Hvis du har spørgsmål, er du velkommen til at svare på denne email.
          </p>
        </div>
        <div style="padding:14px 24px;background:#fafafa;border-top:1px solid #ededed;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#666;">EmbedBot - AI kundeservice til din hjemmeside</p>
        </div>
      </div>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  try {
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

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, website_url, support_email")
      .eq("id", business_id)
      .single<BusinessRecord>();

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

    const ingestRes = await fetch(`${req.nextUrl.origin}/api/ingest`, {
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
      from: "onboarding@resend.dev",
      to: business.support_email,
      subject: "Din EmbedBot chatbot er klar! 🎉",
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
