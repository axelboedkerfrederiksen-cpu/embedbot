import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { getAnswerLimit, getPlan } from "@/lib/plans";
import { isBusinessSubscriptionActive } from "@/lib/subscription";
import { getPlanFromPrice } from "@/lib/stripe-billing";

export const runtime = "nodejs";

type BusinessBillingRow = {
  id: string;
  name: string | null;
  subscription_status: string | null;
  payment_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  subscription_updated_at: string | null;
  activated: boolean | null;
  plan: string | null;
  ai_answers_used: number | null;
  ai_usage_period_start: string | null;
  ai_answer_limit_override: number | null;
};

function getUsageInfo(business: BusinessBillingRow) {
  const plan = getPlan(business.plan);
  const now = new Date();
  const currentMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const storedPeriodStart = business.ai_usage_period_start
    ? new Date(`${business.ai_usage_period_start}T00:00:00.000Z`).getTime()
    : Number.NaN;

  return {
    plan: plan.slug,
    planName: plan.name,
    answersUsed: storedPeriodStart === currentMonthStart ? Math.max(0, business.ai_answers_used || 0) : 0,
    answerLimit: getAnswerLimit(plan.slug, business.ai_answer_limit_override),
    usageResetsAt: nextMonthStart.toISOString(),
  };
}

function getStripeClient() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecret) {
    return null;
  }

  return new Stripe(stripeSecret);
}

function getStringId(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : "";
  }

  return "";
}

function toIsoFromSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const directPeriodEnd = (subscription as unknown as { current_period_end?: unknown }).current_period_end;
  if (typeof directPeriodEnd === "number") {
    return directPeriodEnd;
  }

  const itemPeriodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value) => Number.isFinite(value) && value > 0);

  return itemPeriodEnds.length > 0 ? Math.max(...itemPeriodEnds) : null;
}

function getSubscriptionPeriodStart(subscription: Stripe.Subscription) {
  const directPeriodStart = (subscription as unknown as { current_period_start?: unknown }).current_period_start;
  if (typeof directPeriodStart === "number") {
    return directPeriodStart;
  }

  const itemPeriodStarts = subscription.items.data
    .map((item) => item.current_period_start)
    .filter((value) => Number.isFinite(value) && value > 0);

  return itemPeriodStarts.length > 0 ? Math.min(...itemPeriodStarts) : null;
}

function getProductName(price: Stripe.Price | null | undefined) {
  const product = price?.product;
  if (product && typeof product === "object" && "name" in product && typeof product.name === "string") {
    return product.name;
  }

  return price?.nickname || "EmbedBot abonnement";
}

function getCustomerEmail(customer: Stripe.Subscription["customer"]) {
  if (typeof customer === "string") {
    return null;
  }

  if ("deleted" in customer && customer.deleted) {
    return null;
  }

  return customer.email || null;
}

function getInvoiceStatus(invoice: Stripe.Subscription["latest_invoice"]) {
  if (!invoice || typeof invoice === "string") {
    return null;
  }

  return {
    id: invoice.id,
    status: invoice.status,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    dueDate: toIsoFromSeconds(invoice.due_date),
  };
}

function getPaymentMethodSummary(paymentMethod: Stripe.PaymentMethod | string | null | undefined) {
  if (!paymentMethod || typeof paymentMethod === "string") {
    return null;
  }

  if (paymentMethod.card) {
    return {
      type: "card",
      brand: paymentMethod.card.brand || null,
      last4: paymentMethod.card.last4 || null,
      expMonth: paymentMethod.card.exp_month || null,
      expYear: paymentMethod.card.exp_year || null,
    };
  }

  return { type: paymentMethod.type || "payment_method", brand: null, last4: null, expMonth: null, expYear: null };
}

function getCustomerPaymentMethod(customer: Stripe.Subscription["customer"]) {
  if (typeof customer === "string" || ("deleted" in customer && customer.deleted)) {
    return null;
  }

  return getPaymentMethodSummary(customer.invoice_settings?.default_payment_method);
}

function getActivePrice(value: Stripe.SubscriptionSchedule.Phase["items"][number]["price"] | undefined) {
  if (!value || typeof value === "string" || ("deleted" in value && value.deleted)) {
    return null;
  }

  return value;
}

function getScheduledPlanChange(subscription: Stripe.Subscription, periodEnd: number | null) {
  if (!subscription.schedule || typeof subscription.schedule === "string" || !periodEnd) {
    return null;
  }

  const nextPhase = subscription.schedule.phases.find((phase) => phase.start_date >= periodEnd);
  const nextPrice = getActivePrice(nextPhase?.items[0]?.price);
  const plan = getPlanFromPrice(nextPrice);
  if (!nextPhase || !plan) {
    return null;
  }

  const definition = getPlan(plan);
  return {
    plan,
    planName: definition.name,
    amount: definition.monthlyPriceDkk ? definition.monthlyPriceDkk * 100 : null,
    currency: nextPrice?.currency || "dkk",
    interval: nextPrice?.recurring?.interval || "month",
    effectiveAt: toIsoFromSeconds(nextPhase.start_date),
  };
}

