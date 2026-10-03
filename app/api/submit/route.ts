import { businessInput } from "@/lib/compliance/business-input";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { resend } from "@/lib/resend";
import { getAdminEmailOrThrow } from "@/lib/admin-email";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const LOGO_UPLOAD_ENABLED = false;
const TRANSIENT_DATABASE_RETRY_DELAYS = [250, 750] as const;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientDatabaseError(error: { message?: string | null; code?: string | null } | null) {
  if (!error) {
    return false;
  }

  const message = (error.message || "").toLowerCase();
  return (
    error.code === "502" ||
    error.code === "503" ||
    error.code === "504" ||
    message.includes("gateway timeout") ||
    message.includes("bad gateway") ||
    message.includes("service unavailable")
  );
}

function extractMissingColumnName(errorMessage: string): string | null {
  const normalized = errorMessage.toLowerCase();
  const patterns = [
    /could not find the '([a-z0-9_]+)' column/,
    /column\s+"?([a-z0-9_]+)"?\s+of relation\s+"?businesses"?\s+does not exist/,
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

function getFormForPersistence(form: Record<string, unknown>) {
  if (LOGO_UPLOAD_ENABLED) {
    return form;
  }

  return {
    ...form,
    logo_data_url: "",
    logo_file_name: "",
  };
}

async function persistBusinessPayload(payload: Record<string, unknown> & { id: string }) {
  for (let attempt = 0; attempt <= TRANSIENT_DATABASE_RETRY_DELAYS.length; attempt++) {
    // INSERT for a new id; owner-filtered UPDATE for an existing id. An upsert
    // must never claim a row created by another tenant between lookup/write.
    const {data: existing, error: lookupError} = await supabase.from("businesses").select("id,user_id").eq("id",payload.id).maybeSingle();
    if (lookupError) return {error:lookupError};
    if (existing && existing.user_id !== payload.user_id) return {error:{message:"not_authorized",code:"42501"}};
    const result = existing
      ? await supabase.from("businesses").update(payload).eq("id",payload.id).eq("user_id",payload.user_id)
      : await supabase.from("businesses").insert(payload);
    if (!result.error || !isTransientDatabaseError(result.error) || attempt === TRANSIENT_DATABASE_RETRY_DELAYS.length) return {error:result.error};
    console.warn("business_save_retry", {attempt:attempt+1,code:result.error.code});
    await wait(TRANSIENT_DATABASE_RETRY_DELAYS[attempt]);
  }
  return {error:{message:"business_save_failed"}};
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
    if (!missingColumn || !(missingColumn in activePayload) || ["id","user_id"].includes(missingColumn)) {
      return result;
    }

    // Keep as much data as possible by removing only unavailable columns.
    const rest = { ...activePayload };
    delete rest[missingColumn];
    activePayload = { ...rest, id: payload.id };
  }

  return { error: { message: "Kunne ikke gemme payload efter flere kolonne-fallbacks." } as { message: string } };
}

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({error:"Ugyldig anmodning."},{status:403});
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

    const adminEmail = getAdminEmailOrThrow();

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

    const { data: existingBusiness, error: businessLookupError } = await supabase
      .from("businesses")
      .select("user_id")
      .eq("id", stableBusinessId)
      .maybeSingle();

    if (businessLookupError) {
      return NextResponse.json(
        { success: false, error: "Kunne ikke verificere virksomhedsejerskab." },
        { status: 500 }
      );
    }

    const existingBusinessUserId = typeof existingBusiness?.user_id === "string" ? existingBusiness.user_id.trim() : "";
    if (existingBusinessUserId && existingBusinessUserId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Du har ikke tilladelse til at opdatere denne virksomhed." },
        { status: 403 }
      );
    }

    const formForPersistence = getFormForPersistence(businessInput(form as Record<string, unknown>));
    const normalizedForm: Record<string, unknown> = {
      ...formForPersistence,
      fab_color:
        typeof formForPersistence.fab_color === "string" && formForPersistence.fab_color.trim()
          ? formForPersistence.fab_color
          : typeof formForPersistence.chat_icon_color === "string"
          ? formForPersistence.chat_icon_color
          : undefined,
    };

    const fullPayload = { ...normalizedForm, id: stableBusinessId, user_id: user.id };
    const { error: upsertError } = await persistWithMissingColumnFallback(fullPayload);


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
      console.error("Unable to save business.", {
        code: "code" in upsertError ? upsertError.code : undefined,
      });
      return NextResponse.json(
        { success: false, error: "Kunne ikke gemme virksomhedsdata. Kontakt support." },
        { status: 500 }
      );
    }

    const mailResult = await resend.emails.send({
      from: "axel@embedbot.dk",
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
      <p><b>Outline aktiv:</b> ${form.chat_outline_enabled || "false"}</p>
      <p><b>Outline farve:</b> ${form.chat_outline_color || "-"}</p>
      <p><b>Outline tykkelse:</b> ${form.chat_outline_width || "-"}px</p>
      <p><b>Outline opacity:</b> ${form.chat_outline_opacity || "-"}%</p>
      <p><b>Widget opacity:</b> ${form.widget_opacity || "-"}%</p>
      <p><b>Logo fil:</b> ${normalizedForm.logo_file_name || "-"}</p>
      <hr/>
      <p><b>Business ID:</b> ${stableBusinessId}</p>
    `,
    });

    if ((mailResult as { error?: { message?: string } })?.error) {
      return NextResponse.json(
        {
          success: false,
          error: "Virksomheden blev gemt, men email kunne ikke sendes. Kontakt support.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Kunne ikke afslutte opsætningen. Kontakt support." }, { status: 500 });
  }
}
