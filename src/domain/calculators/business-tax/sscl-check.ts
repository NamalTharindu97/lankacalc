import { z } from "zod";

import { decimal, MoneyDecimal, nonnegativeDecimalStringSchema } from "@/domain/calculators/money";
import { optionalIntegerInput } from "@/domain/calculators/input";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const wholeRupeePattern = /^(?:0|[1-9]\d*)$/;

export const wholeRupeeSchema = z
  .string()
  .regex(wholeRupeePattern, "Expected a whole number of rupees.");

export const turnoverCategorySchema = z.enum([
  "importer",
  "manufacturer",
  "service-provider",
  "financial-service",
  "land-improvement",
  "wholesale-retail-distributor",
  "wholesale-retail-other",
]);

const thresholdItemSchema = z
  .object({
    effectiveFrom: z.string().regex(dateOnlyPattern),
    quarter: wholeRupeeSchema,
    annual: wholeRupeeSchema,
  })
  .strict();

function ascendingEffectiveFrom(context: z.RefinementCtx, schedule: Array<{ effectiveFrom: string }>, path: Array<string | number>) {
  let previous: string | null = null;
  schedule.forEach((item, index) => {
    if (previous !== null && item.effectiveFrom <= previous) {
      context.addIssue({
        code: "custom",
        path: [...path, index, "effectiveFrom"],
        message: "Threshold schedule effective dates must be strictly ascending.",
      });
    }
    previous = item.effectiveFrom;
  });
}

export const ssclCheckPayloadSchema = z
  .object({
    authority: z.literal("sscl-act-2022-as-amended"),
    effectiveFrom: z.string().regex(dateOnlyPattern),
    rounding: z.literal("nearest-rupee"),
    ratePercent: nonnegativeDecimalStringSchema,
    liableFractions: z
      .object({
        importer: nonnegativeDecimalStringSchema,
        manufacturer: nonnegativeDecimalStringSchema,
        "service-provider": nonnegativeDecimalStringSchema,
        "financial-service": nonnegativeDecimalStringSchema,
        "land-improvement": nonnegativeDecimalStringSchema,
        "wholesale-retail-distributor": nonnegativeDecimalStringSchema,
        "wholesale-retail-other": nonnegativeDecimalStringSchema,
      })
      .strict(),
    registrationThresholds: z.array(thresholdItemSchema).min(1),
    financialServicesExemptFrom: z.string().regex(dateOnlyPattern),
  })
  .strict()
  .superRefine((payload, context) => {
    ascendingEffectiveFrom(context, payload.registrationThresholds, ["registrationThresholds"]);
  });

function isLastDayOfQuarter(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  if (new Date(Date.UTC(year, month, 0)).getUTCDate() !== day) return false;
  return month % 3 === 0;
}

export const ssclCheckInputSchema = z
  .object({
    asOfDate: z.string().regex(dateOnlyPattern),
    turnoverCategory: turnoverCategorySchema,
    periodEndDate: z.string().regex(dateOnlyPattern),
    quarterlyTurnover: optionalIntegerInput({ min: 0, max: 10_000_000_000 }),
    rollingFourQuarterTurnover: optionalIntegerInput({ min: 0, max: 10_000_000_000 }),
  })
  .strict()
  .superRefine((input, context) => {
    if (!isLastDayOfQuarter(input.periodEndDate)) {
      context.addIssue({
        code: "custom",
        path: ["periodEndDate"],
        message: "The SSCL period must end on the last day of March, June, September, or December.",
      });
    }
    if (input.turnoverCategory !== "financial-service" && input.quarterlyTurnover === undefined) {
      context.addIssue({
        code: "custom",
        path: ["quarterlyTurnover"],
        message: "Quarterly turnover is required for a liability estimate.",
      });
    }
  });

export type SsclCheckInput = z.infer<typeof ssclCheckInputSchema>;
export type SsclCheckPayload = z.infer<typeof ssclCheckPayloadSchema>;
export type TurnoverCategory = z.infer<typeof turnoverCategorySchema>;

export type SsclCheckResult = {
  turnoverCategory: TurnoverCategory;
  turnoverCategoryLabel: string;
  periodStartDate: string;
  periodEndDate: string;
  ratePercent: string;
  rateEffectiveFrom: string;
  liableFractionPercent: string;
  quarterlyTurnover: string;
  liableTurnover: string;
  exemptionApplied: boolean;
  registrationStatus: "mandatory" | "required" | "not-required" | "indeterminate" | "exempt";
  registrationReason: string;
  deregistrationEligible: boolean;
  ssclPayable: string;
};

type Money = InstanceType<typeof MoneyDecimal>;

function money(value: Money): string {
  return value.toFixed(2);
}

function roundToNearestRupee(value: Money): Money {
  return value.toDecimalPlaces(0, MoneyDecimal.ROUND_HALF_UP);
}

function quarterStart(value: string): string {
  const [year, month] = value.split("-").map(Number);
  const firstMonth = String(month - 2).padStart(2, "0");
  return `${year}-${firstMonth}-01`;
}

