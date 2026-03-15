"use client";
import Link from "next/link";
import wordpressLogo from "@/media/download.jpeg";
import shopifyLogo from "@/media/Shopify-Logo-PNG.png";
import squarespaceLogo from "@/media/Squarespace_Logo.png";
import wixLogo from "@/media/WIX-Logo.png";
import webflowLogo from "@/media/webflow_logo_icon_169218.png";
import html5Logo from "@/media/html5_logo.png";
import logoImage from "@/media/86a91d6a-f484-4e7d-a05c-55ab0979c3b1.png";

const supportedPlatforms = [
  { name: "HTML",        logo: html5Logo.src,        height: 21 },
  { name: "WordPress",   logo: wordpressLogo.src,    height: 26 },
  { name: "Shopify",     logo: shopifyLogo.src,      height: 27 },
  { name: "Squarespace", logo: squarespaceLogo.src,  height: 19 },
  { name: "Wix",         logo: wixLogo.src,          height: 15 },
  { name: "Webflow",     logo: webflowLogo.src,      height: 15 },
];

const features = [
  {
    num: "01",
    title: "Klar på 5 minutter",
    desc: "Ingen kodning. Udfyld en simpel formular, og din chatbot er klar til at blive indsat på din hjemmeside.",
  },
  {
    num: "02",
    title: "Bygget til dansk",
    desc: "EmbedBot er tilpasset til danske virksomheder og forstår konteksten bag dine produkter og services.",
  },
  {
    num: "03",
    title: "Svar døgnet rundt",
    desc: "I stedet for at vente på en mail, får dine kunder svar direkte på din side — hvornår det passer dem.",
  },
];

