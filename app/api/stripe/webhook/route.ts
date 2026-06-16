import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { activateBusinessAndSendEmail } from "@/lib/business-activation";

export const runtime = "nodejs";

function getStripeClient() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecret) {
    return null;
  }

  return new Stripe(stripeSecret);
}

function getBusinessIdFromSession(session: Stripe.Checkout.Session) {
  const fromReference = typeof session.client_reference_id === "string" ? session.client_reference_id.trim() : "";
  if (fromReference) {
    return fromReference;
  }

  const fromMetadata =
    typeof session.metadata?.business_id === "string"
      ? session.metadata.business_id.trim()
      : "";

  return fromMetadata;
}

function shouldActivateFromEvent(event: Stripe.Event, session: Stripe.Checkout.Session) {
  if (event.type === "checkout.session.async_payment_succeeded") {
    return true;
  }

  if (event.type === "checkout.session.completed") {
    return session.payment_status === "paid";
  }

  return false;
}

function getStringValue(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getCurrentPeriodEndIso(session: Stripe.Checkout.Session) {
  const periodEndValue = session.metadata?.current_period_end;
  if (typeof periodEndValue !== "string") {
    return undefined;
  }

  const periodEndSeconds = Number(periodEndValue);
  if (!Number.isFinite(periodEndSeconds) || periodEndSeconds <= 0) {
    return undefined;
  }

  return new Date(periodEndSeconds * 1000).toISOString();
}

function getCustomerEmail(session: Stripe.Checkout.Session) {
  if (typeof session.customer_details?.email === "string" && session.customer_details.email.trim()) {
    return session.customer_details.email.trim();
  }

  if (typeof session.customer_email === "string" && session.customer_email.trim()) {
    return session.customer_email.trim();
  }

  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!stripeWebhookSecret) {
      return NextResponse.json(
        { success: false, error: "Serveren mangler STRIPE_WEBHOOK_SECRET." },
        { status: 500 }
      );
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: "Serveren mangler STRIPE_SECRET_KEY." },
        { status: 500 }
      );
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Mangler stripe-signature header." },
        { status: 400 }
      );
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? `Ugyldig webhook-signatur: ${error.message}` : "Ugyldig webhook-signatur.",
        },
        { status: 400 }
      );
    }

    if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
      return NextResponse.json({ success: true, ignored: true, eventType: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    if (!shouldActivateFromEvent(event, session)) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: "Betaling er endnu ikke bekræftet.",
        eventType: event.type,
      });
    }

    const businessId = getBusinessIdFromSession(session);
    if (!businessId) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: "Ingen business_id i client_reference_id eller metadata.",
        eventType: event.type,
      });
    }

    const activationResult = await activateBusinessAndSendEmail(businessId, {
      paymentConfirmed: true,
      subscriptionStatus: "active",
      paymentStatus: "paid",
      stripeCustomerId: getStringValue(session.customer),
      stripeSubscriptionId: getStringValue(session.subscription),
      currentPeriodEnd: getCurrentPeriodEndIso(session),
      customerEmail: getCustomerEmail(session),
    });
    if (!activationResult.success) {
      return NextResponse.json(
        { success: false, error: activationResult.error || "Aktivering fejlede." },
        { status: activationResult.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eventType: event.type,
      business_id: businessId,
      alreadyActivated: Boolean(activationResult.alreadyActivated),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Ukendt webhook-fejl.",
      },
      { status: 500 }
    );
  }
}
