"use client";

import Link from "next/link";
import Image from "next/image";
import logoImage from "@/media/86a91d6a-f484-4e7d-a05c-55ab0979c3b1.png";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export default function PricesPage() {
  return (
    <main className="prices-page">
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }

        html, body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          background: #f6f3ed;
        }

        .prices-page {
          min-height: 100dvh;
          font-family: var(--font-poppins), "Poppins", sans-serif;
          color: #111111;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 28px 64px;
          position: relative;
        }

        .prices-page::before {
          content: "";
          position: absolute;
          inset: 8px -24px auto;
          height: 520px;
          background:
            radial-gradient(circle at 78% 12%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 30%),
            radial-gradient(circle at 18% 32%, rgba(238, 232, 220, 0.75) 0%, rgba(238, 232, 220, 0) 38%);
          pointer-events: none;
          z-index: 0;
          filter: blur(8px);
        }

        .prices-nav {
          position: sticky;
          top: 14px;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 14px;
          padding: 18px 22px;
          border: 1px solid rgba(17, 17, 17, 0.08);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 14px 40px rgba(17, 17, 17, 0.045);
        }

        .prices-logo {
          display: block;
          line-height: 0;
          text-decoration: none;
        }

        .prices-logo img {
          height: 26px;
          width: auto;
          display: block;
        }

        .prices-nav-links {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .prices-nav-link {
          font-size: 0.85rem;
          font-weight: 500;
          color: #6b6258;
          text-decoration: none;
          opacity: 0.82;
          transition: opacity 200ms ease, color 200ms ease;
        }

        .prices-nav-link:hover,
        .prices-nav-link.active {
          opacity: 1;
          color: #111111;
        }

        .prices-hero {
          position: relative;
          z-index: 1;
          padding: 86px 0 28px;
          max-width: 720px;
        }

        .prices-kicker {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(17, 17, 17, 0.08);
          background: #ffffff;
          color: #6b6258;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .prices-title {
          margin: 0 0 20px;
          max-width: 10ch;
          color: #111111;
          font-size: clamp(2.55rem, 6vw, 5rem);
          font-weight: 700;
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        .prices-lead {
          margin: 0;
          max-width: 54ch;
          color: #5f584f;
          font-size: clamp(1rem, 2.1vw, 1.18rem);
          line-height: 1.8;
        }

        .pricing-wrap {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: center;
          margin-top: 28px;
        }

        .price-card {
          border: 1px solid rgba(17, 17, 17, 0.07);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 18px 42px rgba(17, 17, 17, 0.055);
          backdrop-filter: blur(10px);
        }

        .price-card {
          width: min(100%, 720px);
          padding: clamp(26px, 5vw, 42px);
        }

        .plan-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 28px;
        }

        .plan-name {
          margin: 0 0 8px;
          color: #111111;
          font-size: 1.25rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .plan-desc {
          margin: 0;
          color: #6b6258;
          font-size: 0.96rem;
          line-height: 1.6;
        }

        .plan-pill {
          flex: 0 0 auto;
          padding: 8px 12px;
          border-radius: 999px;
          background: #f6f3ed;
          color: #6b6258;
          font-size: 0.78rem;
          font-weight: 700;
          line-height: 1;
          white-space: nowrap;
        }

        .price {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          margin-bottom: 26px;
        }

        .price-amount {
          color: #111111;
          font-size: clamp(3rem, 7vw, 5.2rem);
          font-weight: 800;
          line-height: 0.92;
          letter-spacing: -0.05em;
        }

        .price-period {
          color: #6b6258;
          font-size: 1rem;
          font-weight: 600;
          padding-bottom: 8px;
        }

        .price-list {
          display: grid;
          gap: 12px;
          margin: 0 0 28px;
          padding: 0;
          list-style: none;
        }

        .price-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #5f584f;
          font-size: 0.96rem;
          line-height: 1.5;
        }

        .price-list li::before {
          content: "";
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #111111;
          box-shadow: 0 0 0 5px #f6f3ed;
          flex: 0 0 auto;
        }

        .setup-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 52px;
          padding: 14px 22px;
          border-radius: 999px;
          border: 1px solid rgba(17, 17, 17, 0.1);
          background: #111111;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 16px 34px rgba(17, 17, 17, 0.16);
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }

        .setup-button:hover {
          background: #2a2927;
          box-shadow: 0 18px 38px rgba(17, 17, 17, 0.2);
          transform: translateY(-1px);
        }

        @media (max-width: 760px) {
          .prices-page { padding: 0 20px 44px; }
          .prices-nav {
            top: 10px;
            margin-top: 10px;
            padding: 15px 16px;
            border-radius: 16px;
          }
          .prices-nav-links { gap: 14px; }
          .prices-hero { padding: 56px 0 24px; }
          .plan-row { flex-direction: column; }
          .plan-pill { align-self: flex-start; }
        }
      `}</style>

      <motion.nav
        className="prices-nav"
        aria-label="Primær navigation"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <Link href="/" className="prices-logo">
          <Image src={logoImage} alt="EmbedBot" priority />
        </Link>
        <div className="prices-nav-links">
          <Link href="/support" className="prices-nav-link">Support</Link>
          <Link href="/prices" className="prices-nav-link active">Priser</Link>
          <Link href="/login" className="prices-nav-link">Log ind</Link>
        </div>
      </motion.nav>

      <motion.section
        className="prices-hero"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <span className="prices-kicker">Priser</span>
        <h1 className="prices-title">En enkel månedlig pris</h1>
        <p className="prices-lead">
          Start med en dansk AI-chatbot til din webshop uden tunge pakker eller skjulte niveauer.
        </p>
      </motion.section>

      <motion.section
        className="pricing-wrap"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.08, ease }}
        aria-label="Prisplaner"
      >
        <article className="price-card">
          <div className="plan-row">
            <div>
              <h2 className="plan-name">EmbedBot månedlig</h2>
              <p className="plan-desc">Til virksomheder der vil i gang hurtigt og justere undervejs.</p>
            </div>
            <span className="plan-pill">1 måned</span>
          </div>

          <div className="price" aria-label="299 kroner per måned">
            <span className="price-amount">299 kr.</span>
            <span className="price-period">/ måned</span>
          </div>

          <ul className="price-list">
            <li>Opsætning via den eksisterende onboarding</li>
            <li>Dansk chatbot til din hjemmeside eller webshop</li>
            <li>Kan tilpasses med virksomhedens informationer</li>
          </ul>

          <Link href="/setup" className="setup-button">
            Gå til opsætning
          </Link>
        </article>
      </motion.section>
    </main>
  );
}
