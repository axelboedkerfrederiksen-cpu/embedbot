"use client";

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
  "rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.94)] p-4 shadow-[0_18px_40px_rgba(17,17,17,0.05)] backdrop-blur text-[#111111]";

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
  const [adminCode, setAdminCode] = useState("");
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
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [customerDetailLoading, setCustomerDetailLoading] = useState(false);
  const [customerDetailError, setCustomerDetailError] = useState("");
  const [openCustomerConversations, setOpenCustomerConversations] = useState<Record<string, boolean>>({});

  function selectView(view: AdminView) {
    setActiveView(view);
    setSidebarOpen(false);
  }

  useEffect(() => {
    let mounted = true;

    const savedAdminCode = typeof window !== "undefined" ? window.sessionStorage.getItem("embedbot_admin_code") || "" : "";
    const savedAdminEmail = typeof window !== "undefined" ? window.sessionStorage.getItem("embedbot_admin_email") || "" : "";
    if (savedAdminCode) {
      setAdminCode(savedAdminCode);
    }
    if (savedAdminEmail) {
      setEmail(savedAdminEmail);
    }

    if (!savedAdminCode || !savedAdminEmail) {
      return () => {
        mounted = false;
      };
    }

    (async () => {
      if (!mounted) {
        return;
      }

      const isAuthorized = await fetchBusinesses(savedAdminCode, savedAdminEmail);
      if (isAuthorized) {
        await fetchSupportMessages(savedAdminCode, savedAdminEmail);
      }
      if (mounted) {
        setIsAuthenticated(isAuthorized);
      }
    })();

    return () => {
      mounted = false;
    };
    // Restore the existing admin session once on mount; credentials are passed explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushToast(message: string, type: Toast["type"] = "info") {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }

  function buildAdminHeaders(adminCodeOverride?: string, adminEmailOverride?: string) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-csrf-token": "admin-ui",
    };

    const stableAdminCode = (adminCodeOverride ?? adminCode).trim();
    const stableAdminEmail = (adminEmailOverride ?? email).trim().toLowerCase();
    if (stableAdminCode) {
      headers["x-admin-password"] = stableAdminCode;
    }
    if (stableAdminEmail) {
      headers["x-admin-email"] = stableAdminEmail;
    }

    return headers;
  }

  async function fetchBusinesses(adminCodeOverride?: string, adminEmailOverride?: string) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "GET",
        headers: buildAdminHeaders(adminCodeOverride, adminEmailOverride),
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

  async function fetchSupportMessages(adminCodeOverride?: string, adminEmailOverride?: string) {
    setSupportError("");

    try {
      const res = await fetch("/api/support", {
        method: "GET",
        headers: buildAdminHeaders(adminCodeOverride, adminEmailOverride),
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
    const stablePassword = password.trim();
    if (!stableEmail || !stablePassword) {
      setAuthError("Indtast email og adgangskode.");
      return;
    }

    setAdminCode(stablePassword);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("embedbot_admin_code", stablePassword);
      window.sessionStorage.setItem("embedbot_admin_email", stableEmail);
    }

    const isAuthorized = await fetchBusinesses(stablePassword, stableEmail);
    if (!isAuthorized) {
      setIsAuthenticated(false);
      setAuthError("Forkert admin-email eller admin-kode.");
      return;
    }

    await fetchSupportMessages(stablePassword, stableEmail);
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

  async function openCustomerCenter(business: Business) {
    setCustomerDetailLoading(true);
    setCustomerDetailError("");
    setCustomerDetail(null);
    setOpenCustomerConversations({});

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

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "DELETE",
        headers: buildAdminHeaders(),
        body: JSON.stringify({ business_id: id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke slette virksomhed.");
      }

      await fetchBusinesses();
      pushToast("Virksomhed slettet", "success");
    } catch (deleteError) {
      if (deleteError instanceof Error) {
        setError(deleteError.message);
        pushToast(deleteError.message, "error");
      } else {
        setError("Kunne ikke slette virksomhed.");
        pushToast("Kunne ikke slette virksomhed.", "error");
      }
    } finally {
      setDeletingId(null);
      setPendingDeleteBusiness(null);
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
      <main className="min-h-screen bg-[radial-gradient(circle_at_12%_18%,rgba(246,243,237,0.92)_0%,rgba(246,243,237,0)_24%),radial-gradient(circle_at_88%_14%,rgba(246,243,237,0.9)_0%,rgba(246,243,237,0)_22%),linear-gradient(180deg,#ffffff_0%,#fcfaf6_55%,#f8f4ee_100%)] px-4 py-16 text-[#111111]">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.94)] p-8 shadow-[0_20px_50px_rgba(17,17,17,0.08)] backdrop-blur">
          <h1 className="text-3xl font-semibold tracking-tight">EmbedBot Admin</h1>
          <p className="mt-2 text-sm text-[#6b6258]">Indtast admin-email og adgangskode for at fortsatte.</p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[#8a7e70]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eksempel.dk"
                autoComplete="email"
                className="w-full rounded-xl border border-[rgba(17,17,17,0.10)] bg-white px-3 py-2.5 text-sm text-[#111111] placeholder:text-[#8a7e70] focus:border-[rgba(17,17,17,0.22)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[#8a7e70]">
                Adgangskode
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-[rgba(17,17,17,0.10)] bg-white px-3 py-2.5 text-sm text-[#111111] placeholder:text-[#8a7e70] focus:border-[rgba(17,17,17,0.22)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl border border-[rgba(17,17,17,0.08)] bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]"
            >
              Log ind
            </button>

            {authError ? <p className="text-sm text-[#9b3d2f]">{authError}</p> : null}
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_18%,rgba(246,243,237,0.92)_0%,rgba(246,243,237,0)_24%),radial-gradient(circle_at_88%_14%,rgba(246,243,237,0.9)_0%,rgba(246,243,237,0)_22%),linear-gradient(180deg,#ffffff_0%,#fcfaf6_55%,#f8f4ee_100%)] text-[#111111]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(246,243,237,0.55),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(17,17,17,0.03),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(246,243,237,0.35),transparent_35%)]" />

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
          className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-white/10 bg-[#191918] p-5 text-white backdrop-blur lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} transition-transform duration-300`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-[rgba(17,17,17,0.08)] bg-white text-[#111111] shadow-[0_10px_24px_rgba(17,17,17,0.06)]">
                <Bot size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">EmbedBot</p>
                <p className="text-xs text-white/50">Admin Console</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg border border-white/15 p-1.5 text-white/70 lg:hidden"
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isCurrent ? "bg-white/15 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)]" : "text-white/65 hover:bg-white/8 hover:text-white"}`}
                >
                  <Icon size={17} />
                  {item.label}
                  {item.view === "support" && unreadSupportMessages > 0 ? <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#111111] px-1 text-[10px] font-bold text-white">{unreadSupportMessages}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/6 p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-white/45">System</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-white/70">Embed API</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  systemOnline
                    ? "bg-[#e8f6f0] text-[#31795d]"
                    : "border border-white/10 bg-white/8 text-white/60"
                }`}
              >
                {systemOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </motion.aside>

        <section className="w-full lg:pl-0">
          <header className="sticky top-0 z-10 border-b border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.86)] backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-xl border border-[rgba(17,17,17,0.10)] p-2 text-[#6b6258] lg:hidden"
                  aria-label="Aabn sidebar"
                >
                  <Menu size={18} />
                </button>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a7e70]">{VIEW_COPY[activeView].eyebrow}</p>
                  <h1 className="text-base font-semibold sm:text-lg">{VIEW_COPY[activeView].title}</h1>
                </div>
              </div>

              <button
                onClick={() => {
                  void fetchBusinesses();
                  void fetchSupportMessages();
                }}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-[rgba(17,17,17,0.08)] bg-white px-3 py-2 text-sm font-medium text-[#111111] shadow-[0_10px_24px_rgba(17,17,17,0.05)] transition hover:bg-[rgba(246,243,237,0.9)] disabled:opacity-60"
              >
                <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
                {loading ? "Henter" : "Opdater liste"}
              </button>
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
            <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a7e70]">{VIEW_COPY[activeView].eyebrow}</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{VIEW_COPY[activeView].title}</h2>
                <p className="mt-2 text-sm text-[#6b6258] sm:text-base">{VIEW_COPY[activeView].description}</p>
              </div>
              {lastUpdatedAt ? <p className="text-xs text-[#8a7e70]">Opdateret {formatRelativeDate(lastUpdatedAt.toISOString())}</p> : null}
            </section>

            {activeView === "overview" ? <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6"
            >
              <article className={statsCardClass}>
                <div className="flex items-center justify-between text-[#8a7e70]">
                  <p className="text-xs uppercase tracking-[0.15em]">Aktive chatbots</p>
                  <Bot size={16} />
                </div>
                <p className="mt-2 text-2xl font-semibold">{activeBusinesses}</p>
              </article>

              <article className={statsCardClass}>
                <div className="flex items-center justify-between text-[#8a7e70]">
                  <p className="text-xs uppercase tracking-[0.15em]">Virksomheder</p>
                  <Building2 size={16} />
                </div>
                <p className="mt-2 text-2xl font-semibold">{totalBusinesses}</p>
              </article>

              <article className={statsCardClass}>
                <div className="flex items-center justify-between text-[#8a7e70]">
                  <p className="text-xs uppercase tracking-[0.15em]">Beskeder besvaret</p>
                  <BarChart3 size={16} />
                </div>
                <p className="mt-2 text-2xl font-semibold">{totalMessages.toLocaleString("da-DK")}</p>
              </article>

              <article className={statsCardClass}>
                <div className="flex items-center justify-between text-[#8a7e70]">
                  <p className="text-xs uppercase tracking-[0.15em]">Support</p>
                  <MessageSquare size={16} />
                </div>
                <p className="mt-2 text-2xl font-semibold">{unreadSupportMessages}</p>
              </article>

              <article className={statsCardClass}>
                <div className="flex items-center justify-between text-[#8a7e70]">
                  <p className="text-xs uppercase tracking-[0.15em]">Gns. svartid</p>
                  <Gauge size={16} />
                </div>
                <p className="mt-2 text-2xl font-semibold">{avgResponse}</p>
              </article>

              <article className={statsCardClass}>
                <div className="flex items-center justify-between text-[#8a7e70]">
                  <p className="text-xs uppercase tracking-[0.15em]">System status</p>
                  <Server size={16} />
                </div>
                <p className={`mt-2 text-2xl font-semibold ${systemOnline ? "text-[#111111]" : "text-[#6b6258]"}`}>
                  {systemOnline ? "Online" : "Offline"}
                </p>
              </article>
            </motion.section> : null}

            {activeView === "overview" ? <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
              <article className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[#111111] p-5 text-white shadow-[0_18px_40px_rgba(17,17,17,0.12)] sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">Kundeportefølje</p>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div><p className="text-4xl font-semibold tracking-[-0.05em]">{totalBusinesses ? Math.round((activeBusinesses / totalBusinesses) * 100) : 0}%</p><p className="mt-1 text-sm text-white/65">af kunderne har en aktiv chatbot</p></div>
                  <button onClick={() => selectView("businesses")} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#111111] transition hover:bg-[#f6f3ed]">Åbn kunder</button>
                </div>
              </article>
              <article className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[rgba(232,246,240,0.86)] p-5 shadow-[0_18px_40px_rgba(17,17,17,0.04)] sm:p-6">
                <div className="flex items-center gap-2 text-[#31795d]"><CheckCircle2 size={18} /><p className="text-xs font-bold uppercase tracking-[0.16em]">Handlinger</p></div>
                <p className="mt-4 text-lg font-semibold">{unreadSupportMessages ? `${unreadSupportMessages} beskeder venter` : "Alt ser godt ud"}</p>
                <p className="mt-1 text-sm text-[#4d7868]">{unreadSupportMessages ? "Gennemgå dem i support-indbakken." : "Der er ingen åbne henvendelser lige nu."}</p>
              </article>
            </section> : null}

            {(activeView === "overview" || activeView === "support") ? <section className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.94)] p-4 shadow-[0_18px_40px_rgba(17,17,17,0.05)] backdrop-blur sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[#8a7e70]">Indbakke</p>
                  <h2 className="text-lg font-semibold">Support og klager</h2>
                </div>
                <span className="w-fit rounded-full border border-[rgba(17,17,17,0.08)] bg-white px-3 py-1 text-xs font-semibold text-[#6b6258]">
                  {supportMessages.length} beskeder
                </span>
              </div>

              {supportError ? (
                <p className="mb-4 rounded-xl border border-[rgba(17,17,17,0.08)] bg-[rgba(246,243,237,0.72)] px-3 py-2 text-sm text-[#9b3d2f]">
                  {supportError}
                </p>
              ) : null}

              {supportMessages.length === 0 && !supportError ? (
                <div className="rounded-2xl border border-dashed border-[rgba(17,17,17,0.10)] bg-[rgba(255,255,255,0.76)] px-6 py-10 text-center">
                  <p className="text-base font-medium text-[#111111]">Ingen supportbeskeder endnu</p>
                  <p className="mt-1 text-sm text-[#8a7e70]">Nye beskeder fra /support lander her.</p>
                </div>
              ) : null}

              {supportMessages.length > 0 ? (
                <div className="grid gap-3">
                  {supportMessages.map((supportMessage) => {
                    const isComplaint = supportMessage.type === "complaint";

                    return (
                      <article
                        key={supportMessage.id}
                        className="rounded-xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.9)] p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  isComplaint
                                    ? "bg-[#111111] text-white"
                                    : "border border-[rgba(17,17,17,0.08)] bg-white text-[#6b6258]"
                                }`}
                              >
                                {isComplaint ? "Klage" : "Besked"}
                              </span>
                              <h3 className="text-base font-semibold">{supportMessage.name || "Uden navn"}</h3>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#8a7e70]">
                              <a className="hover:text-[#111111]" href={`mailto:${supportMessage.email || ""}`}>
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
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${supportMessage.status === "archived" ? "bg-[#e8f6f0] text-[#31795d]" : "border border-[rgba(17,17,17,0.08)] bg-white text-[#6b6258]"}`}>{supportMessage.status === "archived" ? "Løst" : supportMessage.status === "read" ? "I gang" : "Ny"}</span>
                            {supportMessage.status !== "archived" ? <button onClick={() => void updateSupportStatus(supportMessage, "archived")} className="rounded-lg border border-[rgba(17,17,17,0.10)] bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] hover:bg-[#f6f3ed]">Markér løst</button> : null}
                          </div>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-[rgba(17,17,17,0.08)] bg-[rgba(246,243,237,0.62)] p-3 text-sm leading-6 text-[#111111]">
                          {supportMessage.message || "-"}
                        </p>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </section> : null}

            {activeView === "billing" ? <section className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.94)] p-4 shadow-[0_18px_40px_rgba(17,17,17,0.05)] backdrop-blur sm:p-5">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a7e70]">Supabase · businesses</p><h3 className="mt-1 text-xl font-semibold">Kundeplaner og AI-forbrug</h3></div><span className="w-fit rounded-full bg-[#f6f3ed] px-3 py-1 text-xs font-semibold text-[#6b6258]">{businesses.length} kunder</span></div>
              <div className="grid gap-3">
                {businesses.map((business) => {
                  const plan = typeof business.plan === "string" ? business.plan : "starter";
                  const used = getFirstNumericField(business, ["ai_answers_used"]);
                  const limit = getFirstNumericField(business, ["ai_answer_limit_override"]) || ({ starter: 1000, growth: 5000, scale: 15000, enterprise: 30000 }[plan] || 1000);
                  const usage = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
                  return <article key={business.id} className="rounded-xl border border-[rgba(17,17,17,0.08)] bg-white p-4"><div className="grid gap-4 lg:grid-cols-[minmax(190px,1fr)_190px_minmax(180px,1fr)_auto] lg:items-center"><div><p className="font-semibold">{business.name || "Uden navn"}</p><p className="mt-1 text-xs text-[#8a7e70]">{business.support_email || business.website_url || "Ingen kontaktoplysning"}</p></div><label className="grid gap-1 text-xs font-semibold text-[#6b6258]"><span>Plan</span><select value={plan} onChange={(event) => void updateBusiness(business, { plan: event.target.value }, "Kundeplan opdateret")} disabled={savingId === business.id} className="rounded-lg border border-[rgba(17,17,17,0.1)] bg-white px-2.5 py-2 text-sm font-medium text-[#111111] outline-none"><option value="starter">Starter</option><option value="growth">Growth</option><option value="scale">Scale</option><option value="enterprise">Enterprise</option></select></label><div><div className="flex justify-between gap-3 text-xs text-[#6b6258]"><span>AI-svar</span><span>{used.toLocaleString("da-DK")} / {limit.toLocaleString("da-DK")}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f0ede7]"><div className="h-full rounded-full bg-[#111111]" style={{ width: `${usage}%` }} /></div><div className="mt-2 flex gap-2"><button onClick={() => void updateBusiness(business, { ai_answers_used: 0 }, "AI-forbrug nulstillet")} disabled={savingId === business.id} className="text-xs font-semibold text-[#6b6258] underline underline-offset-4 hover:text-[#111111]">Nulstil forbrug</button>{plan === "enterprise" ? <button onClick={() => { const value = window.prompt("Ny månedlig AI-grænse (mindst 30.000)", String(limit)); if (value) void updateBusiness(business, { ai_answer_limit_override: value }, "Enterprise-grænse opdateret"); }} className="text-xs font-semibold text-[#6b6258] underline underline-offset-4 hover:text-[#111111]">Tilpas grænse</button> : null}</div></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${business.subscription_status === "active" || business.subscription_status === "trialing" ? "bg-[#e8f6f0] text-[#31795d]" : "bg-[#f6f3ed] text-[#6b6258]"}`}>{business.subscription_status || "Ingen status"}</span></div></article>;
                })}
              </div>
            </section> : null}

            {activeView === "system" ? <section className="grid gap-4 md:grid-cols-2"><article className={statsCardClass}><div className="flex items-center gap-2"><Server size={17}/><h3 className="font-semibold">Datakilde</h3></div><p className="mt-3 text-sm text-[#6b6258]">Kundedata hentes fra Supabase med service-role på serveren. Skrivehandlinger kræver admin-adgang og CSRF-header.</p><div className="mt-4 flex items-center gap-2 text-sm font-semibold"><span className={`h-2 w-2 rounded-full ${systemOnline ? "bg-[#31795d]" : "bg-[#b86f3b]"}`} />{systemOnline ? "Forbundet" : "Kontrollér forbindelsen"}</div></article><article className={statsCardClass}><div className="flex items-center gap-2"><Settings2 size={17}/><h3 className="font-semibold">Seneste synkronisering</h3></div><p className="mt-3 text-sm text-[#6b6258]">{lastUpdatedAt ? lastUpdatedAt.toLocaleString("da-DK") : "Ikke hentet endnu"}</p><button onClick={() => { void fetchBusinesses(); void fetchSupportMessages(); }} className="mt-4 rounded-xl bg-[#111111] px-3 py-2 text-sm font-semibold text-white">Opdatér data</button></article></section> : null}

            {activeView === "businesses" ? <section className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.94)] p-4 shadow-[0_18px_40px_rgba(17,17,17,0.05)] backdrop-blur sm:p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-semibold">Virksomheder</h2>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 text-[#8a7e70]" size={16} />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Soeg navn, email, website"
                      className="w-full rounded-xl border border-[rgba(17,17,17,0.10)] bg-white py-2 pl-9 pr-3 text-sm text-[#111111] placeholder:text-[#8a7e70] focus:border-[rgba(17,17,17,0.22)] focus:outline-none"
                    />
                  </label>

                  <div className="flex items-center gap-2 rounded-xl border border-[rgba(17,17,17,0.10)] bg-white px-3 py-2 text-sm text-[#6b6258]">
                    <Filter size={15} />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                      className="bg-transparent text-sm outline-none"
                    >
                      <option value="all" className="bg-white text-[#111111]">
                        Alle
                      </option>
                      <option value="active" className="bg-white text-[#111111]">
                        Aktiv
                      </option>
                      <option value="inactive" className="bg-white text-[#111111]">
                        Inaktiv
                      </option>
                    </select>
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "date" | "name" | "status")}
                    className="rounded-xl border border-[rgba(17,17,17,0.10)] bg-white px-3 py-2 text-sm text-[#6b6258] outline-none focus:border-[rgba(17,17,17,0.22)]"
                  >
                    <option value="date">Sorter: Dato</option>
                    <option value="name">Sorter: Navn</option>
                    <option value="status">Sorter: Status</option>
                  </select>
                </div>
              </div>

              {error ? (
                <p className="mb-4 rounded-xl border border-[rgba(17,17,17,0.08)] bg-[rgba(246,243,237,0.72)] px-3 py-2 text-sm text-[#9b3d2f]">
                  {error}
                </p>
              ) : null}

              {lastUpdatedAt ? <p className="mb-3 text-xs text-[#8a7e70]">Sidst opdateret: {lastUpdatedAt.toLocaleString("da-DK")}</p> : null}

              {loading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`skeleton-${index}`} className="animate-pulse rounded-xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.94)] p-4">
                      <div className="h-4 w-40 rounded bg-[rgba(17,17,17,0.10)]" />
                      <div className="mt-3 h-3 w-56 rounded bg-[rgba(17,17,17,0.08)]" />
                      <div className="mt-2 h-3 w-44 rounded bg-[rgba(17,17,17,0.08)]" />
                    </div>
                  ))}
                </div>
              ) : null}

              {!loading && filteredBusinesses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[rgba(17,17,17,0.10)] bg-[rgba(255,255,255,0.76)] px-6 py-14 text-center">
                  <p className="text-base font-medium text-[#111111]">Ingen virksomheder matcher dit filter</p>
                  <p className="mt-1 text-sm text-[#8a7e70]">Proev en anden soegning eller opdater listen.</p>
                </div>
              ) : null}

              {!loading ? (
                <div className="grid gap-3">
                  {filteredBusinesses.map((business) => {
                    const isOpen = Boolean(expanded[business.id]);
                    const isActive = Boolean(business.activated);
                    const isEditing = editingId === business.id;
                    const draft = editDrafts[business.id] || {};

                    const primaryColor = (business.primary_color || "").trim() || "#111111";
                    const secondaryColor = (business.secondary_color || "").trim() || "#f5f5f5";
                    const fabColor = (business.fab_color || "").trim() || (business.chat_icon_color || "").trim() || "#111111";
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
                        className="rounded-xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.94)] p-4 shadow-[0_14px_30px_rgba(17,17,17,0.04)]"
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-semibold">{business.name || "Uden navn"}</h3>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  isActive
                                    ? "bg-[#111111] text-white"
                                    : "border border-[rgba(17,17,17,0.08)] bg-white text-[#6b6258]"
                                }`}
                              >
                                {isActive ? "Aktiv" : "Inaktiv"}
                              </span>
                            </div>

                            <div className="mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm text-[#8a7e70]">
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
                              className="rounded-lg border border-[rgba(17,17,17,0.10)] bg-white px-3 py-1.5 text-sm text-[#111111] transition hover:bg-[rgba(246,243,237,0.9)]"
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
                                } else if (value === "delete") {
                                  setPendingDeleteBusiness(business);
                                }
                              }}
                              className="rounded-lg border border-[rgba(17,17,17,0.10)] bg-white px-3 py-1.5 text-sm text-[#111111] outline-none"
                              disabled={
                                deletingId === business.id ||
                                savingId === business.id
                              }
                            >
                              <option value="">Quick actions</option>
                              <option value="edit">Rediger</option>
                              <option value="delete">Slet</option>
                            </select>

                            <button
                              onClick={() => void openCustomerCenter(business)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[rgba(17,17,17,0.10)] bg-[#111111] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]"
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
                              className="mt-4 overflow-hidden border-t border-[rgba(17,17,17,0.08)] pt-4"
                            >
                              {isActive ? (
                                <div className="rounded-xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.94)] p-3">
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-xs uppercase tracking-[0.16em] text-[#8a7e70]">Install script</p>
                                    <button
                                      onClick={() => copyScript(installScript)}
                                      className="inline-flex items-center gap-1 rounded-md border border-[rgba(17,17,17,0.10)] bg-white px-2 py-1 text-xs text-[#6b6258] transition hover:bg-[rgba(246,243,237,0.9)] hover:text-[#111111]"
                                    >
                                      <Copy size={12} /> Kopier
                                    </button>
                                  </div>
                                  <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-[rgba(17,17,17,0.08)] bg-[rgba(246,243,237,0.72)] p-3 text-xs text-[#111111]">
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
                                      className="inline-flex items-center gap-1 rounded-lg border border-[rgba(17,17,17,0.08)] bg-[#111111] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2a2a2a] disabled:opacity-60"
                                    >
                                      <Pencil size={14} /> {savingId === business.id ? "Gemmer" : "Gem"}
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="rounded-lg border border-[rgba(17,17,17,0.10)] bg-white px-3 py-1.5 text-sm text-[#111111]"
                                    >
                                      Annuller
                                    </button>
                                  </>
                                ) : null}

                                <button
                                  onClick={() => setPendingDeleteBusiness(business)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[rgba(17,17,17,0.10)] bg-white px-3 py-1.5 text-sm text-[#111111] transition hover:bg-[rgba(246,243,237,0.9)]"
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
                                      className="grid grid-cols-1 gap-1 rounded-lg border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.9)] p-2 text-sm md:grid-cols-[220px_1fr]"
                                    >
                                      <span className="font-medium text-[#8a7e70]">{key}</span>
                                      <span className="min-w-0 break-words text-[#111111]">
                                        {isEditing && !isReadOnlyKey ? (
                                          isTextareaField(key) ? (
                                            <textarea
                                              value={draft[key] ?? ""}
                                              onChange={(e) => updateDraftValue(business.id, key, e.target.value)}
                                              className="min-h-[84px] w-full rounded-md border border-[rgba(17,17,17,0.10)] bg-white px-2 py-1.5 text-sm text-[#111111] outline-none focus:border-[rgba(17,17,17,0.22)]"
                                            />
                                          ) : (
                                            <input
                                              value={draft[key] ?? ""}
                                              onChange={(e) => updateDraftValue(business.id, key, e.target.value)}
                                              className="w-full rounded-md border border-[rgba(17,17,17,0.10)] bg-white px-2 py-1.5 text-sm text-[#111111] outline-none focus:border-[rgba(17,17,17,0.22)]"
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
              className="mx-auto my-3 w-full max-w-6xl rounded-3xl border border-[rgba(17,17,17,0.09)] bg-[#f6f3ed] p-4 text-[#111111] shadow-[0_28px_80px_rgba(17,17,17,0.2)] sm:my-8 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a7e70]">Kundecenter</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{customerDetail?.business.name || (customerDetailLoading ? "Henter kundedata…" : "Kundedata")}</h2>
                  {customerDetail?.business.website_url ? <p className="mt-1 text-sm text-[#6b6258]">{customerDetail.business.website_url}</p> : null}
                </div>
                <button onClick={() => { setCustomerDetail(null); setCustomerDetailError(""); }} disabled={customerDetailLoading} className="rounded-xl border border-[rgba(17,17,17,0.1)] bg-white p-2 text-[#6b6258] hover:text-[#111111] disabled:opacity-50" aria-label="Luk kundecenter"><X size={18} /></button>
              </div>

              {customerDetailLoading ? <div className="mt-6 grid min-h-64 place-items-center rounded-2xl border border-dashed border-[rgba(17,17,17,0.12)] bg-white/70"><span className="text-sm text-[#6b6258]">Henter chatbotdata og samtaler…</span></div> : null}
              {customerDetailError ? <div className="mt-6 rounded-2xl border border-[rgba(155,61,47,0.16)] bg-[rgba(255,245,242,0.9)] p-4 text-sm text-[#9b3d2f]">{customerDetailError}</div> : null}

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
                    <article className="rounded-2xl bg-[#111111] p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">Plan og forbrug</p><div className="mt-4 grid gap-4 sm:grid-cols-[190px_1fr]"><label className="grid gap-1 text-xs font-semibold text-white/65"><span>Kundens plan</span><select value={plan} onChange={(event) => void updateBusiness(business, { plan: event.target.value }, "Kundeplan opdateret")} disabled={savingId === business.id} className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white outline-none"><option className="bg-[#111111]" value="starter">Starter · 1.000 svar</option><option className="bg-[#111111]" value="growth">Growth · 5.000 svar</option><option className="bg-[#111111]" value="scale">Scale · 15.000 svar</option><option className="bg-[#111111]" value="enterprise">Enterprise · individuel</option></select></label><div><div className="flex justify-between gap-3 text-xs text-white/65"><span>AI-forbrug denne måned</span><span>{used.toLocaleString("da-DK")} / {limit.toLocaleString("da-DK")}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))}%` }} /></div><button onClick={() => void updateBusiness(business, { ai_answers_used: 0 }, "AI-forbrug nulstillet")} disabled={savingId === business.id} className="mt-3 text-xs font-semibold text-white underline underline-offset-4 disabled:opacity-50">Nulstil forbrug</button></div></div></article>
                    <article className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a7e70]">Chatbotstatus</p><div className="mt-4 grid gap-3 text-sm"><div className="flex justify-between gap-3"><span className="text-[#6b6258]">Abonnement</span><span className="font-semibold">{business.subscription_status || "Ukendt"}</span></div><div className="flex justify-between gap-3"><span className="text-[#6b6258]">Betaling</span><span className="font-semibold">{business.payment_status || "Ukendt"}</span></div><div className="flex justify-between gap-3"><span className="text-[#6b6258]">Aktiv chatbot</span><span className="font-semibold">{business.activated ? "Ja" : "Nej"}</span></div><div className="flex justify-between gap-3"><span className="text-[#6b6258]">Indekseret viden</span><span className="font-semibold">{customerDetail.knowledgeChunkCount} tekststykker</span></div></div></article>
                  </section>

                  <section className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a7e70]">Chatbot-data</p><h3 className="mt-1 text-xl font-semibold">Det botten ved og siger</h3></div><button onClick={() => { startEditing(business); setCustomerDetail(null); }} className="rounded-xl border border-[rgba(17,17,17,0.1)] px-3 py-2 text-sm font-semibold hover:bg-[#f6f3ed]">Redigér data</button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{chatbotFields.map(([label, key]) => { const value = business[key]; return <div key={key} className="rounded-xl bg-[#f6f3ed] p-3"><p className="text-xs font-semibold text-[#8a7e70]">{label}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{typeof value === "string" && value.trim() ? value : "Ikke angivet"}</p></div>; })}</div></section>

                  <section className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-white p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a7e70]">Samtaler</p><h3 className="mt-1 text-xl font-semibold">Kundens samtalehistorik</h3><p className="mt-1 text-sm text-[#6b6258]">Viser de seneste {customerDetail.conversations.length} samtaler.</p></div><span className="w-fit rounded-full bg-[#f6f3ed] px-3 py-1 text-xs font-semibold text-[#6b6258]">{customerDetail.conversations.length} samtaler</span></div>{customerDetail.conversations.length ? <div className="mt-4 grid gap-2">{customerDetail.conversations.map((conversation) => { const isOpen = Boolean(openCustomerConversations[conversation.id]); const messages = normalizeMessages(conversation.messages); return <article key={conversation.id} className="overflow-hidden rounded-xl border border-[rgba(17,17,17,0.08)]"><button onClick={() => setOpenCustomerConversations((previous) => ({ ...previous, [conversation.id]: !previous[conversation.id] }))} className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left hover:bg-[#faf9f6]"><span><strong className="block text-sm">{messages.find((message) => message.role.toLowerCase().includes("user"))?.content.slice(0, 90) || "Samtale uden spørgsmål"}</strong><span className="mt-1 block text-xs text-[#8a7e70]">{conversation.created_at ? new Date(conversation.created_at).toLocaleString("da-DK") : "Ukendt tidspunkt"} · {messages.length} beskeder</span></span><ChevronDown size={17} className={`shrink-0 text-[#8a7e70] transition ${isOpen ? "rotate-180" : ""}`} /></button>{isOpen ? <div className="grid gap-2 border-t border-[rgba(17,17,17,0.08)] bg-[#f6f3ed] p-3">{messages.length ? messages.map((message, index) => <div key={`${conversation.id}-${index}`} className={`max-w-[88%] rounded-xl px-3 py-2 text-sm leading-6 ${message.role.toLowerCase().includes("user") ? "justify-self-end bg-[#111111] text-white" : "bg-white text-[#111111]"}`}>{message.content}</div>) : <p className="text-sm text-[#8a7e70]">Ingen beskeder i samtalen.</p>}</div> : null}</article>; })}</div> : <div className="mt-4 rounded-xl border border-dashed border-[rgba(17,17,17,0.12)] bg-[#f6f3ed] px-4 py-8 text-center text-sm text-[#6b6258]">Ingen samtaler endnu.</div>}</section>
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
              className="w-full max-w-md rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.96)] p-5 text-[#111111] shadow-[0_20px_50px_rgba(17,17,17,0.10)]"
            >
              <h3 className="text-lg font-semibold">Slet virksomhed</h3>
              <p className="mt-2 text-sm text-[#6b6258]">
                Er du sikker pa at du vil slette <strong>{pendingDeleteBusiness.name || "denne virksomhed"}</strong>? Denne handling kan ikke fortrydes.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setPendingDeleteBusiness(null)}
                  className="rounded-lg border border-[rgba(17,17,17,0.10)] bg-white px-3 py-1.5 text-sm text-[#111111]"
                >
                  Annuller
                </button>
                <button
                  onClick={() => deleteBusiness(pendingDeleteBusiness.id)}
                  disabled={deletingId === pendingDeleteBusiness.id}
                  className="rounded-lg border border-[rgba(17,17,17,0.08)] bg-[#111111] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2a2a2a] disabled:opacity-60"
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
              className={`rounded-xl border px-3 py-2 text-sm shadow-xl ${
                toast.type === "success"
                  ? "border-[rgba(17,17,17,0.08)] bg-white text-[#111111]"
                  : toast.type === "error"
                    ? "border-[rgba(17,17,17,0.08)] bg-[rgba(246,243,237,0.78)] text-[#9b3d2f]"
                    : "border-[rgba(17,17,17,0.08)] bg-white text-[#6b6258]"
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
