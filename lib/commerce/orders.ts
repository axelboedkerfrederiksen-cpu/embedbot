import { randomInt, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { digest, seal, unseal } from "./security.ts";
import type { CommerceAdapter, OrderInput, OrderStatus } from "./types.ts";
export type VerificationContext = { db: SupabaseClient; businessId: string; sessionHash: string; revision: string; adapter: CommerceAdapter };
export type SendCode = (email: string, code: string, id: string) => Promise<void>;
// The response is produced before an order lookup or mail attempt, eliminating
// existence-dependent lookup/mail timing from the public request path.
export async function requestOrderCode(context: VerificationContext, locator: OrderInput, send: SendCode, queue: (work: () => Promise<void>) => void) {
  const { db, businessId, sessionHash, revision, adapter } = context;
  const id = randomUUID(), code = String(randomInt(100000, 1000000));
  const { error } = await db.from("commerce_order_challenges").insert({ id, business_id: businessId, session_hash: sessionHash, code_hash: digest(`otp:${id}:${code}`), order_input: null, integration_revision: revision, expires_at: new Date(Date.now() + 600000).toISOString() });
  if (error) throw new Error("Verification unavailable");
  queue(async () => {
    try {
      const order = await adapter.lookupOrder(locator);
      if (!order?.contactEmail) return;
      const { error: saveError } = await db.from("commerce_order_challenges").update({ order_input: seal(locator, `order:${businessId}:${id}`) }).eq("id", id).eq("business_id", businessId).eq("session_hash", sessionHash);
      if (saveError) return;
      await send(order.contactEmail, code, id);
    } catch {
      await db.from("commerce_order_challenges").update({ order_input: null }).eq("id", id).eq("business_id", businessId);
    }
  });
  return { challenge: id, expiresIn: 600, text: "Hvis oplysningerne matcher en ordre, og mailen kan sendes, modtager du en engangskode på den e-mailadresse, som allerede er knyttet til ordren. Indtast koden her. Du kan også oprette en supportsag." };
}
export async function verifiedOrder(context: VerificationContext, id: string, code: string): Promise<OrderStatus | null> {
  const { db, businessId, sessionHash, revision, adapter } = context;
  const { data, error } = await db.rpc("consume_commerce_challenge", { p_id: id, p_business_id: businessId, p_session_hash: sessionHash, p_code_hash: digest(`otp:${id}:${code}`), p_revision: revision });
  if (error || typeof data !== "string") return null;
  const locator = unseal<OrderInput>(data, `order:${businessId}:${id}`);
  const order = await adapter.lookupOrder(locator);
  return order ? { status: order.status, shipments: order.shipments } : null;
}
