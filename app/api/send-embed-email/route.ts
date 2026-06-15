import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: NextRequest) {
  try {
    const { business_id } = await req.json();
    const stableId = typeof business_id === "string" ? business_id.trim() : "";

    if (!stableId) {
      return NextResponse.json({ success: false, error: "Mangler business_id." }, { status: 400 });
    }

    if (!resend) {
      return NextResponse.json({ success: false, error: "Resend ikke konfigureret." }, { status: 500 });
    }

    const { data: row, error } = await supabase
      .from("businesses")
      .select("name, support_email")
      .eq("id", stableId)
      .single();

    if (error || !row) {
      return NextResponse.json({ success: false, error: "Virksomhed ikke fundet." }, { status: 404 });
    }

    if (!row.support_email) {
      return NextResponse.json({ success: false, error: "Ingen kundemail på virksomheden." }, { status: 400 });
    }

    const embedScript = `<script src="https://www.embedbot.dk/widget.js?id=${stableId}"></script>`;
    const escapedScript = embedScript.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const firstName = (String(row.name || "")).split(" ")[0] || "der";
    const escapedFirstName = firstName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const { error: mailError } = await resend.emails.send({
      from: "axel@embedbot.dk",
      to: row.support_email.trim(),
      subject: "Din EmbedBot er klar 🎉",
      html: `
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
      `,
    });

    if (mailError) {
      return NextResponse.json({ success: false, error: mailError.message }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: "Ukendt fejl." }, { status: 500 });
  }
}