const categoryLabels: Record<TurnoverCategory, string> = {
  importer: "Importer of any article",
  manufacturer: "Manufacturer of any article",
  "service-provider": "Service provider (non-financial)",
  "financial-service": "Financial services supplier (20.5% VAT)",
  "land-improvement": "Land and improvements",
  "wholesale-retail-distributor": "Wholesale/retail — registered distributor",
  "wholesale-retail-other": "Wholesale/retail — other (including importation and sale)",
};

function thresholdFor(
  schedule: ReadonlyArray<{ effectiveFrom: string; quarter: string; annual: string }>,
  periodStartDate: string,
): { effectiveFrom: string; quarter: string; annual: string } {
  let selected = schedule[0];
  for (const item of schedule) {
    if (item.effectiveFrom <= periodStartDate) {
      selected = item;
    } else {
      break;
    }
  }
  return selected;
}

function exceeds(amount: string, threshold: string): boolean {
  return decimal(amount).greaterThan(decimal(threshold));
}

export function calculateSsclCheck(
  input: SsclCheckInput,
  payload: SsclCheckPayload,
): SsclCheckResult {
  const parsedInput = ssclCheckInputSchema.parse(input);
  const parsedPayload = ssclCheckPayloadSchema.parse(payload);

  const periodStartDate = quarterStart(parsedInput.periodEndDate);
  const thresholds = thresholdFor(parsedPayload.registrationThresholds, periodStartDate);

  const fractionPercent = parsedPayload.liableFractions[parsedInput.turnoverCategory];
  const isFinancialService = parsedInput.turnoverCategory === "financial-service";
  const exemptionApplied =
    isFinancialService && parsedPayload.financialServicesExemptFrom <= periodStartDate;

  if (isFinancialService && !exemptionApplied) {
    throw new RangeError(
      "Pre-exemption financial services require the VAT attributable-value-addition method, which this calculator does not model.",
    );
  }

  const quarterlyTurnover = decimal(parsedInput.quarterlyTurnover ?? 0);
  const liableTurnover = exemptionApplied ? decimal(0) : quarterlyTurnover.mul(decimal(fractionPercent).div(100));

  const levy = exemptionApplied
    ? decimal(0)
    : roundToNearestRupee(liableTurnover.mul(decimal(parsedPayload.ratePercent).div(100)));

  let registrationStatus: SsclCheckResult["registrationStatus"] = "indeterminate";
  let registrationReason = "";

  if (exemptionApplied) {
    registrationStatus = "exempt";
    registrationReason =
      "Financial services subject to VAT at 20.5% are exempt from SSCL for periods commencing on or after the exemption date.";
  } else if (parsedInput.turnoverCategory === "importer") {
    registrationStatus = "mandatory";
    registrationReason =
      "Every person who imports any article is a taxable person for SSCL regardless of turnover and must register.";
  } else if (parsedInput.quarterlyTurnover !== undefined && exceeds(String(parsedInput.quarterlyTurnover), thresholds.quarter)) {
    registrationStatus = "required";
    registrationReason = `Registration is required: quarterly turnover exceeds LKR ${thresholds.quarter}.`;
  } else if (
    parsedInput.rollingFourQuarterTurnover !== undefined &&
    exceeds(String(parsedInput.rollingFourQuarterTurnover), thresholds.annual)
  ) {
    registrationStatus = "required";
    registrationReason = `Registration is required: four-quarter turnover exceeds LKR ${thresholds.annual}.`;
  } else if (
    parsedInput.rollingFourQuarterTurnover !== undefined &&
    parsedInput.quarterlyTurnover !== undefined
  ) {
    registrationStatus = "not-required";
    registrationReason = `Turnover does not exceed the SSCL registration thresholds (quarter LKR ${thresholds.quarter} / four quarters LKR ${thresholds.annual}).`;
  } else {
    registrationReason =
      "Provide the four-quarter turnover to complete the registration-threshold check; the quarterly threshold also applies.";
  }

  const deregistrationEligible =
    parsedInput.rollingFourQuarterTurnover !== undefined &&
    parsedInput.turnoverCategory !== "importer" &&
    !exemptionApplied &&
    !exceeds(String(parsedInput.rollingFourQuarterTurnover), thresholds.annual);

  const levyApplicable = !exemptionApplied && (registrationStatus === "mandatory" || registrationStatus === "required");

  return {
    turnoverCategory: parsedInput.turnoverCategory,
    turnoverCategoryLabel: categoryLabels[parsedInput.turnoverCategory],
    periodStartDate,
    periodEndDate: parsedInput.periodEndDate,
    ratePercent: parsedPayload.ratePercent,
    rateEffectiveFrom: parsedPayload.effectiveFrom,
    liableFractionPercent: fractionPercent,
    quarterlyTurnover: quarterlyTurnover.toFixed(0),
    liableTurnover: liableTurnover.toFixed(0),
    exemptionApplied,
    registrationStatus,
    registrationReason,
    deregistrationEligible,
    ssclPayable: money(levyApplicable ? levy : decimal(0)),
  };
}
