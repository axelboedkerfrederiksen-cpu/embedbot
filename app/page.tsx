"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [url, setUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [embedCode, setEmbedCode] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  async function handleAuth() {
    setLoading(true);
    setMessage("");
    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else setUser(data.user);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage("Tjek din email for at bekræfte din konto!");
    }
    setLoading(false);
  }

  async function handleSetup() {
    if (!url || !businessName) return;
    setLoading(true);
    setMessage("");

    // Gem virksomhed i databasen
    await supabase.from("businesses").upsert({
      id: user.id,
      name: businessName,
      website_url: url,
    });

    // Kør ingestion
    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, business_id: user.id }),
    });

    const data = await res.json();

    if (data.success) {
      setEmbedCode(
        `<script src="https://ditdomæne.dk/widget.js?id=${user.id}"></script>`
      );
      setMessage(`✅ ${data.chunks} chunks indlæst fra din hjemmeside!`);
    } else {
      setMessage("Noget gik galt — prøv igen.");
    }

    setLoading(false);
  }

  if (!user) {
    return (
      <main style={{ maxWidth: 400, margin: "100px auto", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>EmbedBot</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>AI kundeservice til din hjemmeside</p>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, marginBottom: 12, boxSizing: "border-box" }}
        />
        <input
          placeholder="Adgangskode"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, marginBottom: 12, boxSizing: "border-box" }}
        />
        <button
          onClick={handleAuth}
          disabled={loading}
          style={{ width: "100%", padding: "12px", background: "#000", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}
        >
          {loading ? "Indlæser..." : isLogin ? "Log ind" : "Opret konto"}
        </button>

        <p style={{ textAlign: "center", marginTop: 16, color: "#666", cursor: "pointer" }} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Har du ikke en konto? Opret en" : "Har du allerede en konto? Log ind"}
        </p>
        {message && <p style={{ color: "red", marginTop: 12, textAlign: "center" }}>{message}</p>}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 600, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>EmbedBot Dashboard</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Velkommen, {user.email}</p>

      <div style={{ background: "#f9f9f9", padding: 24, borderRadius: 12, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>Opsæt din chatbot</h2>
        <input
          placeholder="Virksomhedens navn"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, marginBottom: 12, boxSizing: "border-box" }}
        />
        <input
          placeholder="Din hjemmeside URL (https://...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, marginBottom: 12, boxSizing: "border-box" }}
        />
        <button
          onClick={handleSetup}
          disabled={loading}
          style={{ width: "100%", padding: "12px", background: "#000", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}
        >
          {loading ? "Indlæser hjemmeside..." : "Generer chatbot"}
        </button>
      </div>

      {message && <p style={{ marginBottom: 16, color: message.startsWith("✅") ? "green" : "red" }}>{message}</p>}

      {embedCode && (
        <div style={{ background: "#f0f0f0", padding: 24, borderRadius: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>Dit embed script</h2>
          <p style={{ color: "#666", marginBottom: 12 }}>Paste denne linje ind på din hjemmeside:</p>
          <code style={{ display: "block", background: "#000", color: "#00ff00", padding: 16, borderRadius: 8, fontSize: 13, wordBreak: "break-all" }}>
            {embedCode}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(embedCode)}
            style={{ marginTop: 12, padding: "8px 16px", background: "#000", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Kopier kode
          </button>
        </div>
      )}
    </main>
  );
}