"use client";
import { useEffect, useState } from "react";
import { FileCode2, CheckCircle2 } from "lucide-react";
import { commerceRequest } from "@/lib/commerce-request";
import styles from "./dashboard.module.css";
import ui from "./commerce.module.css";
type Source = { source_kind: string; source_name: string; imported_at: string; character_count: number; truncated: boolean };
export default function WebsiteSourcePanel({ businessId, websiteUrl = "", demo = false, beforeConnect }: { businessId: string; websiteUrl?: string; demo?: boolean; beforeConnect?: () => Promise<void> }) {
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState(websiteUrl);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    commerceRequest(`/api/dashboard/website-source?business_id=${encodeURIComponent(businessId)}`, undefined, controller.signal).then(data => { setSource(data.source); setConfigured(data.configured); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [businessId, demo]);
  async function submit(disconnect = false) {
    setBusy(true); setError(""); setNotice("");
    try {
      await beforeConnect?.();
      const payload: Record<string, unknown> = { business_id: businessId, action: disconnect ? "disconnect" : mode };
      if (!disconnect) {
        if (mode === "url") payload.url = url;
        else {
          if (!file || !/\.(html|htm)$/i.test(file.name) || file.size > 1_000_000) throw new Error("Vælg en HTML-fil på højst 1 MB.");
          payload.filename = file.name; payload.html = await file.text();
        }
      }
      await commerceRequest("/api/dashboard/website-source", payload);
      const fresh = await commerceRequest(`/api/dashboard/website-source?business_id=${encodeURIComponent(businessId)}`);
      setSource(fresh.source); setConfigured(fresh.configured);
      setNotice(disconnect ? "Det importerede indhold er fjernet." : "Indholdet er importeret og kan nu bruges af chatbotten.");
    } catch (e) { setError(e instanceof Error ? e.message : "Indholdet kunne ikke importeres."); } finally { setBusy(false); }
  }
  return <div className={ui.stack}>
    {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}
    {notice ? <div className={styles.infoBanner} role="status"><CheckCircle2 size={16} />{notice}</div> : null}
    <div className={ui.heading}><div className={ui.icon}><FileCode2 size={21} /></div><div><h3>Hjemmesidens indhold</h3><p>Brug indhold fra en almindelig hjemmeside eller en HTML-fil som viden til chatbotten.</p></div></div>
    {source ? <div className={ui.connected}><strong>Indhold tilkoblet</strong><p>{source.source_name}</p><small>Importeret {new Date(source.imported_at).toLocaleString("da-DK")} · {source.character_count.toLocaleString("da-DK")} tegn</small>{source.truncated ? <p className={ui.hint}>De første 30.000 tegn er importeret. Resten er ikke med.</p> : null}<div><button type="button" className={styles.buttonGhost} disabled={busy || demo} onClick={() => void submit(true)}>Fjern importeret indhold</button></div></div> : null}
    {!configured && !demo ? <p className={ui.hint}>Hjemmesideimport kræver serverens databaseopsætning. Du kan fortsætte opsætningen og tilkoble indhold senere.</p> : null}
    {demo ? <p className={ui.hint}>Forhåndsvisning · Der importeres ikke indhold.</p> : null}
    <div className={styles.buttonRow} role="group" aria-label="Indholdskilde"><button type="button" className={styles.buttonSecondary} aria-pressed={mode === "url"} onClick={() => setMode("url")}>Hjemmesideadresse</button><button type="button" className={styles.buttonSecondary} aria-pressed={mode === "html"} onClick={() => setMode("html")}>Upload HTML-fil</button></div>
    <form className={ui.form} onSubmit={e => { e.preventDefault(); void submit(); }}>
      {mode === "url" ? <label className={ui.field}>Hjemmesidens HTTPS-adresse<input type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://din-hjemmeside.dk" /></label> : <label className={ui.field}>HTML-fil<input type="file" accept=".html,.htm,text/html" required onChange={e => setFile(e.target.files?.[0] || null)} /><small className={ui.hint}>Højst 1 MB. Kun tekst læses; scripts og formularer køres ikke.</small></label>}
      <div><button className={styles.button} disabled={busy || demo || !configured}>{busy ? "Importerer…" : source ? "Opdatér indhold" : "Importér indhold"}</button></div>
    </form>
    <p className={ui.hint}>Indholdet er et øjebliksbillede. Importér igen ved ændringer. En HTML-fil giver viden om siden; live priser, lager og private ordrer kræver en webshopintegration. Indsæt efter opsætning EmbedBots script før &lt;/body&gt; for at vise chatten på din HTML-side.</p>
  </div>;
}
