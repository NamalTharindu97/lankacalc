import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { getCalculatorCategories } from "@/domain/calculators/categories";
import { getCalculators } from "@/domain/calculators/registry";

describe("SEO metadata routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("publishes every calculator in the sitemap", () => {
    vi.stubEnv("SITE_URL", "https://www.example.lk");
    const entries = sitemap();

    expect(entries).toHaveLength(
      getCalculators().length + getCalculatorCategories().length + 1,
    );
    expect(entries[0]).toMatchObject({ url: "https://www.example.lk/", priority: 1 });
    expect(entries.map((entry) => entry.url)).toContain(
      "https://www.example.lk/calculators/percentage",
    );
    expect(entries.map((entry) => entry.url)).toContain(
      "https://www.example.lk/categories/business-and-tax",
    );
  });

  it("keeps private and operational routes out of crawl results", () => {
    vi.stubEnv("SITE_URL", "https://www.example.lk");

    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/reminders", "/saved"],
      },
      sitemap: "https://www.example.lk/sitemap.xml",
      host: "https://www.example.lk",
    });
  });
});
