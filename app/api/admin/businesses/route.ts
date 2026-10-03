import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkCsrfSafety } from "@/lib/csrf";
import { verifyAdminSession } from "@/lib/admin-auth";
import Stripe from "stripe";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function isMissingStripeResource(error: unknown) {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

const timestampKeys = new Set([
  "updated_at",
  "deleted_at",
  "current_period_end",
  "canceled_at",
  "activated_at",
  "subscription_updated_at",
]);

const numericKeys = new Set([
  "ai_answers_used",
  "ai_answer_limit_override",
  "chat_outline_width",
  "chat_outline_opacity",
  "widget_opacity",
]);

const booleanKeys = new Set(["activated", "chat_outline_enabled"]);
const planValues = new Set(["starter", "growth", "scale", "enterprise"]);
const subscriptionStatusValues = new Set(["inactive", "trialing", "active", "past_due", "canceled", "unpaid"]);

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: "Serveren mangler Supabase environment variables." },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ businesses: data || [] });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Ukendt serverfejl." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check CSRF protection
    const csrfCheck = await checkCsrfSafety(req);
    if (!csrfCheck.safe) {
      return NextResponse.json({ error: csrfCheck.error }, { status: 403 });
    }

    const authResult = await verifyAdminSession(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: "Serveren mangler Supabase environment variables." },
        { status: 500 }
      );
    }

    const { business_id, mfa_code } = await req.json();
    const stableBusinessId = typeof business_id === "string" ? business_id.trim() : "";

    if (!stableBusinessId) {
      return NextResponse.json({ error: "Mangler business_id." }, { status: 400 });
    }

    const { data: business, error: businessLookupError } = await supabase
      .from("businesses")
      .select("stripe_subscription_id,activated")
      .eq("id", stableBusinessId)
      .maybeSingle();

    if (businessLookupError || !business) {
      return NextResponse.json({ error: "Virksomheden blev ikke fundet." }, { status: 404 });
    }

    if (business.activated) {
      if (typeof mfa_code !== "string" || !/^[0-9]{6}$/.test(mfa_code)) {
        return NextResponse.json({ error: "Indtast en frisk authenticator-kode for at slette en aktiv chatbot." }, { status: 403 });
      }
      const { data: factors, error: factorError } = await authResult.supabase.auth.mfa.listFactors();
      const factor = factors?.totp.find((item) => item.status === "verified");
      if (factorError || !factor) {
        return NextResponse.json({ error: "Opsæt totrinsbekræftelse på din admin-konto før sletning af en aktiv chatbot." }, { status: 403 });
      }
      // Verify this operation on the server before cancelling billing or deleting data.
      // An existing aal2 session alone is deliberately insufficient.
      const { error: verificationError } = await authResult.supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: mfa_code });
      if (verificationError) {
        return NextResponse.json({ error: "Koden kunne ikke bekræftes. Brug en ny kode fra din authenticator." }, { status: 403 });
      }
    }

    const subscriptionId = typeof business.stripe_subscription_id === "string"
      ? business.stripe_subscription_id.trim()
      : "";

    if (subscriptionId) {
      const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
      if (!stripeSecret) {
        return NextResponse.json(
          { error: "Abonnementet kunne ikke stoppes sikkert før sletning." },
          { status: 503 }
        );
      }

      const stripe = new Stripe(stripeSecret);
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.status !== "canceled") {
          await stripe.subscriptions.cancel(subscriptionId);
        }
      } catch (error) {
        if (!isMissingStripeResource(error)) {
          console.error("admin_stripe_cancellation_failed");
          return NextResponse.json(
            { error: "Abonnementet kunne ikke stoppes sikkert før sletning." },
            { status: 502 }
          );
        }
      }
    }

    const { error: docsDeleteError } = await supabase
      .from("documents")
      .delete()
      .eq("business_id", stableBusinessId);

    if (docsDeleteError) {
      return NextResponse.json({ error: docsDeleteError.message }, { status: 500 });
    }

    const { error: businessDeleteError } = await supabase
      .from("businesses")
      .delete()
      .eq("id", stableBusinessId);

    if (businessDeleteError) {
      return NextResponse.json({ error: businessDeleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Ukendt serverfejl." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Check CSRF protection
    const csrfCheck = await checkCsrfSafety(req);
    if (!csrfCheck.safe) {
      return NextResponse.json({ error: csrfCheck.error }, { status: 403 });
    }

    const authResult = await verifyAdminSession(req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: "Serveren mangler Supabase environment variables." },
        { status: 500 }
      );
    }

    const { business_id, updates } = await req.json();
    const stableBusinessId = typeof business_id === "string" ? business_id.trim() : "";

    if (!stableBusinessId) {
      return NextResponse.json({ error: "Mangler business_id." }, { status: 400 });
    }

    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return NextResponse.json({ error: "Mangler gyldige updates." }, { status: 400 });
    }

    const blockedKeys = new Set(["id", "created_at", "user_id"]);
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).flatMap(([key, value]) => {
        if (blockedKeys.has(key)) {
          return [];
        }

        if (timestampKeys.has(key)) {
          if (typeof value !== "string") {
            return [[key, value]];
          }

          const trimmedTimestamp = value.trim();
          return [[key, trimmedTimestamp ? trimmedTimestamp : null]];
        }

        if (key === "plan") {
          const plan = typeof value === "string" ? value.trim().toLowerCase() : "";
          return planValues.has(plan) ? [[key, plan]] : [];
        }

        if (key === "subscription_status") {
          const status = typeof value === "string" ? value.trim().toLowerCase() : "";
          return subscriptionStatusValues.has(status) ? [[key, status]] : [];
        }

        if (numericKeys.has(key)) {
          if (value === null && key === "ai_answer_limit_override") {
            return [[key, null]];
          }
          const numberValue = typeof value === "number" ? value : Number(value);
          if (!Number.isFinite(numberValue)) {
            return [];
          }
          if (key === "ai_answers_used" && (!Number.isInteger(numberValue) || numberValue < 0)) {
            return [];
          }
          if (key === "ai_answer_limit_override" && (!Number.isInteger(numberValue) || numberValue < 30000)) {
            return [];
          }
          return [[key, numberValue]];
        }

        if (booleanKeys.has(key)) {
          if (typeof value === "boolean") {
            return [[key, value]];
          }
          if (value === "true" || value === "false") {
            return [[key, value === "true"]];
          }
          return [];
        }

        // Protect UUID/system columns from invalid empty-string values.
        if (key.endsWith("_id")) {
          if (typeof value !== "string") {
            return [];
          }

          const trimmedUuid = value.trim();
          if (!trimmedUuid) {
            return [];
          }

          return [[key, trimmedUuid]];
        }

        if (typeof value === "string") {
          return [[key, value.trim()]];
        }

        return [[key, value]];
      })
    );

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json(
        { error: "Ingen redigerbare felter at opdatere." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("businesses")
      .update(safeUpdates)
      .eq("id", stableBusinessId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, business: data });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Ukendt serverfejl." }, { status: 500 });
  }
}
