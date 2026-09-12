import test from "node:test";
import assert from "node:assert/strict";
import { isBusinessSubscriptionActive } from "../lib/subscription.ts";
import {
  getPaymentStatusForSubscription,
  getPlanFromPrice,
  getStripeObjectId,
  getSubscriptionIdFromInvoice,
  isCurrentSubscriptionInvoice,
  normalizeSubscriptionStatus,
} from "../lib/stripe-billing.ts";
import type Stripe from "stripe";

test("active and trialing subscriptions have access", () => {
  assert.equal(isBusinessSubscriptionActive({ subscription_status: "active", payment_status: "paid" }), true);
  assert.equal(isBusinessSubscriptionActive({ subscription_status: "trialing", payment_status: "unpaid" }), true);
});

test("ended or failed billing overrides the historical activated flag", () => {
  assert.equal(isBusinessSubscriptionActive({ subscription_status: "canceled", payment_status: "paid", activated: true }), false);
  assert.equal(isBusinessSubscriptionActive({ subscription_status: "past_due", payment_status: "failed", activated: true }), false);
  assert.equal(isBusinessSubscriptionActive({ subscription_status: "active", payment_status: "failed", activated: true }), false);
  assert.equal(isBusinessSubscriptionActive({ subscription_status: "active", payment_status: "refunded", activated: true }), false);
  assert.equal(isBusinessSubscriptionActive({ subscription_status: "inactive", payment_status: "unpaid", stripe_subscription_id: "sub_paused", activated: true }), false);
});

test("legacy manually activated customers retain access without authoritative billing state", () => {
  assert.equal(isBusinessSubscriptionActive({ subscription_status: "inactive", payment_status: "unpaid", activated: true }), true);
  assert.equal(isBusinessSubscriptionActive({ activated: false }), false);
});

test("Stripe statuses are normalized to values accepted by the database", () => {
  assert.equal(normalizeSubscriptionStatus("active"), "active");
  assert.equal(normalizeSubscriptionStatus("incomplete"), "inactive");
  assert.equal(normalizeSubscriptionStatus("paused"), "inactive");
  assert.equal(normalizeSubscriptionStatus(undefined), "inactive");
});

test("subscription status maps to a stable payment status", () => {
  assert.equal(getPaymentStatusForSubscription("active"), "paid");
  assert.equal(getPaymentStatusForSubscription("past_due"), "failed");
  assert.equal(getPaymentStatusForSubscription("unpaid"), "failed");
  assert.equal(getPaymentStatusForSubscription("canceled"), "unpaid");
  assert.equal(getPaymentStatusForSubscription("canceled", "refunded"), "refunded");
});

test("plan mapping prefers configured price IDs and falls back to known DKK amounts", () => {
  const previousGrowthPriceId = process.env.STRIPE_GROWTH_PRICE_ID;
  process.env.STRIPE_GROWTH_PRICE_ID = "price_growth";
  try {
    assert.equal(getPlanFromPrice({ id: "price_growth", currency: "eur", unit_amount: 1 } as Stripe.Price), "growth");
    assert.equal(getPlanFromPrice({ id: "price_other", currency: "dkk", unit_amount: 149_900 } as Stripe.Price), "scale");
    assert.equal(getPlanFromPrice({ id: "price_unknown", currency: "dkk", unit_amount: 42 } as Stripe.Price), undefined);
  } finally {
    if (previousGrowthPriceId === undefined) {
      delete process.env.STRIPE_GROWTH_PRICE_ID;
    } else {
      process.env.STRIPE_GROWTH_PRICE_ID = previousGrowthPriceId;
    }
  }
});

test("Stripe object and invoice subscription IDs support expanded and string forms", () => {
  assert.equal(getStripeObjectId(" sub_123 "), "sub_123");
  assert.equal(getStripeObjectId({ id: "cus_123" }), "cus_123");
  assert.equal(getStripeObjectId(null), "");

  const invoice = {
    parent: {
      subscription_details: {
        subscription: { id: "sub_from_invoice" },
      },
    },
  } as unknown as Stripe.Invoice;
  assert.equal(getSubscriptionIdFromInvoice(invoice), "sub_from_invoice");
});

test("out-of-order invoice events cannot overwrite the newest subscription state", () => {
  const currentInvoice = { id: "in_current" } as Stripe.Invoice;
  const oldInvoice = { id: "in_old" } as Stripe.Invoice;
  const subscription = { latest_invoice: "in_current" } as Stripe.Subscription;

  assert.equal(isCurrentSubscriptionInvoice(currentInvoice, subscription), true);
  assert.equal(isCurrentSubscriptionInvoice(oldInvoice, subscription), false);
});
