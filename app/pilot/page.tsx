"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import logoImage from "@/media/86a91d6a-f484-4e7d-a05c-55ab0979c3b1.png";

export default function PilotPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [question, setQuestion] = useState("");
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
          "x-csrf-token": "pilot-form",
        },
        body: JSON.stringify({
          type: "support",
          name,
          email,
          business_name: website,
          message: [
            "Anmodning om gratis 14-dages pilot.",
            `Webshop: ${website}`,
            question ? `Typisk kundespørgsmål: ${question}` : "Typisk kundespørgsmål: Ikke angivet",
          ].join("\n"),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke sende anmodningen.");
      }

      setStatus("success");
      setFeedback("Tak. Jeg gennemgår webshoppen og svarer med næste skridt.");
      setName("");
      setEmail("");
      setWebsite("");
      setQuestion("");
    } catch (error) {
      setStatus("error");
      setFeedback(error instanceof Error ? error.message : "Kunne ikke sende anmodningen.");
    }
  }

  return (
    <main className="pilot-page">
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; min-height: 100%; background: #f6f3ed; }
        .pilot-page {
          min-height: 100dvh; max-width: 1120px; margin: 0 auto; padding: 14px 28px 72px;
          color: #111111; font-family: var(--font-poppins), "Poppins", sans-serif;
        }
        .pilot-nav {
          display: flex; align-items: center; justify-content: space-between; padding: 18px 22px;
          border: 1px solid rgba(17,17,17,.08); border-radius: 20px; background: rgba(255,255,255,.78);
        }
        .pilot-logo { line-height: 0; }
        .pilot-logo img { display: block; width: auto; height: 26px; }
        .pilot-nav a { color: #6b6258; font-size: .86rem; font-weight: 600; text-decoration: none; }
        .pilot-layout {
          display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(360px, .92fr);
          gap: clamp(42px, 7vw, 86px); align-items: start; padding: 86px 0 0;
        }
        .pilot-kicker {
          display: inline-flex; padding: 8px 12px; border: 1px solid rgba(17,17,17,.08);
          border-radius: 999px; background: #fff; color: #6b6258; font-size: .78rem;
          font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
        }
        .pilot-title {
          margin: 22px 0 22px; max-width: 11ch; font-size: clamp(2.65rem, 6vw, 5.4rem);
          font-weight: 700; line-height: .98; letter-spacing: -.055em;
        }
        .pilot-lead { margin: 0; max-width: 55ch; color: #5f584f; font-size: 1.08rem; line-height: 1.8; }
        .pilot-steps { display: grid; gap: 16px; margin: 34px 0 0; padding: 0; list-style: none; }
        .pilot-steps li { display: grid; grid-template-columns: 34px 1fr; gap: 12px; color: #4f4942; line-height: 1.6; }
        .pilot-step-number {
          display: inline-flex; width: 30px; height: 30px; align-items: center; justify-content: center;
          border-radius: 50%; background: #111; color: #fff; font-size: .78rem; font-weight: 700;
        }
        .pilot-form {
          display: grid; gap: 16px; padding: clamp(24px, 4vw, 34px); border: 1px solid rgba(17,17,17,.08);
          border-radius: 24px; background: rgba(255,255,255,.94); box-shadow: 0 22px 54px rgba(17,17,17,.08);
        }
        .pilot-form h2 { margin: 0 0 2px; font-size: 1.45rem; letter-spacing: -.025em; }
        .pilot-form-intro { margin: 0 0 6px; color: #6b6258; font-size: .9rem; line-height: 1.55; }
        .pilot-field { display: grid; gap: 7px; }
        .pilot-label { color: #6b6258; font-size: .76rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
        .pilot-input {
          width: 100%; min-height: 49px; padding: 0 14px; border: 1px solid rgba(17,17,17,.11);
          border-radius: 14px; background: #fff; color: #111; font: inherit; font-size: .94rem; outline: none;
        }
        .pilot-input:focus { border-color: rgba(17,17,17,.32); box-shadow: 0 0 0 4px #f6f3ed; }
        .pilot-button {
          min-height: 52px; margin-top: 4px; border: 0; border-radius: 999px; background: #111; color: #fff;
          cursor: pointer; font: inherit; font-size: .94rem; font-weight: 700; box-shadow: 0 16px 34px rgba(17,17,17,.16);
        }
        .pilot-button:disabled { cursor: not-allowed; opacity: .6; }
        .pilot-fineprint { margin: -2px 0 0; color: #7b7268; font-size: .78rem; line-height: 1.55; text-align: center; }
        .pilot-feedback { margin: 0; padding: 12px 14px; border-radius: 12px; background: #f6f3ed; color: #4f4942; font-size: .86rem; line-height: 1.5; }
        .pilot-feedback.error { color: #9b3d2f; }
        @media (max-width: 780px) {
          .pilot-page { padding: 10px 20px 48px; }
          .pilot-nav { padding: 15px 16px; border-radius: 16px; }
          .pilot-layout { grid-template-columns: 1fr; gap: 34px; padding-top: 58px; }
          .pilot-title { max-width: 12ch; }
        }
      `}</style>

      <nav className="pilot-nav" aria-label="Primær navigation">
        <Link href="/" className="pilot-logo"><Image src={logoImage} alt="EmbedBot" priority /></Link>
        <Link href="/prices">Se priser efter piloten</Link>
      </nav>

      <section className="pilot-layout">
        <div>
          <span className="pilot-kicker">Gratis 14-dages pilot</span>
          <h1 className="pilot-title">I godkender. Vi gør resten.</h1>
          <p className="pilot-lead">
            Vi bygger chatbotten ud fra jeres webshop, tilpasser den til jeres brand og hjælper med at få den live. Ingen kortoplysninger og ingen binding.
          </p>
          <ol className="pilot-steps">
            <li><span className="pilot-step-number">1</span><span>Vi sender en privat demo med svar baseret på jeres eget indhold.</span></li>
            <li><span className="pilot-step-number">2</span><span>I godkender svar og udseende, før noget bliver vist til kunderne.</span></li>
            <li><span className="pilot-step-number">3</span><span>Efter 14 dage vælger I selv, om den skal fortsætte fra 299 kr. om måneden.</span></li>
          </ol>
        </div>

        <form className="pilot-form" onSubmit={handleSubmit}>
          <h2>Få jeres private demo</h2>
          <p className="pilot-form-intro">Fire korte felter. Ingen konto og intet betalingskort.</p>
          <label className="pilot-field">
            <span className="pilot-label">Navn</span>
            <input className="pilot-input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
          </label>
          <label className="pilot-field">
            <span className="pilot-label">Arbejdsmail</span>
            <input className="pilot-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label className="pilot-field">
            <span className="pilot-label">Webshop</span>
            <input className="pilot-input" type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://jereswebshop.dk" required />
          </label>
          <label className="pilot-field">
            <span className="pilot-label">Hvad spørger kunderne ofte om</span>
            <input className="pilot-input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Valgfrit, fx levering eller størrelser" />
          </label>
          <button className="pilot-button" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sender…" : "Bed om en privat demo"}
          </button>
          <p className="pilot-fineprint">Vi kontakter jer om demoen. Intet bliver installeret uden jeres godkendelse.</p>
          {feedback ? <p className={`pilot-feedback ${status === "error" ? "error" : ""}`}>{feedback}</p> : null}
        </form>
      </section>
    </main>
  );
}
