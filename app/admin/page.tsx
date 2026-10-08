"use client";

import AdminMfa from "@/app/components/admin-mfa";
import { createClient } from "@/lib/supabase";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  Copy,
  CreditCard,
  Eye,
  Filter,
  Gauge,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Pencil,
  RefreshCcw,
  Search,
  Server,
  Settings2,
  Trash2,
  X,
} from "lucide-react";

type Business = {
  id: string;
  name?: string | null;
  website_url?: string | null;
  support_email?: string | null;
  created_at?: string | null;
  activated?: boolean | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  fab_color?: string | null;
  chat_icon_color?: string | null;
  font_choice?: string | null;
  plan?: string | null;
  subscription_status?: string | null;
  payment_status?: string | null;
  ai_answers_used?: number | null;
  ai_answer_limit_override?: number | null;
  ai_usage_period_start?: string | null;
  current_period_end?: string | null;
  stripe_subscription_id?: string | null;
  [key: string]: unknown;
};

type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

type SupportMessage = {
  id: string;
  type?: string | null;
  name?: string | null;
  email?: string | null;
  business_name?: string | null;
  message?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type CustomerMessage = {
  id: string;
  business_id: string;
  sender: "admin" | "system";
  title: string;
  body: string;
  action_url?: string | null;
  action_label?: string | null;
  read_at?: string | null;
  created_at: string;
};

type Conversation = {
  id: string;
  business_id: string;
  created_at?: string | null;
  messages: unknown;
};

type CustomerDetail = {
  business: Business;
  conversations: Conversation[];
  knowledgeChunkCount: number;
  customerMessages: CustomerMessage[];
};

type AdminView = "overview" | "businesses" | "billing" | "support" | "system";

const ADMIN_NAV: Array<{ view: AdminView; label: string; icon: typeof LayoutDashboard }> = [
  { view: "overview", label: "Overblik", icon: LayoutDashboard },
  { view: "businesses", label: "Kunder", icon: Building2 },
  { view: "billing", label: "Planer & forbrug", icon: CreditCard },
  { view: "support", label: "Support", icon: MessageSquare },
  { view: "system", label: "Driftstatus", icon: Activity },
];

const VIEW_COPY: Record<AdminView, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "ADMINISTRATION", title: "Overblik", description: "Det vigtigste på tværs af alle EmbedBot-kunder." },
  businesses: { eyebrow: "KUNDER", title: "Kunder", description: "Åbn en kunde for at ændre chatbot, profil og integration." },
  billing: { eyebrow: "ABONNEMENTER", title: "Planer & forbrug", description: "Skift kundens plan og administrér AI-forbrug direkte i Supabase." },
  support: { eyebrow: "INDBAKKE", title: "Support", description: "Følg op på supporthenvendelser og klager." },
  system: { eyebrow: "DRIFT", title: "Driftstatus", description: "Et hurtigt billede af data, adgang og synkronisering." },
};

const statsCardClass =
  "rounded-lg border border-[var(--border)] bg-white p-4 shadow-none  text-[#20211f]";

function stringifyEditableValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function getFirstNumericField(row: Business, keys: string[]): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
}

function formatRelativeDate(input?: string | null): string {
  if (!input) {
    return "Ingen aktivitet";
  }

  const target = new Date(input);
  if (Number.isNaN(target.getTime())) {
    return "Ingen aktivitet";
  }

  const diffMs = Date.now() - target.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "Lige nu";
  }
  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)} min siden`;
  }
  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)} t siden`;
  }

  return target.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function canStartManualPilot(business: Business): boolean {
  if (
    (business.stripe_subscription_id || "").trim()
    || (business.subscription_status || "").trim().toLowerCase() === "active"
    || (business.payment_status || "").trim().toLowerCase() === "paid"
  ) {
    return false;
  }

  if ((business.subscription_status || "").trim().toLowerCase() !== "trialing") {
    return true;
  }

  const trialEnd = business.current_period_end ? new Date(business.current_period_end).getTime() : Number.NaN;
  if (!business.current_period_end && business.activated) return false;
  return !Number.isFinite(trialEnd) || trialEnd <= Date.now();
}

function canPreparePrivateDemo(business: Business): boolean {
  return !business.activated && Boolean((business.website_url || "").trim()) && Boolean((business.support_email || "").trim());
}

