import {
  ageCalculator,
  areaCalculator,
  compoundInterestCalculator,
  fuelConsumptionCalculator,
  loanEmiCalculator,
  percentageCalculator,
} from "@/domain/calculators/static-calculators";
import type { CalculatorDefinition, CalculatorMetadata } from "@/domain/calculators/types";

const calculators = [
  ageCalculator,
  percentageCalculator,
  compoundInterestCalculator,
  areaCalculator,
  loanEmiCalculator,
  fuelConsumptionCalculator,
] satisfies CalculatorDefinition[];

const calculatorByKey = new Map(calculators.map((calculator) => [calculator.key, calculator]));

export function getCalculators(): CalculatorDefinition[] {
  return calculators;
}

export function getCalculator(key: string): CalculatorDefinition | undefined {
  return calculatorByKey.get(key);
}

export function getCalculatorMetadata(calculator: CalculatorDefinition): CalculatorMetadata {
  return {
    key: calculator.key,
    name: calculator.name,
    shortName: calculator.shortName,
    summary: calculator.summary,
    category: calculator.category,
    classification: calculator.classification,
    version: calculator.version,
    accent: calculator.accent,
    fields: calculator.fields,
  };
}
