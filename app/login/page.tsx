"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "16px", background: "#030712", fontFamily: '"DM Sans", sans-serif', color: "#ffffff" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 10,
          padding: 24,
          display: "grid",
          gap: 10,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#ffffff" }}>Log ind</h1>
        <p style={{ margin: 0, color: "#9ca3af", fontSize: 14, fontWeight: 300 }}>Fortsæt til dit dashboard.</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#111827", borderRadius: 6, padding: "11px 12px", fontSize: 14, fontFamily: '"DM Sans", sans-serif', color: "#ffffff", outline: "none" }}
        />
        <input
          type="password"
          placeholder="Adgangskode"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#111827", borderRadius: 6, padding: "11px 12px", fontSize: 14, fontFamily: '"DM Sans", sans-serif', color: "#ffffff", outline: "none" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            border: "1px solid transparent",
            background: "#3b82f6",
            color: "#ffffff",
            borderRadius: 5,
            padding: "10px 14px",
            fontWeight: 500,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {loading ? "Logger ind..." : "Log ind"}
        </button>

        {error ? <p style={{ margin: 0, color: "#60a5fa", fontSize: 13 }}>{error}</p> : null}
      </form>
    </main>
  );
}
