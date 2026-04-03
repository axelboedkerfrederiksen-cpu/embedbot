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
  { name: "HTML",        logo: "https://cdn.simpleicons.org/html5/E34F26", scale: 0.92 },
  { name: "WordPress",   logo: "https://cdn.simpleicons.org/wordpress/21759B", scale: 0.9 },
  { name: "Shopify",     logo: "https://cdn.simpleicons.org/shopify/95BF47", scale: 1 },
  { name: "Squarespace", logo: "https://cdn.simpleicons.org/squarespace/111111", scale: 1.02 },
  { name: "Wix",         logo: "https://cdn.simpleicons.org/wix/111111", scale: 1.15 },
  { name: "Webflow",     logo: "https://cdn.simpleicons.org/webflow/146EF5", scale: 1.08 },
];

const features = [
  {
    num: "01",
    title: "Klar på 5 minutter",
    desc: "Ingen kodning. Udfyld en simpel formular, og din chatbot er klar til at blive indsat på din hjemmeside.",
  },
  {
    num: "02",
    title: "🇩🇰 Bygget til dansk",
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
    script.setAttribute("data-primary-color", "#ffffff");
    script.setAttribute("data-secondary-color", "#f6f3ed");
    script.setAttribute("data-fab-color", "#ffffff");
    script.setAttribute("data-font", "Poppins");
    script.onload = () => window.setTimeout(openWidgetIfAvailable, 50);
    document.body.appendChild(script);
  };

  return (
    <main className="page">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap");

        *, *::before, *::after { box-sizing: border-box; }

        html, body {
          margin: 0;
          padding: 0;
          background:
            radial-gradient(circle at 12% 18%, rgba(246, 243, 237, 0.92) 0%, rgba(246, 243, 237, 0) 24%),
            radial-gradient(circle at 88% 14%, rgba(246, 243, 237, 0.9) 0%, rgba(246, 243, 237, 0) 22%),
            linear-gradient(180deg, #ffffff 0%, #fcfaf6 55%, #f8f4ee 100%);
          background-attachment: fixed;
        }

        .page {
          min-height: 100dvh;
          font-family: "Poppins", sans-serif;
          color: #111111;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 28px 64px;
          background: transparent;
          position: relative;
        }

        .page::before {
          content: "";
          position: absolute;
          inset: 8px -24px auto;
          height: 560px;
          background:
            radial-gradient(circle at 82% 12%, rgba(255, 255, 255, 0.86) 0%, rgba(255, 255, 255, 0) 28%),
            radial-gradient(circle at 20% 28%, rgba(246, 243, 237, 0.88) 0%, rgba(246, 243, 237, 0) 36%);
          pointer-events: none;
          z-index: 0;
          filter: blur(8px);
        }

        .nav {
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

        .nav-logo { display: block; line-height: 0; text-decoration: none; }
        .nav-logo img {
          height: 26px;
          width: auto;
        }

        .nav-login {
          font-size: 0.85rem;
          font-weight: 500;
          color: #6b6258;
          text-decoration: none;
          opacity: 0.82;
          transition: opacity 200ms ease, color 200ms ease;
        }
        .nav-login:hover { opacity: 1; color: #111111; }

        .hero {
          padding: 92px 0 56px;
          position: relative;
          z-index: 1;
          display: grid;
          gap: 0;
        }

        .hero::after {
          content: "";
          position: absolute;
          top: -18px;
          right: 2%;
          width: min(38vw, 360px);
          height: min(38vw, 360px);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(246, 243, 237, 0.9) 0%, rgba(246, 243, 237, 0) 70%);
          z-index: -1;
          filter: blur(10px);
        }

        .tag {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(17, 17, 17, 0.08);
          background: #ffffff;
          font-size: 0.92rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #6b6258;
          margin-bottom: 22px;
        }

        .headline {
          font-family: "Poppins", sans-serif;
          font-size: clamp(2.4rem, 6vw, 5.4rem);
          font-weight: 700;
          line-height: 0.97;
          letter-spacing: -0.05em;
          margin: 0 0 24px;
          max-width: 11ch;
          color: #111111;
        }

        .lead {
          font-size: clamp(1rem, 2.1vw, 1.18rem);
          font-weight: 400;
          line-height: 1.8;
          color: #5f584f;
          margin: 0 0 34px;
          max-width: 54ch;
        }

        .cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .btn {
          font-family: "Poppins", sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          padding: 13px 22px;
          border-radius: 999px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: background 200ms ease, box-shadow 200ms ease, border-color 200ms ease, color 200ms ease;
          display: inline-flex;
          align-items: center;
        }

        .btn-primary {
          background: #ffffff;
          color: #111111;
          border-color: rgba(17, 17, 17, 0.1);
          box-shadow: 0 14px 28px rgba(17, 17, 17, 0.08);
        }
        .btn-primary:hover {
          background: #ffffff;
          box-shadow: 0 16px 34px rgba(17, 17, 17, 0.12);
        }

        .btn-outline {
          background: #ffffff;
          color: #111111;
          border-color: rgba(17, 17, 17, 0.08);
        }
        .btn-outline:hover {
          background: #ffffff;
          border-color: rgba(17, 17, 17, 0.12);
        }

        .features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          position: relative;
          z-index: 1;
          margin-top: 22px;
        }

        .feat {
          padding: 28px 24px;
          border: 1px solid rgba(17, 17, 17, 0.06);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 12px 30px rgba(17, 17, 17, 0.035);
          backdrop-filter: blur(8px);
        }

        .feat-num {
          display: block;
          font-size: 0.63rem;
          letter-spacing: 0.15em;
          color: #8a7e70;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .feat-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 10px;
          line-height: 1.3;
          color: #111111;
        }

        .feat-desc {
          font-size: 1.06rem;
          font-weight: 400;
          color: #5f584f;
          line-height: 1.75;
          margin: 0;
        }

        .platforms {
          padding: 40px 0 0;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }

        .platforms-label {
          font-size: 0.67rem;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #8a7e70;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .platforms-logos {
          display: flex;
          gap: 18px;
          align-items: center;
          flex-wrap: wrap;
          padding: 14px 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(17, 17, 17, 0.06);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 10px 24px rgba(17, 17, 17, 0.04);
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

        .foot {
          padding-top: 32px;
          text-align: left;
          position: relative;
          z-index: 1;
        }

        .foot a {
          font-size: 0.88rem;
          color: #6b6258;
          text-decoration: none;
          transition: color 200ms ease;
          font-weight: 500;
        }

        .foot a:hover { color: #111111; }

        @media (max-width: 600px) {
          .page { padding: 0 20px 44px; }
          .nav {
            top: 10px;
            margin-top: 10px;
            padding: 15px 16px;
            border-radius: 16px;
          }

          .hero { padding: 56px 0 38px; }
          .hero::after {
            width: 240px;
            height: 240px;
            top: 12px;
            right: -20px;
          }
          .headline { max-width: 12ch; }

          .features { grid-template-columns: 1fr; }
          .feat {
            padding: 24px 20px !important;
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
          🇩🇰 Dansk AI-kundesupport
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
                  opacity: 0.9,
                  scale: 1,
                  transition: { duration: 0.45, ease },
                },
              }}
              whileHover={{ opacity: 1, scale: 1.04, transition: { duration: 0.15 } }}
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
