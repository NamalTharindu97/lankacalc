import { z } from "zod";

import { decimal, MoneyDecimal, nonnegativeDecimalStringSchema } from "@/domain/calculators/money";
import { integerInput } from "@/domain/calculators/input";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const wholeRupeePattern = /^(?:0|[1-9]\d*)$/;

export const wholeRupeeSchema = z
  .string()
  .regex(wholeRupeePattern, "Expected a whole number of rupees.");

export const paymentTypeSchema = z.enum([
  "interest",
  "dividend",
  "rent-resident",
  "rent-non-resident",
  "service-fee-resident",
  "service-fee-non-resident",
  "royalty",
]);

export const selfDeclarationSchema = z
  .preprocess((value) => (value === "" ? undefined : value), z.enum(["yes", "no"]).optional());

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

export const withholdingTaxPayloadSchema = z
  .object({
    authority: z.literal("ird-income-tax-2025"),
    effectiveFrom: z.string().regex(dateOnlyPattern),
    rounding: z.literal("nearest-rupee"),
    personalRelief: wholeRupeeSchema,
    monthlyThreshold: wholeRupeeSchema,
    rates: z
      .object({
        interest: z.array(rateScheduleItemSchema).min(1),
        dividend: z.array(rateScheduleItemSchema).min(1),
        rentResident: z.array(rateScheduleItemSchema).min(1),
        rentNonResident: z.array(rateScheduleItemSchema).min(1),
        serviceFeeResident: z.array(rateScheduleItemSchema).min(1),
        serviceFeeNonResident: z.array(rateScheduleItemSchema).min(1),
        royalty: z.array(rateScheduleItemSchema).min(1),
      })
      .strict(),
  })
  .strict()
  .superRefine((payload, context) => {
    ascendingEffectiveFrom(context, payload.rates.interest, ["rates", "interest"]);
    ascendingEffectiveFrom(context, payload.rates.dividend, ["rates", "dividend"]);
    ascendingEffectiveFrom(context, payload.rates.rentResident, ["rates", "rentResident"]);
    ascendingEffectiveFrom(context, payload.rates.rentNonResident, ["rates", "rentNonResident"]);
    ascendingEffectiveFrom(context, payload.rates.serviceFeeResident, ["rates", "serviceFeeResident"]);
    ascendingEffectiveFrom(context, payload.rates.serviceFeeNonResident, ["rates", "serviceFeeNonResident"]);
    ascendingEffectiveFrom(context, payload.rates.royalty, ["rates", "royalty"]);
  });

export const withholdingTaxInputSchema = z
  .object({
    asOfDate: z.string().regex(dateOnlyPattern),
    paymentType: paymentTypeSchema,
    grossAmount: integerInput({ min: 0, max: 10_000_000_000 }),
    interestSelfDeclaration: selfDeclarationSchema,
  })
  .strict()
  .superRefine((input, context) => {
    if (input.interestSelfDeclaration !== undefined && input.paymentType !== "interest") {
      context.addIssue({
        code: "custom",
        path: ["interestSelfDeclaration"],
        message: "The interest self-declaration applies only to interest payments.",
      });
    }
  });

export type WithholdingTaxInput = z.infer<typeof withholdingTaxInputSchema>;
export type WithholdingTaxPayload = z.infer<typeof withholdingTaxPayloadSchema>;
export type PaymentType = z.infer<typeof paymentTypeSchema>;

export type WithholdingTaxResult = {
  paymentType: PaymentType;
  paymentTypeLabel: string;
  paymentDate: string;
  ratePercent: string;
  rateEffectiveFrom: string;
  rateLabel: string;
  grossAmount: string;
  thresholdApplied: boolean;
  thresholdExceeded: boolean | null;
  selfDeclarationApplied: boolean;
  wthAmount: string;
  netPayment: string;
  treatment: "final" | "creditable";
  reason: string;
};

type Money = InstanceType<typeof MoneyDecimal>;

function money(value: Money): string {
  return value.toFixed(2);
}

function roundToNearestRupee(value: Money): Money {
  return value.toDecimalPlaces(0, MoneyDecimal.ROUND_HALF_UP);
}

const paymentTypeLabels: Record<PaymentType, string> = {
  interest: "Interest or discount",
  dividend: "Dividend",
  "rent-resident": "Rent to a resident person",
  "rent-non-resident": "Rent to a non-resident person",
  "service-fee-resident": "Service fee to a resident individual",
  "service-fee-non-resident": "Service fee to a non-resident person",
  royalty: "Royalty",
};

