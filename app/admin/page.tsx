"use client";

import { FormEvent, useState } from "react";

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
  font_choice?: string | null;
  [key: string]: unknown;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
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

  async function fetchBusinesses() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kunne ikke hente virksomheder.");
      }

      setBusinesses((data.businesses || []) as Business[]);
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        setError(fetchError.message || "Kunne ikke hente virksomheder.");
      } else {
        setError("Kunne ikke hente virksomheder.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthError("");

    const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

    if (!expected) {
      setAuthError("NEXT_PUBLIC_ADMIN_PASSWORD eller ADMIN_PASSWORD mangler i miljøvariabler.");
      return;
    }

    if (password !== expected) {
      setAuthError("Forkert adgangskode.");
      return;
    }

    setIsAuthenticated(true);
    await fetchBusinesses();
  }

  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
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

    setEditDrafts(prev => ({ ...prev, [business.id]: draft }));
    setEditingId(business.id);
    setExpanded(prev => ({ ...prev, [business.id]: true }));
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
  }

  function updateDraftValue(businessId: string, key: string, value: string) {
    setEditDrafts(prev => ({
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
      return;
    }

    const updates = editDrafts[stableBusinessId] || {};

    if (Object.keys(updates).length === 0) {
      setError("Ingen ændringer at gemme.");
      return;
    }

    setSavingId(stableBusinessId);
    setError("");

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: stableBusinessId, updates }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke gemme ændringer.");
      }

      setBusinesses(prev => prev.map(b => (b.id === stableBusinessId ? (data.business as Business) : b)));
      setEditingId(null);
    } catch (saveError) {
      if (saveError instanceof Error) {
        setError(saveError.message);
      } else {
        setError("Kunne ikke gemme ændringer.");
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
    } catch (activationError) {
      if (activationError instanceof Error) {
        setError(activationError.message);
      } else {
        setError("Kunne ikke aktivere virksomhed.");
      }
    } finally {
      setActivatingId(null);
    }
  }

  async function deleteBusiness(id: string) {
    const confirmed = window.confirm(
      "Er du sikker på at du vil slette denne virksomhed? Dobble tjek for at du ikke laver en fejl"
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError("");

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kunne ikke slette virksomhed.");
      }

      await fetchBusinesses();
    } catch (deleteError) {
      if (deleteError instanceof Error) {
        setError(deleteError.message);
      } else {
        setError("Kunne ikke slette virksomhed.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  const styles = (
    <style jsx global>{`
      @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display:ital@0;1&display=swap");

      .admin-page {
        min-height: 100vh;
        background: #f5f5f5;
        color: #000;
        padding: 24px 16px 40px;
        font-family: "DM Sans", sans-serif;
      }

      .admin-shell {
        width: 100%;
        max-width: 860px;
        margin: 0 auto;
      }

      .admin-card {
        background: #fff;
        border: 1px solid #e7e7e7;
        border-radius: 16px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
        padding: 20px;
      }

      .admin-hero {
        margin-bottom: 18px;
      }

      .admin-title {
        margin: 0;
        font-size: clamp(1.8rem, 5vw, 2.4rem);
        line-height: 1.1;
        font-family: "DM Serif Display", serif;
      }

      .admin-subtitle {
        margin: 8px 0 0;
        color: #666;
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

      .field-input {
        width: 100%;
        background: #fff;
        border: 1px solid #d9d9d9;
        border-radius: 10px;
        padding: 11px 12px;
        box-sizing: border-box;
        font-family: "DM Sans", sans-serif;
        font-size: 14px;
        color: #000;
        transition: border-color 150ms ease, box-shadow 150ms ease;
      }

      .field-input::placeholder {
        color: #999;
      }

      .field-input:focus {
        outline: none;
        border-color: #000;
        box-shadow: 0 0 0 1px #000;
      }

      .btn {
        border: 1px solid #000;
        border-radius: 10px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 150ms ease, background-color 150ms ease, color 150ms ease, border-color 150ms ease;
        font-family: "DM Sans", sans-serif;
      }

      .btn:hover {
        transform: translateY(-1px);
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
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
        border-color: #d3d3d3;
      }

      .btn-secondary:hover {
        border-color: #000;
      }

      .btn-danger {
        background: #fff;
        color: #b00020;
        border-color: #f2b8c0;
      }

      .btn-danger:hover {
        border-color: #b00020;
        background: #fff5f6;
      }

      .btn-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .message-error {
        margin: 10px 0 0;
        color: #b00020;
        font-size: 14px;
      }

      .message-muted {
        margin: 6px 0 0;
        color: #666;
        font-size: 14px;
      }

      .business-list {
        display: grid;
        gap: 14px;
      }

      .business-card {
        border: 1px solid #e5e5e5;
        border-radius: 14px;
        background: #fff;
        padding: 16px;
      }

      .business-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
      }

      .business-name {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
      }

      .business-meta {
        margin-top: 8px;
        color: #666;
        font-size: 14px;
        line-height: 1.5;
      }

      .status-badge {
        display: inline-block;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid;
        white-space: nowrap;
      }

      .status-active {
        color: #166534;
        border-color: #86efac;
        background: #f0fdf4;
      }

      .status-pending {
        color: #9a3412;
        border-color: #fdba74;
        background: #fff7ed;
      }

      .details {
        margin-top: 12px;
        border-top: 1px solid #ececec;
        padding-top: 12px;
        display: grid;
        gap: 8px;
      }

      .detail-row {
        display: grid;
        grid-template-columns: 180px 1fr;
        gap: 8px;
        font-size: 13px;
      }

      .detail-key {
        color: #555;
        font-weight: 700;
        text-transform: lowercase;
      }

      .detail-value {
        color: #111;
        word-break: break-word;
      }

      .detail-input,
      .detail-textarea {
        width: 100%;
        background: #fff;
        border: 1px solid #d9d9d9;
        border-radius: 8px;
        padding: 8px 10px;
        font-family: "DM Sans", sans-serif;
        font-size: 13px;
        color: #111;
        box-sizing: border-box;
      }

      .detail-input:focus,
      .detail-textarea:focus {
        outline: none;
        border-color: #000;
        box-shadow: 0 0 0 1px #000;
      }

      .detail-textarea {
        resize: vertical;
        min-height: 80px;
      }

      .login-wrap {
        max-width: 420px;
        margin: 8vh auto 0;
      }

      @media (max-width: 700px) {
        .admin-card {
          padding: 16px;
        }

        .business-card {
          padding: 14px;
        }

        .detail-row {
          grid-template-columns: 1fr;
          gap: 2px;
        }
      }
    `}</style>
  );

  if (!isAuthenticated) {
    return (
      <main className="admin-page">
        {styles}
        <div className="login-wrap">
          <div className="admin-card">
            <h1 className="admin-title">EmbedBot Admin</h1>
            <p className="admin-subtitle">Indtast adgangskoden for at fortsætte.</p>
            <form onSubmit={handleLogin} style={{ marginTop: 16 }}>
              <div className="field">
                <label className="field-label">Adgangskode</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="field-input"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                Log ind
              </button>
              {authError && <p className="message-error">{authError}</p>}
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      {styles}
      <div className="admin-shell">
        <div className="admin-hero">
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Alle virksomheder i EmbedBot.</p>
        </div>

        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12 }}>
            <strong>Virksomheder</strong>
            <button className="btn btn-secondary" onClick={fetchBusinesses} disabled={loading}>
              {loading ? "Opdaterer..." : "Opdater liste"}
            </button>
          </div>

          {error && <p className="message-error">{error}</p>}
          {!loading && businesses.length === 0 && <p className="message-muted">Ingen virksomheder fundet.</p>}

          <div className="business-list">
            {businesses.map(business => {
              const isOpen = !!expanded[business.id];
              const isActive = !!business.activated;
              const isEditing = editingId === business.id;
              const draft = editDrafts[business.id] || {};
              const installScript = `<script 
  src="https://embedbot1.vercel.app/widget.js?id=${business.id}"
  data-name="${business.name || "Support"}"
  data-primary-color="${business.primary_color || "#000000"}"
  data-secondary-color="${business.secondary_color || "#000000"}"
  data-fab-color="${business.fab_color || "#000000"}"
  data-font="${business.font_choice || "sans-serif"}">
<\/script>`;

              return (
                <article className="business-card" key={business.id}>
                  <div className="business-top">
                    <div>
                      <h2 className="business-name">{business.name || "Uden navn"}</h2>
                      <div className="business-meta">
                        <div>
                          <strong>Website:</strong> {business.website_url || "-"}
                        </div>
                        <div>
                          <strong>Email:</strong> {business.support_email || "-"}
                        </div>
                        <div>
                          <strong>Oprettet:</strong>{" "}
                          {business.created_at ? new Date(business.created_at).toLocaleString("da-DK") : "-"}
                        </div>
                      </div>
                    </div>
                    <span className={`status-badge ${isActive ? "status-active" : "status-pending"}`}>
                      {isActive ? "Aktiv" : "Afventer"}
                    </span>
                  </div>

                  <div className="btn-row" style={{ marginTop: 12 }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => activateBusiness(business.id)}
                      disabled={activatingId === business.id || deletingId === business.id || savingId === business.id}
                    >
                      {activatingId === business.id ? "Aktiverer..." : "Aktiver"}
                    </button>
                    <button className="btn btn-secondary" onClick={() => toggleExpand(business.id)}>
                      {isOpen ? "Skjul info" : "Se info"}
                    </button>
                    {!isEditing && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => startEditing(business)}
                        disabled={savingId === business.id || deletingId === business.id || activatingId === business.id}
                      >
                        Rediger
                      </button>
                    )}
                    {isEditing && (
                      <>
                        <button
                          className="btn btn-primary"
                          onClick={() => saveBusinessEdit(business)}
                          disabled={savingId === business.id}
                        >
                          {savingId === business.id ? "Gemmer..." : "Gem"}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={cancelEditing}
                          disabled={savingId === business.id}
                        >
                          Annuller
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteBusiness(business.id)}
                      disabled={deletingId === business.id || activatingId === business.id || savingId === business.id}
                    >
                      {deletingId === business.id ? "Sletter..." : "Slet"}
                    </button>
                  </div>

                  {isActive && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Install script</div>
                      <pre
                        style={{
                          margin: 0,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #e5e5e5",
                          background: "#fafafa",
                          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                          fontSize: 12,
                          lineHeight: 1.45,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                        }}
                      >
                        {installScript}
                      </pre>
                    </div>
                  )}

                  {isOpen && (
                    <div className="details">
                      {Object.entries(business).map(([key, value]) => {
                        const isReadOnlyKey = key === "id" || key === "created_at";
                        const text =
                          value === null || value === undefined
                            ? "-"
                            : typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                            ? String(value)
                            : JSON.stringify(value);

                        return (
                          <div className="detail-row" key={`${business.id}-${key}`}>
                            <div className="detail-key">{key}</div>
                            <div className="detail-value">
                              {isEditing && !isReadOnlyKey ? (
                                isTextareaField(key) ? (
                                  <textarea
                                    className="detail-textarea"
                                    value={draft[key] ?? ""}
                                    onChange={e => updateDraftValue(business.id, key, e.target.value)}
                                  />
                                ) : (
                                  <input
                                    className="detail-input"
                                    value={draft[key] ?? ""}
                                    onChange={e => updateDraftValue(business.id, key, e.target.value)}
                                  />
                                )
                              ) : (
                                text
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
