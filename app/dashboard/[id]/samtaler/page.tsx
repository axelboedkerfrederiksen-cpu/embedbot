"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type ConversationRow = {
  id: string;
  business_id: string;
  created_at: string | null;
  messages: unknown;
};

type BusinessRow = {
  id: string;
  name: string | null;
  website_url: string | null;
};

type ChatMessage = {
  role: string;
  content: string;
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
        const role =
          typeof obj.role === "string"
            ? obj.role
            : typeof obj.sender === "string"
              ? obj.sender
              : "assistant";

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
    .filter((msg) => msg.content.trim().length > 0);
}

export default function SamtalerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const businessId = typeof params?.id === "string" ? params.id : "";

  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!businessId) {
        setError("Mangler business id.");
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!mounted) {
        return;
      }

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const [{ data: businessData, error: businessError }, { data: convoData, error: convoError }] =
        await Promise.all([
          supabase
            .from("businesses")
            .select("id,name,website_url")
            .eq("id", businessId)
            .single(),
          supabase
            .from("conversations")
            .select("id,business_id,created_at,messages")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false }),
        ]);

      if (!mounted) {
        return;
      }

      if (businessError) {
        setError(businessError.message || "Kunne ikke hente chatbot.");
        setLoading(false);
        return;
      }

      if (convoError) {
        const rawError = convoError.message || "";
        if (rawError.includes("Could not find the table") && rawError.includes("conversations")) {
          setError("Tabellen 'conversations' mangler i Supabase. Opret den i SQL Editor for at se samtaler.");
        } else {
          setError(rawError || "Kunne ikke hente samtaler.");
        }
        setLoading(false);
        return;
      }

      setBusiness(businessData as BusinessRow);
      setConversations((convoData || []) as ConversationRow[]);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [businessId, router, supabase.auth, supabase]);

  function toggleConversation(id: string) {
    setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#030712",
        }}
      >
        Indlæser samtaler...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#030712",
        padding: "40px 16px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>Samtaler</h1>
            <p style={{ margin: "6px 0 0", color: "#9ca3af", fontSize: 14 }}>
              {business?.name || "Ukendt chatbot"}
              {business?.website_url ? ` · ${business.website_url}` : ""}
            </p>
          </div>
          <Link
            href="/dashboard"
            style={{
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 999,
              background: "#111827",
              color: "#ffffff",
              fontWeight: 700,
              padding: "8px 14px",
              fontSize: 13,
            }}
          >
            Tilbage
          </Link>
        </div>

        {error ? (
          <p
            style={{
              margin: 0,
              border: "1px solid rgba(96,165,250,0.35)",
              background: "rgba(59,130,246,0.12)",
              color: "#60a5fa",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 14,
            }}
          >
            {error}
          </p>
        ) : null}

        {conversations.length === 0 ? (
          <section
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
              padding: "28px 16px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, color: "#9ca3af" }}>Ingen samtaler fundet endnu.</p>
          </section>
        ) : (
          <section style={{ display: "grid", gap: 10 }}>
            {conversations.map((conversation) => {
              const isOpen = Boolean(openRows[conversation.id]);
              const messages = normalizeMessages(conversation.messages);
              const createdAtLabel = conversation.created_at
                ? new Date(conversation.created_at).toLocaleString("da-DK")
                : "Ukendt tid";

              return (
                <article
                  key={conversation.id}
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleConversation(conversation.id)}
                    style={{
                      width: "100%",
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Samtale {conversation.id.slice(0, 8)}</span>
                    <span style={{ color: "#9ca3af", fontSize: 13 }}>{createdAtLabel}</span>
                  </button>

                  {isOpen ? (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: 12, display: "grid", gap: 8 }}>
                      {messages.length === 0 ? (
                        <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>Ingen beskeder i denne samtale.</p>
                      ) : (
                        messages.map((message, index) => {
                          const isUser = message.role.toLowerCase().includes("user");

                          return (
                            <div
                              key={`${conversation.id}-${index}`}
                              style={{
                                display: "flex",
                                justifyContent: isUser ? "flex-end" : "flex-start",
                              }}
                            >
                              <div
                                style={{
                                  maxWidth: "78%",
                                  borderRadius: 12,
                                  padding: "9px 11px",
                                  fontSize: 13,
                                  lineHeight: 1.4,
                                  background: isUser ? "#3b82f6" : "rgba(255,255,255,0.05)",
                                  color: "#ffffff",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {message.content}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
