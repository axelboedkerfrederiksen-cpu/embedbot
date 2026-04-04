import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { resend } from "@/lib/resend";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function isOnConflictConstraintError(errorMessage: string) {
  return errorMessage.toLowerCase().includes("no unique or exclusion constraint matching the on conflict specification");
}

function isMissingColumnError(errorMessage: string, columnName: string) {
  const normalized = errorMessage.toLowerCase();
  const lowerColumn = columnName.toLowerCase();
  return (
    normalized.includes(`could not find the '${lowerColumn}' column`) ||
    normalized.includes(`column \"${lowerColumn}\"`) ||
    normalized.includes(`column ${lowerColumn}`) ||
    normalized.includes(`column businesses.${lowerColumn}`)
  );
}

function extractMissingColumnName(errorMessage: string): string | null {
  const normalized = errorMessage.toLowerCase();
  const patterns = [
    /could not find the '([a-z0-9_]+)' column/,
    /column\s+businesses\.([a-z0-9_]+)\s+does not exist/,
    /column\s+"?([a-z0-9_]+)"?\s+does not exist/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function isLegacyBusinessIdForeignKeyError(errorMessage: string) {
  return errorMessage.toLowerCase().includes("businesses_id_fkey");
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

async function persistWithMissingColumnFallback(payload: Record<string, unknown> & { id: string }) {
  let activePayload: Record<string, unknown> & { id: string } = { ...payload };
  let attempts = 0;

  while (attempts < 8) {
    attempts += 1;
    const result = await persistBusinessPayload(activePayload);
    if (!result.error) {
      return result;
    }

    const missingColumn = extractMissingColumnName(result.error.message);
    if (!missingColumn || !(missingColumn in activePayload) || missingColumn === "id") {
      return result;
    }

    // Keep as much data as possible by removing only unavailable columns.
    const { [missingColumn]: _removed, ...rest } = activePayload;
    activePayload = { ...rest, id: payload.id };
  }

  return { error: { message: "Kunne ikke gemme payload efter flere kolonne-fallbacks." } as { message: string } };
}

export async function POST(req: NextRequest) {
  try {
    const { form, business_id } = await req.json();
    const stableBusinessId = typeof business_id === "string" ? business_id.trim() : "";

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

    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    if (!adminEmail) {
      return NextResponse.json(
        { success: false, error: "Serveren mangler ADMIN_EMAIL." },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Ikke autoriseret." }, { status: 401 });
    }

    const normalizedForm = {
      ...form,
      fab_color:
        typeof form.fab_color === "string" && form.fab_color.trim()
          ? form.fab_color
          : typeof form.chat_icon_color === "string"
          ? form.chat_icon_color
          : undefined,
    };

    const fullPayload = { id: stableBusinessId, user_id: user.id, ...normalizedForm };
    let { error: upsertError } = await persistWithMissingColumnFallback(fullPayload);

    // Backward compatibility: if user_id column is not deployed yet, retry without it.
    if (upsertError && isMissingColumnError(upsertError.message, "user_id")) {
      const retryWithoutUserId = await persistWithMissingColumnFallback({ id: stableBusinessId, ...normalizedForm });
      upsertError = retryWithoutUserId.error;
    }

    if (upsertError && isLegacyBusinessIdForeignKeyError(upsertError.message)) {
      return NextResponse.json(
        {
          success: false,
          error: "Databaseskema mangler migration: fjern FK `businesses_id_fkey` og tilfoj kolonnen `businesses.user_id` for at understotte flere virksomheder per bruger.",
        },
        { status: 500 }
      );
    }

    if (upsertError) {
      return NextResponse.json(
        { success: false, error: `Kunne ikke gemme virksomhedsdata: ${upsertError.message}` },
        { status: 500 }
      );
    }

    const mailResult = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: adminEmail,
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
      <p><b>Custom instrukser:</b></p>
      <pre>${form.custom_instructions || "-"}</pre>
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