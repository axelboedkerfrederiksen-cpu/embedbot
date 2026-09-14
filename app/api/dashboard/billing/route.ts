import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { checkCsrfSafety } from "@/lib/csrf";
import { getPlan, type PlanSlug } from "@/lib/plans";
import { getStripeObjectId, getStripePriceIdForPlan } from "@/lib/stripe-billing";

export const runtime = "nodejs";

type BillingBusiness = {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const SELF_SERVE_PLANS: PlanSlug[] = ["starter", "growth", "scale"];

function readString(value: unknown, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const directPeriodEnd = (subscription as unknown as { current_period_end?: unknown }).current_period_end;
  if (typeof directPeriodEnd === "number" && Number.isFinite(directPeriodEnd) && directPeriodEnd > 0) {
    return directPeriodEnd;
  }

  const itemPeriodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value) => Number.isFinite(value) && value > 0);

  return itemPeriodEnds.length ? Math.max(...itemPeriodEnds) : null;
}

function getScheduleId(subscription: Stripe.Subscription) {
  return getStripeObjectId(subscription.schedule);
}

function toScheduledChange(plan: PlanSlug, effectiveAt: number) {
  const definition = getPlan(plan);
  return {
    plan,
    planName: definition.name,
    amount: definition.monthlyPriceDkk ? definition.monthlyPriceDkk * 100 : null,
    currency: "dkk",
    interval: "month",
    effectiveAt: new Date(effectiveAt * 1000).toISOString(),
  };
}

async function getAuthenticatedBusiness(req: NextRequest, businessId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Serveren mangler Supabase public env vars.", status: 500 } as const;
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return { error: "Serveren mangler Supabase service env vars.", status: 500 } as const;
  }

  const cookieStore = await cookies();
  const authSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser();
  if (authError || !user) {
    return { error: "Ikke autoriseret.", status: 401 } as const;
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id,stripe_customer_id,stripe_subscription_id")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .maybeSingle<BillingBusiness>();

  if (businessError || !business) {
    return { error: businessError?.message || "Chatbotten blev ikke fundet.", status: 404 } as const;
  }

  return { business } as const;
}

