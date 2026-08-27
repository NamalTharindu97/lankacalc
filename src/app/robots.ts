import type { MetadataRoute } from "next";

import { absoluteUrl, getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/reminders", "/saved", "/en/admin/", "/si/admin/", "/ta/admin/", "/en/reminders", "/si/reminders", "/ta/reminders", "/en/saved", "/si/saved", "/ta/saved"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl().origin,
  };
}
