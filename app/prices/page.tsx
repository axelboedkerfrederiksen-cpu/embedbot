"use client";
import { TRIAL } from "@/lib/compliance/trial";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import logoImage from "@/media/86a91d6a-f484-4e7d-a05c-55ab0979c3b1.png";
import { PLANS, type PlanSlug } from "@/lib/plans";

const ease = [0.22, 1, 0.36, 1] as const;

const planDetails: Array<{
  slug: PlanSlug;
  description: string;
  features: string[];
  featured?: boolean;
}> = [
  {
    slug: "starter",
    description: "Til mindre webshops, som vil automatisere de mest almindelige spørgsmål.",
    features: ["1.000 AI-svar pr. måned", "AI-model: GPT-5.6 Luna", "Samtaler og statistik i dashboardet"],
  },
  {
    slug: "growth",
    description: "Til webshops med stabil trafik og flere daglige kundehenvendelser.",
    features: ["5.000 AI-svar pr. måned", "AI-model: GPT-5.6 Luna", "Samtaler og statistik i dashboardet"],
    featured: true,
  },
  {
    slug: "scale",
    description: "Til større webshops med høj trafik og mange samtidige kunder.",
    features: ["15.000 AI-svar pr. måned", "AI-model: GPT-5.6 Luna", "Samtaler og statistik i dashboardet"],
  },
  {
    slug: "enterprise",
    description: "Til virksomheder med store mængder og behov for en individuel aftale.",
    features: ["Fra 30.000 AI-svar pr. måned", "Individuel kapacitet", "Personlig pris og onboarding"],
  },
];

function formatPrice(price: number | null) {
  if (price === null) return "Individuel";
  return `${new Intl.NumberFormat("da-DK").format(price)} kr.`;
}

