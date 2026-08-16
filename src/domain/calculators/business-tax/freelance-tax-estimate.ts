import { z } from "zod";

import { decimal, MoneyDecimal, nonnegativeDecimalStringSchema } from "@/domain/calculators/money";
import { integerInput, optionalIntegerInput } from "@/domain/calculators/input";
import {
  individualBands,
  type TaxBandContribution,
} from "@/domain/calculators/business-tax/business-income-tax";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const wholeRupeePattern = /^(?:0|[1-9]\d*)$/;

export const wholeRupeeSchema = z
  .string()
  .regex(wholeRupeePattern, "Expected a whole number of rupees.");

const rateBandSchema = z
  .object({
    upTo: wholeRupeeSchema.nullable(),
    ratePercent: nonnegativeDecimalStringSchema,
  })
  .strict();

export const freelanceTaxEstimatePayloadSchema = z
  .object({
    authority: z.literal("ird-income-tax-2025"),
    effectiveFrom: z.string().regex(dateOnlyPattern),
    yearOfAssessment: z.string().regex(/^\d{4}\/\d{2}$/),
    rounding: z.literal("nearest-rupee"),
    personalRelief: wholeRupeeSchema,
    individualBrackets: z.array(rateBandSchema).min(2),
    foreignCurrencyRemittedCapPercent: nonnegativeDecimalStringSchema,
  })
  .strict()
  .superRefine((payload, context) => {
    let previousUpper = decimal(0);
    payload.individualBrackets.forEach((band, index) => {
      if (band.upTo === null) {
        if (index !== payload.individualBrackets.length - 1) {
          context.addIssue({
            code: "custom",
            path: ["individualBrackets", index, "upTo"],
            message: "Only the final bracket may be unbounded.",
          });
        }
        return;
      }
      const upper = decimal(band.upTo);
      if (upper.lessThanOrEqualTo(previousUpper)) {
        context.addIssue({
          code: "custom",
          path: ["individualBrackets", index, "upTo"],
          message: "Bracket upper bounds must be strictly ascending.",
        });
      }
      previousUpper = upper;
    });
  });

export const freelanceTaxEstimateInputSchema = z
  .object({
    asOfDate: z.string().regex(dateOnlyPattern),
    businessIncome: integerInput({ min: 0, max: 10_000_000_000 }),
    allowableExpenses: integerInput({ min: 0, max: 10_000_000_000 }),
    capitalAllowances: optionalIntegerInput({ min: 0, max: 10_000_000_000 }),
    personalReliefOverride: optionalIntegerInput({ min: 0, max: 10_000_000_000 }),
    foreignIncomeAmount: optionalIntegerInput({ min: 0, max: 10_000_000_000 }),
    foreignTaxPaid: optionalIntegerInput({ min: 0, max: 10_000_000_000 }),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.foreignTaxPaid !== undefined && input.foreignIncomeAmount === undefined) {
      context.addIssue({
        code: "custom",
        path: ["foreignTaxPaid"],
        message: "Foreign tax paid requires the foreign-currency-remitted income to be entered.",
      });
    }
    if (
      input.foreignIncomeAmount !== undefined &&
      input.foreignIncomeAmount > input.businessIncome
    ) {
      context.addIssue({
        code: "custom",
        path: ["foreignIncomeAmount"],
        message: "The foreign-currency-remitted income cannot exceed the total business income.",
      });
    }
  });

export type FreelanceTaxEstimateInput = z.infer<typeof freelanceTaxEstimateInputSchema>;
export type FreelanceTaxEstimatePayload = z.infer<typeof freelanceTaxEstimatePayloadSchema>;

export type FreelanceTaxEstimateResult = {
  yearOfAssessment: string;
  taxpayerCategoryLabel: string;
  businessIncome: string;
  allowableExpenses: string;
  capitalAllowances: string;
  totalDeductions: string;
  taxableIncomeBeforeRelief: string;
  personalRelief: string;
  personalReliefSource: "official" | "user";
  taxableIncome: string;
  foreignIncomePortion: string;
  domesticPortion: string;
  capPercent: string;
  domesticBands: TaxBandContribution[];
  foreignTaxNormal: string;
  foreignTaxCapped: string;
  capApplied: boolean;
  unroundedTax: string;
  foreignTaxCredit: string;
  creditApplied: boolean;
  incomeTax: string;
  effectiveRatePercent: string;
};

type Money = InstanceType<typeof MoneyDecimal>;

function money(value: Money): string {
  return value.toFixed(2);
}

