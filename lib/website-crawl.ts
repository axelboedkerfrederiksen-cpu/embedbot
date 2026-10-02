import * as cheerio from "cheerio";
import { extractWebsiteText, fetchWebsitePage, MAX_SOURCE_TEXT, websiteUrl } from "./website-source.ts";
import { safeUrl } from "./commerce/types.ts";

export const MAX_CRAWL_PAGES = 30;
const MAX_DISCOVERED_LINKS = 600;
const MAX_CRAWL_MS = 35000;
type Page = { html: string; url: string };
type Reader = (url: string, options: { xml?: boolean; timeoutMs?: number; origin?: string }) => Promise<Page>;
export type WebsiteLink = { url: string; title: string };
export type PublicProduct = { name: string; url: string; image?: string; price?: string; currency?: string; availability?: string };

// Only public pages on the final website origin are eligible. Strip tracking
// parameters and exclude forms, account/cart actions and non-HTML downloads.
export function crawlUrl(value: string, base: string): string | null {
  try {
    const url = websiteUrl(new URL(value, base).href);
    if (url.origin !== new URL(base).origin) return null;
    if (/\/(?:cart|basket|checkout|account|login|logout|my-account|kurv|kasse|wp-admin|wp-json)(?:\/|$)/i.test(url.pathname)) return null;
    if (/\.(?:pdf|jpg|jpeg|png|gif|webp|svg|zip|xml|css|js|mp4|woff2?)$/i.test(url.pathname)) return null;
    if ([...url.searchParams.keys()].some(k => !/^(?:utm_.+|gclid|fbclid|_pos|_sid|_ss|_psq|_v|pr_.+)$/i.test(k))) return null;
    url.search = "";
    return url.href;
  } catch { return null; }
}

export function websiteLinks(html: string, base: string): WebsiteLink[] {
  const $ = cheerio.load(html);
  $("script,style,template,form,[hidden],[aria-hidden=true]").remove();
  const links = new Map<string, WebsiteLink>();
  $("a[href]").each((_i, element) => {
    const url = crawlUrl($(element).attr("href") || "", base);
    const title = ($(element).text() || $(element).find("img").attr("alt") || "").replace(/\s+/g, " ").trim().slice(0, 160);
    if (url && links.size < MAX_DISCOVERED_LINKS) links.set(url, { url, title });
  });
  return [...links.values()];
}

export function publicProducts(html: string, base: string): PublicProduct[] {
  const $ = cheerio.load(html), products: PublicProduct[] = [];
  const visit = (value: unknown, depth = 0) => {
    if (depth > 12 || products.length >= 12 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.slice(0, 100).forEach(v => visit(v, depth + 1)); return; }
    const object = value as Record<string, unknown>;
    const types = Array.isArray(object["@type"]) ? object["@type"] : [object["@type"]];
    if (types.includes("Product") && typeof object.name === "string") {
      const url = typeof object.url === "string" ? crawlUrl(object.url, base) : base;
      if (url) {
        const offers = Array.isArray(object.offers) ? object.offers[0] : object.offers;
        const offer = offers && typeof offers === "object" ? offers as Record<string, unknown> : {};
        const field = (v: unknown) => typeof v === "string" || typeof v === "number" ? String(v).slice(0, 120) : undefined;
        const rawImage = Array.isArray(object.image) ? object.image[0] : object.image;
        const imageValue = typeof rawImage === "string" ? rawImage : rawImage && typeof rawImage === "object" ? (rawImage as Record<string, unknown>).url : undefined;
        let image: string | undefined;
        try { if (typeof imageValue === "string") image = safeUrl(new URL(imageValue, base).href) || undefined; } catch { /* Invalid images are optional. */ }
        products.push({ name: object.name.slice(0, 160), url, image, price: field(offer.price ?? offer.lowPrice), currency: field(offer.priceCurrency), availability: field(offer.availability) });
      }
    }
    Object.values(object).forEach(v => visit(v, depth + 1));
  };
  $("script[type='application/ld+json']").each((_i, element) => {
    try { visit(JSON.parse($(element).text())); } catch { /* Malformed site metadata is optional. */ }
  });
  return products;
}

