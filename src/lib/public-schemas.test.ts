import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCalculatorContent, getCalculatorContentKeys } from "@/domain/calculators/content";
import { getCategoryContent } from "@/i18n/category-content";
import { getLaunchCalculators, getLaunchCategories } from "@/i18n/catalog";
import { languageTags, locales, type Locale } from "@/i18n/config";
import { getTrustPage, trustPageSlugs } from "@/i18n/trust-content";
import { getCalculatorSchemas, getCategorySchemas, getHomeSchemas, getTrustPageSchemas } from "@/lib/public-schemas";

const origin = "https://www.example.lk";
const siteName = "LankaCalc";
const topLevelTypes = new Set(["WebSite", "Organization", "WebPage", "CollectionPage", "WebApplication", "BreadcrumbList", "ItemList", "HowTo", "FAQPage"]);
const nestedTypes = new Set(["Organization", "ListItem", "HowToStep", "Question", "Answer"]);

type Schema = Record<string, unknown>;

function expectSchemaContract(schemas: Schema[], locale: Locale, expectedTypes: string[]) {
  expect(schemas.map((schema) => schema["@type"])).toEqual(expectedTypes);

  for (const schema of schemas) {
    expect(schema["@context"]).toBe("https://schema.org");
    expect(topLevelTypes).toContain(schema["@type"]);
    expectLocalizedUrls(schema, locale);
    expectRecognizedNestedTypes(schema, true);
  }
}

function expectLocalizedUrls(value: unknown, locale: Locale): void {
  if (Array.isArray(value)) {
    for (const entry of value) expectLocalizedUrls(entry, locale);
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    if (key === "url" || key === "item") {
      expect(typeof child).toBe("string");
      const parsed = new URL(child as string);
      expect(parsed.protocol).toBe("https:");
      expect(parsed.origin).toBe(origin);
      expect(parsed.pathname === `/${locale}` || parsed.pathname.startsWith(`/${locale}/`)).toBe(true);
    }
    expectLocalizedUrls(child, locale);
  }
}

function expectRecognizedNestedTypes(value: unknown, isRoot = false): void {
  if (Array.isArray(value)) {
    for (const entry of value) expectRecognizedNestedTypes(entry);
    return;
  }
  if (!value || typeof value !== "object") return;

  const record = value as Schema;
  if (!isRoot && "@type" in record) expect(nestedTypes).toContain(record["@type"]);
  for (const child of Object.values(record)) expectRecognizedNestedTypes(child);
}

function expectIsoDate(value: unknown) {
  expect(value).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  expect(Number.isNaN(Date.parse(`${String(value)}T00:00:00Z`))).toBe(false);
}

