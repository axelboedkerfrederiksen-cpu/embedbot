"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { isBusinessSubscriptionActive } from "@/lib/subscription";
import { TERMS } from "@/lib/compliance/legal";
import { TRIAL } from "@/lib/compliance/trial";
import { getPlan, normalizePlan, PLANS, type PlanSlug } from "@/lib/plans";

const ONBOARDING_FORM_SNAPSHOT_KEY = "onboarding_form_snapshot";
const CHECKOUT_URLS: Partial<Record<PlanSlug, string>> = {
  starter:
    process.env.NEXT_PUBLIC_STRIPE_STARTER_CHECKOUT_URL ||
    "https://buy.stripe.com/eVq00j5l7gew3dj3rIf3a02?locale=da",
  growth:
    process.env.NEXT_PUBLIC_STRIPE_GROWTH_CHECKOUT_URL ||
    "https://buy.stripe.com/6oU00j28V2nG15b1jAf3a05",
  scale:
    process.env.NEXT_PUBLIC_STRIPE_SCALE_CHECKOUT_URL ||
    "https://buy.stripe.com/aFa28rfZLfas0176DUf3a06",
};
const LOGO_UPLOAD_ENABLED = false;

type OnboardingSnapshot = {
  business_id: string;
  form: Record<string, string>;
};

const PLATFORM_OPTIONS = [
  "Shopify",
  "WordPress.org",
  "WordPress.com",
  "Wix",
  "Squarespace",
  "Webflow",
  "WooCommerce",
  "HTML",
  "Other",
];

const CHECKOUT_PLAN_OPTIONS: PlanSlug[] = ["starter", "growth", "scale"];

function formatMonthlyPrice(price: number | null) {
  if (price === null) {
    return "Kontakt os";
  }

  return new Intl.NumberFormat("da-DK").format(price);
}

function getPlatformGuidance(platform: string) {
  switch (platform) {
    case "WordPress.com":
      return {
        tone: "warning" as const,
        label: "Kræver Business-plan eller højere for tredjeparts-scripts",
      };
    case "Wix":
      return {
        tone: "warning" as const,
        label: "Kræver en betalt plan for brugerdefineret kode",
      };
    case "Squarespace":
      return {
        tone: "warning" as const,
        label: "Kræver Core-plan eller højere",
      };
    case "":
      return null;
    default:
      return {
        tone: "success" as const,
        label: "Du er klar til at fortsætte",
      };
  }
}

function getFormForSubmit(form: Record<string, string>) {
  if (LOGO_UPLOAD_ENABLED) {
    return form;
  }

  return {
    ...form,
    logo_data_url: "",
    logo_file_name: "",
  };
}

