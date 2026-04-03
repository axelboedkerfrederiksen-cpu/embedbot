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
