import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

function emptyResult<T>() {
  return Promise.resolve({ data: [] as T[], error: null });
}

export async function GET() {
  try {
    const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!publicUrl || !anonKey || !serviceUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Dataeksport er ikke konfigureret." },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const authSupabase = createServerClient(publicUrl, anonKey, {
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
    });

    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Ikke autoriseret." }, { status: 401 });
    }

    const adminSupabase = createClient(serviceUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: businesses, error: businessesError } = await adminSupabase
      .from("businesses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (businessesError) {
      console.error("Data export business lookup failed:", businessesError);
      return NextResponse.json({ error: "Kunne ikke eksportere data." }, { status: 500 });
    }

    const businessIds = (businesses || [])
      .map((business) => business.id)
      .filter((id): id is string => typeof id === "string");

    const conversationsQuery = businessIds.length
      ? adminSupabase
          .from("conversations")
          .select("id,business_id,created_at,messages,deleted_at,is_deleted")
          .in("business_id", businessIds)
          .order("created_at", { ascending: true })
      : emptyResult();
    const documentsQuery = businessIds.length
      ? adminSupabase
          .from("documents")
          .select("id,business_id,content")
          .in("business_id", businessIds)
      : emptyResult();
    const customerMessagesQuery = businessIds.length
      ? adminSupabase
          .from("customer_messages")
          .select("*")
          .in("business_id", businessIds)
          .order("created_at", { ascending: true })
      : emptyResult();
    const supportMessagesQuery = user.email
      ? adminSupabase
          .from("support_messages")
          .select("*")
          .eq("email", user.email)
          .order("created_at", { ascending: true })
      : emptyResult();

    const [conversations, documents, customerMessages, supportMessages] =
      await Promise.all([
        conversationsQuery,
        documentsQuery,
        customerMessagesQuery,
        supportMessagesQuery,
      ]);

    const queryError =
      conversations.error ||
      documents.error ||
      customerMessages.error ||
      supportMessages.error;

    if (queryError) {
      console.error("Data export related-data lookup failed:", queryError);
      return NextResponse.json({ error: "Kunne ikke eksportere data." }, { status: 500 });
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email || null,
        phone: user.phone || null,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_sign_in_at: user.last_sign_in_at || null,
        user_metadata: user.user_metadata,
      },
      businesses: businesses || [],
      conversations: conversations.data || [],
      documents: documents.data || [],
      customer_messages: customerMessages.data || [],
      support_messages: supportMessages.data || [],
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": "attachment; filename=embedbot-export.json",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Data export failed:", error);
    return NextResponse.json({ error: "Kunne ikke eksportere data." }, { status: 500 });
  }
}
