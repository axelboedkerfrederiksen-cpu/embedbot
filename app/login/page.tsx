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
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted && data.user) {
        router.replace("/dashboard");
      }
    });

    return () => {
      mounted = false;
    };
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

    router.push("/dashboard");
  }

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "16px" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #e8e8e8",
          borderRadius: 14,
          padding: 20,
          display: "grid",
          gap: 10,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28 }}>Log ind</h1>
        <p style={{ margin: 0, color: "#555" }}>Fortsat til dit dashboard.</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ border: "1px solid #d8d8d8", borderRadius: 10, padding: "11px 12px", fontSize: 14 }}
        />
        <input
          type="password"
          placeholder="Adgangskode"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ border: "1px solid #d8d8d8", borderRadius: 10, padding: "11px 12px", fontSize: 14 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            borderRadius: 999,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Logger ind..." : "Log ind"}
        </button>

        {error ? <p style={{ margin: 0, color: "#b00020" }}>{error}</p> : null}
      </form>
    </main>
  );
}
