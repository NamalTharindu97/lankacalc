import { z } from "zod";

import {
  calculateSolarCost,
  solarAssumptionsPayloadSchema,
  solarLocationSchema,
} from "@/domain/calculators/solar/solar-cost";
import { decimalInput, integerInput, optionalDecimalInput, optionalIntegerInput } from "@/domain/calculators/input";
import {
  defineRegulatedCalculator,
  type CalculationResult,
  type CalculatorMetadata,
  type RuleDependency,
} from "@/domain/calculators/types";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const asOfDateSchema = z.string().regex(dateOnlyPattern, "Enter a valid calculation date.").refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid calculation date.");

const solarAssumptionsRule: RuleDependency = {
  name: "solarAssumptions",
  key: "solar-assumptions-lk-2026",
  scope: "lk",
};

const locationOptions = [
  { label: "Select the location", value: "" },
  { label: "Colombo", value: "colombo" },
  { label: "Galle", value: "galle" },
  { label: "Kandy", value: "kandy" },
  { label: "Nuwara Eliya", value: "nuvara-eliya" },
  { label: "Kurunegala", value: "kurunegala" },
  { label: "Anuradhapura", value: "anuradhapura" },
  { label: "Hambantota", value: "hambantota" },
  { label: "Jaffna", value: "jaffna" },
];

