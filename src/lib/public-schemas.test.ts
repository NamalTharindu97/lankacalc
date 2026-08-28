import { afterEach, describe, expect, it, vi } from "vitest";

import { getCalculatorContent } from "@/domain/calculators/content";
import { getLaunchCalculator, getLaunchCategory } from "@/i18n/catalog";
import { getTrustPage } from "@/i18n/trust-content";
import { getCalculatorSchemas, getCategorySchemas, getHomeSchemas, getTrustPageSchemas } from "@/lib/public-schemas";

describe("public structured data", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("identifies LankaCalc as the localized website publisher", () => {
    vi.stubEnv("SITE_URL", "https://www.example.lk");

    expect(getHomeSchemas("en", "Transparent calculations")).toEqual([
      { "@context": "https://schema.org", "@type": "WebSite", name: "LankaCalc", description: "Transparent calculations", url: "https://www.example.lk/en", inLanguage: "en-LK", publisher: { "@type": "Organization", name: "LankaCalc", url: "https://www.example.lk/en" } },
      { "@context": "https://schema.org", "@type": "Organization", name: "LankaCalc", url: "https://www.example.lk/en", description: "Transparent calculations" },
    ]);
  });

  it("matches a category's visible breadcrumb and calculator list", () => {
    vi.stubEnv("SITE_URL", "https://www.example.lk");
    const category = getLaunchCategory("si", "build")!;
    const schemas = getCategorySchemas("si", category, "Category introduction");

    expect(schemas.map(schema => schema["@type"])).toEqual(["CollectionPage", "BreadcrumbList", "ItemList"]);
    expect(schemas[1].itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "LankaCalc", item: "https://www.example.lk/si" },
      { "@type": "ListItem", position: 2, name: category.name, item: "https://www.example.lk/si/categories/build" },
    ]);
    expect(schemas[2]).toMatchObject({ numberOfItems: category.calculators.length });
    expect(schemas[2].itemListElement).toEqual(category.calculators.map((calculator, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: calculator.name,
      url: `https://www.example.lk/si/calculators/${calculator.key}`,
    })));
  });

  it("matches calculator review, instructions, and FAQ content", () => {
    vi.stubEnv("SITE_URL", "https://www.example.lk");
    const calculator = getLaunchCalculator("ta", "percentage")!;
    const category = getLaunchCategory("ta", "everyday")!;
    const content = getCalculatorContent("percentage", "ta")!;
    const schemas = getCalculatorSchemas("ta", calculator, category, content);

    expect(schemas.map(schema => schema["@type"])).toEqual(["WebPage", "WebApplication", "BreadcrumbList", "HowTo", "FAQPage"]);
    expect(schemas[0]).toMatchObject({ dateModified: content.reviewedAt, inLanguage: "ta-LK", url: "https://www.example.lk/ta/calculators/percentage" });
    expect(schemas[3].step).toEqual(content.instructions.map((instruction, index) => ({ "@type": "HowToStep", position: index + 1, name: instruction, text: instruction })));
    expect(schemas[4].mainEntity).toEqual(content.faqs.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })));
  });

  it("matches visible trust-page review metadata and breadcrumb", () => {
    vi.stubEnv("SITE_URL", "https://www.example.lk");
    const page = getTrustPage("en", "methodology");
    const schemas = getTrustPageSchemas("en", page);

    expect(schemas.map(schema => schema["@type"])).toEqual(["WebPage", "BreadcrumbList"]);
    expect(schemas[0]).toMatchObject({ name: page.title, dateModified: page.reviewedAt, inLanguage: "en-LK", url: "https://www.example.lk/en/methodology" });
    expect(schemas[1].itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "LankaCalc", item: "https://www.example.lk/en" },
      { "@type": "ListItem", position: 2, name: page.title, item: "https://www.example.lk/en/methodology" },
    ]);
  });
});
