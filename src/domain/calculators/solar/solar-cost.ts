import { z } from "zod";

import {
  cents,
  decimal,
  MoneyDecimal,
  nonnegativeCentStringSchema,
  nonnegativeDecimalStringSchema,
} from "@/domain/calculators/money";
import { decimalInput, integerInput, optionalDecimalInput, optionalIntegerInput } from "@/domain/calculators/input";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const solarLocationSchema = z.enum([
  "colombo",
  "galle",
  "kandy",
  "nuvara-eliya",
  "kurunegala",
  "anuradhapura",
  "hambantota",
  "jaffna",
]);

export const solarLocationAssumptionSchema = z
  .object({
    key: solarLocationSchema,
    label: z.string().min(1).max(200),
    yieldKwhPerKwPerDay: nonnegativeDecimalStringSchema,
  })
  .strict();

export const solarAssumptionsPayloadSchema = z
  .object({
    authority: z.literal("sea-solar-atlas-ceb-pucsl-market"),
    effectiveFrom: z.string().regex(dateOnlyPattern),
    rounding: z.literal("nearest-cent"),
    locations: z.array(solarLocationAssumptionSchema).min(1),
    defaultSystemCostPerKw: nonnegativeCentStringSchema,
    defaultSelfConsumptionPercent: nonnegativeDecimalStringSchema,
    defaultRetailRatePerKwh: nonnegativeCentStringSchema,
    defaultExportRatePerKwh: nonnegativeCentStringSchema,
    degradationPercentPerYear: nonnegativeDecimalStringSchema,
    systemLifeYears: z.number().int().min(1).max(30),
  })
  .strict()
  .superRefine((payload, context) => {
    const seen = new Set<string>();
    payload.locations.forEach((location, index) => {
      if (seen.has(location.key)) {
        context.addIssue({
          code: "custom",
          path: ["locations", index, "key"],
          message: "Location entries must have unique keys.",
        });
      }
      seen.add(location.key);
    });
  });

export const solarCostInputSchema = z
  .object({
    asOfDate: z.string().regex(dateOnlyPattern),
    systemSizeKw: decimalInput({
      positive: true,
      min: 0.5,
      max: 50,
      maxDecimalPlaces: 1,
    }),
    location: solarLocationSchema,
    averageMonthlyConsumptionKwh: integerInput({ min: 1, max: 5_000 }),
    systemCostPerKwOverride: optionalIntegerInput({ min: 1, max: 2_000_000 }),
    retailRatePerKwhOverride: optionalDecimalInput({
      positive: true,
      min: 0.01,
      max: 500,
      maxDecimalPlaces: 2,
    }),
    exportRatePerKwhOverride: optionalDecimalInput({ min: 0, max: 500, maxDecimalPlaces: 2 }),
    loanTermYears: optionalIntegerInput({ min: 1, max: 15 }),
    loanAnnualRatePercent: optionalDecimalInput({ min: 0, max: 50, maxDecimalPlaces: 2 }),
  })
  .strict()
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

export type SolarCostInput = z.infer<typeof solarCostInputSchema>;
export type SolarAssumptionsPayload = z.infer<typeof solarAssumptionsPayloadSchema>;

export type SolarCostResult = {
  locationLabel: string;
  yieldKwhPerKwPerDay: string;
  annualYieldKwhPerKw: string;
  annualGenerationKwh: string;
  monthlyGenerationKwh: string;
  finalYearGenerationKwh: string;
  systemSizeKw: string;
  officialSystemCostPerKw: string;
  systemCostPerKw: string;
  systemCostPerKwSource: "official" | "user";
  systemCost: string;
  annualConsumptionKwh: string;
  selfConsumedKwh: string;
  exportedKwh: string;
  importedKwh: string;
  officialRetailRatePerKwh: string;
  retailRatePerKwh: string;
  retailRateSource: "official" | "user";
  officialExportRatePerKwh: string;
  exportRatePerKwh: string;
  exportRateSource: "official" | "user";
  annualSavingLkr: string;
  monthlySavingLkr: string;
  simplePaybackYears: string;
  twentyYearSavingLkr: string;
  loanAmountLkr?: string;
  loanMonthlyPaymentLkr?: string;
  loanTotalPaymentLkr?: string;
  loanTotalInterestLkr?: string;
  monthlyCashFlowLkr?: string;
};

function nearestCent(value: InstanceType<typeof MoneyDecimal>): string {
  return value.toDecimalPlaces(2, MoneyDecimal.ROUND_HALF_UP).toFixed(2);
}

function twoDecimals(value: InstanceType<typeof MoneyDecimal>): string {
  return value.toDecimalPlaces(2, MoneyDecimal.ROUND_HALF_UP).toString();
}