async function getStripeSubscriptionInfo(stripe: Stripe | null, business: BusinessBillingRow) {
  if (!stripe || !business.stripe_subscription_id) {
    return {
      businessId: business.id,
      businessName: business.name || "Unavngiven chatbot",
      source: "database" as const,
      status: business.subscription_status || "unknown",
      paymentStatus: business.payment_status || "unknown",
      isActive: isBusinessSubscriptionActive(business as unknown as Record<string, unknown>),
      isTrialing: (business.subscription_status || "").toLowerCase() === "trialing",
      trialEndsAt: null,
      trialDaysRemaining: null,
      currentPeriodStart: null,
      currentPeriodEnd: business.current_period_end,
      cancelAtPeriodEnd: null,
      cancelAt: null,
      canceledAt: null,
      collectionMethod: null,
      amount: null,
      currency: null,
      interval: null,
      productName: "EmbedBot abonnement",
      quantity: null,
      customerId: business.stripe_customer_id,
      customerEmail: null,
      subscriptionId: business.stripe_subscription_id,
      latestInvoice: null,
      paymentMethod: null,
      scheduledChange: null,
      updatedAt: business.subscription_updated_at,
      error: "Stripe er ikke konfigureret, eller abonnementet mangler Stripe-data.",
      ...getUsageInfo(business),
    };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(business.stripe_subscription_id, {
      expand: ["customer", "default_payment_method", "customer.invoice_settings.default_payment_method", "items.data.price.product", "latest_invoice", "schedule"],
    });
    const primaryItem = subscription.items.data[0] || null;
    const price = primaryItem?.price || null;
    const trialEnd = subscription.trial_end;
    const now = Date.now();
    const trialDaysRemaining =
      typeof trialEnd === "number" && trialEnd * 1000 > now
        ? Math.ceil((trialEnd * 1000 - now) / (24 * 60 * 60 * 1000))
        : 0;
    const periodStart = getSubscriptionPeriodStart(subscription);
    const periodEnd = getSubscriptionPeriodEnd(subscription);

    return {
      businessId: business.id,
      businessName: business.name || "Unavngiven chatbot",
      source: "stripe" as const,
      status: subscription.status,
      paymentStatus: business.payment_status || "unknown",
      isActive: ["active", "trialing"].includes(subscription.status),
      isTrialing: subscription.status === "trialing",
      trialEndsAt: toIsoFromSeconds(trialEnd),
      trialDaysRemaining,
      currentPeriodStart: toIsoFromSeconds(periodStart),
      currentPeriodEnd: toIsoFromSeconds(periodEnd),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: toIsoFromSeconds(subscription.cancel_at),
      canceledAt: toIsoFromSeconds(subscription.canceled_at),
      collectionMethod: subscription.collection_method,
      amount: price?.unit_amount ?? null,
      currency: price?.currency ?? subscription.currency ?? null,
      interval: price?.recurring?.interval ?? null,
      productName: getProductName(price),
      quantity: primaryItem?.quantity ?? null,
      customerId: getStringId(subscription.customer) || business.stripe_customer_id,
      customerEmail: getCustomerEmail(subscription.customer),
      subscriptionId: subscription.id,
      latestInvoice: getInvoiceStatus(subscription.latest_invoice),
      paymentMethod: getPaymentMethodSummary(subscription.default_payment_method) || getCustomerPaymentMethod(subscription.customer),
      scheduledChange: getScheduledPlanChange(subscription, periodEnd),
      updatedAt: new Date().toISOString(),
      error: null,
      ...getUsageInfo(business),
    };
  } catch (error) {
    return {
      businessId: business.id,
      businessName: business.name || "Unavngiven chatbot",
      source: "database" as const,
      status: business.subscription_status || "unknown",
      paymentStatus: business.payment_status || "unknown",
      isActive: isBusinessSubscriptionActive(business as unknown as Record<string, unknown>),
      isTrialing: (business.subscription_status || "").toLowerCase() === "trialing",
      trialEndsAt: null,
      trialDaysRemaining: null,
      currentPeriodStart: null,
      currentPeriodEnd: business.current_period_end,
      cancelAtPeriodEnd: null,
      cancelAt: null,
      canceledAt: null,
      collectionMethod: null,
      amount: null,
      currency: null,
      interval: null,
      productName: "EmbedBot abonnement",
      quantity: null,
      customerId: business.stripe_customer_id,
      customerEmail: null,
      subscriptionId: business.stripe_subscription_id,
      latestInvoice: null,
      paymentMethod: null,
      scheduledChange: null,
      updatedAt: business.subscription_updated_at,
      error: error instanceof Error ? error.message : "Kunne ikke hente abonnement fra Stripe.",
      ...getUsageInfo(business),
    };
  }
}

export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ success: false, error: "Serveren mangler Supabase public env vars." }, { status: 500 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ success: false, error: "Serveren mangler Supabase service env vars." }, { status: 500 });
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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Ikke autoriseret." }, { status: 401 });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: businesses, error: businessError } = await supabase
      .from("businesses")
      .select("id,name,subscription_status,payment_status,stripe_customer_id,stripe_subscription_id,current_period_end,subscription_updated_at,activated,plan,ai_answers_used,ai_usage_period_start,ai_answer_limit_override")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<BusinessBillingRow[]>();

    if (businessError) {
      return NextResponse.json(
        { success: false, error: `Kunne ikke hente abonnementer: ${businessError.message}` },
        { status: 500 }
      );
    }

    const stripe = getStripeClient();
    const subscriptions = await Promise.all((businesses || []).map((business) => getStripeSubscriptionInfo(stripe, business)));

    return NextResponse.json({
      success: true,
      subscriptions,
      stripeConfigured: Boolean(stripe),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ukendt abonnementsfejl." },
      { status: 500 }
    );
  }
}
