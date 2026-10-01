import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { wooOrigin } from "@/lib/commerce/woocommerce";
import { body, CommerceError, failure, integration, json, limit, owner } from "@/lib/commerce/server";
import { digest, encryptionKey, seal, validEmail } from "@/lib/commerce/security";
import { validShopDomain, SHOPIFY_SCOPES } from "@/lib/commerce/shopify";
import { mailConfigured } from "@/lib/commerce/mail";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const { db, business } = await owner(req, req.nextUrl.searchParams.get("business_id"));
    const [{ data: connected, error }, { data: settings, error: settingsError }] = await Promise.all([
      db.from("commerce_integrations").select("platform,shop_url,status,tested_at").eq("business_id", business.id).maybeSingle(),
      db.from("commerce_settings").select("notification_email").eq("business_id", business.id).maybeSingle(),
    ]);
    let secureStorage = false;
    try { encryptionKey(); secureStorage = true; } catch { /* Safe capability flag only. */ }
    return json({ configured: !error && !settingsError, secureStorage, integration: connected, notificationEmail: settings?.notification_email || "", mailConfigured: mailConfigured(), wooCommerceConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") && secureStorage), shopifyConfigured: Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET && process.env.NEXT_PUBLIC_APP_URL && secureStorage) });
  } catch (error) { return failure(error); }
}
export async function POST(req: NextRequest) {
  try {
    const input = await body(req);
    const { db, business, user } = await owner(req, input.business_id, true);
    if (input.action === "settings") {
      // Owner-only settings contain no webshop credentials or private proofs.
      // Limit by bot without depending on the optional commerce encryption key.
      const { data: limited, error: rateError } = await db.rpc("enforce_chat_rate_limit", { p_ip_hash: `commerce-settings:${business.id}`, p_limit: 15, p_window_seconds: 900 });
      if (rateError) throw new CommerceError("Beskyttelsen mod gentagne forsøg er ikke konfigureret.");
      if (limited === true) throw new CommerceError("For mange forsøg. Vent lidt og prøv igen.", 429);
      const email = typeof input.notificationEmail === "string" ? input.notificationEmail.trim().toLowerCase() : "";
      if (email && !validEmail(email)) throw new CommerceError("Indtast en gyldig e-mailadresse.", 400);
      const { error } = await db.from("commerce_settings").upsert({ business_id: business.id, notification_email: email || null, updated_at: new Date().toISOString() });
      if (error) throw new CommerceError("Supportsager er ikke konfigureret endnu.");
      return json({ success: true });
    }
    await limit(db, req, business.id, "integration", 15, 900);
    if (input.action === "disconnect") {
      const { error } = await db.from("commerce_integrations").update({ credentials: null, status: "disconnected", revision: randomUUID(), updated_at: new Date().toISOString() }).eq("business_id", business.id);
      if (error) throw new CommerceError("Forbindelsen kunne ikke afbrydes.");
      return json({ success: true });
    }
    if (input.action === "test") {
      const connected = await integration(db, business.id);
      if (!connected) throw new CommerceError("Ingen konfigureret integration.", 400);
      try { await connected.adapter.testConnection(); } catch {
        await db.from("commerce_integrations").update({ status: "error", tested_at: new Date().toISOString() }).eq("business_id", business.id).eq("revision", connected.revision);
        throw new CommerceError("Forbindelsen kunne ikke bekræftes. Kontrollér webshop, læseadgang, valuta og API-konfiguration.");
      }
      await db.from("commerce_integrations").update({ status: "connected", tested_at: new Date().toISOString() }).eq("business_id", business.id).eq("revision", connected.revision);
      return json({ success: true });
    }
    if (input.action === "shopify") {
      if (!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET || !process.env.NEXT_PUBLIC_APP_URL) throw new CommerceError("Shopify OAuth er ikke konfigureret endnu.");
      encryptionKey();
      const domain = typeof input.domain === "string" ? input.domain.trim().toLowerCase() : "";
      if (!validShopDomain(domain)) throw new CommerceError("Indtast butikkens adresse på myshopify.com.", 400);
      const nonce = randomBytes(32).toString("hex"), revision = randomUUID();
      const { error: pendingError } = await db.from("commerce_integrations").upsert({ business_id: business.id, platform: "shopify", shop_url: `https://${domain}`, credentials: null, status: "pending", revision, updated_at: new Date().toISOString() });
      if (pendingError) throw new CommerceError("Integrationer er ikke konfigureret endnu.");
      const callback = new URL("/api/commerce/shopify/callback", process.env.NEXT_PUBLIC_APP_URL);
      const url = new URL(`https://${domain}/admin/oauth/authorize`);
      url.search = new URLSearchParams({ client_id: process.env.SHOPIFY_CLIENT_ID, scope: SHOPIFY_SCOPES.join(","), redirect_uri: callback.href, state: nonce }).toString();
      const response = json({ url: url.href });
      response.cookies.set("commerce_oauth", seal({ businessId: business.id, userId: user.id, domain, nonce, revision, returnTo: input.returnTo === "setup" ? "setup" : "dashboard", expires: Date.now() + 600000 }, "shopify-oauth"), { httpOnly: true, secure: callback.protocol === "https:", sameSite: "lax", path: "/api/commerce/shopify/callback", maxAge: 600 });
      return response;
    }
    if (input.action === "woocommerce") {
      encryptionKey();
      if (!process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")) throw new CommerceError("WooCommerce kræver en offentligt tilgængelig HTTPS-adresse til EmbedBot.");
      const origin = wooOrigin(String(input.origin || "").trim());
      const currency = String(input.currency || "DKK").trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) throw new CommerceError("Angiv butikkens valuta, fx DKK.", 400);
      const nonce = randomBytes(32).toString("hex"), revision = randomUUID();
      const { error: pendingError } = await db.from("commerce_integrations").upsert({ business_id: business.id, platform: "woocommerce", shop_url: origin.origin, credentials: null, status: "pending", revision, updated_at: new Date().toISOString() });
      if (pendingError) throw new CommerceError("Integrationer er ikke konfigureret endnu.");
      const { error: stateError } = await db.from("commerce_connection_attempts").insert({ token_hash: digest(`woo-connect:${nonce}`), business_id: business.id, origin: origin.origin, currency, revision, expires_at: new Date(Date.now() + 600000).toISOString() });
      if (stateError) throw new CommerceError("Forbindelsen kunne ikke forberedes.");
      const returnUrl = new URL(input.returnTo === "setup" ? "/setup" : "/dashboard", process.env.NEXT_PUBLIC_APP_URL);
      returnUrl.searchParams.set("commerce", "woocommerce_return");
      returnUrl.searchParams.set("business_id", business.id);
      const callback = new URL("/api/commerce/woocommerce/callback", process.env.NEXT_PUBLIC_APP_URL);
      const url = new URL("/wc-auth/v1/authorize", origin);
      url.search = new URLSearchParams({ app_name: "EmbedBot", scope: "read", user_id: nonce, return_url: returnUrl.href, callback_url: callback.href }).toString();
      return json({ url: url.href });
    }
    throw new CommerceError("Ugyldig handling.", 400);
  } catch (error) { return failure(error); }
}
