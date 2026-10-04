import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/prices", "/support", "/faq", "/privacy", "/cookies", "/terms", "/refunds", "/dpa", "/subprocessors", "/pilot"].map(path => ({ url: `https://www.embedbot.dk${path}` }));
}
