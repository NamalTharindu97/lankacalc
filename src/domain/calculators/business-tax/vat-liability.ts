import { z } from "zod";

import { decimal, MoneyDecimal, nonnegativeDecimalStringSchema } from "@/domain/calculators/money";
import { optionalIntegerInput } from "@/domain/calculators/input";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const wholeRupeePattern = /^(?:0|[1-9]\d*)$/;

export const wholeRupeeSchema = z
  .string()
  .regex(wholeRupeePattern, "Expected a whole number of rupees.");

export const supplierCategorySchema = z.enum([
  "goods-services",
  "financial-services",
  "importer-exporter",
  "digital-service",
]);

export const taxablePeriodSchema = z.enum(["monthly", "quarterly"]);

const rateScheduleItemSchema = z
  .object({
    effectiveFrom: z.string().regex(dateOnlyPattern),
    ratePercent: nonnegativeDecimalStringSchema,
  })
  .strict();

function ascendingEffectiveFrom(context: z.RefinementCtx, schedule: Array<{ effectiveFrom: string }>, path: Array<string | number>) {
  let previous: string | null = null;
  schedule.forEach((item, index) => {
    if (previous !== null && item.effectiveFrom <= previous) {
      context.addIssue({
        code: "custom",
        path: [...path, index, "effectiveFrom"],
        message: "Rate schedule effective dates must be strictly ascending.",
      });
    }
    previous = item.effectiveFrom;
  });
}

export const vatLiabilityPayloadSchema = z
  .object({
    authority: z.literal("ird-vat-act-2002-as-amended"),
    effectiveFrom: z.string().regex(dateOnlyPattern),
    rounding: z.literal("nearest-rupee"),
    standardRates: z.array(rateScheduleItemSchema).min(1),
    financialServicesRates: z.array(rateScheduleItemSchema).min(1),
    registrationThresholds: z
      .object({
        goodsServices: z.object({ quarter: wholeRupeeSchema, annual: wholeRupeeSchema }).strict(),
        financialServices: z.object({ quarter: wholeRupeeSchema, annual: wholeRupeeSchema }).strict(),
      })
      .strict(),
    importerExporterMandatoryRegistration: z.boolean(),
  })
  .strict()
  .superRefine((payload, context) => {
    ascendingEffectiveFrom(context, payload.standardRates, ["standardRates"]);
    ascendingEffectiveFrom(context, payload.financialServicesRates, ["financialServicesRates"]);
  });

function isLastDayOfMonth(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  return new Date(Date.UTC(year, month, 0)).getUTCDate() === day;
}

function quarterStart(value: string): string {
  const [year, month] = value.split("-").map(Number);
  const quarterFirstMonth = month - 2;
  const firstMonth = String(quarterFirstMonth).padStart(2, "0");
  return `${year}-${firstMonth}-01`;
}

export const vatLiabilityInputSchema = z
  .object({
    asOfDate: z.string().regex(dateOnlyPattern),
    supplierCategory: supplierCategorySchema,
    taxablePeriod: taxablePeriodSchema,
    periodEndDate: z.string().regex(dateOnlyPattern),
    taxableSuppliesAmount: optionalIntegerInput({ min: 0, max: 10_000_000_000 }),
    inputTaxCreditAmount: optionalIntegerInput({ min: 0, max: 10_000_000_000 }),
    rolling12MonthTurnover: optionalIntegerInput({ min: 0, max: 10_000_000_000 }),
  })
  .strict()
  .superRefine((input, context) => {
    if (!isLastDayOfMonth(input.periodEndDate)) {
      context.addIssue({
        code: "custom",
        path: ["periodEndDate"],
        message: "The period end date must be the last day of its month.",
      });
    }
    if (input.taxablePeriod === "quarterly") {
      const month = Number(input.periodEndDate.slice(5, 7));
      if (month % 3 !== 0) {
        context.addIssue({
          code: "custom",
          path: ["periodEndDate"],
          message: "A quarterly period must end on the last day of March, June, September, or December.",
        });
      }
    }
    const isDigital = input.supplierCategory === "digital-service";
    if (isDigital) {
      if (input.taxableSuppliesAmount !== undefined || input.inputTaxCreditAmount !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["taxableSuppliesAmount"],
          message: "A non-resident digital service provider gets a registration check only; do not enter supplies or input credit.",
        });
      }
    } else if (input.taxableSuppliesAmount === undefined || input.inputTaxCreditAmount === undefined) {
      context.addIssue({
        code: "custom",
        path: ["taxableSuppliesAmount"],
        message: "Taxable supplies and input tax credit are required for a liability estimate.",
      });
    }
  });

export type VatLiabilityInput = z.infer<typeof vatLiabilityInputSchema>;
export type VatLiabilityPayload = z.infer<typeof vatLiabilityPayloadSchema>;
export type SupplierCategory = z.infer<typeof supplierCategorySchema>;
export type TaxablePeriod = z.infer<typeof taxablePeriodSchema>;

export type VatLiabilityResult = {
  supplierCategory: SupplierCategory;
  supplierCategoryLabel: string;
  taxablePeriod: TaxablePeriod;
  periodStartDate: string;
  periodEndDate: string;
  ratePercent: string;
  rateEffectiveFrom: string;
  taxableSuppliesAmount: string;
  outputVat: string;
  inputTaxCredit: string;
  netVat: string;
  vatPayable: string;
  excessCredit: string;
  registrationStatus: "mandatory" | "required" | "not-required" | "indeterminate";
  registrationReason: string;
};

