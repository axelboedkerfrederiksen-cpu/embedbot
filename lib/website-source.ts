import * as cheerio from "cheerio";
import { request } from "node:https";
import { lookup } from "node:dns/promises";
import { publicAddress } from "./commerce/http.ts";

export const MAX_HTML_BYTES = 1_000_000;
export const MAX_SOURCE_TEXT = 30_000;
export function sameWebsiteOrigin(a: string, b: string) {
  const left = websiteUrl(a), right = websiteUrl(b);
  return left.protocol === right.protocol && left.port === right.port && left.hostname.replace(/^www\./i, "") === right.hostname.replace(/^www\./i, "");
}
export function websiteUrl(value: string) {
  if (value.length > 2048) throw new Error("Invalid website URL");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new Error("Invalid website URL");
  url.hash = "";
  return url;
}
export function extractWebsiteText(html: string) {
  if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) throw new Error("HTML too large");
  if (!/<(?:!doctype\s+html|html|body|main|article|div|p|h[1-6])\b/i.test(html)) throw new Error("Invalid HTML");
  const $ = cheerio.load(html);
  $("script,style,template,noscript,nav,footer,form,iframe,svg,head,[hidden],[aria-hidden=true]").remove();
  $("br").replaceWith(" ");
  $("p,div,section,article,li,h1,h2,h3,h4,h5,h6,td").append(" ");
  const text = $("body").text().replace(/\s+/g, " ").trim();
  if (text.length < 20) throw new Error("HTML contains no usable text");
  return { text: text.slice(0, MAX_SOURCE_TEXT), truncated: text.length > MAX_SOURCE_TEXT };
}

// Public HTTPS only. Pin DNS on every hop, including redirects; never execute
// scripts or send credentials. The total deadline bounds the entire import.
export async function fetchWebsitePage(input: string, options: { xml?: boolean; timeoutMs?: number; origin?: string } = {}): Promise<{ html: string; url: string }> {
  const expires = Date.now() + Math.min(options.timeoutMs ?? 20000, 20000);
  async function load(url: URL, hops: number): Promise<{ html: string; url: string }> {
    if (options.origin && !sameWebsiteOrigin(url.origin, options.origin)) throw new Error("Cross-site redirect blocked");
    if (hops > 3 || Date.now() >= expires) throw new Error("Website unavailable");
    return new Promise((resolve, reject) => {
      let active: ReturnType<typeof request> | undefined;
      let stopped = false;
      const deadline = setTimeout(() => { stopped = true; active?.destroy(); reject(new Error("Website unavailable")); }, Math.min(8000, expires - Date.now()));
      const fail = () => { stopped = true; clearTimeout(deadline); reject(new Error("Website unavailable")); };
      void lookup(url.hostname, { all: true }).then(addresses => {
        if (stopped) return;
        if (!addresses.length || addresses.some(a => !publicAddress(a.address))) return fail();
        const address = addresses[0];
        active = request(url, { family: address.family, headers: { Accept: "text/html", "User-Agent": "EmbedBot/2.0" }, lookup: (_name, _options, callback) => callback(null, address.address, address.family) }, res => {
          if ([301,302,303,307,308].includes(res.statusCode || 0) && res.headers.location) {
            clearTimeout(deadline); res.destroy();
            try { void load(websiteUrl(new URL(res.headers.location, url).href), hops + 1).then(resolve, reject); } catch { fail(); }
            return;
          }
          const allowedType = options.xml ? /^(text\/xml|application\/xml|text\/html|application\/xhtml\+xml)\b/i : /^(text\/html|application\/xhtml\+xml)\b/i;
          if (res.statusCode !== 200 || !allowedType.test(res.headers["content-type"] || "")) { res.destroy(); fail(); return; }
          const chunks: Buffer[] = []; let size = 0;
          res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > MAX_HTML_BYTES) { res.destroy(); fail(); } else chunks.push(chunk); });
          res.on("error", fail);
          res.on("end", () => { clearTimeout(deadline); resolve({ html: Buffer.concat(chunks).toString("utf8"), url: url.href }); });
        });
        active.on("error", fail); active.end();
      }).catch(fail);
    });
  }
  return load(websiteUrl(input), 0);
}

export async function fetchWebsiteHtml(input: string): Promise<string> {
  return (await fetchWebsitePage(input)).html;
}
