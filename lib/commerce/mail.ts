import { resend } from "../resend.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
export const commerceEmailFrom = () => process.env.COMMERCE_EMAIL_FROM?.trim() || "EmbedBot <axel@embedbot.dk>";
export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim());
export type Ticket = { id: string; business_id: string; case_number: number; contact_email: string; description: string; order_number: string | null; context: { role: string; content: string }[]; status: string; notification_email: string | null; notification_status: string; notification_attempts: number; notification_first_attempt_at: string | null; created_at: string };
export type MailSender = (ticket: Ticket) => Promise<string>;
export const sendTicket: MailSender = async ticket => {
  const { data, error } = await resend.emails.send({ from: commerceEmailFrom(), to: ticket.notification_email!, replyTo: ticket.contact_email, subject: `Ny supportsag EB-${ticket.case_number}`, text: `Supportsag EB-${ticket.case_number}\n\nKontakt: ${ticket.contact_email}\nOrdrenummer (oplyst af kunden, ikke verificeret): ${ticket.order_number || 'Ikke angivet'}\n\n${ticket.description}\n\nKunden har eksplicit bekræftet indsendelsen. Oplysningerne er indsendt af kunden og er ikke verificeret.\n\nÅbn EmbedBot-dashboardet for samtalekontekst og status.` }, { idempotencyKey: `commerce-ticket-${ticket.id}` });
  if (error || !data?.id) throw new Error("Mail unavailable");
  return data.id;
};
export async function notifyTicket(db: SupabaseClient, id: string, businessId: string, send: MailSender = sendTicket, configured = mailConfigured()): Promise<void> {
  if (!configured) {
    await db.from("commerce_tickets").update({ notification_status: "not_configured" }).eq("id", id).eq("business_id", businessId).in("notification_status", ["pending","failed","not_configured"]);
    return;
  }
  const { data, error } = await db.rpc("claim_commerce_notification", { p_id: id, p_business_id: businessId });
  if (error || !data?.[0]) return;
  const ticket = data[0] as Ticket;
  try {
    const providerId = await send(ticket);
    await db.from("commerce_tickets").update({ notification_status: "sent", notification_provider_id: providerId, notification_updated_at: new Date().toISOString() }).eq("id", id).eq("business_id", businessId).eq("notification_attempts", ticket.notification_attempts).eq("notification_status", "sending");
  } catch {
    await db.from("commerce_tickets").update({ notification_status: "failed", notification_updated_at: new Date().toISOString() }).eq("id", id).eq("business_id", businessId).eq("notification_attempts", ticket.notification_attempts).eq("notification_status", "sending");
  }
}
export async function retryNotifications(db: SupabaseClient) {
  const { data, error } = await db.from("commerce_tickets").select("id,business_id").in("notification_status", ["pending","failed","sending","not_configured"]).lt("notification_updated_at", new Date(Date.now() - 120000).toISOString()).lt("notification_attempts", 5).order("notification_updated_at").limit(50);
  if (error) return 0;
  for (const ticket of data || []) await notifyTicket(db, ticket.id, ticket.business_id);
  await db.from("commerce_order_challenges").delete().lt("expires_at", new Date().toISOString());
  await db.from("commerce_connection_attempts").delete().lt("expires_at", new Date().toISOString());
  return data?.length || 0;
}
