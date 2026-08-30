import { z } from "zod";

import {
  calculateFuelCost,
  fuelPumpPricePayloadSchema,
  fuelTypeSchema,
} from "@/domain/calculators/fuel/fuel-cost";
import { decimalInput, integerInput, optionalDecimalInput } from "@/domain/calculators/input";
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

const fuelPumpPricesRule: RuleDependency = {
  name: "fuelPumpPrices",
  key: "fuel-pump-prices-cpc-2026",
  scope: "lk",
};

const fuelTypeOptions = [
  { label: "Select the fuel type", value: "" },
  { label: "Lanka Petrol 92 Octane", value: "petrol-92" },
  { label: "Lanka Petrol 95 Octane Euro 4", value: "petrol-95" },
  { label: "Lanka Auto Diesel", value: "auto-diesel" },
  { label: "Lanka Super Diesel 4 Star Euro 4", value: "super-diesel" },
];

const fuelCostMetadata = {
  key: "fuel-cost",
  name: "Fuel cost calculator",
  shortName: "Fuel cost",
  summary: "Estimate trip and monthly fuel costs from distance, efficiency, and dated official pump prices.",
  category: "Fuel",
  classification: "configurable",
  version: "1.0.0",
  accent: "orange",
  fields: [
    { name: "asOfDate", label: "Calculation date", type: "date", required: true, min: "2026-06-30", max: "9999-12-31" },
    { name: "fuelType", label: "Fuel type", type: "select", required: true, options: fuelTypeOptions },
    { name: "distancePerTripKm", label: "Distance per trip", type: "number", required: true, min: 0.01, max: 10_000, maxDecimalPlaces: 2, step: 0.01, suffix: "km" },
    { name: "tripsPerMonth", label: "Trips per month", type: "number", required: true, min: 1, max: 500, maxDecimalPlaces: 0, step: 1, suffix: "trips", defaultValue: 1 },
    { name: "fuelEfficiency", label: "Fuel efficiency", type: "number", required: true, min: 0.1, max: 100, maxDecimalPlaces: 2, step: 0.01, suffix: "km/L", description: "Average distance per litre for this vehicle." },
    { name: "pricePerLitreOverride", label: "Custom price per litre (optional)", type: "number", required: false, min: 0.01, max: 10_000, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR", description: "Leave blank to use the official price for the calculation date." },
  ],
} satisfies CalculatorMetadata;

const fuelCostDefinitionSchema = z
  .object({
    asOfDate: asOfDateSchema,
    fuelType: fuelTypeSchema,
    distancePerTripKm: decimalInput({ positive: true, min: 0.01, max: 10_000, maxDecimalPlaces: 2 }),
    tripsPerMonth: integerInput({ min: 1, max: 500 }),
    fuelEfficiency: decimalInput({ positive: true, min: 0.1, max: 100, maxDecimalPlaces: 2 }),
    pricePerLitreOverride: optionalDecimalInput({ positive: true, min: 0.01, max: 10_000, maxDecimalPlaces: 2 }),
  })
  .strict();

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

export const fuelCostCalculator = defineRegulatedCalculator({
  ...fuelCostMetadata,
  schema: fuelCostDefinitionSchema,
  ruleDependencies: [fuelPumpPricesRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const payload = fuelPumpPricePayloadSchema.parse(payloads.fuelPumpPrices);
    const calculation = calculateFuelCost(input, payload);
    const priceLine =
      calculation.priceSource === "user"
        ? `Custom price LKR ${calculation.pricePerLitre} per litre (official default was LKR ${calculation.officialPricePerLitre})`
        : `Official price LKR ${calculation.pricePerLitre} per litre`;

    return baseResult(fuelCostMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: {
        fuelType: calculation.fuelType,
        fuelTypeLabel: calculation.fuelTypeLabel,
        priceSource: calculation.priceSource,
        officialPricePerLitre: calculation.officialPricePerLitre,
        pricePerLitre: calculation.pricePerLitre,
        litresPerTrip: calculation.litresPerTrip,
        litresPerMonth: calculation.litresPerMonth,
        costPerTrip: calculation.costPerTrip,
        costPerMonth: calculation.costPerMonth,
        costPerYear: calculation.costPerYear,
        costPerHundredKm: calculation.costPerHundredKm,
      },
      breakdown: [
        { label: "Trip distance", value: input.distancePerTripKm, unit: "km" },
        { label: "Fuel efficiency", value: input.fuelEfficiency, unit: "km/L" },
        { label: "Litres per trip", value: calculation.litresPerTrip, unit: "L", expression: `${input.distancePerTripKm} km ÷ ${input.fuelEfficiency} km/L` },
        { label: "Litres per month", value: calculation.litresPerMonth, unit: "L", expression: `${calculation.litresPerTrip} L × ${input.tripsPerMonth} trips` },
        { label: "Price per litre", value: calculation.pricePerLitre, unit: "LKR", expression: priceLine },
        { label: "Cost per trip", value: calculation.costPerTrip, unit: "LKR" },
        { label: "Cost per month", value: calculation.costPerMonth, unit: "LKR" },
        { label: "Cost per year", value: calculation.costPerYear, unit: "LKR" },
        { label: "Cost per 100 km", value: calculation.costPerHundredKm, unit: "LKR", expression: `100 km ÷ ${input.fuelEfficiency} km/L × LKR ${calculation.pricePerLitre}` },
      ],
      assumptions: [
        "Monthly distance is the distance per trip multiplied by the number of trips per month.",
        "The entered efficiency is the average consumption for this vehicle; consumption is not estimated.",
        "Costs use the custom price when one is entered, otherwise the official Ceypetco retail price for the calculation date.",
      ],
      warnings: [
        "Fuel prices are revised periodically by the Ministry of Energy; the official price list remains authoritative for the entry date.",
        "Actual pump prices may vary by station and brand.",
        "This is an estimate, not a bill, invoice, or fuel-price decision.",
      ],
    });
  },
});