export default function Home() {
  const DEMO_BUSINESS_ID = "a2678b5f-6d8b-415f-bbc0-ef3ce2a148bc";

  const openWidgetIfAvailable = () => {
    const bubble = document.getElementById("eb-bubble") as HTMLButtonElement | null;
    if (!bubble) return;
    const ariaLabel = bubble.getAttribute("aria-label") || "";
    if (ariaLabel.includes("Open") || ariaLabel.includes("open")) bubble.click();
  };

  const handleDemoClick = () => {
    const existingScript = document.getElementById("embedbot-demo-script");
    if (existingScript) { openWidgetIfAvailable(); return; }
    const script = document.createElement("script");
    script.id = "embedbot-demo-script";
    script.src = `${window.location.origin}/widget.js?id=${DEMO_BUSINESS_ID}`;
    script.setAttribute("data-name", "EmbedBot");
    script.setAttribute("data-primary-color", "#000000");
    script.setAttribute("data-secondary-color", "#000000");
    script.setAttribute("data-fab-color", "#000000");
    script.setAttribute("data-font", "DM Sans");
    script.onload = () => window.setTimeout(openWidgetIfAvailable, 50);
    document.body.appendChild(script);
  };

  return (
    <main className="page">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap");

        *, *::before, *::after { box-sizing: border-box; }

        html, body {
          margin: 0;
          padding: 0;
          background: #f6f3ed;
        }

        .page {
          min-height: 100dvh;
          font-family: "DM Sans", sans-serif;
          color: #1a1713;
          max-width: 820px;
          margin: 0 auto;
          padding: 0 28px 56px;
          background: #f6f3ed;
        }

        /* ── Nav ─────────────────────────────────── */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 0;
          border-bottom: 1px solid rgba(26, 23, 19, 0.12);
        }

        .nav-logo { display: block; line-height: 0; text-decoration: none; }
        .nav-logo img { height: 26px; width: auto; }

        .nav-login {
          font-size: 0.85rem;
          font-weight: 400;
          color: #1a1713;
          text-decoration: none;
          opacity: 0.5;
          transition: opacity 140ms;
        }
        .nav-login:hover { opacity: 1; }

        /* ── Hero ────────────────────────────────── */
        .hero {
          padding: 64px 0 52px;
          border-bottom: 1px solid rgba(26, 23, 19, 0.12);
        }

        .tag {
          display: block;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #9c7248;
          margin-bottom: 18px;
        }

        .headline {
          font-family: "DM Serif Display", serif;
          font-size: clamp(2rem, 5vw, 3.4rem);
          line-height: 1.06;
          letter-spacing: -0.015em;
          margin: 0 0 22px;
          max-width: 16ch;
        }

        .lead {
          font-size: clamp(0.95rem, 2.2vw, 1.075rem);
          font-weight: 300;
          line-height: 1.7;
          color: #5a564f;
          margin: 0 0 30px;
          max-width: 52ch;
        }

        .cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .btn {
          font-family: "DM Sans", sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: opacity 140ms, border-color 140ms;
          display: inline-flex;
          align-items: center;
        }

        .btn-primary { background: #1a1713; color: #f6f3ed; }
        .btn-primary:hover { opacity: 0.78; }

        .btn-outline {
          background: transparent;
          color: #1a1713;
          border-color: rgba(26, 23, 19, 0.22);
        }
        .btn-outline:hover { border-color: rgba(26, 23, 19, 0.55); }

        /* ── Features ────────────────────────────── */
        .features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
        }

        .feat {
          padding: 36px 0;
          border-bottom: 1px solid rgba(26, 23, 19, 0.12);
        }

        .feat:not(:last-child) {
          padding-right: 28px;
          border-right: 1px solid rgba(26, 23, 19, 0.12);
        }

        .feat:not(:first-child) {
          padding-left: 28px;
        }

        .feat-num {
          display: block;
          font-size: 0.68rem;
          letter-spacing: 0.12em;
          color: #b5936b;
          font-weight: 500;
          margin-bottom: 14px;
        }

        .feat-title {
          font-size: 0.975rem;
          font-weight: 500;
          margin: 0 0 8px;
          line-height: 1.3;
        }

        .feat-desc {
          font-size: 0.85rem;
          font-weight: 300;
          color: #706c65;
          line-height: 1.65;
          margin: 0;
        }

        /* ── Platform strip ──────────────────────── */
        .platforms {
          padding: 32px 0 0;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .platforms-label {
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #aba590;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .platforms-logos {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .platform-logo {
          width: auto;
          display: block;
        }

        /* ── Footer row ──────────────────────────── */
        .foot {
          padding-top: 28px;
          text-align: right;
        }

        .foot a {
          font-size: 0.78rem;
          color: #aba590;
          text-decoration: none;
          transition: color 140ms;
        }

        .foot a:hover { color: #1a1713; }

        /* ── Mobile ──────────────────────────────── */
        @media (max-width: 600px) {
          .page { padding: 0 20px 44px; }
          .hero { padding: 44px 0 38px; }

          .features { grid-template-columns: 1fr; }
          .feat {
            padding: 28px 0 !important;
            border-right: none !important;
          }

          .platforms { flex-direction: column; align-items: flex-start; gap: 14px; }
          .foot { text-align: left; }
        }
      `}</style>

      <nav className="nav" aria-label="Primær navigation">
        <Link href="/" className="nav-logo">
          <img src={logoImage.src} alt="EmbedBot" />
        </Link>
        <Link href="/login" className="nav-login">Log ind</Link>
      </nav>

      <section className="hero">
        <span className="tag">Dansk AI-kundesupport</span>
        <h1 className="headline">
          Tilføj en AI-chatbot til din webshop på 5 minutter
        </h1>
        <p className="lead">
          EmbedBot lærer din forretning at kende og svarer dine kunders spørgsmål automatisk — så du ikke skal.
        </p>
        <div className="cta-row">
          <Link href="/setup" className="btn btn-primary">
            Start opsætning
          </Link>
          <button onClick={handleDemoClick} className="btn btn-outline">
            Se demo
          </button>
        </div>
      </section>

      <div className="features">
        {features.map((f) => (
          <div className="feat" key={f.num}>
            <span className="feat-num">{f.num}</span>
            <h2 className="feat-title">{f.title}</h2>
            <p className="feat-desc">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="platforms">
        <span className="platforms-label">Understøtter</span>
        <div className="platforms-logos">
          {supportedPlatforms.map((p) => (
            <img
              key={p.name}
              src={p.logo}
              alt={p.name}
              className="platform-logo"
              style={{ height: p.height }}
              loading="lazy"
            />
          ))}
        </div>
      </div>

      <div className="foot">
        <Link href="/dashboard">Allerede kunde? Log ind her →</Link>
      </div>
    </main>
  );
}