const rateScheduleKeys: Record<PaymentType, keyof WithholdingTaxPayload["rates"]> = {
  interest: "interest",
  dividend: "dividend",
  "rent-resident": "rentResident",
  "rent-non-resident": "rentNonResident",
  "service-fee-resident": "serviceFeeResident",
  "service-fee-non-resident": "serviceFeeNonResident",
  royalty: "royalty",
};

const rateLabels: Record<PaymentType, string> = {
  interest: "AIT on interest or discount paid",
  dividend: "WHT on dividends paid",
  "rent-resident": "WHT on rent to a resident person, above the calendar-month threshold",
  "rent-non-resident": "WHT on rent to a non-resident person",
  "service-fee-resident": "AIT on service fees to a resident individual, above the calendar-month threshold",
  "service-fee-non-resident": "WHT on service fees to a non-resident person",
  royalty: "WHT on royalties paid",
};

function isMonthlyThresholdCategory(paymentType: PaymentType): boolean {
  return paymentType === "rent-resident" || paymentType === "service-fee-resident";
}

function rateFor(
  schedule: ReadonlyArray<{ effectiveFrom: string; ratePercent: string }>,
  paymentDate: string,
): { effectiveFrom: string; ratePercent: string } {
  let selected = schedule[0];
  for (const item of schedule) {
    if (item.effectiveFrom <= paymentDate) {
      selected = item;
    } else {
      break;
    }
  }
  return selected;
}

export function calculateWithholdingTax(
  input: WithholdingTaxInput,
  payload: WithholdingTaxPayload,
): WithholdingTaxResult {
  const parsedInput = withholdingTaxInputSchema.parse(input);
  const parsedPayload = withholdingTaxPayloadSchema.parse(payload);

  const paymentType = parsedInput.paymentType;
  const schedule = parsedPayload.rates[rateScheduleKeys[paymentType]];
  const applicable = rateFor(schedule, parsedInput.asOfDate);

  const thresholdApplied = isMonthlyThresholdCategory(paymentType);
  const gross = decimal(parsedInput.grossAmount);
  const monthlyThreshold = decimal(parsedPayload.monthlyThreshold);

  let thresholdExceeded: boolean | null = null;
  if (thresholdApplied) {
    thresholdExceeded = gross.greaterThan(monthlyThreshold);
  }

  const selfDeclarationApplied =
    paymentType === "interest" && parsedInput.interestSelfDeclaration === "yes";

  const ratePercent =
    (thresholdApplied && thresholdExceeded === false) || selfDeclarationApplied ? "0" : applicable.ratePercent;

  const wthAmount = roundToNearestRupee(gross.mul(decimal(ratePercent).div(100)));
  const netPayment = gross.sub(wthAmount);

  const treatment: WithholdingTaxResult["treatment"] =
    paymentType === "dividend" ? "final" : "creditable";

  const reasons: string[] = [];
  if (selfDeclarationApplied) {
    reasons.push(
      `The resident individual has a self-declaration on file (total assessable income not exceeding the LKR ${parsedPayload.personalRelief} personal relief), so AIT is not deducted.`,
    );
  } else if (thresholdApplied && thresholdExceeded === false) {
    reasons.push(
      `The calendar-month aggregate of LKR ${parsedInput.grossAmount} does not exceed the LKR ${parsedPayload.monthlyThreshold} threshold, so no tax is deducted.`,
    );
  } else {
    reasons.push(`Rate for payments on or after ${applicable.effectiveFrom}: ${applicable.ratePercent}%.`);
  }
  reasons.push(
    treatment === "final"
      ? "Dividend tax is final and cannot be reclaimed against the annual return."
      : "Deducted tax is creditable against the recipient's annual income tax return.",
  );
  if (thresholdApplied) {
    reasons.push(
      `The calendar-month threshold check treats the amount entered as the aggregate to this recipient for the month.`,
    );
  }

  return {
    paymentType,
    paymentTypeLabel: paymentTypeLabels[paymentType],
    paymentDate: parsedInput.asOfDate,
    ratePercent,
    rateEffectiveFrom: applicable.effectiveFrom,
    rateLabel: rateLabels[paymentType],
    grossAmount: gross.toFixed(0),
    thresholdApplied,
    thresholdExceeded,
    selfDeclarationApplied,
    wthAmount: money(wthAmount),
    netPayment: money(netPayment),
    treatment,
    reason: reasons.join(" "),
  };
}
