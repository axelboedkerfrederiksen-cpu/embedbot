import { readChatReference } from "@/lib/compliance/chat-reference";
import { NextRequest } from "next/server";
import { body, CommerceError, failure, json, limit, publicContext } from "@/lib/commerce/server";
import { seal, supportKey, unseal } from "@/lib/commerce/security";
import { supportDraft, submissionKey, persistTicket, validConfirmation, type Confirmation } from "@/lib/commerce/support";
import { notifyTicket } from "@/lib/commerce/mail";
export const runtime = "nodejs";
export async function OPTIONS() { return json({}); }
export async function POST(req: NextRequest) {
  try {
    const input = await body(req);
    const { db, business, sessionHash } = await publicContext(req, input);
    await limit(db, req, business.id, "support", 15, 3600);
    if (input.action === "prepare") {
      const draft = supportDraft(input);
      if (!draft || input.website) throw new CommerceError("Indtast en gyldig kontaktmail og en beskrivelse på 10–5.000 tegn.", 400);
      const ids: string[] = Array.isArray(input.references) ? [...new Set(input.references.slice(-10).map(token=>readChatReference(token,business.id,input.session)).filter((id):id is string=>Boolean(id)))] : [];
      let conversationIds: string[] = [];
      if (ids.length && draft.context.length) {
        const {data:existing,error:referenceError}=await db.from("conversations").select("id").eq("business_id",business.id).in("id",ids);
        if(referenceError)throw new CommerceError("Samtalereferencer kunne ikke kontrolleres.");
        conversationIds=(existing||[]).map(c=>c.id);
      }
      const key = submissionKey(business.id, sessionHash, draft);
      const confirmation: Confirmation = { businessId: business.id, sessionHash, expires: Date.now() + 1800000, draft, key, conversationIds };
      return json({ confirmation: seal(confirmation, `support:${business.id}`, supportKey()), summary: draft, text: "Kontrollér henvendelsen. Den bliver først oprettet, når du vælger ‘Send henvendelse’. Oplysningerne markeres som indsendt af kunden og er ikke verificeret." });
    }
    if (input.action === "confirm") {
      if (input.confirmed !== true || typeof input.confirmation !== "string") throw new CommerceError("Bekræft først henvendelsen.", 400);
      let confirmation: Confirmation;
      try { confirmation = unseal<Confirmation>(input.confirmation, `support:${business.id}`, supportKey()); } catch { throw new CommerceError("Opsummeringen er ikke gyldig. Opret en ny opsummering.", 400); }
      if (!validConfirmation(confirmation, business.id, sessionHash)) throw new CommerceError("Opsummeringen er udløbet eller hører til en anden chat. Opret en ny opsummering.", 400);
      const { data: existing, error: existingError } = await db.from("commerce_tickets").select("id,case_number,notification_status").eq("business_id", business.id).eq("submission_key", confirmation.key).maybeSingle();
      if (existingError) throw new CommerceError("Supportsager er ikke konfigureret endnu.");
      if (existing) return json({ caseNumber: `EB-${existing.case_number}`, notificationStatus: existing.notification_status, text: "Henvendelsen er allerede oprettet. Her er dit sagsnummer." });
      await limit(db, req, business.id, "support_create", 5, 3600);
      await limit(db, req, business.id, "support_email", 5, 3600, confirmation.draft.contactEmail);
      const { data: settings, error: settingsError } = await db.from("commerce_settings").select("notification_email").eq("business_id", business.id).maybeSingle();
      if (settingsError) throw new CommerceError("Supportsager er ikke konfigureret endnu.");
      const recipient = settings?.notification_email || null;
      const draft = confirmation.draft;
      const saved = await persistTicket(db, business.id, confirmation.key, draft, recipient, confirmation.conversationIds || []);
      await notifyTicket(db, saved.id, business.id);
      const { data: latest } = await db.from("commerce_tickets").select("notification_status").eq("id", saved.id).eq("business_id", business.id).single();
      return json({ caseNumber: `EB-${saved.case_number}`, notificationStatus: latest?.notification_status || saved.notification_status, text: "Din henvendelse er oprettet og gemt. Gem sagsnummeret, hvis du kontakter webshoppen." });
    }
    throw new CommerceError("Ugyldig handling.", 400);
  } catch (error) { return failure(error); }
}
