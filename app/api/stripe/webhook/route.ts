import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { activateBusinessAndSendEmail } from "@/lib/business-activation";
import {
  getPaymentStatusForSubscription,
  getPlanFromSubscription,
  getStripeObjectId,
  getSubscriptionIdFromInvoice,
  getSubscriptionPeriodEndIso,
  isCurrentSubscriptionInvoice,
  normalizeSubscriptionStatus,
} from "@/lib/stripe-billing";

export const runtime = "nodejs";

type BillingSyncResult = {
  businessId?: string;
  ignored?: boolean;
  error?: string;
};

function getStripeClient() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  return stripeSecret ? new Stripe(stripeSecret) : null;
}

function getSupabaseClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return null;
  }

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

function getBusinessIdFromSession(session: Stripe.Checkout.Session) {
  const referenceId = session.client_reference_id?.trim();
  if (referenceId) {
    return referenceId;
  }

  return session.metadata?.business_id?.trim() || "";
}

function shouldActivateFromCheckout(event: Stripe.Event, session: Stripe.Checkout.Session) {
  return event.type === "checkout.session.async_payment_succeeded"
    || (event.type === "checkout.session.completed"
      && (session.payment_status === "paid" || session.payment_status === "no_payment_required"));
}

function getCheckoutSubscriptionStatus(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription | null
) {
  if (subscription) {
    return normalizeSubscriptionStatus(subscription.status);
  }

  return session.payment_status === "no_payment_required" ? "trialing" : "active";
}

function getCurrentPeriodEndFromMetadata(session: Stripe.Checkout.Session) {
  const seconds = Number(session.metadata?.current_period_end);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : undefined;
}

function getCustomerEmail(session: Stripe.Checkout.Session) {
  return session.customer_details?.email?.trim() || session.customer_email?.trim() || undefined;
}

async function findPendingBusinessIdByEmail(supabase: SupabaseClient, customerEmail: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("support_email", customerEmail)
    .or("activated.is.false,activated.is.null")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    businessId: typeof data?.id === "string" ? data.id.trim() : "",
    error: error ? `Kunne ikke finde virksomhed via Stripe-email: ${error.message}` : undefined,
  };
}

async function findBusinessForSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const metadataBusinessId = subscription.metadata?.business_id?.trim();
  if (metadataBusinessId) {
    const result = await supabase
      .from("businesses")
      .select("id,payment_status")
      .eq("id", metadataBusinessId)
      .maybeSingle();
    if (result.error || result.data) {
      return result;
    }
  }

  const bySubscription = await supabase
    .from("businesses")
    .select("id,payment_status")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (bySubscription.error || bySubscription.data) {
    return bySubscription;
  }

  const customerId = getStripeObjectId(subscription.customer);
  if (!customerId) {
    return bySubscription;
  }

  return supabase
    .from("businesses")
    .select("id,payment_status")
    .eq("stripe_customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function syncSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  paymentStatusOverride?: "paid" | "failed"
): Promise<BillingSyncResult> {
  const { data: business, error: lookupError } = await findBusinessForSubscription(supabase, subscription);
  if (lookupError) {
    return { error: `Kunne ikke finde virksomhed til Stripe-abonnement: ${lookupError.message}` };
  }
  if (!business?.id) {
    return { ignored: true };
  }

  const subscriptionStatus = normalizeSubscriptionStatus(subscription.status);
  const paymentStatus = paymentStatusOverride
    || getPaymentStatusForSubscription(subscriptionStatus, business.payment_status);
  const canceledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000).toISOString()
    : subscriptionStatus === "canceled"
      ? new Date().toISOString()
      : null;
  const plan = getPlanFromSubscription(subscription);
  const updatePayload: Record<string, unknown> = {
    subscription_status: subscriptionStatus,
    payment_status: paymentStatus,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: getStripeObjectId(subscription.customer) || null,
    current_period_end: getSubscriptionPeriodEndIso(subscription),
    canceled_at: canceledAt,
    subscription_updated_at: new Date().toISOString(),
  };
  if (plan) {
    updatePayload.plan = plan;
  }

  const { error: updateError } = await supabase
    .from("businesses")
    .update(updatePayload)
    .eq("id", business.id);

  return updateError
    ? { error: `Kunne ikke opdatere abonnement: ${updateError.message}` }
    : { businessId: business.id };
}

