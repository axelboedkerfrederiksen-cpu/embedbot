export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const BLOCKED_SUBSCRIPTION_STATUSES = new Set(["past_due", "canceled", "unpaid"]);
const BLOCKED_PAYMENT_STATUSES = new Set(["failed", "refunded"]);

function normalizeStatus(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

export function isBusinessSubscriptionActive(
  business: Record<string, unknown> | null | undefined
): boolean {
  if (!business) {
    return false;
  }

  const subscriptionStatus = normalizeStatus(business["subscription_status"]);
  const paymentStatus = normalizeStatus(business["payment_status"]);

  // Stripe billing state is authoritative once it reports a failed or ended subscription.
  // `activated` only means that the bot was successfully provisioned at least once.
  if (BLOCKED_PAYMENT_STATUSES.has(paymentStatus)) {
    return false;
  }

  if (BLOCKED_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
    return false;
  }

  if (ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
    return true;
  }

  const stripeSubscriptionId = business["stripe_subscription_id"];
  if (typeof stripeSubscriptionId === "string" && stripeSubscriptionId.trim()) {
    return false;
  }

  if (paymentStatus === "paid") {
    return true;
  }

  // Backwards-compatible fallback for manually activated customers created before billing fields.
  return business["activated"] === true;
}
