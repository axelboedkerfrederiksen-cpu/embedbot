"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APPEARANCE_DEFAULTS, APPEARANCE_PRESETS, appearanceDraft, LOGO_MAX_BYTES, WIDGET_FONTS } from "@/lib/widget-appearance";
import styles from "./appearance-editor.module.css";

type Props = {
  value: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSave?: () => void;
  saving?: boolean;
};

export default function AppearanceEditor({ value, onChange, onSave, saving }: Props) {
  const draft = appearanceDraft(value);
  const iframe = useRef<HTMLIFrameElement>(null);
  const uploadVersion = useRef(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [background, setBackground] = useState("light");
  const [narrow, setNarrow] = useState(false);
  const preview = JSON.stringify({ ...draft, name: value.name || "Din virksomhed", welcome_message: value.welcome_message || "Hej! Hvad kan vi hjælpe dig med?" });
  const syncPreview = useCallback(() => {
    iframe.current?.contentWindow?.postMessage({ type: "embedbot:appearance", config: JSON.parse(preview), background }, window.location.origin);
  }, [preview, background]);
  useEffect(() => {
    syncPreview();
    const ready = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === iframe.current?.contentWindow && event.data?.type === "embedbot:ready") syncPreview();
    };
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, [syncPreview]);
  useEffect(() => () => { uploadVersion.current += 1; }, []);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > LOGO_MAX_BYTES) {
      setError("Vælg PNG, JPG eller WebP på højst 256 KB."); return;
    }
    const version = ++uploadVersion.current;
    setUploading(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
      // Decode before accepting the file, so corrupt or renamed files cannot replace a working logo.
      const image = new window.Image(); image.src = data; await image.decode();
      if (version !== uploadVersion.current) return;
      onChange("logo_data_url", data); onChange("logo_url", ""); onChange("logo_file_name", file.name.slice(0, 200));
    } catch { if (version === uploadVersion.current) setError("Billedet kunne ikke åbnes. Prøv en anden fil."); }
    finally { if (version === uploadVersion.current) setUploading(false); }
  }
  function color(key: string, label: string, disabled = false) {
    const raw = draft[key];
    const valid = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(raw);
    const hex = valid ? (raw.length === 4 ? "#" + raw.slice(1).split("").map(c => c + c).join("") : raw) : APPEARANCE_DEFAULTS[key];
    return <div className={styles.field}><label htmlFor={`appearance-${key}`}>{label}</label><div className={styles.color}><input aria-label={`${label} farvevælger`} type="color" value={hex} disabled={disabled} onChange={e => onChange(key, e.target.value)} /><input id={`appearance-${key}`} value={raw} disabled={disabled} maxLength={7} aria-invalid={!valid} onChange={e => onChange(key, e.target.value)} onBlur={() => { if (!valid) onChange(key, APPEARANCE_DEFAULTS[key]); }} /></div></div>;
  }
  function range(key: string, label: string, min: number, max: number, step: number, unit: string, disabled = false) {
    return <label className={styles.field} htmlFor={`appearance-${key}`}><span className={styles.rangeLabel}>{label}<output>{draft[key]}{unit}</output></span><input id={`appearance-${key}`} type="range" min={min} max={max} step={step} value={draft[key]} disabled={disabled} onChange={e => onChange(key, e.target.value)} /></label>;
  }
  const outlined = draft.chat_outline_enabled === "true";
  return <div className={styles.layout}>
    <section className={styles.controls} aria-label="Chatbottens udseende">
      <div className={styles.heading}><h3>Et udtryk, der passer til jer</h3><p>Start med en stil, og giv den jeres eget præg.</p></div>
      <div className={styles.presets}>{APPEARANCE_PRESETS.map(preset => <button type="button" key={preset.name} aria-pressed={Object.entries(preset.values).every(([key, val]) => draft[key] === val)} onClick={() => Object.entries(preset.values).forEach(([key, val]) => onChange(key, val))}><span className={styles.swatches} aria-hidden="true">{[preset.values.primary_color, preset.values.secondary_color, preset.values.chat_icon_color].map((c, i) => <i key={i} style={{ background: c }} />)}</span><strong>{preset.name}</strong><small>{preset.description}</small></button>)}</div>
      <div className={styles.colors}>{color("primary_color", "Chatoverskrift")}{color("secondary_color", "Kundens beskeder")}{color("chat_icon_color", "Chatknap")}</div>
      <label className={styles.field}>Skrifttype<select value={draft.font_choice} onChange={e => onChange("font_choice", e.target.value)}>{WIDGET_FONTS.map(font => <option key={font}>{font}</option>)}</select></label>
      <div className={styles.logoRow}><div><strong>Jeres logo <span>· valgfrit</span></strong><p>{draft.logo_file_name || (draft.logo_url ? "Nuværende logo" : "PNG, JPG eller WebP · maks. 256 KB")}</p></div><label className={styles.upload}>{uploading ? "Indlæser…" : "Vælg logo"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label>{(draft.logo_data_url || draft.logo_url) && <button type="button" className={styles.remove} onClick={() => { uploadVersion.current += 1; setUploading(false); setError(""); ["logo_data_url", "logo_url", "logo_file_name"].forEach(key => onChange(key, "")); }}>Fjern</button>}</div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <details className={styles.details}><summary>Ramme og gennemsigtighed</summary><div className={styles.detailFields}><label className={styles.toggle}><input type="checkbox" checked={outlined} onChange={e => onChange("chat_outline_enabled", String(e.target.checked))} />Vis ramme om chatten og chatknappen</label>{color("chat_outline_color", "Rammefarve", !outlined)}{range("chat_outline_width", "Tykkelse", 0, 6, 0.5, " px", !outlined)}{range("chat_outline_opacity", "Rammens synlighed", 0, 100, 1, "%", !outlined)}{range("widget_opacity", "Chattens synlighed", 40, 100, 5, "%")}<p className={styles.hint}>100% giver den bedste læsbarhed. Rammen følger også kundens beskeder.</p></div></details>
      {onSave && <div className={styles.footer}><span>Ændringer vises med det samme. Gem, når du er klar.</span><button type="button" disabled={saving || uploading} onClick={onSave}>{saving ? "Gemmer…" : "Gem udseende"}</button></div>}
    </section>
    <section className={styles.preview} aria-label="Forhåndsvisning"><div className={styles.previewBar}><div><strong>Prøv dit design</strong><p>Den rigtige chat · med eksempelbeskeder</p></div><div className={styles.previewActions}><button type="button" aria-pressed={background === "dark"} onClick={() => setBackground(background === "light" ? "dark" : "light")}>Mørk baggrund</button><button type="button" aria-pressed={narrow} onClick={() => setNarrow(!narrow)}>Mobil</button></div></div><iframe ref={iframe} title="Forhåndsvisning af chatbot" src="/widget-preview.html" onLoad={syncPreview} className={narrow ? styles.narrow : ""} /><p className={styles.caption}>Prøv at skrive, lukke og åbne chatten. Eksempelbeskeder bliver ikke gemt.</p></section>
  </div>;
}
