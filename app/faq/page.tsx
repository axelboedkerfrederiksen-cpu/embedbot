"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import logoImage from "@/media/86a91d6a-f484-4e7d-a05c-55ab0979c3b1.png";

const ease = [0.22, 1, 0.36, 1] as const;

const faqGroups = [
  {
    title: "Om EmbedBot",
    items: [
      {
        question: "Hvad er EmbedBot?",
        answer: "EmbedBot er en AI-chatbot til websites og webshops. Den lærer ud fra jeres eget indhold og kan svare på spørgsmål om blandt andet produkter, levering og retur.",
      },
      {
        question: "Hvem er EmbedBot til?",
        answer: "EmbedBot er lavet til virksomheder, der vil give kunder hurtige svar døgnet rundt uden at skulle besvare de samme spørgsmål manuelt igen og igen.",
      },
      {
        question: "Hvilke platforme virker EmbedBot på?",
        answer: "EmbedBot kan indsættes på blandt andet WordPress med WooCommerce, Shopify, Squarespace, Wix, Webflow og almindelige HTML-hjemmesider.",
      },
    ],
  },
  {
    title: "Opsætning og funktioner",
    items: [
      {
        question: "Hvor lang tid tager opsætningen?",
        answer: "Selve indsættelsen tager normalt få minutter. I får et embed-script, som indsættes på hjemmesiden, og vi hjælper med opsætningen, hvis der er behov for det.",
      },
      {
        question: "Hvad lærer chatbotten fra?",
        answer: "Chatbotten kan tage udgangspunkt i jeres virksomhedsoplysninger, produkttekster, FAQ, leveringsbetingelser og andet indhold, som I giver den adgang til.",
      },
      {
        question: "Kan jeg tilpasse udseendet?",
        answer: "Ja. Farver, navn, logo, skrifttype og velkomstbesked kan tilpasses, så chatbotten passer til jeres hjemmeside og brand.",
      },
      {
        question: "Kan chatbotten sende en kunde videre til et menneske?",
        answer: "Ja. I kan bruge samtalerne til at se, hvad kunderne spørger om, og følge op på henvendelser, der kræver menneskelig hjælp.",
      },
    ],
  },
  {
    title: "Hastighed og sikkerhed",
    items: [
      {
        question: "Gør EmbedBot min hjemmeside langsommere?",
        answer: "EmbedBot indlæses asynkront, så sidens vigtigste indhold kan vises først. I en online desktop-test med 10 målinger med og 10 uden EmbedBot var medianresultaterne identiske for FCP, LCP, INP og CLS. Den præcise effekt afhænger dog af hjemmesidens øvrige scripts, hosting, enhed og internetforbindelse.",
      },
      {
        question: "Hvordan måler I performancepåvirkningen?",
        answer: "Vi sammenligner samme testside med og uden chatbotten og måler blandt andet FCP, LCP, INP, CLS og TTFB. Vi bruger medianen af flere målinger, fordi enkelte målinger kan variere på grund af netværk og browser-cache.",
      },
      {
        question: "Hvad sker der, hvis chatbotten eller serveren ikke svarer?",
        answer: "Hjemmesidens øvrige indhold fortsætter med at fungere. Chatbotten er et separat lag, så en midlertidig fejl i chatbotten bør ikke blokere resten af siden.",
      },
      {
        question: "Hvordan håndteres mine data?",
        answer: "EmbedBot behandler de oplysninger, der er nødvendige for at levere chatbotten. Se vores privatlivspolitik for mere information om databehandling, opbevaring og dine rettigheder.",
      },
    ],
  },
  {
    title: "Priser og hjælp",
    items: [
      {
        question: "Er der en prøveperiode?",
        answer: "Ja. Du kan prøve EmbedBot gratis i 14 dage. Se den aktuelle pris og planernes indhold på prissiden.",
      },
      {
        question: "Kan jeg få hjælp til installationen?",
        answer: "Ja. Hvis du sender os din platform og hvad du gerne vil have chatbotten til at kunne svare på, hjælper vi dig godt i gang.",
      },
      {
        question: "Hvordan kommer jeg i gang?",
        answer: "Start med at vælge en plan eller kontakte os. Derefter samler vi den information, chatbotten skal lære fra, og gør den klar til jeres website.",
      },
    ],
  },
];

