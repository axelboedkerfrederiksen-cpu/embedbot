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

    // Equivalent to: select distinct on (id) * from businesses order by id, created_at desc
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .order("id", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const latestById = new Map<string, Record<string, unknown>>();
    for (const row of data || []) {
      const id = String((row as { id?: unknown }).id ?? "");
      if (!id || latestById.has(id)) {
        continue;
      }
      latestById.set(id, row as Record<string, unknown>);
    }

    return NextResponse.json({ businesses: Array.from(latestById.values()) });
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
    if (!business_id || typeof business_id !== "string") {
      return NextResponse.json({ error: "Mangler business_id." }, { status: 400 });
    }

    const { error: docsDeleteError } = await supabase
      .from("documents")
      .delete()
      .eq("business_id", business_id);

    if (docsDeleteError) {
      return NextResponse.json({ error: docsDeleteError.message }, { status: 500 });
    }

    const { error: businessDeleteError } = await supabase
      .from("businesses")
      .delete()
      .eq("id", business_id);

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
