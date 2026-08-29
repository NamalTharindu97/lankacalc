import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StructuredData } from "@/components/structured-data";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { getLaunchCategories, getLaunchCategory } from "@/i18n/catalog";
import { getCategoryContent } from "@/i18n/category-content";
import { isLocale, languageAlternates, languageTags, localizedPath, openGraphLocales, type Locale } from "@/i18n/config";
import { getCategorySchemas } from "@/lib/public-schemas";
import { siteName, socialImage } from "@/lib/site";

type Params = Promise<{ locale: string; category: string }>;

const labels: Record<Locale, { breadcrumb: string; useCases: string; limitations: string; choose: string; reviewed: string }> = {
  en: { breadcrumb: "Breadcrumb", useCases: "What these calculators help with", limitations: "Check before using a result", choose: "Choose the right calculator", reviewed: "Reviewed" },
  si: { breadcrumb: "මාර්ග සලකුණු", useCases: "මෙම ගණක උපකාර වන දේ", limitations: "ප්‍රතිඵලයක් භාවිතයට පෙර පරීක්ෂා කරන්න", choose: "නිවැරදි ගණකය තෝරන්න", reviewed: "සමාලෝචනය කළේ" },
  ta: { breadcrumb: "வழிசெலுத்தல்", useCases: "இந்தக் கணிப்பான்கள் உதவும் விடயங்கள்", limitations: "முடிவைப் பயன்படுத்துமுன் சரிபாருங்கள்", choose: "சரியான கணிப்பானைத் தேர்ந்தெடுங்கள்", reviewed: "மீளாய்வு" },
};

export function generateStaticParams() {
  return (["en", "si", "ta"] as const).flatMap(locale => getLaunchCategories(locale).map(category => ({ locale, category: category.slug })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const values = await params;
  if (!isLocale(values.locale)) return {};
  const category = getLaunchCategory(values.locale, values.category);
  if (!category) return { title: "Category not found" };
  const content = getCategoryContent(values.locale, category.slug);
  const pathname = `/categories/${category.slug}`;
  const title = `${category.name} | ${siteName}`;
  const description = content?.description ?? category.name;
  return { title, description, alternates: { canonical: localizedPath(values.locale, pathname), languages: languageAlternates(pathname) }, openGraph: { title, description, url: localizedPath(values.locale, pathname), siteName, locale: openGraphLocales[values.locale], type: "website", images: [socialImage] } };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const values = await params;
  if (!isLocale(values.locale)) notFound();
  const locale = values.locale;
  const category = getLaunchCategory(locale, values.category);
  if (!category) notFound();
  const content = getCategoryContent(locale, category.slug);
  if (!content) notFound();
  const text = labels[locale];
  const reviewedDate = new Intl.DateTimeFormat(languageTags[locale], { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${content.reviewedAt}T00:00:00Z`));
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <StructuredData data={getCategorySchemas(locale, category, content.description)} />
    <Breadcrumbs label={text.breadcrumb} items={[{ label: siteName, href: localizedPath(locale) }, { label: category.name }]} />
    <Badge className="mt-8 block w-fit" variant="secondary">{category.name}</Badge><h1 className="mt-4 text-3xl font-bold sm:text-4xl">{category.name}</h1><p className="mt-4 max-w-2xl text-pretty leading-7 text-muted-foreground">{content.description}</p>
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{category.calculators.map(calculator => <Link className="group rounded-xl border bg-card p-6 hover:shadow-md" href={localizedPath(locale, `/calculators/${calculator.key}`)} key={calculator.key}><div className="flex justify-between"><h2 className="text-lg font-semibold">{calculator.shortName}</h2><ArrowRight className="h-4 w-4" /></div><p className="mt-3 text-sm text-muted-foreground">{calculator.summary}</p></Link>)}</div>
    <div className="mt-14 grid gap-8 border-t pt-10 md:grid-cols-2">
      <CategoryList items={content.useCases} title={text.useCases} />
      <CategoryList items={content.limitations} title={text.limitations} />
    </div>
    <section className="mt-10 rounded-xl border bg-muted/30 p-6"><h2 className="text-2xl font-semibold">{text.choose}</h2><p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{content.selectionGuidance}</p></section>
    <p className="mt-8 text-sm text-muted-foreground">{text.reviewed}: <time dateTime={content.reviewedAt}>{reviewedDate}</time> · {content.reviewOwner}</p>
  </div>;
}

function CategoryList({ items, title }: { items: readonly string[]; title: string }) {
  return <section><h2 className="text-2xl font-semibold">{title}</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">{items.map(item => <li className="border-l-2 pl-4" key={item}>{item}</li>)}</ul></section>;
}
