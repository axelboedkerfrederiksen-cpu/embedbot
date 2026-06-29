"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
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
    <main className="support-page">
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }

        html, body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          background: #f6f3ed;
        }

        .support-page {
          min-height: 100dvh;
          font-family: var(--font-poppins), "Poppins", sans-serif;
          color: #111111;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 28px 64px;
          position: relative;
        }

        .support-page::before {
          content: "";
          position: absolute;
          inset: 8px -24px auto;
          height: 540px;
          background:
            radial-gradient(circle at 78% 12%, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0) 30%),
            radial-gradient(circle at 18% 32%, rgba(238, 232, 220, 0.78) 0%, rgba(238, 232, 220, 0) 38%);
          pointer-events: none;
          z-index: 0;
          filter: blur(8px);
        }

        .support-nav {
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
          color: #6b6258;
          font-size: 0.85rem;
          font-weight: 500;
          text-decoration: none;
          opacity: 0.82;
          transition: opacity 200ms ease, color 200ms ease;
        }

        .support-nav-link:hover,
        .support-nav-link.active {
          opacity: 1;
          color: #111111;
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

        .support-title {
          margin: 0 0 20px;
          color: #111111;
          font-size: clamp(2.45rem, 5.8vw, 4.8rem);
          font-weight: 700;
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        .support-lead {
          margin: 0;
          max-width: 48ch;
          color: #5f584f;
          font-size: clamp(1rem, 2.1vw, 1.12rem);
          line-height: 1.8;
        }

        .support-form {
          display: grid;
          gap: 16px;
          padding: clamp(24px, 4vw, 34px);
          border: 1px solid rgba(17, 17, 17, 0.07);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 18px 42px rgba(17, 17, 17, 0.055);
          backdrop-filter: blur(10px);
        }

        .support-field {
          display: grid;
          gap: 8px;
        }

        .support-label {
          color: #6b6258;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .support-input,
        .support-select,
        .support-textarea {
          width: 100%;
          border: 1px solid rgba(17, 17, 17, 0.1);
          border-radius: 14px;
          background: #ffffff;
          color: #111111;
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
          box-shadow: 0 0 0 4px rgba(246, 243, 237, 0.9);
        }

        .support-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          border: 1px solid rgba(17, 17, 17, 0.1);
          border-radius: 999px;
          background: #111111;
          color: #ffffff;
          cursor: pointer;
          font: inherit;
          font-size: 0.95rem;
          font-weight: 700;
          box-shadow: 0 16px 34px rgba(17, 17, 17, 0.16);
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
          border-radius: 14px;
          padding: 12px 14px;
          color: #5f584f;
          background: #f6f3ed;
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
            border-radius: 16px;
          }
          .support-nav-links { gap: 14px; }
          .support-layout {
            grid-template-columns: 1fr;
            gap: 28px;
            padding-top: 56px;
          }
        }
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
