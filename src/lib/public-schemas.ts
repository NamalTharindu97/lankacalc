import type { CalculatorContent } from "@/domain/calculators/content";
import type { LocalizedCalculator, LocalizedCategory } from "@/i18n/catalog";
import { languageTags, localizedPath, type Locale } from "@/i18n/config";
import type { LocalizedTrustPage } from "@/i18n/trust-content";
import { absoluteUrl, siteName } from "@/lib/site";

export function getHomeSchemas(locale: Locale, description: string): Array<Record<string, unknown>> {
  const url = absoluteUrl(localizedPath(locale));

  return [
    { "@context": "https://schema.org", "@type": "WebSite", name: siteName, description, url, inLanguage: languageTags[locale], publisher: { "@type": "Organization", name: siteName, url } },
    { "@context": "https://schema.org", "@type": "Organization", name: siteName, url, description },
  ];
}

export function getTrustPageSchemas(locale: Locale, page: LocalizedTrustPage): Array<Record<string, unknown>> {
  const homeUrl = absoluteUrl(localizedPath(locale));
  const pageUrl = absoluteUrl(localizedPath(locale, `/${page.slug}`));

  return [
    { "@context": "https://schema.org", "@type": "WebPage", name: page.title, description: page.description, url: pageUrl, inLanguage: languageTags[locale], dateModified: page.reviewedAt, reviewedBy: { "@type": "Organization", name: siteName, url: homeUrl } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: siteName, item: homeUrl },
      { "@type": "ListItem", position: 2, name: page.title, item: pageUrl },
    ] },
  ];
}

export function getCategorySchemas(locale: Locale, category: LocalizedCategory, description: string): Array<Record<string, unknown>> {
  const homeUrl = absoluteUrl(localizedPath(locale));
  const categoryUrl = absoluteUrl(localizedPath(locale, `/categories/${category.slug}`));

  return [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: category.name, description, url: categoryUrl, inLanguage: languageTags[locale] },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: siteName, item: homeUrl },
      { "@type": "ListItem", position: 2, name: category.name, item: categoryUrl },
    ] },
    { "@context": "https://schema.org", "@type": "ItemList", name: category.name, numberOfItems: category.calculators.length, itemListElement: category.calculators.map((calculator, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: calculator.name,
      url: absoluteUrl(localizedPath(locale, `/calculators/${calculator.key}`)),
    })) },
  ];
}

export function getCalculatorSchemas(locale: Locale, calculator: LocalizedCalculator, category: LocalizedCategory, content?: CalculatorContent): Array<Record<string, unknown>> {
  const homeUrl = absoluteUrl(localizedPath(locale));
  const categoryUrl = absoluteUrl(localizedPath(locale, `/categories/${category.slug}`));
  const calculatorUrl = absoluteUrl(localizedPath(locale, `/calculators/${calculator.key}`));
  const schemas: Array<Record<string, unknown>> = [
    { "@context": "https://schema.org", "@type": "WebPage", name: calculator.name, description: calculator.summary, url: calculatorUrl, inLanguage: languageTags[locale], ...(content ? { dateModified: content.reviewedAt } : {}) },
    { "@context": "https://schema.org", "@type": "WebApplication", name: calculator.name, description: calculator.summary, url: calculatorUrl, applicationCategory: `${calculator.category}Application`, operatingSystem: "Any", browserRequirements: "Requires JavaScript", isAccessibleForFree: true, inLanguage: languageTags[locale], provider: { "@type": "Organization", name: siteName, url: homeUrl } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: siteName, item: homeUrl },
      { "@type": "ListItem", position: 2, name: category.name, item: categoryUrl },
      { "@type": "ListItem", position: 3, name: calculator.name, item: calculatorUrl },
    ] },
  ];

  if (content) {
    schemas.push(
      { "@context": "https://schema.org", "@type": "HowTo", name: calculator.name, description: calculator.summary, step: content.instructions.map((instruction, index) => ({ "@type": "HowToStep", position: index + 1, name: instruction, text: instruction })) },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: content.faqs.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) },
    );
  }

  return schemas;
}
