export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

function normalizeStatus(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function isTruthyBoolean(value: unknown): boolean {
  return value === true;
}

export function isBusinessSubscriptionActive(
  business:
    | {
        subscription_status?: unknown;
        payment_status?: unknown;
        activated?: unknown;
      }
    | null
    | undefined
): boolean {
  if (!business) {
    return false;
  }

  if (isTruthyBoolean(business.activated)) {
    return true;
  }

  const subscriptionStatus = normalizeStatus(business.subscription_status);
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
    return true;
  }

  const paymentStatus = normalizeStatus(business.payment_status);
  return paymentStatus === "paid";
}