describe("public structured data", () => {
  beforeEach(() => {
    vi.stubEnv("SITE_URL", origin);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(locales)("matches the visible %s home inputs and publisher", (locale) => {
    const description = `Visible ${locale} home description`;
    const homeUrl = `${origin}/${locale}`;
    const schemas = getHomeSchemas(locale, description);

    expectSchemaContract(schemas, locale, ["WebSite", "Organization"]);
    expect(schemas).toEqual([
      { "@context": "https://schema.org", "@type": "WebSite", name: siteName, description, url: homeUrl, inLanguage: languageTags[locale], publisher: { "@type": "Organization", name: siteName, url: homeUrl } },
      { "@context": "https://schema.org", "@type": "Organization", name: siteName, url: homeUrl, description },
    ]);
  });

  it("matches every localized trust page and its two-item breadcrumb", () => {
    for (const locale of locales) {
      for (const slug of trustPageSlugs) {
        const page = getTrustPage(locale, slug);
        const pageUrl = `${origin}/${locale}/${slug}`;
        const schemas = getTrustPageSchemas(locale, page);

        expectSchemaContract(schemas, locale, ["WebPage", "BreadcrumbList"]);
        expect(schemas[0]).toEqual({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: page.title,
          description: page.description,
          url: pageUrl,
          inLanguage: languageTags[locale],
          dateModified: page.reviewedAt,
          reviewedBy: { "@type": "Organization", name: siteName, url: `${origin}/${locale}` },
        });
        expectIsoDate(schemas[0].dateModified);
        expect(schemas[1].itemListElement).toEqual([
          { "@type": "ListItem", position: 1, name: siteName, item: `${origin}/${locale}` },
          { "@type": "ListItem", position: 2, name: page.title, item: pageUrl },
        ]);
      }
    }
  });

  it("matches every localized launch category, item list, and breadcrumb", () => {
    for (const locale of locales) {
      for (const category of getLaunchCategories(locale)) {
        const content = getCategoryContent(locale, category.slug);
        expect(content).toBeDefined();
        expect(content?.canonicalName).toBe(category.canonicalName);
        expect(content?.referencedCalculatorKeys).toEqual(category.calculators.map(({ key }) => key));

        const categoryUrl = `${origin}/${locale}/categories/${category.slug}`;
        const schemas = getCategorySchemas(locale, category, content!.description);
        expectSchemaContract(schemas, locale, ["CollectionPage", "BreadcrumbList", "ItemList"]);
        expect(schemas[0]).toEqual({ "@context": "https://schema.org", "@type": "CollectionPage", name: category.name, description: content!.description, url: categoryUrl, inLanguage: languageTags[locale] });
        expect(schemas[1].itemListElement).toEqual([
          { "@type": "ListItem", position: 1, name: siteName, item: `${origin}/${locale}` },
          { "@type": "ListItem", position: 2, name: category.name, item: categoryUrl },
        ]);
        expect(schemas[2]).toEqual({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: category.name,
          numberOfItems: category.calculators.length,
          itemListElement: category.calculators.map((calculator, index) => ({ "@type": "ListItem", position: index + 1, name: calculator.name, url: `${origin}/${locale}/calculators/${calculator.key}` })),
        });
      }
    }
  });

  it("matches all five entities for every localized launch calculator", () => {
    const publishedKeys = new Set(getLaunchCalculators("en").map(({ key }) => key));
    expect(new Set(getCalculatorContentKeys())).toEqual(publishedKeys);

    for (const locale of locales) {
      const seenKeys = new Set<string>();
      for (const category of getLaunchCategories(locale)) {
        for (const calculator of category.calculators) {
          expect(seenKeys.has(calculator.key)).toBe(false);
          seenKeys.add(calculator.key);
          expect(publishedKeys.has(calculator.key)).toBe(true);

          const content = getCalculatorContent(calculator.key, locale);
          expect(content).toBeDefined();
          expect(content!.instructions.length).toBeGreaterThan(0);
          expect(content!.faqs.length).toBeGreaterThan(0);
          expectIsoDate(content!.reviewedAt);
          for (const relatedKey of content!.relatedCalculatorKeys) expect(publishedKeys.has(relatedKey)).toBe(true);

          const calculatorUrl = `${origin}/${locale}/calculators/${calculator.key}`;
          const schemas = getCalculatorSchemas(locale, calculator, category, content);
          expectSchemaContract(schemas, locale, ["WebPage", "WebApplication", "BreadcrumbList", "HowTo", "FAQPage"]);
          expect(schemas[0]).toEqual({ "@context": "https://schema.org", "@type": "WebPage", name: calculator.name, description: calculator.summary, url: calculatorUrl, inLanguage: languageTags[locale], dateModified: content!.reviewedAt });
          expect(schemas[1]).toEqual({
            "@context": "https://schema.org", "@type": "WebApplication", name: calculator.name, description: calculator.summary, url: calculatorUrl,
            applicationCategory: `${calculator.category}Application`, operatingSystem: "Any", browserRequirements: "Requires JavaScript", isAccessibleForFree: true,
            inLanguage: languageTags[locale], provider: { "@type": "Organization", name: siteName, url: `${origin}/${locale}` },
          });
          expect(schemas[2].itemListElement).toEqual([
            { "@type": "ListItem", position: 1, name: siteName, item: `${origin}/${locale}` },
            { "@type": "ListItem", position: 2, name: category.name, item: `${origin}/${locale}/categories/${category.slug}` },
            { "@type": "ListItem", position: 3, name: calculator.name, item: calculatorUrl },
          ]);
          expect(schemas[3]).toEqual({
            "@context": "https://schema.org", "@type": "HowTo", name: calculator.name, description: calculator.summary,
            step: content!.instructions.map((instruction, index) => ({ "@type": "HowToStep", position: index + 1, name: instruction, text: instruction })),
          });
          expect(schemas[4]).toEqual({
            "@context": "https://schema.org", "@type": "FAQPage",
            mainEntity: content!.faqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
          });
        }
      }
      expect(seenKeys).toEqual(publishedKeys);
    }
  });
});
