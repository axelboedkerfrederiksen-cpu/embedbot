"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const ONBOARDING_BUSINESS_ID_KEY = "onboarding_business_id";

const GENERATING_MESSAGES = [
  "Analyserer din virksomhed...",
  "Konfigurerer AI-modellen...",
  "Tilpasser chatbottens tone...",
  "Opsætter supportflows...",
  "Designer brugergrænsefladen...",
  "Næsten klar...",
];

const SETUP_GUIDE_PDF_PATH = "/EmbedBot_Installationsguide.pdf";

export default function Home() {
  type SetupUser = { id: string; email?: string | null } | null;

  const initialForm = {
    name: "", website_url: "", industry: "", description: "",
    support_email: "", phone: "", address: "", city: "",
    hours_weekday: "", hours_saturday: "", hours_sunday: "",
    response_time: "", fallback_action: "", complaint_action: "",
    products_services: "", delivery_time: "", return_policy: "", payment_methods: "",
    welcome_message: "", tone: "uformel", language: "dansk",
    custom_instructions: "",
    faq: "", cvr: "", social_media: "", current_offers: "", warranty: "", size_guide: "",
    primary_color: "#ffffff", secondary_color: "#f6f3ed", chat_icon_color: "#ffffff",
    font_choice: "Poppins", logo_data_url: "", logo_file_name: ""
  };
  type FormState = typeof initialForm;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState<SetupUser>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(1);
  const [businessId, setBusinessId] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [generatingPhase, setGeneratingPhase] = useState(0);
  const [stepDirection, setStepDirection] = useState<"forward" | "backward">("forward");

  const [form, setForm] = useState<FormState>(initialForm);

  const [supabase] = useState(() => createClient());

  function getStoredBusinessId() {
    if (typeof window === "undefined") {
      return "";
    }

    try {
      return (localStorage.getItem(ONBOARDING_BUSINESS_ID_KEY) || "").trim();
    } catch {
      return "";
    }
  }

  function persistBusinessId(id: string) {
    if (typeof window === "undefined") {
      return;
    }

    const normalizedId = id.trim();
    if (!normalizedId) {
      return;
    }

    try {
      localStorage.setItem(ONBOARDING_BUSINESS_ID_KEY, normalizedId);
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

  function createBusinessId() {
    if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
      throw new Error("Browseren understøtter ikke crypto.randomUUID().");
    }

    return crypto.randomUUID();
  }

  function resetBusinessIdForStepOne() {
    const freshBusinessId = createBusinessId();
    clearPersistedBusinessId();
    setBusinessId(freshBusinessId);
    persistBusinessId(freshBusinessId);
    return freshBusinessId;
  }

  function resolveOrCreateOnboardingBusinessId() {
    const inMemoryId = (businessId || "").trim();
    if (inMemoryId) {
      persistBusinessId(inMemoryId);
      return inMemoryId;
    }

    const activeStoredId = getStoredBusinessId();
    if (activeStoredId) {
      setBusinessId(activeStoredId);
      return activeStoredId;
    }

    const generatedId = createBusinessId();
    setBusinessId(generatedId);
    persistBusinessId(generatedId);
    return generatedId;
  }

  function startNewOnboardingSessionFromFrontpage() {
    setStep(1);
    return resetBusinessIdForStepOne();
  }

  function ensureBusinessId() {
    return resolveOrCreateOnboardingBusinessId();
  }

  function ensureDatabaseBusinessId() {
    if (!user?.id || typeof user.id !== "string") {
      throw new Error("Mangler bruger-id. Log ind igen og prøv på ny.");
    }

    const resolvedId = resolveOrCreateOnboardingBusinessId();
    if (!resolvedId) {
      throw new Error("Mangler businessId. Log ind igen og prøv på ny.");
    }

    return resolvedId;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") !== "true") return;

    try {
      localStorage.removeItem("embedbot_embed_code");
    } catch {}

    const storedId = getStoredBusinessId();
    if (storedId) {
      setBusinessId(storedId);
      clearPersistedBusinessId();
    }

    setStep(7);
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted || !data.user) {
        return;
      }

      setUser(data.user);
      resolveOrCreateOnboardingBusinessId();
    });

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!user || step !== 1) {
      return;
    }

    // Every arrival at step 1 starts a new onboarding session ID.
    resetBusinessIdForStepOne();
  }, [user, step]);

  useEffect(() => {
    if (!loading) {
      setGeneratingPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setGeneratingPhase(p => p + 1);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  const update = (key: keyof FormState, value: string) => setForm(f => ({ ...f, [key]: value }));

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
        startNewOnboardingSessionFromFrontpage();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage("Tjek din email for at bekræfte din konto!");
    }
    setLoading(false);
  }

  async function saveBusinessDraft() {
    const stableBusinessId = ensureDatabaseBusinessId();

    if (!stableBusinessId) {
      throw new Error("Mangler businessId. Log ind igen og prøv på ny.");
    }

    const res = await fetch("/api/business-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form, business_id: stableBusinessId }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(`Kunne ikke gemme kladde: ${data.error || "Ukendt fejl."}`);
    }

    persistBusinessId(stableBusinessId);
  }

  async function handleNextStep() {
    setMessage("");
    setSavingDraft(true);
    setStepDirection("forward");

    try {
      await saveBusinessDraft();
      setStep(s => Math.min(s + 1, 6));
    } catch (error) {
      setMessage(formatSetupError(error));
    } finally {
      setSavingDraft(false);
    }
  }

  function handlePrevStep() {
    setStepDirection("backward");
    setStep(s => s - 1);
  }

  async function handleSetup() {
    setLoading(true);
    setMessage("");

    try {
      const stableBusinessId = ensureDatabaseBusinessId();

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

      persistBusinessId(stableBusinessId);
      window.location.href = "https://buy.stripe.com/eVq00j5l7gew3dj3rIf3a02?locale=da";
    } catch (error) {
      setMessage(formatSetupError(error));
    } finally {
      setLoading(false);
    }
  }

  const input = (label: string, key: keyof FormState, placeholder = "", required = false) => (
    <div className="field">
      <label className="field-label">
        {label}{required && <span className="required"> *</span>}
      </label>
      <input
        value={form[key]}
        onChange={e => update(key, e.target.value)}
        placeholder={placeholder}
        className="field-input"
      />
    </div>
  );

  const textarea = (label: string, key: keyof FormState, placeholder = "", required = false) => (
    <div className="field">
      <label className="field-label">
        {label}{required && <span className="required"> *</span>}
      </label>
      <textarea
        value={form[key]}
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
        background:
          radial-gradient(circle at 12% 18%, rgba(246, 243, 237, 0.92) 0%, rgba(246, 243, 237, 0) 24%),
          radial-gradient(circle at 88% 14%, rgba(246, 243, 237, 0.9) 0%, rgba(246, 243, 237, 0) 22%),
          linear-gradient(180deg, #ffffff 0%, #fcfaf6 55%, #f8f4ee 100%);
        padding: 28px 16px;
        font-family: "Poppins", sans-serif;
        color: #111111;
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
        background: rgba(255,255,255,0.94);
        border: 1px solid rgba(17,17,17,0.08);
        border-radius: 24px;
        padding: 28px;
        box-shadow: 0 20px 50px rgba(17,17,17,0.08);
        backdrop-filter: blur(10px);
      }

      .eb-animate {
        animation: eb-fade-up 350ms ease-out;
      }

      .brand {
        font-family: "Poppins", sans-serif;
        font-weight: 700;
        letter-spacing: -0.04em;
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
        color: #6b6258;
      }

      .tagline {
        text-align: center;
        color: #6b6258;
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
        color: #6b6258;
        font-weight: 500;
      }

      .progress-track {
        width: 100%;
        height: 4px;
        border-radius: 999px;
        background: rgba(17,17,17,0.08);
        overflow: hidden;
        margin-bottom: 20px;
      }

      .progress-fill {
        height: 100%;
        border-radius: inherit;
        background: #111111;
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
        color: #8a7e70;
      }

      .field-input {
        width: 100%;
        background: #ffffff;
        border: 1px solid rgba(17,17,17,0.1);
        border-radius: 14px;
        padding: 13px 14px;
        font-family: "Poppins", sans-serif;
        font-size: 14px;
        box-sizing: border-box;
        transition: border-color 150ms ease;
        color: #111111;
      }

      .field-input::placeholder {
        color: #8a7e70;
      }

      .field-input:focus {
        outline: none;
        border-color: rgba(17,17,17,0.22);
      }

      .field-textarea {
        resize: vertical;
        min-height: 92px;
      }

      .field-textarea-large {
        min-height: 260px;
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
        border: 1px solid rgba(17,17,17,0.1);
        border-radius: 10px;
        background: #ffffff;
        padding: 2px;
        cursor: pointer;
      }

      .color-text {
        flex: 1;
      }

      .logo-preview {
        margin-top: 10px;
        border: 1px dashed rgba(17,17,17,0.16);
        border-radius: 10px;
        padding: 10px;
        background: rgba(246,243,237,0.55);
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
        color: #6b6258;
      }

      .actions {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }

      .btn {
        border-radius: 999px;
        border: 1px solid rgba(17,17,17,0.08);
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 140ms, border-color 140ms, background 140ms, box-shadow 140ms;
        font-family: "Poppins", sans-serif;
      }

      .btn:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .btn:focus-visible {
        outline: 2px solid #111111;
        outline-offset: 3px;
      }

      .btn-primary {
        background: #ffffff;
        color: #111111;
        box-shadow: 0 12px 28px rgba(17,17,17,0.08);
      }

      .btn-primary:hover {
        background: #f8f4ee;
      }

      .btn-secondary {
        background: transparent;
        color: #111111;
        border-color: rgba(17,17,17,0.12);
      }

      .btn-secondary:hover {
        background: rgba(255,255,255,0.72);
        border-color: rgba(17,17,17,0.16);
      }

      .btn-full {
        width: 100%;
      }

      .message-error {
        color: #9b3d2f;
        margin: 12px 0 0;
        font-size: 14px;
      }

      .toggle-auth {
        margin: 14px 0 0;
        text-align: center;
        color: #6b6258;
        font-size: 14px;
        cursor: pointer;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      .thanks-wrap {
        text-align: center;
        padding: 38px 22px;
      }

      .success-stack {
        display: grid;
        gap: 14px;
      }

      .success-hero {
        position: relative;
        overflow: hidden;
        text-align: center;
        padding: 42px 30px 30px;
        border: 1px solid rgba(17,17,17,0.08);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.84),
          0 22px 54px rgba(17,17,17,0.09);
      }

      .success-hero::before {
        content: "";
        position: absolute;
        inset: -60% auto auto -18%;
        width: 230px;
        height: 230px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(246,243,237,0.95) 0%, rgba(246,243,237,0) 70%);
        pointer-events: none;
      }

      .success-hero::after {
        content: "";
        position: absolute;
        inset: auto -12% -52% auto;
        width: 280px;
        height: 280px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(246,243,237,0.92) 0%, rgba(246,243,237,0) 70%);
        pointer-events: none;
      }

      .success-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid rgba(17,17,17,0.1);
        background: rgba(255,255,255,0.9);
        padding: 7px 12px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #6b6258;
        margin: 0 auto 18px;
      }

      .checkmark-premium {
        margin: 0 auto 18px;
        width: 76px;
        height: 76px;
        border: 1.6px solid rgba(17,17,17,0.14);
        background: rgba(255,255,255,0.88);
        box-shadow: 0 14px 34px rgba(17,17,17,0.1);
      }

      .checkmark-premium span {
        display: inline-block;
        transform: translateY(-1px);
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-top: 14px;
        border: 1px solid rgba(17,17,17,0.1);
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 600;
        color: #111111;
        background: rgba(246,243,237,0.8);
      }

      .next-steps {
        margin-top: 20px;
        padding: 16px;
        border-radius: 16px;
        border: 1px solid rgba(17,17,17,0.08);
        background: rgba(255,255,255,0.72);
        text-align: left;
      }

      .next-steps-title {
        margin: 0 0 8px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #6b6258;
      }

      .next-steps-list {
        margin: 0;
        padding-left: 18px;
        color: #4d463f;
      }

      .next-steps-list li {
        margin: 0 0 6px;
        line-height: 1.5;
      }

      .next-steps-list li:last-child {
        margin-bottom: 0;
      }

      .success-actions {
        text-align: left;
        padding: 26px;
        box-shadow: 0 16px 40px rgba(17,17,17,0.08);
      }

      .success-actions-header {
        margin: 0 0 4px;
        font-family: "DM Serif Display", serif;
        font-size: clamp(1.3rem, 3.8vw, 1.6rem);
      }

      .success-actions-sub {
        margin: 0;
        color: #5f584f;
      }

      .success-cta-row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        margin-top: 18px;
      }

      .btn-primary-strong {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        text-decoration: none;
        padding: 13px 22px;
        background: #111111;
        border-color: #111111;
        color: #ffffff;
        box-shadow: 0 16px 34px rgba(17,17,17,0.16);
      }

      .btn-primary-strong:hover {
        background: #2b2722;
        border-color: #2b2722;
      }

      .btn-link-block {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        text-decoration: none;
      }

      .checkmark {
        width: 68px;
        height: 68px;
        margin: 0 auto 16px;
        border-radius: 999px;
        border: 2px solid rgba(17,17,17,0.14);
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
        color: #6b6258;
        max-width: 520px;
        margin-inline: auto;
      }

      .install-card {
        margin-top: 14px;
        text-align: center;
      }

      .install-intro {
        margin: -6px auto 0;
        max-width: 520px;
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

      /* ── Step slide transitions ── */
      .step-slide {
        animation: step-fwd-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .step-slide-forward {
        animation: step-fwd-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .step-slide-backward {
        animation: step-bwd-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      @keyframes step-fwd-in {
        from { opacity: 0; transform: translateX(28px); }
        to   { opacity: 1; transform: translateX(0); }
      }

      @keyframes step-bwd-in {
        from { opacity: 0; transform: translateX(-28px); }
        to   { opacity: 1; transform: translateX(0); }
      }

      /* ── Generation overlay ── */
      .gen-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background:
          radial-gradient(circle at 20% 20%, rgba(246,243,237,0.95) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(246,243,237,0.9) 0%, transparent 50%),
          linear-gradient(180deg, #ffffff 0%, #fcfaf6 55%, #f8f4ee 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        animation: gen-in 380ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      @keyframes gen-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      .gen-brand {
        position: absolute;
        top: 28px;
        font-family: "Poppins", sans-serif;
        font-weight: 700;
        font-size: 1.1rem;
        letter-spacing: -0.04em;
        color: rgba(17,17,17,0.18);
        pointer-events: none;
        animation: gen-brand-in 700ms 200ms both ease-out;
      }

      @keyframes gen-brand-in {
        from { opacity: 0; transform: translateY(-4px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .gen-orb-wrap {
        position: relative;
        width: 160px;
        height: 160px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .gen-ring {
        position: absolute;
        border-radius: 50%;
        border: 1.5px solid rgba(17,17,17,0.1);
        animation: gen-ring-pulse 2.6s ease-in-out infinite;
      }

      .gen-ring-1 {
        width: 160px; height: 160px;
        animation-delay: 0s;
      }
      .gen-ring-2 {
        width: 112px; height: 112px;
        animation-delay: 0.5s;
        border-color: rgba(17,17,17,0.14);
      }
      .gen-ring-3 {
        width: 68px; height: 68px;
        animation-delay: 1s;
        border-color: rgba(17,17,17,0.2);
      }

      @keyframes gen-ring-pulse {
        0%, 100% { transform: scale(1);    opacity: 0.35; }
        50%       { transform: scale(1.07); opacity: 1;    }
      }

      .gen-core {
        position: relative;
        width: 44px;
        height: 44px;
      }

      .gen-center-dot {
        position: absolute;
        top: 50%; left: 50%;
        width: 10px; height: 10px;
        background: #111111;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: gen-core-pulse 1.4s ease-in-out infinite;
        box-shadow: 0 0 0 0 rgba(17,17,17,0.15);
      }

      @keyframes gen-core-pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1);   box-shadow: 0 0 0 0 rgba(17,17,17,0.15); }
        50%       { transform: translate(-50%, -50%) scale(1.25); box-shadow: 0 0 0 8px rgba(17,17,17,0); }
      }

      .gen-dot {
        position: absolute;
        top: 50%; left: 50%;
        width: 6px; height: 6px;
        background: #111111;
        border-radius: 50%;
        margin: -3px 0 0 -3px;
      }

      .gen-dot-1 { animation: gen-orbit 2.2s linear infinite;        opacity: 0.7; }
      .gen-dot-2 { animation: gen-orbit 2.2s linear infinite -0.73s; opacity: 0.45; }
      .gen-dot-3 { animation: gen-orbit 2.2s linear infinite -1.47s; opacity: 0.25; }

      @keyframes gen-orbit {
        from { transform: rotate(0deg)   translateX(22px) rotate(0deg); }
        to   { transform: rotate(360deg) translateX(22px) rotate(-360deg); }
      }

      .gen-text-wrap {
        margin-top: 44px;
        text-align: center;
        min-height: 60px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .gen-status {
        font-family: "Poppins", sans-serif;
        font-size: 15px;
        font-weight: 500;
        color: #111111;
        margin: 0;
        animation: gen-msg-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      @keyframes gen-msg-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .gen-dots-row {
        display: flex;
        gap: 7px;
      }

      .gen-bounce-dot {
        display: block;
        width: 5px; height: 5px;
        background: #111111;
        border-radius: 50%;
        opacity: 0.4;
        animation: gen-bounce 1.1s ease-in-out infinite;
      }

      .gen-bounce-dot:nth-child(1) { animation-delay: 0s; }
      .gen-bounce-dot:nth-child(2) { animation-delay: 0.18s; }
      .gen-bounce-dot:nth-child(3) { animation-delay: 0.36s; }

      @keyframes gen-bounce {
        0%, 100% { transform: translateY(0);   opacity: 0.4; }
        50%       { transform: translateY(-7px); opacity: 0.9; }
      }

      .gen-particle {
        position: absolute;
        width: 4px; height: 4px;
        background: rgba(17,17,17,0.12);
        border-radius: 50%;
        bottom: -4px;
        animation: gen-float-up linear infinite;
        pointer-events: none;
      }

      .gen-particle:nth-child(1)  { left: 8%;  animation-duration: 3.2s; animation-delay: 0s;    width: 3px; height: 3px; }
      .gen-particle:nth-child(2)  { left: 18%; animation-duration: 4.1s; animation-delay: 0.6s; }
      .gen-particle:nth-child(3)  { left: 28%; animation-duration: 3.7s; animation-delay: 1.3s; width: 3px; height: 3px; }
      .gen-particle:nth-child(4)  { left: 38%; animation-duration: 2.9s; animation-delay: 0.4s; }
      .gen-particle:nth-child(5)  { left: 50%; animation-duration: 3.5s; animation-delay: 1.8s; width: 3px; height: 3px; }
      .gen-particle:nth-child(6)  { left: 62%; animation-duration: 4.3s; animation-delay: 0.9s; }
      .gen-particle:nth-child(7)  { left: 73%; animation-duration: 3.1s; animation-delay: 1.1s; width: 3px; height: 3px; }
      .gen-particle:nth-child(8)  { left: 82%; animation-duration: 3.8s; animation-delay: 0.2s; }
      .gen-particle:nth-child(9)  { left: 91%; animation-duration: 2.7s; animation-delay: 1.5s; width: 3px; height: 3px; }
      .gen-particle:nth-child(10) { left: 45%; animation-duration: 4.6s; animation-delay: 0.7s; }

      @keyframes gen-float-up {
        0%   { transform: translateY(0)     scale(1);   opacity: 0; }
        8%   { opacity: 0.9; }
        85%  { opacity: 0.5; }
        100% { transform: translateY(-100vh) scale(0.4); opacity: 0; }
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

        .install-card {
          text-align: left;
        }

        .success-hero {
          padding: 28px 18px 20px;
        }

        .next-steps {
          padding: 12px;
        }

        .success-actions {
          padding: 18px;
        }

        .btn-primary-strong,
        .btn-link-block {
          font-size: 13px;
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
                placeholder="#ffffff"
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
                placeholder="#f6f3ed"
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
              placeholder="#ffffff"
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
          <p className="font-preview" style={{ fontFamily: previewFontFamily[form.font_choice] || '"Poppins", sans-serif' }}>
            Preview: Sådan kan teksten se ud i chatten.
          </p>
        </div>
      </div>
    ),
    6: (
      <div>
        <h2 className="section-title">6. Custom prompt til din AI</h2>
        <p className="muted" style={{ marginTop: -8, marginBottom: 14 }}>
          Her kan du skrive ekstra regler eller viden, som chatbotten altid skal tage hensyn til.
        </p>
        <div className="field">
          <label className="field-label">Andet chatbotten skal vide</label>
          <textarea
            value={form.custom_instructions}
            onChange={e => update("custom_instructions", e.target.value)}
            placeholder={"Eksempler:\n- Svar altid kort og i punktform\n- Nævn altid leveringstid hvis kunden spørger om pris\n- Brug aldrig engelske svar\n- Ved tvivl, bed kunden kontakte os på support@..."}
            className="field-input field-textarea field-textarea-large"
          />
        </div>
      </div>
    ),
  };

  if (step === 7) {
    return (
      <main className="eb-page">
        {styles}
        <div className="eb-shell">
          <div className="success-stack">
            <section className="eb-card eb-animate success-hero">
              <div className="success-badge">Ordre modtaget</div>
              <div className="checkmark checkmark-premium" aria-hidden="true">
                <span>✓</span>
              </div>
              <h1 className="brand thanks-title">Tak for din ordre!</h1>
              <p className="thanks-text">
                Din chatbot er nu sat i produktion. Vi finjusterer den med dine svar og sender embed-scriptet,
                så du hurtigt kan gå live.
              </p>
              <div className="status-chip">Svar inden for 24 timer</div>

              <div className="next-steps">
                <p className="next-steps-title">Hvad sker der nu?</p>
                <ul className="next-steps-list">
                  <li>Vi gennemgår din opsætning og kvalitetssikrer chatbotten.</li>
                  <li>Du modtager embed-script og korte instrukser på mail.</li>
                  <li>Hvis noget mangler, kontakter vi dig med det samme.</li>
                </ul>
              </div>
            </section>

            <section className="eb-card eb-animate success-actions" aria-label="Næste handlinger">
              <h2 className="success-actions-header">Næste skridt</h2>
              <p className="success-actions-sub">
                Download installationsguiden nu, så du er klar til at aktivere EmbedBot på dit site med det samme.
              </p>

              <div className="success-cta-row">
                <a
                  href={SETUP_GUIDE_PDF_PATH}
                  download
                  className="btn btn-primary-strong"
                >
                  Download installationsguide (PDF)
                </a>

                <Link
                  href="/dashboard"
                  className="btn btn-secondary btn-link-block"
                >
                  Gå til dashboard og administrer chatbots
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="eb-page">
      {styles}

      {loading && (
        <div className="gen-overlay">
          <span className="gen-brand">EmbedBot</span>
          <div className="gen-orb-wrap">
            <div className="gen-ring gen-ring-1" />
            <div className="gen-ring gen-ring-2" />
            <div className="gen-ring gen-ring-3" />
            <div className="gen-core">
              <div className="gen-dot gen-dot-1" />
              <div className="gen-dot gen-dot-2" />
              <div className="gen-dot gen-dot-3" />
              <div className="gen-center-dot" />
            </div>
          </div>
          <div className="gen-text-wrap">
            <p className="gen-status" key={generatingPhase}>
              {GENERATING_MESSAGES[generatingPhase % GENERATING_MESSAGES.length]}
            </p>
            <div className="gen-dots-row">
              <span className="gen-bounce-dot" />
              <span className="gen-bounce-dot" />
              <span className="gen-bounce-dot" />
            </div>
          </div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="gen-particle" />
          ))}
        </div>
      )}

      <div className="eb-shell eb-animate">
        <div className="header-row">
          <h1 className="brand brand-main">Opsæt din chatbot</h1>
          <span className="step-note">Trin {Math.min(step, 6)} af 6</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(Math.min(step, 6) / 6) * 100}%` }} />
        </div>

        <div className="eb-card" style={{ overflow: "hidden" }}>
          <div key={step} className={`step-slide step-slide-${stepDirection}`}>
            {sections[step]}
          </div>
        </div>

        {message && <p className="message-error">{message}</p>}

        <div className="actions" style={{ marginTop: 20 }}>
        {step > 1 && (
          <button onClick={handlePrevStep} className="btn btn-secondary">
            ← Tilbage
          </button>
        )}
        {step < 6 ? (
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