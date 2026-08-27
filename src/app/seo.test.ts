import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { getLaunchCategories, getLaunchCalculators } from "@/i18n/catalog";

describe("SEO metadata routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("publishes each static launch route in all locales with alternates", () => {
    vi.stubEnv("SITE_URL", "https://www.example.lk");
    const entries = sitemap();

    expect(entries).toHaveLength(
      (getLaunchCalculators("en").length + getLaunchCategories("en").length + 1) * 3,
    );
    expect(entries[0]).toMatchObject({ url: "https://www.example.lk/en", priority: 1 });
    expect(Object.keys(entries[0].alternates?.languages ?? {})).toEqual(["en-LK", "si-LK", "ta-LK", "x-default"]);
    expect(entries.map((entry) => entry.url)).toContain(
      "https://www.example.lk/ta/calculators/percentage",
    );
    expect(entries.map((entry) => entry.url)).toContain(
      "https://www.example.lk/si/categories/build",
    );
  });

  it("keeps private and operational routes out of crawl results", () => {
    vi.stubEnv("SITE_URL", "https://www.example.lk");

    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/reminders", "/saved", "/en/admin/", "/si/admin/", "/ta/admin/", "/en/reminders", "/si/reminders", "/ta/reminders", "/en/saved", "/si/saved", "/ta/saved"],
      },
      sitemap: "https://www.example.lk/sitemap.xml",
      host: "https://www.example.lk",
    });
  });
});