const solarCostMetadata = {
  key: "solar-cost",
  name: "Solar cost calculator",
  shortName: "Solar cost",
  summary: "Estimate rooftop solar generation, system cost, savings, financing, and payback.",
  category: "Solar",
  classification: "configurable",
  version: "1.0.0",
  accent: "gold",
  fields: [
    { name: "asOfDate", label: "Calculation date", type: "date", required: true, min: "2026-07-01", max: "9999-12-31" },
    { name: "systemSizeKw", label: "System size", type: "number", required: true, min: 0.5, max: 50, maxDecimalPlaces: 1, step: 0.1, suffix: "kW", description: "DC panel capacity of the rooftop system." },
    { name: "location", label: "Location", type: "select", required: true, options: locationOptions, description: "District used for the typical yearly generation estimate." },
    { name: "averageMonthlyConsumptionKwh", label: "Average monthly usage", type: "number", required: true, min: 1, max: 5_000, maxDecimalPlaces: 0, step: 1, suffix: "kWh", description: "Your average grid electricity usage per month." },
    { name: "systemCostPerKwOverride", label: "System cost per kW (optional)", type: "number", required: false, min: 1, max: 2_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR/kW", description: "Turnkey grid-tied price per kW of capacity. Leave blank to use the default assumption." },
    { name: "retailRatePerKwhOverride", label: "Retail rate (optional)", type: "number", required: false, min: 0.01, max: 500, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR/kWh", description: "Average rate you pay per grid unit. Leave blank to use the default assumption." },
    { name: "exportRatePerKwhOverride", label: "Export rate (optional)", type: "number", required: false, min: 0, max: 500, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR/kWh", description: "Credit per unit exported under net accounting. Leave blank to use the default assumption." },
    { name: "loanTermYears", label: "Loan term (optional)", type: "number", required: false, min: 1, max: 15, maxDecimalPlaces: 0, step: 1, suffix: "years", description: "Leave blank for a cash purchase." },
    { name: "loanAnnualRatePercent", label: "Loan annual rate (optional)", type: "number", required: false, min: 0, max: 50, maxDecimalPlaces: 2, step: 0.01, suffix: "%/yr", description: "Annual interest rate on the financing for the system cost." },
  ],
} satisfies CalculatorMetadata;

const solarCostDefinitionSchema = z
  .object({
    asOfDate: asOfDateSchema,
    systemSizeKw: decimalInput({ positive: true, min: 0.5, max: 50, maxDecimalPlaces: 1 }),
    location: solarLocationSchema,
    averageMonthlyConsumptionKwh: integerInput({ min: 1, max: 5_000 }),
    systemCostPerKwOverride: optionalIntegerInput({ min: 1, max: 2_000_000 }),
    retailRatePerKwhOverride: optionalDecimalInput({ positive: true, min: 0.01, max: 500, maxDecimalPlaces: 2 }),
    exportRatePerKwhOverride: optionalDecimalInput({ min: 0, max: 500, maxDecimalPlaces: 2 }),
    loanTermYears: optionalIntegerInput({ min: 1, max: 15 }),
    loanAnnualRatePercent: optionalDecimalInput({ min: 0, max: 50, maxDecimalPlaces: 2 }),
  })
  .superRefine((input, context) => {
    const hasTerm = input.loanTermYears !== undefined;
    const hasRate = input.loanAnnualRatePercent !== undefined;
    if (hasTerm !== hasRate) {
      context.addIssue({
        code: "custom",
        path: hasTerm ? ["loanAnnualRatePercent"] : ["loanTermYears"],
        message: "Enter both a loan term and an annual interest rate to model financing.",
      });
    }
  });

function baseResult(
  metadata: Pick<CalculatorMetadata, "key" | "version">,
  values: Omit<CalculationResult, "calculator" | "calculationVersion" | "ruleVersions" | "sources" | "verifiedAt">,
): CalculationResult {
  return {
    calculator: metadata.key,
    calculationVersion: metadata.version,
    ruleVersions: [],
    sources: [],
    verifiedAt: null,
    ...values,
  };
}

export const solarCostCalculator = defineRegulatedCalculator({
  ...solarCostMetadata,
  schema: solarCostDefinitionSchema,
  ruleDependencies: [solarAssumptionsRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const payload = solarAssumptionsPayloadSchema.parse(payloads.solarAssumptions);
    const calculation = calculateSolarCost(input, payload);

    const systemCostLine =
      calculation.systemCostPerKwSource === "user"
        ? `Custom cost LKR ${calculation.systemCostPerKw} per kW (official default was LKR ${calculation.officialSystemCostPerKw})`
        : `Official default LKR ${calculation.systemCostPerKw} per kW`;
    const retailLine =
      calculation.retailRateSource === "user"
        ? `Custom retail rate LKR ${calculation.retailRatePerKwh} (official default was LKR ${calculation.officialRetailRatePerKwh})`
        : `Official default retail rate LKR ${calculation.retailRatePerKwh}`;
    const exportLine =
      calculation.exportRateSource === "user"
        ? `Custom export rate LKR ${calculation.exportRatePerKwh} (official default was LKR ${calculation.officialExportRatePerKwh})`
        : `Official default export rate LKR ${calculation.exportRatePerKwh}`;

    const breakdown = [
      { label: "Location", value: calculation.locationLabel },
      { label: "System size", value: calculation.systemSizeKw, unit: "kW" },
      { label: "Annual yield", value: calculation.annualYieldKwhPerKw, unit: "kWh/kWp", expression: `${calculation.yieldKwhPerKwPerDay} kWh/kWp/day × 365 days` },
      { label: "Annual generation (year 1)", value: calculation.annualGenerationKwh, unit: "kWh", expression: `${calculation.systemSizeKw} kW × ${calculation.annualYieldKwhPerKw} kWh/kWp` },
      { label: "Monthly generation", value: calculation.monthlyGenerationKwh, unit: "kWh", expression: `${calculation.annualGenerationKwh} kWh ÷ 12` },
      { label: "Final-year generation", value: calculation.finalYearGenerationKwh, unit: "kWh", expression: `after ${payload.systemLifeYears} years at ${payload.degradationPercentPerYear}% degradation per year` },
      { label: "System cost per kW", value: calculation.systemCostPerKw, unit: "LKR/kW", expression: systemCostLine },
      { label: "System cost", value: calculation.systemCost, unit: "LKR", expression: `${calculation.systemSizeKw} kW × LKR ${calculation.systemCostPerKw}` },
      { label: "Annual consumption", value: calculation.annualConsumptionKwh, unit: "kWh", expression: `${input.averageMonthlyConsumptionKwh} kWh × 12 months` },
      { label: "Self-consumed", value: calculation.selfConsumedKwh, unit: "kWh", expression: `min(${calculation.annualGenerationKwh} × ${payload.defaultSelfConsumptionPercent}%, ${calculation.annualConsumptionKwh})` },
      { label: "Exported", value: calculation.exportedKwh, unit: "kWh", expression: `${calculation.annualGenerationKwh} − ${calculation.selfConsumedKwh}` },
      { label: "Imported", value: calculation.importedKwh, unit: "kWh", expression: `${calculation.annualConsumptionKwh} − ${calculation.selfConsumedKwh}` },
      { label: "Retail rate", value: calculation.retailRatePerKwh, unit: "LKR/kWh", expression: retailLine },
      { label: "Export rate", value: calculation.exportRatePerKwh, unit: "LKR/kWh", expression: exportLine },
      { label: "Annual saving (year 1)", value: calculation.annualSavingLkr, unit: "LKR", expression: `${calculation.selfConsumedKwh} × LKR ${calculation.retailRatePerKwh} + ${calculation.exportedKwh} × LKR ${calculation.exportRatePerKwh}` },
      { label: "Monthly saving", value: calculation.monthlySavingLkr, unit: "LKR", expression: `${calculation.annualSavingLkr} ÷ 12` },
      { label: "Simple payback", value: calculation.simplePaybackYears, unit: "years", expression: calculation.simplePaybackYears === "n/a" ? "No year-1 saving" : `${calculation.systemCost} ÷ ${calculation.annualSavingLkr}` },
      { label: "20-year saving", value: calculation.twentyYearSavingLkr, unit: "LKR", expression: `including degradation over ${payload.systemLifeYears} years` },
    ];

    if (calculation.loanMonthlyPaymentLkr !== undefined && input.loanTermYears !== undefined) {
      breakdown.push(
        { label: "Loan monthly payment", value: calculation.loanMonthlyPaymentLkr, unit: "LKR", expression: `${input.loanTermYears} years at ${input.loanAnnualRatePercent}% a year` },
        { label: "Monthly cash flow", value: calculation.monthlyCashFlowLkr ?? "0.00", unit: "LKR", expression: `${calculation.monthlySavingLkr} − ${calculation.loanMonthlyPaymentLkr}` },
      );
    }

    return baseResult(solarCostMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: calculation,
      breakdown,
      assumptions: [
        "Generation uses the district typical yield for optimally tilted fixed panels; actual output depends on roof orientation, tilt, shading, and inverter performance.",
        `Residential self-consumption defaults to ${payload.defaultSelfConsumptionPercent}% of generation, the Sustainable Energy Authority reference for a daytime load profile.`,
        "The model follows net accounting: exported units are credited at the export rate and imported units are billed at the retail rate.",
        `Panels degrade ${payload.degradationPercentPerYear}% per year and the horizon is ${payload.systemLifeYears} years.`,
        `Turnkey grid-tied system costs default to LKR ${payload.defaultSystemCostPerKw} per kW; quotes vary with panel and inverter brand, roof work, and installer.`,
      ],
      warnings: [
        "These are estimates, not quotes or technical designs; confirm sizing and cost with at least two installers.",
        "Electricity tariffs are revised by the regulator; verify the current retail and export rates.",
        "This models the net accounting scheme; net metering and net plus settle surplus differently.",
        "The analysis assumes today's tariffs stay constant and does not model maintenance, insurance, or repairs.",
        "Year-1 savings and simple payback use the first-year generation before degradation.",
      ],
    });
  },
});