async function handleCheckoutEvent(
  stripe: Stripe,
  supabase: SupabaseClient,
  event: Stripe.Event
) {
  const session = event.data.object as Stripe.Checkout.Session;
  if (!shouldActivateFromCheckout(event, session)) {
    return { success: true, ignored: true, reason: "Betaling er endnu ikke bekræftet." };
  }

  const customerEmail = getCustomerEmail(session);
  let businessId = getBusinessIdFromSession(session);
  let resolvedBusinessIdFromEmail = false;
  if (!businessId && customerEmail) {
    const fallback = await findPendingBusinessIdByEmail(supabase, customerEmail);
    if (fallback.error) {
      throw new Error(fallback.error);
    }
    businessId = fallback.businessId;
    resolvedBusinessIdFromEmail = Boolean(businessId);
  }

  if (!businessId) {
    return { success: true, ignored: true, reason: "Stripe-eventet kunne ikke knyttes til en virksomhed." };
  }

  const subscriptionId = getStripeObjectId(session.subscription);
  const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
  const subscriptionStatus = getCheckoutSubscriptionStatus(session, subscription);
  const paymentStatus = subscriptionStatus === "trialing" ? "unpaid" : "paid";
  const plan = subscription ? getPlanFromSubscription(subscription) : undefined;
  const activationResult = await activateBusinessAndSendEmail(businessId, {
    paymentConfirmed: true,
    subscriptionStatus,
    paymentStatus,
    stripeCustomerId: getStripeObjectId(session.customer),
    stripeSubscriptionId: subscriptionId,
    currentPeriodEnd: subscription
      ? getSubscriptionPeriodEndIso(subscription) || undefined
      : getCurrentPeriodEndFromMetadata(session),
    customerEmail,
    ...(plan ? { plan } : {}),
  });

  if (!activationResult.success) {
    throw new Error(activationResult.error || "Aktivering fejlede.");
  }

  return {
    success: true,
    business_id: businessId,
    resolvedBusinessIdFromEmail,
    alreadyActivated: Boolean(activationResult.alreadyActivated),
  };
}

async function handleSubscriptionEvent(
  stripe: Stripe,
  supabase: SupabaseClient,
  event: Stripe.Event
) {
  let subscription: Stripe.Subscription;
  let paymentStatusOverride: "paid" | "failed" | undefined;

  if (
    event.type === "customer.subscription.created"
    || event.type === "customer.subscription.updated"
    || event.type === "customer.subscription.deleted"
    || event.type === "customer.subscription.paused"
    || event.type === "customer.subscription.resumed"
  ) {
    subscription = event.data.object as Stripe.Subscription;
  } else {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = getSubscriptionIdFromInvoice(invoice);
    if (!subscriptionId) {
      return { success: true, ignored: true, reason: "Fakturaen tilhører ikke et abonnement." };
    }
    subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] });
    if (!isCurrentSubscriptionInvoice(invoice, subscription)) {
      return { success: true, ignored: true, reason: "Fakturaeventet er ældre end abonnementets seneste faktura." };
    }
    paymentStatusOverride = event.type === "invoice.paid" || event.type === "invoice.payment_succeeded"
      ? "paid"
      : "failed";
  }

  const result = await syncSubscription(supabase, subscription, paymentStatusOverride);
  if (result.error) {
    throw new Error(result.error);
  }

  return {
    success: true,
    ignored: Boolean(result.ignored),
    business_id: result.businessId,
  };
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    const stripe = getStripeClient();
    const supabase = getSupabaseClient();
    if (!webhookSecret || !stripe || !supabase) {
      return NextResponse.json(
        { success: false, error: "Serveren mangler Stripe- eller Supabase-konfiguration." },
        { status: 500 }
      );
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ success: false, error: "Mangler stripe-signature header." }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(await req.text(), signature, webhookSecret);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? `Ugyldig webhook-signatur: ${error.message}` : "Ugyldig webhook-signatur." },
        { status: 400 }
      );
    }

    let result: Record<string, unknown>;
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      result = await handleCheckoutEvent(stripe, supabase, event);
    } else if (
      event.type === "customer.subscription.created"
      || event.type === "customer.subscription.updated"
      || event.type === "customer.subscription.deleted"
      || event.type === "customer.subscription.paused"
      || event.type === "customer.subscription.resumed"
      || event.type === "invoice.paid"
      || event.type === "invoice.payment_succeeded"
      || event.type === "invoice.payment_failed"
      || event.type === "invoice.finalization_failed"
    ) {
      result = await handleSubscriptionEvent(stripe, supabase, event);
    } else {
      result = { success: true, ignored: true };
    }

    return NextResponse.json({ ...result, eventType: event.type });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ukendt webhook-fejl." },
      { status: 500 }
    );
  }
}
