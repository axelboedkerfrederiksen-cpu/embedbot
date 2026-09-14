"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle, ArrowRight, BarChart3, BookOpenText, Bot, CalendarClock, Check, CheckCircle2,
  ChevronDown, Code2, Copy, CreditCard, ExternalLink, Eye, HelpCircle, Inbox,
  LayoutDashboard, LoaderCircle, LogOut, Menu, MessagesSquare, Palette, Plus, ReceiptText,
  Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, TrendingUp, UserRoundPlus,
  UsersRound, WalletCards, X, Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { isBusinessSubscriptionActive } from "@/lib/subscription";
import styles from "./dashboard.module.css";

type DashboardView = "overview" | "messages" | "conversations" | "leads" | "knowledge" | "behavior" | "appearance" | "installation" | "analytics" | "billing" | "settings";

type Business = {
  id: string;
  name?: string | null;
  created_at?: string | null;
  website_url?: string | null;
  industry?: string | null;
  description?: string | null;
  support_email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  hours_weekday?: string | null;
  hours_saturday?: string | null;
  hours_sunday?: string | null;
  response_time?: string | null;
  fallback_action?: string | null;
  complaint_action?: string | null;
  products_services?: string | null;
  delivery_time?: string | null;
  return_policy?: string | null;
  payment_methods?: string | null;
  welcome_message?: string | null;
  tone?: string | null;
  language?: string | null;
  custom_instructions?: string | null;
  faq?: string | null;
  cvr?: string | null;
  social_media?: string | null;
  current_offers?: string | null;
  warranty?: string | null;
  size_guide?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  chat_icon_color?: string | null;
  fab_color?: string | null;
  font_choice?: string | null;
  chat_outline_enabled?: string | boolean | null;
  chat_outline_color?: string | null;
  chat_outline_width?: string | number | null;
  chat_outline_opacity?: string | number | null;
  widget_opacity?: string | number | null;
  subscription_status?: string | null;
  payment_status?: string | null;
  stripe_subscription_id?: string | null;
  activated?: boolean | null;
  plan?: string | null;
  [key: string]: unknown;
};

type ConversationRow = { id: string; business_id: string; created_at: string | null; messages: unknown };
type CustomerMessage = {
  id: string;
  business_id: string;
  sender: "admin" | "system";
  title: string;
  body: string;
  action_url: string | null;
  action_label: string | null;
  read_at: string | null;
  created_at: string;
};
type ChatMessage = { role: string; content: string };
type LeadRow = { email: string; message: string; pageUrl: string; createdAt: string | null };
type SubscriptionInvoice = { id: string; status: string | null; hostedInvoiceUrl: string | null; invoicePdf: string | null; amountDue: number | null; amountPaid: number | null; currency: string | null; dueDate: string | null };
type PaymentMethodSummary = { type: string; brand: string | null; last4: string | null; expMonth: number | null; expYear: number | null };
type ScheduledPlanChange = { plan: "starter" | "growth" | "scale" | "enterprise"; planName: string; amount: number | null; currency: string | null; interval: string | null; effectiveAt: string | null };
type SubscriptionInfo = {
  businessId: string; businessName: string; source: "stripe" | "database"; status: string;
  paymentStatus: string; isActive: boolean; isTrialing: boolean; trialEndsAt: string | null;
  trialDaysRemaining: number | null; currentPeriodStart: string | null; currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null; cancelAt: string | null; canceledAt: string | null;
  collectionMethod: string | null; amount: number | null; currency: string | null; interval: string | null;
  productName: string; quantity: number | null; customerId: string | null; customerEmail: string | null;
  subscriptionId: string | null; latestInvoice: SubscriptionInvoice | null; paymentMethod: PaymentMethodSummary | null; scheduledChange: ScheduledPlanChange | null; updatedAt: string | null;
  error: string | null; plan: "starter" | "growth" | "scale" | "enterprise"; planName: string;
  answersUsed: number; answerLimit: number; usageResetsAt: string | null;
};

type FieldType = "text" | "textarea" | "select" | "color" | "range";
type FieldDefinition = { key: string; label: string; type: FieldType; placeholder?: string; hint?: string; options?: Array<{ label: string; value: string }>; min?: number; max?: number; step?: number; suffix?: string };
type NavItem = { view: DashboardView; label: string; icon: LucideIcon; badge?: "attention" | "messages" };

const NAV_PRIMARY: NavItem[] = [
  { view: "overview", label: "Overblik", icon: LayoutDashboard },
  { view: "messages", label: "Beskeder", icon: Inbox, badge: "messages" },
  { view: "conversations", label: "Samtaler", icon: MessagesSquare, badge: "attention" },
  { view: "leads", label: "Leads", icon: UserRoundPlus },
];
const NAV_IMPROVE: NavItem[] = [
  { view: "knowledge", label: "Viden & svar", icon: BookOpenText },
  { view: "behavior", label: "Adfærd", icon: SlidersHorizontal },
  { view: "appearance", label: "Udseende", icon: Palette },
  { view: "installation", label: "Installation", icon: Code2 },
];
const NAV_MANAGE: NavItem[] = [
  { view: "analytics", label: "Analyse", icon: BarChart3 },
  { view: "billing", label: "Abonnement", icon: CreditCard },
  { view: "settings", label: "Indstillinger", icon: Settings },
];
const SELF_SERVE_BILLING_PLANS: Array<{ plan: "starter" | "growth" | "scale"; name: string; amount: number; answerLabel: string; description: string }> = [
  { plan: "starter", name: "Starter", amount: 29_900, answerLabel: "1.000 AI-svar pr. måned", description: "Til mindre webshops, der skal godt i gang." },
  { plan: "growth", name: "Growth", amount: 69_900, answerLabel: "5.000 AI-svar pr. måned", description: "Mere kapacitet til en chatbot med fast trafik." },
  { plan: "scale", name: "Scale", amount: 149_900, answerLabel: "15.000 AI-svar pr. måned", description: "Til teams med højere aktivitet og vækst." },
];

const IDENTITY_FIELDS: FieldDefinition[] = [
  { key: "name", label: "Navn", type: "text", placeholder: "Navn på virksomheden" },
  { key: "website_url", label: "Hjemmeside", type: "text", placeholder: "https://..." },
  { key: "industry", label: "Branche", type: "text", placeholder: "Fx webshop eller rådgivning" },
  { key: "description", label: "Virksomhedsbeskrivelse", type: "textarea", placeholder: "Hvad virksomheden hjælper sine kunder med" },
];
const CONTACT_FIELDS: FieldDefinition[] = [
  { key: "support_email", label: "Support-email", type: "text", placeholder: "kontakt@firma.dk" },
  { key: "phone", label: "Telefon", type: "text", placeholder: "+45 ..." },
  { key: "address", label: "Adresse", type: "text", placeholder: "Vejnavn 1" },
  { key: "city", label: "By", type: "text", placeholder: "København" },
  { key: "hours_weekday", label: "Åbningstider · hverdag", type: "text", placeholder: "Man–fre 09–17" },
  { key: "hours_saturday", label: "Åbningstider · lørdag", type: "text", placeholder: "Lør 10–14" },
  { key: "hours_sunday", label: "Åbningstider · søndag", type: "text", placeholder: "Søn lukket" },
  { key: "cvr", label: "CVR", type: "text", placeholder: "12345678" },
  { key: "social_media", label: "Sociale medier", type: "textarea", placeholder: "Links til virksomhedens profiler" },
];
const KNOWLEDGE_FIELDS: FieldDefinition[] = [
  { key: "products_services", label: "Produkter og services", type: "textarea", placeholder: "Beskriv hvad I sælger eller tilbyder" },
  { key: "delivery_time", label: "Levering", type: "textarea", placeholder: "Leveringstid, pris og områder" },
  { key: "return_policy", label: "Returpolitik", type: "textarea", placeholder: "Retur, ombytning og refundering" },
  { key: "payment_methods", label: "Betalingsformer", type: "textarea", placeholder: "Kort, MobilePay, faktura osv." },
  { key: "current_offers", label: "Aktuelle tilbud", type: "textarea", placeholder: "Kampagner eller rabatter" },
  { key: "warranty", label: "Garanti og reklamation", type: "textarea", placeholder: "Garantier og reklamationsret" },
  { key: "size_guide", label: "Størrelsesguide", type: "textarea", placeholder: "Hvis relevant for jeres produkter" },
  { key: "faq", label: "FAQ · spørgsmål og svar", type: "textarea", placeholder: "Spørgsmål: ...\nSvar: ...", hint: "Skriv klare spørgsmål og korte, konkrete svar." },
];
const BEHAVIOR_FIELDS: FieldDefinition[] = [
  { key: "welcome_message", label: "Velkomstbesked", type: "textarea", placeholder: "Hej! Hvordan kan jeg hjælpe?" },
  { key: "tone", label: "Tone", type: "select", options: [{ label: "Venlig", value: "venlig" }, { label: "Uformel", value: "uformel" }, { label: "Formel", value: "formel" }, { label: "Ekspert", value: "ekspert" }] },
  { key: "language", label: "Sprog", type: "select", options: [{ label: "Dansk", value: "dansk" }, { label: "Engelsk", value: "engelsk" }, { label: "Norsk", value: "norsk" }, { label: "Svensk", value: "svensk" }, { label: "Tysk", value: "tysk" }] },
  { key: "response_time", label: "Forventet svartid", type: "text", placeholder: "Fx inden for 24 timer" },
  { key: "fallback_action", label: "Når botten ikke kender svaret", type: "textarea", placeholder: "Henvis fx til support-email eller telefon" },
  { key: "complaint_action", label: "Når kunden klager", type: "textarea", placeholder: "Beskriv hvordan botten skal hjælpe videre" },
  { key: "custom_instructions", label: "Ekstra instruktioner", type: "textarea", placeholder: "Særlige regler botten skal følge", hint: "Hold instruktionerne korte og undgå regler, der modsiger hinanden." },
];
const APPEARANCE_FIELDS: FieldDefinition[] = [
  { key: "primary_color", label: "Primær farve", type: "color" },
  { key: "secondary_color", label: "Kundens beskedfarve", type: "color" },
  { key: "chat_icon_color", label: "Chatknap", type: "color" },
  { key: "font_choice", label: "Skrifttype", type: "select", options: [{ label: "Poppins", value: "Poppins" }, { label: "DM Sans", value: "DM Sans" }, { label: "Inter", value: "Inter" }, { label: "Lora", value: "Lora" }] },
  { key: "widget_opacity", label: "Gennemsigtighed", type: "range", min: 40, max: 100, step: 5, suffix: "%" },
];
const ALL_FIELDS = [...IDENTITY_FIELDS, ...CONTACT_FIELDS, ...KNOWLEDGE_FIELDS, ...BEHAVIOR_FIELDS, ...APPEARANCE_FIELDS];