function normalizeMessages(raw: unknown): Array<{ role: string; content: string }> {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return { role: "assistant", content: item };
    if (!item || typeof item !== "object") return { role: "assistant", content: "" };
    const row = item as Record<string, unknown>;
    const role = typeof row.role === "string" ? row.role : typeof row.sender === "string" ? row.sender : "assistant";
    const content = typeof row.content === "string" ? row.content : typeof row.text === "string" ? row.text : typeof row.message === "string" ? row.message : "";
    return { role, content };
  }).filter((message) => message.content.trim().length > 0);
}

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const supabase = useMemo(() => createClient(), []);
  const [signedIn, setSignedIn] = useState(false);
  const [sessionEmail, setSessionEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supportError, setSupportError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, Record<string, string>>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "status">("date");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingDeleteBusiness, setPendingDeleteBusiness] = useState<Business | null>(null);
  const [deleteMfaCode, setDeleteMfaCode] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [customerDetailLoading, setCustomerDetailLoading] = useState(false);
  const [customerDetailError, setCustomerDetailError] = useState("");
  const [openCustomerConversations, setOpenCustomerConversations] = useState<Record<string, boolean>>({});
  const [customerMessageTitle, setCustomerMessageTitle] = useState("");
  const [customerMessageBody, setCustomerMessageBody] = useState("");
  const [customerMessageActionUrl, setCustomerMessageActionUrl] = useState("");
  const [customerMessageActionLabel, setCustomerMessageActionLabel] = useState("");
  const [sendingCustomerMessage, setSendingCustomerMessage] = useState(false);

  function selectView(view: AdminView) {
    setActiveView(view);
    setSidebarOpen(false);
  }

  useEffect(() => {
    let mounted = true;

    // Remove legacy plaintext credentials left by older versions.
    window.sessionStorage.removeItem("embedbot_admin_code");
    window.sessionStorage.removeItem("embedbot_admin_email");

    (async () => {
      if (!mounted) {
        return;
      }

      const {data:{user}} = await supabase.auth.getUser();
      if (!user || !mounted) return;
      setSignedIn(true);
      setSessionEmail(user.email || "Ukendt konto");
      const isAuthorized = await fetchBusinesses();
      if (isAuthorized) {
        await fetchSupportMessages();
      }
      if (mounted) {
        setIsAuthenticated(isAuthorized);
      }
    })();

    return () => {
      mounted = false;
    };
    // Restore the verified Supabase session once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushToast(message: string, type: Toast["type"] = "info") {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }

  function buildAdminHeaders() {
    return {"Content-Type":"application/json"};
  }

  async function fetchBusinesses() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "GET",
        headers: buildAdminHeaders(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kunne ikke hente virksomheder.");
      }

      setBusinesses((data.businesses || []) as Business[]);
      setLastUpdatedAt(new Date());
      return true;
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        setError(fetchError.message || "Kunne ikke hente virksomheder.");
        setAuthError(fetchError.message || "Kunne ikke hente virksomheder.");
        pushToast(fetchError.message || "Kunne ikke hente virksomheder.", "error");
      } else {
        setError("Kunne ikke hente virksomheder.");
        pushToast("Kunne ikke hente virksomheder.", "error");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function fetchSupportMessages() {
    setSupportError("");

    try {
      const res = await fetch("/api/support", {
        method: "GET",
        headers: buildAdminHeaders(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kunne ikke hente supportbeskeder.");
      }

      setSupportMessages((data.messages || []) as SupportMessage[]);
      return true;
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Kunne ikke hente supportbeskeder.";
      setSupportError(message);
      pushToast(message, "error");
      return false;
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthError("");

    const stableEmail = email.trim().toLowerCase();
    const stablePassword = password;
    if (!stableEmail || !stablePassword) {
      setAuthError("Indtast email og adgangskode.");
      return;
    }

    const {error:loginError} = await supabase.auth.signInWithPassword({email:stableEmail,password:stablePassword});
    setPassword("");
    if (loginError) { setAuthError("Login kunne ikke bekræftes."); return; }
    setSignedIn(true);
    const { data: { user } } = await supabase.auth.getUser();
    setSessionEmail(user?.email || stableEmail);

    const isAuthorized = await fetchBusinesses();
    if (!isAuthorized) {
      setIsAuthenticated(false);
      return;
    }

    await fetchSupportMessages();
    setIsAuthenticated(true);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function startEditing(business: Business) {
    const draft: Record<string, string> = {};

    Object.entries(business).forEach(([key, value]) => {
      if (key === "id" || key === "created_at") {
        return;
      }

      draft[key] = stringifyEditableValue(value);
    });

    setEditDrafts((prev) => ({ ...prev, [business.id]: draft }));
    setEditingId(business.id);
    setExpanded((prev) => ({ ...prev, [business.id]: true }));
    setError("");
    pushToast(`Redigerer ${business.name || "virksomhed"}`, "info");
  }

  function cancelEditing() {
    setEditingId(null);
  }

  function updateDraftValue(businessId: string, key: string, value: string) {
    setEditDrafts((prev) => ({
      ...prev,
      [businessId]: {
        ...(prev[businessId] || {}),
        [key]: value,
      },
    }));
  }

  async function saveBusinessEdit(business: Business) {
    const stableBusinessId = (business.id || "").trim();
    if (!stableBusinessId) {
      setError("Virksomheden mangler et gyldigt id.");
      pushToast("Virksomheden mangler et gyldigt id.", "error");
      return;
    }

    const draft = editDrafts[stableBusinessId] || {};
    const updates = Object.fromEntries(
      Object.entries(draft).filter(([key, value]) => {
        if (key === "id" || key === "created_at" || key.endsWith("_id")) {
          return false;
        }

        return value !== stringifyEditableValue(business[key]);
      })
    );

    if (Object.keys(updates).length === 0) {
      setError("Ingen aendringer at gemme.");
      pushToast("Ingen aendringer at gemme.", "info");
      return;
    }

    setSavingId(stableBusinessId);
    setError("");

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "PUT",
        headers: buildAdminHeaders(),
        body: JSON.stringify({ business_id: stableBusinessId, updates }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke gemme aendringer.");
      }

      setBusinesses((prev) => prev.map((b) => (b.id === stableBusinessId ? (data.business as Business) : b)));
      setEditingId(null);
      pushToast("AEndringer gemt", "success");
    } catch (saveError) {
      if (saveError instanceof Error) {
        setError(saveError.message);
        pushToast(saveError.message, "error");
      } else {
        setError("Kunne ikke gemme aendringer.");
        pushToast("Kunne ikke gemme aendringer.", "error");
      }
    } finally {
      setSavingId(null);
    }
  }

  async function updateBusiness(business: Business, updates: Record<string, unknown>, successMessage: string) {
    setSavingId(business.id);
    setError("");

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "PUT",
        headers: buildAdminHeaders(),
        body: JSON.stringify({ business_id: business.id, updates }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke gemme ændringen.");
      }

      setBusinesses((previous) => previous.map((row) => row.id === business.id ? data.business as Business : row));
      setCustomerDetail((previous) => previous && previous.business.id === business.id
        ? { ...previous, business: data.business as Business }
        : previous);
      pushToast(successMessage, "success");
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Kunne ikke gemme ændringen.";
      setError(message);
      pushToast(message, "error");
    } finally {
      setSavingId(null);
    }
  }

  async function startManualPilot(business: Business) {
    const agreedDate = window.prompt("Kun hvis I har aftalt automatisk afslutning med kunden: angiv slutdato (ÅÅÅÅ-MM-DD, kl. 23:59 i din lokale tidszone). Lad feltet stå tomt for en prøve uden automatisk afslutning.", "");
    if (agreedDate === null) return;
    let agreedEnd:string|null = null;
    if (agreedDate.trim()) {
      const date=agreedDate.trim();
      const parsed=new Date(`${date}T23:59:59`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toLocaleDateString("sv-SE")!==date || parsed.getTime()<=Date.now()) {
        pushToast("Angiv en gyldig fremtidig slutdato, eller lad feltet stå tomt.", "error");return;
      }
      agreedEnd=parsed.toISOString();
    }
    if (!window.confirm(agreedEnd ? `Bekræft, at kunden har aftalt automatisk afslutning senest ${agreedDate}. Start piloten og send installationsmailen?` : "Start prøven uden automatisk afslutning og send installationsmailen?")) {
      return;
    }

    setSavingId(business.id);
    setError("");

    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: buildAdminHeaders(),
        body: JSON.stringify({ business_id: business.id, agreed_trial_ends_at:agreedEnd,end_date_agreed:Boolean(agreedEnd) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke starte pilotforløbet.");
      }

      await fetchBusinesses();
      if (customerDetail?.business.id === business.id) {
        await openCustomerCenter(business);
      }
      pushToast(data.pilotEndsAt ? `Pilot startet. Aftalt afslutning ${new Date(data.pilotEndsAt).toLocaleDateString("da-DK")}.` : "Prøve startet uden automatisk afslutning.", "success");
    } catch (pilotError) {
      const message = pilotError instanceof Error ? pilotError.message : "Kunne ikke starte pilotforløbet.";
      setError(message);
      pushToast(message, "error");
    } finally {
      setSavingId(null);
    }
  }

  async function preparePrivateDemo(business: Business) {
    if (!window.confirm("Byg og send en privat chatbot-demo til webshoppen? Der starter ingen pilot endnu.")) {
      return;
    }

    const demoWindow = window.open("about:blank", "_blank", "noopener,noreferrer");
    setSavingId(business.id);
    setError("");

    try {
      const res = await fetch("/api/admin/prepare-demo", {
        method: "POST",
        headers: buildAdminHeaders(),
        body: JSON.stringify({ business_id: business.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        demoWindow?.close();
        throw new Error(data.error || "Kunne ikke bygge den private demo.");
      }

      if (demoWindow) {
        demoWindow.location.href = data.previewUrl;
      }
      const knowledgeMessage = data.reusedExistingKnowledge ? "eksisterende viden genbrugt" : `${data.chunks || 0} tekststykker indlæst`;
      pushToast(`Privat demo sendt (${knowledgeMessage}).`, "success");
    } catch (demoError) {
      const message = demoError instanceof Error ? demoError.message : "Kunne ikke bygge den private demo.";
      setError(message);
      pushToast(message, "error");
    } finally {
      setSavingId(null);
    }
  }

  async function openCustomerCenter(business: Business) {
    setCustomerDetailLoading(true);
    setCustomerDetailError("");
    setCustomerDetail(null);
    setOpenCustomerConversations({});
    setCustomerMessageTitle("");
    setCustomerMessageBody("");
    setCustomerMessageActionUrl("");
    setCustomerMessageActionLabel("");

    try {
      const res = await fetch(`/api/admin/customer?business_id=${encodeURIComponent(business.id)}`, {
        headers: buildAdminHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunne ikke hente kundens data.");
      setCustomerDetail(data as CustomerDetail);
    } catch (detailError) {
      setCustomerDetailError(detailError instanceof Error ? detailError.message : "Kunne ikke hente kundens data.");
    } finally {
      setCustomerDetailLoading(false);
    }
  }

  function fillDemoMessageTemplate(business: Business) {
    setCustomerMessageTitle("Din nye chatbot er klar");
    setCustomerMessageBody("Vi har gjort en ny version af jeres chatbot klar. Gennemgå gerne svar og udseende, og skriv til os, hvis noget skal justeres.");
    setCustomerMessageActionUrl(`https://www.embedbot.dk/preview/${business.id}`);
    setCustomerMessageActionLabel("Åbn chatbot-demo");
  }

  async function sendCustomerMessage(event: FormEvent<HTMLFormElement>, business: Business) {
    event.preventDefault();
    setSendingCustomerMessage(true);
    setCustomerDetailError("");

    try {
      const res = await fetch("/api/admin/customer-messages", {
        method: "POST",
        headers: buildAdminHeaders(),
        body: JSON.stringify({
          business_id: business.id,
          title: customerMessageTitle,
          body: customerMessageBody,
          action_url: customerMessageActionUrl,
          action_label: customerMessageActionLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke sende beskeden.");
      }

      setCustomerDetail((current) => current && current.business.id === business.id
        ? { ...current, customerMessages: [data.message as CustomerMessage, ...current.customerMessages] }
        : current);
      setCustomerMessageTitle("");
      setCustomerMessageBody("");
      setCustomerMessageActionUrl("");
      setCustomerMessageActionLabel("");
      pushToast("Beskeden er sendt til kundens dashboard", "success");
    } catch (messageError) {
      const message = messageError instanceof Error ? messageError.message : "Kunne ikke sende beskeden.";
      setCustomerDetailError(message);
      pushToast(message, "error");
    } finally {
      setSendingCustomerMessage(false);
    }
  }

  async function updateSupportStatus(message: SupportMessage, status: "new" | "read" | "archived") {
    try {
      const res = await fetch("/api/support", {
        method: "PUT",
        headers: buildAdminHeaders(),
        body: JSON.stringify({ id: message.id, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke opdatere beskeden.");
      }
      setSupportMessages((previous) => previous.map((row) => row.id === message.id ? data.message as SupportMessage : row));
      pushToast(status === "archived" ? "Besked markeret som løst" : "Supportstatus opdateret", "success");
    } catch (statusError) {
      pushToast(statusError instanceof Error ? statusError.message : "Kunne ikke opdatere beskeden.", "error");
    }
  }

  function isTextareaField(field: string) {
    return [
      "description",
      "faq",
      "products_services",
      "fallback_action",
      "complaint_action",
      "return_policy",
      "current_offers",
      "social_media",
      "welcome_message",
      "logo_data_url",
      "logo_url",
    ].includes(field);
  }

  async function deleteBusiness(id: string) {
    setDeletingId(id);
    setError("");
    setDeleteError("");

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "DELETE",
        headers: buildAdminHeaders(),
        body: JSON.stringify({ business_id: id, mfa_code: deleteMfaCode }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke slette virksomhed.");
      }

      await fetchBusinesses();
      pushToast("Virksomhed slettet", "success");
      setPendingDeleteBusiness(null);
    } catch (deleteError) {
      if (deleteError instanceof Error) {
        setError(deleteError.message);
        setDeleteError(deleteError.message);
        pushToast(deleteError.message, "error");
      } else {
        setError("Kunne ikke slette virksomhed.");
        pushToast("Kunne ikke slette virksomhed.", "error");
      }
    } finally {
      setDeletingId(null);
      setDeleteMfaCode("");
    }
  }

  async function copyScript(script: string) {
    try {
      await navigator.clipboard.writeText(script);
      pushToast("Install script kopieret", "success");
    } catch {
      pushToast("Kunne ikke kopiere script", "error");
    }
  }

  const totalBusinesses = businesses.length;
  const activeBusinesses = businesses.filter((b) => Boolean(b.activated)).length;
  const unreadSupportMessages = supportMessages.filter((message) => (message.status || "new") === "new").length;
  const totalMessages = businesses.reduce((sum, row) => {
    return (
      sum +
      getFirstNumericField(row, ["messages_answered", "message_count", "messages_count", "total_messages"])
    );
  }, 0);

  const responseTimes = businesses
    .map((row) =>
      getFirstNumericField(row, [
        "avg_response_seconds",
        "average_response_seconds",
        "avg_reply_time",
        "response_time_seconds",
      ])
    )
    .filter((value) => value > 0);

  const avgResponse =
    responseTimes.length > 0
      ? `${(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length).toFixed(1)}s`
      : "-";

  const filteredBusinesses = useMemo(() => {
    let rows = [...businesses];

    rows = rows.filter((row) => {
      if (statusFilter === "active" && !row.activated) {
        return false;
      }
      if (statusFilter === "inactive" && row.activated) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const haystack = `${row.name || ""} ${row.website_url || ""} ${row.support_email || ""}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });

    rows.sort((a, b) => {
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "", "da");
      }

      if (sortBy === "status") {
        return Number(Boolean(b.activated)) - Number(Boolean(a.activated));
      }

      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });

    return rows;
  }, [businesses, searchTerm, sortBy, statusFilter]);

  const systemOnline = Boolean(isAuthenticated && !loading && !error);

  if (!isAuthenticated) {
    return (
      <main id="main-content" className="min-h-screen bg-[var(--bg-page)] px-4 py-16 text-[#20211f]">
        <div className="mx-auto w-full max-w-md rounded-lg border border-[var(--border)] bg-white p-8 shadow-none ">
          <h1 className="text-3xl font-normal tracking-tight">EmbedBot Admin</h1>
          <p className="mt-2 text-sm text-[#6a6865]">{signedIn ? `Logget ind som ${sessionEmail}. Kontoen skal være godkendt til admin-adgang.` : "Log ind med din admin-konto for at fortsætte."}</p>

          {signedIn ? <button type="button" className="mt-4 underline" onClick={async()=>{const {error:signOutError}=await supabase.auth.signOut();if(signOutError){setAuthError("Kunne ikke logge ud. Prøv igen.");return;}setSignedIn(false);setSessionEmail("");setAuthError("");setPassword("");}}>Log ud og vælg en anden konto</button> : <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[#797773]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eksempel.dk"
                autoComplete="email"
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[#20211f] placeholder:text-[#797773] focus:border-[rgba(17,17,17,0.22)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[#797773]">
                Adgangskode
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[#20211f] placeholder:text-[#797773] focus:border-[rgba(17,17,17,0.22)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
            >
              Log ind
            </button>

          </form>}
          {authError ? <p role="alert" className="mt-4 text-sm text-[#9b3d2f]">{authError}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="min-h-screen bg-[var(--bg-page)] text-[#20211f]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[var(--bg-page)]" />

      <div className="flex min-h-screen">
        <AnimatePresence>
          {sidebarOpen ? (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-20 bg-[rgba(17,17,17,0.14)] lg:hidden"
              aria-label="Luk menu"
            />
          ) : null}
        </AnimatePresence>

        <motion.aside
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-[var(--border)] bg-[var(--bg-page)] p-5 text-[var(--text-primary)]  lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} transition-transform duration-300`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--border)] bg-white text-[#20211f] shadow-none">
                <Bot size={20} />
              </div>
              <div>
                <p className="text-sm font-medium">EmbedBot</p>
                <p className="text-xs text-[var(--text-muted)]">Admin Console</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-muted)] lg:hidden"
              aria-label="Luk sidebar"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="mt-8 space-y-1" aria-label="Admin navigation">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const isCurrent = activeView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => selectView(item.view)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${isCurrent ? "bg-[#eee9e0] font-medium text-[var(--text-primary)] shadow-none" : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"}`}
                >
                  <Icon size={17} />
                  {item.label}
                  {item.view === "support" && unreadSupportMessages > 0 ? <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-medium text-white">{unreadSupportMessages}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">System</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-[var(--text-muted)]">Embed API</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  systemOnline
                    ? "bg-[#e8f6f0] text-[#31795d]"
                    : "border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                }`}
              >
                {systemOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </motion.aside>

        <section className="w-full lg:pl-0">
          <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-white ">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-lg border border-[var(--border)] p-2 text-[#6a6865] lg:hidden"
                  aria-label="Aabn sidebar"
                >
                  <Menu size={18} />
                </button>

                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#797773]">{VIEW_COPY[activeView].eyebrow}</p>
                  <h1 className="text-base font-medium sm:text-lg">{VIEW_COPY[activeView].title}</h1>
                </div>
              </div>

              <button
                onClick={() => {
                  void fetchBusinesses();
                  void fetchSupportMessages();
                }}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[#20211f] shadow-none transition hover:bg-[rgba(246,243,237,0.9)] disabled:opacity-60"
              >
                <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
                {loading ? "Henter" : "Opdater liste"}
              </button>
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
            <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#797773]">{VIEW_COPY[activeView].eyebrow}</p>
                <h2 className="mt-1 text-3xl font-normal tracking-[-0.04em] sm:text-4xl">{VIEW_COPY[activeView].title}</h2>
                <p className="mt-2 text-sm text-[#6a6865] sm:text-base">{VIEW_COPY[activeView].description}</p>
              </div>
              {lastUpdatedAt ? <p className="text-xs text-[#797773]">Opdateret {formatRelativeDate(lastUpdatedAt.toISOString())}</p> : null}
            </section>

            {activeView === "overview" ? <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6"
            >
              <article className={statsCardClass}>
                <div className="flex items-center justify-between text-[#797773]">
                  <p className="text-xs uppercase tracking-[0.15em]">Aktive chatbots</p>
                  <Bot size={16} />
                </div>
                <p className="mt-2 text-2xl font-medium">{activeBusinesses}</p>
              </article>

              <article className={statsCardClass}>
                <div className="flex items-center justify-between text-[#797773]">
                  <p className="text-xs uppercase tracking-[0.15em]">Virksomheder</p>
                  <Building2 size={16} />
                </div>
                <p className="mt-2 text-2xl font-medium">{totalBusinesses}</p>
              </article>

              <article className={statsCardClass}>
                <div className="flex items-center justify-between text-[#797773]">
                  <p className="text-xs uppercase tracking-[0.15em]">Beskeder besvaret</p>
                  <BarChart3 size={16} />
                </div>
                <p className="mt-2 text-2xl font-medium">{totalMessages.toLocaleString("da-DK")}</p>
              </article>

              <article className={statsCardClass}>
                <div className="flex items-center justify-between text-[#797773]">
                  <p className="text-xs uppercase tracking-[0.15em]">Support</p>
                  <MessageSquare size={16} />
                </div>
                <p className="mt-2 text-2xl font-medium">{unreadSupportMessages}</p>
              </article>

              <article className={statsCardClass}>
                <div className="flex items-center justify-between text-[#797773]">
                  <p className="text-xs uppercase tracking-[0.15em]">Gns. svartid</p>
                  <Gauge size={16} />
                </div>
                <p className="mt-2 text-2xl font-medium">{avgResponse}</p>
              </article>

              <article className={statsCardClass}>
                <div className="flex items-center justify-between text-[#797773]">
                  <p className="text-xs uppercase tracking-[0.15em]">System status</p>
                  <Server size={16} />
                </div>
                <p className={`mt-2 text-2xl font-medium ${systemOnline ? "text-[#20211f]" : "text-[#6a6865]"}`}>
                  {systemOnline ? "Online" : "Offline"}
                </p>
              </article>
            </motion.section> : null}

            {activeView === "overview" ? <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
              <article className="rounded-lg border border-[var(--border)] bg-[var(--accent)] p-5 text-white shadow-none sm:p-6">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/55">Kundeportefølje</p>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div><p className="text-4xl font-medium tracking-[-0.05em]">{totalBusinesses ? Math.round((activeBusinesses / totalBusinesses) * 100) : 0}%</p><p className="mt-1 text-sm text-white/65">af kunderne har en aktiv chatbot</p></div>
                  <button onClick={() => selectView("businesses")} className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-[#20211f] transition hover:bg-[#f4f1eb]">Åbn kunder</button>
                </div>
              </article>
              <article className="rounded-lg border border-[var(--border)] bg-[rgba(232,246,240,0.86)] p-5 shadow-none sm:p-6">
                <div className="flex items-center gap-2 text-[#31795d]"><CheckCircle2 size={18} /><p className="text-xs font-medium uppercase tracking-[0.16em]">Handlinger</p></div>
                <p className="mt-4 text-lg font-medium">{unreadSupportMessages ? `${unreadSupportMessages} beskeder venter` : "Alt ser godt ud"}</p>
                <p className="mt-1 text-sm text-[#4d7868]">{unreadSupportMessages ? "Gennemgå dem i support-indbakken." : "Der er ingen åbne henvendelser lige nu."}</p>
              </article>
            </section> : null}

            {(activeView === "overview" || activeView === "support") ? <section className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-none  sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[#797773]">Indbakke</p>
                  <h2 className="text-lg font-medium">Support og klager</h2>
                </div>
                <span className="w-fit rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium text-[#6a6865]">
                  {supportMessages.length} beskeder
                </span>
              </div>

              {supportError ? (
                <p className="mb-4 rounded-lg border border-[var(--border)] bg-[rgba(246,243,237,0.72)] px-3 py-2 text-sm text-[#9b3d2f]">
                  {supportError}
                </p>
              ) : null}

              {supportMessages.length === 0 && !supportError ? (
                <div className="rounded-lg border border-dashed border-[var(--border)] bg-white px-6 py-10 text-center">
                  <p className="text-base font-medium text-[#20211f]">Ingen supportbeskeder endnu</p>
                  <p className="mt-1 text-sm text-[#797773]">Nye beskeder fra /support lander her.</p>
                </div>
              ) : null}

              {supportMessages.length > 0 ? (
                <div className="grid gap-3">
                  {supportMessages.map((supportMessage) => {
                    const isComplaint = supportMessage.type === "complaint";

                    return (
                      <article
                        key={supportMessage.id}
                        className="rounded-lg border border-[var(--border)] bg-white p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  isComplaint
                                    ? "bg-[var(--accent)] text-white"
                                    : "border border-[var(--border)] bg-white text-[#6a6865]"
                                }`}
                              >
                                {isComplaint ? "Klage" : "Besked"}
                              </span>
                              <h3 className="text-base font-medium">{supportMessage.name || "Uden navn"}</h3>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#797773]">
                              <a className="hover:text-[#20211f]" href={`mailto:${supportMessage.email || ""}`}>
                                {supportMessage.email || "-"}
                              </a>
                              <span>{supportMessage.business_name || "Ingen virksomhed angivet"}</span>
                              <span>
                                {supportMessage.created_at
                                  ? new Date(supportMessage.created_at).toLocaleString("da-DK")
                                  : "-"}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${supportMessage.status === "archived" ? "bg-[#e8f6f0] text-[#31795d]" : "border border-[var(--border)] bg-white text-[#6a6865]"}`}>{supportMessage.status === "archived" ? "Løst" : supportMessage.status === "read" ? "I gang" : "Ny"}</span>
                            {supportMessage.status !== "archived" ? <button onClick={() => void updateSupportStatus(supportMessage, "archived")} className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1 text-xs font-medium text-[#20211f] hover:bg-[#f4f1eb]">Markér løst</button> : null}
                          </div>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-[var(--border)] bg-[rgba(246,243,237,0.62)] p-3 text-sm leading-6 text-[#20211f]">
                          {supportMessage.message || "-"}
                        </p>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </section> : null}

            {activeView === "billing" ? <section className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-none  sm:p-5">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-[#797773]">Supabase · businesses</p><h3 className="mt-1 text-xl font-medium">Kundeplaner og AI-forbrug</h3></div><span className="w-fit rounded-full bg-[#f4f1eb] px-3 py-1 text-xs font-medium text-[#6a6865]">{businesses.length} kunder</span></div>
              <div className="grid gap-3">
                {businesses.map((business) => {
                  const plan = typeof business.plan === "string" ? business.plan : "starter";
                  const used = getFirstNumericField(business, ["ai_answers_used"]);
                  const limit = getFirstNumericField(business, ["ai_answer_limit_override"]) || ({ starter: 1000, growth: 5000, scale: 15000, enterprise: 30000 }[plan] || 1000);
                  const usage = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
                  return <article key={business.id} className="rounded-lg border border-[var(--border)] bg-white p-4"><div className="grid gap-4 lg:grid-cols-[minmax(190px,1fr)_190px_minmax(180px,1fr)_auto] lg:items-center"><div><p className="font-medium">{business.name || "Uden navn"}</p><p className="mt-1 text-xs text-[#797773]">{business.support_email || business.website_url || "Ingen kontaktoplysning"}</p></div><label className="grid gap-1 text-xs font-medium text-[#6a6865]"><span>Plan</span><select value={plan} onChange={(event) => void updateBusiness(business, { plan: event.target.value }, "Kundeplan opdateret")} disabled={savingId === business.id} className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-2 text-sm font-medium text-[#20211f] outline-none"><option value="starter">Starter</option><option value="growth">Growth</option><option value="scale">Scale</option><option value="enterprise">Enterprise</option></select></label><div><div className="flex justify-between gap-3 text-xs text-[#6a6865]"><span>AI-svar</span><span>{used.toLocaleString("da-DK")} / {limit.toLocaleString("da-DK")}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f0ede7]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${usage}%` }} /></div><div className="mt-2 flex gap-2"><button onClick={() => void updateBusiness(business, { ai_answers_used: 0 }, "AI-forbrug nulstillet")} disabled={savingId === business.id} className="text-xs font-medium text-[#6a6865] underline underline-offset-4 hover:text-[#20211f]">Nulstil forbrug</button>{plan === "enterprise" ? <button onClick={() => { const value = window.prompt("Ny månedlig AI-grænse (mindst 30.000)", String(limit)); if (value) void updateBusiness(business, { ai_answer_limit_override: value }, "Enterprise-grænse opdateret"); }} className="text-xs font-medium text-[#6a6865] underline underline-offset-4 hover:text-[#20211f]">Tilpas grænse</button> : null}</div></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${business.subscription_status === "active" || business.subscription_status === "trialing" ? "bg-[#e8f6f0] text-[#31795d]" : "bg-[#f4f1eb] text-[#6a6865]"}`}>{business.subscription_status || "Ingen status"}</span></div></article>;
                })}
              </div>
            </section> : null}

            {activeView === "system" ? <section className="grid gap-4 md:grid-cols-2"><article className={statsCardClass}><div className="flex items-center gap-2"><Server size={17}/><h3 className="font-medium">Datakilde</h3></div><p className="mt-3 text-sm text-[#6a6865]">Kundedata hentes fra Supabase med service-role på serveren. Skrivehandlinger kræver admin-adgang og CSRF-header.</p><div className="mt-4 flex items-center gap-2 text-sm font-medium"><span className={`h-2 w-2 rounded-full ${systemOnline ? "bg-[#31795d]" : "bg-[#b86f3b]"}`} />{systemOnline ? "Forbundet" : "Kontrollér forbindelsen"}</div></article><article className={statsCardClass}><div className="flex items-center gap-2"><Settings2 size={17}/><h3 className="font-medium">Seneste synkronisering</h3></div><p className="mt-3 text-sm text-[#6a6865]">{lastUpdatedAt ? lastUpdatedAt.toLocaleString("da-DK") : "Ikke hentet endnu"}</p><button onClick={() => { void fetchBusinesses(); void fetchSupportMessages(); }} className="mt-4 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">Opdatér data</button></article></section> : null}

            {activeView === "system" ? <section className={statsCardClass}>
              <h3 className="font-medium">Sikkerhed</h3>
              <p className="mt-3 text-sm text-[#6a6865]">Sletning af en aktiv chatbot kræver en frisk kode fra din authenticator. Koden kontrolleres, før chatbotten slettes eller et abonnement stoppes.</p>
              <AdminMfa onVerified={async()=>{const allowed=await fetchBusinesses();if(!allowed)setIsAuthenticated(false);}} />
            </section> : null}

            {activeView === "businesses" ? <section className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-none  sm:p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-medium">Virksomheder</h2>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 text-[#797773]" size={16} />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Soeg navn, email, website"
                      className="w-full rounded-lg border border-[var(--border)] bg-white py-2 pl-9 pr-3 text-sm text-[#20211f] placeholder:text-[#797773] focus:border-[rgba(17,17,17,0.22)] focus:outline-none"
                    />
                  </label>

                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[#6a6865]">
                    <Filter size={15} />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                      className="bg-transparent text-sm outline-none"
                    >
                      <option value="all" className="bg-white text-[#20211f]">
                        Alle
                      </option>
                      <option value="active" className="bg-white text-[#20211f]">
                        Aktiv
                      </option>
                      <option value="inactive" className="bg-white text-[#20211f]">
                        Inaktiv
                      </option>
                    </select>
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "date" | "name" | "status")}
                    className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[#6a6865] outline-none focus:border-[rgba(17,17,17,0.22)]"
                  >
                    <option value="date">Sorter: Dato</option>
                    <option value="name">Sorter: Navn</option>
                    <option value="status">Sorter: Status</option>
                  </select>
                </div>
              </div>

              {error ? (
                <p className="mb-4 rounded-lg border border-[var(--border)] bg-[rgba(246,243,237,0.72)] px-3 py-2 text-sm text-[#9b3d2f]">
                  {error}
                </p>
              ) : null}

              {lastUpdatedAt ? <p className="mb-3 text-xs text-[#797773]">Sidst opdateret: {lastUpdatedAt.toLocaleString("da-DK")}</p> : null}

              {loading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`skeleton-${index}`} className="animate-pulse rounded-lg border border-[var(--border)] bg-white p-4">
                      <div className="h-4 w-40 rounded bg-[rgba(17,17,17,0.10)]" />
                      <div className="mt-3 h-3 w-56 rounded bg-[rgba(17,17,17,0.08)]" />
                      <div className="mt-2 h-3 w-44 rounded bg-[rgba(17,17,17,0.08)]" />
                    </div>
                  ))}
                </div>
              ) : null}

              {!loading && filteredBusinesses.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border)] bg-white px-6 py-14 text-center">
                  <p className="text-base font-medium text-[#20211f]">Ingen virksomheder matcher dit filter</p>
                  <p className="mt-1 text-sm text-[#797773]">Proev en anden soegning eller opdater listen.</p>
                </div>
              ) : null}

              {!loading ? (
                <div className="grid gap-3">
                  {filteredBusinesses.map((business) => {
                    const isOpen = Boolean(expanded[business.id]);
                    const isActive = Boolean(business.activated);
                    const isEditing = editingId === business.id;
                    const draft = editDrafts[business.id] || {};

                    const primaryColor = (business.primary_color || "").trim() || "#20211f";
                    const secondaryColor = (business.secondary_color || "").trim() || "#f5f5f5";
                    const fabColor = (business.fab_color || "").trim() || (business.chat_icon_color || "").trim() || "#20211f";
                    const fontChoice = (business.font_choice || "").trim() || "Poppins";

                    const installScript = `<script\n  src=\"https://www.embedbot.dk/widget.js?id=${business.id}\"\n  data-name=\"${business.name || "Support"}\"\n  data-primary-color=\"${primaryColor}\"\n  data-secondary-color=\"${secondaryColor}\"\n  data-fab-color=\"${fabColor}\"\n  data-font=\"${fontChoice}\">\n<\\/script>`;

                    const messagesCount = getFirstNumericField(business, [
                      "messages_answered",
                      "message_count",
                      "messages_count",
                      "total_messages",
                    ]);
                    const lastActive = formatRelativeDate(
                      typeof business.last_active_at === "string"
                        ? business.last_active_at
                        : typeof business.updated_at === "string"
                          ? business.updated_at
                          : business.created_at
                    );

                    return (
                      <motion.article
                        key={business.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-none"
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-medium">{business.name || "Uden navn"}</h3>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  isActive
                                    ? "bg-[var(--accent)] text-white"
                                    : "border border-[var(--border)] bg-white text-[#6a6865]"
                                }`}
                              >
                                {isActive ? "Aktiv" : "Inaktiv"}
                              </span>
                            </div>

                            <div className="mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm text-[#797773]">
                              <p className="min-w-0">
                                Website:{" "}
                                <span className="inline-block max-w-full truncate align-bottom lg:max-w-[42rem]">
                                  {business.website_url || "-"}
                                </span>
                              </p>
                              <p className="min-w-0">
                                Email:{" "}
                                <span className="inline-block max-w-full truncate align-bottom lg:max-w-[20rem]">
                                  {business.support_email || "-"}
                                </span>
                              </p>
                              <p>
                                Oprettet:{" "}
                                {business.created_at
                                  ? new Date(business.created_at).toLocaleString("da-DK")
                                  : "-"}
                              </p>
                              <p>Sidst aktiv: {lastActive}</p>
                              <p>Beskeder: {messagesCount.toLocaleString("da-DK")}</p>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                            <button
                              onClick={() => toggleExpand(business.id)}
                              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[#20211f] transition hover:bg-[rgba(246,243,237,0.9)]"
                            >
                              {isOpen ? "Skjul" : "Se info"}
                            </button>

                            <select
                              defaultValue=""
                              onChange={(e) => {
                                const value = e.target.value;
                                e.target.value = "";

                                if (value === "edit") {
                                  startEditing(business);
                                } else if (value === "demo") {
                                  void preparePrivateDemo(business);
                                } else if (value === "pilot") {
                                  void startManualPilot(business);
                                } else if (value === "delete") {
                                  setDeleteMfaCode("");
                                  setDeleteError("");
                                  setPendingDeleteBusiness(business);
                                }
                              }}
                              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[#20211f] outline-none"
                              disabled={
                                deletingId === business.id ||
                                savingId === business.id
                              }
                            >
                              <option value="">Quick actions</option>
                              <option value="edit">Rediger</option>
                              {canPreparePrivateDemo(business) ? <option value="demo">Byg og send privat demo</option> : null}
                              {canStartManualPilot(business) ? <option value="pilot">Start prøve — slutdato efter aftale</option> : null}
                              <option value="delete">Slet</option>
                            </select>

                            <button
                              onClick={() => void openCustomerCenter(business)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
                            >
                              <Eye size={14} /> Kundecenter
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isOpen ? (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-4 overflow-hidden border-t border-[var(--border)] pt-4"
                            >
                              {isActive ? (
                                <div className="rounded-lg border border-[var(--border)] bg-white p-3">
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-xs uppercase tracking-[0.16em] text-[#797773]">Install script</p>
                                    <button
                                      onClick={() => copyScript(installScript)}
                                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs text-[#6a6865] transition hover:bg-[rgba(246,243,237,0.9)] hover:text-[#20211f]"
                                    >
                                      <Copy size={12} /> Kopier
                                    </button>
                                  </div>
                                  <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-[var(--border)] bg-[rgba(246,243,237,0.72)] p-3 text-xs text-[#20211f]">
                                    {installScript}
                                  </pre>
                                </div>
                              ) : null}

                              <div className="mt-3 flex flex-wrap gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => saveBusinessEdit(business)}
                                      disabled={savingId === business.id}
                                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
                                    >
                                      <Pencil size={14} /> {savingId === business.id ? "Gemmer" : "Gem"}
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[#20211f]"
                                    >
                                      Annuller
                                    </button>
                                  </>
                                ) : null}

                                <button
                                  onClick={() => {setDeleteMfaCode("");setDeleteError("");setPendingDeleteBusiness(business);}}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[#20211f] transition hover:bg-[rgba(246,243,237,0.9)]"
                                >
                                  <Trash2 size={14} /> Slet
                                </button>
                              </div>

                              <div className="mt-3 grid gap-2">
                                {Object.entries(business).map(([key, value]) => {
                                  const isReadOnlyKey = key === "id" || key === "created_at" || key.endsWith("_id");
                                  const text =
                                    value === null || value === undefined
                                      ? "-"
                                      : typeof value === "string" ||
                                          typeof value === "number" ||
                                          typeof value === "boolean"
                                        ? String(value)
                                        : JSON.stringify(value);

                                  return (
                                    <div
                                      key={`${business.id}-${key}`}
                                      className="grid grid-cols-1 gap-1 rounded-lg border border-[var(--border)] bg-white p-2 text-sm md:grid-cols-[220px_1fr]"
                                    >
                                      <span className="font-medium text-[#797773]">{key}</span>
                                      <span className="min-w-0 break-words text-[#20211f]">
                                        {isEditing && !isReadOnlyKey ? (
                                          isTextareaField(key) ? (
                                            <textarea
                                              value={draft[key] ?? ""}
                                              onChange={(e) => updateDraftValue(business.id, key, e.target.value)}
                                              className="min-h-[84px] w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-[#20211f] outline-none focus:border-[rgba(17,17,17,0.22)]"
                                            />
                                          ) : (
                                            <input
                                              value={draft[key] ?? ""}
                                              onChange={(e) => updateDraftValue(business.id, key, e.target.value)}
                                              className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-[#20211f] outline-none focus:border-[rgba(17,17,17,0.22)]"
                                            />
                                          )
                                        ) : (
                                          text
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </motion.article>
                    );
                  })}
                </div>
              ) : null}
            </section> : null}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {customerDetailLoading || customerDetail || customerDetailError ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 overflow-y-auto bg-[rgba(17,17,17,0.3)] p-3 sm:p-6"
            onClick={() => {
              if (!customerDetailLoading) {
                setCustomerDetail(null);
                setCustomerDetailError("");
              }
            }}
          >
            <motion.section
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.985 }}
              onClick={(event) => event.stopPropagation()}
              className="mx-auto my-3 w-full max-w-6xl rounded-lg border border-[rgba(17,17,17,0.09)] bg-[#f4f1eb] p-4 text-[#20211f] shadow-none sm:my-8 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#797773]">Kundecenter</p>
                  <h2 className="mt-1 text-2xl font-medium tracking-[-0.04em] sm:text-3xl">{customerDetail?.business.name || (customerDetailLoading ? "Henter kundedata…" : "Kundedata")}</h2>
                  {customerDetail?.business.website_url ? <p className="mt-1 text-sm text-[#6a6865]">{customerDetail.business.website_url}</p> : null}
                </div>
                <button onClick={() => { setCustomerDetail(null); setCustomerDetailError(""); }} disabled={customerDetailLoading} className="rounded-lg border border-[var(--border)] bg-white p-2 text-[#6a6865] hover:text-[#20211f] disabled:opacity-50" aria-label="Luk kundecenter"><X size={18} /></button>
              </div>

              {customerDetailLoading ? <div className="mt-6 grid min-h-64 place-items-center rounded-lg border border-dashed border-[rgba(17,17,17,0.12)] bg-white/70"><span className="text-sm text-[#6a6865]">Henter chatbotdata og samtaler…</span></div> : null}
              {customerDetailError ? <div className="mt-6 rounded-lg border border-[rgba(155,61,47,0.16)] bg-[rgba(255,245,242,0.9)] p-4 text-sm text-[#9b3d2f]">{customerDetailError}</div> : null}

              {customerDetail ? (() => {
                const business = customerDetail.business;
                const plan = typeof business.plan === "string" ? business.plan : "starter";
                const used = getFirstNumericField(business, ["ai_answers_used"]);
                const limit = getFirstNumericField(business, ["ai_answer_limit_override"]) || ({ starter: 1000, growth: 5000, scale: 15000, enterprise: 30000 }[plan] || 1000);
                const chatbotFields = [
                  ["Velkomstbesked", "welcome_message"], ["Tone", "tone"], ["Sprog", "language"], ["Branche", "industry"],
                  ["Tilpassede instruktioner", "custom_instructions"], ["FAQ", "faq"], ["Produkter & ydelser", "products_services"], ["Fallback-handling", "fallback_action"],
                ] as const;
                return <div className="mt-6 grid gap-5">
                  <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
                    <article className="rounded-lg bg-[var(--accent)] p-5 text-white"><p className="text-xs font-medium uppercase tracking-[0.16em] text-white/55">Plan og forbrug</p><div className="mt-4 grid gap-4 sm:grid-cols-[190px_1fr]"><label className="grid gap-1 text-xs font-medium text-white/65"><span>Kundens plan</span><select value={plan} onChange={(event) => void updateBusiness(business, { plan: event.target.value }, "Kundeplan opdateret")} disabled={savingId === business.id} className="rounded-lg border border-[var(--border)] bg-white/10 px-3 py-2.5 text-sm font-medium text-white outline-none"><option className="bg-[var(--accent)]" value="starter">Starter · 1.000 svar</option><option className="bg-[var(--accent)]" value="growth">Growth · 5.000 svar</option><option className="bg-[var(--accent)]" value="scale">Scale · 15.000 svar</option><option className="bg-[var(--accent)]" value="enterprise">Enterprise · individuel</option></select></label><div><div className="flex justify-between gap-3 text-xs text-white/65"><span>AI-forbrug denne måned</span><span>{used.toLocaleString("da-DK")} / {limit.toLocaleString("da-DK")}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))}%` }} /></div><button onClick={() => void updateBusiness(business, { ai_answers_used: 0 }, "AI-forbrug nulstillet")} disabled={savingId === business.id} className="mt-3 text-xs font-medium text-white underline underline-offset-4 disabled:opacity-50">Nulstil forbrug</button></div></div></article>
                    <article className="rounded-lg border border-[var(--border)] bg-white p-5"><p className="text-xs font-medium uppercase tracking-[0.16em] text-[#797773]">Chatbotstatus</p><div className="mt-4 grid gap-3 text-sm"><div className="flex justify-between gap-3"><span className="text-[#6a6865]">Abonnement</span><span className="font-medium">{business.subscription_status || "Ukendt"}</span></div><div className="flex justify-between gap-3"><span className="text-[#6a6865]">Betaling</span><span className="font-medium">{business.payment_status || "Ukendt"}</span></div><div className="flex justify-between gap-3"><span className="text-[#6a6865]">Aktiv chatbot</span><span className="font-medium">{business.activated ? "Ja" : "Nej"}</span></div><div className="flex justify-between gap-3"><span className="text-[#6a6865]">Indekseret viden</span><span className="font-medium">{customerDetail.knowledgeChunkCount} tekststykker</span></div></div></article>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
                    <form onSubmit={(event) => void sendCustomerMessage(event, business)} className="rounded-lg border border-[var(--border)] bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-[#797773]">Besked til kunden</p><h3 className="mt-1 text-xl font-medium">Send til dashboardet</h3><p className="mt-1 text-sm text-[#6a6865]">Kunden ser beskeden som ulæst under Beskeder.</p></div>
                        <button type="button" onClick={() => fillDemoMessageTemplate(business)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium hover:bg-[#f4f1eb]">Brug demo-skabelon</button>
                      </div>
                      <div className="mt-4 grid gap-3">
                        <label className="grid gap-1 text-xs font-medium text-[#6a6865]"><span>Overskrift</span><input required maxLength={160} value={customerMessageTitle} onChange={(event) => setCustomerMessageTitle(event.target.value)} className="rounded-lg border border-[rgba(17,17,17,0.12)] px-3 py-2.5 text-sm text-[#20211f] outline-none focus:border-[rgba(17,17,17,0.28)]" placeholder="Fx Din nye chatbot er klar" /></label>
                        <label className="grid gap-1 text-xs font-medium text-[#6a6865]"><span>Besked</span><textarea required maxLength={5000} rows={5} value={customerMessageBody} onChange={(event) => setCustomerMessageBody(event.target.value)} className="rounded-lg border border-[rgba(17,17,17,0.12)] px-3 py-2.5 text-sm leading-6 text-[#20211f] outline-none focus:border-[rgba(17,17,17,0.28)]" placeholder="Skriv beskeden, som kunden skal se" /></label>
                        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                          <label className="grid gap-1 text-xs font-medium text-[#6a6865]"><span>Valgfrit link</span><input value={customerMessageActionUrl} onChange={(event) => setCustomerMessageActionUrl(event.target.value)} className="rounded-lg border border-[rgba(17,17,17,0.12)] px-3 py-2.5 text-sm text-[#20211f] outline-none focus:border-[rgba(17,17,17,0.28)]" placeholder="https://…" /></label>
                          <label className="grid gap-1 text-xs font-medium text-[#6a6865]"><span>Knaptekst</span><input value={customerMessageActionLabel} onChange={(event) => setCustomerMessageActionLabel(event.target.value)} className="rounded-lg border border-[rgba(17,17,17,0.12)] px-3 py-2.5 text-sm text-[#20211f] outline-none focus:border-[rgba(17,17,17,0.28)]" placeholder="Åbn demo" /></label>
                        </div>
                        <button type="submit" disabled={sendingCustomerMessage} className="rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white hover:bg-[#292524] disabled:cursor-wait disabled:opacity-60">{sendingCustomerMessage ? "Sender…" : "Send besked"}</button>
                      </div>
                    </form>

                    <article className="rounded-lg border border-[var(--border)] bg-white p-5">
                      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-[#797773]">Sendte beskeder</p><h3 className="mt-1 text-xl font-medium">Historik</h3></div><span className="rounded-full bg-[#f4f1eb] px-3 py-1 text-xs font-medium text-[#6a6865]">{customerDetail.customerMessages.length}</span></div>
                      {customerDetail.customerMessages.length ? <div className="mt-4 grid max-h-[430px] gap-3 overflow-y-auto pr-1">{customerDetail.customerMessages.map((message) => <div key={message.id} className="rounded-lg border border-[var(--border)] bg-[#f4f1eb] p-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm">{message.title}</strong><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${message.read_at ? "bg-[#e8f6f0] text-[#31795d]" : "bg-white text-[#6a6865]"}`}>{message.read_at ? "Læst" : "Ulæst"}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4f4942]">{message.body}</p><p className="mt-2 text-xs text-[#797773]">{new Date(message.created_at).toLocaleString("da-DK")}</p></div>)}</div> : <div className="mt-4 rounded-lg border border-dashed border-[rgba(17,17,17,0.12)] bg-[#f4f1eb] px-4 py-8 text-center text-sm text-[#6a6865]">Ingen beskeder sendt endnu.</div>}
                    </article>
                  </section>

                  <section className="rounded-lg border border-[var(--border)] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-[#797773]">Chatbot-data</p><h3 className="mt-1 text-xl font-medium">Det botten ved og siger</h3></div><button onClick={() => { startEditing(business); setCustomerDetail(null); }} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[#f4f1eb]">Redigér data</button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{chatbotFields.map(([label, key]) => { const value = business[key]; return <div key={key} className="rounded-lg bg-[#f4f1eb] p-3"><p className="text-xs font-medium text-[#797773]">{label}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{typeof value === "string" && value.trim() ? value : "Ikke angivet"}</p></div>; })}</div></section>

                  <section className="rounded-lg border border-[var(--border)] bg-white p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-[#797773]">Samtaler</p><h3 className="mt-1 text-xl font-medium">Kundens samtalehistorik</h3><p className="mt-1 text-sm text-[#6a6865]">Viser de seneste {customerDetail.conversations.length} samtaler.</p></div><span className="w-fit rounded-full bg-[#f4f1eb] px-3 py-1 text-xs font-medium text-[#6a6865]">{customerDetail.conversations.length} samtaler</span></div>{customerDetail.conversations.length ? <div className="mt-4 grid gap-2">{customerDetail.conversations.map((conversation) => { const isOpen = Boolean(openCustomerConversations[conversation.id]); const messages = normalizeMessages(conversation.messages); return <article key={conversation.id} className="overflow-hidden rounded-lg border border-[var(--border)]"><button onClick={() => setOpenCustomerConversations((previous) => ({ ...previous, [conversation.id]: !previous[conversation.id] }))} className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left hover:bg-[#faf9f6]"><span><strong className="block text-sm">{messages.find((message) => message.role.toLowerCase().includes("user"))?.content.slice(0, 90) || "Samtale uden spørgsmål"}</strong><span className="mt-1 block text-xs text-[#797773]">{conversation.created_at ? new Date(conversation.created_at).toLocaleString("da-DK") : "Ukendt tidspunkt"} · {messages.length} beskeder</span></span><ChevronDown size={17} className={`shrink-0 text-[#797773] transition ${isOpen ? "rotate-180" : ""}`} /></button>{isOpen ? <div className="grid gap-2 border-t border-[var(--border)] bg-[#f4f1eb] p-3">{messages.length ? messages.map((message, index) => <div key={`${conversation.id}-${index}`} className={`max-w-[88%] rounded-lg px-3 py-2 text-sm leading-6 ${message.role.toLowerCase().includes("user") ? "justify-self-end bg-[var(--accent)] text-white" : "bg-white text-[#20211f]"}`}>{message.content}</div>) : <p className="text-sm text-[#797773]">Ingen beskeder i samtalen.</p>}</div> : null}</article>; })}</div> : <div className="mt-4 rounded-lg border border-dashed border-[rgba(17,17,17,0.12)] bg-[#f4f1eb] px-4 py-8 text-center text-sm text-[#6a6865]">Ingen samtaler endnu.</div>}</section>
                </div>;
              })() : null}
            </motion.section>
          </motion.div>
        ) : null}

        {pendingDeleteBusiness ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 grid place-items-center bg-[rgba(17,17,17,0.18)] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.96)] p-5 text-[#20211f] shadow-none"
            >
              <h3 className="text-lg font-medium">Slet virksomhed</h3>
              <p className="mt-2 text-sm text-[#6a6865]">
                Er du sikker pa at du vil slette <strong>{pendingDeleteBusiness.name || "denne virksomhed"}</strong>? Denne handling kan ikke fortrydes.
              </p>

              {pendingDeleteBusiness.activated ? <label className="mt-4 block text-sm">
                Bekræft sletning med en frisk kode fra din authenticator
                <input aria-label="Authenticator-kode til sletning" className="mt-2 block w-full rounded-lg border p-2" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={deleteMfaCode} onChange={(event) => setDeleteMfaCode(event.target.value.replace(/[^0-9]/g, ""))} disabled={deletingId !== null} />
              </label> : null}
              {deleteError ? <p role="alert" className="mt-3 text-sm text-[#9b3d2f]">{deleteError}</p> : null}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  disabled={deletingId !== null}
                  onClick={() => {setPendingDeleteBusiness(null);setDeleteMfaCode("");setDeleteError("");}}
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[#20211f]"
                >
                  Annuller
                </button>
                <button
                  onClick={() => deleteBusiness(pendingDeleteBusiness.id)}
                  disabled={deletingId === pendingDeleteBusiness.id || Boolean(pendingDeleteBusiness.activated && !/^[0-9]{6}$/.test(deleteMfaCode))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
                >
                  {deletingId === pendingDeleteBusiness.id ? "Sletter" : "Slet"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="fixed bottom-4 right-4 z-50 grid gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 30, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20 }}
              className={`rounded-lg border px-3 py-2 text-sm shadow-xl ${
                toast.type === "success"
                  ? "border-[var(--border)] bg-white text-[#20211f]"
                  : toast.type === "error"
                    ? "border-[var(--border)] bg-[rgba(246,243,237,0.78)] text-[#9b3d2f]"
                    : "border-[var(--border)] bg-white text-[#6a6865]"
              }`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
