import type Stripe from "stripe";
import type { PlanSlug } from "@/lib/plans";

export type StoredSubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export function getStripeObjectId(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id.trim() : "";
  }

  return "";
}

export function normalizeSubscriptionStatus(value: unknown): StoredSubscriptionStatus {
  switch (value) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "unpaid":
      return value;
    default:
      return "inactive";
  }
}

export function getPaymentStatusForSubscription(
  status: StoredSubscriptionStatus,
  previousPaymentStatus?: unknown
): "paid" | "unpaid" | "failed" | "refunded" {
  if (status === "active") {
    return "paid";
  }

  if (status === "past_due" || status === "unpaid") {
    return "failed";
  }

  if (previousPaymentStatus === "refunded") {
    return "refunded";
  }

  return "unpaid";
}

export function getSubscriptionPeriodEndIso(subscription: Stripe.Subscription): string | null {
  const directPeriodEnd = (subscription as unknown as { current_period_end?: unknown }).current_period_end;
  if (typeof directPeriodEnd === "number" && Number.isFinite(directPeriodEnd) && directPeriodEnd > 0) {
    return new Date(directPeriodEnd * 1000).toISOString();
  }

  const itemPeriodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value) => Number.isFinite(value) && value > 0);

  return itemPeriodEnds.length > 0
    ? new Date(Math.max(...itemPeriodEnds) * 1000).toISOString()
    : null;
}

export function getPlanFromPrice(price: Stripe.Price | null | undefined): PlanSlug | undefined {
  if (!price) {
    return undefined;
  }

  const configuredPriceIds: Array<[PlanSlug, string | undefined]> = [
    ["starter", process.env.STRIPE_STARTER_PRICE_ID],
    ["growth", process.env.STRIPE_GROWTH_PRICE_ID],
    ["scale", process.env.STRIPE_SCALE_PRICE_ID],
  ];
  const configuredPlan = configuredPriceIds.find(([, id]) => id?.trim() === price.id)?.[0];
  if (configuredPlan) {
    return configuredPlan;
  }

  if (price.currency !== "dkk" || price.unit_amount === null) {
    return undefined;
  }

  const plansByMonthlyAmount: Record<number, PlanSlug> = {
    29_900: "starter",
    69_900: "growth",
    149_900: "scale",
  };

  return plansByMonthlyAmount[price.unit_amount];
}

export function getStripePriceIdForPlan(plan: PlanSlug): string | null {
  const priceIds: Partial<Record<PlanSlug, string | undefined>> = {
    starter: process.env.STRIPE_STARTER_PRICE_ID,
    growth: process.env.STRIPE_GROWTH_PRICE_ID,
    scale: process.env.STRIPE_SCALE_PRICE_ID,
  };

  return priceIds[plan]?.trim() || null;
}

export function getPlanFromSubscription(subscription: Stripe.Subscription): PlanSlug | undefined {
  return getPlanFromPrice(subscription.items.data[0]?.price);
}

export function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string {
  return getStripeObjectId(invoice.parent?.subscription_details?.subscription);
}

export function isCurrentSubscriptionInvoice(
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription
): boolean {
  const latestInvoiceId = getStripeObjectId(subscription.latest_invoice);
  return !latestInvoiceId || latestInvoiceId === invoice.id;
}