const VIEW_COPY: Record<DashboardView, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "Dit arbejdsområde", title: "Overblik", description: "Det vigtigste om din chatbot — og hvad der kræver din opmærksomhed." },
  messages: { eyebrow: "Fra EmbedBot", title: "Beskeder", description: "Chatbot-demoer, opdateringer og praktiske beskeder fra EmbedBot." },
  conversations: { eyebrow: "Kundedialog", title: "Samtaler", description: "Gennemgå kundernes spørgsmål og find svar, der kan forbedres." },
  leads: { eyebrow: "Muligheder", title: "Leads", description: "Kontaktoplysninger, som kunder har delt med chatbotten." },
  knowledge: { eyebrow: "Forbedr botten", title: "Viden & svar", description: "Hold botten opdateret med produkter, politikker og gode standardsvar." },
  behavior: { eyebrow: "Forbedr botten", title: "Adfærd", description: "Bestem hvordan chatbotten taler, hjælper og sender kunder videre." },
  appearance: { eyebrow: "Forbedr botten", title: "Udseende", description: "Tilpas chatten til jeres brand og se ændringerne med det samme." },
  installation: { eyebrow: "Gå live", title: "Installation", description: "Alt din udvikler eller webshopansvarlige skal bruge for at installere EmbedBot." },
  analytics: { eyebrow: "Resultater", title: "Analyse", description: "Se udviklingen og gå fra tal direkte til de samtaler, der ligger bag." },
  billing: { eyebrow: "Konto", title: "Abonnement", description: "Plan, AI-forbrug, næste periode og faktura — synkroniseret med Stripe." },
  settings: { eyebrow: "Konto", title: "Indstillinger", description: "Grundoplysninger, kontaktinformation og åbningstider." },
};

function cx(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(" "); }

function normalizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (typeof entry === "string") return { role: "assistant", content: entry };
    if (!entry || typeof entry !== "object") return { role: "assistant", content: "" };
    const item = entry as Record<string, unknown>;
    const role = typeof item.role === "string" ? item.role : typeof item.sender === "string" ? item.sender : "assistant";
    const content = typeof item.content === "string" ? item.content : typeof item.text === "string" ? item.text : typeof item.message === "string" ? item.message : "";
    return { role, content };
  }).filter((message) => message.content.trim().length > 0);
}

function extractPageUrl(raw: unknown): string {
  if (!Array.isArray(raw)) return "Ikke oplyst";
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const pageUrl = (entry as Record<string, unknown>).page_url;
    if (typeof pageUrl === "string" && pageUrl.trim()) return pageUrl.trim();
  }
  return "Ikke oplyst";
}
function extractEmails(text: string): string[] { return Array.from(new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((address) => address.toLowerCase()))); }
function isMissedAnswer(text: string): boolean { const value = text.toLowerCase(); return ["kontakt os", "kan ikke hjælpe", "beklager", "jeg ved det ikke", "please contact", "i cannot help", "i can't help"].some((pattern) => value.includes(pattern)); }
function classifyTopic(question: string): string {
  const value = question.toLowerCase();
  if (/pris|price|pricing|koster|tilbud|rabat/.test(value)) return "Pris og tilbud";
  if (/levering|shipping|fragt|forsend|delivery/.test(value)) return "Levering";
  if (/retur|refund|return|ombyt|garanti/.test(value)) return "Retur og garanti";
  if (/betaling|payment|faktura|invoice|kort|mobilepay/.test(value)) return "Betaling";
  if (/åbning|aabning|open|lukke|hour|tid/.test(value)) return "Åbningstider";
  if (/kontakt|telefon|email|mail|adresse/.test(value)) return "Kontakt";
  return "Andet";
}
function shortText(value: string, max = 110) { const clean = value.trim(); return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`; }
function formatDate(value: string | null | undefined) { if (!value) return "Ikke oplyst"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Ikke oplyst" : new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", year: "numeric" }).format(date); }
function formatConversationDate(value: string | null) { if (!value) return "Ukendt tidspunkt"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Ukendt tidspunkt" : new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date); }
function formatCurrency(amount: number | null, currency: string | null) { return typeof amount !== "number" || !currency ? "Ikke oplyst" : new Intl.NumberFormat("da-DK", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(amount / 100); }
function formatSubscriptionStatus(status: string) { switch (status.toLowerCase()) { case "active": return "Aktivt"; case "trialing": return "Prøveperiode"; case "past_due": return "Betaling mangler"; case "canceled": return "Opsagt"; case "unpaid": return "Ubetalt"; case "paused": return "Pauset"; default: return "Afventer"; } }
function formatCardBrand(value: string | null | undefined) { if (!value) return "Betalingskort"; return value === "visa" ? "Visa" : value === "mastercard" ? "Mastercard" : value.charAt(0).toUpperCase() + value.slice(1); }
function normalizeExternalUrl(value: string | null | undefined) { const trimmed = (value || "").trim(); return !trimmed ? "" : /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`; }
function normalizeMessageActionUrl(value: string | null | undefined) { const trimmed = (value || "").trim(); if (!trimmed) return ""; if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed; try { const parsed = new URL(trimmed); return parsed.protocol === "https:" ? parsed.toString() : ""; } catch { return ""; } }
function sanitizeColor(value: string, fallback: string) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) ? value.trim() : fallback; }
function buildDraft(business: Business): Record<string, string> { return Object.fromEntries(ALL_FIELDS.map((field) => { const value = business[field.key]; if (typeof value === "boolean") return [field.key, value ? "true" : "false"]; return [field.key, value === null || value === undefined ? "" : String(value)]; })); }
function getConversationQuestion(conversation: ConversationRow) { return normalizeMessages(conversation.messages).find((message) => message.role.toLowerCase().includes("user"))?.content || "Samtale uden spørgsmål"; }
function getConversationAnswer(conversation: ConversationRow) { return normalizeMessages(conversation.messages).find((message) => message.role.toLowerCase().includes("assistant"))?.content || ""; }

function MetricCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint: string }) {
  return <article className={cx(styles.card, styles.metricCard)}><div className={styles.metricTop}><p className={styles.metricLabel}>{label}</p><Icon className={styles.metricIcon} size={16} aria-hidden="true" /></div><p className={styles.metricValue}>{value}</p><p className={styles.metricHint}>{hint}</p></article>;
}
function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return <div className={styles.emptyState}><Icon size={24} aria-hidden="true" /><strong>{title}</strong><p>{description}</p></div>;
}

function EditorSection({ title, description, fields, draft, onChange, onSave, saving }: { title: string; description: string; fields: FieldDefinition[]; draft: Record<string, string>; onChange: (key: string, value: string) => void; onSave: () => void; saving: boolean }) {
  return (
    <section className={cx(styles.card, styles.sectionCard)}>
      <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>{title}</h2><p className={styles.cardDescription}>{description}</p></div></div>
      <div className={styles.editorGrid}>
        {fields.map((field) => {
          const value = draft[field.key] || "";
          const colorFallback = field.key === "secondary_color" ? "#edf3ef" : "#237a57";
          return (
            <label key={field.key} className={cx(styles.field, field.type === "textarea" && styles.fieldFull)}>
              <span className={styles.fieldLabel}>{field.label}</span>
              {field.type === "textarea" ? <textarea className={styles.textarea} rows={field.key === "faq" ? 10 : 4} value={value} placeholder={field.placeholder} onChange={(event) => onChange(field.key, event.target.value)} />
                : field.type === "select" ? <select className={styles.select} value={value} onChange={(event) => onChange(field.key, event.target.value)}><option value="">Vælg</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                : field.type === "color" ? <span className={styles.colorInputWrap}><input className={styles.colorInput} type="color" value={sanitizeColor(value, colorFallback)} onChange={(event) => onChange(field.key, event.target.value)} /><span className={styles.colorValue}>{sanitizeColor(value, colorFallback)}</span></span>
                : field.type === "range" ? <span className={styles.rangeRow}><input className={styles.range} type="range" min={field.min} max={field.max} step={field.step} value={value || field.max} onChange={(event) => onChange(field.key, event.target.value)} /><span className={styles.rangeValue}>{value || field.max}{field.suffix}</span></span>
                : <input className={styles.input} value={value} placeholder={field.placeholder} onChange={(event) => onChange(field.key, event.target.value)} />}
              {field.hint ? <p className={styles.fieldHint}>{field.hint}</p> : null}
            </label>
          );
        })}
      </div>
      <div className={styles.editorFooter}><button className={styles.button} type="button" onClick={onSave} disabled={saving}>{saving ? "Gemmer…" : "Gem ændringer"}</button></div>
    </section>
  );
}

