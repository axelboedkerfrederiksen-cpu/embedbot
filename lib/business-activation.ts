import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import type { PlanSlug } from "@/lib/plans";

type BusinessRecord = {
  id: string;
  name: string | null;
  website_url: string | null;
  support_email: string | null;
  activated: boolean | null;
  subscription_status: string | null;
  payment_status: string | null;
  stripe_subscription_id: string | null;
};

type ActivationResult = {
  success: boolean;
  alreadyActivated?: boolean;
  error?: string;
  status?: number;
};

type ActivationBillingUpdate = {
  accessSource?: "stripe" | "manual_pilot";
  paymentConfirmed?: boolean;
  subscriptionStatus?: string;
  paymentStatus?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  customerEmail?: string;
  plan?: PlanSlug;
};

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function buildBillingUpdatePayload(
  billingUpdate: ActivationBillingUpdate,
  shouldUseStripeEmail: boolean
) {
  const updatePayload: Record<string, unknown> = {
    subscription_updated_at: new Date().toISOString(),
  };

  if (billingUpdate.subscriptionStatus) {
    updatePayload.subscription_status = billingUpdate.subscriptionStatus;
  }

  if (billingUpdate.paymentStatus) {
    updatePayload.payment_status = billingUpdate.paymentStatus;
  }

  if (billingUpdate.stripeCustomerId) {
    updatePayload.stripe_customer_id = billingUpdate.stripeCustomerId;
  }

  if (billingUpdate.stripeSubscriptionId) {
    updatePayload.stripe_subscription_id = billingUpdate.stripeSubscriptionId;
  }

  if (billingUpdate.currentPeriodEnd) {
    updatePayload.current_period_end = billingUpdate.currentPeriodEnd;
  }

  if (billingUpdate.plan) {
    updatePayload.plan = billingUpdate.plan;
  }

  if (shouldUseStripeEmail && billingUpdate.customerEmail) {
    updatePayload.support_email = billingUpdate.customerEmail;
  }

  return updatePayload;
}

function buildCustomerEmailHtml(
  businessId: string,
  businessName: string | null,
  manualPilotEndsAt?: string,
) {
  const embedScript = `<script src="https://www.embedbot.dk/widget.js?id=${businessId}"></script>`;
  const previewUrl = `https://www.embedbot.dk/preview/${businessId}`;
  const firstName = (businessName || "").split(" ")[0] || "der";
  const escapedFirstName = firstName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedScript = embedScript
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const pilotParagraph = manualPilotEndsAt
    ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#111;">Jeres gratis pilot løber til og med ${new Intl.DateTimeFormat("da-DK", { dateStyle: "long", timeZone: "Europe/Copenhagen" }).format(new Date(manualPilotEndsAt))}. Der er intet betalingskort og ingen binding.</p>`
    : "";

  return `
    <div style="margin:0;padding:32px 16px;background:#f9f9f9;font-family:Arial,sans-serif;color:#111;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e6e6;border-radius:8px;padding:36px 32px;">
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#111;">Hej ${escapedFirstName},</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#111;">Din AI-chatbot er nu klar til at gå live på din webshop.</p>
        ${pilotParagraph}
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#111;">Test først svar og udseende på jeres demoside: <a href="${previewUrl}" style="color:#111;font-weight:700;">Åbn privat demo</a>.</p>
        <p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#111;">Indsæt denne kode lige før <code style="font-family:Consolas,Monaco,monospace;font-size:13px;">&lt;/body&gt;</code> på din hjemmeside:</p>
        <div style="background:#111111;color:#f9f9f9;border-radius:6px;padding:16px;font-family:Consolas,Monaco,monospace;font-size:13px;line-height:1.5;word-break:break-all;margin:0 0 24px;">
          ${escapedScript}
        </div>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#111;">Det er det hele. Bogstaveligt talt.</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#111;">Har du spørgsmål, så svar bare på denne mail.</p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#111;">// Axel fra EmbedBot</p>
      </div>
    </div>
  `;
}

