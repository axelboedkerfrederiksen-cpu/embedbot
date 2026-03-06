import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend } from "@/lib/resend";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  const { form, user_id } = await req.json();

  await supabase.from("businesses").upsert({ id: user_id, ...form });

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "axel.boedker.frederiksen@gmail.com",
    subject: `Ny chatbot ordre: ${form.name}`,
    html: `
      <h2>Ny chatbot ordre fra ${form.name}</h2>
      <p><b>Hjemmeside:</b> ${form.website_url}</p>
      <p><b>Branche:</b> ${form.industry}</p>
      <p><b>Beskrivelse:</b> ${form.description}</p>
      <hr/>
      <h3>Kontakt</h3>
      <p><b>Email:</b> ${form.support_email}</p>
      <p><b>Telefon:</b> ${form.phone}</p>
      <p><b>Adresse:</b> ${form.address}, ${form.city}</p>
      <hr/>
      <h3>Åbningstider</h3>
      <p><b>Man-fre:</b> ${form.hours_weekday}</p>
      <p><b>Lørdag:</b> ${form.hours_saturday}</p>
      <p><b>Søndag:</b> ${form.hours_sunday}</p>
      <hr/>
      <h3>Support</h3>
      <p><b>Svartid:</b> ${form.response_time}</p>
      <p><b>Fallback:</b> ${form.fallback_action}</p>
      <p><b>Klager:</b> ${form.complaint_action}</p>
      <hr/>
      <h3>Produkter/Services</h3>
      <p>${form.products_services}</p>
      <p><b>Levering:</b> ${form.delivery_time}</p>
      <p><b>Retur:</b> ${form.return_policy}</p>
      <p><b>Betaling:</b> ${form.payment_methods}</p>
      <hr/>
      <h3>Chatbot indstillinger</h3>
      <p><b>Velkomst:</b> ${form.welcome_message}</p>
      <p><b>Tone:</b> ${form.tone}</p>
      <p><b>Sprog:</b> ${form.language}</p>
      <hr/>
      <h3>FAQ</h3>
      <pre>${form.faq}</pre>
      <hr/>
      <h3>Valgfrit</h3>
      <p><b>CVR:</b> ${form.cvr}</p>
      <p><b>Sociale medier:</b> ${form.social_media}</p>
      <p><b>Tilbud:</b> ${form.current_offers}</p>
      <p><b>Garanti:</b> ${form.warranty}</p>
      <p><b>Størrelsesguide:</b> ${form.size_guide}</p>
      <hr/>
      <p><b>User ID:</b> ${user_id}</p>
    `,
  });

  return NextResponse.json({ success: true });
}