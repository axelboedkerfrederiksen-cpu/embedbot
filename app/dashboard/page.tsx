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

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [fetchError, setFetchError] = useState("");
  const [copiedBusinessId, setCopiedBusinessId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      const { data: userData } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      setEmail(userData.user.email || "");

      const { data, error } = await supabase
        .from("businesses")
        .select("id,name,website_url,created_at,industry")
        .order("created_at", { ascending: false });

      if (!mounted) {
        return;
      }

      if (error) {
        setFetchError(error.message || "Kunne ikke hente dine chatbots.");
      } else {
        setBusinesses((data || []) as Business[]);
      }

      setLoading(false);
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [router, supabase.auth]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleCopyEmbedCode(businessId: string) {
    const script = `<script src="https://embedbot1.vercel.app/widget.js" data-business-id="${businessId}"></script>`;

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

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(135deg, #fff5f0, #f0f4ff)",
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
        background: "linear-gradient(135deg, #fff5f0, #f0f4ff)",
        color: "#18181b",
        paddingTop: 60,
        paddingBottom: 48,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 900, margin: "0 auto", display: "grid", gap: 20 }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link href="/" style={{ fontSize: 24, fontWeight: 800, textDecoration: "none", color: "#111" }}>
            EmbedBot
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span
              style={{
                maxWidth: 220,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "#666",
                fontSize: 13,
              }}
            >
              {email || "ukendt bruger"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                borderRadius: 999,
                border: "1px solid #d4d4d8",
                background: "#f4f4f5",
                color: "#52525b",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              Log ud
            </button>
          </div>
        </nav>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #ececec",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
            padding: 24,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.05, fontWeight: 800 }}>Mine chatbots</h1>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "#5f5f5f" }}>
              Her kan du se og administrere dine aktive chatbots
            </p>
          </div>
          <Link
            href="/onboarding"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              background: "#111111",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
              padding: "10px 18px",
            }}
          >
            Opret ny chatbot
          </Link>
        </section>

        {fetchError ? (
          <p
            style={{
              margin: 0,
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 14,
            }}
          >
            {fetchError}
          </p>
        ) : null}

        {businesses.length === 0 ? (
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #ececec",
              borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
              padding: "44px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40 }}>🤖</div>
            <h2 style={{ margin: "10px 0 0", fontSize: 22 }}>Du har ingen chatbots endnu</h2>
            <Link
              href="/onboarding"
              style={{
                marginTop: 16,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                background: "#111111",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 700,
                padding: "10px 18px",
              }}
            >
              Opret din første chatbot
            </Link>
          </section>
        ) : (
          <section style={{ display: "grid", gap: 12 }}>
            {businesses.map((business) => {
              const displayName = (business.name || "Unavngiven chatbot").trim();
              const website = (business.website_url || "Ingen hjemmeside angivet").trim();
              const industry = (business.industry || "Ingen branche").trim();
              const copyFeedback = copiedBusinessId === business.id;

              return (
                <article
                  key={business.id}
                  style={{
                    background: "#f9f9f9",
                    border: "1px solid #ececec",
                    borderRadius: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{displayName}</h2>
                    <span
                      style={{
                        borderRadius: 999,
                        background: "#e4e4e7",
                        color: "#52525b",
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "5px 10px",
                      }}
                    >
                      {industry}
                    </span>
                  </div>

                  <p style={{ margin: "8px 0 0", fontSize: 14, color: "#666" }}>{website}</p>

                  <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleCopyEmbedCode(business.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 999,
                        border: "1px solid #111",
                        background: "#111",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: "9px 14px",
                        cursor: "pointer",
                      }}
                    >
                      {copyFeedback ? "Kopieret! ✓" : "Kopiér embed-kode"}
                    </button>

                    <Link
                      href={`/dashboard/${business.id}/samtaler`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 999,
                        border: "1px solid #d4d4d8",
                        background: "#ffffff",
                        color: "#222",
                        textDecoration: "none",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: "9px 14px",
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
