import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { owner } from "@/lib/commerce/server";
import { seal, unseal, equalSecret, shopifyHmac } from "@/lib/commerce/security";
import { shopifyAdapter, validShopDomain } from "@/lib/commerce/shopify";
import { shopifyTokenConfig } from "@/lib/commerce/shopify-tokens";
import { shopJson } from "@/lib/commerce/http";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const returnUrl = new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin);
  try {
    const secret = process.env.SHOPIFY_CLIENT_SECRET, clientId = process.env.SHOPIFY_CLIENT_ID;
    if (!secret || !clientId) throw new Error("Missing configuration");
    const store = await cookies();
    const token = store.get("commerce_oauth")?.value || "";
    store.delete({ name: "commerce_oauth", path: "/api/commerce/shopify/callback" });
    const state = unseal<{ businessId: string; userId: string; domain: string; nonce: string; revision: string; returnTo?: string; expires: number }>(token, "shopify-oauth");
    if (state.returnTo === "setup") { returnUrl.pathname = "/setup"; returnUrl.searchParams.set("business_id", state.businessId); }
    const params = req.nextUrl.searchParams;
    const domain = params.get("shop") || "";
    const timestamp = Number(params.get("timestamp"));
    if (!validShopDomain(domain) || domain !== state.domain || state.expires <= Date.now() || !equalSecret(params.get("state") || "", state.nonce) || !shopifyHmac(params, secret) || !Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 600) throw new Error("Invalid callback");
    const { db, user } = await owner(req, state.businessId);
    if (user.id !== state.userId || !params.get("code")) throw new Error("Invalid owner");
    const access = await shopJson<import("@/lib/commerce/shopify-tokens").ShopifyTokenResponse>(new URL(`https://${domain}/admin/oauth/access_token`), {}, new URLSearchParams({ client_id: clientId, client_secret: secret, code: params.get("code")!, expiring: "1" }));
    const config = shopifyTokenConfig(domain, access);
    await shopifyAdapter(config).testConnection();
    const { data: saved, error } = await db.from("commerce_integrations").update({ credentials: seal(config, `credentials:${state.businessId}`), status: "connected", tested_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("business_id", state.businessId).eq("revision", state.revision).eq("status", "pending").select("business_id").maybeSingle();
    if (error || !saved) throw new Error("Storage unavailable");
    returnUrl.searchParams.set("commerce", "connected");
    returnUrl.searchParams.set("business_id", state.businessId);
  } catch { returnUrl.searchParams.set("commerce", "failed"); }
  return NextResponse.redirect(returnUrl);
}
