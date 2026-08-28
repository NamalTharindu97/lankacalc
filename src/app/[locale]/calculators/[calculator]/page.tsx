import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CalculatorForm } from "@/components/calculator-form";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { StructuredData } from "@/components/structured-data";
import { Badge } from "@/components/ui/badge";
import { getLaunchCalculator, getLaunchCalculators, getLaunchCategories } from "@/i18n/catalog";
import { getCalculatorContent } from "@/domain/calculators/content";
import { copy } from "@/i18n/copy";
import { isLocale, languageAlternates, languageTags, localizedPath, openGraphLocales, type Locale } from "@/i18n/config";
import { getCalculatorSchemas } from "@/lib/public-schemas";
import { siteName, socialImage } from "@/lib/site";

type Params = Promise<{ locale: string; calculator: string }>;

const contentLabels: Record<Locale, Record<string, string>> = {
  en: { breadcrumb: "Breadcrumb", directAnswer: "Quick answer", instructions: "How to use it", formula: "Formula", example: "Worked example", assumptions: "Assumptions", exclusions: "Not included", mistakes: "Common mistakes", faq: "Frequently asked questions", related: "Related calculators", reviewed: "Reviewed" },
  si: { breadcrumb: "මාර්ග සලකුණු", directAnswer: "කෙටි පිළිතුර", instructions: "භාවිත කරන ආකාරය", formula: "සූත්‍රය", example: "ගණනය කළ උදාහරණය", assumptions: "උපකල්පන", exclusions: "ඇතුළත් නොවේ", mistakes: "පොදු වැරදි", faq: "නිතර අසන ප්‍රශ්න", related: "අදාළ ගණක", reviewed: "සමාලෝචනය කළේ" },
  ta: { breadcrumb: "வழிசெலுத்தல்", directAnswer: "சுருக்கமான பதில்", instructions: "பயன்படுத்தும் முறை", formula: "சூத்திரம்", example: "கணக்கிட்ட உதாரணம்", assumptions: "கருதுகோள்கள்", exclusions: "சேர்க்கப்படாதவை", mistakes: "பொதுவான தவறுகள்", faq: "அடிக்கடி கேட்கப்படும் கேள்விகள்", related: "தொடர்புடைய கணிப்பான்கள்", reviewed: "மீளாய்வு" },
};