async function schedulePlanChange(stripe: Stripe, subscription: Stripe.Subscription, targetPlan: PlanSlug) {
  if (!SELF_SERVE_PLANS.includes(targetPlan)) {
    throw new Error("Denne plan kræver en personlig aftale. Skriv til os, så hjælper vi.");
  }
  if (!["active", "trialing"].includes(subscription.status)) {
    throw new Error("Planen kan først ændres, når abonnementet er aktivt.");
  }
  if (subscription.cancel_at_period_end) {
    throw new Error("Abonnementet er opsagt. Genaktiver det først, før du ændrer plan.");
  }

  const targetPriceId = getStripePriceIdForPlan(targetPlan);
  if (!targetPriceId) {
    throw new Error("Den valgte plan er ikke klar til selvbetjening endnu. Skriv til os, så hjælper vi.");
  }

  const currentItem = subscription.items.data[0];
  if (!currentItem || subscription.items.data.length !== 1) {
    throw new Error("Dette abonnement skal ændres af support, fordi det har en særlig opsætning.");
  }
  if (currentItem.price.id === targetPriceId) {
    throw new Error("Du har allerede denne plan.");
  }

  const periodEnd = getSubscriptionPeriodEnd(subscription);
  if (!periodEnd || periodEnd * 1000 <= Date.now()) {
    throw new Error("Vi kunne ikke finde næste fornyelsesdato. Prøv igen om lidt.");
  }

  let schedule: Stripe.SubscriptionSchedule;
  const existingScheduleId = getScheduleId(subscription);
  if (existingScheduleId) {
    schedule = await stripe.subscriptionSchedules.retrieve(existingScheduleId);
    if (
      !["active", "not_started"].includes(schedule.status) ||
      schedule.metadata?.embedbot_plan_change !== "true"
    ) {
      throw new Error("Der er allerede en særlig planændring på abonnementet. Skriv til os, så hjælper vi sikkert videre.");
    }
  } else {
    schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscription.id });
  }

  const currentPhase = schedule.phases.find((phase) => phase.end_date >= periodEnd) || schedule.phases[0];
  if (!currentPhase?.end_date || !currentPhase.start_date || !currentPhase.items.length) {
    throw new Error("Planændringen kunne ikke klargøres. Prøv igen eller skriv til os.");
  }

  const currentItems = currentPhase.items
    .map((item) => ({ price: getStripeObjectId(item.price), quantity: item.quantity || 1 }))
    .filter((item) => item.price);
  if (!currentItems.length) {
    throw new Error("Planændringen kunne ikke klargøres. Prøv igen eller skriv til os.");
  }

  const effectiveAt = currentPhase.end_date;
  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    metadata: { embedbot_plan_change: "true", embedbot_target_plan: targetPlan },
    proration_behavior: "none",
    phases: [
      {
        start_date: currentPhase.start_date,
        end_date: effectiveAt,
        items: currentItems,
        proration_behavior: "none",
      },
      {
        start_date: effectiveAt,
        duration: { interval: "month", interval_count: 1 },
        items: [{ price: targetPriceId, quantity: currentItem.quantity || 1 }],
        proration_behavior: "none",
      },
    ],
  });

  return toScheduledChange(targetPlan, effectiveAt);
}

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = await checkCsrfSafety(req, true);
    if (!csrfCheck.safe) {
      return NextResponse.json({ success: false, error: csrfCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const businessId = readString(body.business_id, 80);
    const action = readString(body.action, 40);
    if (!businessId || !["schedule_plan_change", "open_billing_portal"].includes(action)) {
      return NextResponse.json({ success: false, error: "Ugyldig abonnementsanmodning." }, { status: 400 });
    }

    const authenticated = await getAuthenticatedBusiness(req, businessId);
    if ("error" in authenticated) {
      return NextResponse.json({ success: false, error: authenticated.error }, { status: authenticated.status });
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeSecret) {
      return NextResponse.json({ success: false, error: "Stripe er ikke klar til abonnementshåndtering endnu." }, { status: 503 });
    }
    const stripe = new Stripe(stripeSecret);
    const { business } = authenticated;

    if (action === "open_billing_portal") {
      if (!business.stripe_customer_id) {
        return NextResponse.json({ success: false, error: "Vi kan ikke finde en Stripe-kunde til dette abonnement." }, { status: 409 });
      }
      const configuration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim();
      const portal = await stripe.billingPortal.sessions.create({
        customer: business.stripe_customer_id,
        return_url: `${req.nextUrl.origin}/dashboard?view=billing`,
        ...(configuration ? { configuration } : {}),
      });
      return NextResponse.json({ success: true, url: portal.url });
    }

    const targetPlan = readString(body.plan, 30).toLowerCase() as PlanSlug;
    if (!SELF_SERVE_PLANS.includes(targetPlan)) {
      return NextResponse.json({ success: false, error: "Vælg Starter, Growth eller Scale." }, { status: 400 });
    }
    if (!business.stripe_subscription_id || !business.stripe_customer_id) {
      return NextResponse.json({ success: false, error: "Vi kan ikke finde et aktivt Stripe-abonnement til denne chatbot." }, { status: 409 });
    }

    const subscription = await stripe.subscriptions.retrieve(business.stripe_subscription_id, { expand: ["schedule"] });
    if (getStripeObjectId(subscription.customer) !== business.stripe_customer_id) {
      return NextResponse.json({ success: false, error: "Abonnementet matcher ikke denne chatbot." }, { status: 403 });
    }

    const scheduledChange = await schedulePlanChange(stripe, subscription, targetPlan);
    return NextResponse.json({ success: true, scheduledChange });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Planændringen kunne ikke gennemføres." },
      { status: 500 }
    );
  }
}
