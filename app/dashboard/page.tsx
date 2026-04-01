"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Business = {
  id: string;
  name?: string | null;
  created_at?: string | null;
  website_url?: string | null;
  industry?: string | null;
};

type ConversationRow = {
  id: string;
  business_id: string;
  created_at: string | null;
  messages: unknown;
};

type ChatMessage = {
  role: string;
  content: string;
};

type LeadRow = {
  email: string;
  message: string;
  pageUrl: string;
  businessName: string;
  createdAt: string | null;
};

type HighlightRow = {
  id: string;
  question: string;
  answer: string;
  businessName: string;
};

function normalizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (typeof entry === "string") {
        return { role: "assistant", content: entry };
      }

      if (entry && typeof entry === "object") {
        const obj = entry as Record<string, unknown>;
        const role = typeof obj.role === "string" ? obj.role : "assistant";
        const content =
          typeof obj.content === "string"
            ? obj.content
            : typeof obj.text === "string"
              ? obj.text
              : typeof obj.message === "string"
                ? obj.message
                : "";

        return { role, content };
      }

      return { role: "assistant", content: "" };
    })
    .filter((message) => message.content.trim().length > 0);
}

function extractPageUrl(raw: unknown): string {
  if (!Array.isArray(raw)) {
    return "Ikke oplyst";
  }

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const obj = entry as Record<string, unknown>;
    if (typeof obj.page_url === "string" && obj.page_url.trim()) {
      return obj.page_url.trim();
    }
  }

  return "Ikke oplyst";
}

function extractEmails(text: string): string[] {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return Array.from(new Set(matches.map((email) => email.toLowerCase())));
}

function isMissedAnswer(text: string): boolean {
  const normalized = text.toLowerCase();
  const patterns = [
    "kontakt os",
    "kontakt os venligst",
    "kan ikke hjælpe",
    "beklager",
    "jeg ved det ikke",
    "please contact",
    "i cannot help",
    "i can't help",
  ];

  return patterns.some((pattern) => normalized.includes(pattern));
}

function classifyTopic(question: string): string {
  const normalized = question.toLowerCase();

  if (/pris|price|pricing|koster|tilbud|rabat/.test(normalized)) return "Pris og tilbud";
  if (/levering|shipping|fragt|send|norge|norway|delivery/.test(normalized)) return "Levering og forsendelse";
  if (/retur|refund|return|ombyt|garanti/.test(normalized)) return "Retur og garanti";
  if (/betaling|payment|faktura|invoice|kort|mobilepay/.test(normalized)) return "Betaling";
  if (/aabning|åbning|open|lukke|hour|hours|tid/.test(normalized)) return "Åbningstider";
  if (/kontakt|telefon|email|mail|adresse/.test(normalized)) return "Kontakt";
  return "Andet";
}