export default function ProviderPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [snapshot, setSnapshot] = useState<OnboardingSnapshot | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<PlanSlug>("starter");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initializeProviderPage() {
      if (typeof window === "undefined") {
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("reason") === "subscription_required") {
        setMessage("Du mangler et aktivt abonnement. Gennemfør betaling for at fortsætte.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const rawSnapshot = localStorage.getItem(ONBOARDING_FORM_SNAPSHOT_KEY);
        if (!rawSnapshot) {
          setMessage("Mangler onboarding-data. Gå tilbage og prøv igen.");
          setReady(true);
          return;
        }

        const parsed = JSON.parse(rawSnapshot) as Partial<OnboardingSnapshot>;
        if (!parsed?.business_id || !parsed?.form) {
          setMessage("Onboarding-data er ugyldig. Gå tilbage og prøv igen.");
          setReady(true);
          return;
        }

        const { data: business, error: businessError } = await supabase
          .from("businesses")
          .select("id, user_id, subscription_status, payment_status, stripe_subscription_id, current_period_end, activated")
          .eq("id", parsed.business_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) {
          return;
        }

        if (businessError || !business) {
          setMessage("Kunne ikke verificere din virksomhed. Gå tilbage til setup og prøv igen.");
          setReady(true);
          return;
        }

        if (isBusinessSubscriptionActive(business)) {
          router.replace("/dashboard");
          return;
        }

        setSnapshot(parsed as OnboardingSnapshot);
        setSelectedPlatform(typeof parsed.form.platform === "string" ? parsed.form.platform : "");
        setSelectedPlanSlug(normalizePlan(parsed.form.plan));
        setReady(true);
      } catch {
        if (!mounted) {
          return;
        }

        setMessage("Kunne ikke læse onboarding-data. Gå tilbage og prøv igen.");
        setReady(true);
      }
    }

    initializeProviderPage();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const guidance = useMemo(() => getPlatformGuidance(selectedPlatform), [selectedPlatform]);

  const selectedPlan = getPlan(selectedPlanSlug);

  function buildCheckoutUrl(plan: PlanSlug, businessId: string, supportEmail: string) {
    const checkoutUrl = CHECKOUT_URLS[plan];
    if (!checkoutUrl) {
      return null;
    }

    try {
      const url = new URL(checkoutUrl);
      if (supportEmail.trim()) {
        url.searchParams.set("prefilled_email", supportEmail.trim());
      }
      if (businessId.trim()) {
        url.searchParams.set("client_reference_id", businessId.trim());
      }
      return url.toString();
    } catch {
      return checkoutUrl;
    }
  }

  async function handleContinue(startTrial = true) {
    if (!snapshot) {
      setMessage("Mangler onboarding-data. Gå tilbage og prøv igen.");
      return;
    }

    if (!selectedPlatform) {
      setMessage("Vælg en platform for at fortsætte.");
      return;
    }

    if (!acceptedTerms) {
      setMessage("Bekræft vilkårene for at fortsætte.");
      return;
    }

    const plan = selectedPlanSlug;
    if (plan === "enterprise") {
      router.push("/support?plan=enterprise");
      return;
    }

    const checkoutUrl = buildCheckoutUrl(plan, snapshot.business_id, String(snapshot.form.support_email || ""));
    if (!startTrial && !checkoutUrl) {
      setMessage(`Betalingslinket til ${getPlan(plan).name} er ikke konfigureret endnu. Kontakt os, så hjælper vi dig videre.`);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const form: Record<string, string> = getFormForSubmit({
        ...snapshot.form,
        platform: selectedPlatform,
        plan,
      });
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, business_id: snapshot.business_id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Noget gik galt.");
      }

      const acceptance = await fetch("/api/dashboard/legal", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({business_id:snapshot.business_id,slug:"terms",version:TERMS.version,confirmed:true})});
      if (!acceptance.ok) throw new Error((await acceptance.json()).error || "Vilkårene kunne ikke registreres.");
      if (startTrial) {
        const trial = await fetch("/api/dashboard/trial", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({business_id:snapshot.business_id})});
        const result = await trial.json();
        if (!trial.ok) throw new Error(result.error || "Prøven kunne ikke startes.");
        localStorage.removeItem(ONBOARDING_FORM_SNAPSHOT_KEY);
        router.push("/dashboard");
      } else if (checkoutUrl) { window.location.href = checkoutUrl; }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Noget gik galt.");
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="provider-page">
      <div className="provider-shell">
        <section className="provider-card provider-intro">
          <div className="provider-kicker">Sidste trin · {selectedPlan.name}</div>
          <h1>Vælg platform og plan</h1>
          <p>
            Fortæl os, hvor chatbotten skal installeres, og vælg den plan der passer til jeres trafik.
            Start en gratis 14-dages Starter-prøve uden betalingskort, eller køb den valgte plan nu.
          </p>
        </section>

        <section className="provider-card">
          <div className="provider-section-heading">
            <span className="provider-step-number">1</span>
            <div>
              <h2>Hvor skal chatbotten bruges?</h2>
              <p>Så viser vi den rigtige installationsvejledning.</p>
            </div>
          </div>

          <div className="provider-grid" role="radiogroup" aria-label="Platform selector">
            {PLATFORM_OPTIONS.map(platform => {
              const active = selectedPlatform === platform;
              return (
                <button
                  key={platform}
                  type="button"
                  className={`provider-option ${active ? "is-active" : ""}`}
                  onClick={() => setSelectedPlatform(platform)}
                  aria-checked={active}
                  role="radio"
                >
                  <span className="provider-option-label">{platform}</span>
                  <span className="provider-option-dot" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <div className={`provider-guidance ${guidance?.tone || "idle"}`} aria-live="polite">
            <span className="provider-guidance-icon" aria-hidden="true" />
            <span>{guidance?.label || "Vælg en platform for at se en anbefaling."}</span>
          </div>

          <div className="provider-divider" />

          <div className="provider-section-heading">
            <span className="provider-step-number">2</span>
            <div>
              <h2>Vælg jeres plan</h2>
              <p>Du kan altid opgradere senere.</p>
            </div>
          </div>

          <div className="provider-plan-grid" role="radiogroup" aria-label="Vælg prisplan">
            {CHECKOUT_PLAN_OPTIONS.map(planSlug => {
              const plan = PLANS[planSlug];
              const active = selectedPlanSlug === planSlug;

              return (
                <button
                  key={planSlug}
                  type="button"
                  className={`provider-plan ${active ? "is-active" : ""}`}
                  onClick={() => setSelectedPlanSlug(planSlug)}
                  aria-checked={active}
                  role="radio"
                >
                  {planSlug === "growth" ? <span className="provider-plan-badge">Anbefalet</span> : null}
                  <span className="provider-plan-topline">
                    <span className="provider-plan-name">{plan.name}</span>
                    <span className="provider-plan-radio" aria-hidden="true" />
                  </span>
                  <span className="provider-plan-price">
                    {formatMonthlyPrice(plan.monthlyPriceDkk)} <small>kr./md.</small>
                  </span>
                  <span className="provider-plan-limit">{plan.answerLabel}</span>
                </button>
              );
            })}
          </div>

          <a className="provider-enterprise" href="/support?plan=enterprise">
            Har I brug for mere end 15.000 AI-svar? <strong>Se Enterprise →</strong>
          </a>

          {message && <p className="provider-message">{message}</p>}

          <label className="provider-terms">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
            />
            <span>
              Jeg handler på vegne af en virksomhed og accepterer, at planen er et månedligt
              abonnement, som ved et aktivt køb fornyes automatisk, indtil det opsiges. Den gratis prøve kræver intet køb. Prisen for betalte planer er ekskl. moms.
              Jeg har læst <a href="/terms" target="_blank" rel="noreferrer">vilkårene</a>,{" "}
              <a href="/refunds" target="_blank" rel="noreferrer">betalings- og refusionspolitikken</a> og{" "}
              <a href="/privacy" target="_blank" rel="noreferrer">privatlivspolitikken</a>.
            </span>
          </label>

          <p>{TRIAL.summary}</p><p>Læs <a href="/dpa" target="_blank" rel="noreferrer">databehandleraftalen og status for kundeaccept</a>. Behandling af besøgendes persondata kræver en indgået aftale og dækkende hosting- og overførselsbilag.</p><button type="button" className="provider-back" disabled={loading || !acceptedTerms} onClick={() => void handleContinue(false)}>Køb {selectedPlan.name} nu ({formatMonthlyPrice(selectedPlan.monthlyPriceDkk)} / måned)</button><div className="provider-actions">
            <a className="provider-back" href="/setup">
              Tilbage
            </a>
            <button type="button" className="provider-continue" onClick={() => void handleContinue()} disabled={loading || !ready || !acceptedTerms}>
              {loading ? "Sender videre..." : "Start gratis 14-dages Starter-prøve"}
            </button>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .provider-page {
          min-height: 100vh;
          padding: 28px 16px;
          display: grid;
          place-items: center;
          background: var(--bg-page);
          color: var(--text-primary);
          font-family: var(--font-inter), sans-serif;
        }

        .provider-terms {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 10px;
          align-items: start;
          margin-top: 20px;
          color: var(--text-muted);
          font-size: 0.82rem;
          line-height: 1.6;
        }

        .provider-terms input { margin-top: 4px; }
        .provider-terms a { color: var(--text-primary); text-underline-offset: 2px; }

        .provider-shell {
          width: 100%;
          max-width: 760px;
          display: grid;
          gap: 14px;
        }

        .provider-card {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 7px;
          padding: 26px;
          box-shadow: none;

          animation: provider-rise 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .provider-intro {
          position: relative;
          overflow: hidden;
        }

        .provider-intro::before { display: none; }

        .provider-intro > * {
          position: relative;
          z-index: 1;
        }

        .provider-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .provider-intro h1 {
          margin: 0 0 10px;
          font-family: var(--font-inter), sans-serif;
          font-size: clamp(1.8rem, 5vw, 2.4rem);
          line-height: 1.05;
          letter-spacing: -0.03em;

        font-weight: 400;
      }

        .provider-intro p {
          margin: 0;
          max-width: 60ch;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .provider-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .provider-section-heading {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .provider-step-number {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: var(--accent);
          color: #ffffff;
          font-size: 13px;
          font-weight: 500;
        }

        .provider-section-heading h2 {
          margin: 0;
          font-size: 17px;
          line-height: 1.3;
          letter-spacing: -0.025em;
        }

        .provider-section-heading p {
          margin: 2px 0 0;
          color: var(--text-subtle);
          font-size: 12px;
          line-height: 1.4;
        }

        .provider-option {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          padding: 15px 16px;
          border-radius: 7px;
          border: 1px solid var(--border);
          background: var(--bg-primary);
          color: var(--text-primary);
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
          font: inherit;
          text-align: left;
          overflow: hidden;
        }

        .provider-option::before { display: none; }

        .provider-option:hover,
        .provider-option:focus-visible {
          transform: none;
          border-color: rgba(17, 17, 17, 0.18);
          box-shadow: none;
          outline: none;
        }

        .provider-option.is-active {
          border-color: rgba(17, 17, 17, 0.24);
          box-shadow: none;
          background: var(--bg-secondary);
          transform: none;
        }

        .provider-option.is-active::before { display: none; }

        .provider-option-label {
          font-size: 15px;
          font-weight: 500;
          letter-spacing: -0.02em;
        }

        .provider-option-dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          border: 1.5px solid rgba(17, 17, 17, 0.2);
          flex: 0 0 auto;
          box-shadow: none;
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }

        .provider-option.is-active .provider-option-dot {
          border-color: var(--text-primary);
          background: var(--accent);
          transform: none;
        }

        .provider-guidance {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 7px;
          border: 1px solid var(--border);
          font-size: 14px;
          font-weight: 500;
          line-height: 1.45;
          animation: provider-guidance-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .provider-guidance::after { display: none; }

        .provider-guidance-icon {
          display: none;
        }

        .provider-guidance.warning {
          background: var(--bg-secondary);
          color: #8a5b00;
          box-shadow: none;
        }

        .provider-guidance.success {
          position: relative;
          overflow: hidden;
          background: var(--bg-secondary);
          color: #1f6a45;
          box-shadow: none;
        }

        .provider-guidance.idle {
          background: rgba(246, 243, 237, 0.72);
          color: var(--text-muted);
        }

        .provider-divider {
          height: 1px;
          margin: 24px 0;
          background: var(--border);
        }

        .provider-plan-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .provider-plan {
          position: relative;
          display: flex;
          min-width: 0;
          min-height: 152px;
          flex-direction: column;
          align-items: flex-start;
          padding: 17px 15px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: #ffffff;
          color: var(--text-primary);
          cursor: pointer;
          font: inherit;
          text-align: left;
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }

        .provider-plan:hover,
        .provider-plan:focus-visible {
          transform: none;
          border-color: rgba(17, 17, 17, 0.22);
          box-shadow: none;
          outline: none;
        }

        .provider-plan.is-active {
          border-color: var(--text-primary);
          background: var(--bg-secondary);
          box-shadow: none;
          transform: none;
        }

        .provider-plan-badge {
          position: absolute;
          top: -9px;
          left: 14px;
          padding: 4px 8px;
          border-radius: 7px;
          background: var(--accent);
          color: #ffffff;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .provider-plan-topline {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 14px;
        }

        .provider-plan-name {
          font-size: 14px;
          font-weight: 500;
        }

        .provider-plan-radio {
          width: 14px;
          height: 14px;
          flex: 0 0 auto;
          border: 1.5px solid rgba(17, 17, 17, 0.25);
          border-radius: 999px;
          box-shadow: none;
        }

        .provider-plan.is-active .provider-plan-radio {
          border-color: var(--text-primary);
          background: var(--accent);
        }

        .provider-plan-price {
          display: block;
          margin-bottom: 8px;
          font-family: var(--font-inter), sans-serif;
          font-size: clamp(1.45rem, 4vw, 1.8rem);
          line-height: 1;
          letter-spacing: -0.03em;
          white-space: nowrap;
        }

        .provider-plan-price small {
          font-family: var(--font-inter), sans-serif;
          font-size: 10px;
          font-weight: 500;
          color: var(--text-subtle);
          letter-spacing: 0;
        }

        .provider-plan-limit {
          margin-top: auto;
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 500;
          line-height: 1.4;
        }

        .provider-enterprise {
          display: block;
          margin-top: 12px;
          padding: 12px 14px;
          border-radius: 7px;
          background: rgba(246, 243, 237, 0.72);
          color: #625a50;
          font-size: 12px;
          line-height: 1.5;
          text-align: center;
          text-decoration: none;
          transition: background 160ms ease, color 160ms ease;
        }

        .provider-enterprise:hover,
        .provider-enterprise:focus-visible {
          background: rgba(246, 243, 237, 1);
          color: var(--text-primary);
          outline: none;
        }

        .provider-message {
          margin: 12px 0 0;
          color: #9b3d2f;
          font-size: 14px;
        }

        .provider-actions {
          display: flex;
          gap: 12px;
          justify-content: space-between;
          align-items: center;
          margin-top: 18px;
        }

        .provider-back,
        .provider-continue {
          border-radius: 7px;
          padding: 12px 18px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease, border-color 160ms ease;
        }

        .provider-back {
          color: var(--text-primary);
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.8);
        }

        .provider-continue {
          border: 1px solid var(--text-primary);
          background: var(--accent);
          color: #ffffff;
          cursor: pointer;
          margin-left: auto;
          box-shadow: none;
        }

        .provider-back:hover,
        .provider-continue:hover,
        .provider-back:focus-visible,
        .provider-continue:focus-visible {
          transform: translateY(-1px);
          outline: none;
        }

        .provider-continue:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        @keyframes provider-rise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes provider-shine {
          0% {
            transform: translateX(-120%);
          }
          45% {
            transform: translateX(120%);
          }
          100% {
            transform: translateX(120%);
          }
        }

        @keyframes provider-guidance-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes provider-guidance-pulse {
          0%,
          100% {
            transform: scale(0.92);
            opacity: 0.55;
          }
          50% {
            transform: scale(1.08);
            opacity: 1;
          }
        }

        @keyframes provider-icon-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @media (max-width: 640px) {
          .provider-card {
            padding: 18px;
            border-radius: 7px;
          }

          .provider-grid {
            grid-template-columns: 1fr;
          }

          .provider-plan-grid {
            grid-template-columns: 1fr;
          }

          .provider-plan {
            min-height: 132px;
          }

          .provider-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .provider-back,
          .provider-continue {
            width: 100%;
            text-align: center;
          }

          .provider-continue {
            margin-left: 0;
          }
        }
        .provider-option:focus-visible, .provider-plan:focus-visible,
        .provider-back:focus-visible, .provider-continue:focus-visible, .provider-enterprise:focus-visible {
          outline: 2px solid #746958;
          outline-offset: 3px;
        }
        .provider-section-heading h2 { font-weight: 500; }
      `}</style>
    </main>
  );
}
