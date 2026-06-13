import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
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

    // Require confirmation header to prevent accidents
    const confirmHeader = req.headers.get("x-confirm-deletion");
    if (confirmHeader !== "yes-delete-my-account") {
      return NextResponse.json(
        { error: "Sletning skal bekræftes med header x-confirm-deletion: yes-delete-my-account" },
        { status: 400 }
      );
    }

    // Call RPC function to delete account
    const { data, error } = await supabase.rpc("delete_user_account", {
      user_id: user.id,
    });

    if (error) {
      console.error("Account deletion error:", error);
      return NextResponse.json(
        { error: "Kunne ikke slette konto." },
        { status: 500 }
      );
    }

    // Sign out user
    await authSupabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "Din konto og alle relaterede data er blevet slettet.",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
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
