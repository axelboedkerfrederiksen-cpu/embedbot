"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSent(false);

    const normalizedEmail = email.trim().toLowerCase();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || window.location.origin;
    const redirectTo = `${appUrl}/auth/reset-password`;

    const checkResponse = await fetch("/api/auth/check-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    const checkData = (await checkResponse.json().catch(() => null)) as
      | { exists?: boolean; error?: string }
      | null;

    if (!checkResponse.ok) {
      setLoading(false);
      setError(checkData?.error || "Kunne ikke verificere mailen.");
      return;
    }

    if (!checkData?.exists) {
      setLoading(false);
      setError("Din mail kunne ikke findes i systemet.");
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message || "Kunne ikke sende reset-link.");
      return;
    }

    setSent(true);
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "16px",
        background:
          "radial-gradient(circle at 12% 18%, rgba(246, 243, 237, 0.92) 0%, rgba(246, 243, 237, 0) 24%), radial-gradient(circle at 88% 14%, rgba(246, 243, 237, 0.9) 0%, rgba(246, 243, 237, 0) 22%), linear-gradient(180deg, #ffffff 0%, #fcfaf6 55%, #f8f4ee 100%)",
        fontFamily: '"Poppins", sans-serif',
        color: "#111111",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.94)",
          border: "1px solid rgba(17,17,17,0.08)",
          borderRadius: 24,
          padding: 28,
          display: "grid",
          gap: 12,
          boxShadow: "0 20px 50px rgba(17,17,17,0.08)",
          backdropFilter: "blur(10px)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#111111", letterSpacing: "-0.03em" }}>
          Glemt adgangskode
        </h1>
        <p style={{ margin: 0, color: "#6b6258", fontSize: 14, fontWeight: 400 }}>
          Indtast din e-mail, så sender vi et link til nulstilling af adgangskode.
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            border: "1px solid rgba(17,17,17,0.1)",
            background: "#ffffff",
            borderRadius: 14,
            padding: "13px 14px",
            fontSize: 14,
            fontFamily: '"Poppins", sans-serif',
            color: "#111111",
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            border: "1px solid rgba(17,17,17,0.08)",
            background: "#ffffff",
            color: "#111111",
            borderRadius: 999,
            padding: "12px 16px",
            fontWeight: 600,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            fontFamily: '"Poppins", sans-serif',
            boxShadow: "0 12px 28px rgba(17,17,17,0.08)",
          }}
        >
          {loading ? "Sender..." : "Send reset-link"}
        </button>

        {sent ? (
          <p
            style={{
              margin: 0,
              color: "#1b6b45",
              fontSize: 13,
              border: "1px solid rgba(27,107,69,0.2)",
              background: "rgba(27,107,69,0.08)",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            Din mail er blevet sendt. Tjek også spam.
          </p>
        ) : null}

        {error ? <p style={{ margin: 0, color: "#9b3d2f", fontSize: 13 }}>{error}</p> : null}

        <Link href="/login" style={{ color: "#6b6258", fontSize: 13, textDecoration: "underline" }}>
          Tilbage til login
        </Link>
      </form>
    </main>
  );
}