function WidgetPreview({ businessName, draft }: { businessName: string; draft: Record<string, string> }) {
  const primaryColor = sanitizeColor(draft.primary_color || "", "#237a57");
  const secondaryColor = sanitizeColor(draft.secondary_color || "", "#edf3ef");
  const iconColor = sanitizeColor(draft.chat_icon_color || "", primaryColor);
  const opacity = Math.max(0.4, Math.min(1, Number(draft.widget_opacity || "100") / 100));
  return (
    <section className={cx(styles.card, styles.previewCard)}>
      <div className={styles.cardHeader} style={{ padding: "18px 18px 0" }}><div><h2 className={styles.cardTitle}>Live preview</h2><p className={styles.cardDescription}>Sådan føles chatten på en lys hjemmeside.</p></div><Eye size={17} className={styles.metricIcon} /></div>
      <div className={styles.previewStage}>
        <div className={styles.mockSite} aria-hidden="true"><div className={styles.mockNav} /><div className={styles.mockTitle} /><div className={styles.mockCopy} /></div>
        <div className={styles.widgetMock} style={{ opacity, fontFamily: `"${draft.font_choice || "Poppins"}", sans-serif` }}>
          <div className={styles.widgetHeader} style={{ background: primaryColor, color: "#ffffff" }}>{businessName}</div>
          <div className={styles.widgetBody}><div className={styles.widgetMessage} style={{ background: secondaryColor, color: "#142019" }}>{draft.welcome_message?.trim() || "Hej! Hvordan kan jeg hjælpe dig i dag?"}</div><div className={styles.widgetInput}>Skriv en besked…<span className={styles.widgetSend} style={{ background: iconColor }}><ArrowRight size={12} /></span></div></div>
        </div>
      </div>
    </section>
  );
}

