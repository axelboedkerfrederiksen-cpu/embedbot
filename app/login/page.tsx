"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    // Force explicit login each time user lands on /login.
    supabase.auth.signOut();
  }, [router, supabase.auth]);

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
          maxWidth: 400,
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
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#111111", letterSpacing: "-0.03em" }}>Log ind</h1>
        <p style={{ margin: 0, color: "#6b6258", fontSize: 14, fontWeight: 400 }}>Fortsæt til dit dashboard.</p>

        <div style={{ display: "grid", gap: 9, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => void handleOAuth("google")}
            disabled={Boolean(oauthLoading) || loading}
            style={{ border: "1px solid rgba(17,17,17,0.12)", background: "#ffffff", color: "#111111", borderRadius: 14, padding: "12px 14px", fontWeight: 600, fontSize: 14, cursor: oauthLoading ? "not-allowed" : "pointer", opacity: oauthLoading && oauthLoading !== "google" ? 0.55 : 1, fontFamily: '"Poppins", sans-serif', display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}
          >
            <span aria-hidden="true" style={{ fontWeight: 800, fontSize: 17, color: "#4285f4" }}>G</span>
            {oauthLoading === "google" ? "Forbinder til Google…" : "Fortsæt med Google"}
          </button>
          <button
            type="button"
            onClick={() => void handleOAuth("azure")}
            disabled={Boolean(oauthLoading) || loading}
            style={{ border: "1px solid rgba(17,17,17,0.12)", background: "#ffffff", color: "#111111", borderRadius: 14, padding: "12px 14px", fontWeight: 600, fontSize: 14, cursor: oauthLoading ? "not-allowed" : "pointer", opacity: oauthLoading && oauthLoading !== "azure" ? 0.55 : 1, fontFamily: '"Poppins", sans-serif', display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}
          >
            <span aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(2, 6px)", gap: 1 }}><i style={{ display: "block", width: 6, height: 6, background: "#f25022" }} /><i style={{ display: "block", width: 6, height: 6, background: "#7fba00" }} /><i style={{ display: "block", width: 6, height: 6, background: "#00a4ef" }} /><i style={{ display: "block", width: 6, height: 6, background: "#ffb900" }} /></span>
            {oauthLoading === "azure" ? "Forbinder til Microsoft…" : "Fortsæt med Microsoft"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#8a7e70", fontSize: 11, margin: "3px 0" }}><span style={{ height: 1, background: "rgba(17,17,17,0.1)", flex: 1 }} /><span>eller med email</span><span style={{ height: 1, background: "rgba(17,17,17,0.1)", flex: 1 }} /></div>

        {showResetSuccess ? (
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
            Din adgangskode er opdateret. Du kan nu logge ind.
          </p>
        ) : null}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ border: "1px solid rgba(17,17,17,0.1)", background: "#ffffff", borderRadius: 14, padding: "13px 14px", fontSize: 14, fontFamily: '"Poppins", sans-serif', color: "#111111", outline: "none" }}
        />
        <input
          type="password"
          placeholder="Adgangskode"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ border: "1px solid rgba(17,17,17,0.1)", background: "#ffffff", borderRadius: 14, padding: "13px 14px", fontSize: 14, fontFamily: '"Poppins", sans-serif', color: "#111111", outline: "none" }}
        />

        <Link
          href="/auth/forgot-password"
          style={{ color: "#6b6258", fontSize: 13, textDecoration: "underline", justifySelf: "start" }}
        >
          Glemt adgangskode?
        </Link>

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
          {loading ? "Logger ind..." : "Log ind"}
        </button>

        {error ? <p style={{ margin: 0, color: "#9b3d2f", fontSize: 13 }}>{error}</p> : null}
      </form>
    </main>
  );
}
