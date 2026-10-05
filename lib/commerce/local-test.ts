import { createHmac } from "node:crypto";
import { shopJson } from "./http.ts";
import { SHOPIFY_SCOPES, validShopDomain, type ShopifyConfig } from "./shopify.ts";

// Development-only access to our own installed dev store. It never saves or
// replaces the encrypted OAuth connection used by the deployed application.
export function localShopifyTestSettings(businessId?: string) {
  const domain = process.env.SHOPIFY_LOCAL_TEST_DOMAIN || "";
  const id = process.env.SHOPIFY_LOCAL_TEST_BUSINESS_ID || "";
  if (process.env.NODE_ENV !== "development" || !validShopDomain(domain) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || (businessId !== undefined && businessId !== id)) return null;
  return { domain, businessId: id };
}

export function localTestEncryptionKey(): string | undefined {
  const settings = localShopifyTestSettings();
  const secret = process.env.SUPABASE_SERVICE_KEY;
  if (!settings || !secret || secret.length < 32) return undefined;
  return createHmac("sha256", secret).update(`embedbot:local-shopify-test:${settings.businessId}:${settings.domain}`).digest("base64");
}

type CachedAccess = { identity: string; config: ShopifyConfig };
let cached: CachedAccess | null = null;
let pending: { identity: string; promise: Promise<ShopifyConfig> } | null = null;

export async function localShopifyTestConfig(businessId: string, transport: typeof shopJson = shopJson, now = Date.now()): Promise<ShopifyConfig | null> {
  const settings = localShopifyTestSettings(businessId);
  if (!settings) return null;
  const clientId = process.env.SHOPIFY_CLIENT_ID, secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("Local Shopify test unavailable");
  const identity = createHmac("sha256", secret).update(`${businessId}:${settings.domain}:${clientId}`).digest("hex");
  if (cached?.identity === identity && cached.config.expiresAt! > now + 60000) return { ...cached.config };
  if (pending?.identity === identity) return { ...await pending.promise };
  const promise = (async () => {
    const token = await transport<{ access_token: string; expires_in: number; scope: string }>(new URL(`https://${settings.domain}/admin/oauth/access_token`), {}, new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: secret }));
    const scopes = typeof token.scope === "string" ? token.scope.split(",") : [];
    if (!token.access_token || !Number.isFinite(token.expires_in) || token.expires_in <= 60 || SHOPIFY_SCOPES.some(scope => !scopes.includes(scope)) || scopes.some(scope => scope.startsWith("write_"))) throw new Error("Read-only local Shopify access required");
    const config: ShopifyConfig = { platform: "shopify", domain: settings.domain, adminToken: token.access_token, expiresAt: now + token.expires_in * 1000 };
    cached = { identity, config };
    return config;
  })();
  pending = { identity, promise };
  try { return { ...await promise }; }
  finally { if (pending?.promise === promise) pending = null; }
}