function shortText(value: string, max = 120): string {
  const clean = value.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}...`;
}

function formatHours(value: number): string {
  if (!Number.isFinite(value)) return "0,0";
  return value.toFixed(1).replace(".", ",");
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [analyticsAnchor] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [fetchError, setFetchError] = useState("");
  const [copiedBusinessId, setCopiedBusinessId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      if (typeof window !== "undefined") {
        const freshLoginAtRaw = sessionStorage.getItem("dashboard_fresh_login_at");
        const freshLoginAt = Number(freshLoginAtRaw || "0");
        const isFreshLogin = Number.isFinite(freshLoginAt) && Date.now() - freshLoginAt < 2 * 60 * 1000;

        if (!isFreshLogin) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      setEmail(userData.user.email || "");

      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id,name,website_url,created_at,industry")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (businessError) {
        setFetchError(businessError.message || "Kunne ikke hente dine chatbots.");
        setLoading(false);
        return;
      }

      const rows = (businessData || []) as Business[];
      setBusinesses(rows);

      const businessIds = rows.map((row) => row.id).filter(Boolean);
      if (businessIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data: convoData, error: convoError } = await supabase
        .from("conversations")
        .select("id,business_id,created_at,messages")
        .in("business_id", businessIds)
        .order("created_at", { ascending: false })
        .limit(600);

      if (!mounted) return;

      if (convoError) {
        const message = convoError.message || "Kunne ikke hente samtaler.";
        if (message.includes("Could not find the table") && message.includes("conversations")) {
          setFetchError("Tabellen conversations mangler i Supabase. Opret den i SQL Editor for at se data.");
        } else {
          setFetchError(message);
        }
        setConversations([]);
      } else {
        setConversations((convoData || []) as ConversationRow[]);
      }

      setLoading(false);
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [router, supabase, supabase.auth]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleCopyEmbedCode(businessId: string) {
    const script = `<script src="https://embedbot1.vercel.app/widget.js?id=${businessId}"></script>`;

    try {
      await navigator.clipboard.writeText(script);
      setCopiedBusinessId(businessId);
      setTimeout(() => {
        setCopiedBusinessId((current) => (current === businessId ? null : current));
      }, 2000);
    } catch {
      setFetchError("Kunne ikke kopiere embed-kode.");
    }
  }

  const businessNameById = useMemo(() => {
    return new Map(businesses.map((business) => [business.id, (business.name || "Unavngiven chatbot").trim()]));
  }, [businesses]);

  const analytics = useMemo(() => {
    const now = analyticsAnchor;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const weekConversations = conversations.filter((row) => {
      if (!row.created_at) return false;
      const timestamp = new Date(row.created_at).getTime();
      return Number.isFinite(timestamp) && timestamp >= weekAgo;
    });

    const leads: LeadRow[] = [];
    const seenLeadEmails = new Set<string>();
    const topicCounts = new Map<string, number>();
    const missedQuestions: HighlightRow[] = [];
    const goodHighlights: HighlightRow[] = [];
    const badHighlights: HighlightRow[] = [];

    const dayKeys: string[] = [];
    const dayConversationCount = new Map<string, number>();
    const dayLeadCount = new Map<string, number>();

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().slice(0, 10);
      dayKeys.push(key);
      dayConversationCount.set(key, 0);
      dayLeadCount.set(key, 0);
    }

    let userMessagesThisWeek = 0;
    let leadsThisWeek = 0;
    let resolvedConversations = 0;
    let assistantConversations = 0;

    for (const row of conversations) {
      const messages = normalizeMessages(row.messages);
      const userMessage = messages.find((message) => message.role.toLowerCase().includes("user"));
      const assistantMessage = messages.find((message) => message.role.toLowerCase().includes("assistant"));
      const question = userMessage?.content || "";
      const answer = assistantMessage?.content || "";
      const businessName = businessNameById.get(row.business_id) || "Unavngiven chatbot";
      const createdAt = row.created_at;
      const createdAtTime = createdAt ? new Date(createdAt).getTime() : Number.NaN;
      const isThisWeek = Number.isFinite(createdAtTime) && createdAtTime >= weekAgo;

      if (createdAt) {
        const dayKey = createdAt.slice(0, 10);
        if (dayConversationCount.has(dayKey)) {
          dayConversationCount.set(dayKey, (dayConversationCount.get(dayKey) || 0) + 1);
        }
      }

      if (question && isThisWeek) {
        userMessagesThisWeek += 1;
        const topic = classifyTopic(question);
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }

      if (assistantMessage) {
        assistantConversations += 1;

        if (!isMissedAnswer(answer)) {
          resolvedConversations += 1;

          if (goodHighlights.length < 3) {
            goodHighlights.push({
              id: row.id,
              question: shortText(question || "Spørgsmål uden tekst", 100),
              answer: shortText(answer, 140),
              businessName,
            });
          }
        } else {
          const failed = {
            id: row.id,
            question: shortText(question || "Ukendt spørgsmål", 100),
            answer: shortText(answer, 140),
            businessName,
          };

          missedQuestions.push(failed);
          if (badHighlights.length < 3) {
            badHighlights.push(failed);
          }
        }
      }

      if (!question) {
        continue;
      }

      const emails = extractEmails(question);
      if (emails.length > 0 && isThisWeek) {
        leadsThisWeek += emails.length;
      }

      if (emails.length > 0 && createdAt) {
        const dayKey = createdAt.slice(0, 10);
        if (dayLeadCount.has(dayKey)) {
          dayLeadCount.set(dayKey, (dayLeadCount.get(dayKey) || 0) + emails.length);
        }
      }

      for (const emailAddress of emails) {
        if (seenLeadEmails.has(emailAddress)) continue;

        seenLeadEmails.add(emailAddress);
        leads.push({
          email: emailAddress,
          message: shortText(question, 140),
          pageUrl: extractPageUrl(row.messages),
          businessName,
          createdAt,
        });
      }
    }

    const topicInsights = Array.from(topicCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const daily = dayKeys.map((key) => ({
      label: new Date(`${key}T00:00:00`).toLocaleDateString("da-DK", { weekday: "short" }),
      conversations: dayConversationCount.get(key) || 0,
      leads: dayLeadCount.get(key) || 0,
    }));

    const maxDailyValue = Math.max(1, ...daily.map((entry) => Math.max(entry.conversations, entry.leads)));
    const suggestions: string[] = [];

    if ((topicCounts.get("Levering og forsendelse") || 0) >= 3) {
      suggestions.push("Mange kunder spørger om levering. Tilføj en tydelig FAQ med lande, pris og leveringstid.");
    }
    if ((topicCounts.get("Pris og tilbud") || 0) >= 3) {
      suggestions.push("Prisspørgsmål fylder meget. Tilføj konkrete priser og pakker i chatbot-data for hurtigere svar.");
    }
    if (missedQuestions.length >= 2) {
      suggestions.push("Du har flere ubesvarede spørgsmål. Tilføj konkrete svar i FAQ for at hæve løsningsgraden.");
    }
    if (leads.length === 0 && conversations.length > 0) {
      suggestions.push("Ingen leads fanget endnu. Tilføj en tydelig opfordring i velkomstbeskeden: 'Skriv din e-mail for opfølgning'.");
    }

    return {
      conversationsThisWeek: weekConversations.length,
      estimatedHoursSaved: userMessagesThisWeek * (4 / 60),
      leadsThisWeek,
      resolutionRate: assistantConversations > 0 ? (resolvedConversations / assistantConversations) * 100 : 0,
      leads: leads
        .sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime())
        .slice(0, 8),
      topicInsights,
      missedQuestions: missedQuestions.slice(0, 6),
      goodHighlights,
      badHighlights,
      daily,
      maxDailyValue,
      suggestions,
    };
  }, [analyticsAnchor, businessNameById, conversations]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#030712",
          color: "#ffffff",
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        Indlæser...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#030712",
        color: "#ffffff",
        fontFamily: '"DM Sans", sans-serif',
        paddingTop: 48,
        paddingBottom: 56,
        paddingLeft: 28,
        paddingRight: 28,
      }}
    >
      <div style={{ width: "100%", maxWidth: 960, margin: "0 auto", display: "grid", gap: 20 }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 600, textDecoration: "none", color: "#ffffff" }}>
            EmbedBot
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
            <span
              style={{
                maxWidth: 220,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              {email || "ukendt bruger"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "transparent",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 500,
                padding: "6px 12px",
                borderRadius: 5,
                cursor: "pointer",
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              Log ud
            </button>
          </div>
        </nav>

        <section
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, fontWeight: 600 }}>Overblik</h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#9ca3af", fontWeight: 300 }}>
              Her er hvorfor det betyder noget for din forretning
            </p>
          </div>
          <Link
            href="/onboarding"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#3b82f6",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
              padding: "10px 18px",
              borderRadius: 5,
              border: "1px solid transparent",
            }}
          >
            Opret ny chatbot
          </Link>
        </section>

        {fetchError ? (
          <p
            style={{
              margin: 0,
              background: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(96,165,250,0.35)",
              color: "#60a5fa",
              borderRadius: 5,
              padding: "10px 12px",
              fontSize: 14,
            }}
          >
            {fetchError}
          </p>
        ) : null}

        <section
          style={{
            background: "#111827",
            color: "#ffffff",
            borderRadius: 10,
            padding: 18,
            display: "grid",
            gap: 14,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Værdioverblik (7 dage)</h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(246,243,237,0.75)" }}>
              Samtaler, estimeret tidsbesparelse, leads og løsningsgrad
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <article style={{ background: "rgba(246,243,237,0.08)", borderRadius: 8, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(246,243,237,0.72)" }}>Samtaler håndteret</p>
              <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 700 }}>{analytics.conversationsThisWeek}</p>
            </article>
            <article style={{ background: "rgba(246,243,237,0.08)", borderRadius: 8, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(246,243,237,0.72)" }}>Estimeret tid sparet</p>
              <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 700 }}>~{formatHours(analytics.estimatedHoursSaved)} t</p>
            </article>
            <article style={{ background: "rgba(246,243,237,0.08)", borderRadius: 8, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(246,243,237,0.72)" }}>Leads fanget</p>
              <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 700 }}>{analytics.leadsThisWeek}</p>
            </article>
            <article style={{ background: "rgba(246,243,237,0.08)", borderRadius: 8, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(246,243,237,0.72)" }}>Løsningsgrad</p>
              <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 700 }}>{formatPercent(analytics.resolutionRate)}</p>
            </article>
          </div>
        </section>

        <section
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 10,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Udvikling (7 dage)</h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9ca3af" }}>Sort = samtaler, sand = leads</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8, alignItems: "end", height: 132 }}>
            {analytics.daily.map((day, index) => {
              const conversationHeight = Math.max(8, Math.round((day.conversations / analytics.maxDailyValue) * 90));
              const leadHeight = Math.max(8, Math.round((day.leads / analytics.maxDailyValue) * 90));

              return (
                <div key={`${day.label}-${index}`} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "end", gap: 4, height: 96 }}>
                    <div title={`Samtaler: ${day.conversations}`} style={{ width: 12, height: conversationHeight, background: "#60a5fa", borderRadius: 4 }} />
                    <div title={`Leads: ${day.leads}`} style={{ width: 12, height: leadHeight, background: "#3b82f6", borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "capitalize" }}>{day.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <article
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Leads fanget</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9ca3af" }}>E-mail, besked og side</p>
            </div>

            {analytics.leads.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>Ingen leads fundet endnu.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {analytics.leads.map((lead) => (
                  <div key={`${lead.email}-${lead.createdAt || ""}`} style={{ border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 10, display: "grid", gap: 4 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{lead.email}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{lead.message}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>
                      {lead.businessName} · {lead.pageUrl}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Hvad kunder spørger om</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9ca3af" }}>Top-emner fra sidste 7 dage</p>
            </div>

            {analytics.topicInsights.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>Ikke nok data endnu.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {analytics.topicInsights.map((topic) => (
                  <div key={topic.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 10px" }}>
                    <span style={{ fontSize: 13 }}>{topic.label}</span>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>{topic.count}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <section
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 10,
            padding: 16,
            display: "grid",
            gap: 10,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Ubesvarede spørgsmål</h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9ca3af" }}>Spørgsmål hvor botten ser ud til at have manglet et godt svar</p>
          </div>

          {analytics.missedQuestions.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>Ingen tydelige mangler fundet.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {analytics.missedQuestions.map((row) => (
                <div key={`missed-${row.id}`} style={{ border: "1px solid rgba(96,165,250,0.35)", background: "rgba(59,130,246,0.10)", borderRadius: 8, padding: 10, display: "grid", gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{row.question}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#6e2b38" }}>{row.answer}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>{row.businessName}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <article
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>Samtalehøjdepunkter (gode)</h2>
            {analytics.goodHighlights.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>Ingen højdepunkter endnu.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {analytics.goodHighlights.map((item) => (
                  <div key={`good-${item.id}`} style={{ border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 10 }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{item.businessName}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600 }}>Q: {item.question}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>A: {item.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>Forbedringsforslag til botten</h2>
            {analytics.suggestions.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>Ingen presserende forslag lige nu.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {analytics.suggestions.map((suggestion) => (
                  <div key={suggestion} style={{ border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 10, fontSize: 13 }}>
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        {businesses.length === 0 ? (
          <section
            style={{
              borderTop: "1px solid rgba(255,255,255,0.05)",
              padding: "44px 0",
              textAlign: "center",
            }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 500 }}>Du har ingen chatbots endnu</h2>
            <Link
              href="/onboarding"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#3b82f6",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                padding: "10px 18px",
                borderRadius: 5,
              }}
            >
              Opret din første chatbot
            </Link>
          </section>
        ) : (
          <section style={{ display: "grid", gap: 1, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 6 }}>
            <h2 style={{ margin: "8px 0 6px", fontSize: 18 }}>Dine aktive bots</h2>
            {businesses.map((business) => {
              const displayName = (business.name || "Unavngiven chatbot").trim();
              const website = (business.website_url || "Ingen hjemmeside angivet").trim();
              const industry = (business.industry || "Ingen branche").trim();
              const copyFeedback = copiedBusinessId === business.id;

              return (
                <article key={business.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "20px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>{displayName}</h2>
                    <span style={{ background: "rgba(59,130,246,0.12)", color: "#9ca3af", fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 3, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {industry}
                    </span>
                  </div>

                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9ca3af", fontWeight: 300 }}>{website}</p>

                  <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleCopyEmbedCode(business.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid transparent",
                        background: "#3b82f6",
                        color: "#ffffff",
                        fontSize: 13,
                        fontWeight: 500,
                        padding: "8px 14px",
                        borderRadius: 5,
                        cursor: "pointer",
                        fontFamily: '"DM Sans", sans-serif',
                      }}
                    >
                      {copyFeedback ? "Kopieret! ✓" : "Kopier embed-kode"}
                    </button>

                    <Link
                      href={`/dashboard/${business.id}/samtaler`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "transparent",
                        color: "#ffffff",
                        textDecoration: "none",
                        fontSize: 13,
                        fontWeight: 500,
                        padding: "8px 14px",
                        borderRadius: 5,
                      }}
                    >
                      Se samtaler
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
