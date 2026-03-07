import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend } from "@/lib/resend";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function isOnConflictConstraintError(errorMessage: string) {
  return errorMessage.toLowerCase().includes("no unique or exclusion constraint matching the on conflict specification");
}

async function persistBusinessPayload(payload: Record<string, unknown> & { id: string }) {
  const { error } = await supabase
    .from("businesses")
    .upsert(payload, { onConflict: "id" });

  if (!error || !isOnConflictConstraintError(error.message)) {
    return { error };
  }

  const { data: existingRows, error: findError } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", payload.id)
    .limit(1);

  if (findError) {
    return { error: findError };
  }

  if (existingRows && existingRows.length > 0) {
    const updateResult = await supabase
      .from("businesses")
      .update(payload)
      .eq("id", payload.id);

    return { error: updateResult.error };
  }

  const insertResult = await supabase
    .from("businesses")
    .insert(payload);

  return { error: insertResult.error };
}

export async function POST(req: NextRequest) {
  try {
    const { form, user_id, business_id } = await req.json();
    const stableBusinessId = business_id || user_id;

    if (!stableBusinessId) {
      return NextResponse.json({ success: false, error: "Mangler business_id." }, { status: 400 });
    }

    if (!form || typeof form !== "object") {
      return NextResponse.json({ success: false, error: "Mangler form-data." }, { status: 400 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Serveren mangler nødvendige environment variables." },
        { status: 500 }
      );
    }

    const fullPayload = { id: stableBusinessId, ...form };
    let { error: upsertError } = await persistBusinessPayload(fullPayload);

    // If branding columns are not migrated yet, retry with the stable core fields.
    if (upsertError && upsertError.message.toLowerCase().includes("column")) {
      const safePayload = {
        id: stableBusinessId,
        name: form.name,
        website_url: form.website_url,
        industry: form.industry,
        description: form.description,
        support_email: form.support_email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        hours_weekday: form.hours_weekday,
        hours_saturday: form.hours_saturday,
        hours_sunday: form.hours_sunday,
        response_time: form.response_time,
        fallback_action: form.fallback_action,
        complaint_action: form.complaint_action,
        products_services: form.products_services,
        delivery_time: form.delivery_time,
        return_policy: form.return_policy,
        payment_methods: form.payment_methods,
        welcome_message: form.welcome_message,
        tone: form.tone,
        language: form.language,
        faq: form.faq,
        cvr: form.cvr,
        social_media: form.social_media,
        current_offers: form.current_offers,
        warranty: form.warranty,
        size_guide: form.size_guide,
      };

      const retry = await persistBusinessPayload(safePayload);
      upsertError = retry.error;
    }

    if (upsertError) {
      return NextResponse.json(
        { success: false, error: `Kunne ikke gemme virksomhedsdata: ${upsertError.message}` },
        { status: 500 }
      );
    }

    const mailResult = await resend.emails.send({
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
      <h3>Design & Branding</h3>
      <p><b>Primærfarve:</b> ${form.primary_color || "-"}</p>
      <p><b>Sekundærfarve:</b> ${form.secondary_color || "-"}</p>
      <p><b>Chat-ikon farve:</b> ${form.chat_icon_color || "-"}</p>
      <p><b>Font:</b> ${form.font_choice || "-"}</p>
      <p><b>Logo fil:</b> ${form.logo_file_name || "-"}</p>
      <hr/>
      <p><b>Business ID:</b> ${stableBusinessId}</p>
    `,
    });

    if ((mailResult as { error?: { message?: string } })?.error) {
      return NextResponse.json(
        {
          success: false,
          error: `Virksomheden blev gemt, men email kunne ikke sendes: ${(mailResult as { error?: { message?: string } }).error?.message || "Ukendt mailfejl."}`,
        },
        { status: 502 }
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