export default function FAQPage() {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  return (
    <main className="faq-page">
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; min-height: 100%; background: #f6f3ed; }
        .faq-page {
          min-height: 100dvh; font-family: var(--font-poppins), "Poppins", sans-serif;
          color: #111111; max-width: 1080px; margin: 0 auto; padding: 0 28px 72px; position: relative;
        }
        .faq-page::before {
          content: ""; position: absolute; inset: 8px -24px auto; height: 560px; pointer-events: none; z-index: 0;
          background: radial-gradient(circle at 78% 10%, rgba(255,255,255,.92) 0%, rgba(255,255,255,0) 30%),
            radial-gradient(circle at 18% 30%, rgba(238,232,220,.8) 0%, rgba(238,232,220,0) 38%);
          filter: blur(8px);
        }
        .faq-nav {
          position: sticky; top: 14px; z-index: 20; display: flex; align-items: center; justify-content: space-between;
          margin-top: 14px; padding: 18px 22px; border: 1px solid rgba(17,17,17,.08); border-radius: 20px;
          background: rgba(255,255,255,.78); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 14px 40px rgba(17,17,17,.045);
        }
        .faq-logo { display: block; line-height: 0; }
        .faq-logo img { height: 26px; width: auto; display: block; }
        .faq-nav-links { display: flex; align-items: center; gap: 18px; }
        .faq-nav-link { font-size: .85rem; font-weight: 500; color: #6b6258; text-decoration: none; opacity: .82; transition: opacity 200ms ease, color 200ms ease; }
        .faq-nav-link:hover, .faq-nav-link.active { opacity: 1; color: #111111; }
        .faq-hero { position: relative; z-index: 1; padding: 86px 0 46px; max-width: 720px; }
        .faq-kicker {
          display: inline-flex; width: fit-content; padding: 8px 12px; border: 1px solid rgba(17,17,17,.08);
          border-radius: 999px; background: #fff; color: #6b6258; font-size: .78rem; font-weight: 700;
          letter-spacing: .14em; text-transform: uppercase; margin-bottom: 20px;
        }
        .faq-title { margin: 0 0 20px; max-width: 12ch; font-size: clamp(2.8rem, 7vw, 5.8rem); font-weight: 700; line-height: .96; letter-spacing: -.06em; }
        .faq-lead { margin: 0; max-width: 60ch; color: #5f584f; font-size: clamp(1rem, 2.2vw, 1.18rem); line-height: 1.8; }
        .faq-groups { position: relative; z-index: 1; display: grid; gap: 36px; max-width: 820px; }
        .faq-group-title { margin: 0 0 12px; font-size: 1.35rem; letter-spacing: -.02em; }
        .faq-list { overflow: hidden; border-top: 1px solid rgba(17,17,17,.11); }
        .faq-item { border-bottom: 1px solid rgba(17,17,17,.11); }
        .faq-question {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 20px 4px;
          border: 0; background: transparent; color: #111; text-align: left; font: inherit; font-size: 1.02rem; font-weight: 600; cursor: pointer;
        }
        .faq-question:hover { color: #6b6258; }
        .faq-question:focus-visible { outline: 2px solid #111; outline-offset: 4px; border-radius: 5px; }
        .faq-icon { flex: 0 0 auto; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid rgba(17,17,17,.13); border-radius: 50%; font-size: 1.2rem; font-weight: 400; line-height: 1; }
        .faq-answer { max-width: 680px; padding: 0 48px 20px 4px; color: #6b6258; line-height: 1.75; }
        .faq-footer { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 64px; padding-top: 24px; border-top: 1px solid rgba(17,17,17,.1); color: #6b6258; font-size: .9rem; }
        .faq-footer a { color: inherit; text-decoration: none; }
        .faq-footer a:hover { color: #111; }
        @media (max-width: 620px) {
          .faq-page { padding: 0 20px 48px; }
          .faq-nav { top: 10px; margin-top: 10px; padding: 15px 16px; border-radius: 16px; }
          .faq-nav-links { gap: 13px; }
          .faq-nav-link { font-size: .76rem; }
          .faq-hero { padding: 58px 0 34px; }
          .faq-title { font-size: clamp(2.7rem, 14vw, 4rem); }
          .faq-question { font-size: .96rem; }
          .faq-answer { padding-right: 34px; }
          .faq-footer { align-items: flex-start; flex-direction: column; margin-top: 48px; }
        }
      `}</style>

      <motion.nav className="faq-nav" aria-label="Primær navigation" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease }}>
        <Link href="/" className="faq-logo"><Image src={logoImage} alt="EmbedBot" priority /></Link>
        <div className="faq-nav-links">
          <Link href="/support" className="faq-nav-link">Support</Link>
          <Link href="/faq" className="faq-nav-link active">FAQ</Link>
          <Link href="/prices" className="faq-nav-link">Priser</Link>
          <Link href="/login" className="faq-nav-link">Log ind</Link>
        </div>
      </motion.nav>

      <motion.section className="faq-hero" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, ease }}>
        <span className="faq-kicker">Ofte stillede spørgsmål</span>
        <h1 className="faq-title">Svar på det, du tænker på.</h1>
        <p className="faq-lead">Alt det vigtigste om EmbedBot, opsætning, hastighed, sikkerhed og priser samlet ét sted.</p>
      </motion.section>

      <section className="faq-groups" aria-label="Ofte stillede spørgsmål">
        {faqGroups.map((group, groupIndex) => (
          <motion.section key={group.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: .55, delay: groupIndex * .04, ease }}>
            <h2 className="faq-group-title">{group.title}</h2>
            <div className="faq-list">
              {group.items.map((item) => {
                const isOpen = openQuestion === item.question;
                const answerId = `faq-answer-${item.question.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                return (
                  <div className="faq-item" key={item.question}>
                    <button className="faq-question" type="button" aria-expanded={isOpen} aria-controls={answerId} onClick={() => setOpenQuestion(isOpen ? null : item.question)}>
                      <span>{item.question}</span>
                      <span className="faq-icon" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen ? <div className="faq-answer" id={answerId}>{item.answer}</div> : null}
                  </div>
                );
              })}
            </div>
          </motion.section>
        ))}
      </section>

      <footer className="faq-footer">
        <span>Har du stadig spørgsmål?</span>
        <span><Link href="/support">Kontakt support</Link> · <Link href="/prices">Se priser</Link></span>
      </footer>
    </main>
  );
}
