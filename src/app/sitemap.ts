import type { MetadataRoute } from "next";

import { getLaunchCategories, getLaunchCalculators } from "@/i18n/catalog";
import { languageAlternates, locales, localizedPath } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { pathname: "", priority: 1 },
    ...getLaunchCategories("en").map(category => ({ pathname: `/categories/${category.slug}`, priority: 0.9 })),
    ...getLaunchCalculators("en").map(calculator => ({ pathname: `/calculators/${calculator.key}`, priority: 0.8 })),
  ];
  return locales.flatMap(locale => routes.map(route => ({
      url: absoluteUrl(localizedPath(locale, route.pathname)),
      changeFrequency: "weekly",
      priority: route.priority,
      alternates: { languages: Object.fromEntries(Object.entries(languageAlternates(route.pathname)).map(([language, path]) => [language, absoluteUrl(path)])) },
    })));
}