export function calculateSolarCost(
  input: SolarCostInput,
  payload: SolarAssumptionsPayload,
): SolarCostResult {
  const parsedInput = solarCostInputSchema.parse(input);
  const parsedPayload = solarAssumptionsPayloadSchema.parse(payload);

  const locationRow = parsedPayload.locations.find(
    (location) => location.key === parsedInput.location,
  );
  if (locationRow === undefined) {
    throw new RangeError("No generation assumption is defined for the selected location.");
  }

  const dailyYield = decimal(locationRow.yieldKwhPerKwPerDay);
  const annualYield = dailyYield.mul(365);
  const systemSize = decimal(parsedInput.systemSizeKw);
  const annualGeneration = systemSize.mul(annualYield);
  const monthlyGeneration = annualGeneration.div(12);

  const degradation = decimal(parsedPayload.degradationPercentPerYear).div(100);
  const lifeYears = parsedPayload.systemLifeYears;
  const finalYearGeneration = annualGeneration.mul(decimal(1).sub(degradation).toPower(lifeYears - 1));

  const officialSystemCostPerKw = decimal(parsedPayload.defaultSystemCostPerKw);
  const usedSystemCostPerKw =
    parsedInput.systemCostPerKwOverride !== undefined
      ? decimal(parsedInput.systemCostPerKwOverride)
      : officialSystemCostPerKw;
  const systemCost = systemSize.mul(usedSystemCostPerKw);

  const annualConsumption = decimal(parsedInput.averageMonthlyConsumptionKwh).mul(12);
  const selfConsumptionRatio = decimal(parsedPayload.defaultSelfConsumptionPercent).div(100);
  const selfConsumed = MoneyDecimal.min(annualGeneration.mul(selfConsumptionRatio), annualConsumption);
  const exported = annualGeneration.sub(selfConsumed);
  const imported = annualConsumption.sub(selfConsumed);

  const officialRetailRate = decimal(parsedPayload.defaultRetailRatePerKwh);
  const usedRetailRate =
    parsedInput.retailRatePerKwhOverride !== undefined
      ? decimal(parsedInput.retailRatePerKwhOverride)
      : officialRetailRate;
  const officialExportRate = decimal(parsedPayload.defaultExportRatePerKwh);
  const usedExportRate =
    parsedInput.exportRatePerKwhOverride !== undefined
      ? decimal(parsedInput.exportRatePerKwhOverride)
      : officialExportRate;

  const annualSaving = selfConsumed.mul(usedRetailRate).add(exported.mul(usedExportRate));
  const monthlySaving = annualSaving.div(12);

  let twentyYearSaving = new MoneyDecimal(0);
  for (let year = 1; year <= lifeYears; year += 1) {
    const generationYear = annualGeneration.mul(decimal(1).sub(degradation).toPower(year - 1));
    const selfConsumedYear = MoneyDecimal.min(
      generationYear.mul(selfConsumptionRatio),
      annualConsumption,
    );
    const exportedYear = generationYear.sub(selfConsumedYear);
    twentyYearSaving = twentyYearSaving
      .add(selfConsumedYear.mul(usedRetailRate))
      .add(exportedYear.mul(usedExportRate));
  }

  const simplePaybackYears =
    annualSaving.greaterThan(0) ? systemCost.div(annualSaving) : null;

  const result: SolarCostResult = {
    locationLabel: locationRow.label,
    yieldKwhPerKwPerDay: twoDecimals(dailyYield),
    annualYieldKwhPerKw: twoDecimals(annualYield),
    annualGenerationKwh: twoDecimals(annualGeneration),
    monthlyGenerationKwh: twoDecimals(monthlyGeneration),
    finalYearGenerationKwh: twoDecimals(finalYearGeneration),
    systemSizeKw: parsedInput.systemSizeKw,
    officialSystemCostPerKw: cents(officialSystemCostPerKw),
    systemCostPerKw: cents(usedSystemCostPerKw),
    systemCostPerKwSource:
      parsedInput.systemCostPerKwOverride !== undefined ? "user" : "official",
    systemCost: cents(systemCost),
    annualConsumptionKwh: annualConsumption.toFixed(0),
    selfConsumedKwh: twoDecimals(selfConsumed),
    exportedKwh: twoDecimals(exported),
    importedKwh: twoDecimals(imported),
    officialRetailRatePerKwh: cents(officialRetailRate),
    retailRatePerKwh: cents(usedRetailRate),
    retailRateSource: parsedInput.retailRatePerKwhOverride !== undefined ? "user" : "official",
    officialExportRatePerKwh: cents(officialExportRate),
    exportRatePerKwh: cents(usedExportRate),
    exportRateSource: parsedInput.exportRatePerKwhOverride !== undefined ? "user" : "official",
    annualSavingLkr: cents(annualSaving),
    monthlySavingLkr: cents(monthlySaving),
    simplePaybackYears:
      simplePaybackYears === null ? "n/a" : twoDecimals(simplePaybackYears),
    twentyYearSavingLkr: cents(twentyYearSaving),
  };

  if (parsedInput.loanTermYears !== undefined && parsedInput.loanAnnualRatePercent !== undefined) {
    const termMonths = parsedInput.loanTermYears * 12;
    const monthlyRate = decimal(parsedInput.loanAnnualRatePercent).div(100).div(12);
    const monthlyPayment =
      monthlyRate.greaterThan(0)
        ? systemCost
            .mul(monthlyRate)
            .mul(decimal(1).add(monthlyRate).toPower(termMonths))
            .div(decimal(1).add(monthlyRate).toPower(termMonths).sub(1))
        : systemCost.div(termMonths);
    const monthlyPaymentCents = nearestCent(monthlyPayment);
    const totalPayment = decimal(monthlyPaymentCents).mul(termMonths);
    const totalInterest = totalPayment.sub(systemCost);
    const monthlyCashFlow = monthlySaving.sub(decimal(monthlyPaymentCents));

    result.loanAmountLkr = cents(systemCost);
    result.loanMonthlyPaymentLkr = monthlyPaymentCents;
    result.loanTotalPaymentLkr = cents(totalPayment);
    result.loanTotalInterestLkr = cents(totalInterest);
    result.monthlyCashFlowLkr = cents(monthlyCashFlow);
  }

  return result;
}