export async function activateBusinessAndSendEmail(
  businessId: string,
  billingUpdate?: ActivationBillingUpdate
): Promise<ActivationResult> {
  const stableBusinessId = businessId.trim();
  if (!stableBusinessId) {
    return { success: false, error: "Mangler business_id.", status: 400 };
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return { success: false, error: "Serveren mangler environment variables.", status: 500 };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  const normalizedSubscriptionStatus = (billingUpdate?.subscriptionStatus || "").trim().toLowerCase();
  const normalizedPaymentStatus = (billingUpdate?.paymentStatus || "").trim().toLowerCase();
  const hasConfirmedPaidAccess = normalizedPaymentStatus === "paid";
  const hasConfirmedTrialAccess = normalizedSubscriptionStatus === "trialing";
  const manualPilotEnd = billingUpdate?.currentPeriodEnd ? new Date(billingUpdate.currentPeriodEnd).getTime() : Number.NaN;
  const hasConfirmedManualPilotAccess =
    billingUpdate?.accessSource === "manual_pilot"
    && hasConfirmedTrialAccess
    && normalizedPaymentStatus === "unpaid"
    && Number.isFinite(manualPilotEnd)
    && manualPilotEnd > Date.now()
    && !billingUpdate.stripeCustomerId
    && !billingUpdate.stripeSubscriptionId;
  const hasConfirmedStripeAccess =
    billingUpdate?.accessSource !== "manual_pilot"
    && billingUpdate?.paymentConfirmed
    && (hasConfirmedPaidAccess || hasConfirmedTrialAccess);

  // Hard guard: access must come from Stripe or an authenticated, expiring admin pilot.
  if (!hasConfirmedStripeAccess && !hasConfirmedManualPilotAccess) {
    return {
      success: false,
      error: "Aktivering er blokeret: adgang er hverken bekræftet af Stripe eller som en gyldig admin-pilot.",
      status: 402,
    };
  }

  const { data: businessRows, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, website_url, support_email, activated, subscription_status, payment_status, stripe_subscription_id")
    .eq("id", stableBusinessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<BusinessRecord[]>();

  const business = businessRows?.[0] || null;

  if (businessError || !business) {
    return {
      success: false,
      error: businessError?.message || "Virksomhed ikke fundet.",
      status: 404,
    };
  }

  if (
    hasConfirmedManualPilotAccess
    && (
      Boolean((business.stripe_subscription_id || "").trim())
      || (business.subscription_status || "").trim().toLowerCase() === "active"
      || (business.payment_status || "").trim().toLowerCase() === "paid"
    )
  ) {
    return {
      success: false,
      error: "En betalende eller Stripe-administreret kunde kan ikke overskrives med en manuel pilot.",
      status: 409,
    };
  }

  const supportEmail = (business.support_email || "").trim();
  const stripeCheckoutEmail = (billingUpdate?.customerEmail || "").trim();
  const recipientEmail = supportEmail || stripeCheckoutEmail;
  const billingPayload = buildBillingUpdatePayload(billingUpdate, !supportEmail && Boolean(stripeCheckoutEmail));

  const { error: billingUpdateError } = await supabase
    .from("businesses")
    .update(billingPayload)
    .eq("id", stableBusinessId);

  if (billingUpdateError) {
    return {
      success: false,
      error: `Kunne ikke gemme Stripe betalingsdata: ${billingUpdateError.message}`,
      status: 500,
    };
  }

  if (business.activated) {
    return { success: true, alreadyActivated: true };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    return { success: false, error: "Serveren mangler NEXT_PUBLIC_APP_URL.", status: 500 };
  }

  let ingestEndpoint = "";
  try {
    ingestEndpoint = new URL("/api/ingest", appUrl).toString();
  } catch {
    return { success: false, error: "NEXT_PUBLIC_APP_URL er ugyldig.", status: 500 };
  }

  if (!resend) {
    return { success: false, error: "Resend-klient kunne ikke initialiseres.", status: 500 };
  }

  if (!business.website_url) {
    return { success: false, error: "Virksomheden mangler website_url.", status: 400 };
  }

  if (!recipientEmail) {
    return { success: false, error: "Virksomheden mangler support_email.", status: 400 };
  }

  const ingestRes = await fetch(ingestEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: business.website_url, business_id: stableBusinessId }),
  });

  const ingestData = await ingestRes.json().catch(() => ({} as { success?: boolean; error?: string }));
  if (!ingestRes.ok || !ingestData.success) {
    return {
      success: false,
      error: ingestData.error || "Ingest fejlede.",
      status: ingestRes.status || 502,
    };
  }

  const { error: mailError } = await resend.emails.send({
    from: "axel@embedbot.dk",
    to: recipientEmail,
    subject: "Din EmbedBot er klar! 🎉",
    html: buildCustomerEmailHtml(
      stableBusinessId,
      business.name,
      hasConfirmedManualPilotAccess ? billingUpdate?.currentPeriodEnd : undefined,
    ),
  });

  if (mailError) {
    return {
      success: false,
      error: `Kunne ikke sende kundemail: ${mailError.message}`,
      status: 502,
    };
  }

  const updatePayload: Record<string, unknown> = {
    activated: true,
    activated_at: new Date().toISOString(),
  }

  const { error: updateError } = await supabase
    .from("businesses")
    .update(updatePayload)
    .eq("id", stableBusinessId);

  if (updateError) {
    return {
      success: false,
      error: `Kunne ikke opdatere aktiv status: ${updateError.message}`,
      status: 500,
    };
  }

  return { success: true };
}
