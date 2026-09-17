"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { useEffect, useState } from "react";

const CONSENT_KEY = "embedbot_cookie_consent";
const CONSENT_VERSION = "2026-09-17";

type ConsentChoice = "accepted" | "rejected" | null;

function readConsent(): ConsentChoice {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { choice?: ConsentChoice; version?: string };
    return saved.version === CONSENT_VERSION && (saved.choice === "accepted" || saved.choice === "rejected")
      ? saved.choice
      : null;
  } catch {
    return null;
  }
}

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      className="cookie-preferences-button"
      onClick={() => window.dispatchEvent(new Event("embedbot:open-cookie-settings"))}
    >
      Administrér cookies
    </button>
  );
}

export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentChoice>(null);
  const [ready, setReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setConsent(readConsent());
      setReady(true);
    });

    const openSettings = () => setShowSettings(true);
    window.addEventListener("embedbot:open-cookie-settings", openSettings);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("embedbot:open-cookie-settings", openSettings);
    };
  }, []);

  function saveConsent(choice: Exclude<ConsentChoice, null>) {
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ choice, version: CONSENT_VERSION, savedAt: new Date().toISOString() }),
    );
    setConsent(choice);
    setShowSettings(false);
  }

  const showBanner = ready && (consent === null || showSettings);
  const canUseAnalytics = ready && consent === "accepted";

  return (
    <>
      {canUseAnalytics ? (
        <>
          <Script id="plausible-script" src="https://plausible.io/js/pa-S_z8kpW-DSXLjSuxMoAre.js" strategy="afterInteractive" />
          <Script id="plausible-init" strategy="afterInteractive">
            {"window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)};window.plausible.init=window.plausible.init||function(i){plausible.o=i||{}};window.plausible.init();"}
          </Script>
          <Analytics />
          <SpeedInsights />
        </>
      ) : null}

      {showBanner ? (
        <section className="cookie-consent" role="dialog" aria-modal="false" aria-labelledby="cookie-consent-title" aria-describedby="cookie-consent-description">
          <div>
            <p className="cookie-consent-kicker">Dit privatliv</p>
            <h2 id="cookie-consent-title">Må vi bruge analyseværktøjer?</h2>
            <p id="cookie-consent-description">
              Vi bruger kun analyse og hastighedsmålinger, hvis du accepterer. Nødvendig lagring til login og sikkerhed er altid aktiv. Læs vores{" "}
              <a href="/cookies">cookiepolitik</a>.
            </p>
          </div>
          <div className="cookie-consent-actions">
            <button type="button" className="cookie-consent-secondary" onClick={() => saveConsent("rejected")}>Afvis analyse</button>
            <button type="button" className="cookie-consent-primary" onClick={() => saveConsent("accepted")}>Acceptér analyse</button>
          </div>
        </section>
      ) : null}
    </>
  );
}
