import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { generateMetadata as generateCalculatorMetadata } from "@/app/[locale]/calculators/[calculator]/page";
import { generateMetadata as generateCategoryMetadata } from "@/app/[locale]/categories/[category]/page";
import { generateMetadata as generateLocaleMetadata } from "@/app/[locale]/layout";
import { generateMetadata as generateTrustMetadata } from "@/app/[locale]/[trustPage]/page";
import { metadata as rootMetadata } from "@/app/layout";
import { config as proxyConfig } from "@/proxy";
import { getLaunchCategories, getLaunchCalculators } from "@/i18n/catalog";
import { languageAlternates, locales, localizedPath } from "@/i18n/config";
import { trustPageSlugs } from "@/i18n/trust-content";

describe("SEO metadata routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("publishes each static launch route in all locales with alternates", () => {
    vi.stubEnv("SITE_URL", "https://www.example.lk");
    const entries = sitemap();

    expect(entries).toHaveLength(
      (getLaunchCalculators("en").length + getLaunchCategories("en").length + trustPageSlugs.length + 1) * 3,
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

  it("attaches the generated social image to public metadata", async () => {
    const calculatorMetadata = await generateCalculatorMetadata({ params: Promise.resolve({ locale: "ta", calculator: "percentage" }) });
    const categoryMetadata = await generateCategoryMetadata({ params: Promise.resolve({ locale: "si", category: "build" }) });

    expect(rootMetadata.openGraph?.images).toEqual([{ url: "/opengraph-image", width: 1200, height: 630, alt: expect.stringContaining("LankaCalc") }]);
    expect(calculatorMetadata.openGraph?.images).toEqual(rootMetadata.openGraph?.images);
    expect(categoryMetadata.openGraph?.images).toEqual(rootMetadata.openGraph?.images);
    expect(proxyConfig.matcher[0]).toContain("opengraph-image");
    expect(proxyConfig.matcher[0]).toContain("llms.txt");
  });

  it("publishes reciprocal canonical and language graphs for every launch page", async () => {
    for (const locale of locales) {
      const homeMetadata = await generateLocaleMetadata({ params: Promise.resolve({ locale }) });
      expect(homeMetadata.alternates).toEqual({ canonical: localizedPath(locale), languages: languageAlternates() });

      for (const trustPage of trustPageSlugs) {
        const pathname = `/${trustPage}`;
        const metadata = await generateTrustMetadata({ params: Promise.resolve({ locale, trustPage }) });
        expect(metadata.alternates).toEqual({ canonical: localizedPath(locale, pathname), languages: languageAlternates(pathname) });
      }

      for (const category of getLaunchCategories(locale)) {
        const pathname = `/categories/${category.slug}`;
        const metadata = await generateCategoryMetadata({ params: Promise.resolve({ locale, category: category.slug }) });
        expect(metadata.alternates).toEqual({ canonical: localizedPath(locale, pathname), languages: languageAlternates(pathname) });
      }

      for (const calculator of getLaunchCalculators(locale)) {
        const pathname = `/calculators/${calculator.key}`;
        const metadata = await generateCalculatorMetadata({ params: Promise.resolve({ locale, calculator: calculator.key }) });
        expect(metadata.alternates).toEqual({ canonical: localizedPath(locale, pathname), languages: languageAlternates(pathname) });
      }
    }
  });

  it("keeps localized pages non-indexable until the launch gate is enabled", async () => {
    vi.stubEnv("PUBLIC_INDEXING_ENABLED", "false");
    expect((await generateLocaleMetadata({ params: Promise.resolve({ locale: "en" }) })).robots).toEqual({ index: false, follow: false });

    vi.stubEnv("PUBLIC_INDEXING_ENABLED", "true");
    expect((await generateLocaleMetadata({ params: Promise.resolve({ locale: "en" }) })).robots).toEqual({ index: true, follow: true });
  });
});
