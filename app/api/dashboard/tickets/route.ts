import { NextRequest } from "next/server";
import { body, CommerceError, failure, json, owner } from "@/lib/commerce/server";
import { validId } from "@/lib/commerce/security";
import { notifyTicket } from "@/lib/commerce/mail";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const { db, business } = await owner(req, req.nextUrl.searchParams.get("business_id"));
    const status = req.nextUrl.searchParams.get("status") || "";
    let query = db.from("commerce_tickets").select("id,case_number,contact_email,description,order_number,customer_verified,context,status,notification_status,notification_attempts,notification_first_attempt_at,created_at,updated_at").eq("business_id", business.id).order("created_at", { ascending: false }).limit(100);
    if (["new","in_progress","closed"].includes(status)) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new CommerceError("Supportsager er ikke konfigureret endnu.");
    return json({ tickets: data || [] });
  } catch (error) { return failure(error); }
}
export async function POST(req: NextRequest) {
  try {
    const input = await body(req);
    const { db, business } = await owner(req, input.business_id, true);
    if (!validId(input.id)) throw new CommerceError("Ugyldig sag.", 400);
    const { data: ticket, error } = await db.from("commerce_tickets").select("id,notification_attempts,notification_first_attempt_at,notification_email,notification_status").eq("business_id", business.id).eq("id", input.id).maybeSingle();
    if (error || !ticket) throw new CommerceError("Sagen blev ikke fundet.", 404);
    if (input.action === "retry") {
      if (!ticket.notification_email) throw new CommerceError("Sagen har ingen notifikationsmodtager. Den er gemt i dashboardet; kontakt kunden via mail.", 400);
      if (ticket.notification_attempts >= 5 || (ticket.notification_first_attempt_at && Date.now() - new Date(ticket.notification_first_attempt_at).getTime() >= 23 * 3600000)) throw new CommerceError("Automatisk genforsøg er udløbet. Kontrollér mailstatus hos udbyderen og kontakt kunden manuelt.", 409);
      await notifyTicket(db, ticket.id, business.id);
    } else if (input.action === "status" && ["new","in_progress","closed"].includes(String(input.status))) {
      const { error: updateError } = await db.from("commerce_tickets").update({ status: input.status, updated_at: new Date().toISOString() }).eq("id", ticket.id).eq("business_id", business.id);
      if (updateError) throw new CommerceError("Status kunne ikke gemmes.");
    } else { throw new CommerceError("Ugyldig handling.", 400); }
    return json({ success: true });
  } catch (error) { return failure(error); }
}
