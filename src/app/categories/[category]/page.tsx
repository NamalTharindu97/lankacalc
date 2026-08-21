import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StructuredData } from "@/components/structured-data";
import { Badge } from "@/components/ui/badge";
import {
  getCalculatorCategories,
  getCalculatorCategory,
} from "@/domain/calculators/categories";
import { absoluteUrl, siteName } from "@/lib/site";

type CategoryPageProperties = {
  params: Promise<{ category: string }>;
};

export function generateStaticParams() {
  return getCalculatorCategories().map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProperties): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = getCalculatorCategory(categorySlug);
  if (!category) {
    return { title: "Calculator category not found" };
  }

  const title = `${category.name} calculators for Sri Lanka`;
  const description = `Browse ${category.calculators.length} transparent ${category.name.toLowerCase()} calculators with visible inputs, assumptions, and workings.`;
  const pathname = `/categories/${category.slug}`;

  return {
    title,
    description,
    alternates: { canonical: pathname },
    openGraph: { title, description, url: pathname, siteName, locale: "en_LK", type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function CategoryPage({ params }: CategoryPageProperties) {
  const { category: categorySlug } = await params;
  const category = getCalculatorCategory(categorySlug);
  if (!category) {
    notFound();
  }

  const categoryUrl = absoluteUrl(`/categories/${category.slug}`);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${category.name} calculators for Sri Lanka`,
            url: categoryUrl,
            inLanguage: "en",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Calculators", item: absoluteUrl("/#calculators") },
              { "@type": "ListItem", position: 2, name: category.name, item: categoryUrl },
            ],
          },
        ]}
      />

      <Link className="text-sm font-medium text-muted-foreground hover:text-foreground" href="/#calculators">
        &lt;- All calculators
      </Link>
      <Badge className="mt-8 block w-fit" variant="secondary">{category.name}</Badge>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        {category.name} calculators for Sri Lanka
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Compare transparent tools with visible inputs, calculation breakdowns, assumptions, and
        source provenance when regulated rules apply.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {category.calculators.map((calculator) => (
          <Link
            className="group flex flex-col rounded-xl border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-md"
            href={`/calculators/${calculator.key}`}
            key={calculator.key}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">{calculator.shortName}</h2>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{calculator.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