export function generateStaticParams() {
  return (["en", "si", "ta"] as const).flatMap(locale => getLaunchCalculators(locale).map(calculator => ({ locale, calculator: calculator.key })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const values = await params;
  if (!isLocale(values.locale)) return {};
  const calculator = getLaunchCalculator(values.locale, values.calculator);
  if (!calculator) return { title: copy[values.locale].notFound, robots: { index: false } };
  const pathname = `/calculators/${calculator.key}`;
  return { title: calculator.name, description: calculator.summary, alternates: { canonical: localizedPath(values.locale, pathname), languages: languageAlternates(pathname) }, openGraph: { type: "website", locale: openGraphLocales[values.locale], siteName, title: calculator.name, description: calculator.summary, url: localizedPath(values.locale, pathname), images: [socialImage] } };
}

export default async function CalculatorPage({ params }: { params: Params }) {
  const values = await params;
  if (!isLocale(values.locale)) notFound();
  const locale = values.locale;
  const calculator = getLaunchCalculator(values.locale, values.calculator);
  if (!calculator) notFound();
  const text = copy[values.locale];
  const labels = contentLabels[values.locale];
  const content = getCalculatorContent(calculator.key, values.locale);
  const category = getLaunchCategories(values.locale).find(item => item.calculators.some(candidate => candidate.key === calculator.key));
  const relatedCalculators = (content?.relatedCalculatorKeys ?? []).flatMap(key => {
    const related = getLaunchCalculator(locale, key);
    return related ? [related] : [];
  });
  const categoryPath = `/categories/${category?.slug ?? ""}`;
  const reviewedDate = content ? new Intl.DateTimeFormat(languageTags[locale], { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${content.reviewedAt}T00:00:00Z`)) : null;
  const schemas = getCalculatorSchemas(locale, calculator, category!, content);
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <StructuredData data={schemas} />
    <Breadcrumbs label={labels.breadcrumb} items={[{ label: siteName, href: localizedPath(values.locale) }, { label: category?.name ?? calculator.category, href: localizedPath(values.locale, categoryPath) }, { label: calculator.shortName }]} />
    <div className="mb-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><Badge className="mb-3" variant="outline">{calculator.category}</Badge><h1 className="text-3xl font-bold sm:text-4xl">{calculator.name}</h1></div><Badge variant="secondary">{text.version} v{calculator.version}</Badge></div><p className="mt-4 max-w-xl text-muted-foreground">{calculator.summary}</p></div>
    <CalculatorForm anonymous calculator={calculator} copy={text} locale={values.locale} />
    {content ? <article className="mt-16 space-y-12 border-t pt-12">
      <section aria-labelledby="quick-answer"><p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{labels.directAnswer}</p><h2 className="mt-2 max-w-3xl text-pretty text-3xl font-bold" id="quick-answer">{calculator.name}</h2><p className="mt-4 max-w-3xl text-pretty leading-7 text-muted-foreground">{content.directAnswer}</p></section>
      <div className="grid gap-10 lg:grid-cols-2">
        <section><h2 className="text-2xl font-semibold">{labels.instructions}</h2><ol className="mt-4 space-y-3 text-muted-foreground">{content.instructions.map((instruction, index) => <li className="flex gap-3" key={instruction}><span className="font-semibold text-foreground">{index + 1}.</span><span>{instruction}</span></li>)}</ol></section>
        <section><h2 className="text-2xl font-semibold">{labels.formula}</h2><code className="mt-4 block overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">{content.formula.expression}</code><p className="mt-4 leading-7 text-muted-foreground">{content.formula.explanation}</p><dl className="mt-4 space-y-2">{content.formula.variables.map(variable => <div className="flex gap-3" key={variable.symbol}><dt className="w-8 font-mono font-semibold">{variable.symbol}</dt><dd className="text-muted-foreground">{variable.meaning}</dd></div>)}</dl></section>
      </div>
      <section className="rounded-xl border bg-muted/30 p-6"><p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{labels.example}</p><h2 className="mt-2 text-2xl font-semibold">{content.workedExample.title}</h2><p className="mt-4 leading-7 text-muted-foreground">{content.workedExample.input}</p><p className="mt-3 leading-7">{content.workedExample.result}</p></section>
      <div className="grid gap-8 md:grid-cols-3"><ContentList title={labels.assumptions} items={content.assumptions} /><ContentList title={labels.exclusions} items={content.exclusions} /><ContentList title={labels.mistakes} items={content.commonMistakes} /></div>
      <section><h2 className="text-2xl font-semibold">{labels.faq}</h2><div className="mt-5 divide-y rounded-xl border">{content.faqs.map(faq => <details className="group p-5" key={faq.question}><summary className="cursor-pointer font-semibold marker:text-muted-foreground">{faq.question}</summary><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{faq.answer}</p></details>)}</div></section>
      <p className="text-sm text-muted-foreground">{labels.reviewed}: <time dateTime={content.reviewedAt}>{reviewedDate}</time> · {content.reviewedBy}</p>
    </article> : null}
    {relatedCalculators.length > 0 ? <section className="mt-14 border-t pt-10"><h2 className="text-2xl font-semibold">{labels.related}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{relatedCalculators.map(related => <Link className="group rounded-xl border bg-card p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={localizedPath(locale, `/calculators/${related.key}`)} key={related.key}><div className="flex items-center justify-between gap-4"><div><h3 className="font-semibold">{related.shortName}</h3><p className="mt-2 text-sm text-muted-foreground">{related.summary}</p></div><ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" /></div></Link>)}</div></section> : null}
    <section className="mt-12 grid gap-6 border-t pt-10 md:grid-cols-2"><div><h2 className="text-2xl font-semibold">{text.about}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{calculator.summary}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{text.aboutDetail}</p></div><div><h2 className="text-2xl font-semibold">{text.needed}</h2><ul className="mt-3 space-y-3 text-sm text-muted-foreground">{calculator.fields.map(field => <li key={field.name}><span className="font-medium text-foreground">{field.label}</span>{field.description ? `: ${field.description}` : ` (${field.required ? text.required : text.optional})`}</li>)}</ul></div></section>
  </div>;
}

function ContentList({ title, items }: { title: string; items: string[] }) {
  return <section><h2 className="text-xl font-semibold">{title}</h2><ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">{items.map(item => <li className="border-l-2 pl-3" key={item}>{item}</li>)}</ul></section>;
}
