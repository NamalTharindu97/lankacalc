import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { CalculatorForm } from "@/components/calculator-form";
import { StructuredData } from "@/components/structured-data";
import {
  getCalculator,
  getCalculatorMetadata,
  getCalculators,
} from "@/domain/calculators/registry";
import { absoluteUrl, siteName } from "@/lib/site";

type CalculatorPageProperties = {
  params: Promise<{ calculator: string }>;
};

export function generateStaticParams() {
  return getCalculators().map((calculator) => ({ calculator: calculator.key }));
}

export async function generateMetadata({ params }: CalculatorPageProperties): Promise<Metadata> {
  const { calculator: calculatorKey } = await params;
  const calculator = getCalculator(calculatorKey);

  if (!calculator) {
    return { title: "Calculator not found" };
  }

  return {
    title: calculator.name,
    description: calculator.summary,
    alternates: { canonical: `/calculators/${calculator.key}` },
    openGraph: {
      type: "website",
      locale: "en_LK",
      siteName,
      title: calculator.name,
      description: calculator.summary,
      url: `/calculators/${calculator.key}`,
    },
    twitter: {
      card: "summary",
      title: calculator.name,
      description: calculator.summary,
    },
  };
}

export default async function CalculatorPage({ params }: CalculatorPageProperties) {
  const { calculator: calculatorKey } = await params;
  const calculator = getCalculator(calculatorKey);

  if (!calculator) {
    notFound();
  }

  const calculatorUrl = absoluteUrl(`/calculators/${calculator.key}`);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: calculator.name,
            description: calculator.summary,
            url: calculatorUrl,
            applicationCategory: `${calculator.category}Application`,
            operatingSystem: "Any",
            browserRequirements: "Requires JavaScript for interactive calculation",
            isAccessibleForFree: true,
            inLanguage: "en",
            provider: {
              "@type": "Organization",
              name: siteName,
              url: absoluteUrl("/"),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Calculators",
                item: absoluteUrl("/#calculators"),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: calculator.name,
                item: calculatorUrl,
              },
            ],
          },
        ]}
      />
      <Link
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        href="/#calculators"
      >
        <ArrowLeft className="h-4 w-4" />
        All calculators
      </Link>

      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="mb-3" variant="outline">
              {calculator.category} / {calculator.classification}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{calculator.name}</h1>
          </div>
          <Badge variant="secondary">Calculation v{calculator.version}</Badge>
        </div>
        <p className="mt-4 max-w-xl text-muted-foreground">{calculator.summary}</p>
      </div>

      <CalculatorForm calculator={getCalculatorMetadata(calculator)} />

      <section aria-labelledby="about-calculator" className="mt-12 grid gap-6 border-t pt-10 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight" id="about-calculator">
            About this calculator
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{calculator.summary}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Results include the normalized inputs, calculation breakdown, assumptions, and warnings
            used for the estimate. Server-authoritative results also identify their published rule
            versions and sources.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Information you will need</h2>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
            {calculator.fields.map((field) => (
              <li key={field.name}>
                <span className="font-medium text-foreground">{field.label}</span>
                {field.description ? `: ${field.description}` : field.required ? " (required)" : " (optional)"}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
