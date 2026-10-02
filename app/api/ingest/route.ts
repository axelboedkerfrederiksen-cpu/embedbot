import { NextRequest } from "next/server";
import { database, owner, json, failure, CommerceError } from "@/lib/commerce/server";
import { validId } from "@/lib/commerce/security";
import { crawlWebsite } from "@/lib/website-crawl";
import { websiteUrl } from "@/lib/website-source";
import { verifyWebsiteIngestToken } from "@/lib/website-ingest-token";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > 5000) throw new CommerceError("Anmodningen er for stor.", 413);
    let input;
    try { input = JSON.parse(raw); } catch { throw new CommerceError("Ugyldig anmodning.", 400); }
    if (!input || !validId(input.business_id)) throw new CommerceError("Ugyldig chatbot.", 400);
    const internal = verifyWebsiteIngestToken(req.headers.get("x-website-ingest-token"), input.business_id);
    const db = internal ? database() : (await owner(req, input.business_id, true)).db;
    const { data: business, error: businessError } = await db.from("businesses").select("website_url,is_deleted").eq("id", input.business_id).maybeSingle();
    if (businessError || !business || business.is_deleted) throw new CommerceError("Chatbotten blev ikke fundet.", 404);
    let url: string;
    try { url = websiteUrl(business.website_url || "").href; } catch { throw new CommerceError("Indtast en gyldig HTTPS-adresse i opsætningen.", 400); }
    if (typeof input.url !== "string" || input.url !== business.website_url) throw new CommerceError("Adressen skal være den, der er gemt i opsætningen.", 400);
    const { data: limited, error: rateError } = await db.rpc("enforce_chat_rate_limit", { p_ip_hash: `website-import:${input.business_id}`, p_limit: 10, p_window_seconds: 3600 });
    if (rateError) throw new CommerceError("Importbeskyttelsen er ikke konfigureret endnu.");
    if (limited) throw new CommerceError("For mange importer. Vent lidt og prøv igen.", 429);
    let result;
    try { result = await crawlWebsite(url); } catch { throw new CommerceError("Hjemmesiden kunne ikke læses. Kontrollér adressen, eller upload en HTML-fil.", 422); }
    const { error } = await db.from("website_sources").upsert({ business_id: input.business_id, source_kind: "url", source_name: result.sourceUrl, content_text: result.text, character_count: result.text.length, truncated: result.truncated, imported_at: new Date().toISOString() });
    if (error) throw new CommerceError("Hjemmesideindholdet kunne ikke gemmes.");
    return json({ success: true, chunks: result.pages, pages: result.pages, truncated: result.truncated });
  } catch (error) { return failure(error); }
}
