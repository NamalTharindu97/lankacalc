import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { CalculatorForm } from "@/components/calculator-form";
import {
  getCalculator,
  getCalculatorMetadata,
  getCalculators,
} from "@/domain/calculators/registry";

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
  };
}

export default async function CalculatorPage({ params }: CalculatorPageProperties) {
  const { calculator: calculatorKey } = await params;
  const calculator = getCalculator(calculatorKey);

  if (!calculator) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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
    </div>
  );
}
