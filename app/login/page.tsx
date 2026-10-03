"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "azure" | null>(null);
  const [error, setError] = useState("");
  const showResetSuccess =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reset") === "success";
  const showOAuthError =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("oauth") === "error";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message || "Kunne ikke logge ind.");
      setLoading(false);
      return;
    }

    sessionStorage.setItem("dashboard_fresh_login_at", Date.now().toString());
    router.push("/dashboard");
  }

  async function handleOAuth(provider: "google" | "azure") {
    setError("");
    setOauthLoading(provider);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        ...(provider === "azure" ? { scopes: "email" } : {}),
      },
    });

    if (oauthError) {
      setError(oauthError.message || "Kunne ikke starte login med den valgte konto.");
      setOauthLoading(null);
    }
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
          maxWidth: 400,
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          borderRadius: 7,
          padding: 28,
          display: "grid",
          gap: 12,
          boxShadow: "none",

        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 400, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>Log ind</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14, fontWeight: 400 }}>Fortsæt til dit dashboard.</p>

        <div style={{ display: "grid", gap: 9, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => void handleOAuth("google")}
            disabled={Boolean(oauthLoading) || loading}
            style={{ border: "1px solid var(--border)", background: "#ffffff", color: "var(--text-primary)", borderRadius: 7, padding: "12px 14px", fontWeight: 500, fontSize: 14, cursor: oauthLoading ? "not-allowed" : "pointer", opacity: oauthLoading && oauthLoading !== "google" ? 0.55 : 1, fontFamily: "var(--font-inter), sans-serif", display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}
          >
            <span aria-hidden="true" style={{ fontWeight: 800, fontSize: 17, color: "#4285f4" }}>G</span>
            {oauthLoading === "google" ? "Forbinder til Google…" : "Fortsæt med Google"}
          </button>
          <button
            type="button"
            onClick={() => void handleOAuth("azure")}
            disabled={Boolean(oauthLoading) || loading}
            style={{ border: "1px solid var(--border)", background: "#ffffff", color: "var(--text-primary)", borderRadius: 7, padding: "12px 14px", fontWeight: 500, fontSize: 14, cursor: oauthLoading ? "not-allowed" : "pointer", opacity: oauthLoading && oauthLoading !== "azure" ? 0.55 : 1, fontFamily: "var(--font-inter), sans-serif", display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}
          >
            <span aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(2, 6px)", gap: 1 }}><i style={{ display: "block", width: 6, height: 6, background: "#f25022" }} /><i style={{ display: "block", width: 6, height: 6, background: "#7fba00" }} /><i style={{ display: "block", width: 6, height: 6, background: "#00a4ef" }} /><i style={{ display: "block", width: 6, height: 6, background: "#ffb900" }} /></span>
            {oauthLoading === "azure" ? "Forbinder til Microsoft…" : "Fortsæt med Microsoft"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-subtle)", fontSize: 11, margin: "3px 0" }}><span style={{ height: 1, background: "rgba(17,17,17,0.1)", flex: 1 }} /><span>eller med email</span><span style={{ height: 1, background: "rgba(17,17,17,0.1)", flex: 1 }} /></div>

        {showResetSuccess ? (
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
            Din adgangskode er opdateret. Du kan nu logge ind.
          </p>
        ) : null}

        {showOAuthError ? (
          <p
            style={{
              margin: 0,
              color: "#9b3d2f",
              fontSize: 13,
              border: "1px solid rgba(155,61,47,0.2)",
              background: "rgba(155,61,47,0.07)",
              borderRadius: 7,
              padding: "10px 12px",
            }}
          >
            Login med Google eller Microsoft kunne ikke færdiggøres. Prøv igen.
          </p>
        ) : null}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ border: "1px solid var(--border)", background: "#ffffff", borderRadius: 7, padding: "13px 14px", fontSize: 14, fontFamily: "var(--font-inter), sans-serif", color: "var(--text-primary)" }}
        />
        <input
          type="password"
          placeholder="Adgangskode"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ border: "1px solid var(--border)", background: "#ffffff", borderRadius: 7, padding: "13px 14px", fontSize: 14, fontFamily: "var(--font-inter), sans-serif", color: "var(--text-primary)" }}
        />

        <Link
          href="/auth/forgot-password"
          style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "underline", justifySelf: "start" }}
        >
          Glemt adgangskode?
        </Link>

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
          {loading ? "Logger ind..." : "Log ind"}
        </button>

        {error ? <p style={{ margin: 0, color: "#9b3d2f", fontSize: 13 }}>{error}</p> : null}
      </form>
    </main>
  );
}
