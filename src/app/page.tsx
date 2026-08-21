import { ArrowRight, ChevronDown, Eye, FileText, HelpCircle, Shield } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StructuredData } from "@/components/structured-data";
import { getCalculatorCategories } from "@/domain/calculators/categories";
import { getCalculators } from "@/domain/calculators/registry";
import { absoluteUrl, siteDescription, siteName } from "@/lib/site";

const principles = [
  {
    icon: Eye,
    title: "Inputs stay visible",
    description: "Results repeat the values and units used.",
  },
  {
    icon: FileText,
    title: "Workings are explained",
    description: "Intermediate values reveal how the total was formed.",
  },
  {
    icon: HelpCircle,
    title: "Assumptions are named",
    description: "Fees, rules, and exclusions are never silently implied.",
  },
  {
    icon: Shield,
    title: "Rules will be dated",
    description: "Regulated calculators will cite official sources and effective versions.",
  },
];

export default function HomePage() {
  const calculators = getCalculators();
  const categories = getCalculatorCategories();

  return (
    <>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteName,
          description: siteDescription,
          url: absoluteUrl("/"),
          inLanguage: "en",
        }}
      />
      <section className="relative overflow-hidden border-b">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.6fr_0.6fr] lg:items-end">
            <div>
              <Badge className="mb-6" variant="secondary">Sri Lankan decision tools</Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Useful numbers.
                <br />
                Visible workings.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Start with quick everyday calculations. Each result states what went in, how it was
                calculated, and what was left out.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <Button asChild>
                  <a href="#calculators">
                    Choose a calculator <ChevronDown className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <Card className="p-6">
              <Badge className="mb-3" variant="secondary">01</Badge>
              <h3 className="font-semibold">Foundation release</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Static tools run in your browser. Source-backed calculators use dated rules and
                show their provenance when those rules are published.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-b bg-muted/30" id="calculators">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Badge className="mb-4" variant="secondary">Available now</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Pick the question,
                <br />
                not the spreadsheet.
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {calculators.length.toString().padStart(2, "0")} calculators in this release
            </p>
          </div>

          <nav aria-label="Calculator categories" className="mb-8 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button asChild key={category.slug} size="sm" variant="outline">
                <Link href={`/categories/${category.slug}`}>
                  {category.name} ({category.calculators.length})
                </Link>
              </Button>
            ))}
          </nav>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {calculators.map((calculator, index) => (
              <Link
                className="group flex flex-col rounded-xl border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-md"
                href={`/calculators/${calculator.key}`}
                key={calculator.key}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <Badge className="mb-3 w-fit" variant="outline">
                  {calculator.category}
                </Badge>
                <h3 className="text-lg font-semibold">{calculator.shortName}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{calculator.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="principles">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge className="mb-4" variant="secondary">The standard</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              A result should
              <br />
              earn your trust.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((principle, index) => (
              <Card className="p-6" key={principle.title}>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <principle.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <Badge className="mb-3" variant="secondary">
                  {String(index + 1).padStart(2, "0")}
                </Badge>
                <h3 className="font-semibold">{principle.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{principle.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
