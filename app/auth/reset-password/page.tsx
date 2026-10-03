"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }

      if (data.session) {
        setIsRecoverySession(true);
        setCheckingRecovery(false);
        return;
      }

      // Give Supabase a moment to parse tokens from URL hash on initial load.
      setTimeout(async () => {
        const { data: delayedData } = await supabase.auth.getSession();
        if (!mounted) {
          return;
        }

        setIsRecoverySession(Boolean(delayedData.session));
        setCheckingRecovery(false);
      }, 500);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoverySession(true);
        setCheckingRecovery(false);
      }
    });

    checkRecoverySession();

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Adgangskoden skal vaere mindst 8 tegn.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Adgangskoderne matcher ikke.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || "Kunne ikke opdatere adgangskode.");
      setLoading(false);
      return;
    }

    setMessage("Adgangskoden er opdateret. Du sendes til login...");
    setLoading(false);

    setTimeout(() => {
      router.push("/login?reset=success");
    }, 1200);
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
          Vælg ny adgangskode
        </h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14, fontWeight: 400 }}>
          Indtast din nye adgangskode nedenfor.
        </p>

        {checkingRecovery ? (
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>Validerer reset-link...</p>
        ) : null}

        {!checkingRecovery && !isRecoverySession ? (
          <p
            style={{
              margin: 0,
              color: "#9b3d2f",
              fontSize: 13,
              border: "1px solid rgba(155,61,47,0.2)",
              background: "rgba(155,61,47,0.08)",
              borderRadius: 7,
              padding: "10px 12px",
            }}
          >
            Linket er ugyldigt eller udlobet. Bed om et nyt reset-link fra login-siden.
          </p>
        ) : null}

        <input
          type="password"
          placeholder="Ny adgangskode"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={!isRecoverySession || checkingRecovery || loading}
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

        <input
          type="password"
          placeholder="Gentag ny adgangskode"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={!isRecoverySession || checkingRecovery || loading}
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
          disabled={!isRecoverySession || checkingRecovery || loading}
          style={{
            border: "1px solid var(--border)",
            background: "var(--accent)",
            color: "#ffffff",
            borderRadius: 7,
            padding: "12px 16px",
            fontWeight: 500,
            fontSize: 14,
            cursor: !isRecoverySession || checkingRecovery || loading ? "not-allowed" : "pointer",
            opacity: !isRecoverySession || checkingRecovery || loading ? 0.6 : 1,
            fontFamily: "var(--font-inter), sans-serif",
            boxShadow: "none",
          }}
        >
          {loading ? "Opdaterer..." : "Opdater adgangskode"}
        </button>

        {message ? (
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
            {message}
          </p>
        ) : null}

        {error ? <p style={{ margin: 0, color: "#9b3d2f", fontSize: 13 }}>{error}</p> : null}
      </form>
    </main>
  );
}
