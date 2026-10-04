"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { CONSENT_KEY, CONSENT_VERSION, parseConsent, analyticsPage, analyticsAllowed, markWithdrawn, installAnalyticsGuard, type ConsentChoice } from "@/lib/compliance/consent";
function readConsent():ConsentChoice { try { return parseConsent(window.localStorage.getItem(CONSENT_KEY)); } catch { return null; } }

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
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentChoice>(null);
  const [ready, setReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    installAnalyticsGuard();
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
    if (choice === "rejected") markWithdrawn();
    try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, version: CONSENT_VERSION, savedAt: new Date().toISOString() })); } catch { /* No analytics if consent cannot be persisted. */ }
    setConsent(choice);
    setShowSettings(false);
    if (consent === "accepted" || choice === "accepted") window.location.reload();
  }

  const showBanner = ready && (consent === null || showSettings);
  const canUseAnalytics = ready && consent === "accepted" && analyticsPage(pathname);

  return (
    <>
      {canUseAnalytics ? (
        <>
          <Script id="plausible-script" src="https://plausible.io/js/pa-S_z8kpW-DSXLjSuxMoAre.js" strategy="afterInteractive" />
          <Script id="plausible-init" strategy="afterInteractive">
            {"window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)};window.plausible.init=window.plausible.init||function(i){plausible.o=i||{}};window.plausible.init({transformRequest:function(payload){try{var c=JSON.parse(localStorage.getItem(\"embedbot_cookie_consent\")||\"null\");if(!c||c.choice!==\"accepted\"||c.version!==\"2026-10-02\")return null;payload.u=location.origin+location.pathname;payload.r=null;return payload;}catch(e){return null;}}});"}
          </Script>
          <Analytics beforeSend={event => analyticsAllowed() ? event : null} />
          <SpeedInsights beforeSend={event => analyticsAllowed() ? event : null} />
        </>
      ) : null}

      {showBanner ? (
        <section className="cookie-consent" role="dialog" aria-modal="false" aria-labelledby="cookie-consent-title" aria-describedby="cookie-consent-description">
          <div>
            <p className="cookie-consent-kicker">Dit privatliv</p>
            <h2 id="cookie-consent-title">Må vi bruge analyseværktøjer?</h2>
            <p id="cookie-consent-description">
              Vi bruger Plausible Analytics, Vercel Web Analytics og Speed Insights til besøgsstatistik og hastighedsmålinger, hvis du accepterer. Nødvendig lagring til login og sikkerhed er altid aktiv. Læs vores{" "}
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
