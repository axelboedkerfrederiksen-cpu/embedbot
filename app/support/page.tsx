"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import logoImage from "@/media/86a91d6a-f484-4e7d-a05c-55ab0979c3b1.png";

const ease = [0.22, 1, 0.36, 1] as const;

export default function SupportPage() {
  const [type, setType] = useState("support");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedBusiness = params.get("business")?.trim();
    const frame = window.requestAnimationFrame(() => {
      if (params.get("type") === "complaint") setType("complaint");
      if (requestedBusiness) setBusinessName(requestedBusiness);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setFeedback("");

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": "support-form",
        },
        body: JSON.stringify({
          type,
          name,
          email,
          business_name: businessName,
          message,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke sende beskeden.");
      }

      setStatus("success");
      setFeedback("Tak, din besked er sendt. Jeg vender tilbage hurtigst muligt.");
      setType("support");
      setName("");
      setEmail("");
      setBusinessName("");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setFeedback(error instanceof Error ? error.message : "Kunne ikke sende beskeden.");
    }
  }

  return (
    <main id="main-content" className="support-page">
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }

        html, body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          background: var(--bg-page);
        }

        .support-page {
          min-height: 100dvh;
          font-family: var(--font-inter), sans-serif;
          color: var(--text-primary);
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 28px 64px;
          position: relative;
        }

        .support-page::before { display: none; }

        .support-nav {
          position: sticky;
          top: 14px;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 14px;
          padding: 18px 22px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--bg-page);


          box-shadow: none;
        }

        .support-logo {
          display: block;
          line-height: 0;
          text-decoration: none;
        }

        .support-logo img {
          height: 26px;
          width: auto;
          display: block;
        }

        .support-nav-links {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .support-nav-link {
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 500;
          text-decoration: none;
          opacity: 0.82;
          transition: opacity 200ms ease, color 200ms ease;
        }

        .support-nav-link:hover,
        .support-nav-link.active {
          opacity: 1;
          color: var(--text-primary);
        }

        .support-layout {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
          gap: 42px;
          align-items: start;
          padding: 86px 0 0;
        }

        .support-kicker {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          padding: 8px 12px;
          border-radius: 7px;
          border: 1px solid var(--border);
          background: #ffffff;
          color: var(--text-muted);
          font-size: 0.82rem;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .support-title {
          margin: 0 0 20px;
          color: var(--text-primary);
          font-size: clamp(2.45rem, 5.8vw, 4.8rem);
          font-weight: 400;
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        .support-lead {
          margin: 0;
          max-width: 48ch;
          color: var(--text-muted);
          font-size: clamp(1rem, 2.1vw, 1.12rem);
          line-height: 1.8;
        }

        .support-form {
          display: grid;
          gap: 16px;
          padding: clamp(24px, 4vw, 34px);
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--bg-primary);
          box-shadow: none;

        }

        .support-field {
          display: grid;
          gap: 8px;
        }

        .support-label {
          color: var(--text-muted);
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .support-input,
        .support-select,
        .support-textarea {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: #ffffff;
          color: var(--text-primary);
          font: inherit;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .support-input,
        .support-select {
          min-height: 48px;
          padding: 0 14px;
        }

        .support-textarea {
          min-height: 150px;
          resize: vertical;
          padding: 13px 14px;
          line-height: 1.6;
        }

        .support-input:focus,
        .support-select:focus,
        .support-textarea:focus {
          border-color: rgba(17, 17, 17, 0.24);
          box-shadow: none;
        }

        .support-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--accent);
          color: #ffffff;
          cursor: pointer;
          font: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          box-shadow: none;
          transition: background 180ms ease, opacity 180ms ease, transform 180ms ease;
        }

        .support-button:hover {
          background: #2a2927;
          transform: translateY(-1px);
        }

        .support-button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
          transform: none;
        }

        .support-feedback {
          margin: 0;
          border-radius: 7px;
          padding: 12px 14px;
          color: var(--text-muted);
          background: var(--bg-secondary);
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .support-feedback.error {
          color: #9b3d2f;
        }

        @media (max-width: 760px) {
          .support-page { padding: 0 20px 44px; }
          .support-nav {
            top: 10px;
            margin-top: 10px;
            padding: 15px 16px;
            border-radius: 7px;
          }
          .support-nav-links { gap: 14px; }
          .support-layout {
            grid-template-columns: 1fr;
            gap: 28px;
            padding-top: 56px;
          }
        }
        @media (max-width: 620px) { .support-nav { padding-left: 44px; } }
      `}</style>

      <motion.nav
        className="support-nav"
        aria-label="Primær navigation"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <Link href="/" className="support-logo">
          <Image src={logoImage} alt="EmbedBot" priority />
        </Link>
        <div className="support-nav-links">
          <Link href="/support" className="support-nav-link active">Support</Link>
          <Link href="/faq" className="support-nav-link">FAQ</Link>
          <Link href="/prices" className="support-nav-link">Priser</Link>
          <Link href="/login" className="support-nav-link">Log ind</Link>
        </div>
      </motion.nav>

      <section className="support-layout">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <span className="support-kicker">Support</span>
          <h1 className="support-title">Send en besked eller klage</h1>
          <p className="support-lead">
            Skriv hvad der driller, eller hvad du vil have fulgt op på. Beskeden lander direkte i admin-panelet.
          </p>
        </motion.div>

        <motion.form
          className="support-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease }}
        >
          <label className="support-field">
            <span className="support-label">Type</span>
            <select className="support-select" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="support">Besked</option>
              <option value="complaint">Klage</option>
            </select>
          </label>

          <label className="support-field">
            <span className="support-label">Navn</span>
            <input
              className="support-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Dit navn"
              autoComplete="name"
              required
            />
          </label>

          <label className="support-field">
            <span className="support-label">Email</span>
            <input
              className="support-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="dig@eksempel.dk"
              autoComplete="email"
              required
            />
          </label>

          <label className="support-field">
            <span className="support-label">Virksomhed</span>
            <input
              className="support-input"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Valgfrit"
              autoComplete="organization"
            />
          </label>

          <label className="support-field">
            <span className="support-label">Besked</span>
            <textarea
              className="support-textarea"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Skriv din besked her"
              required
            />
          </label>

          <button className="support-button" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sender..." : "Send besked"}
          </button>

          <p className="support-feedback">
            Vi bruger oplysningerne til at behandle og dokumentere din henvendelse. Se{" "}
            <Link href="/privacy">privatlivspolitikken</Link>.
          </p>

          {feedback ? (
            <p className={`support-feedback ${status === "error" ? "error" : ""}`}>
              {feedback}
            </p>
          ) : null}
        </motion.form>
      </section>
    </main>
  );
}
