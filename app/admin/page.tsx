"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  Copy,
  Filter,
  Gauge,
  LayoutDashboard,
  Menu,
  Pencil,
  RefreshCcw,
  Search,
  Server,
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
  [key: string]: unknown;
};

type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

const statsCardClass =
  "rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.94)] p-4 shadow-[0_18px_40px_rgba(17,17,17,0.05)] backdrop-blur text-[#111111]";

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

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, Record<string, string>>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "status">("date");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingDeleteBusiness, setPendingDeleteBusiness] = useState<Business | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  function pushToast(message: string, type: Toast["type"] = "info") {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }

  function buildAdminHeaders(tokenOverride?: string) {
    const stableToken = (tokenOverride ?? adminToken).trim();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (stableToken) {
      headers["x-admin-token"] = stableToken;
    }

    return headers;
  }

  async function fetchBusinesses(tokenOverride?: string) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "GET",
        headers: buildAdminHeaders(tokenOverride),
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

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthError("");

    const stablePassword = password.trim();
    if (!stablePassword) {
      setAuthError("Indtast adgangskode.");
      return;
    }

    setAdminToken(stablePassword);
    const isAuthorized = await fetchBusinesses(stablePassword);
    if (!isAuthorized) {
      setAdminToken("");
      setIsAuthenticated(false);
      setAuthError("Forkert adgangskode eller manglende serverkonfiguration.");
      return;
    }

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

      if (value === null || value === undefined) {
        draft[key] = "";
        return;
      }

      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        draft[key] = String(value);
        return;
      }

      draft[key] = JSON.stringify(value);
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

    const updates = editDrafts[stableBusinessId] || {};

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

  async function activateBusiness(id: string) {
    setActivatingId(id);
    setError("");

    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke aktivere virksomhed.");
      }

      await fetchBusinesses();
      pushToast("Virksomhed aktiveret", "success");
    } catch (activationError) {
      if (activationError instanceof Error) {
        setError(activationError.message);
        pushToast(activationError.message, "error");
      } else {
        setError("Kunne ikke aktivere virksomhed.");
        pushToast("Kunne ikke aktivere virksomhed.", "error");
      }
    } finally {
      setActivatingId(null);
    }
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
          <p className="mt-2 text-sm text-[#6b6258]">Indtast adgangskoden for at fortsatte.</p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[#8a7e70]">
                Adgangskode
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
          className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.92)] p-5 backdrop-blur lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} transition-transform duration-300`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-[rgba(17,17,17,0.08)] bg-white text-[#111111] shadow-[0_10px_24px_rgba(17,17,17,0.06)]">
                <Bot size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">EmbedBot</p>
                <p className="text-xs text-[#8a7e70]">Admin Console</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg border border-[rgba(17,17,17,0.10)] p-1.5 text-[#6b6258] lg:hidden"
              aria-label="Luk sidebar"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="mt-8 space-y-1">
            <button className="flex w-full items-center gap-3 rounded-xl border border-[rgba(17,17,17,0.08)] bg-white px-3 py-2 text-sm font-medium text-[#111111] shadow-[0_8px_18px_rgba(17,17,17,0.05)]">
              <LayoutDashboard size={16} />
              Overblik
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#6b6258] transition hover:bg-[rgba(246,243,237,0.85)]">
              <Building2 size={16} />
              Virksomheder
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#6b6258] transition hover:bg-[rgba(246,243,237,0.85)]">
              <BarChart3 size={16} />
              Analytics
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#6b6258] transition hover:bg-[rgba(246,243,237,0.85)]">
              <Activity size={16} />
              Driftstatus
            </button>
          </nav>

          <div className="mt-8 rounded-xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.94)] p-3 shadow-[0_12px_28px_rgba(17,17,17,0.04)]">
            <p className="text-xs uppercase tracking-[0.15em] text-[#8a7e70]">System</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-[#6b6258]">Embed API</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  systemOnline
                    ? "bg-[#111111] text-white"
                    : "border border-[rgba(17,17,17,0.08)] bg-white text-[#6b6258]"
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
                  <p className="text-xs text-[#8a7e70]">Dashboard / Admin</p>
                  <h1 className="text-base font-semibold sm:text-lg">Virksomheds-overblik</h1>
                </div>
              </div>

              <button
                onClick={() => {
                  void fetchBusinesses();
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
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
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
            </motion.section>

            <section className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.94)] p-4 shadow-[0_18px_40px_rgba(17,17,17,0.05)] backdrop-blur sm:p-5">
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
                    const isActivating = activatingId === business.id;
                    const isEditing = editingId === business.id;
                    const draft = editDrafts[business.id] || {};

                    const primaryColor = (business.primary_color || "").trim() || "#111111";
                    const secondaryColor = (business.secondary_color || "").trim() || "#f5f5f5";
                    const fabColor = (business.fab_color || "").trim() || (business.chat_icon_color || "").trim() || "#111111";
                    const fontChoice = (business.font_choice || "").trim() || "Poppins";

                    const installScript = `<script\n  src=\"https://embedbot1.vercel.app/widget.js?id=${business.id}\"\n  data-name=\"${business.name || "Support"}\"\n  data-primary-color=\"${primaryColor}\"\n  data-secondary-color=\"${secondaryColor}\"\n  data-fab-color=\"${fabColor}\"\n  data-font=\"${fontChoice}\">\n<\\/script>`;

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
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
                              <p>Email: {business.support_email || "-"}</p>
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
                              onClick={() => activateBusiness(business.id)}
                              disabled={isActive || isActivating || deletingId === business.id || savingId === business.id}
                              className="rounded-lg border border-[rgba(17,17,17,0.10)] bg-white px-3 py-1.5 text-sm text-[#111111] transition hover:bg-[rgba(246,243,237,0.9)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isActive ? "Aktiv" : isActivating ? "Aktiverer..." : "Aktivér"}
                            </button>

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

                                if (value === "activate") {
                                  activateBusiness(business.id);
                                } else if (value === "edit") {
                                  startEditing(business);
                                } else if (value === "delete") {
                                  setPendingDeleteBusiness(business);
                                }
                              }}
                              className="rounded-lg border border-[rgba(17,17,17,0.10)] bg-white px-3 py-1.5 text-sm text-[#111111] outline-none"
                              disabled={
                                activatingId === business.id ||
                                deletingId === business.id ||
                                savingId === business.id
                              }
                            >
                              <option value="">Quick actions</option>
                              <option value="activate">Aktiver</option>
                              <option value="edit">Rediger</option>
                              <option value="delete">Slet</option>
                            </select>

                            <Link
                              href={`/dashboard/${business.id}/samtaler`}
                              className="rounded-lg border border-[rgba(17,17,17,0.10)] bg-white px-3 py-1.5 text-sm text-[#111111] transition hover:bg-[rgba(246,243,237,0.9)]"
                            >
                              Samtaler
                            </Link>
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
                                      <span className="text-[#111111]">
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
            </section>
          </div>
        </section>
      </div>

      <AnimatePresence>
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