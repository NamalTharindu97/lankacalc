import { z } from "zod";

import { decimal, MoneyDecimal, nonnegativeDecimalStringSchema } from "@/domain/calculators/money";
import { integerInput, optionalIntegerInput } from "@/domain/calculators/input";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const wholeRupeePattern = /^(?:0|[1-9]\d*)$/;

export const wholeRupeeSchema = z
  .string()
  .regex(wholeRupeePattern, "Expected a whole number of rupees.");

export const taxpayerCategorySchema = z.enum([
  "individual-sole-proprietor",
  "partnership",
  "company",
]);

const rateBandSchema = z
  .object({
    upTo: wholeRupeeSchema.nullable(),
    ratePercent: nonnegativeDecimalStringSchema,
  })
  .strict();

export const businessIncomeTaxPayloadSchema = z
  .object({
    authority: z.literal("ird-income-tax-2025"),
    effectiveFrom: z.string().regex(dateOnlyPattern),
    yearOfAssessment: z.string().regex(/^\d{4}\/\d{2}$/),
    rounding: z.literal("nearest-rupee"),
    personalRelief: wholeRupeeSchema,
    individualBrackets: z.array(rateBandSchema).min(2),
    partnershipExemptAmount: wholeRupeeSchema,
    partnershipRatePercent: nonnegativeDecimalStringSchema,
    companyRatePercent: nonnegativeDecimalStringSchema,
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

export const businessIncomeTaxInputSchema = z
  .object({
    asOfDate: z.string().regex(dateOnlyPattern),
    taxpayerCategory: taxpayerCategorySchema,
    businessIncome: integerInput({ min: 0, max: 10_000_000_000 }),
    allowableExpenses: integerInput({ min: 0, max: 10_000_000_000 }),
    capitalAllowances: optionalIntegerInput({ min: 0, max: 10_000_000_000 }),
    personalReliefOverride: optionalIntegerInput({ min: 0, max: 10_000_000_000 }),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.personalReliefOverride !== undefined &&
      input.taxpayerCategory !== "individual-sole-proprietor"
    ) {
      context.addIssue({
        code: "custom",
        path: ["personalReliefOverride"],
        message: "Personal relief applies only to an individual sole proprietor.",
      });
    }
  });

export type BusinessIncomeTaxInput = z.infer<typeof businessIncomeTaxInputSchema>;
export type BusinessIncomeTaxPayload = z.infer<typeof businessIncomeTaxPayloadSchema>;
export type TaxpayerCategory = z.infer<typeof taxpayerCategorySchema>;

export type TaxBandContribution = {
  label: string;
  ratePercent: string;
  taxableAmount: string;
  tax: string;
};

export type BusinessIncomeTaxResult = {
  taxpayerCategory: TaxpayerCategory;
  taxpayerCategoryLabel: string;
  yearOfAssessment: string;
  businessIncome: string;
  allowableExpenses: string;
  capitalAllowances: string;
  totalDeductions: string;
  taxableIncomeBeforeRelief: string;
  personalRelief: string;
  personalReliefSource: "official" | "user" | "not-applicable";
  taxableIncome: string;
  taxBands: TaxBandContribution[];
  unroundedTax: string;
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

const categoryLabels: Record<TaxpayerCategory, string> = {
  "individual-sole-proprietor": "Individual sole proprietor",
  partnership: "Partnership",
  company: "Company",
};

function individualBands(
  taxableIncome: Money,
  brackets: ReadonlyArray<{ upTo: string | null; ratePercent: string }>,
): TaxBandContribution[] {
  const rows: TaxBandContribution[] = [];
  let lower = decimal(0);
  let remaining = taxableIncome;
  brackets.forEach((band, index) => {
    if (remaining.lessThanOrEqualTo(0)) return;
    const upper = band.upTo === null ? null : decimal(band.upTo);
    const slice =
      upper === null
        ? remaining
        : MoneyDecimal.min(remaining, upper.sub(lower));
    if (slice.lessThanOrEqualTo(0)) return;
    const rate = decimal(band.ratePercent).div(100);
    const tax = slice.mul(rate);
    const label =
      upper === null
        ? `Over LKR ${lower.toString()}`
        : index === 0
          ? `First LKR ${band.upTo}`
          : `LKR ${lower.toFixed(0)} – ${band.upTo}`;
    rows.push({
      label,
      ratePercent: band.ratePercent,
      taxableAmount: slice.toFixed(0),
      tax: money(tax),
    });
    if (upper === null) {
      remaining = decimal(0);
    } else {
      remaining = remaining.sub(slice);
      lower = upper;
    }
  });
  return rows;
}

function partnershipBands(
  taxableIncome: Money,
  exemptAmount: string,
  ratePercent: string,
): TaxBandContribution[] {
  const rows: TaxBandContribution[] = [];
  const exempt = decimal(exemptAmount);
  const rate = decimal(ratePercent).div(100);
  const exemptSlice = MoneyDecimal.min(taxableIncome, exempt);
  rows.push({
    label: `First LKR ${exemptAmount}`,
    ratePercent: "0",
    taxableAmount: exemptSlice.toFixed(0),
    tax: money(decimal(0)),
  });
  const balance = taxableIncome.sub(exemptSlice);
  if (balance.greaterThan(0)) {
    rows.push({
      label: `Over LKR ${exemptAmount}`,
      ratePercent,
      taxableAmount: balance.toFixed(0),
      tax: money(balance.mul(rate)),
    });
  }
  return rows;
}

function companyBands(taxableIncome: Money, ratePercent: string): TaxBandContribution[] {
  return [
    {
      label: "All taxable income",
      ratePercent,
      taxableAmount: taxableIncome.toFixed(0),
      tax: money(taxableIncome.mul(decimal(ratePercent).div(100))),
    },
  ];
}

export function calculateBusinessIncomeTax(
  input: BusinessIncomeTaxInput,
  payload: BusinessIncomeTaxPayload,
): BusinessIncomeTaxResult {
  const parsedInput = businessIncomeTaxInputSchema.parse(input);
  const parsedPayload = businessIncomeTaxPayloadSchema.parse(payload);

  const businessIncome = decimal(parsedInput.businessIncome);
  const allowableExpenses = decimal(parsedInput.allowableExpenses);
  const capitalAllowances = decimal(parsedInput.capitalAllowances ?? 0);
  const totalDeductions = allowableExpenses.add(capitalAllowances);
  const taxableBeforeRelief = MoneyDecimal.max(businessIncome.sub(totalDeductions), decimal(0));

  let personalRelief = decimal(0);
  let personalReliefSource: "official" | "user" | "not-applicable" = "not-applicable";
  if (parsedInput.taxpayerCategory === "individual-sole-proprietor") {
    personalRelief =
      parsedInput.personalReliefOverride !== undefined
        ? decimal(parsedInput.personalReliefOverride)
        : decimal(parsedPayload.personalRelief);
    personalReliefSource =
      parsedInput.personalReliefOverride !== undefined ? "user" : "official";
  }
  const taxableIncome = MoneyDecimal.max(taxableBeforeRelief.sub(personalRelief), decimal(0));

  const bands =
    parsedInput.taxpayerCategory === "individual-sole-proprietor"
      ? individualBands(taxableIncome, parsedPayload.individualBrackets)
      : parsedInput.taxpayerCategory === "partnership"
        ? partnershipBands(taxableIncome, parsedPayload.partnershipExemptAmount, parsedPayload.partnershipRatePercent)
        : companyBands(taxableIncome, parsedPayload.companyRatePercent);

  let unroundedTax = new MoneyDecimal(0);
  for (const band of bands) {
    unroundedTax = unroundedTax.add(decimal(band.tax));
  }
  const incomeTax = roundToNearestRupee(unroundedTax);
  const effectiveRate = taxableIncome.greaterThan(0)
    ? incomeTax.div(taxableIncome).mul(100)
    : decimal(0);

  return {
    taxpayerCategory: parsedInput.taxpayerCategory,
    taxpayerCategoryLabel: categoryLabels[parsedInput.taxpayerCategory],
    yearOfAssessment: parsedPayload.yearOfAssessment,
    businessIncome: businessIncome.toFixed(0),
    allowableExpenses: allowableExpenses.toFixed(0),
    capitalAllowances: capitalAllowances.toFixed(0),
    totalDeductions: totalDeductions.toFixed(0),
    taxableIncomeBeforeRelief: taxableBeforeRelief.toFixed(0),
    personalRelief: personalRelief.toFixed(0),
    personalReliefSource,
    taxableIncome: taxableIncome.toFixed(0),
    taxBands: bands,
    unroundedTax: money(unroundedTax),
    incomeTax: money(incomeTax),
    effectiveRatePercent: effectiveRate.toFixed(2),
  };
}
