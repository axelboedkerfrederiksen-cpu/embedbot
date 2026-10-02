import { NextRequest } from "next/server";
import { owner, json, failure, CommerceError } from "@/lib/commerce/server";
import { MAX_HTML_BYTES, extractWebsiteText, websiteUrl } from "@/lib/website-source";
import { crawlWebsite } from "@/lib/website-crawl";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  try {
    const { db, business } = await owner(req, req.nextUrl.searchParams.get("business_id"));
    const { data, error } = await db.from("website_sources").select("source_kind,source_name,imported_at,character_count,truncated").eq("business_id", business.id).maybeSingle();
    return json({ configured: !error, source: data || null });
  } catch (error) { return failure(error); }
}
export async function POST(req: NextRequest) {
  try {
    // Uploaded HTML is bounded before parsing and never saved or executed.
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_HTML_BYTES * 2) throw new CommerceError("Filen er for stor. Vælg en HTML-fil på højst 1 MB.", 413);
    let input: Record<string, unknown>;
    try { input = JSON.parse(raw); if (!input || typeof input !== "object" || Array.isArray(input)) throw 0; } catch { throw new CommerceError("Ugyldig formular.", 400); }
    const { db, business } = await owner(req, input.business_id, true);
    // Uses the existing atomic rate limiter without requiring commerce keys.
    const { data: limited, error: rateError } = await db.rpc("enforce_chat_rate_limit", { p_ip_hash: `website-import:${business.id}`, p_limit: 10, p_window_seconds: 3600 });
    if (rateError) throw new CommerceError("Importbeskyttelsen er ikke konfigureret endnu.");
    if (limited) throw new CommerceError("For mange importer. Vent lidt og prøv igen.", 429);
    if (input.action === "disconnect") {
      const { error } = await db.from("website_sources").delete().eq("business_id", business.id);
      if (error) throw new CommerceError("Indholdet kunne ikke fjernes.");
      return json({ success: true });
    }
    if (!["html","url"].includes(String(input.action))) throw new CommerceError("Vælg en HTML-fil eller en hjemmesideadresse.", 400);
    let sourceName: string;
    let extracted: ReturnType<typeof extractWebsiteText>;
    let pages = 1;
    if (input.action === "url") {
      try { sourceName = websiteUrl(String(input.url || "")).href; } catch { throw new CommerceError("Indtast en gyldig HTTPS-adresse.", 400); }
      try {
        const result = await crawlWebsite(sourceName);
        extracted = result; pages = result.pages; sourceName = result.sourceUrl;
      } catch { throw new CommerceError("Hjemmesiden kunne ikke læses. Kontrollér adressen, eller upload sidens HTML-fil.", 422); }
    } else {
      sourceName = typeof input.filename === "string" ? input.filename.trim().slice(0, 200) : "";
      if (!/\.(html|htm)$/i.test(sourceName) || typeof input.html !== "string") throw new CommerceError("Vælg en .html- eller .htm-fil.", 400);
      try { extracted = extractWebsiteText(input.html); } catch { throw new CommerceError("Filen skal indeholde læsbar HTML-tekst og være højst 1 MB.", 422); }
    }
    const { error } = await db.from("website_sources").upsert({ business_id: business.id, source_kind: input.action, source_name: sourceName, content_text: extracted.text, character_count: extracted.text.length, truncated: extracted.truncated, imported_at: new Date().toISOString() });
    if (error) throw new CommerceError("Hjemmesideimport er ikke konfigureret på serveren endnu.");
    return json({ success: true, characters: extracted.text.length, truncated: extracted.truncated, pages });
  } catch (error) { return failure(error); }
}
