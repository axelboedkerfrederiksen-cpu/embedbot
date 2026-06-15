"use client";

import { useEffect, useMemo, useState } from "react";

const ONBOARDING_FORM_SNAPSHOT_KEY = "onboarding_form_snapshot";
const CHECKOUT_URL = "https://buy.stripe.com/eVq00j5l7gew3dj3rIf3a02?locale=da";

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
  "Other",
];

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

export default function ProviderPage() {
  const [snapshot, setSnapshot] = useState<OnboardingSnapshot | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
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

      setSnapshot(parsed as OnboardingSnapshot);
      setSelectedPlatform(typeof parsed.form.platform === "string" ? parsed.form.platform : "");
      setReady(true);
    } catch {
      setMessage("Kunne ikke læse onboarding-data. Gå tilbage og prøv igen.");
      setReady(true);
    }
  }, []);

  const guidance = useMemo(() => getPlatformGuidance(selectedPlatform), [selectedPlatform]);

  async function handleContinue() {
    if (!snapshot) {
      setMessage("Mangler onboarding-data. Gå tilbage og prøv igen.");
      return;
    }

    if (!selectedPlatform) {
      setMessage("Vælg en platform for at fortsætte.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const form = { ...snapshot.form, platform: selectedPlatform };
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, business_id: snapshot.business_id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Noget gik galt.");
      }

      localStorage.removeItem(ONBOARDING_FORM_SNAPSHOT_KEY);
      window.location.href = CHECKOUT_URL;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Noget gik galt.");
      setLoading(false);
    }
  }

  return (
    <main className="provider-page">
      <div className="provider-shell">
        <section className="provider-card provider-intro">
          <div className="provider-kicker">Næste trin før betaling</div>
          <h1>Hvilken platform bruger du?</h1>
          <p>
            Vælg hvor din chatbot skal installeres. Det hjælper os med at vise den rigtige vejledning
            og sende dig direkte videre til betaling bagefter.
          </p>
        </section>

        <section className="provider-card">
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

          {message && <p className="provider-message">{message}</p>}

          <div className="provider-actions">
            <a className="provider-back" href="/setup">
              Tilbage
            </a>
            <button type="button" className="provider-continue" onClick={handleContinue} disabled={loading || !ready}>
              {loading ? "Sender videre..." : "Fortsæt til betaling"}
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
          background:
            radial-gradient(circle at 14% 16%, rgba(246, 243, 237, 0.95) 0%, rgba(246, 243, 237, 0) 24%),
            radial-gradient(circle at 86% 18%, rgba(246, 243, 237, 0.9) 0%, rgba(246, 243, 237, 0) 22%),
            linear-gradient(180deg, #ffffff 0%, #fcfaf6 58%, #f8f4ee 100%);
          color: #111111;
          font-family: "Poppins", sans-serif;
        }

        .provider-shell {
          width: 100%;
          max-width: 760px;
          display: grid;
          gap: 14px;
        }

        .provider-card {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(17, 17, 17, 0.08);
          border-radius: 24px;
          padding: 26px;
          box-shadow: 0 20px 50px rgba(17, 17, 17, 0.08);
          backdrop-filter: blur(10px);
          animation: provider-rise 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .provider-intro {
          position: relative;
          overflow: hidden;
        }

        .provider-intro::before {
          content: "";
          position: absolute;
          inset: -40% auto auto -10%;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(246, 243, 237, 0.9) 0%, rgba(246, 243, 237, 0) 72%);
          pointer-events: none;
        }

        .provider-intro > * {
          position: relative;
          z-index: 1;
        }

        .provider-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6b6258;
          margin-bottom: 12px;
        }

        .provider-intro h1 {
          margin: 0 0 10px;
          font-family: "DM Serif Display", serif;
          font-size: clamp(1.8rem, 5vw, 2.4rem);
          line-height: 1.05;
          letter-spacing: -0.03em;
        }

        .provider-intro p {
          margin: 0;
          max-width: 60ch;
          color: #5f584f;
          line-height: 1.6;
        }

        .provider-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .provider-option {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          padding: 15px 16px;
          border-radius: 18px;
          border: 1px solid rgba(17, 17, 17, 0.1);
          background: rgba(255, 255, 255, 0.9);
          color: #111111;
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease;
          font: inherit;
          text-align: left;
          overflow: hidden;
        }

        .provider-option::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.8) 48%, transparent 100%);
          transform: translateX(-120%);
          opacity: 0;
          transition: opacity 180ms ease;
        }

        .provider-option:hover,
        .provider-option:focus-visible {
          transform: translateY(-2px);
          border-color: rgba(17, 17, 17, 0.18);
          box-shadow: 0 14px 32px rgba(17, 17, 17, 0.08);
          outline: none;
        }

        .provider-option.is-active {
          border-color: rgba(17, 17, 17, 0.24);
          box-shadow: 0 16px 36px rgba(17, 17, 17, 0.1);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 243, 237, 0.84));
          transform: translateY(-1px) scale(1.01);
        }

        .provider-option.is-active::before {
          opacity: 1;
          animation: provider-shine 2.8s ease-in-out infinite;
        }

        .provider-option-label {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .provider-option-dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          border: 1.5px solid rgba(17, 17, 17, 0.2);
          flex: 0 0 auto;
          box-shadow: inset 0 0 0 4px transparent;
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }

        .provider-option.is-active .provider-option-dot {
          border-color: #111111;
          box-shadow: inset 0 0 0 4px #111111;
          transform: scale(1.08);
        }

        .provider-guidance {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(17, 17, 17, 0.08);
          font-size: 14px;
          font-weight: 600;
          line-height: 1.45;
          animation: provider-guidance-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .provider-guidance::after {
          content: "";
          margin-left: auto;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0) 72%);
          opacity: 0.9;
          animation: provider-guidance-pulse 1.8s ease-in-out infinite;
        }

        .provider-guidance-icon {
          display: none;
        }

        .provider-guidance.warning {
          background: linear-gradient(135deg, rgba(255, 244, 214, 0.98), rgba(255, 255, 255, 0.92));
          color: #8a5b00;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .provider-guidance.success {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(237, 250, 243, 0.98), rgba(255, 255, 255, 0.92));
          color: #1f6a45;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
        }

        .provider-guidance.idle {
          background: rgba(246, 243, 237, 0.72);
          color: #5f584f;
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
          border-radius: 999px;
          padding: 12px 18px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease, border-color 160ms ease;
        }

        .provider-back {
          color: #111111;
          border: 1px solid rgba(17, 17, 17, 0.12);
          background: rgba(255, 255, 255, 0.8);
        }

        .provider-continue {
          border: 1px solid #111111;
          background: #111111;
          color: #ffffff;
          cursor: pointer;
          margin-left: auto;
          box-shadow: 0 14px 30px rgba(17, 17, 17, 0.15);
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
            border-radius: 16px;
          }

          .provider-grid {
            grid-template-columns: 1fr;
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
      `}</style>
    </main>
  );
}
