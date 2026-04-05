import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function isMatchingAdminToken(expectedToken: string, providedToken: string) {
  const expectedBuffer = Buffer.from(expectedToken);
  const providedBuffer = Buffer.from(providedToken);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function verifyAdminRequest(req: NextRequest) {
  const expectedToken =
    process.env.NEXT_PUBLIC_ADMIN_PASSWORD?.trim() || process.env.ADMIN_PASSWORD?.trim();
  if (!expectedToken) {
    return NextResponse.json(
      { error: "Serveren mangler ADMIN_PASSWORD eller NEXT_PUBLIC_ADMIN_PASSWORD." },
      { status: 500 }
    );
  }

  const providedToken = req.headers.get("x-admin-token")?.trim();
  if (!providedToken || !isMatchingAdminToken(expectedToken, providedToken)) {
    return NextResponse.json({ error: "Ikke autoriseret." }, { status: 401 });
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const authError = verifyAdminRequest(req);
    if (authError) {
      return authError;
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: "Serveren mangler Supabase environment variables." },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ businesses: data || [] });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Ukendt serverfejl." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authError = verifyAdminRequest(req);
    if (authError) {
      return authError;
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: "Serveren mangler Supabase environment variables." },
        { status: 500 }
      );
    }

    const { business_id } = await req.json();
    const stableBusinessId = typeof business_id === "string" ? business_id.trim() : "";

    if (!stableBusinessId) {
      return NextResponse.json({ error: "Mangler business_id." }, { status: 400 });
    }

    const { error: docsDeleteError } = await supabase
      .from("documents")
      .delete()
      .eq("business_id", stableBusinessId);

    if (docsDeleteError) {
      return NextResponse.json({ error: docsDeleteError.message }, { status: 500 });
    }

    const { error: businessDeleteError } = await supabase
      .from("businesses")
      .delete()
      .eq("id", stableBusinessId);

    if (businessDeleteError) {
      return NextResponse.json({ error: businessDeleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Ukendt serverfejl." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authError = verifyAdminRequest(req);
    if (authError) {
      return authError;
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: "Serveren mangler Supabase environment variables." },
        { status: 500 }
      );
    }

    const { business_id, updates } = await req.json();
    const stableBusinessId = typeof business_id === "string" ? business_id.trim() : "";

    if (!stableBusinessId) {
      return NextResponse.json({ error: "Mangler business_id." }, { status: 400 });
    }

    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return NextResponse.json({ error: "Mangler gyldige updates." }, { status: 400 });
    }

    const blockedKeys = new Set(["id", "created_at", "user_id"]);
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).flatMap(([key, value]) => {
        if (blockedKeys.has(key)) {
          return [];
        }

        // Protect UUID/system columns from invalid empty-string values.
        if (key.endsWith("_id")) {
          if (typeof value !== "string") {
            return [];
          }

          const trimmedUuid = value.trim();
          if (!trimmedUuid) {
            return [];
          }

          return [[key, trimmedUuid]];
        }

        if (typeof value === "string") {
          return [[key, value.trim()]];
        }

        return [[key, value]];
      })
    );

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json(
        { error: "Ingen redigerbare felter at opdatere." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("businesses")
      .update(safeUpdates)
      .eq("id", stableBusinessId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, business: data });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Ukendt serverfejl." }, { status: 500 });
  }
}
