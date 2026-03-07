"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

const ONBOARDING_BUSINESS_ID_KEY = "onboarding_business_id";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [embedCode, setEmbedCode] = useState("");
  const [message, setMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [step, setStep] = useState(1);
  const [businessId, setBusinessId] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const embedCodeRef = useRef<HTMLElement | null>(null);

  const [form, setForm] = useState({
    name: "", website_url: "", industry: "", description: "",
    support_email: "", phone: "", address: "", city: "",
    hours_weekday: "", hours_saturday: "", hours_sunday: "",
    response_time: "", fallback_action: "", complaint_action: "",
    products_services: "", delivery_time: "", return_policy: "", payment_methods: "",
    welcome_message: "", tone: "uformel", language: "dansk",
    faq: "", cvr: "", social_media: "", current_offers: "", warranty: "", size_guide: "",
    primary_color: "#000000", secondary_color: "#f1f1f1", chat_icon_color: "#000000",
    font_choice: "DM Sans", logo_data_url: "", logo_file_name: ""
  });

  const [supabase] = useState(() => createClient());

  function getStoredBusinessId() {
    if (typeof window === "undefined") {
      return "";
    }

    try {
      return localStorage.getItem(ONBOARDING_BUSINESS_ID_KEY) || "";
    } catch {
      return "";
    }
  }

  function persistBusinessId(id: string) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(ONBOARDING_BUSINESS_ID_KEY, id);
    } catch {
      // Ignore storage failures (e.g. restricted browser settings).
    }
  }

  function clearPersistedBusinessId() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.removeItem(ONBOARDING_BUSINESS_ID_KEY);
    } catch {
      // Ignore storage failures (e.g. restricted browser settings).
    }
  }

  function generateBusinessId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `biz-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function ensureBusinessId() {
    const existingId = businessId || getStoredBusinessId();

    if (existingId) {
      if (!businessId) {
        setBusinessId(existingId);
      }

      return existingId;
    }

    const newBusinessId = generateBusinessId();
    persistBusinessId(newBusinessId);
    setBusinessId(newBusinessId);
    return newBusinessId;
  }

  function isOnConflictConstraintError(errorMessage: string) {
    return errorMessage.toLowerCase().includes("no unique or exclusion constraint matching the on conflict specification");
  }

  async function persistBusinessPayload(payload: Record<string, unknown> & { id: string }) {
    const { error } = await supabase
      .from("businesses")
      .upsert(payload, { onConflict: "id" });

    if (!error || !isOnConflictConstraintError(error.message)) {
      return { error };
    }

    const { data: existingRows, error: findError } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", payload.id)
      .limit(1);

    if (findError) {
      return { error: findError };
    }

    if (existingRows && existingRows.length > 0) {
      const updateResult = await supabase
        .from("businesses")
        .update(payload)
        .eq("id", payload.id);

      return { error: updateResult.error };
    }

    const insertResult = await supabase
      .from("businesses")
      .insert(payload);

    return { error: insertResult.error };
  }

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted || !data.user) {
        return;
      }

      setUser(data.user);

      const storedBusinessId = getStoredBusinessId();
      if (storedBusinessId) {
        setBusinessId(storedBusinessId);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const previewFontFamily: Record<string, string> = {
    "DM Sans": '"DM Sans", sans-serif',
    Inter: '"Inter", sans-serif',
    Poppins: '"Poppins", sans-serif',
    Lora: '"Lora", serif',
  };

  function handleLogoUpload(file: File | null) {
    if (!file) {
      update("logo_data_url", "");
      update("logo_file_name", "");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        update("logo_data_url", reader.result);
        update("logo_file_name", file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  function formatSetupError(error: unknown) {
    if (!(error instanceof Error)) {
      return "Noget gik galt under genereringen af chatbotten. Prøv igen.";
    }

    if (error.message === "Failed to fetch") {
      return "Kunne ikke kontakte serveren. Tjek din internetforbindelse og prøv igen om et øjeblik.";
    }

    return error.message;
  }

  async function handleAuth() {
    setLoading(true);
    setMessage("");
    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else {
        setUser(data.user);
        const storedBusinessId = getStoredBusinessId();
        if (storedBusinessId) {
          setBusinessId(storedBusinessId);
        }
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage("Tjek din email for at bekræfte din konto!");
    }
    setLoading(false);
  }

  async function saveBusinessDraft() {
    const stableBusinessId = ensureBusinessId();

    if (!stableBusinessId) {
      throw new Error("Mangler businessId. Log ind igen og prøv på ny.");
    }

    const fullPayload = {
      id: stableBusinessId,
      ...form,
    };

    let { error } = await persistBusinessPayload(fullPayload);

    // Fallback for databases that do not yet include newer branding columns.
    if (error && error.message.toLowerCase().includes("column")) {
      const safePayload = {
        id: stableBusinessId,
        name: form.name,
        website_url: form.website_url,
        industry: form.industry,
        description: form.description,
        support_email: form.support_email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        hours_weekday: form.hours_weekday,
        hours_saturday: form.hours_saturday,
        hours_sunday: form.hours_sunday,
        response_time: form.response_time,
        fallback_action: form.fallback_action,
        complaint_action: form.complaint_action,
        products_services: form.products_services,
        delivery_time: form.delivery_time,
        return_policy: form.return_policy,
        payment_methods: form.payment_methods,
        welcome_message: form.welcome_message,
        tone: form.tone,
        language: form.language,
        faq: form.faq,
        cvr: form.cvr,
        social_media: form.social_media,
        current_offers: form.current_offers,
        warranty: form.warranty,
        size_guide: form.size_guide,
      };

      const retry = await persistBusinessPayload(safePayload);
      error = retry.error;
    }

    if (error) {
      throw new Error(`Kunne ikke gemme kladde: ${error.message}`);
    }

    persistBusinessId(stableBusinessId);
  }

  async function handleNextStep() {
    setMessage("");
    setSavingDraft(true);

    try {
      await saveBusinessDraft();
      setStep(s => Math.min(s + 1, 5));
    } catch (error) {
      setMessage(formatSetupError(error));
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSetup() {
    setLoading(true);
    setMessage("");
    setCopyMessage("");

    try {
      const stableBusinessId = ensureBusinessId();

      if (!stableBusinessId) {
        throw new Error("Mangler businessId. Log ind igen og prøv på ny.");
      }

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, business_id: stableBusinessId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Noget gik galt.");
      }

      clearPersistedBusinessId();
      setBusinessId("");
      setStep(6);
    } catch (error) {
      setMessage(formatSetupError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyEmbedCode() {
    const textToCopy = embedCodeRef.current?.textContent || embedCode;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const tempInput = document.createElement("textarea");
        tempInput.value = textToCopy;
        tempInput.setAttribute("readonly", "true");
        tempInput.style.position = "absolute";
        tempInput.style.left = "-9999px";
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }

      setCopyMessage("Koden er kopieret til udklipsholderen.");
    } catch {
      setCopyMessage("Kunne ikke kopiere koden automatisk. Marker hele linjen og kopiér den manuelt.");
    }
  }

  const input = (label: string, key: string, placeholder = "", required = false) => (
    <div className="field">
      <label className="field-label">
        {label}{required && <span className="required"> *</span>}
      </label>
      <input
        value={(form as any)[key]}
        onChange={e => update(key, e.target.value)}
        placeholder={placeholder}
        className="field-input"
      />
    </div>
  );

  const textarea = (label: string, key: string, placeholder = "", required = false) => (
    <div className="field">
      <label className="field-label">
        {label}{required && <span className="required"> *</span>}
      </label>
      <textarea
        value={(form as any)[key]}
        onChange={e => update(key, e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="field-input field-textarea"
      />
    </div>
  );

  const styles = (
    <style jsx global>{`
      @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;700&family=Poppins:wght@400;500;700&family=Lora:wght@400;600;700&display=swap");

      .eb-page {
        min-height: 100vh;
        background: #f5f5f5;
        padding: 28px 16px;
        font-family: "DM Sans", sans-serif;
        color: #000;
      }

      .eb-shell {
        width: 100%;
        max-width: 640px;
        margin: 0 auto;
      }

      .eb-auth-shell {
        width: 100%;
        max-width: 440px;
        margin: 6vh auto 0;
      }

      .eb-card {
        background: #fff;
        border: 1px solid #e7e7e7;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
      }

      .eb-animate {
        animation: eb-fade-up 350ms ease-out;
      }

      .brand {
        font-family: "DM Serif Display", serif;
        letter-spacing: 0.4px;
        line-height: 1.05;
        margin: 0;
      }

      .brand-auth {
        font-size: clamp(2rem, 7vw, 2.4rem);
        text-align: center;
        margin-bottom: 6px;
      }

      .brand-main {
        font-size: clamp(1.7rem, 5vw, 2.1rem);
      }

      .muted {
        color: #666;
      }

      .tagline {
        text-align: center;
        color: #666;
        margin: 0 0 24px;
      }

      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 12px;
        margin-bottom: 14px;
      }

      .step-note {
        font-size: 13px;
        color: #666;
        font-weight: 500;
      }

      .progress-track {
        width: 100%;
        height: 8px;
        border-radius: 999px;
        background: #e8e8e8;
        overflow: hidden;
        margin-bottom: 20px;
      }

      .progress-fill {
        height: 100%;
        border-radius: inherit;
        background: #000;
        transition: width 260ms ease;
      }

      .section-title {
        margin: 0 0 18px;
        font-family: "DM Serif Display", serif;
        font-size: clamp(1.35rem, 4vw, 1.65rem);
        line-height: 1.2;
      }

      .subsection-title {
        font-size: 0.96rem;
        font-weight: 700;
        margin: 18px 0 10px;
      }

      .field {
        margin-bottom: 12px;
      }

      .field-label {
        display: block;
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 6px;
      }

      .required {
        color: #000;
      }

      .field-input {
        width: 100%;
        background: #fff;
        border: 1px solid #d9d9d9;
        border-radius: 10px;
        padding: 11px 12px;
        font-family: "DM Sans", sans-serif;
        font-size: 14px;
        box-sizing: border-box;
        transition: border-color 150ms ease, box-shadow 150ms ease;
        color: #000;
      }

      .field-input::placeholder {
        color: #999;
      }

      .field-input:focus {
        outline: none;
        border-color: #000;
        box-shadow: 0 0 0 1px #000;
      }

      .field-textarea {
        resize: vertical;
        min-height: 92px;
      }

      .color-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .color-swatch-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .color-input {
        width: 46px;
        height: 38px;
        border: 1px solid #d9d9d9;
        border-radius: 10px;
        background: #fff;
        padding: 2px;
        cursor: pointer;
      }

      .color-text {
        flex: 1;
      }

      .logo-preview {
        margin-top: 10px;
        border: 1px dashed #d0d0d0;
        border-radius: 10px;
        padding: 10px;
        background: #fafafa;
      }

      .logo-preview img {
        display: block;
        max-height: 56px;
        width: auto;
        max-width: 180px;
      }

      .font-preview {
        margin-top: 8px;
        font-size: 14px;
        color: #444;
      }

      .actions {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }

      .btn {
        border-radius: 10px;
        border: 1px solid #000;
        padding: 11px 20px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 160ms ease, background-color 160ms ease, color 160ms ease, opacity 160ms ease;
        font-family: "DM Sans", sans-serif;
      }

      .btn:hover {
        transform: translateY(-1px);
      }

      .btn:disabled {
        cursor: not-allowed;
        opacity: 0.6;
        transform: none;
      }

      .btn-primary {
        background: #000;
        color: #fff;
      }

      .btn-primary:hover {
        background: #111;
      }

      .btn-secondary {
        background: #fff;
        color: #000;
        border-color: #d0d0d0;
      }

      .btn-secondary:hover {
        border-color: #000;
      }

      .btn-full {
        width: 100%;
      }

      .message-error {
        color: #b00020;
        margin: 12px 0 0;
        font-size: 14px;
      }

      .toggle-auth {
        margin: 14px 0 0;
        text-align: center;
        color: #666;
        font-size: 14px;
        cursor: pointer;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      .thanks-wrap {
        text-align: center;
        padding: 38px 22px;
      }

      .checkmark {
        width: 68px;
        height: 68px;
        margin: 0 auto 16px;
        border-radius: 999px;
        border: 2px solid #000;
        display: grid;
        place-items: center;
        font-size: 34px;
        line-height: 1;
      }

      .thanks-title {
        margin: 0 0 10px;
        font-size: clamp(1.6rem, 5vw, 2rem);
      }

      .thanks-text {
        margin: 0;
        color: #666;
        max-width: 520px;
        margin-inline: auto;
      }

      @keyframes eb-fade-up {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 640px) {
        .eb-card {
          padding: 18px;
          border-radius: 14px;
        }

        .header-row {
          align-items: center;
        }

        .btn {
          padding: 10px 16px;
        }

        .color-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );

  if (!user) {
    return (
      <main className="eb-page">
        {styles}
        <div className="eb-auth-shell">
          <div className="eb-card eb-animate">
            <h1 className="brand brand-auth">EmbedBot</h1>
            <p className="tagline">AI kundeservice til din hjemmeside</p>
            <div className="field">
              <input
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="field-input"
              />
            </div>
            <div className="field">
              <input
                placeholder="Adgangskode"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field-input"
              />
            </div>
            <button onClick={handleAuth} disabled={loading} className="btn btn-primary btn-full">
              {loading ? "Indlæser..." : isLogin ? "Log ind" : "Opret konto"}
            </button>
            <p className="toggle-auth" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Har du ikke en konto? Opret en" : "Har du allerede en konto? Log ind"}
            </p>
            {message && <p className="message-error">{message}</p>}
          </div>
        </div>
      </main>
    );
  }

  const sections: Record<number, React.ReactElement> = {
    1: (
      <div>
        <h2 className="section-title">1. Virksomhed</h2>
        {input("Virksomhedsnavn", "name", "fx Modebutikken ApS", true)}
        {input("Hjemmeside URL", "website_url", "https://...", true)}
        {input("Branche", "industry", "fx webshop, restaurant, klinik", true)}
        {textarea("Kort beskrivelse", "description", "Beskriv kort hvad I tilbyder...", true)}
      </div>
    ),
    2: (
      <div>
        <h2 className="section-title">2. Kontakt & Åbningstider</h2>
        {input("Email til kundeservice", "support_email", "support@...", true)}
        {input("Telefonnummer", "phone", "fx +45 12 34 56 78", true)}
        {input("Adresse", "address", "fx Vestergade 12")}
        {input("By / postnummer", "city", "fx 2000 Frederiksberg")}
        <h3 className="subsection-title">Åbningstider</h3>
        {input("Mandag–fredag", "hours_weekday", "fx 9:00–17:00", true)}
        {input("Lørdag", "hours_saturday", "fx 10:00–14:00 eller Lukket")}
        {input("Søndag", "hours_sunday", "fx Lukket")}
      </div>
    ),
    3: (
      <div>
        <h2 className="section-title">3. Support & Produkter</h2>
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
        <h2 className="section-title">4. Chatbot & FAQ</h2>
        {input("Velkomstbesked", "welcome_message", "fx Hej! Hvordan kan jeg hjælpe dig i dag? 😊", true)}
        <div className="field">
          <label className="field-label">Tone *</label>
          <select value={form.tone} onChange={e => update("tone", e.target.value)}
            className="field-input">
            <option value="uformel">Uformel og venlig</option>
            <option value="formel">Formel og professionel</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">Sprog *</label>
          <select value={form.language} onChange={e => update("language", e.target.value)}
            className="field-input">
            <option value="dansk">Dansk</option>
            <option value="engelsk">Engelsk</option>
            <option value="begge">Begge</option>
          </select>
        </div>
        {textarea("FAQ – 5 mest stillede spørgsmål + svar", "faq", "Q: Hvad er jeres returpolitik?\nA: 30 dages returret...")}
        <h3 className="subsection-title">Valgfrit</h3>
        {input("CVR nummer", "cvr", "fx 12345678")}
        {input("Sociale medier", "social_media", "fx instagram.com/jeresfirma")}
        {textarea("Aktuelle tilbud / rabatkoder", "current_offers", "fx 10% rabat med koden SOMMER24")}
        {input("Garantiperiode", "warranty", "fx 2 års garanti på alle produkter")}
        {input("Link til størrelsesguide", "size_guide", "https://...")}
      </div>
    ),
    5: (
      <div>
        <h2 className="section-title">5. Design & Branding</h2>
        <div className="color-grid">
          <div className="field">
            <label className="field-label">🎨 Primærfarve *</label>
            <div className="color-swatch-wrap">
              <input
                type="color"
                value={form.primary_color}
                onChange={e => update("primary_color", e.target.value)}
                className="color-input"
              />
              <input
                value={form.primary_color}
                onChange={e => update("primary_color", e.target.value)}
                className="field-input color-text"
                placeholder="#000000"
              />
            </div>
            <p className="font-preview">Bruges til chat-header + send-knap.</p>
          </div>

          <div className="field">
            <label className="field-label">🎨 Sekundærfarve *</label>
            <div className="color-swatch-wrap">
              <input
                type="color"
                value={form.secondary_color}
                onChange={e => update("secondary_color", e.target.value)}
                className="color-input"
              />
              <input
                value={form.secondary_color}
                onChange={e => update("secondary_color", e.target.value)}
                className="field-input color-text"
                placeholder="#f1f1f1"
              />
            </div>
            <p className="font-preview">Bruges til brugerens beskedbobler.</p>
          </div>
        </div>

        <div className="field">
          <label className="field-label">💬 Chat-ikon farve *</label>
          <div className="color-swatch-wrap">
            <input
              type="color"
              value={form.chat_icon_color}
              onChange={e => update("chat_icon_color", e.target.value)}
              className="color-input"
            />
            <input
              value={form.chat_icon_color}
              onChange={e => update("chat_icon_color", e.target.value)}
              className="field-input color-text"
              placeholder="#000000"
            />
          </div>
          <p className="font-preview">Farven på FAB-knappen i hjørnet.</p>
        </div>

        <div className="field">
          <label className="field-label">🖼️ Logo upload</label>
          <input
            type="file"
            accept="image/*"
            className="field-input"
            onChange={e => handleLogoUpload(e.target.files?.[0] || null)}
          />
          {form.logo_file_name && <p className="font-preview">Valgt fil: {form.logo_file_name}</p>}
          {form.logo_data_url && (
            <div className="logo-preview">
              <img src={form.logo_data_url} alt="Logo preview" />
            </div>
          )}
        </div>

        <div className="field">
          <label className="field-label">🔤 Font valg *</label>
          <select
            value={form.font_choice}
            onChange={e => update("font_choice", e.target.value)}
            className="field-input"
          >
            <option value="DM Sans">DM Sans</option>
            <option value="Inter">Inter</option>
            <option value="Poppins">Poppins</option>
            <option value="Lora">Lora</option>
          </select>
          <p className="font-preview" style={{ fontFamily: previewFontFamily[form.font_choice] || '"DM Sans", sans-serif' }}>
            Preview: Sådan kan teksten se ud i chatten.
          </p>
        </div>
      </div>
    ),
  };

  if (step === 6) {
    return (
      <main className="eb-page">
        {styles}
        <div className="eb-shell">
          <div className="eb-card eb-animate thanks-wrap">
            <div className="checkmark">✓</div>
            <h1 className="brand thanks-title">Tak for din ordre!</h1>
            <p className="thanks-text">Din chatbot er i gang med at blive behandlet. Vi vender tilbage inden for 24 timer med dit embed script.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="eb-page">
      {styles}
      <div className="eb-shell eb-animate">
        <div className="header-row">
          <h1 className="brand brand-main">Opsæt din chatbot</h1>
          <span className="step-note">Trin {step} af 5</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(Math.min(step, 5) / 5) * 100}%` }} />
        </div>

        <div className="eb-card">{sections[step]}</div>

        {message && <p className="message-error">{message}</p>}

        <div className="actions" style={{ marginTop: 20 }}>
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="btn btn-secondary">
            ← Tilbage
          </button>
        )}
        {step < 5 ? (
          <button onClick={handleNextStep} disabled={savingDraft || loading} className="btn btn-primary" style={{ marginLeft: "auto" }}>
            {savingDraft ? "Gemmer..." : "Næste →"}
          </button>
        ) : (
          <button onClick={handleSetup} disabled={loading} className="btn btn-primary" style={{ marginLeft: "auto" }}>
            {loading ? "Genererer chatbot..." : "Generer chatbot 🚀"}
          </button>
        )}
        </div>
      </div>
    </main>
  );
}