export default function PricesPage() {
  return (
    <main id="main-content" className="prices-page">
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; min-height: 100%; background: var(--bg-page); }
        .prices-page {
          min-height: 100dvh; font-family: var(--font-inter), sans-serif;
          color: var(--text-primary); max-width: 1320px; margin: 0 auto; padding: 0 28px 72px; position: relative;
        }
        .prices-page::before { display: none; }
        .prices-nav {
          position: sticky; top: 14px; z-index: 20; display: flex; align-items: center; justify-content: space-between;
          margin-top: 14px; padding: 18px 22px; border: 1px solid var(--border); border-radius: 7px;
          background: var(--bg-page);
          box-shadow: none;
        }
        .prices-logo { display: block; line-height: 0; text-decoration: none; }
        .prices-logo img { height: 26px; width: auto; display: block; }
        .prices-nav-links { display: flex; align-items: center; gap: 18px; }
        .prices-nav-link { font-size: .85rem; font-weight: 500; color: var(--text-muted); text-decoration: none; opacity: .82; transition: opacity 200ms ease, color 200ms ease; }
        .prices-nav-link:hover, .prices-nav-link.active { opacity: 1; color: var(--text-primary); }
        .prices-hero { position: relative; z-index: 1; padding: 82px 0 34px; max-width: 790px; }
        .prices-kicker {
          display: inline-flex; width: fit-content; align-items: center; padding: 8px 12px; border-radius: 7px;
          border: 1px solid var(--border); background: #ffffff; color: var(--text-muted); font-size: .82rem;
          font-weight: 500; letter-spacing: .14em; text-transform: uppercase; margin-bottom: 20px;
        }
        .prices-title { margin: 0 0 20px; max-width: 12ch; font-size: clamp(2.55rem, 6vw, 5rem); font-weight: 400; line-height: .98; letter-spacing: -.05em; }
        .prices-lead { margin: 0; max-width: 58ch; color: var(--text-muted); font-size: clamp(1rem, 2.1vw, 1.18rem); line-height: 1.8; }
        .pricing-grid {
          position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px; margin-top: 24px; align-items: stretch;
        }
        .price-card {
          position: relative; display: flex; flex-direction: column; min-width: 0; padding: 28px 24px 24px;
          border: 1px solid var(--border); border-radius: 7px; background: var(--bg-primary);
          box-shadow: none;
        }
        .price-card.featured { border-color: var(--text-primary); box-shadow: none; transform: none; }
        .plan-pill {
          position: absolute; top: 18px; right: 18px; padding: 7px 10px; border-radius: 999px; background: var(--accent);
          color: #ffffff; font-size: .68rem; font-weight: 500; letter-spacing: .04em; text-transform: uppercase;
        }
        .plan-name { margin: 0 0 10px; font-size: 1.25rem; font-weight: 500; line-height: 1.2; }
        .plan-desc { margin: 0; min-height: 76px; color: var(--text-muted); font-size: .88rem; line-height: 1.55; }
        .price { display: flex; align-items: flex-end; gap: 8px; margin: 28px 0 25px; }
        .price-amount { font-size: clamp(2rem, 3.3vw, 3.15rem); font-weight: 500; line-height: .95; letter-spacing: -.05em; }
        .price-period { color: var(--text-muted); font-size: .82rem; font-weight: 500; padding-bottom: 4px; }
        .price-list { display: grid; gap: 12px; margin: 0 0 28px; padding: 0; list-style: none; }
        .price-list li { display: flex; align-items: flex-start; gap: 10px; color: var(--text-muted); font-size: .86rem; line-height: 1.5; }
        .price-list li::before { content: ""; width: 7px; height: 7px; margin-top: 6px; border-radius: 999px; background: var(--accent); box-shadow: none; flex: 0 0 auto; }
        .setup-button {
          display: inline-flex; align-items: center; justify-content: center; width: 100%; min-height: 50px; margin-top: auto;
          padding: 13px 18px; border-radius: 7px; border: 1px solid var(--border); background: #ffffff;
          color: var(--text-primary); font-size: .9rem; font-weight: 500; text-decoration: none;
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, color 180ms ease;
        }
        .price-card.featured .setup-button, .setup-button:hover { background: var(--accent); color: #ffffff; box-shadow: none; transform: none; }
        .pricing-note { position: relative; z-index: 1; margin: 24px 0 0; color: var(--text-subtle); text-align: center; font-size: .82rem; }
        @media (max-width: 1060px) {
          .pricing-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .price-card.featured { transform: none; }
          .plan-desc { min-height: 0; }
        }
        @media (max-width: 620px) {
          .prices-page { padding: 0 20px 44px; }
          .prices-nav { top: 10px; margin-top: 10px; padding: 15px 16px; border-radius: 7px; }
          .prices-nav-links { gap: 14px; }
          .prices-hero { padding: 56px 0 24px; }
          .pricing-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 620px) { .prices-nav { padding-left: 44px; } }
      `}</style>

      <motion.nav className="prices-nav" aria-label="Primær navigation" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <Link href="/" className="prices-logo"><Image src={logoImage} alt="EmbedBot" priority /></Link>
        <div className="prices-nav-links">
          <Link href="/support" className="prices-nav-link">Support</Link>
          <Link href="/faq" className="prices-nav-link">FAQ</Link>
          <Link href="/prices" className="prices-nav-link active">Priser</Link>
          <Link href="/login" className="prices-nav-link">Log ind</Link>
        </div>
      </motion.nav>

      <motion.section className="prices-hero" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
        <span className="prices-kicker">Priser</span>
        <h1 className="prices-title">En plan, der passer til jeres trafik</h1>
        <p className="prices-lead">Alle planer bruger GPT-5.6 Luna og inkluderer en chatbot, der svarer ud fra jeres egen virksomhedsinformation.</p>
      </motion.section>

      <motion.section className="pricing-grid" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.08, ease }} aria-label="Prisplaner">
        {planDetails.map(({ slug, description, features, featured }) => {
          const plan = PLANS[slug];
          const isEnterprise = slug === "enterprise";
          return (
            <article className={`price-card ${featured ? "featured" : ""}`} key={slug}>
              {featured ? <span className="plan-pill">Anbefalet</span> : null}
              <h2 className="plan-name">{plan.name}</h2>
              <p className="plan-desc">{description}</p>
              <div className="price" aria-label={isEnterprise ? "Individuel pris" : `${plan.monthlyPriceDkk} kroner per måned`}>
                <span className="price-amount">{formatPrice(plan.monthlyPriceDkk)}</span>
                {isEnterprise ? null : <span className="price-period">/ måned</span>}
              </div>
              <ul className="price-list">{features.map(feature => <li key={feature}>{feature}</li>)}</ul>
              <Link href={isEnterprise ? "/support?plan=enterprise" : `/setup?plan=${slug}`} className="setup-button">
                {isEnterprise ? "Kontakt os" : `Vælg ${plan.name}`}
              </Link>
            </article>
          );
        })}
      </motion.section>

      <p className="pricing-note">
        AI-svar nulstilles hver måned. Alle priser er ekskl. moms. Abonnementet fornyes månedligt,
        indtil det opsiges, og der er ingen binding ud over den betalte periode. Se{" "}
        <Link href="/refunds">betaling og refundering</Link>.
      </p>
    <p className="mx-auto my-6 max-w-3xl px-4 text-center text-sm">{TRIAL.summary}</p></main>
  );
}
