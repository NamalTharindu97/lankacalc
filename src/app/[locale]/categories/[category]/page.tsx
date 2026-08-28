import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StructuredData } from "@/components/structured-data";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { getLaunchCategories, getLaunchCategory } from "@/i18n/catalog";
import { copy } from "@/i18n/copy";
import { isLocale, languageAlternates, localizedPath, openGraphLocales } from "@/i18n/config";
import { getCategorySchemas } from "@/lib/public-schemas";
import { siteName, socialImage } from "@/lib/site";

type Params = Promise<{ locale: string; category: string }>;

export function generateStaticParams() {
  return (["en", "si", "ta"] as const).flatMap(locale => getLaunchCategories(locale).map(category => ({ locale, category: category.slug })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const values = await params;
  if (!isLocale(values.locale)) return {};
  const category = getLaunchCategory(values.locale, values.category);
  if (!category) return { title: "Category not found" };
  const pathname = `/categories/${category.slug}`;
  const title = `${category.name} | ${siteName}`;
  const description = copy[values.locale].categoryIntro;
  return { title, description, alternates: { canonical: localizedPath(values.locale, pathname), languages: languageAlternates(pathname) }, openGraph: { title, description, url: localizedPath(values.locale, pathname), siteName, locale: openGraphLocales[values.locale], type: "website", images: [socialImage] } };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const values = await params;
  if (!isLocale(values.locale)) notFound();
  const locale = values.locale;
  const category = getLaunchCategory(locale, values.category);
  if (!category) notFound();
  const text = copy[locale];
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <StructuredData data={getCategorySchemas(locale, category, text.categoryIntro)} />
    <Breadcrumbs label="Breadcrumb" items={[{ label: siteName, href: localizedPath(locale) }, { label: category.name }]} />
    <Badge className="mt-8 block w-fit" variant="secondary">{category.name}</Badge><h1 className="mt-4 text-3xl font-bold sm:text-4xl">{category.name}</h1><p className="mt-4 max-w-2xl text-muted-foreground">{text.categoryIntro}</p>
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{category.calculators.map(calculator => <Link className="group rounded-xl border bg-card p-6 hover:shadow-md" href={localizedPath(locale, `/calculators/${calculator.key}`)} key={calculator.key}><div className="flex justify-between"><h2 className="text-lg font-semibold">{calculator.shortName}</h2><ArrowRight className="h-4 w-4" /></div><p className="mt-3 text-sm text-muted-foreground">{calculator.summary}</p></Link>)}</div>
  </div>;
}
