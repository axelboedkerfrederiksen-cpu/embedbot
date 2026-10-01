import { after } from "next/server";
import { body, database, failure, json, CommerceError } from "@/lib/commerce/server";
import { digest, seal, validSession } from "@/lib/commerce/security";
import { wooCommerceAdapter, type WooCommerceConfig } from "@/lib/commerce/woocommerce";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const input = await body(req);
    if (!validSession(input.user_id) || input.key_permissions !== "read" || typeof input.consumer_key !== "string" || typeof input.consumer_secret !== "string") throw new CommerceError("Ugyldig godkendelse.", 400);
    const db = database();
    const { data, error } = await db.rpc("consume_commerce_connection", { p_token_hash: digest(`woo-connect:${input.user_id}`) });
    const attempt = data?.[0];
    if (error || !attempt) throw new CommerceError("Godkendelsen er udløbet eller allerede brugt.", 400);
    const config: WooCommerceConfig = { platform: "woocommerce", origin: attempt.origin, currency: attempt.currency, consumerKey: input.consumer_key, consumerSecret: input.consumer_secret };
    const adapter = wooCommerceAdapter(config);
    const { data: saved, error: saveError } = await db.from("commerce_integrations").update({ credentials: seal(config, `credentials:${attempt.business_id}`), updated_at: new Date().toISOString() }).eq("business_id", attempt.business_id).eq("revision", attempt.revision).eq("status", "pending").select("business_id").maybeSingle();
    if (saveError || !saved) throw new CommerceError("Forbindelsen kunne ikke gemmes.");
    // Acknowledge key delivery promptly. The UI shows pending until live read
    // probes finish; credentials never travel via the merchant's browser.
    after(async () => {
      let status = "connected";
      try { await adapter.testConnection(); } catch { status = "error"; }
      await db.from("commerce_integrations").update({ status, tested_at: new Date().toISOString() }).eq("business_id", attempt.business_id).eq("revision", attempt.revision).eq("status", "pending");
    });
    return json({ success: true });
  } catch (error) { return failure(error); }
}
