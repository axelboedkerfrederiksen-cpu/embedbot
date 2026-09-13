import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: "Serveren mangler Supabase environment variables." }, { status: 500 });
    }

    const businessId = req.nextUrl.searchParams.get("business_id")?.trim() || "";
    if (!businessId) {
      return NextResponse.json({ error: "Mangler business_id." }, { status: 400 });
    }

    const [businessResult, conversationsResult, documentsResult] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
      supabase
        .from("conversations")
        .select("id,business_id,created_at,messages")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(150),
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
    ]);

    if (businessResult.error) {
      return NextResponse.json({ error: businessResult.error.message }, { status: 500 });
    }
    if (!businessResult.data) {
      return NextResponse.json({ error: "Kunden blev ikke fundet." }, { status: 404 });
    }
    if (conversationsResult.error) {
      return NextResponse.json({ error: conversationsResult.error.message }, { status: 500 });
    }
    if (documentsResult.error) {
      return NextResponse.json({ error: documentsResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      business: businessResult.data,
      conversations: conversationsResult.data || [],
      knowledgeChunkCount: documentsResult.count || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ukendt serverfejl." },
      { status: 500 }
    );
  }
}
