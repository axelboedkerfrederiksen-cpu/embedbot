import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/dashboard", "/auth/", "/setup", "/preview/", "/login", "/data-requests", "/test.html", "/demo.html", "/performance-test.html"] },
    sitemap: "https://www.embedbot.dk/sitemap.xml",
  };
}
