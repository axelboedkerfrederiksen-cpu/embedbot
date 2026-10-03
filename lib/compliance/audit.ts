import type { SupabaseClient } from "@supabase/supabase-js";
export type AuditAction = "account.export" | "account.delete" | "visitor.search" | "visitor.export" | "conversation.delete" | "integration.create" | "integration.delete" | "integration.settings" | "admin.read" | "admin.mutate" | "trial.start";
// No arbitrary metadata argument: contents, selectors, credentials, IPs and user agents never enter this log.
export async function audit(db: SupabaseClient, actor: string, business: string | null, action: AuditAction, count?: number) {
  const { error } = await db.from("compliance_audit_events").insert({ actor_user_id: actor, business_id: business, action, record_count: count ?? null });
  if (error) throw new Error("audit_unavailable");
}
