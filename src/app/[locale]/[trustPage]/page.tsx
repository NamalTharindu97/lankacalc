import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { StructuredData } from "@/components/structured-data";
import { Badge } from "@/components/ui/badge";
import { isLocale, languageAlternates, languageTags, localizedPath, locales, openGraphLocales } from "@/i18n/config";
import { getTrustPage, isTrustPageSlug, trustPageSlugs } from "@/i18n/trust-content";
import { getTrustPageSchemas } from "@/lib/public-schemas";
import { siteName, socialImage } from "@/lib/site";

type Params = Promise<{ locale: string; trustPage: string }>;

const labels = {
  en: { breadcrumb: "Breadcrumb", policy: "Trust and policy", reviewed: "Reviewed", owner: "Review owner" },
  si: { breadcrumb: "මාර්ග සලකුණු", policy: "විශ්වාසය සහ ප්‍රතිපත්ති", reviewed: "සමාලෝචනය කළේ", owner: "සමාලෝචන වගකීම" },
  ta: { breadcrumb: "வழிசெலுத்தல்", policy: "நம்பிக்கையும் கொள்கையும்", reviewed: "மீளாய்வு", owner: "மீளாய்வுப் பொறுப்பு" },
} as const;

export function generateStaticParams() {
  return locales.flatMap(locale => trustPageSlugs.map(trustPage => ({ locale, trustPage })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const values = await params;
  if (!isLocale(values.locale) || !isTrustPageSlug(values.trustPage)) return { robots: { index: false } };
  const page = getTrustPage(values.locale, values.trustPage);
  const pathname = `/${page.slug}`;

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: localizedPath(values.locale, pathname), languages: languageAlternates(pathname) },
    openGraph: { type: "website", locale: openGraphLocales[values.locale], siteName, title: page.title, description: page.description, url: localizedPath(values.locale, pathname), images: [socialImage] },
  };
}

export default async function TrustPage({ params }: { params: Params }) {
  const values = await params;
  if (!isLocale(values.locale) || !isTrustPageSlug(values.trustPage)) notFound();
  const locale = values.locale;
  const page = getTrustPage(locale, values.trustPage);
  const text = labels[locale];
  const reviewedDate = new Intl.DateTimeFormat(languageTags[locale], { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${page.reviewedAt}T00:00:00Z`));

  return <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
    <StructuredData data={getTrustPageSchemas(locale, page)} />
    <Breadcrumbs label={text.breadcrumb} items={[{ label: siteName, href: localizedPath(locale) }, { label: page.title }]} />
    <Badge className="mt-8" variant="secondary">{text.policy}</Badge>
    <h1 className="mt-4 text-pretty text-4xl font-bold tracking-tight sm:text-5xl">{page.title}</h1>
    <p className="mt-5 text-pretty text-lg leading-8 text-muted-foreground">{page.description}</p>
    <div className="mt-12 space-y-12">{page.sections.map(section => <section key={section.heading}>
      <h2 className="text-2xl font-semibold">{section.heading}</h2>
      <div className="mt-4 space-y-4 leading-7 text-muted-foreground">{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
      {section.items ? <ul className="mt-5 space-y-3">{section.items.map(item => <li className="border-l-2 pl-4 text-sm leading-6 text-muted-foreground" key={item}>{item.startsWith("https://") ? <Link className="font-medium text-foreground underline underline-offset-4" href={item}>{item}</Link> : item}</li>)}</ul> : null}
    </section>)}</div>
    <aside className="mt-14 rounded-xl border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground">
      <p><span className="font-medium text-foreground">{text.reviewed}:</span> <time dateTime={page.reviewedAt}>{reviewedDate}</time></p>
      <p><span className="font-medium text-foreground">{text.owner}:</span> {page.reviewOwner}</p>
      <p className="mt-2">{page.indexingNotice}</p>
    </aside>
  </article>;
}
