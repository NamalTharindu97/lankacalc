import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
    <section className={`calculator-page accent-${calculator.accent}`}>
      <div className="calculator-page-header">
        <Link className="back-link" href="/#calculators">&lt;- All calculators</Link>
        <div className="calculator-title-row">
          <div>
            <p className="eyebrow">{calculator.category} / {calculator.classification}</p>
            <h1>{calculator.name}</h1>
          </div>
          <span className="version-chip">Calculation v{calculator.version}</span>
        </div>
        <p className="calculator-summary">{calculator.summary}</p>
      </div>

      <CalculatorForm calculator={getCalculatorMetadata(calculator)} />
    </section>
  );
}
