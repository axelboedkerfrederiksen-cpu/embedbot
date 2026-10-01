"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Link2, Mail, ShieldCheck, Store, Unplug } from "lucide-react";
import styles from "./dashboard.module.css";
import ui from "./commerce.module.css";

type Setup = { configured: boolean; secureStorage: boolean; mailConfigured: boolean; shopifyConfigured: boolean; wooCommerceConfigured: boolean; notificationEmail: string; integration: { platform: string; shop_url: string; status: string; tested_at: string | null } | null };
const emptySetup: Setup = { configured: false, secureStorage: false, mailConfigured: false, shopifyConfigured: false, wooCommerceConfigured: false, notificationEmail: "", integration: null };
export async function commerceRequest(path: string, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal } : { signal, cache: "no-store" });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "Ændringen kunne ikke gennemføres.");
  return value;
}
export default function CommercePanel({ businessId, demo = false }: { businessId: string; demo?: boolean }) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [platform, setPlatform] = useState("shopify");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [disconnect, setDisconnect] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    if (demo) { setSetup(emptySetup); return () => controller.abort(); }
    commerceRequest(`/api/dashboard/commerce?business_id=${encodeURIComponent(businessId)}`, undefined, controller.signal).then(data => { setSetup(data); setEmail(data.notificationEmail); }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [businessId, demo]);
  useEffect(() => {
    if (setup?.integration?.status !== "pending" || demo) return;
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
      const result = await commerceRequest("/api/dashboard/commerce", { business_id: businessId, action: name, ...fields });
      if (result.url) { window.location.assign(result.url); return; }
      const fresh = await commerceRequest(`/api/dashboard/commerce?business_id=${encodeURIComponent(businessId)}`);
      setSetup(fresh); setEmail(fresh.notificationEmail); setDisconnect(false);
      setNotice(name === "disconnect" ? "Forbindelsen er afbrudt." : name === "test" ? "Forbindelsen er testet og fungerer." : "Dine ændringer er gemt.");
    } catch (error) { setError(error instanceof Error ? error.message : "Der opstod en fejl."); } finally { setBusy(""); }
  }
  const connected = setup?.integration && setup.integration.status !== "disconnected" ? setup.integration : null;
  return <div className={ui.stack}>
    {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}
    {notice ? <div className={styles.infoBanner} role="status"><CheckCircle2 size={16} />{notice}</div> : null}
    {demo ? <div className={styles.infoBanner}>Dette er en forhåndsvisning. Ingen webshop er forbundet.</div> : setup && !setup.configured ? <div className={styles.infoBanner}>Integrationer er ikke konfigureret på serveren endnu. Databaseopsætningen mangler.</div> : null}
    {!setup && !error ? <div className={styles.infoBanner}><span className={styles.spinner} />Henter dine integrationer…</div> : null}
    <section className={`${styles.card} ${ui.section}`}>
      <div className={ui.heading}><div className={ui.icon}><Store size={21} /></div><div><h2>Forbind din webshop</h2><p>Lad chatbotten hente produkter, varianter, lager og ordrestatus fra din butik.</p></div><span className={`${ui.tag} ${connected?.status === "connected" ? ui.green : ""}`}>{connected?.status === "connected" ? "Forbundet" : connected?.status === "pending" ? "Afventer godkendelse / test" : connected?.status === "error" ? "Kræver opmærksomhed" : "Ikke forbundet"}</span></div>
      {connected ? <div className={ui.connected}><div><strong>{connected.platform === "shopify" ? "Shopify" : "WooCommerce"}</strong><p>{connected.shop_url}</p><small>Senest testet: {connected.tested_at ? new Date(connected.tested_at).toLocaleString("da-DK") : "Ikke testet"}</small></div><div className={styles.buttonRow}><button className={styles.buttonSecondary} disabled={!!busy} onClick={() => void action("test")}><Link2 size={15} />{busy === "test" ? "Tester…" : "Test forbindelsen"}</button><button className={styles.buttonGhost} disabled={!!busy} onClick={() => setDisconnect(true)}><Unplug size={15} />Afbryd</button></div>{disconnect ? <div className={ui.confirm}><p>Afbryd forbindelsen til {connected.shop_url}? Chatbotten mister adgang til live webshopdata.</p><button className={styles.buttonDanger} disabled={!!busy} onClick={() => void action("disconnect")}>Afbryd forbindelsen</button><button className={styles.buttonSecondary} disabled={!!busy} onClick={() => setDisconnect(false)}>Behold forbindelsen</button></div> : null}</div> : <>
        <div className={ui.platforms} role="group" aria-label="Webshopplatform">{["shopify","woocommerce"].map(p => <button type="button" key={p} className={`${ui.platform} ${platform === p ? ui.selected : ""}`} aria-pressed={platform === p} onClick={() => setPlatform(p)}><Store size={22} /><strong>{p === "shopify" ? "Shopify" : "WooCommerce"}</strong><small>{p === "shopify" ? "Forbind med din Shopify-konto" : "Godkend læseadgang i din webshop"}</small></button>)}</div>
        <form className={ui.form} key={platform} onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const values = Object.fromEntries(new FormData(form)); if (platform === "shopify") void action("shopify", values); else void action("woocommerce", values); }}>
          {platform === "shopify" ? <><label className={ui.field}>Butikkens Shopify-adresse<input name="domain" required placeholder="din-butik.myshopify.com" autoComplete="off" /></label><p className={ui.hint}>Du godkender kun læseadgang hos Shopify. Din adgangskode deles ikke med EmbedBot.</p>{setup && !setup.shopifyConfigured ? <p className={ui.hint}>Shopify-forbindelse er endnu ikke aktiveret på serveren.</p> : null}</> : <><label className={ui.field}>Webshoppens HTTPS-adresse<input type="url" name="origin" required placeholder="https://din-webshop.dk" /></label><label className={ui.field}>Butikkens valuta<input name="currency" required defaultValue="DKK" minLength={3} maxLength={3} /></label><p className={ui.hint}>Du sendes til din webshop for at godkende læseadgang. WooCommerce sender nøglerne direkte til EmbedBots server.</p></>}
          <div><button className={styles.button} disabled={!!busy || demo || !setup?.configured || !setup.secureStorage || (platform === "shopify" ? !setup.shopifyConfigured : !setup.wooCommerceConfigured)}><Link2 size={15} />{busy ? "Forbinder…" : platform === "shopify" ? "Forbind med Shopify" : "Forbind WooCommerce"}</button></div>
        </form>
      </>}
      <div className={ui.safety}><ShieldCheck size={17} /><span>Kun læseadgang. Chatbotten ændrer ikke ordrer, betalinger eller produkter.</span></div>
    </section>
    <section className={`${styles.card} ${ui.section}`}><div className={ui.heading}><div className={ui.icon}><Mail size={21} /></div><div><h2>Notifikationer om supportsager</h2><p>Alle sager gemmes i dashboardet. Vælg også, hvem der skal have besked på mail.</p></div></div><form className={ui.form} onSubmit={e => { e.preventDefault(); void action("settings", { notificationEmail: email }); }}><label className={ui.field}>Modtagermail<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="support@din-webshop.dk" /></label>{setup && !setup.mailConfigured ? <p className={ui.hint}>Mailafsendelse er ikke konfigureret på serveren. Sagerne bliver stadig gemt.</p> : null}<div><button className={styles.buttonSecondary} disabled={!!busy || demo || !setup?.configured}>{busy === "settings" ? "Gemmer…" : "Gem modtagermail"}</button></div></form></section>
  </div>;
}
