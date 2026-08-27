import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CalculatorForm } from "@/components/calculator-form";
import { StructuredData } from "@/components/structured-data";
import { Badge } from "@/components/ui/badge";
import { getLaunchCalculator, getLaunchCalculators } from "@/i18n/catalog";
import { copy } from "@/i18n/copy";
import { isLocale, languageAlternates, languageTags, localizedPath, openGraphLocales } from "@/i18n/config";
import { absoluteUrl, siteName } from "@/lib/site";

type Params = Promise<{ locale: string; calculator: string }>;

export function generateStaticParams() {
  return (["en", "si", "ta"] as const).flatMap(locale => getLaunchCalculators(locale).map(calculator => ({ locale, calculator: calculator.key })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const values = await params;
  if (!isLocale(values.locale)) return {};
  const calculator = getLaunchCalculator(values.locale, values.calculator);
  if (!calculator) return { title: copy[values.locale].notFound, robots: { index: false } };
  const pathname = `/calculators/${calculator.key}`;
  return { title: calculator.name, description: calculator.summary, alternates: { canonical: localizedPath(values.locale, pathname), languages: languageAlternates(pathname) }, openGraph: { type: "website", locale: openGraphLocales[values.locale], siteName, title: calculator.name, description: calculator.summary, url: localizedPath(values.locale, pathname) } };
}

export default async function CalculatorPage({ params }: { params: Params }) {
  const values = await params;
  if (!isLocale(values.locale)) notFound();
  const calculator = getLaunchCalculator(values.locale, values.calculator);
  if (!calculator) notFound();
  const text = copy[values.locale];
  const url = absoluteUrl(localizedPath(values.locale, `/calculators/${calculator.key}`));
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <StructuredData data={{ "@context": "https://schema.org", "@type": "WebApplication", name: calculator.name, description: calculator.summary, url, applicationCategory: `${calculator.category}Application`, operatingSystem: "Any", browserRequirements: "Requires JavaScript", isAccessibleForFree: true, inLanguage: languageTags[values.locale], provider: { "@type": "Organization", name: siteName, url: absoluteUrl(localizedPath(values.locale)) } }} />
    <Link className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground" href={`${localizedPath(values.locale)}#calculators`}><ArrowLeft className="h-4 w-4" />{text.all}</Link>
    <div className="mb-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><Badge className="mb-3" variant="outline">{calculator.category}</Badge><h1 className="text-3xl font-bold sm:text-4xl">{calculator.name}</h1></div><Badge variant="secondary">{text.version} v{calculator.version}</Badge></div><p className="mt-4 max-w-xl text-muted-foreground">{calculator.summary}</p></div>
    <CalculatorForm anonymous calculator={calculator} copy={text} locale={values.locale} />
    <section className="mt-12 grid gap-6 border-t pt-10 md:grid-cols-2"><div><h2 className="text-2xl font-semibold">{text.about}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{calculator.summary}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{text.aboutDetail}</p></div><div><h2 className="text-2xl font-semibold">{text.needed}</h2><ul className="mt-3 space-y-3 text-sm text-muted-foreground">{calculator.fields.map(field => <li key={field.name}><span className="font-medium text-foreground">{field.label}</span>{field.description ? `: ${field.description}` : ` (${field.required ? text.required : text.optional})`}</li>)}</ul></div></section>
  </div>;
}
