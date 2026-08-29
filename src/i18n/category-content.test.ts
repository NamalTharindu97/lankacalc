import { describe, expect, it } from "vitest";

import { getLaunchCategory, getLaunchCalculators } from "@/i18n/catalog";
import { categorySlugs, getCategoryContent, listCategoryContent } from "@/i18n/category-content";
import { locales } from "@/i18n/config";

describe("localized category content", () => {
  it("provides all four categories in every locale with complete, consistent content", () => {
    for (const locale of locales) {
      const entries = listCategoryContent(locale);
      expect(entries.map(({ slug }) => slug)).toEqual(categorySlugs);
      expect(new Set(entries.map(({ description }) => description)).size).toBe(categorySlugs.length);

      for (const entry of entries) {
        expect(getCategoryContent(locale, entry.slug)).toEqual(entry);
        expect(getCategoryContent(locale, entry.canonicalName)).toEqual(entry);
        expect(entry.reviewedAt).toBe("2026-08-28");
        expect(entry.reviewOwner.trim()).not.toBe("");
        expect(entry.description.trim()).not.toBe("");
        expect(entry.selectionGuidance.trim()).not.toBe("");
        expect(entry.useCases).toHaveLength(3);
        expect(entry.limitations).toHaveLength(3);
        expect(entry.useCases.every((value) => value.trim().length > 0)).toBe(true);
        expect(entry.limitations.every((value) => value.trim().length > 0)).toBe(true);
        expect(new Set(entry.useCases).size).toBe(3);
        expect(new Set(entry.limitations).size).toBe(3);
      }
    }
  });

  it("references only calculators published in the corresponding localized launch category", () => {
    for (const locale of locales) {
      const allLaunchKeys = new Set(getLaunchCalculators(locale).map(({ key }) => key));
      for (const entry of listCategoryContent(locale)) {
        const categoryKeys = new Set(getLaunchCategory(locale, entry.slug)!.calculators.map(({ key }) => key));
        expect(entry.referencedCalculatorKeys.length).toBeGreaterThan(0);
        expect(new Set(entry.referencedCalculatorKeys).size).toBe(entry.referencedCalculatorKeys.length);
        expect(entry.referencedCalculatorKeys.every((key) => allLaunchKeys.has(key))).toBe(true);
        expect(entry.referencedCalculatorKeys.every((key) => categoryKeys.has(key))).toBe(true);
        const referencedKeys = new Set<string>(entry.referencedCalculatorKeys);
        expect([...categoryKeys].every((key) => referencedKeys.has(key))).toBe(true);
      }
    }
  });

  it("keeps equivalent array lengths and calculator references across locales", () => {
    for (const slug of categorySlugs) {
      const entries = locales.map((locale) => getCategoryContent(locale, slug)!);
      expect(new Set(entries.map(({ useCases }) => useCases.length))).toEqual(new Set([3]));
      expect(new Set(entries.map(({ limitations }) => limitations.length))).toEqual(new Set([3]));
      expect(entries.map(({ referencedCalculatorKeys }) => referencedCalculatorKeys)).toEqual([
        entries[0].referencedCalculatorKeys,
        entries[0].referencedCalculatorKeys,
        entries[0].referencedCalculatorKeys,
      ]);
    }
  });

  it("returns undefined for unknown category keys", () => {
    for (const locale of locales) expect(getCategoryContent(locale, "unpublished")).toBeUndefined();
  });
});
