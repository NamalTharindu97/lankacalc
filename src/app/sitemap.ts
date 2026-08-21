import type { MetadataRoute } from "next";

import { getCalculatorCategories } from "@/domain/calculators/categories";
import { getCalculators } from "@/domain/calculators/registry";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...getCalculatorCategories().map((category) => ({
      url: absoluteUrl(`/categories/${category.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...getCalculators().map((calculator) => ({
      url: absoluteUrl(`/calculators/${calculator.key}`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
