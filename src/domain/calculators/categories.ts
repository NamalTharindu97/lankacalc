import { getCalculators } from "@/domain/calculators/registry";

export type CalculatorCategory = {
  name: string;
  slug: string;
  calculators: ReturnType<typeof getCalculators>;
};

export function categorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getCalculatorCategories(): CalculatorCategory[] {
  const grouped = new Map<string, ReturnType<typeof getCalculators>>();

  for (const calculator of getCalculators()) {
    const category = grouped.get(calculator.category) ?? [];
    category.push(calculator);
    grouped.set(calculator.category, category);
  }

  return Array.from(grouped, ([name, calculators]) => ({
    name,
    slug: categorySlug(name),
    calculators,
  }));
}

export function getCalculatorCategory(slug: string): CalculatorCategory | undefined {
  return getCalculatorCategories().find((category) => category.slug === slug);
}
