import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function isOnConflictConstraintError(errorMessage: string) {
  return errorMessage.toLowerCase().includes("no unique or exclusion constraint matching the on conflict specification");
}

function isMissingColumnError(errorMessage: string, columnName: string) {
  const normalized = errorMessage.toLowerCase();
  return normalized.includes(`could not find the '${columnName.toLowerCase()}' column`) || normalized.includes(`column \"${columnName.toLowerCase()}\"`);
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

export async function POST(req: NextRequest) {
  try {
    const { form, business_id, user_id } = await req.json();

    if (!business_id || typeof business_id !== "string") {
      return NextResponse.json({ success: false, error: "Mangler business_id." }, { status: 400 });
    }

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json({ success: false, error: "Mangler user_id." }, { status: 400 });
    }

    if (!form || typeof form !== "object") {
      return NextResponse.json({ success: false, error: "Mangler form-data." }, { status: 400 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { success: false, error: "Serveren mangler nødvendige environment variables." },
        { status: 500 }
      );
    }

    const fullPayload = { id: business_id, user_id, ...form };
    let { error: upsertError } = await persistBusinessPayload(fullPayload);

    // Backward compatibility: if user_id column is not deployed yet, retry without it.
    if (upsertError && isMissingColumnError(upsertError.message, "user_id")) {
      const retryWithoutUserId = await persistBusinessPayload({ id: business_id, ...form });
      upsertError = retryWithoutUserId.error;
    }

    // If branding columns are not migrated yet, retry with stable core fields only.
    if (upsertError && upsertError.message.toLowerCase().includes("column")) {
      const safePayload = {
        id: business_id,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: false, error: "Ukendt serverfejl." }, { status: 500 });
  }
}
