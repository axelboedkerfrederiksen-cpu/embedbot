import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adapterFor, type CommerceConfig } from "./index.ts";
import { freshShopifyConfig } from "./shopify-tokens.ts";
import { digest, supportKey, unseal, validId, validSession } from "./security.ts";
import { isBusinessSubscriptionActive } from "../subscription.ts";
import { localShopifyTestConfig, localShopifyTestSettings } from "./local-test.ts";
import { CommerceError } from "./errors.ts";
export { CommerceError } from "./errors.ts";
export function database() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new CommerceError("Serveren er ikke konfigureret.");
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
export function failure(error: unknown) {
  return json({ error: error instanceof CommerceError ? error.message : "Funktionen er ikke tilgængelig lige nu. Prøv igen eller kontakt webshoppen." }, error instanceof CommerceError ? error.status : 503);
}
export async function body(req: Request): Promise<Record<string, unknown>> {
  const value = await req.text();
  if (value.length > 40000) throw new CommerceError("Formularen er for stor.", 413);
  try { const result = JSON.parse(value); if (!result || Array.isArray(result) || typeof result !== "object") throw 0; return result; } catch { throw new CommerceError("Ugyldig formular.", 400); }
}
export async function owner(req: NextRequest, businessId: unknown, mutation = false) {
  if (!validId(businessId)) throw new CommerceError("Ugyldig chatbot.", 400);
  if (mutation && req.headers.get("origin") !== req.nextUrl.origin) throw new CommerceError("Ugyldig anmodning.", 403);
  const store = await cookies();
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => store.getAll(), setAll: list => list.forEach(c => store.set(c.name, c.value, c.options)) } });
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) throw new CommerceError("Log ind for at fortsætte.", 401);
  const db = database();
  const { data: business, error: lookupError } = await db.from("businesses").select("id,user_id,name,website_url,support_email,is_deleted").eq("id", businessId).eq("user_id", user.id).maybeSingle();
  if (lookupError || !business || business.is_deleted === true) throw new CommerceError("Chatbotten blev ikke fundet.", 404);
  return { db, business, user };
}
export async function publicContext(req: NextRequest, input: Record<string, unknown>) {
  if (!validId(input.business_id) || !validSession(input.session)) throw new CommerceError("Ugyldig chat-session.", 400);
  const db = database();
  const { data: business, error } = await db.from("businesses").select("*").eq("id", input.business_id).maybeSingle();
  if (error || !business || business.is_deleted === true || !isBusinessSubscriptionActive(business)) throw new CommerceError("Chatbotten er ikke tilgængelig.", 403);
  const origin = req.headers.get("origin") || "";
  if (!origin || origin === "null") throw new CommerceError("Åbn chatten på webshoppens hjemmeside.", 403);
  // Cross-origin embedding is supported. Private proofs are bound to the actual
  // browser Origin and a cryptographically random per-tab session nonce.
  const sessionHash = digest(`session:${business.id}:${origin}:${input.session}`, supportKey());
  return { db, business, sessionHash };
}
export async function limit(db: SupabaseClient, req: NextRequest, businessId: string, category: string, max: number, seconds: number, extra = "") {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const key = digest(`limit:${category}:${businessId}:${extra || ip}`, supportKey());
  const { data, error } = await db.rpc("enforce_chat_rate_limit", { p_ip_hash: key, p_limit: max, p_window_seconds: seconds });
  if (error) throw new CommerceError("Beskyttelsen mod gentagne forsøg er ikke konfigureret.");
  if (data === true) throw new CommerceError("For mange forsøg. Vent lidt og prøv igen.", 429);
}
export async function integration(db: SupabaseClient, businessId: string) {
  const { data, error } = await db.from("commerce_integrations").select("platform,shop_url,credentials,revision,status").eq("business_id", businessId).maybeSingle();
  if (error || !data || ["disconnected","pending"].includes(data.status) || !data.credentials) return null;
  try {
    const localTest = localShopifyTestSettings(businessId);
    if (localTest) {
      if (data.platform !== "shopify" || data.shop_url !== `https://${localTest.domain}`) return null;
      const config = await localShopifyTestConfig(businessId);
      return config ? { adapter: adapterFor(config), revision: data.revision as string } : null;
    }
    let config = unseal<CommerceConfig>(data.credentials, `credentials:${businessId}`);
    if (config.platform === "shopify") {
      const fresh = await freshShopifyConfig(db, businessId, data.revision, config);
      if (!fresh) return null;
      config = fresh;
    }
    return { adapter: adapterFor(config), revision: data.revision as string };
  } catch { return null; }
}
