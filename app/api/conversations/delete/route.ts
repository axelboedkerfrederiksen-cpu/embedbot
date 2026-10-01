import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkCsrfSafety } from "@/lib/csrf";

export async function DELETE(req: NextRequest) {
  try {
    const csrfCheck = await checkCsrfSafety(req, true);
    if (!csrfCheck.safe) {
      return NextResponse.json({ error: csrfCheck.error }, { status: 403 });
    }

    const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!publicUrl || !anonKey || !serviceUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Sletning er ikke konfigureret." },
        { status: 503 }
      );
    }

    // Verify user is authenticated
    const cookieStore = await cookies();
    const authSupabase = createServerClient(
      publicUrl,
      anonKey,
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

    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Ikke autoriseret." },
        { status: 401 }
      );
    }

    const supabase = createClient(serviceUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { business_id, conversation_id } = await req.json();
    const stableBusinessId = typeof business_id === "string" ? business_id.trim() : "";
    const stableConversationId = typeof conversation_id === "string" ? conversation_id.trim() : "";

    if (!stableBusinessId) {
      return NextResponse.json(
        { error: "Mangler business_id." },
        { status: 400 }
      );
    }

    // Verify user owns this business
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("user_id")
      .eq("id", stableBusinessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: "Virksomhed ikke fundet." },
        { status: 404 }
      );
    }

    if (business.user_id !== user.id) {
      return NextResponse.json(
        { error: "Du har ikke tilladelse til at slette disse samtaler." },
        { status: 403 }
      );
    }

    // A user-requested erasure is permanent; retention cleanup uses the same table.
    let deleteQuery = supabase
      .from("conversations")
      .delete({ count: "exact" })
      .eq("business_id", stableBusinessId);

    if (stableConversationId) {
      deleteQuery = deleteQuery.eq("id", stableConversationId);
    }

    const { count: deletedCount, error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error("Conversation deletion error:", deleteError);
      return NextResponse.json(
        { error: "Kunne ikke slette samtaler." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_count: deletedCount ?? 0,
      message: stableConversationId
        ? "Samtalen er permanent slettet."
        : "Alle samtaler er permanent slettet.",
    });
  } catch (error) {
    console.error("Conversation deletion error:", error);
    return NextResponse.json(
      { error: "Kunne ikke slette samtaler." },
      { status: 500 }
    );
  }
}
