import { describe, expect, it } from "vitest";

import { locales } from "@/i18n/config";
import {
  correctionIssuesUrl,
  getTrustPage,
  listTrustPages,
  trustPageSlugs,
} from "@/i18n/trust-content";

describe("localized trust content", () => {
  it("provides all stable slugs in every locale", () => {
    expect(trustPageSlugs).toEqual([
      "about",
      "methodology",
      "editorial-policy",
      "source-policy",
      "privacy",
      "terms",
      "corrections",
      "updates",
    ]);

    for (const locale of locales) {
      expect(listTrustPages(locale).map((page) => page.slug)).toEqual(trustPageSlugs);
    }
  });

  it("has complete semantic content and valid review dates", () => {
    for (const locale of locales) {
      for (const page of listTrustPages(locale)) {
        expect(page.title.trim()).not.toBe("");
        expect(page.description.trim()).not.toBe("");
        expect(page.reviewOwner.trim()).not.toBe("");
        expect(page.indexingNotice.trim()).not.toBe("");
        expect(page.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(`${page.reviewedAt}T00:00:00Z`))).toBe(false);
        expect(page.sections.length).toBeGreaterThanOrEqual(2);

        const headings = page.sections.map((section) => section.heading.trim());
        expect(headings.every(Boolean)).toBe(true);
        expect(new Set(headings).size).toBe(headings.length);
        expect(page.sections.every((section) => section.paragraphs.length > 0
          && section.paragraphs.every((paragraph) => paragraph.trim().length > 0))).toBe(true);
      }
    }
  });

  it("keeps equivalent section structures across locales", () => {
    for (const slug of trustPageSlugs) {
      const sectionCounts = locales.map((locale) => getTrustPage(locale, slug).sections.length);
      expect(new Set(sectionCounts).size).toBe(1);
    }
  });

  it("uses the exact public correction URL in every locale", () => {
    expect(correctionIssuesUrl).toBe("https://github.com/NamalTharindu97/lankacalc/issues");
    for (const locale of locales) {
      expect(getTrustPage(locale, "corrections").sections.flatMap((section) => section.items ?? []))
        .toContain("https://github.com/NamalTharindu97/lankacalc/issues");
    }
  });
});
