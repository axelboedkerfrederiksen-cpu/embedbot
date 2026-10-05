"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Link2, Mail, ShieldCheck, Store, Unplug } from "lucide-react";
import styles from "./dashboard.module.css";
import ui from "./commerce.module.css";
import WebsiteSourcePanel from "./website-source-panel";
import { SHOP_CONNECTIONS_VISIBLE } from "@/lib/integration-features";
import { commerceRequest } from "@/lib/commerce-request";

type Setup = { configured: boolean; secureStorage: boolean; localTest?: boolean; mailConfigured: boolean; shopifyConfigured: boolean; wooCommerceConfigured: boolean; notificationEmail: string; integration: { platform: string; shop_url: string; status: string; tested_at: string | null } | null };
const emptySetup: Setup = { configured: false, secureStorage: false, mailConfigured: false, shopifyConfigured: false, wooCommerceConfigured: false, notificationEmail: "", integration: null };
export default function CommercePanel({ businessId, demo = false, websiteUrl = "", onboarding = false, beforeConnect, onPlatformChange, initialPlatform = "" }: { businessId: string; demo?: boolean; websiteUrl?: string; onboarding?: boolean; beforeConnect?: () => Promise<void>; onPlatformChange?: (platform: string) => void; initialPlatform?: string }) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [platform, setPlatform] = useState(!SHOP_CONNECTIONS_VISIBLE ? "html" : initialPlatform === "HTML" ? "html" : initialPlatform === "WooCommerce" ? "woocommerce" : "shopify");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [disconnect, setDisconnect] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    if (demo) { setSetup(emptySetup); return () => controller.abort(); }
    commerceRequest(`/api/dashboard/commerce?business_id=${encodeURIComponent(businessId)}`, undefined, controller.signal).then(data => { setSetup(data); setEmail(data.notificationEmail); if (SHOP_CONNECTIONS_VISIBLE && data.integration && data.integration.status !== "disconnected") setPlatform(data.integration.platform); }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [businessId, demo]);
  useEffect(() => {
    if (!SHOP_CONNECTIONS_VISIBLE || setup?.integration?.status !== "pending" || demo) return;
    const controller = new AbortController();
    let rounds = 0;
    const timer = window.setInterval(() => {
      if (++rounds > 12) { window.clearInterval(timer); return; }
      commerceRequest(`/api/dashboard/commerce?business_id=${encodeURIComponent(businessId)}`, undefined, controller.signal).then(data => setSetup(data)).catch(() => {});
    }, 3000);
    return () => { window.clearInterval(timer); controller.abort(); };
  }, [setup?.integration?.status, businessId, demo]);
  async function action(name: string, fields: Record<string, unknown> = {}) {
    setBusy(name); setError(""); setNotice("");
    try {
      await beforeConnect?.();
      const result = await commerceRequest("/api/dashboard/commerce", { business_id: businessId, action: name, returnTo: onboarding ? "setup" : "dashboard", ...fields });
      if (result.url) { window.location.assign(result.url); return; }
      const fresh = await commerceRequest(`/api/dashboard/commerce?business_id=${encodeURIComponent(businessId)}`);
      setSetup(fresh); setEmail(fresh.notificationEmail); setDisconnect(false);
      setNotice(name === "disconnect" ? "Forbindelsen er afbrudt." : name === "test" ? "Forbindelsen er testet og fungerer." : "Dine ændringer er gemt.");
    } catch (error) { setError(error instanceof Error ? error.message : "Der opstod en fejl."); } finally { setBusy(""); }
  }
  const connected = setup?.integration && setup.integration.status !== "disconnected" ? setup.integration : null;
  const shopReady = Boolean(connected?.status === "connected" && setup?.secureStorage);
  return <div className={ui.stack}>
    {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}
    {notice ? <div className={styles.infoBanner} role="status"><CheckCircle2 size={16} />{notice}</div> : null}
    {setup?.localTest ? <div className={styles.infoBanner} role="status">Lokal test med Shopify-testbutikken. Opslag henter data fra Shopify. Den gemte webshopforbindelse bevares.</div> : null}
    {demo ? <div className={styles.infoBanner}>Dette er en forhåndsvisning. Der importeres ikke indhold.</div> : setup && !setup.configured ? <div className={styles.infoBanner}>Integrationer er ikke konfigureret på serveren endnu. Databaseopsætningen mangler.</div> : null}
    {!setup && !error ? <div className={styles.infoBanner}><span className={styles.spinner} />Henter dine integrationer…</div> : null}
    <section className={`${styles.card} ${ui.section}`}>
      <div className={ui.heading}><div className={ui.icon}><Store size={21} /></div><div><h2>{SHOP_CONNECTIONS_VISIBLE ? onboarding ? "Tilknyt din webshop" : "Forbind din webshop" : onboarding ? "Tilknyt din hjemmeside" : "Forbind din hjemmeside"}</h2><p>{SHOP_CONNECTIONS_VISIBLE ? "Forbind din webshop for at hente aktuelle produkter, lagerstatus og ordrestatus, eller importér hjemmesidens indhold." : "Importér indhold via hjemmesidens adresse eller en HTML-fil."}</p></div><span className={`${ui.tag} ${shopReady && platform !== "html" ? ui.green : ""}`}>{platform === "html" ? "Tekst og viden" : connected?.status === "connected" ? setup?.secureStorage ? "Forbundet" : "Opsætning mangler" : connected?.status === "pending" ? "Afventer godkendelse / test" : connected?.status === "error" ? "Kræver opmærksomhed" : "Ikke forbundet"}</span></div>
        <div className={ui.platforms} role="group" aria-label="Webshopplatform">{(SHOP_CONNECTIONS_VISIBLE ? ["shopify","woocommerce","html"] : ["html"]).map(p => <button type="button" key={p} className={`${ui.platform} ${platform === p ? ui.selected : ""}`} aria-pressed={platform === p} onClick={() => { setPlatform(p); onPlatformChange?.(p === "html" ? "HTML" : p === "shopify" ? "Shopify" : "WooCommerce"); }}><Store size={22} /><strong>{p === "shopify" ? "Shopify" : p === "html" ? "Hjemmeside / HTML" : "WooCommerce"}</strong><small>{p === "shopify" ? "Forbind med din Shopify-konto" : p === "html" ? "Importér en side eller en HTML-fil" : "Godkend læseadgang i din webshop"}</small></button>)}</div>
      {platform === "html" ? <WebsiteSourcePanel businessId={businessId} websiteUrl={websiteUrl} demo={demo} beforeConnect={beforeConnect} /> : connected && connected.status !== "pending" ? <div className={ui.connected}><div><strong>{connected.platform === "shopify" ? "Shopify" : "WooCommerce"}</strong><p>{connected.shop_url}</p><small>Senest testet: {connected.tested_at ? new Date(connected.tested_at).toLocaleString("da-DK") : "Ikke testet"}</small></div><div className={styles.buttonRow}><button className={styles.buttonSecondary} disabled={!!busy || !setup?.secureStorage} onClick={() => void action("test")}><Link2 size={15} />{busy === "test" ? "Tester…" : "Test forbindelsen"}</button><button className={styles.buttonGhost} disabled={!!busy || setup?.localTest} onClick={() => setDisconnect(true)}><Unplug size={15} />Afbryd</button></div>{disconnect ? <div className={ui.confirm}><p>Afbryd forbindelsen til {connected.shop_url}? Chatbotten mister adgang til live webshopdata.</p><button className={styles.buttonDanger} disabled={!!busy} onClick={() => void action("disconnect")}>Afbryd forbindelsen</button><button className={styles.buttonSecondary} disabled={!!busy} onClick={() => setDisconnect(false)}>Behold forbindelsen</button></div> : null}</div> : <>

        {connected?.status === "pending" ? <p className={ui.hint}>Godkendelsen er ikke gennemført endnu. Du kan starte forbindelsen igen her.</p> : null}
        <form className={ui.form} key={platform} onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const values = Object.fromEntries(new FormData(form)); if (platform === "shopify") void action("shopify", values); else void action("woocommerce", values); }}>
          {platform === "shopify" ? <><label className={ui.field}>Butikkens Shopify-adresse<input name="domain" defaultValue={connected?.platform === "shopify" ? connected.shop_url.replace(/^https:\/\//, "").replace(/\/$/, "") : ""} required placeholder="din-butik.myshopify.com" autoComplete="off" /></label><p className={ui.hint}>Du godkender kun læseadgang hos Shopify. Din adgangskode deles ikke med EmbedBot.</p>{setup && !setup.shopifyConfigured ? <p className={ui.hint}>Shopify-forbindelse er endnu ikke aktiveret på serveren.</p> : null}</> : <><label className={ui.field}>Webshoppens HTTPS-adresse<input type="url" name="origin" defaultValue={connected?.platform === "woocommerce" ? connected.shop_url : ""} required placeholder="https://din-webshop.dk" /></label><label className={ui.field}>Butikkens valuta<input name="currency" required defaultValue="DKK" minLength={3} maxLength={3} /></label><p className={ui.hint}>Du sendes til din webshop for at godkende læseadgang. WooCommerce sender nøglerne direkte til EmbedBots server.</p></>}
          <div><button className={styles.button} disabled={!!busy || demo || !setup?.configured || !setup.secureStorage || (platform === "shopify" ? !setup.shopifyConfigured : !setup.wooCommerceConfigured)}><Link2 size={15} />{busy ? "Forbinder…" : platform === "shopify" ? "Forbind med Shopify" : "Forbind WooCommerce"}</button></div>
        </form>
      </>}
      {platform !== "html" && connected ? <>
        {setup && !setup.secureStorage ? <p className={ui.hint} role="status">Forbindelsen er gemt, men serverens sikre adgang til webshoppen mangler. Lager- og ordreopslag kan først bruges, når serveropsætningen er klar.</p> : null}
        <div className={ui.twoColumns}>
          <div className={ui.connected}><strong>Lagerstatus og produkter</strong><span className={`${ui.tag} ${shopReady ? ui.green : ""}`}>{shopReady ? "Klar til test" : "Afventer opsætning"}</span><p>Chatbotten henter pris og lagerstatus for produkter og varianter. Oplysningerne opdateres ved opslag og kan være op til 30 sekunder gamle.</p><p className={ui.hint}>Prøv: “Er dette produkt på lager?”</p></div>
          <div className={ui.connected}><strong>Ordrestatus og tracking</strong><span className={`${ui.tag} ${shopReady && setup?.mailConfigured ? ui.green : ""}`}>{shopReady && setup?.mailConfigured ? "Klar til test" : !setup?.mailConfigured ? "Mailopsætning mangler" : "Afventer opsætning"}</span><p>Kunden angiver ordrenummer og købsmail og bekræfter en engangskode. Derefter hentes ordrestatus og de trackingoplysninger, webshoppen har.</p><p className={ui.hint}>Prøv: “Hvor er min ordre?”</p></div>
        </div>
        {!onboarding && !demo ? <div className={styles.buttonRow}><Link className={styles.buttonSecondary} href={`/preview/${businessId}`} target="_blank" rel="noopener noreferrer">Prøv lager- og ordrestatus i chatten</Link></div> : null}
      </> : null}
      <div className={ui.safety}><ShieldCheck size={17} /><span>{platform === "html" ? "Vi læser hjemmesidens indhold. Chatbotten ændrer ikke noget på din hjemmeside." : "Forbindelsen giver kun læseadgang. Chatbotten ændrer ikke produkter, lager eller ordrer."}</span></div>
    </section>
    <section className={`${styles.card} ${ui.section}`}><div className={ui.heading}><div className={ui.icon}><Mail size={21} /></div><div><h2>Notifikationer om supportsager</h2><p>Alle sager gemmes i dashboardet. Vælg også, hvem der skal have besked på mail.</p></div></div><form className={ui.form} onSubmit={e => { e.preventDefault(); void action("settings", { notificationEmail: email }); }}><label className={ui.field}>Modtagermail<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="support@din-webshop.dk" /></label>{setup && !setup.mailConfigured ? <p className={ui.hint}>Mailafsendelse er ikke konfigureret på serveren. Sagerne bliver stadig gemt.</p> : null}<div><button className={styles.buttonSecondary} disabled={!!busy || demo || !setup?.configured}>{busy === "settings" ? "Gemmer…" : "Gem modtagermail"}</button></div></form></section>
  </div>;
}
