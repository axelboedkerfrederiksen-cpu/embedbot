"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [embedCode, setEmbedCode] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    name: "", website_url: "", industry: "", description: "",
    support_email: "", phone: "", address: "", city: "",
    hours_weekday: "", hours_saturday: "", hours_sunday: "",
    response_time: "", fallback_action: "", complaint_action: "",
    products_services: "", delivery_time: "", return_policy: "", payment_methods: "",
    welcome_message: "", tone: "uformel", language: "dansk",
    faq: "", cvr: "", social_media: "", current_offers: "", warranty: "", size_guide: ""
  });

  const supabase = createClient();

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

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
    setLoading(true);
    setMessage("");

    await supabase.from("businesses").upsert({ id: user.id, ...form });

    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: form.website_url, business_id: user.id }),
    });

    const data = await res.json();

    if (data.success) {
      setEmbedCode(`<script src="https://embedbot1.vercel.app/widget.js?id=${user.id}"></script>`);
      setMessage(`✅ ${data.chunks} chunks indlæst!`);
      setStep(5);
    } else {
      setMessage("Noget gik galt — prøv igen.");
    }
    setLoading(false);
  }

  const input = (label: string, key: string, placeholder = "", required = false) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#333" }}>
        {label}{required && <span style={{ color: "red" }}> *</span>}
      </label>
      <input
        value={(form as any)[key]}
        onChange={e => update(key, e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, boxSizing: "border-box", fontSize: 14 }}
      />
    </div>
  );

  const textarea = (label: string, key: string, placeholder = "", required = false) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#333" }}>
        {label}{required && <span style={{ color: "red" }}> *</span>}
      </label>
      <textarea
        value={(form as any)[key]}
        onChange={e => update(key, e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, boxSizing: "border-box", fontSize: 14, resize: "vertical" }}
      />
    </div>
  );

  if (!user) {
    return (
      <main style={{ maxWidth: 400, margin: "100px auto", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>EmbedBot</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>AI kundeservice til din hjemmeside</p>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, marginBottom: 12, boxSizing: "border-box" }} />
        <input placeholder="Adgangskode" type="password" value={password} onChange={e => setPassword(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, marginBottom: 12, boxSizing: "border-box" }} />
        <button onClick={handleAuth} disabled={loading}
          style={{ width: "100%", padding: 12, background: "#000", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>
          {loading ? "Indlæser..." : isLogin ? "Log ind" : "Opret konto"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, color: "#666", cursor: "pointer" }} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Har du ikke en konto? Opret en" : "Har du allerede en konto? Log ind"}
        </p>
        {message && <p style={{ color: "red", marginTop: 12, textAlign: "center" }}>{message}</p>}
      </main>
    );
  }

  const sections: Record<number, JSX.Element> = {
    1: (
      <div>
        <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>1. Virksomhed</h2>
        {input("Virksomhedsnavn", "name", "fx Modebutikken ApS", true)}
        {input("Hjemmeside URL", "website_url", "https://...", true)}
        {input("Branche", "industry", "fx webshop, restaurant, klinik", true)}
        {textarea("Kort beskrivelse", "description", "Beskriv kort hvad I tilbyder...", true)}
      </div>
    ),
    2: (
      <div>
        <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>2. Kontakt & Åbningstider</h2>
        {input("Email til kundeservice", "support_email", "support@...", true)}
        {input("Telefonnummer", "phone", "fx +45 12 34 56 78", true)}
        {input("Adresse", "address", "fx Vestergade 12")}
        {input("By / postnummer", "city", "fx 2000 Frederiksberg")}
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "16px 0 8px" }}>Åbningstider</h3>
        {input("Mandag–fredag", "hours_weekday", "fx 9:00–17:00", true)}
        {input("Lørdag", "hours_saturday", "fx 10:00–14:00 eller Lukket")}
        {input("Søndag", "hours_sunday", "fx Lukket")}
      </div>
    ),
    3: (
      <div>
        <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>3. Support & Produkter</h2>
        {input("Forventet svartid", "response_time", "fx Inden for 24 timer", true)}
        {textarea("Hvad gør botten hvis den ikke kan hjælpe?", "fallback_action", "fx Henvis til telefon og email", true)}
        {textarea("Hvad gør botten ved klager?", "complaint_action", "fx Henvis altid til telefon ved klager", true)}
        {textarea("Hvad sælger/tilbyder I?", "products_services", "Beskriv jeres produkter eller services...", true)}
        {input("Leveringstid", "delivery_time", "fx 2-4 hverdage")}
        {textarea("Returpolitik", "return_policy", "fx 30 dages returret...")}
        {input("Betalingsmetoder", "payment_methods", "fx Visa, MobilePay, Klarna")}
      </div>
    ),
    4: (
      <div>
        <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>4. Chatbot & FAQ</h2>
        {input("Velkomstbesked", "welcome_message", "fx Hej! Hvordan kan jeg hjælpe dig i dag? 😊", true)}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#333" }}>Tone *</label>
          <select value={form.tone} onChange={e => update("tone", e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }}>
            <option value="uformel">Uformel og venlig</option>
            <option value="formel">Formel og professionel</option>
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#333" }}>Sprog *</label>
          <select value={form.language} onChange={e => update("language", e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }}>
            <option value="dansk">Dansk</option>
            <option value="engelsk">Engelsk</option>
            <option value="begge">Begge</option>
          </select>
        </div>
        {textarea("FAQ – 5 mest stillede spørgsmål + svar", "faq", "Q: Hvad er jeres returpolitik?\nA: 30 dages returret...")}
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "16px 0 8px" }}>Valgfrit</h3>
        {input("CVR nummer", "cvr", "fx 12345678")}
        {input("Sociale medier", "social_media", "fx instagram.com/jeresfirma")}
        {textarea("Aktuelle tilbud / rabatkoder", "current_offers", "fx 10% rabat med koden SOMMER24")}
        {input("Garantiperiode", "warranty", "fx 2 års garanti på alle produkter")}
        {input("Link til størrelsesguide", "size_guide", "https://...")}
      </div>
    ),
  };

  if (step === 5) {
    return (
      <main style={{ maxWidth: 600, margin: "60px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>🎉 Din chatbot er klar!</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>Paste denne linje ind på din hjemmeside:</p>
        <code style={{ display: "block", background: "#000", color: "#00ff00", padding: 16, borderRadius: 8, fontSize: 13, wordBreak: "break-all" }}>
          {embedCode}
        </code>
        <button onClick={() => navigator.clipboard.writeText(embedCode)}
          style={{ marginTop: 12, padding: "10px 20px", background: "#000", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Kopier kode
        </button>
        {message && <p style={{ marginTop: 16, color: "green" }}>{message}</p>}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 600, margin: "60px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: "bold" }}>Opsæt din chatbot</h1>
        <span style={{ color: "#666", fontSize: 14 }}>Trin {step} af 4</span>
      </div>

      <div style={{ background: "#f9f9f9", padding: 24, borderRadius: 12, marginBottom: 24 }}>
        {sections[step]}
      </div>

      {message && <p style={{ color: "red", marginBottom: 16 }}>{message}</p>}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)}
            style={{ padding: "12px 24px", background: "#fff", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>
            ← Tilbage
          </button>
        )}
        {step < 4 ? (
          <button onClick={() => setStep(s => s + 1)}
            style={{ marginLeft: "auto", padding: "12px 24px", background: "#000", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>
            Næste →
          </button>
        ) : (
          <button onClick={handleSetup} disabled={loading}
            style={{ marginLeft: "auto", padding: "12px 24px", background: "#000", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>
            {loading ? "Genererer chatbot..." : "Generer chatbot 🚀"}
          </button>
        )}
      </div>
    </main>
  );
}