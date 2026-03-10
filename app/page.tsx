"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="start-page">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display:ital@0;1&display=swap");

        html,
        body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          background:
            radial-gradient(circle at 10% 0%, rgba(255, 210, 180, 0.45) 0%, transparent 40%),
            radial-gradient(circle at 90% 15%, rgba(160, 210, 255, 0.42) 0%, transparent 45%),
            #f7f4ef;
        }

        .start-page {
          min-height: 100dvh;
          background: transparent;
          padding: 24px 16px;
          color: #121212;
          font-family: "DM Sans", sans-serif;
          display: grid;
          place-items: center;
        }

        .start-shell {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }

        .top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: transparent;
          border: 0;
          box-shadow: none;
          padding: 4px 2px;
        }

        .nav-logo {
          font-family: "DM Serif Display", serif;
          font-size: 1.2rem;
          text-decoration: none;
          color: #121212;
          line-height: 1;
        }

        .nav-login {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid #d0d0d0;
          background: rgba(255, 255, 255, 0.72);
          color: #121212;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 700;
          padding: 9px 14px;
        }

        .hero {
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 22px;
          padding: clamp(22px, 5vw, 44px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
          animation: lift-in 380ms ease-out;
        }

        .brand {
          margin: 0;
          font-family: "DM Serif Display", serif;
          font-size: clamp(2rem, 6vw, 3.4rem);
          line-height: 1.02;
          letter-spacing: 0.4px;
        }

        .kicker {
          margin: 0 0 8px;
          font-size: 0.86rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7a4f24;
        }

        .lead {
          margin: 14px 0 0;
          max-width: 62ch;
          color: #3e3e3e;
          font-size: clamp(1rem, 2.8vw, 1.15rem);
          line-height: 1.6;
        }

        .cta-row {
          margin-top: 26px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .btn {
          border-radius: 999px;
          padding: 11px 20px;
          font-size: 0.95rem;
          font-weight: 700;
          text-decoration: none;
          transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        .btn-primary {
          background: #111;
          color: #fff;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        .btn-secondary {
          background: #fff;
          color: #121212;
          border-color: #cfcfcf;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .feature {
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 14px;
          animation: lift-in 420ms ease-out;
        }

        .feature h2 {
          margin: 0 0 6px;
          font-size: 0.98rem;
          line-height: 1.2;
        }

        .feature p {
          margin: 0;
          font-size: 0.9rem;
          color: #444;
          line-height: 1.5;
        }

        .existing-customer-link {
          text-align: center;
          font-size: 0.84rem;
          color: #6f6f6f;
          text-decoration: none;
        }

        .existing-customer-link:hover {
          color: #4c4c4c;
        }

        @keyframes lift-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 900px) {
          .feature-grid {
            grid-template-columns: 1fr;
          }

          .hero {
            border-radius: 18px;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="start-shell">
        <nav className="top-nav" aria-label="Top navigation">
          <Link href="/" className="nav-logo">EmbedBot</Link>
          <Link href="/login" className="nav-login">Log ind</Link>
        </nav>

        <section className="hero">
          <p className="kicker">EMBEDBOT</p>
          <h1 className="brand">Giv din webshop en AI-chatbot på 5 minutter</h1>
          <p className="lead">
            EmbedBot lærer din forretning at kende og svarer dine kunders spørgsmål automatisk
            - så du ikke skal.
          </p>

          <div className="cta-row">
            <Link href="/setup" className="btn btn-primary">
              Start chatbot opsætning
            </Link>
            <Link href="/demo.html" className="btn btn-secondary">
              Se chatbot demo
            </Link>
          </div>
        </section>

        <section className="feature-grid" aria-label="Fordele ved flowet">
          <article className="feature">
            <h2>Klar på 5 minutter</h2>
            <p>Ingen kodning krævet. Du udfylder en simpel formular, og din chatbot er klar til at blive sat ind på din hjemmeside.</p>
          </article>
          <article className="feature">
            <h2>299kr pr. måned</h2>
            <p>For 299kr får du en chatbot 24/7, med ingen ansatte.</p>
          </article>
          <article className="feature">
            <h2>Dine kunder får svar med det samme</h2>
            <p>I stedet for at vente på en mail, får dine kunder svar døgnet rundt - direkte på din side.</p>
          </article>
        </section>

        <Link href="/dashboard" className="existing-customer-link">
          Allerede kunde? Log ind og se dine chatbots →
        </Link>
      </div>
    </main>
  );
}
