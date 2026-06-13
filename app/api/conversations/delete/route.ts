import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function DELETE(req: NextRequest) {
  try {
    // Verify user is authenticated
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

    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Ikke autoriseret." },
        { status: 401 }
      );
    }

    const { business_id } = await req.json();
    const stableBusinessId = typeof business_id === "string" ? business_id.trim() : "";

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

    // Soft delete all conversations
    const { error: deleteError } = await supabase
      .from("conversations")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq("business_id", stableBusinessId)
      .eq("is_deleted", false);

    if (deleteError) {
      console.error("Conversation deletion error:", deleteError);
      return NextResponse.json(
        { error: "Kunne ikke slette samtaler." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Alle samtaler er blevet slettet.",
    });
  } catch (error) {
    console.error("Conversation deletion error:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Ukendt serverfejl." },
      { status: 500 }
    );
  }
}