export function productPreview(html: string, base: string) {
  const products = publicProducts(html, base);
  const product = products.find(p => p.url === base) || products[0];
  const $ = cheerio.load(html);
  let image = product?.image;
  if (!image) {
    const value = $("meta[property='og:image']").attr("content");
    try { if (value) image = safeUrl(new URL(value, base).href) || undefined; } catch { /* Keep working without an image. */ }
  }
  if (!image || (!product && !/product/i.test($("meta[property='og:type']").attr("content") || "") && !/\/(?:products?|produkt|vare)\//i.test(new URL(base).pathname))) return null;
  const name = product?.name || ($("h1").first().text() || $("meta[property='og:title']").attr("content") || "Se produkt").trim().slice(0, 160);
  return { name, url: base, image };
}

function priority(link: WebsiteLink) {
  const text = `${link.url} ${link.title}`;
  if (/kontakt|contact|levering|shipping|retur|return|handelsbeting|faq/i.test(text)) return 3;
  if (/\/products?\/|\/produkter?\/|\/shop\/[^/]+|\/vare\//i.test(link.url)) return 2;
  return 1;
}

export async function crawlWebsite(input: string, read: Reader = fetchWebsitePage) {
  const deadline = Date.now() + MAX_CRAWL_MS;
  const first = await read(websiteUrl(input).href, { timeoutMs: 8000 });
  const root = websiteUrl(first.url);
  const origin = root.origin;
  const pages: { url: string; title: string; text: string; products: PublicProduct[] }[] = [];
  const visited = new Set<string>();
  const discovered = new Map<string, WebsiteLink>();
  let truncated = false;
  let failed = 0;
  let attempts = 0;
  const add = (links: WebsiteLink[]) => links.forEach(link => {
    if (!discovered.has(link.url)) {
      if (discovered.size < MAX_DISCOVERED_LINKS) {
        let title = link.title;
        if (!title) {
          try { title = decodeURIComponent(new URL(link.url).pathname.split("/").filter(Boolean).at(-1) || "").replace(/[-_]/g, " ").slice(0, 160); } catch { /* Keep malformed slugs unnamed. */ }
        }
        discovered.set(link.url, { ...link, title });
      }
      else truncated = true;
    }
  });
  const consume = (page: Page) => {
    if (new URL(page.url).origin !== origin) throw new Error("Cross-site page blocked");
    visited.add(page.url);
    const extracted = extractWebsiteText(page.html);
    const $ = cheerio.load(page.html);
    pages.push({ url: page.url, title: ($("h1").first().text() || $("title").text()).replace(/\s+/g, " ").trim().slice(0, 160), text: extracted.text, products: publicProducts(page.html, page.url) });
    truncated ||= extracted.truncated;
    add(websiteLinks(page.html, page.url));
  };
  consume(first);

  // Common sitemap and sitemap index formats supplement navigation links.
  const sitemaps = [new URL("/sitemap.xml", origin).href];
  const seenMaps = new Set<string>();
  while (sitemaps.length && seenMaps.size < 4 && Date.now() < deadline) {
    const url = sitemaps.shift()!;
    if (seenMaps.has(url)) continue;
    seenMaps.add(url);
    try {
      const page = await read(url, { xml: true, origin, timeoutMs: Math.min(3000, deadline - Date.now()) });
      const $ = cheerio.load(page.html, { xmlMode: true });
      $("url > loc").each((_i, element) => {
        const target = crawlUrl($(element).text().trim(), root.href);
        if (target) add([{ url: target, title: "" }]);
      });
      $("sitemap > loc").each((_i, element) => {
        try {
          const target = websiteUrl($(element).text().trim());
          if (target.origin === origin && !seenMaps.has(target.href) && sitemaps.length < 10) sitemaps.push(target.href);
        } catch { /* Ignore unsafe or invalid sitemap links. */ }
      });
    } catch { /* Sitemaps are optional; use links from actual pages. */ }
  }
  while (pages.length < MAX_CRAWL_PAGES && attempts < MAX_CRAWL_PAGES * 2 && Date.now() < deadline) {
    const batch = [...discovered.values()].filter(l => !visited.has(l.url)).sort((a, b) => priority(b) - priority(a)).slice(0, Math.min(3, MAX_CRAWL_PAGES - pages.length));
    if (!batch.length) break;
    batch.forEach(l => visited.add(l.url));
    attempts += batch.length;
    const results = await Promise.allSettled(batch.map(l => read(l.url, { origin, timeoutMs: Math.min(5000, deadline - Date.now()) })));
    results.forEach(result => {
      if (result.status === "fulfilled") {
        try { consume(result.value); } catch { failed++; }
      } else failed++;
    });
  }
  truncated ||= failed > 0 || [...discovered.keys()].some(url => !visited.has(url)) || sitemaps.length > 0;

  // Allocate space to every crawled page rather than letting the homepage fill
  // the source. Keep a compact link catalogue for products beyond the page cap.
  const catalogue = [...discovered.values()].filter(l => l.title).sort((a, b) => priority(b) - priority(a)).map(l => JSON.stringify(l)).join("\n");
  const catalogueBudget = Math.min(8000, catalogue.length + 1);
  const perPage = Math.floor((MAX_SOURCE_TEXT - catalogueBudget - 600) / pages.length);
  const blocks = pages.map(page => {
    const header = `SIDE ${JSON.stringify({ url: page.url, title: page.title })}\n`;
    let products = "";
    for (const product of page.products) {
      const record = `PRODUKT ${JSON.stringify(product)}\n`;
      if (header.length + products.length + record.length + 200 > perPage) { truncated = true; break; }
      products += record;
    }
    const textBudget = Math.max(0, perPage - header.length - products.length);
    if (page.text.length > textBudget) truncated = true;
    return header + products + page.text.slice(0, textBudget);
  });
  // Never truncate a link or JSON catalogue record midway.
  const records: string[] = [];
  let used = 0;
  for (const line of catalogue.split("\n")) {
    if (used + line.length + 1 > catalogueBudget) { truncated = true; break; }
    records.push(line); used += line.length + 1;
  }
  const text = `HJEMMESIDEIMPORT: ${pages.length} sider læst. ${truncated ? "Delvis import; hele hjemmesiden er ikke med." : "Fundne sider importeret."}\n\n${blocks.join("\n\n")}\n\nSIDELINKS (oplysninger fra hjemmesiden):\n${records.join("\n")}`;
  return { text: text.slice(0, MAX_SOURCE_TEXT), truncated: truncated || text.length > MAX_SOURCE_TEXT, pages: pages.length, sourceUrl: root.href };
}

// Select only URLs already found on this tenant's site. The customer cannot
// supply a new fetch target through chat. Refresh at most two relevant pages.
export async function refreshProductPages(context: string, query: string, read: Reader = fetchWebsitePage, siteUrl?: string) {
  const words = query.toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu)?.filter(w => !["kan", "du", "har", "lager", "pris", "produkt", "product", "stock", "price", "the", "and", "med"].includes(w)) || [];
  const links = new Map<string, WebsiteLink>();
  for (const line of context.split("\n")) {
    try {
      const value = JSON.parse(line.replace(/^SIDE /, ""));
      if (typeof value.url === "string" && typeof value.title === "string" && (!siteUrl || crawlUrl(value.url, siteUrl))) links.set(value.url, value);
    } catch { /* Only crawler-generated records are eligible. */ }
  }
  const rank = () => [...links.values()].map(link => {
    let urlText = link.url;
    try { urlText = decodeURI(link.url); } catch { /* Invalid escaped slugs remain searchable by title. */ }
    const searchable = `${link.title} ${urlText}`.toLowerCase();
    const identifiersMatch = words.filter(w => /^\d+$/.test(w)).every(w => new RegExp(`(?:^|\\D)${w}(?:\\D|$)`).test(searchable));
    return { link, score: identifiersMatch ? words.reduce((sum, word) => sum + (searchable.includes(word) ? 1 : 0), 0) : 0 };
  }).filter(l => l.score >= Math.min(2, words.length) && l.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);
  // Large shops may have products outside the bounded import. Try public site
  // search on the already configured origin; never follow customer URLs.
  if (!rank().length && siteUrl && words.length) {
    const origin = websiteUrl(siteUrl).origin;
    const modelNumber = words.findIndex(w => /^\d+$/.test(w));
    const searchQuery = modelNumber > 0 ? words.slice(modelNumber - 1, modelNumber + 1).join(" ") : query.slice(0, 160);
    for (const path of [`/search?q=${encodeURIComponent(searchQuery)}&type=product`, `/?s=${encodeURIComponent(searchQuery)}`]) {
      try {
        const page = await read(new URL(path, origin).href, { origin, timeoutMs: 2500 });
        for (const link of websiteLinks(page.html, page.url)) links.set(link.url, link);
        if (rank().length) break;
      } catch { /* Unsupported search paths are optional. */ }
    }
  }
  const ranked = rank();
  const results = await Promise.allSettled(ranked.map(async ({ link }) => {
    const page = await read(websiteUrl(link.url).href, { origin: new URL(link.url).origin, timeoutMs: 4000 });
    const products = publicProducts(page.html, page.url);
    // Product pages often contain stock warnings/prices for upsells. When the
    // site supplies product metadata, do not mix in unrelated visible cards.
    const text = products.length ? "" : extractWebsiteText(page.html).text.slice(0, 5000);
    return `OFFENTLIG PRODUKTSIDE HENTET NU (${new Date().toISOString()}):\nURL: ${page.url}\nProduktmetadata: ${JSON.stringify(products)}${text ? `\nSidetekst (kan også omtale andre produkter): ${text}` : ""}`;
  }));
  return results.flatMap(r => r.status === "fulfilled" ? [r.value] : []).join("\n\n");
}
