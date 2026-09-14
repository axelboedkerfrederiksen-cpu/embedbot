"use client";

import Link from "next/link";
import Script from "next/script";
import { useState } from "react";

export default function PreviewClient({ businessId, previewToken }: { businessId: string; previewToken: string }) {
  const [ready, setReady] = useState(false);

  function openChat() {
    const bubble = document.getElementById("eb-bubble") as HTMLButtonElement | null;
    if (!bubble) return;

    const label = (bubble.getAttribute("aria-label") || "").toLowerCase();
    if (label.includes("open") || label.includes("åbn")) {
      bubble.click();
    }
  }

  function handleReady() {
    setReady(true);
    window.setTimeout(openChat, 80);
  }

  return (
    <main className="preview-page">
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; min-height: 100%; background: #f6f3ed; }
        .preview-page {
          min-height: 100dvh; display: grid; place-items: center; padding: 28px;
          color: #111; font-family: var(--font-poppins), "Poppins", sans-serif;
        }
        .preview-card {
          width: min(620px, 100%); padding: clamp(30px, 6vw, 54px); border: 1px solid rgba(17,17,17,.08);
          border-radius: 28px; background: rgba(255,255,255,.92); box-shadow: 0 24px 70px rgba(17,17,17,.08);
          text-align: center;
        }
        .preview-kicker { color: #746b61; font-size: .78rem; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
        .preview-title { margin: 18px auto 16px; max-width: 12ch; font-size: clamp(2.25rem, 7vw, 4.2rem); line-height: 1; letter-spacing: -.05em; }
        .preview-text { margin: 0 auto; max-width: 48ch; color: #5f584f; line-height: 1.75; }
        .preview-button {
          display: inline-flex; align-items: center; justify-content: center; min-height: 50px; margin-top: 28px;
          padding: 0 24px; border: 0; border-radius: 999px; background: #111; color: #fff;
          cursor: pointer; font: inherit; font-weight: 700;
        }
        .preview-button:disabled { cursor: wait; opacity: .55; }
        .preview-note { margin: 22px 0 0; color: #8a7e70; font-size: .78rem; line-height: 1.6; }
        .preview-note a { color: inherit; }
      `}</style>

      <section className="preview-card">
        <span className="preview-kicker">Chatbot demo</span>
        <h1 className="preview-title">Prøv jeres chatbot</h1>
        <p className="preview-text">
          Stil de samme spørgsmål, som jeres kunder plejer at stille. Gennemgå svarene her, før chatbotten bliver lagt på jeres offentlige hjemmeside.
        </p>
        <button className="preview-button" type="button" onClick={openChat} disabled={!ready}>
          {ready ? "Åbn chatbotten" : "Gør chatbotten klar…"}
        </button>
        <p className="preview-note">Denne side er kun til gennemgang og bliver ikke indekseret af søgemaskiner. <Link href="/">Om EmbedBot</Link></p>
      </section>

      <Script
        id={`embedbot-preview-${businessId}`}
        src={`/widget.js?id=${encodeURIComponent(businessId)}`}
        data-preview-token={previewToken}
        strategy="afterInteractive"
        onLoad={handleReady}
        onError={() => setReady(false)}
      />
    </main>
  );
}
