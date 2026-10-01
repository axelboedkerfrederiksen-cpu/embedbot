import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { shopJson, CommerceHttpError } from "./http.ts";
import { seal } from "./security.ts";
import { SHOPIFY_SCOPES, validShopDomain, type ShopifyConfig } from "./shopify.ts";
export type ShopifyTokenResponse = { access_token: string; scope?: string; expires_in: number; refresh_token: string; refresh_token_expires_in: number };
export function shopifyTokenConfig(domain: string, token: ShopifyTokenResponse, now = Date.now(), requireScopes = true): ShopifyConfig {
  const scopes = typeof token.scope === "string" ? token.scope.split(",") : [];
  if (!validShopDomain(domain) || !token.access_token || !token.refresh_token || !(token.expires_in > 0) || !(token.refresh_token_expires_in > 0) || !Number.isFinite(token.expires_in) || !Number.isFinite(token.refresh_token_expires_in) || (requireScopes && SHOPIFY_SCOPES.some(s => !scopes.includes(s))) || scopes.some(s => s.startsWith("write_"))) throw new Error("Invalid Shopify access");
  return { platform: "shopify", domain, adminToken: token.access_token, refreshToken: token.refresh_token, expiresAt: now + token.expires_in * 1000, refreshExpiresAt: now + token.refresh_token_expires_in * 1000 };
}
export async function freshShopifyConfig(db: SupabaseClient, businessId: string, revision: string, config: ShopifyConfig, transport: typeof shopJson = shopJson, now = Date.now()): Promise<ShopifyConfig | null> {
  if (!config.expiresAt || config.expiresAt > now + 60000) return config;
  if (!config.refreshToken || !config.refreshExpiresAt || config.refreshExpiresAt <= now || !process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) return null;
  const lease = randomUUID();
  const { data, error } = await db.from("commerce_integrations").update({ refresh_lock: lease, refresh_locked_until: new Date(now + 30000).toISOString() }).eq("business_id", businessId).eq("revision", revision).neq("status", "disconnected").or(`refresh_locked_until.is.null,refresh_locked_until.lt.${new Date(now).toISOString()}`).select("business_id").maybeSingle();
  // Another worker owns the refresh. Fail safely and let the next request read
  // the updated pair; do not race a single-use refresh token across instances.
  if (error || !data) return null;
  try {
    const token = await transport<ShopifyTokenResponse>(new URL(`https://${config.domain}/admin/oauth/access_token`), {}, new URLSearchParams({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: "refresh_token", refresh_token: config.refreshToken }));
    const fresh = shopifyTokenConfig(config.domain, token, Date.now(), false);
    const { data: saved, error: saveError } = await db.from("commerce_integrations").update({ credentials: seal(fresh, `credentials:${businessId}`), refresh_lock: null, refresh_locked_until: null }).eq("business_id", businessId).eq("revision", revision).eq("refresh_lock", lease).neq("status", "disconnected").select("business_id").maybeSingle();
    return !saveError && saved ? fresh : null;
  } catch (error) {
    // A 401 invalidates the pair. Transport errors retain it for Shopify's
    // refresh retry window; no response bodies/tokens enter logs.
    const update = error instanceof CommerceHttpError && error.status === 401 ? { credentials: null, status: "error", refresh_lock: null, refresh_locked_until: null } : { refresh_lock: null, refresh_locked_until: null };
    await db.from("commerce_integrations").update(update).eq("business_id", businessId).eq("revision", revision).eq("refresh_lock", lease);
    return null;
  }
}