type Money = InstanceType<typeof MoneyDecimal>;

function money(value: Money): string {
  return value.toFixed(2);
}

function roundToNearestRupee(value: Money): Money {
  return value.toDecimalPlaces(0, MoneyDecimal.ROUND_HALF_UP);
}

const categoryLabels: Record<SupplierCategory, string> = {
  "goods-services": "Goods and services supplier",
  "financial-services": "Financial services supplier",
  "importer-exporter": "Commercial importer / exporter",
  "digital-service": "Non-resident digital service provider",
};

function rateFor(
  schedule: ReadonlyArray<{ effectiveFrom: string; ratePercent: string }>,
  periodStartDate: string,
): { effectiveFrom: string; ratePercent: string } {
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

export function calculateVatLiability(
  input: VatLiabilityInput,
  payload: VatLiabilityPayload,
): VatLiabilityResult {
  const parsedInput = vatLiabilityInputSchema.parse(input);
  const parsedPayload = vatLiabilityPayloadSchema.parse(payload);

  const periodStartDate =
    parsedInput.taxablePeriod === "monthly"
      ? `${parsedInput.periodEndDate.slice(0, 7)}-01`
      : quarterStart(parsedInput.periodEndDate);

  const isDigital = parsedInput.supplierCategory === "digital-service";

  let rate: { effectiveFrom: string; ratePercent: string } | null = null;
  if (isDigital) {
    rate = null;
  } else if (parsedInput.supplierCategory === "financial-services") {
    rate = rateFor(parsedPayload.financialServicesRates, periodStartDate);
  } else {
    rate = rateFor(parsedPayload.standardRates, periodStartDate);
  }

  const supplies = decimal(parsedInput.taxableSuppliesAmount ?? 0);
  const credit = decimal(parsedInput.inputTaxCreditAmount ?? 0);
  const outputVat = rate === null ? decimal(0) : supplies.mul(decimal(rate.ratePercent).div(100));
  const netVat = outputVat.sub(credit);
  const vatPayable = roundToNearestRupee(MoneyDecimal.max(netVat, decimal(0)));
  const excessCredit = roundToNearestRupee(MoneyDecimal.max(netVat.mul(-1), decimal(0)));

  const thresholds =
    parsedInput.supplierCategory === "financial-services"
      ? parsedPayload.registrationThresholds.financialServices
      : parsedPayload.registrationThresholds.goodsServices;

  let registrationStatus: VatLiabilityResult["registrationStatus"] = "indeterminate";
  let registrationReason = "";

  if (parsedInput.supplierCategory === "importer-exporter") {
    registrationStatus = "mandatory";
    registrationReason =
      "All persons importing or exporting goods for commercial purposes must register for VAT regardless of turnover or exemptions.";
  } else if (parsedInput.supplierCategory === "digital-service") {
    if (parsedInput.rolling12MonthTurnover === undefined) {
      registrationReason =
        "Provide the rolling 12-month value of digital services supplied to complete the registration-threshold check.";
    } else if (exceeds(String(parsedInput.rolling12MonthTurnover), thresholds.annual)) {
      registrationStatus = "required";
      registrationReason = `Registration is required: 12-month digital services exceed LKR ${thresholds.annual}.`;
    } else {
      registrationStatus = "not-required";
      registrationReason = `12-month digital services do not exceed the LKR ${thresholds.annual} registration threshold.`;
    }
  } else {
    const quarterlyTrigger =
      parsedInput.taxablePeriod === "quarterly" &&
      parsedInput.taxableSuppliesAmount !== undefined &&
      exceeds(String(parsedInput.taxableSuppliesAmount), thresholds.quarter);
    const annualTrigger =
      parsedInput.rolling12MonthTurnover !== undefined &&
      exceeds(String(parsedInput.rolling12MonthTurnover), thresholds.annual);

    if (quarterlyTrigger || annualTrigger) {
      registrationStatus = "required";
      registrationReason = `Registration is required: taxable supplies exceed the threshold (quarter LKR ${thresholds.quarter} / 12-month LKR ${thresholds.annual}).`;
    } else if (parsedInput.rolling12MonthTurnover !== undefined) {
      registrationStatus = "not-required";
      registrationReason = `Taxable supplies do not exceed the VAT registration thresholds (quarter LKR ${thresholds.quarter} / 12-month LKR ${thresholds.annual}).`;
    } else {
      registrationReason =
        "Provide the rolling 12-month turnover to complete the registration-threshold check; a quarterly period may also trigger registration above the quarterly threshold.";
    }
  }

  return {
    supplierCategory: parsedInput.supplierCategory,
    supplierCategoryLabel: categoryLabels[parsedInput.supplierCategory],
    taxablePeriod: parsedInput.taxablePeriod,
    periodStartDate,
    periodEndDate: parsedInput.periodEndDate,
    ratePercent: rate === null ? "n/a" : rate.ratePercent,
    rateEffectiveFrom: rate === null ? "n/a" : rate.effectiveFrom,
    taxableSuppliesAmount: supplies.toFixed(0),
    outputVat: money(outputVat),
    inputTaxCredit: money(credit),
    netVat: money(netVat),
    vatPayable: money(vatPayable),
    excessCredit: money(excessCredit),
    registrationStatus,
    registrationReason,
  };
}
