import {
  ageCalculator,
  areaCalculator,
  compoundInterestCalculator,
  fuelConsumptionCalculator,
  loanAffordabilityCalculator,
  loanEmiCalculator,
  percentageCalculator,
} from "@/domain/calculators/static-calculators";
import {
  apitCalculator,
  epfCalculator,
  etfCalculator,
  gratuityCalculator,
  jobOfferCalculator,
  netToGrossCalculator,
  overtimeCalculator,
  salaryCalculator,
  salaryIncrementCalculator,
  takeHomeCalculator,
} from "@/domain/calculators/employment-calculators";
import {
  brickBlockCalculator,
  concreteCalculator,
  paintCalculator,
  roofMaterialCalculator,
  steelCalculator,
  tileQuantityCalculator,
} from "@/domain/calculators/construction-calculators";
import {
  leaseCalculator,
  loanScheduleCalculator,
} from "@/domain/calculators/lending-calculators";
import { electricityBillCalculator } from "@/domain/calculators/electricity-calculators";
import { vehicleImportDutyCalculator } from "@/domain/calculators/vehicle-import-calculators";
import type { CalculatorDefinition, CalculatorMetadata } from "@/domain/calculators/types";

const calculators = [
  ageCalculator,
  percentageCalculator,
  compoundInterestCalculator,
  areaCalculator,
  tileQuantityCalculator,
  paintCalculator,
  concreteCalculator,
  brickBlockCalculator,
  steelCalculator,
  roofMaterialCalculator,
  loanEmiCalculator,
  loanAffordabilityCalculator,
  loanScheduleCalculator,
  leaseCalculator,
  fuelConsumptionCalculator,
  apitCalculator,
  epfCalculator,
  etfCalculator,
  salaryCalculator,
  takeHomeCalculator,
  netToGrossCalculator,
  gratuityCalculator,
  overtimeCalculator,
  salaryIncrementCalculator,
  jobOfferCalculator,
  electricityBillCalculator,
  vehicleImportDutyCalculator,
] satisfies CalculatorDefinition[];

export function createCalculatorRegistry(definitions: CalculatorDefinition[]) {
  const registry = new Map<string, CalculatorDefinition>();

  for (const definition of definitions) {
    if (registry.has(definition.key)) {
      throw new Error(`Duplicate calculator key '${definition.key}'.`);
    }
    registry.set(definition.key, definition);
  }

  return registry;
}

const calculatorByKey = createCalculatorRegistry(calculators);

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
