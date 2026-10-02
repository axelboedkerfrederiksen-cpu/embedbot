import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { database, json, failure, CommerceError } from "@/lib/commerce/server";
import { validId } from "@/lib/commerce/security";
import { fetchWebsitePage, sameWebsiteOrigin, websiteUrl } from "@/lib/website-source";
import { productPreview } from "@/lib/website-crawl";

export const runtime = "nodejs";
type Preview = ReturnType<typeof productPreview>;
const cache = new Map<string, { value: Preview; expires: number }>();

export async function GET(req: NextRequest) {
  try {
    const businessId = req.nextUrl.searchParams.get("business_id");
    if (!validId(businessId)) throw new CommerceError("Ugyldig chatbot.", 400);
    let url: URL;
    try { url = websiteUrl(req.nextUrl.searchParams.get("url") || ""); } catch { throw new CommerceError("Ugyldigt produktlink.", 400); }
    const db = database();
    const [{ data: business, error }, { data: source }] = await Promise.all([
      db.from("businesses").select("website_url,is_deleted").eq("id", businessId).maybeSingle(),
      db.from("website_sources").select("source_kind,source_name").eq("business_id", businessId).maybeSingle(),
    ]);
    if (error || !business || business.is_deleted) throw new CommerceError("Chatbotten blev ikke fundet.", 404);
    const siteUrl = source?.source_kind === "url" ? source.source_name : business.website_url;
    try { if (!siteUrl || !sameWebsiteOrigin(url.href, siteUrl)) throw 0; } catch { throw new CommerceError("Produktlinket tilhører ikke hjemmesiden.", 400); }
    const key = `${businessId}:${url.href}`;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return json({ product: cached.value });
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const hash = createHash("sha256").update(`product-preview:${businessId}:${ip}`).digest("hex");
    const { data: limited, error: rateError } = await db.rpc("enforce_chat_rate_limit", { p_ip_hash: hash, p_limit: 30, p_window_seconds: 60 });
    if (rateError || limited) throw new CommerceError("Prøv igen senere.", 429);
    let value: Preview = null;
    try {
      const page = await fetchWebsitePage(url.href, { origin: url.origin, timeoutMs: 4000 });
      value = productPreview(page.html, page.url);
    } catch { /* Image previews are optional; links remain usable. */ }
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, expires: Date.now() + (value ? 3600000 : 60000) });
    return json({ product: value });
  } catch (error) { return failure(error); }
}
