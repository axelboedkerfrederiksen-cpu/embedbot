"use client";
import Link from "next/link";
import logoImage from "@/media/86a91d6a-f484-4e7d-a05c-55ab0979c3b1.png";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11 } },
};

const supportedPlatforms = [
  { name: "HTML",        logo: "https://cdn.simpleicons.org/html5/ffffff", scale: 0.92 },
  { name: "WordPress",   logo: "https://cdn.simpleicons.org/wordpress/ffffff", scale: 0.9 },
  { name: "Shopify",     logo: "https://cdn.simpleicons.org/shopify/ffffff", scale: 1 },
  { name: "Squarespace", logo: "https://cdn.simpleicons.org/squarespace/ffffff", scale: 1.02 },
  { name: "Wix",         logo: "https://cdn.simpleicons.org/wix/ffffff", scale: 1.15 },
  { name: "Webflow",     logo: "https://cdn.simpleicons.org/webflow/ffffff", scale: 1.08 },
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
    script.setAttribute("data-primary-color", "#3b82f6");
    script.setAttribute("data-secondary-color", "#111827");
    script.setAttribute("data-fab-color", "#3b82f6");
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
          background: #030712;
        }

        .page {
          min-height: 100dvh;
          font-family: "DM Sans", sans-serif;
          color: #ffffff;
          max-width: 820px;
          margin: 0 auto;
          padding: 0 28px 56px;
          background: #030712;
          position: relative;
        }

        /* Subtle ambient glow */
        .page::before {
          content: "";
          position: fixed;
          top: -10%;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 500px;
          background: radial-gradient(ellipse at 50% 30%, rgba(59, 130, 246, 0.055) 0%, transparent 68%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Nav ─────────────────────────────────── */
        .nav {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(3, 7, 18, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        .nav-logo { display: block; line-height: 0; text-decoration: none; }
        .nav-logo img {
          height: 26px;
          width: auto;
          filter: brightness(0) invert(1);
        }

        .nav-login {
          font-size: 0.85rem;
          font-weight: 400;
          color: #9ca3af;
          text-decoration: none;
          opacity: 0.45;
          transition: opacity 200ms ease;
        }
        .nav-login:hover { opacity: 1; }

        /* ── Hero ────────────────────────────────── */
        .hero {
          padding: 76px 0 60px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
          z-index: 1;
        }

        .tag {
          display: block;
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #60a5fa;
          margin-bottom: 20px;
        }

        .headline {
          font-family: "DM Serif Display", serif;
          font-size: clamp(2rem, 5vw, 3.4rem);
          line-height: 1.06;
          letter-spacing: -0.015em;
          margin: 0 0 24px;
          max-width: 16ch;
        }

        .lead {
          font-size: clamp(0.95rem, 2.2vw, 1.075rem);
          font-weight: 300;
          line-height: 1.78;
          color: #9ca3af;
          margin: 0 0 34px;
          max-width: 52ch;
        }

        .cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .btn {
          font-family: "DM Sans", sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          padding: 11px 22px;
          border-radius: 6px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: background 200ms ease, box-shadow 200ms ease, border-color 200ms ease, color 200ms ease;
          display: inline-flex;
          align-items: center;
        }

        .btn-primary {
          background: #3b82f6;
          color: #ffffff;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.22), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .btn-primary:hover {
          background: #60a5fa;
          box-shadow: 0 6px 28px rgba(59, 130, 246, 0.38);
        }

        .btn-outline {
          background: transparent;
          color: #9ca3af;
          border-color: rgba(255, 255, 255, 0.08);
        }
        .btn-outline:hover {
          border-color: rgba(255, 255, 255, 0.16);
          color: #ffffff;
        }

        /* ── Features ────────────────────────────── */
        .features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          position: relative;
          z-index: 1;
        }

        .feat {
          padding: 38px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .feat:not(:last-child) {
          padding-right: 28px;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }

        .feat:not(:first-child) {
          padding-left: 28px;
        }

        .feat-num {
          display: block;
          font-size: 0.63rem;
          letter-spacing: 0.15em;
          color: #3b82f6;
          font-weight: 500;
          margin-bottom: 16px;
          opacity: 0.75;
        }

        .feat-title {
          font-size: 0.975rem;
          font-weight: 500;
          margin: 0 0 10px;
          line-height: 1.3;
        }

        .feat-desc {
          font-size: 0.85rem;
          font-weight: 300;
          color: #9ca3af;
          line-height: 1.7;
          margin: 0;
        }

        /* ── Platform strip ──────────────────────── */
        .platforms {
          padding: 38px 0 0;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }

        .platforms-label {
          font-size: 0.67rem;
          font-weight: 500;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #4b5563;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .platforms-logos {
          display: flex;
          gap: 18px;
          align-items: center;
          flex-wrap: wrap;
        }

        .platform-logo-wrap {
          width: 34px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .platform-logo {
          max-width: 100%;
          max-height: 100%;
          display: block;
          transform-origin: center;
        }

        /* ── Footer row ──────────────────────────── */
        .foot {
          padding-top: 32px;
          text-align: right;
          position: relative;
          z-index: 1;
        }

        .foot a {
          font-size: 0.78rem;
          color: #4b5563;
          text-decoration: none;
          transition: color 200ms ease;
        }

        .foot a:hover { color: #60a5fa; }

        /* ── Mobile ──────────────────────────────── */
        @media (max-width: 600px) {
          .page { padding: 0 20px 44px; }
          .hero { padding: 50px 0 42px; }

          .features { grid-template-columns: 1fr; }
          .feat {
            padding: 28px 0 !important;
            border-right: none !important;
          }

          .platforms { flex-direction: column; align-items: flex-start; gap: 14px; }
          .foot { text-align: left; }
        }
      `}</style>

      {/* Nav — slides in from top */}
      <motion.nav
        className="nav"
        aria-label="Primær navigation"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <Link href="/" className="nav-logo">
          <img src={logoImage.src} alt="EmbedBot" />
        </Link>
        <Link href="/login" className="nav-login">Log ind</Link>
      </motion.nav>

      {/* Hero — staggered children on load */}
      <motion.section
        className="hero"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.span className="tag" variants={fadeUp}>
          Dansk AI-kundesupport
        </motion.span>
        <motion.h1 className="headline" variants={fadeUp}>
          Tilføj en AI-chatbot til din webshop på 5 minutter
        </motion.h1>
        <motion.p className="lead" variants={fadeUp}>
          EmbedBot lærer din forretning at kende og svarer dine kunders spørgsmål automatisk — så du ikke skal.
        </motion.p>
        <motion.div className="cta-row" variants={fadeUp}>
          <Link href="/setup" className="btn btn-primary">
            Start opsætning
          </Link>
          <button onClick={handleDemoClick} className="btn btn-outline">
            Se demo
          </button>
        </motion.div>
      </motion.section>

      {/* Features — scroll-triggered stagger */}
      <motion.div
        className="features"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
      >
        {features.map((f) => (
          <motion.div className="feat" key={f.num} variants={fadeUp}>
            <span className="feat-num">{f.num}</span>
            <h2 className="feat-title">{f.title}</h2>
            <p className="feat-desc">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Platforms — scroll-triggered with logo stagger */}
      <motion.div
        className="platforms"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      >
        <motion.span className="platforms-label" variants={fadeUp}>
          Understøtter
        </motion.span>
        <motion.div
          className="platforms-logos"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        >
          {supportedPlatforms.map((p) => (
            <motion.span
              className="platform-logo-wrap"
              key={p.name}
              variants={{
                hidden: { opacity: 0, scale: 0.75 },
                show: {
                  opacity: 0.45,
                  scale: 1,
                  transition: { duration: 0.45, ease },
                },
              }}
              whileHover={{ opacity: 0.95, transition: { duration: 0.15 } }}
            >
              <img
                src={p.logo}
                alt={p.name}
                className="platform-logo"
                style={{ transform: `scale(${p.scale})` }}
                loading="lazy"
              />
            </motion.span>
          ))}
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.div
        className="foot"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.15 }}
      >
        <Link href="/dashboard">Allerede kunde? Log ind her →</Link>
      </motion.div>
    </main>
  );
}
