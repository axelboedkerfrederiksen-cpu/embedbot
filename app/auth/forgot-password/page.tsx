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
      id="main-content"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "16px",
        background: "var(--bg-page)",
        fontFamily: "var(--font-inter), sans-serif",
        color: "var(--text-primary)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          borderRadius: 7,
          padding: 28,
          display: "grid",
          gap: 12,
          boxShadow: "none",

        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
          Glemt adgangskode
        </h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14, fontWeight: 400 }}>
          Indtast din e-mail, så sender vi et link til nulstilling af adgangskode.
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            border: "1px solid var(--border)",
            background: "#ffffff",
            borderRadius: 7,
            padding: "13px 14px",
            fontSize: 14,
            fontFamily: "var(--font-inter), sans-serif",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            border: "1px solid var(--border)",
            background: "var(--accent)",
            color: "#ffffff",
            borderRadius: 7,
            padding: "12px 16px",
            fontWeight: 500,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            fontFamily: "var(--font-inter), sans-serif",
            boxShadow: "none",
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
              borderRadius: 7,
              padding: "10px 12px",
            }}
          >
            Din mail er blevet sendt. Tjek også spam.
          </p>
        ) : null}

        {error ? <p style={{ margin: 0, color: "#9b3d2f", fontSize: 13 }}>{error}</p> : null}

        <Link href="/login" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "underline" }}>
          Tilbage til login
        </Link>
      </form>
    </main>
  );
}
