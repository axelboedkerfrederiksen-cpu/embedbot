import { digest, supportKey, validEmail } from "./security.ts";
export type SupportDraft = { contactEmail: string; description: string; orderNumber: string | null; context: { role: "user" | "assistant"; content: string }[] };
export function supportDraft(value: Record<string, unknown>): SupportDraft | null {
  const email = typeof value.contactEmail === "string" ? value.contactEmail.trim().toLowerCase() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const orderNumber = typeof value.orderNumber === "string" ? value.orderNumber.trim() : "";
  if (!validEmail(email) || description.length < 10 || description.length > 5000 || (orderNumber && !/^#?[\p{L}\p{N}_-]{1,40}$/u.test(orderNumber))) return null;
  const context: SupportDraft["context"] = Array.isArray(value.context) ? value.context.slice(-10).flatMap((m: unknown) => {
    if (!m || typeof m !== "object") return [];
    const row = m as Record<string, unknown>;
    if ((row.role !== "user" && row.role !== "assistant") || typeof row.content !== "string") return [];
    return [{ role: row.role, content: row.content.slice(0, 1500) }];
  }) : [];
  return { contactEmail: email, description, orderNumber: orderNumber || null, context };
}
export function submissionKey(businessId: string, sessionHash: string, draft: SupportDraft) {
  // Changing transient chat context must not duplicate the same customer case.
  return digest(JSON.stringify(["ticket",businessId,sessionHash,draft.contactEmail,draft.description,draft.orderNumber]), supportKey());
}
export type Confirmation = { businessId: string; sessionHash: string; expires: number; draft: SupportDraft; key: string };
export function validConfirmation(value: Confirmation, businessId: string, sessionHash: string, now = Date.now()) {
  return value.businessId === businessId && value.sessionHash === sessionHash && value.expires > now && value.expires <= now + 1800000;
}

export async function persistTicket(db: import("@supabase/supabase-js").SupabaseClient, businessId: string, key: string, draft: SupportDraft, recipient: string | null) {
  const { data, error } = await db.from("commerce_tickets").upsert({ business_id: businessId, submission_key: key, contact_email: draft.contactEmail, description: draft.description, order_number: draft.orderNumber, context: draft.context, customer_verified: false, notification_email: recipient, notification_status: recipient ? "pending" : "not_configured" }, { onConflict: "business_id,submission_key", ignoreDuplicates: true }).select("id,case_number,notification_status").maybeSingle();
  if (error) throw new Error("Ticket could not be saved");
  if (data) return data as { id: string; case_number: number; notification_status: string };
  const { data: existing, error: lookupError } = await db.from("commerce_tickets").select("id,case_number,notification_status").eq("business_id", businessId).eq("submission_key", key).single();
  if (lookupError || !existing) throw new Error("Ticket could not be saved");
  return existing as { id: string; case_number: number; notification_status: string };
}
