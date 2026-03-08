import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET() {
  try {
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

    const blockedKeys = new Set(["id", "created_at"]);
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => !blockedKeys.has(key))
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