function TrendChart({ daily }: { daily: Array<{ label: string; conversations: number; leads: number }> }) {
  const maxValue = Math.max(1, ...daily.flatMap((day) => [day.conversations, day.leads]));
  return <><div className={styles.chartScroll}><div className={styles.chart} style={{ gridTemplateColumns: `repeat(${daily.length}, minmax(34px, 1fr))`, minWidth: Math.max(420, daily.length * 44) }}>{daily.map((day, index) => <div className={styles.chartDay} key={`${day.label}-${index}`}><div className={styles.barArea}><div className={styles.bar} title={`${day.conversations} samtaler`} style={{ height: day.conversations === 0 ? 0 : Math.max(5, Math.round((day.conversations / maxValue) * 138)) }} /><div className={styles.barSoft} title={`${day.leads} leads`} style={{ height: day.leads === 0 ? 0 : Math.max(5, Math.round((day.leads / maxValue) * 138)) }} /></div><span className={styles.chartLabel}>{day.label}</span></div>)}</div></div><div className={styles.legend}><span className={styles.legendItem}><span className={styles.legendDot} />Samtaler</span><span className={styles.legendItem}><span className={styles.legendDotSoft} />Leads</span></div></>;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [analyticsAnchor] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [customerMessages, setCustomerMessages] = useState<CustomerMessage[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);
  const [conversationSearch, setConversationSearch] = useState("");
  const [conversationFilter, setConversationFilter] = useState<"all" | "unanswered" | "leads">("all");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [editDrafts, setEditDrafts] = useState<Record<string, Record<string, string>>>({});
  const [savingSection, setSavingSection] = useState("");
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");
  const [billingAction, setBillingAction] = useState<"" | "plan" | "portal">("");
  const [planChangeCandidate, setPlanChangeCandidate] = useState<typeof SELF_SERVE_BILLING_PLANS[number] | null>(null);
  const [copied, setCopied] = useState(false);
  const [faqCandidate, setFaqCandidate] = useState<{ question: string; answer: string } | null>(null);

  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    if (requestedView && requestedView in VIEW_COPY) setActiveView(requestedView as DashboardView);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadDashboard() {
      if (process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("preview") === "1") {
        const previewBusiness: Business = {
          id: "11111111-1111-4111-8111-111111111111", name: "Nordic Living", website_url: "https://example.com",
          industry: "Webshop", description: "Dansk interiør til hverdagen", support_email: "hej@nordicliving.dk",
          products_services: "Møbler, lamper og boligtilbehør", delivery_time: "2-4 hverdage", return_policy: "30 dages returret",
          payment_methods: "Visa, Mastercard og MobilePay", faq: "Spørgsmål: Hvor hurtigt leverer I?\nSvar: Vi leverer normalt inden for 2-4 hverdage.",
          welcome_message: "Hej! Hvordan kan jeg hjælpe dig med dit hjem i dag?", tone: "venlig", language: "dansk",
          primary_color: "#237a57", secondary_color: "#e9f5ef", chat_icon_color: "#237a57", font_choice: "Poppins",
          widget_opacity: "100", subscription_status: "active", payment_status: "paid", activated: true, plan: "growth",
        };
        const previewNow = Date.now();
        const previewConversations: ConversationRow[] = [
          { id: "preview-1", business_id: previewBusiness.id, created_at: new Date(previewNow - 45 * 60 * 1000).toISOString(), messages: [{ role: "user", content: "Hvor lang leveringstid har spisebordet?" }, { role: "assistant", content: "Vi leverer normalt inden for 2-4 hverdage. Vil du have hjælp til at vælge størrelse?" }] },
          { id: "preview-2", business_id: previewBusiness.id, created_at: new Date(previewNow - 28 * 60 * 60 * 1000).toISOString(), messages: [{ role: "user", content: "Kan lampen dæmpes? Min mail er ida@example.com" }, { role: "assistant", content: "Beklager, jeg ved det ikke. Kontakt os venligst." }] },
          { id: "preview-3", business_id: previewBusiness.id, created_at: new Date(previewNow - 52 * 60 * 60 * 1000).toISOString(), messages: [{ role: "user", content: "Kan jeg returnere en vare købt på tilbud?" }, { role: "assistant", content: "Ja, I har 30 dages returret — også på tilbudsvarer." }] },
        ];
        const previewCustomerMessages: CustomerMessage[] = [
          {
            id: "preview-message-1",
            business_id: previewBusiness.id,
            sender: "admin",
            title: "Din nye chatbot er klar",
            body: "Vi har gjort en ny version af chatbotten klar til jer. Gennemgå den gerne og send os en besked, hvis noget skal justeres.",
            action_url: `/preview/${previewBusiness.id}`,
            action_label: "Åbn chatbot-demo",
            read_at: null,
            created_at: new Date(previewNow - 18 * 60 * 1000).toISOString(),
          },
          {
            id: "preview-message-2",
            business_id: previewBusiness.id,
            sender: "admin",
            title: "Velkommen til EmbedBot",
            body: "Her får I fremover besked om nye versioner, vigtige opdateringer og hjælp til jeres chatbot.",
            action_url: null,
            action_label: null,
            read_at: new Date(previewNow - 2 * 86400000).toISOString(),
            created_at: new Date(previewNow - 3 * 86400000).toISOString(),
          },
        ];
        const previewSubscription: SubscriptionInfo = {
          businessId: previewBusiness.id, businessName: previewBusiness.name || "", source: "stripe", status: "active",
          paymentStatus: "paid", isActive: true, isTrialing: false, trialEndsAt: null, trialDaysRemaining: null,
          currentPeriodStart: new Date(previewNow - 10 * 86400000).toISOString(), currentPeriodEnd: new Date(previewNow + 20 * 86400000).toISOString(),
          cancelAtPeriodEnd: false, cancelAt: null, canceledAt: null, collectionMethod: "charge_automatically",
          amount: 69900, currency: "dkk", interval: "month", productName: "Growth", quantity: 1,
          customerId: "preview", customerEmail: "hej@nordicliving.dk", subscriptionId: "preview", latestInvoice: null,
          paymentMethod: { type: "card", brand: "visa", last4: "4242", expMonth: 8, expYear: 2028 },
          scheduledChange: null,
          updatedAt: new Date(previewNow).toISOString(), error: null, plan: "growth", planName: "Growth",
          answersUsed: 1834, answerLimit: 5000, usageResetsAt: new Date(previewNow + 20 * 86400000).toISOString(),
        };
        setEmail("kunde@nordicliving.dk");
        setBusinesses([previewBusiness]); setSelectedBusinessId(previewBusiness.id);
        setEditDrafts({ [previewBusiness.id]: buildDraft(previewBusiness) });
        setConversations(previewConversations); setCustomerMessages(previewCustomerMessages); setSubscriptions([previewSubscription]); setLoading(false);
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!userData.user) { router.replace("/login"); return; }
      setEmail(userData.user.email || "");
      const { data: businessData, error: businessError } = await supabase.from("businesses").select("*").eq("user_id", userData.user.id).order("created_at", { ascending: false });
      if (!mounted) return;
      if (businessError) { setFetchError("Vi kunne ikke hente dine chatbots. Prøv at genindlæse siden."); setLoading(false); return; }
      const rows = (businessData || []) as Business[];
      const activeBusiness = rows.find((business) => isBusinessSubscriptionActive(business));
      if (!activeBusiness) { router.replace("/setup"); return; }
      setBusinesses(rows);
      setSelectedBusinessId(activeBusiness.id);
      setEditDrafts(Object.fromEntries(rows.map((business) => [business.id, buildDraft(business)])));
      setSubscriptionLoading(true);
      const businessIds = rows.map((business) => business.id).filter(Boolean);
      const subscriptionPromise = fetch("/api/dashboard/subscription").then(async (response) => { const result = await response.json() as { success?: boolean; error?: string; subscriptions?: SubscriptionInfo[] }; if (!response.ok || !result.success) throw new Error(result.error || "Subscription request failed"); return result.subscriptions || []; });
      const conversationsPromise = businessIds.length ? supabase.from("conversations").select("id,business_id,created_at,messages").in("business_id", businessIds).order("created_at", { ascending: false }).limit(600) : Promise.resolve({ data: [], error: null });
      const customerMessagesPromise = businessIds.length ? supabase.from("customer_messages").select("id,business_id,sender,title,body,action_url,action_label,read_at,created_at").in("business_id", businessIds).order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null });
      const [subscriptionResult, conversationResult, customerMessagesResult] = await Promise.allSettled([subscriptionPromise, conversationsPromise, customerMessagesPromise]);
      if (!mounted) return;
      if (subscriptionResult.status === "fulfilled") setSubscriptions(subscriptionResult.value);
      else setSubscriptionError("Abonnementsdata kunne ikke opdateres lige nu. Vi viser stadig din gemte adgangsstatus.");
      if (conversationResult.status === "fulfilled" && !conversationResult.value.error) setConversations((conversationResult.value.data || []) as ConversationRow[]);
      else setFetchError("Samtaler kunne ikke hentes lige nu. Dine chatbot-indstillinger virker stadig.");
      if (customerMessagesResult.status === "fulfilled" && !customerMessagesResult.value.error) setCustomerMessages((customerMessagesResult.value.data || []) as CustomerMessage[]);
      else setFetchError((current) => current || "Beskeder kunne ikke hentes lige nu. Resten af dashboardet virker stadig.");
      setSubscriptionLoading(false);
      setLoading(false);
    }
    void loadDashboard();
    return () => { mounted = false; };
  }, [router, supabase]);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3200); return () => window.clearTimeout(timer); }, [toast]);

  const selectedBusiness = useMemo(() => businesses.find((business) => business.id === selectedBusinessId) || businesses[0] || null, [businesses, selectedBusinessId]);
  const selectedSubscription = useMemo(() => subscriptions.find((subscription) => subscription.businessId === selectedBusiness?.id) || null, [selectedBusiness, subscriptions]);
  const selectedConversations = useMemo(() => conversations.filter((conversation) => conversation.business_id === selectedBusiness?.id), [conversations, selectedBusiness]);
  const selectedCustomerMessages = useMemo(() => customerMessages.filter((message) => message.business_id === selectedBusiness?.id), [customerMessages, selectedBusiness]);
  const unreadCustomerMessageCount = selectedCustomerMessages.filter((message) => !message.read_at).length;
  const draft = selectedBusiness ? editDrafts[selectedBusiness.id] || buildDraft(selectedBusiness) : {};

  useEffect(() => {
    if (activeView !== "messages" || !selectedBusinessId) return;
    const unreadIds = customerMessages.filter((message) => message.business_id === selectedBusinessId && !message.read_at).map((message) => message.id);
    if (!unreadIds.length) return;
    const readAt = new Date().toISOString();
    setCustomerMessages((current) => current.map((message) => unreadIds.includes(message.id) ? { ...message, read_at: readAt } : message));
    const previewMode = process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("preview") === "1";
    if (previewMode) return;
    void supabase.from("customer_messages").update({ read_at: readAt }).in("id", unreadIds).then(({ error }) => {
      if (error) setActionError("Beskederne kunne ikke markeres som læst, men du kan stadig læse dem.");
    });
  }, [activeView, customerMessages, selectedBusinessId, supabase]);

  const analytics = useMemo(() => {
    const anchorDate = new Date(analyticsAnchor);
    const start = Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), anchorDate.getUTCDate() - (rangeDays - 1));
    const rangeConversations = selectedConversations.filter((conversation) => { const timestamp = new Date(conversation.created_at || "").getTime(); return Number.isFinite(timestamp) && timestamp >= start; });
    const topicCounts = new Map<string, number>();
    const leadMap = new Map<string, LeadRow>();
    const missed: ConversationRow[] = [];
    let resolved = 0; let withAnswer = 0; let userMessages = 0;
    const dayKeys: string[] = []; const conversationCounts = new Map<string, number>(); const leadCounts = new Map<string, number>();
    for (let index = rangeDays - 1; index >= 0; index -= 1) { const date = new Date(analyticsAnchor - index * 86400000); const key = date.toISOString().slice(0, 10); dayKeys.push(key); conversationCounts.set(key, 0); leadCounts.set(key, 0); }
    for (const conversation of rangeConversations) {
      const messages = normalizeMessages(conversation.messages);
      const userContent = messages.filter((message) => message.role.toLowerCase().includes("user")).map((message) => message.content).join(" ");
      const assistantContent = messages.filter((message) => message.role.toLowerCase().includes("assistant")).map((message) => message.content).join(" ");
      const key = conversation.created_at?.slice(0, 10) || "";
      if (conversationCounts.has(key)) conversationCounts.set(key, (conversationCounts.get(key) || 0) + 1);
      if (userContent) { userMessages += messages.filter((message) => message.role.toLowerCase().includes("user")).length; const topic = classifyTopic(userContent); topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1); }
      if (assistantContent) { withAnswer += 1; if (isMissedAnswer(assistantContent)) missed.push(conversation); else resolved += 1; }
      const emails = extractEmails(userContent);
      if (emails.length && leadCounts.has(key)) leadCounts.set(key, (leadCounts.get(key) || 0) + emails.length);
      for (const leadEmail of emails) if (!leadMap.has(leadEmail)) leadMap.set(leadEmail, { email: leadEmail, message: shortText(userContent, 150), pageUrl: extractPageUrl(conversation.messages), createdAt: conversation.created_at });
    }
    const topics = Array.from(topicCounts.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 6);
    const leads = Array.from(leadMap.values()).sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime());
    const daily = dayKeys.map((key) => ({ label: new Date(`${key}T12:00:00Z`).toLocaleDateString("da-DK", { weekday: "short", ...(rangeDays === 30 ? { day: "numeric" } : {}) }), conversations: conversationCounts.get(key) || 0, leads: leadCounts.get(key) || 0 }));
    return { conversations: rangeConversations, conversationCount: rangeConversations.length, leads, missed, topics, daily, hoursSaved: userMessages * (4 / 60), resolutionRate: withAnswer ? Math.round((resolved / withAnswer) * 100) : 0 };
  }, [analyticsAnchor, rangeDays, selectedConversations]);

  const filteredConversations = useMemo(() => {
    const search = conversationSearch.trim().toLowerCase();
    return selectedConversations.filter((conversation) => { const combined = normalizeMessages(conversation.messages).map((message) => message.content).join(" ").toLowerCase(); if (search && !combined.includes(search)) return false; if (conversationFilter === "unanswered" && !isMissedAnswer(getConversationAnswer(conversation))) return false; if (conversationFilter === "leads" && extractEmails(combined).length === 0) return false; return true; });
  }, [conversationFilter, conversationSearch, selectedConversations]);

  const activeConversation = filteredConversations.find((conversation) => conversation.id === selectedConversationId) || filteredConversations[0] || null;
  const activeBusiness = selectedSubscription?.isActive ?? (selectedBusiness ? isBusinessSubscriptionActive(selectedBusiness) : false);
  const usagePercent = selectedSubscription?.answerLimit ? Math.min(100, Math.round((selectedSubscription.answersUsed / selectedSubscription.answerLimit) * 100)) : 0;
  const websiteUrl = normalizeExternalUrl(selectedBusiness?.website_url);
  const embedCode = selectedBusiness ? `<script src="https://www.embedbot.dk/widget.js?id=${selectedBusiness.id}"></script>` : "";
  const supportUrl = `/support?type=complaint&business=${encodeURIComponent(selectedBusiness?.name || "")}`;

  function changeView(view: DashboardView) { setActiveView(view); setMobileNavOpen(false); const previewMode = process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("preview") === "1"; const nextUrl = view === "overview" ? "/dashboard" : `/dashboard?view=${view}`; window.history.replaceState(null, "", previewMode ? `${nextUrl}${nextUrl.includes("?") ? "&" : "?"}preview=1` : nextUrl); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function updateDraftValue(key: string, value: string) { if (!selectedBusiness) return; setEditDrafts((current) => ({ ...current, [selectedBusiness.id]: { ...(current[selectedBusiness.id] || buildDraft(selectedBusiness)), [key]: value } })); }

  async function saveFields(sectionName: string, fields: FieldDefinition[]) {
    if (!selectedBusiness) return;
    setSavingSection(sectionName); setActionError("");
    const currentDraft = editDrafts[selectedBusiness.id] || buildDraft(selectedBusiness);
    const updates: Record<string, string> = {};
    for (const field of fields) { if (!Object.prototype.hasOwnProperty.call(selectedBusiness, field.key)) continue; const value = (currentDraft[field.key] || "").trim(); updates[field.key] = field.type === "color" ? sanitizeColor(value, field.key === "secondary_color" ? "#edf3ef" : "#237a57") : value; }
    try {
      const response = await fetch("/api/business-draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: selectedBusiness.id, form: updates }) });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "Kunne ikke gemme ændringerne.");
      const { data } = await supabase.from("businesses").select("*").eq("id", selectedBusiness.id).maybeSingle();
      setBusinesses((current) => current.map((business) => business.id === selectedBusiness.id ? (data as Business || { ...business, ...updates }) : business));
      setToast("Ændringerne er gemt og bruges nu af chatbotten.");
    } catch { setActionError("Ændringerne kunne ikke gemmes. Prøv igen om et øjeblik."); }
    finally { setSavingSection(""); }
  }

  async function handleCopyEmbedCode() { if (!embedCode) return; try { await navigator.clipboard.writeText(embedCode); setCopied(true); setToast("Installationskoden er kopieret."); window.setTimeout(() => setCopied(false), 2000); } catch { setActionError("Koden kunne ikke kopieres automatisk. Markér den og kopiér manuelt."); } }
  function prepareFaqFromConversation(conversation: ConversationRow) { setFaqCandidate({ question: getConversationQuestion(conversation), answer: "" }); changeView("knowledge"); }
  function addFaqCandidate() { if (!faqCandidate?.question.trim() || !faqCandidate.answer.trim()) return; const entry = `Spørgsmål: ${faqCandidate.question.trim()}\nSvar: ${faqCandidate.answer.trim()}`; updateDraftValue("faq", [draft.faq?.trim(), entry].filter(Boolean).join("\n\n")); setFaqCandidate(null); setToast("Svaret er føjet til FAQ-kladden. Husk at gemme ændringerne."); }
  function exportLeads() { if (!analytics.leads.length) return; const escape = (value: string) => `"${value.replaceAll('"', '""')}"`; const rows = [["E-mail", "Besked", "Side", "Dato"], ...analytics.leads.map((lead) => [lead.email, lead.message, lead.pageUrl, formatDate(lead.createdAt)])]; const csv = rows.map((row) => row.map(escape).join(";")).join("\n"); const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `embedbot-leads-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url); }
  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); }

  async function handleSchedulePlanChange() {
    if (!selectedBusiness || !selectedSubscription || !planChangeCandidate) {
      setActionError("Vælg først den plan, du vil skifte til.");
      return;
    }
    setActionError("");
    setBillingAction("plan");
    try {
      const previewMode = process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("preview") === "1";
      const scheduledChange: ScheduledPlanChange = previewMode
        ? { plan: planChangeCandidate.plan, planName: planChangeCandidate.name, amount: planChangeCandidate.amount, currency: "dkk", interval: "month", effectiveAt: selectedSubscription.currentPeriodEnd }
        : await fetch("/api/dashboard/billing", {
          method: "POST",
          headers: { "content-type": "application/json", "x-csrf-token": "dashboard-billing" },
          body: JSON.stringify({ business_id: selectedBusiness.id, action: "schedule_plan_change", plan: planChangeCandidate.plan }),
        }).then(async (response) => {
          const result = await response.json() as { success?: boolean; error?: string; scheduledChange?: ScheduledPlanChange };
          if (!response.ok || !result.success || !result.scheduledChange) throw new Error(result.error || "Planændringen kunne ikke planlægges.");
          return result.scheduledChange;
        });
      setSubscriptions((current) => current.map((subscription) => subscription.businessId === selectedBusiness.id ? { ...subscription, scheduledChange } : subscription));
      setToast(`${planChangeCandidate.name} er planlagt fra ${formatDate(scheduledChange.effectiveAt)}.`);
      setPlanChangeCandidate(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Planændringen kunne ikke planlægges.");
    } finally {
      setBillingAction("");
    }
  }

  async function handleOpenBillingPortal() {
    if (!selectedBusiness || !selectedSubscription?.customerId) {
      setActionError("Vi kan ikke finde en betalingsprofil til denne chatbot endnu.");
      return;
    }
    setActionError("");
    setBillingAction("portal");
    try {
      const previewMode = process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("preview") === "1";
      if (previewMode) {
        setToast("I den rigtige løsning åbner Stripes sikre betalingsside her.");
        return;
      }
      const result = await fetch("/api/dashboard/billing", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": "dashboard-billing" },
        body: JSON.stringify({ business_id: selectedBusiness.id, action: "open_billing_portal" }),
      }).then(async (response) => {
        const data = await response.json() as { success?: boolean; error?: string; url?: string };
        if (!response.ok || !data.success || !data.url) throw new Error(data.error || "Stripe-siden kunne ikke åbnes.");
        return data.url;
      });
      window.location.assign(result);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Stripe-siden kunne ikke åbnes.");
    } finally {
      setBillingAction("");
    }
  }

  function renderPageHeader(actions?: React.ReactNode) { const copy = VIEW_COPY[activeView]; return <header className={styles.pageHeader}><div><p className={styles.eyebrow}>{copy.eyebrow}</p><h1 className={styles.pageTitle}>{copy.title}</h1><p className={styles.pageDescription}>{copy.description}</p></div>{actions ? <div className={styles.headerActions}>{actions}</div> : null}</header>; }
  function renderDatePills() { return <div className={styles.datePills} aria-label="Vælg periode">{([7, 30] as const).map((days) => <button key={days} className={cx(styles.datePill, rangeDays === days && styles.datePillActive)} type="button" onClick={() => setRangeDays(days)}>{days} dage</button>)}</div>; }

  function renderOverview() {
    const latest = selectedConversations.slice(0, 4);
    const attentionItems = [
      ...(analytics.missed.length ? [{ title: `${analytics.missed.length} spørgsmål mangler et sikkert svar`, detail: "Gennemgå samtalerne og lær botten det rigtige svar.", action: "conversations" as DashboardView }] : []),
      ...(!selectedBusiness?.website_url ? [{ title: "Tilføj virksomhedens hjemmeside", detail: "Det gør installation og botinformation nemmere at holde styr på.", action: "settings" as DashboardView }] : []),
      ...(usagePercent >= 80 ? [{ title: `${usagePercent}% af månedens AI-svar er brugt`, detail: "Se nulstillingsdato og plan under Abonnement.", action: "billing" as DashboardView }] : []),
    ];
    return <>
      {renderPageHeader(<>{websiteUrl ? <a className={styles.buttonSecondary} href={websiteUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />Åbn hjemmeside</a> : null}<button className={styles.button} type="button" onClick={() => changeView("appearance")}><Eye size={14} />Forhåndsvis bot</button></>)}
      <section className={cx(styles.card, styles.heroCard)}><div className={styles.heroIdentity}><div className={styles.botIcon}><Bot size={23} /></div><div><h2 className={styles.heroName}>{selectedBusiness?.name || "Unavngiven chatbot"}</h2><div className={styles.heroMeta}><span className={cx(styles.statusDot, !activeBusiness && styles.statusDotInactive)} /><span>{activeBusiness ? "Aktiv" : "Kræver opmærksomhed"}</span><span>·</span><span>{selectedBusiness?.industry || "Branche ikke valgt"}</span></div></div></div><div className={styles.buttonRow}><button className={styles.buttonSecondary} type="button" onClick={() => changeView("installation")}><Code2 size={14} />Installér</button><button className={styles.buttonSecondary} type="button" onClick={() => changeView("behavior")}><SlidersHorizontal size={14} />Tilpas</button></div></section>
      {attentionItems.length ? <section className={cx(styles.card, styles.attentionCard)}><div className={styles.attentionHeader}><Sparkles size={16} className={styles.warningIcon} />Kræver din opmærksomhed</div><div className={styles.attentionList}>{attentionItems.map((item) => <div className={styles.attentionItem} key={item.title}><AlertCircle size={16} className={styles.attentionIcon} /><div className={styles.attentionText}><strong>{item.title}</strong><span>{item.detail}</span></div><button className={styles.inlineAction} type="button" onClick={() => { if (item.action === "conversations") setConversationFilter("unanswered"); changeView(item.action); }}>Åbn <ArrowRight size={11} /></button></div>)}</div></section> : <div className={styles.successBanner}><CheckCircle2 size={16} />Alt ser godt ud. Der er ingen presserende handlinger lige nu.</div>}
      <section className={styles.metricGrid}><MetricCard icon={MessagesSquare} label="Samtaler" value={String(analytics.conversationCount)} hint={`Seneste ${rangeDays} dage`} /><MetricCard icon={CheckCircle2} label="Løsningsgrad" value={`${analytics.resolutionRate}%`} hint="Svar uden tydelig fallback" /><MetricCard icon={UsersRound} label="Leads" value={String(analytics.leads.length)} hint="Unikke e-mailadresser" /><MetricCard icon={Zap} label="AI-forbrug" value={selectedSubscription ? `${usagePercent}%` : "–"} hint={selectedSubscription ? `${selectedSubscription.answersUsed.toLocaleString("da-DK")} af ${selectedSubscription.answerLimit.toLocaleString("da-DK")}` : "Henter fra Stripe"} /></section>
      <section className={styles.gridTwo}>
        <article className={cx(styles.card, styles.sectionCard)}><div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Aktivitet</h2><p className={styles.cardDescription}>Samtaler og leads over tid.</p></div>{renderDatePills()}</div><TrendChart daily={analytics.daily} /></article>
        <article className={cx(styles.card, styles.sectionCard)}><div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Seneste samtaler</h2><p className={styles.cardDescription}>De nyeste spørgsmål til botten.</p></div><button className={styles.inlineAction} type="button" onClick={() => changeView("conversations")}>Se alle</button></div>{latest.length ? <div className={styles.activityList}>{latest.map((conversation) => <button className={styles.activityButton} type="button" key={conversation.id} onClick={() => { setSelectedConversationId(conversation.id); changeView("conversations"); }}><span className={styles.activityText}><strong>{shortText(getConversationQuestion(conversation), 64)}</strong><span>{formatConversationDate(conversation.created_at)}</span></span><ArrowRight size={13} className={styles.metricIcon} /></button>)}</div> : <EmptyState icon={MessagesSquare} title="Ingen samtaler endnu" description="Når besøgende bruger botten, kommer de seneste samtaler frem her." />}</article>
      </section>
      <section className={styles.gridEqual}>
        <article className={cx(styles.card, styles.sectionCard)}><div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Populære emner</h2><p className={styles.cardDescription}>Det kunderne oftest spørger om.</p></div></div>{analytics.topics.length ? <div className={styles.topicList}>{analytics.topics.slice(0, 4).map((topic) => <div className={styles.topicRow} key={topic.label}><div><div className={styles.statusLabel}>{topic.label}</div><div className={styles.topicBarTrack}><div className={styles.topicBarFill} style={{ width: `${Math.round((topic.count / Math.max(1, analytics.topics[0].count)) * 100)}%` }} /></div></div><span className={styles.statusValue}>{topic.count}</span></div>)}</div> : <EmptyState icon={TrendingUp} title="Ikke nok data endnu" description="Emner bliver synlige, når kunderne begynder at stille spørgsmål." />}</article>
        <article className={cx(styles.card, styles.sectionCard)}><div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Botstatus</h2><p className={styles.cardDescription}>En enkel kontrol af den valgte chatbot.</p></div></div><div className={styles.statusList}><div className={styles.statusRow}><span className={styles.statusLabel}><CheckCircle2 size={15} className={activeBusiness ? styles.successIcon : styles.warningIcon} />Abonnement</span><span className={styles.statusValue}>{selectedSubscription ? formatSubscriptionStatus(selectedSubscription.status) : activeBusiness ? "Aktivt" : "Kontrollér"}</span></div><div className={styles.statusRow}><span className={styles.statusLabel}><CheckCircle2 size={15} className={selectedBusiness?.website_url ? styles.successIcon : styles.warningIcon} />Hjemmeside</span><span className={styles.statusValue}>{selectedBusiness?.website_url ? "Tilføjet" : "Mangler"}</span></div><div className={styles.statusRow}><span className={styles.statusLabel}><CheckCircle2 size={15} className={selectedBusiness?.faq || selectedBusiness?.products_services ? styles.successIcon : styles.warningIcon} />Viden</span><span className={styles.statusValue}>{selectedBusiness?.faq || selectedBusiness?.products_services ? "Klar" : "Kan forbedres"}</span></div><div className={styles.statusRow}><span className={styles.statusLabel}><Zap size={15} className={usagePercent < 80 ? styles.successIcon : styles.warningIcon} />AI-forbrug</span><span className={styles.statusValue}>{selectedSubscription ? `${usagePercent}% brugt` : "Henter…"}</span></div></div></article>
      </section>
    </>;
  }

  function renderConversations() {
    const messages = activeConversation ? normalizeMessages(activeConversation.messages) : [];
    return <>{renderPageHeader()}<div className={styles.toolbar}><div className={styles.searchWrap}><Search className={styles.searchIcon} size={15} /><input className={styles.searchInput} value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Søg i samtaler…" /></div><div className={styles.filterRow}>{([['all', 'Alle'], ['unanswered', 'Kan forbedres'], ['leads', 'Med lead']] as const).map(([value, label]) => <button key={value} className={cx(styles.filterButton, conversationFilter === value && styles.filterActive)} type="button" onClick={() => setConversationFilter(value)}>{label}</button>)}</div></div>
      <section className={cx(styles.card, styles.conversationLayout)}><div className={styles.conversationList}>{filteredConversations.length ? filteredConversations.map((conversation) => { const question = getConversationQuestion(conversation); const answer = getConversationAnswer(conversation); return <button className={cx(styles.conversationRow, activeConversation?.id === conversation.id && styles.conversationRowActive)} type="button" key={conversation.id} onClick={() => setSelectedConversationId(conversation.id)}><span className={styles.conversationRowTop}><strong>{shortText(question, 54)}</strong><span className={styles.conversationTime}>{formatConversationDate(conversation.created_at)}</span></span><span className={styles.conversationSnippet}>{shortText(answer || "Intet svar gemt", 72)}</span></button>; }) : <EmptyState icon={Search} title="Ingen samtaler matcher" description="Prøv at ændre søgningen eller filteret." />}</div>
        <div className={styles.conversationDetail}>{activeConversation ? <><div className={styles.conversationDetailHeader}><div><strong>Samtale</strong><span>{formatConversationDate(activeConversation.created_at)} · {extractPageUrl(activeConversation.messages)}</span></div>{isMissedAnswer(getConversationAnswer(activeConversation)) ? <span className={styles.warningPill}><AlertCircle size={12} />Kan forbedres</span> : <span className={styles.statusPill}><Check size={12} />Besvaret</span>}</div><div className={styles.messages}>{messages.filter((message) => !message.role.toLowerCase().includes("meta")).map((message, index) => <div key={`${message.role}-${index}`} className={message.role.toLowerCase().includes("user") ? styles.messageUser : styles.messageAssistant}>{message.content}</div>)}</div><div className={styles.conversationActions}><button className={styles.buttonSecondary} type="button" onClick={() => prepareFaqFromConversation(activeConversation)}><BookOpenText size={14} />Lav et bedre svar</button></div></> : <EmptyState icon={MessagesSquare} title="Vælg en samtale" description="Samtalen åbnes her, så du kan læse den uden at miste overblikket." />}</div>
      </section></>;
  }

  function renderCustomerMessages() {
    return <>{renderPageHeader(<Link className={styles.button} href={supportUrl}><HelpCircle size={14} />Skriv til os</Link>)}
      <section className={cx(styles.card, styles.sectionCard)}>
        <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Indbakke</h2><p className={styles.cardDescription}>Beskederne gælder {selectedBusiness?.name || "den valgte chatbot"}.</p></div></div>
        {selectedCustomerMessages.length ? <div className={styles.customerMessageList}>{selectedCustomerMessages.map((message) => <article className={cx(styles.customerMessage, !message.read_at && styles.customerMessageUnread)} key={message.id}>
          <div className={styles.customerMessageHeader}><div className={styles.customerMessageTitleRow}>{!message.read_at ? <span className={styles.unreadMark} aria-label="Ulæst besked" /> : null}<h3>{message.title}</h3></div><time dateTime={message.created_at}>{formatConversationDate(message.created_at)}</time></div>
          <p>{message.body}</p>
          {normalizeMessageActionUrl(message.action_url) ? <div className={styles.customerMessageActions}><a className={styles.buttonSecondary} href={normalizeMessageActionUrl(message.action_url)} target={normalizeMessageActionUrl(message.action_url).startsWith("https://") ? "_blank" : undefined} rel={normalizeMessageActionUrl(message.action_url).startsWith("https://") ? "noreferrer" : undefined}><ExternalLink size={14} />{message.action_label || "Åbn link"}</a></div> : null}
        </article>)}</div> : <EmptyState icon={Inbox} title="Ingen beskeder endnu" description="Når der er en ny chatbot-demo eller en vigtig opdatering, lander den her." />}
      </section>
      <section className={cx(styles.card, styles.supportCard)}><div><h2 className={styles.cardTitle}>Har du brug for hjælp?</h2><p className={styles.cardDescription}>Send en klage eller supportbesked direkte til EmbedBot. Vi udfylder din virksomhed på forhånd.</p></div><Link className={styles.buttonSecondary} href={supportUrl}><HelpCircle size={14} />Åbn kontaktformular</Link></section>
    </>;
  }

  function renderLeads() { return <>{renderPageHeader(<button className={styles.buttonSecondary} type="button" onClick={exportLeads} disabled={!analytics.leads.length}><ExternalLink size={14} />Eksportér CSV</button>)}<section className={cx(styles.card, styles.sectionCard)}><div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>{analytics.leads.length} unikke leads</h2><p className={styles.cardDescription}>Fundet i samtaler fra de seneste {rangeDays} dage.</p></div>{renderDatePills()}</div>{analytics.leads.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Kontakt</th><th>Besked</th><th>Side</th><th>Dato</th></tr></thead><tbody>{analytics.leads.map((lead) => <tr key={lead.email}><td><div className={styles.tablePrimary}>{lead.email}</div></td><td>{lead.message}</td><td>{lead.pageUrl}</td><td>{formatDate(lead.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState icon={UserRoundPlus} title="Ingen leads i perioden" description="Når en kunde deler sin e-mail i chatten, samles kontakten automatisk her." />}</section></>; }

  function renderKnowledge() { return <>{renderPageHeader()}{faqCandidate ? <section className={styles.candidateCard}><h3>Nyt svar fra en samtale</h3><p className={styles.candidateQuestion}>{faqCandidate.question}</p><label className={styles.field}><span className={styles.fieldLabel}>Det korrekte svar</span><textarea className={styles.textarea} rows={4} autoFocus value={faqCandidate.answer} onChange={(event) => setFaqCandidate({ ...faqCandidate, answer: event.target.value })} placeholder="Skriv det svar, botten skal kunne give fremover…" /></label><div className={styles.buttonRow} style={{ marginTop: 12 }}><button className={styles.button} type="button" onClick={addFaqCandidate} disabled={!faqCandidate.answer.trim()}>Føj til FAQ</button><button className={styles.buttonGhost} type="button" onClick={() => setFaqCandidate(null)}>Annuller</button></div></section> : null}<EditorSection title="Det botten skal vide" description="Opdater indholdet her, når produkter, vilkår eller tilbud ændrer sig." fields={KNOWLEDGE_FIELDS} draft={draft} onChange={updateDraftValue} onSave={() => void saveFields("knowledge", KNOWLEDGE_FIELDS)} saving={savingSection === "knowledge"} /></>; }
  function renderBehavior() { return <>{renderPageHeader()}<EditorSection title="Sådan skal botten hjælpe" description="Indstillingerne bruges direkte, når chatbotten formulerer sit svar." fields={BEHAVIOR_FIELDS} draft={draft} onChange={updateDraftValue} onSave={() => void saveFields("behavior", BEHAVIOR_FIELDS)} saving={savingSection === "behavior"} /></>; }
  function renderAppearance() { return <>{renderPageHeader()}<div className={styles.appearanceLayout}><EditorSection title="Farver og typografi" description="Hold udtrykket enkelt og genkendeligt på jeres hjemmeside." fields={APPEARANCE_FIELDS} draft={draft} onChange={updateDraftValue} onSave={() => void saveFields("appearance", APPEARANCE_FIELDS)} saving={savingSection === "appearance"} /><WidgetPreview businessName={selectedBusiness?.name || "EmbedBot"} draft={draft} /></div></>; }

  function renderInstallation() { return <>{renderPageHeader(<Link className={styles.buttonSecondary} href="/EmbedBot_Installationsguide.pdf" target="_blank"><ExternalLink size={14} />Åbn hele guiden</Link>)}<section className={styles.gridTwo}><article className={cx(styles.card, styles.sectionCard)}><div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Din installationskode</h2><p className={styles.cardDescription}>Koden er unik for {selectedBusiness?.name || "denne chatbot"}.</p></div></div><pre className={styles.embedCode}>{embedCode}</pre><div className={styles.buttonRow} style={{ marginTop: 14 }}><button className={styles.button} type="button" onClick={() => void handleCopyEmbedCode()}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Kopieret" : "Kopiér kode"}</button></div></article><article className={cx(styles.card, styles.sectionCard)}><div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Sådan går du live</h2><p className={styles.cardDescription}>Det tager normalt få minutter.</p></div></div><ol className={styles.stepList}><li className={styles.step}><span className={styles.stepNumber}>1</span><div><strong>Kopiér koden</strong><p>Brug knappen til venstre og send eventuelt koden til den, der vedligeholder hjemmesiden.</p></div></li><li className={styles.step}><span className={styles.stepNumber}>2</span><div><strong>Indsæt før &lt;/body&gt;</strong><p>Placér scriptet på alle sider, hvor chatten skal være synlig.</p></div></li><li className={styles.step}><span className={styles.stepNumber}>3</span><div><strong>Udgiv og kontrollér</strong><p>Åbn hjemmesiden i et nyt vindue og kontrollér, at chatknappen vises.</p></div></li></ol></article></section><section className={cx(styles.card, styles.sectionCard)}><div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Website</h2><p className={styles.cardDescription}>Den hjemmeside, denne bot er knyttet til.</p></div></div>{websiteUrl ? <a className={styles.buttonSecondary} href={websiteUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />{selectedBusiness?.website_url}</a> : <div className={styles.infoBanner}><AlertCircle size={15} />Tilføj hjemmesiden under Indstillinger, så installationen bliver lettere at kontrollere.</div>}</section></>; }

  function renderAnalytics() { return <>{renderPageHeader(renderDatePills())}<section className={styles.metricGrid}><MetricCard icon={MessagesSquare} label="Samtaler" value={String(analytics.conversationCount)} hint={`Seneste ${rangeDays} dage`} /><MetricCard icon={CheckCircle2} label="Løsningsgrad" value={`${analytics.resolutionRate}%`} hint="Svar uden tydelig fallback" /><MetricCard icon={UsersRound} label="Leads" value={String(analytics.leads.length)} hint="Unikke kontakter" /><MetricCard icon={Zap} label="Estimeret tid sparet" value={`${analytics.hoursSaved.toFixed(1).replace(".", ",")} t`} hint="Baseret på 4 min. pr. spørgsmål" /></section><section className={cx(styles.card, styles.sectionCard)} style={{ marginBottom: 16 }}><div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Udvikling</h2><p className={styles.cardDescription}>Hold musen over søjlerne for de præcise tal.</p></div></div><TrendChart daily={analytics.daily} /></section><section className={styles.gridEqual}><article className={cx(styles.card, styles.sectionCard)}><div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Emner</h2><p className={styles.cardDescription}>Hvad kunderne spørger om.</p></div></div>{analytics.topics.length ? <div className={styles.topicList}>{analytics.topics.map((topic) => <div className={styles.topicRow} key={topic.label}><span className={styles.statusLabel}>{topic.label}</span><span className={styles.statusValue}>{topic.count}</span></div>)}</div> : <EmptyState icon={TrendingUp} title="Ingen emner endnu" description="Der er ikke nok samtaler i den valgte periode." />}</article><article className={cx(styles.card, styles.sectionCard)}><div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Svar der kan forbedres</h2><p className={styles.cardDescription}>Gå direkte til den relevante samtale.</p></div></div>{analytics.missed.length ? <div className={styles.activityList}>{analytics.missed.slice(0, 6).map((conversation) => <button className={styles.activityButton} type="button" key={conversation.id} onClick={() => { setSelectedConversationId(conversation.id); setConversationFilter("all"); changeView("conversations"); }}><span className={styles.activityText}><strong>{shortText(getConversationQuestion(conversation), 68)}</strong><span>{formatConversationDate(conversation.created_at)}</span></span><ArrowRight size={13} /></button>)}</div> : <EmptyState icon={CheckCircle2} title="Ingen tydelige problemer" description="Botten har ikke brugt en kendt fallback i perioden." />}</article></section></>; }

  function renderBilling() {
    const subscription = selectedSubscription;
    const canManageSubscription = Boolean(subscription?.isActive && subscription.subscriptionId && subscription.customerId && !subscription.cancelAtPeriodEnd);
    const scheduledChange = subscription?.scheduledChange;
    return <>
      {renderPageHeader()}
      {subscriptionError ? <div className={styles.infoBanner}><AlertCircle size={15} />{subscriptionError}</div> : null}

      <section className={cx(styles.card, styles.billingHero)}>
        <div>
          <p className={styles.eyebrow}>Nuværende plan</p>
          <h2 className={styles.planName}>{subscription?.planName || selectedBusiness?.plan || "Starter"}</h2>
          <p className={styles.planPrice}>{subscription ? `${formatCurrency(subscription.amount, subscription.currency)} pr. ${subscription.interval === "year" ? "år" : "måned"}` : "Abonnementsprisen hentes fra Stripe"}</p>
          <p className={styles.billingHeroNote}><ShieldCheck size={14} />Sikker betaling og fakturering via Stripe</p>
        </div>
        <div className={styles.billingHeroStatus}>
          <span className={subscription?.isActive || activeBusiness ? styles.statusPill : styles.warningPill}>{subscription?.isActive || activeBusiness ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}{subscription ? formatSubscriptionStatus(subscription.status) : activeBusiness ? "Aktivt" : "Kontrollér betaling"}</span>
          <span className={styles.billingRenewal}>Fornyes {formatDate(subscription?.currentPeriodEnd)}</span>
        </div>
      </section>

      {scheduledChange ? <section className={styles.scheduledPlanBanner}>
        <CalendarClock size={19} />
        <div><strong>{scheduledChange.planName} er planlagt</strong><p>Din plan skifter {formatDate(scheduledChange.effectiveAt)}. Indtil da beholder du {subscription?.planName || "din nuværende plan"}, og der opkræves ikke noget ekstra i denne periode.</p></div>
      </section> : null}

      <section className={styles.billingDetailGrid}>
        <article className={cx(styles.card, styles.usageBlock)}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>AI-svar denne måned</h2><p className={styles.cardDescription}>Forbruget opdateres automatisk, når botten svarer.</p></div></div>
          <div className={styles.usageNumbers}><strong>{subscription ? subscription.answersUsed.toLocaleString("da-DK") : "–"} / {subscription ? subscription.answerLimit.toLocaleString("da-DK") : "–"}</strong><span>{usagePercent}% brugt</span></div>
          <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${usagePercent}%` }} /></div>
          <p className={styles.cardDescription} style={{ marginTop: 10 }}>Nulstilles {formatDate(subscription?.usageResetsAt)}</p>
        </article>
        <article className={cx(styles.card, styles.sectionCard)}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Betaling og næste periode</h2><p className={styles.cardDescription}>Hold øje med fornyelse, faktura og betalingsstatus.</p></div></div>
          <div className={styles.statusList}>
            <div className={styles.statusRow}><span className={styles.statusLabel}>Fornyelse</span><span className={styles.statusValue}>{formatDate(subscription?.currentPeriodEnd)}</span></div>
            <div className={styles.statusRow}><span className={styles.statusLabel}>Betaling</span><span className={styles.statusValue}>{subscription?.paymentStatus === "paid" ? "Betalt" : subscription?.paymentStatus || "Afventer"}</span></div>
            <div className={styles.statusRow}><span className={styles.statusLabel}>Fornyes automatisk</span><span className={styles.statusValue}>{subscription?.cancelAtPeriodEnd ? "Nej" : "Ja"}</span></div>
          </div>
          {subscription?.latestInvoice?.hostedInvoiceUrl ? <a className={styles.buttonSecondary} style={{ marginTop: 14 }} href={subscription.latestInvoice.hostedInvoiceUrl} target="_blank" rel="noreferrer"><ReceiptText size={14} />Åbn seneste faktura</a> : null}
        </article>
      </section>

      <section className={cx(styles.card, styles.paymentCard)}>
        <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Betalingsmetode</h2><p className={styles.cardDescription}>Kortoplysninger håndteres sikkert hos Stripe.</p></div><ShieldCheck size={19} className={styles.paymentSecureIcon} /></div>
        <div className={styles.paymentMethodRow}>
          <span className={styles.paymentMethodIcon}><WalletCards size={20} /></span>
          <div><strong>{subscription?.paymentMethod?.last4 ? `${formatCardBrand(subscription.paymentMethod.brand)} •••• ${subscription.paymentMethod.last4}` : "Betalingsmetode hos Stripe"}</strong><p>{subscription?.paymentMethod?.expMonth && subscription?.paymentMethod?.expYear ? `Udløber ${String(subscription.paymentMethod.expMonth).padStart(2, "0")}/${subscription.paymentMethod.expYear}` : "Kortnummeret vises aldrig i EmbedBot"}</p></div>
          <button className={styles.buttonSecondary} type="button" onClick={() => void handleOpenBillingPortal()} disabled={!subscription?.customerId || billingAction === "portal"}>{billingAction === "portal" ? <LoaderCircle className={styles.spinner} size={14} /> : <CreditCard size={14} />}Administrér kort</button>
        </div>
      </section>

      <section className={cx(styles.card, styles.planSelectorCard)}>
        <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Skift plan ved næste fornyelse</h2><p className={styles.cardDescription}>Vælg den kapacitet, der passer bedst. Din nuværende plan og pris fortsætter resten af perioden.</p></div></div>
        <div className={styles.planOptions}>
          {SELF_SERVE_BILLING_PLANS.map((plan) => {
            const isCurrentPlan = subscription?.plan === plan.plan;
            const isPendingPlan = scheduledChange?.plan === plan.plan;
            return <article key={plan.plan} className={cx(styles.planOption, isCurrentPlan && styles.planOptionCurrent, isPendingPlan && styles.planOptionPending)}>
              <div className={styles.planOptionTop}><div><h3>{plan.name}</h3><p>{formatCurrency(plan.amount, "dkk")} / md.</p></div>{isCurrentPlan ? <span className={styles.neutralPill}>Nuværende</span> : isPendingPlan ? <span className={styles.statusPill}>Planlagt</span> : null}</div>
              <p className={styles.planOptionDescription}>{plan.description}</p>
              <p className={styles.planFeature}><Check size={14} />{plan.answerLabel}</p>
              <button className={styles.buttonSecondary} type="button" disabled={!canManageSubscription || isCurrentPlan || isPendingPlan || billingAction === "plan"} onClick={() => setPlanChangeCandidate(plan)}>{isCurrentPlan ? "Din nuværende plan" : isPendingPlan ? "Skifter næste måned" : `Vælg ${plan.name}`}</button>
            </article>;
          })}
        </div>
        {!canManageSubscription ? <p className={styles.planHelpText}><AlertCircle size={14} />Planændringer er ikke tilgængelige, mens abonnementet er opsagt eller Stripe-data mangler. <Link href={supportUrl}>Skriv til os</Link>, så hjælper vi.</p> : null}
        {planChangeCandidate ? <div className={styles.planConfirmation}>
          <div><strong>Skift til {planChangeCandidate.name} fra {formatDate(subscription?.currentPeriodEnd)}</strong><p>Du betaler fortsat for {subscription?.planName || "din nuværende plan"} resten af denne periode. Den nye pris bliver {formatCurrency(planChangeCandidate.amount, "dkk")} pr. måned fra næste fornyelse.</p></div>
          <div className={styles.buttonRow}><button className={styles.button} type="button" onClick={() => void handleSchedulePlanChange()} disabled={billingAction === "plan"}>{billingAction === "plan" ? <LoaderCircle className={styles.spinner} size={14} /> : <CalendarClock size={14} />}Planlæg skift</button><button className={styles.buttonGhost} type="button" onClick={() => setPlanChangeCandidate(null)} disabled={billingAction === "plan"}>Annuller</button></div>
        </div> : null}
      </section>

      {subscription?.error ? <div className={styles.infoBanner} style={{ marginTop: 16 }}><AlertCircle size={15} />Live Stripe-data kunne ikke hentes. Den senest gemte abonnementsstatus vises, mens webhook-synkroniseringen fortsætter i baggrunden.</div> : null}
    </>;
  }

  function renderSettings() { return <>{renderPageHeader()}<div style={{ display: "grid", gap: 16 }}><EditorSection title="Virksomhed" description="De grundlæggende oplysninger, kunden ser og botten bruger." fields={IDENTITY_FIELDS} draft={draft} onChange={updateDraftValue} onSave={() => void saveFields("identity", IDENTITY_FIELDS)} saving={savingSection === "identity"} /><EditorSection title="Kontakt og åbningstider" description="Bruges når botten skal sende en kunde videre til jer." fields={CONTACT_FIELDS} draft={draft} onChange={updateDraftValue} onSave={() => void saveFields("contact", CONTACT_FIELDS)} saving={savingSection === "contact"} /></div></>; }
  function renderActiveView() { switch (activeView) { case "messages": return renderCustomerMessages(); case "conversations": return renderConversations(); case "leads": return renderLeads(); case "knowledge": return renderKnowledge(); case "behavior": return renderBehavior(); case "appearance": return renderAppearance(); case "installation": return renderInstallation(); case "analytics": return renderAnalytics(); case "billing": return renderBilling(); case "settings": return renderSettings(); default: return renderOverview(); } }
  function renderNavItems(items: NavItem[]) { return items.map((item) => { const Icon = item.icon; const badgeCount = item.badge === "attention" ? analytics.missed.length : item.badge === "messages" ? unreadCustomerMessageCount : 0; return <button className={cx(styles.navButton, activeView === item.view && styles.navActive)} type="button" key={item.view} onClick={() => changeView(item.view)}><Icon size={17} aria-hidden="true" /><span>{item.label}</span>{badgeCount ? <span className={styles.navBadge}>{badgeCount}</span> : null}</button>; }); }

  if (loading) return <main className={styles.loadingRoot}><div className={styles.loadingCard}><span className={styles.spinner} />Gør dit dashboard klar…</div></main>;

  return <main className={styles.dashboardRoot}>
    {mobileNavOpen ? <button className={styles.mobileOverlay} type="button" aria-label="Luk menu" onClick={() => setMobileNavOpen(false)} /> : null}
    <aside className={cx(styles.sidebar, mobileNavOpen && styles.sidebarOpen)}>
      <Link className={styles.brand} href="/"><span className={styles.brandMark}><Bot size={18} /></span>EmbedBot</Link>
      <div className={styles.botPickerHeader}><label className={styles.botPickerLabel} htmlFor="dashboard-bot-picker">Din chatbot</label><Link className={styles.newBotLink} href="/setup"><Plus size={12} />Ny</Link></div>
      <div className={styles.botPickerWrap}><select id="dashboard-bot-picker" className={styles.botPicker} value={selectedBusiness?.id || ""} onChange={(event) => { setSelectedBusinessId(event.target.value); setSelectedConversationId(""); }}>{businesses.map((business) => <option key={business.id} value={business.id}>{business.name || "Unavngiven chatbot"}</option>)}</select><ChevronDown className={styles.pickerChevron} size={14} /></div>
      <nav className={styles.nav} aria-label="Dashboard navigation">{renderNavItems(NAV_PRIMARY)}<div className={styles.navGroup}><span className={styles.navGroupLabel}>Forbedr botten</span>{renderNavItems(NAV_IMPROVE)}</div><div className={styles.navGroup}><span className={styles.navGroupLabel}>Konto</span>{renderNavItems(NAV_MANAGE)}</div><Link className={styles.navLink} href={supportUrl}><HelpCircle size={17} />Skriv til os</Link></nav>
      <div className={styles.sidebarFooter}><div className={styles.accountBlock}><span className={styles.avatar}>{(email[0] || "E").toUpperCase()}</span><div className={styles.accountText}><p className={styles.accountEmail}>{email || "Ukendt bruger"}</p></div><button className={styles.logoutButton} type="button" title="Log ud" aria-label="Log ud" onClick={() => void handleLogout()}><LogOut size={16} /></button></div></div>
    </aside>
    <div className={styles.mainArea}><div className={styles.mobileTopbar}><button className={styles.mobileMenuButton} type="button" aria-label={mobileNavOpen ? "Luk menu" : "Åbn menu"} onClick={() => setMobileNavOpen((open) => !open)}>{mobileNavOpen ? <X size={18} /> : <Menu size={18} />}</button><span className={styles.mobileBotName}>{selectedBusiness?.name || "EmbedBot"}</span><Link className={styles.mobileMenuButton} href="/setup" aria-label="Opret ny chatbot"><Plus size={18} /></Link></div><div className={styles.content}>{fetchError ? <div className={styles.errorBanner}><AlertCircle size={16} />{fetchError}</div> : null}{actionError ? <div className={styles.errorBanner}><AlertCircle size={16} />{actionError}</div> : null}{subscriptionLoading && activeView === "billing" ? <div className={styles.infoBanner}><span className={styles.spinner} />Henter den nyeste abonnementsstatus fra Stripe…</div> : null}{renderActiveView()}</div></div>
    {toast ? <div className={styles.toast} role="status"><CheckCircle2 size={16} className={styles.successIcon} />{toast}</div> : null}
  </main>;
}
