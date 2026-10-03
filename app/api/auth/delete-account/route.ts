import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { checkCsrfSafety } from "@/lib/csrf";

export const runtime = "nodejs";

type AccountBusiness = {
  id: string;
  stripe_subscription_id: string | null;
};

function isMissingStripeResource(error: unknown) {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = await checkCsrfSafety(req);
    if (!csrfCheck.safe) {
      return NextResponse.json({ error: csrfCheck.error }, { status: 403 });
    }

    if (req.headers.get("x-confirm-deletion") !== "yes-delete-my-account") {
      return NextResponse.json(
        { error: "Kontosletning er ikke bekræftet." },
        { status: 400 }
      );
    }

    const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!publicUrl || !anonKey || !serviceUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Kontosletning er ikke konfigureret." },
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
    const { data: businesses, error: businessError } = await adminSupabase
      .from("businesses")
      .select("id,stripe_subscription_id")
      .eq("user_id", user.id)
      .returns<AccountBusiness[]>();

    if (businessError) {
      console.error("Account deletion business lookup failed");
      return NextResponse.json({ error: "Kunne ikke slette kontoen." }, { status: 500 });
    }

    const subscriptionIds = Array.from(
      new Set(
        (businesses || [])
          .map((business) => business.stripe_subscription_id?.trim())
          .filter((id): id is string => Boolean(id))
      )
    );

    if (subscriptionIds.length) {
      const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
      if (!stripeSecret) {
        return NextResponse.json(
          { error: "Abonnementet kunne ikke stoppes sikkert. Kontakt support." },
          { status: 503 }
        );
      }

      const stripe = new Stripe(stripeSecret);
      for (const subscriptionId of subscriptionIds) {
        try {
          await stripe.subscriptions.cancel(subscriptionId);
        } catch (error) {
          if (!isMissingStripeResource(error)) {
            console.error("Account deletion Stripe cancellation failed");
            return NextResponse.json(
              { error: "Abonnementet kunne ikke stoppes sikkert. Kontakt support." },
              { status: 502 }
            );
          }
        }
      }
    }

    const { data: deletionResult, error: deletionError } = await adminSupabase.rpc(
      "delete_embedbot_account_data",
      {
        target_user_id: user.id,
        target_email: user.email || null,
      }
    );

    if (deletionError) {
      console.error("Account data deletion failed");
      return NextResponse.json({ error: "Kunne ikke slette kontoen." }, { status: 500 });
    }

    const { error: authDeletionError } = await adminSupabase.auth.admin.deleteUser(user.id);
    if (authDeletionError) {
      console.error("Account auth deletion failed");
      return NextResponse.json(
        { error: "Kontodata blev slettet, men login kunne ikke fjernes. Kontakt support." },
        { status: 500 }
      );
    }

    await authSupabase.auth.signOut().catch(() => undefined);

    return NextResponse.json({
      success: true,
      deleted: Array.isArray(deletionResult) ? deletionResult[0] || null : deletionResult,
      message: "Kontoen og de tilknyttede EmbedBot-data er permanent slettet.",
    });
  } catch {
    console.error("Account deletion failed");
    return NextResponse.json({ error: "Kunne ikke slette kontoen." }, { status: 500 });
  }
}
