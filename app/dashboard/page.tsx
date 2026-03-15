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
        .eq("user_id", userData.user.id)
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
          background: "#f6f3ed",
          color: "#1a1713",
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
        background: "#f6f3ed",
        color: "#1a1713",
        fontFamily: '"DM Sans", sans-serif',
        paddingTop: 48,
        paddingBottom: 56,
        paddingLeft: 28,
        paddingRight: 28,
      }}
    >
      <div style={{ width: "100%", maxWidth: 820, margin: "0 auto", display: "grid", gap: 24 }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 20, borderBottom: "1px solid rgba(26,23,19,0.12)" }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 600, textDecoration: "none", color: "#1a1713" }}>
            EmbedBot
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
            <span
              style={{
                maxWidth: 220,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "#706c65",
                fontSize: 13,
              }}
            >
              {email || "ukendt bruger"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                border: "1px solid rgba(26,23,19,0.22)",
                background: "transparent",
                color: "#1a1713",
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
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, fontWeight: 600 }}>Mine chatbots</h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#706c65", fontWeight: 300 }}>
              Her kan du se og administrere dine aktive chatbots
            </p>
          </div>
          <Link
            href="/onboarding"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#1a1713",
              color: "#f6f3ed",
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
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              borderRadius: 5,
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
              borderTop: "1px solid rgba(26,23,19,0.12)",
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
                background: "#1a1713",
                color: "#f6f3ed",
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
          <section style={{ display: "grid", gap: 1, borderTop: "1px solid rgba(26,23,19,0.12)" }}>
            {businesses.map((business) => {
              const displayName = (business.name || "Unavngiven chatbot").trim();
              const website = (business.website_url || "Ingen hjemmeside angivet").trim();
              const industry = (business.industry || "Ingen branche").trim();
              const copyFeedback = copiedBusinessId === business.id;

              return (
                <article
                  key={business.id}
                  style={{
                    borderBottom: "1px solid rgba(26,23,19,0.12)",
                    padding: "20px 0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>{displayName}</h2>
                    <span
                      style={{
                        background: "rgba(26,23,19,0.07)",
                        color: "#5a564f",
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "4px 10px",
                        borderRadius: 3,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {industry}
                    </span>
                  </div>

                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#706c65", fontWeight: 300 }}>{website}</p>

                  <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleCopyEmbedCode(business.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid transparent",
                        background: "#1a1713",
                        color: "#f6f3ed",
                        fontSize: 13,
                        fontWeight: 500,
                        padding: "8px 14px",
                        borderRadius: 5,
                        cursor: "pointer",
                        fontFamily: '"DM Sans", sans-serif',
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
                        border: "1px solid rgba(26,23,19,0.22)",
                        background: "transparent",
                        color: "#1a1713",
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
