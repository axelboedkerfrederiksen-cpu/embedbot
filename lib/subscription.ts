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

  const stripeSubscriptionId = business["stripe_subscription_id"];
  const hasStripeSubscription = typeof stripeSubscriptionId === "string" && Boolean(stripeSubscriptionId.trim());

  if (subscriptionStatus === "trialing") {
    // Stripe keeps its own trial status authoritative. Card-free admin pilots
    // have no Stripe subscription and must carry a future expiry timestamp.
    if (hasStripeSubscription) {
      return true;
    }

    const trialEnd = business["current_period_end"];
    const trialEndTime = typeof trialEnd === "string" ? new Date(trialEnd).getTime() : Number.NaN;
    return Number.isFinite(trialEndTime) && trialEndTime > Date.now();
  }

  if (subscriptionStatus === "active") {
    return true;
  }

  if (hasStripeSubscription) {
    return false;
  }

  if (paymentStatus === "paid") {
    return true;
  }

  // Backwards-compatible fallback for manually activated customers created before billing fields.
  return business["activated"] === true;
}
