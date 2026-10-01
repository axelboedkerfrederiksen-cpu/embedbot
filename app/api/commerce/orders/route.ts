import { after, NextRequest } from "next/server";
import { resend } from "@/lib/resend";
import { body, CommerceError, failure, integration, json, limit, publicContext } from "@/lib/commerce/server";
import { validId } from "@/lib/commerce/security";
import { validOrderInput } from "@/lib/commerce/types";
import { requestOrderCode, verifiedOrder } from "@/lib/commerce/orders";
import { commerceEmailFrom, mailConfigured } from "@/lib/commerce/mail";
export const runtime = "nodejs";
export async function OPTIONS() { return json({}); }
export async function POST(req: NextRequest) {
  try {
    const input = await body(req);
    const { db, business, sessionHash } = await publicContext(req, input);
    await limit(db, req, business.id, "orders", 15, 900);
    const connected = await integration(db, business.id);
    if (!connected?.adapter.ordersEnabled || !mailConfigured()) throw new CommerceError("Ordreopslag er ikke konfigureret her. Du kan oprette en supportsag.");
    const context = { db, businessId: business.id, sessionHash, revision: connected.revision, adapter: connected.adapter };
    if (input.action === "request") {
      const locator = validOrderInput(input.order);
      if (!locator) throw new CommerceError("Indtast ordrenummer og en gyldig e-mailadresse.", 400);
      await limit(db, req, business.id, "order_email", 3, 900, locator.email);
      await limit(db, req, business.id, "order_request", 5, 900);
      const result = await requestOrderCode(context, locator, async (email, code, id) => {
        const { error } = await resend.emails.send({ from: commerceEmailFrom(), to: email, subject: "Din engangskode til ordreopslag", text: `Din engangskode er ${code}. Den gælder i 10 minutter og kan bruges én gang i den chat, hvor du anmodede om den.\n\nDel ikke koden. Hvis du ikke bad om en kode, kan du ignorere denne mail.` }, { idempotencyKey: `commerce-otp-${id}` });
        if (error) throw new Error("Mail unavailable");
      }, work => after(work));
      return json(result);
    }
    if (input.action === "verify") {
      if (!validId(input.challenge) || typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) throw new CommerceError("Indtast den sekscifrede kode.", 400);
      const order = await verifiedOrder(context, input.challenge, input.code);
      if (!order) throw new CommerceError("Koden eller ordreopslaget kunne ikke bekræftes. Bed om en ny kode eller opret en supportsag.", 400);
      return json({ order, fetchedAt: new Date().toISOString(), text: "Her er ordrestatus hentet efter verificering." });
    }
    throw new CommerceError("Ugyldig handling.", 400);
  } catch (error) { return failure(error); }
}
