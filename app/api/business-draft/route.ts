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
    const { form, business_id, user_id } = await req.json();
    const stableBusinessId = typeof business_id === "string" ? business_id.trim() : "";

    if (!stableBusinessId) {
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

    const normalizedForm = {
      ...form,
      fab_color:
        typeof form.fab_color === "string" && form.fab_color.trim()
          ? form.fab_color
          : typeof form.chat_icon_color === "string"
          ? form.chat_icon_color
          : undefined,
    };

    const fullPayload = { id: stableBusinessId, user_id, ...normalizedForm };
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

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: false, error: "Ukendt serverfejl." }, { status: 500 });
  }
}
