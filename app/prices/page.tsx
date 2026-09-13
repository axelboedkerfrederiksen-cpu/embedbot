"use client";

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
    <main className="prices-page">
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; min-height: 100%; background: #f6f3ed; }
        .prices-page {
          min-height: 100dvh; font-family: var(--font-poppins), "Poppins", sans-serif;
          color: #111111; max-width: 1320px; margin: 0 auto; padding: 0 28px 72px; position: relative;
        }
        .prices-page::before {
          content: ""; position: absolute; inset: 8px -24px auto; height: 540px;
          background: radial-gradient(circle at 78% 12%, rgba(255,255,255,.9) 0%, rgba(255,255,255,0) 30%),
            radial-gradient(circle at 18% 32%, rgba(238,232,220,.75) 0%, rgba(238,232,220,0) 38%);
          pointer-events: none; z-index: 0; filter: blur(8px);
        }
        .prices-nav {
          position: sticky; top: 14px; z-index: 20; display: flex; align-items: center; justify-content: space-between;
          margin-top: 14px; padding: 18px 22px; border: 1px solid rgba(17,17,17,.08); border-radius: 20px;
          background: rgba(255,255,255,.78); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 14px 40px rgba(17,17,17,.045);
        }
        .prices-logo { display: block; line-height: 0; text-decoration: none; }
        .prices-logo img { height: 26px; width: auto; display: block; }
        .prices-nav-links { display: flex; align-items: center; gap: 18px; }
        .prices-nav-link { font-size: .85rem; font-weight: 500; color: #6b6258; text-decoration: none; opacity: .82; transition: opacity 200ms ease, color 200ms ease; }
        .prices-nav-link:hover, .prices-nav-link.active { opacity: 1; color: #111111; }
        .prices-hero { position: relative; z-index: 1; padding: 82px 0 34px; max-width: 790px; }
        .prices-kicker {
          display: inline-flex; width: fit-content; align-items: center; padding: 8px 12px; border-radius: 999px;
          border: 1px solid rgba(17,17,17,.08); background: #ffffff; color: #6b6258; font-size: .82rem;
          font-weight: 700; letter-spacing: .14em; text-transform: uppercase; margin-bottom: 20px;
        }
        .prices-title { margin: 0 0 20px; max-width: 12ch; font-size: clamp(2.55rem, 6vw, 5rem); font-weight: 700; line-height: .98; letter-spacing: -.05em; }
        .prices-lead { margin: 0; max-width: 58ch; color: #5f584f; font-size: clamp(1rem, 2.1vw, 1.18rem); line-height: 1.8; }
        .pricing-grid {
          position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px; margin-top: 24px; align-items: stretch;
        }
        .price-card {
          position: relative; display: flex; flex-direction: column; min-width: 0; padding: 28px 24px 24px;
          border: 1px solid rgba(17,17,17,.08); border-radius: 24px; background: rgba(255,255,255,.94);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.72), 0 18px 42px rgba(17,17,17,.055); backdrop-filter: blur(10px);
        }
        .price-card.featured { border-color: #111111; box-shadow: 0 22px 52px rgba(17,17,17,.12); transform: translateY(-8px); }
        .plan-pill {
          position: absolute; top: 18px; right: 18px; padding: 7px 10px; border-radius: 999px; background: #111111;
          color: #ffffff; font-size: .68rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
        }
        .plan-name { margin: 0 0 10px; font-size: 1.25rem; font-weight: 700; line-height: 1.2; }
        .plan-desc { margin: 0; min-height: 76px; color: #6b6258; font-size: .88rem; line-height: 1.55; }
        .price { display: flex; align-items: flex-end; gap: 8px; margin: 28px 0 25px; }
        .price-amount { font-size: clamp(2rem, 3.3vw, 3.15rem); font-weight: 800; line-height: .95; letter-spacing: -.05em; }
        .price-period { color: #6b6258; font-size: .82rem; font-weight: 600; padding-bottom: 4px; }
        .price-list { display: grid; gap: 12px; margin: 0 0 28px; padding: 0; list-style: none; }
        .price-list li { display: flex; align-items: flex-start; gap: 10px; color: #5f584f; font-size: .86rem; line-height: 1.5; }
        .price-list li::before { content: ""; width: 7px; height: 7px; margin-top: 6px; border-radius: 999px; background: #111111; box-shadow: 0 0 0 4px #f6f3ed; flex: 0 0 auto; }
        .setup-button {
          display: inline-flex; align-items: center; justify-content: center; width: 100%; min-height: 50px; margin-top: auto;
          padding: 13px 18px; border-radius: 999px; border: 1px solid rgba(17,17,17,.14); background: #ffffff;
          color: #111111; font-size: .9rem; font-weight: 700; text-decoration: none;
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, color 180ms ease;
        }
        .price-card.featured .setup-button, .setup-button:hover { background: #111111; color: #ffffff; box-shadow: 0 16px 34px rgba(17,17,17,.16); transform: translateY(-1px); }
        .pricing-note { position: relative; z-index: 1; margin: 24px 0 0; color: #746b61; text-align: center; font-size: .82rem; }
        @media (max-width: 1060px) {
          .pricing-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .price-card.featured { transform: none; }
          .plan-desc { min-height: 0; }
        }
        @media (max-width: 620px) {
          .prices-page { padding: 0 20px 44px; }
          .prices-nav { top: 10px; margin-top: 10px; padding: 15px 16px; border-radius: 16px; }
          .prices-nav-links { gap: 14px; }
          .prices-hero { padding: 56px 0 24px; }
          .pricing-grid { grid-template-columns: 1fr; }
        }
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
              {featured ? <span className="plan-pill">Mest valgt</span> : null}
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

      <p className="pricing-note">AI-svar nulstilles hver måned. Alle priser er ekskl. moms.</p>
    </main>
  );
}
