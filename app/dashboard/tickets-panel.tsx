"use client";
import { useEffect, useState } from "react";
import { Inbox, Mail, RefreshCw, ArrowLeft } from "lucide-react";
import { commerceRequest } from "@/lib/commerce-request";
import styles from "./dashboard.module.css";
import ui from "./commerce.module.css";
type Ticket = { id: string; case_number: number; contact_email: string; description: string; order_number: string | null; context: { role: string; content: string }[]; status: string; notification_status: string; created_at: string };
const statuses: Record<string,string> = { new: "Ny", in_progress: "Under behandling", closed: "Afsluttet" };
const mailStatuses: Record<string,string> = { pending: "Afventer afsendelse", sending: "Afsendelse behandles", sent: "Sendt til mailudbyder", failed: "Mail kunne ikke sendes", not_configured: "Mail er ikke konfigureret" };
export default function TicketsPanel({ businessId, demo = false }: { businessId: string; demo?: boolean }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState("");
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const active = tickets.find(t => t.id === activeId);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    if (demo) { setLoading(false); return () => controller.abort(); }
    commerceRequest(`/api/dashboard/tickets?business_id=${encodeURIComponent(businessId)}&status=${status}`, undefined, controller.signal).then(data => setTickets(data.tickets)).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [businessId, status, demo, reload]);
  async function update(action: string, fields: Record<string,unknown> = {}) {
    if (!active) return;
    setBusy(true); setError("");
    try { await commerceRequest("/api/dashboard/tickets", { business_id: businessId, id: active.id, action, ...fields }); setReload(n => n + 1); } catch (error) { setError(error instanceof Error ? error.message : "Sagen kunne ikke opdateres."); } finally { setBusy(false); }
  }
  return <div className={ui.stack}>
    {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}
    {demo ? <div className={styles.infoBanner}>Forhåndsvisning · Der vises ingen simulerede supportsager.</div> : null}
    {active ? <section className={`${styles.card} ${ui.section}`}><button className={styles.buttonGhost} onClick={() => setActiveId("")}><ArrowLeft size={15} />Alle sager</button><div className={ui.heading}><div><p className={ui.hint}>Oprettet {new Date(active.created_at).toLocaleString("da-DK")}</p><h2>Supportsag EB-{active.case_number}</h2></div><span className={ui.tag}>{statuses[active.status]}</span></div><div className={ui.twoColumns}><div><h3>Kontaktoplysninger</h3><a href={`mailto:${active.contact_email}`} className={ui.mail}><Mail size={16} />{active.contact_email}</a><p className={ui.hint}>Ordrenummer: {active.order_number || "Ikke angivet"}</p></div><label className={ui.field}>Sagens status<select value={active.status} disabled={busy} onChange={e => void update("status", { status: e.target.value })}>{Object.entries(statuses).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className={ui.description}><h3>Henvendelse</h3><p>{active.description}</p><small>Indsendt af kunden · Kontaktmail og ordrenummer er ikke verificeret.</small></div><div className={ui.connected}><strong>Mailnotifikation</strong><p role="status">{mailStatuses[active.notification_status]}</p><p className={ui.hint}>Sagen er gemt, uanset om mailen er sendt. “Sendt” betyder, at mailudbyderen har accepteret den.</p>{["failed","pending","not_configured"].includes(active.notification_status) ? <button className={styles.buttonSecondary} disabled={busy} onClick={() => void update("retry")}><RefreshCw size={14} />Prøv afsendelse igen</button> : null}</div><h3>Samtalekontekst</h3>{active.context.length ? <div className={ui.context}>{active.context.map((m,i) => <div key={i}><strong>{m.role === "user" ? "Kunde" : "Chatbot"}</strong><p>{m.content}</p></div>)}</div> : <p className={ui.hint}>Kunden har ikke vedlagt samtalekontekst.</p>}</section> : <section className={`${styles.card} ${ui.section}`}><div className={ui.heading}><div><h2>Kundernes henvendelser</h2><p>Åbn en sag, følg op med kunden og hold styr på status.</p></div><button className={styles.buttonGhost} aria-label="Opdatér supportsager" disabled={loading} onClick={() => setReload(n => n + 1)}><RefreshCw size={16} /></button></div><label className={ui.filter}>Vis status<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Alle sager</option>{Object.entries(statuses).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>{loading ? <div className={styles.emptyState}><span className={styles.spinner} /><p>Henter supportsager…</p></div> : tickets.length ? <div className={ui.ticketList}>{tickets.map(ticket => <button key={ticket.id} className={ui.ticketRow} onClick={() => setActiveId(ticket.id)}><div><strong>EB-{ticket.case_number}</strong><p>{ticket.description}</p><small>{ticket.contact_email} · {new Date(ticket.created_at).toLocaleDateString("da-DK")}</small></div><span className={ui.tag}>{statuses[ticket.status]}</span></button>)}</div> : <div className={styles.emptyState}><Inbox size={28} /><strong>{status ? "Ingen sager med denne status" : "Ingen supportsager endnu"}</strong><p>Kundernes bekræftede henvendelser bliver vist her, så du kan hjælpe dem videre.</p></div>}<p className={ui.hint}>Viser op til de 100 seneste sager med den valgte status.</p></section>}
  </div>;
}