function roundToNearestRupee(value: Money): Money {
  return value.toDecimalPlaces(0, MoneyDecimal.ROUND_HALF_UP);
}

export function calculateFreelanceTaxEstimate(
  input: FreelanceTaxEstimateInput,
  payload: FreelanceTaxEstimatePayload,
): FreelanceTaxEstimateResult {
  const parsedInput = freelanceTaxEstimateInputSchema.parse(input);
  const parsedPayload = freelanceTaxEstimatePayloadSchema.parse(payload);

  const businessIncome = decimal(parsedInput.businessIncome);
  const allowableExpenses = decimal(parsedInput.allowableExpenses);
  const capitalAllowances = decimal(parsedInput.capitalAllowances ?? 0);
  const totalDeductions = allowableExpenses.add(capitalAllowances);
  const taxableBeforeRelief = MoneyDecimal.max(businessIncome.sub(totalDeductions), decimal(0));

  const personalRelief =
    parsedInput.personalReliefOverride !== undefined
      ? decimal(parsedInput.personalReliefOverride)
      : decimal(parsedPayload.personalRelief);
  const personalReliefSource =
    parsedInput.personalReliefOverride !== undefined ? "user" : "official";
  const taxableIncome = MoneyDecimal.max(taxableBeforeRelief.sub(personalRelief), decimal(0));

  const foreignPortion =
    parsedInput.foreignIncomeAmount !== undefined
      ? MoneyDecimal.min(decimal(parsedInput.foreignIncomeAmount), taxableIncome)
      : decimal(0);
  const domesticPortion = taxableIncome.sub(foreignPortion);

  const allBands = individualBands(taxableIncome, parsedPayload.individualBrackets);
  let normalTaxOnAll = new MoneyDecimal(0);
  for (const band of allBands) {
    normalTaxOnAll = normalTaxOnAll.add(decimal(band.tax));
  }

  const domesticBands = individualBands(domesticPortion, parsedPayload.individualBrackets);
  let normalTaxOnDomestic = new MoneyDecimal(0);
  for (const band of domesticBands) {
    normalTaxOnDomestic = normalTaxOnDomestic.add(decimal(band.tax));
  }

  const topSliceTax = normalTaxOnAll.sub(normalTaxOnDomestic);
  const capRate = decimal(parsedPayload.foreignCurrencyRemittedCapPercent).div(100);
  const foreignTaxCapped =
    foreignPortion.greaterThan(0) ? MoneyDecimal.min(topSliceTax, foreignPortion.mul(capRate)) : decimal(0);
  const capApplied = foreignPortion.greaterThan(0) && foreignTaxCapped.lessThan(topSliceTax);

  const unroundedTax = normalTaxOnDomestic.add(foreignTaxCapped);

  const foreignTaxCredit =
    parsedInput.foreignTaxPaid !== undefined && foreignPortion.greaterThan(0)
      ? MoneyDecimal.min(decimal(parsedInput.foreignTaxPaid), foreignTaxCapped)
      : decimal(0);
  const creditApplied = foreignTaxCredit.greaterThan(0);

  const incomeTax = roundToNearestRupee(MoneyDecimal.max(unroundedTax.sub(foreignTaxCredit), decimal(0)));
  const effectiveRate = taxableIncome.greaterThan(0)
    ? incomeTax.div(taxableIncome).mul(100)
    : decimal(0);

  return {
    yearOfAssessment: parsedPayload.yearOfAssessment,
    taxpayerCategoryLabel: "Freelancer / service exporter (individual)",
    businessIncome: businessIncome.toFixed(0),
    allowableExpenses: allowableExpenses.toFixed(0),
    capitalAllowances: capitalAllowances.toFixed(0),
    totalDeductions: totalDeductions.toFixed(0),
    taxableIncomeBeforeRelief: taxableBeforeRelief.toFixed(0),
    personalRelief: personalRelief.toFixed(0),
    personalReliefSource,
    taxableIncome: taxableIncome.toFixed(0),
    foreignIncomePortion: foreignPortion.toFixed(0),
    domesticPortion: domesticPortion.toFixed(0),
    capPercent: parsedPayload.foreignCurrencyRemittedCapPercent,
    domesticBands,
    foreignTaxNormal: money(topSliceTax),
    foreignTaxCapped: money(foreignTaxCapped),
    capApplied,
    unroundedTax: money(unroundedTax),
    foreignTaxCredit: money(foreignTaxCredit),
    creditApplied,
    incomeTax: money(incomeTax),
    effectiveRatePercent: effectiveRate.toFixed(2),
  };
}
