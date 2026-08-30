import { z } from "zod";

import { decimal, MoneyDecimal, nonnegativeDecimalStringSchema } from "@/domain/calculators/money";
import { integerInput } from "@/domain/calculators/input";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const wholeRupeePattern = /^(?:0|[1-9]\d*)$/;

export const wholeRupeeSchema = z
  .string()
  .regex(wholeRupeePattern, "Expected a whole number of rupees.");

export const paymentTypeSchema = z.enum([
  "interest-resident",
  "dividend",
  "rent-resident",
  "rent-non-resident",
  "service-fee-resident",
  "service-fee-non-resident",
  "royalty-resident",
  "royalty-non-resident",
]);

export const selfDeclarationSchema = z
  .preprocess((value) => (value === "" ? undefined : value), z.enum(["yes", "no"]).optional());

const confirmationSchema = z
  .preprocess((value) => (value === "" ? undefined : value), z.enum(["yes", "no"]).optional());

const rateScheduleItemSchema = z
  .object({
    effectiveFrom: z.string().regex(dateOnlyPattern),
    ratePercent: nonnegativeDecimalStringSchema,
  })
  .strict();

const serviceScopeRevisionSchema = z
  .object({
    effectiveFrom: z.string().regex(dateOnlyPattern),
    revision: z.string().min(1),
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
    rounding: z.literal("two-decimal"),
    monthlyThreshold: wholeRupeeSchema,
    residentServiceScopeRevisions: z.array(serviceScopeRevisionSchema).min(1),
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
    ascendingEffectiveFrom(context, payload.residentServiceScopeRevisions, ["residentServiceScopeRevisions"]);
  });

export const withholdingTaxInputSchema = z
  .object({
    asOfDate: z.string().regex(dateOnlyPattern),
    paymentType: paymentTypeSchema,
    grossAmount: integerInput({ min: 0, max: 10_000_000_000 }),
    interestSelfDeclaration: selfDeclarationSchema,
    residentServiceScopeConfirmed: confirmationSchema,
    nonResidentConditionsConfirmed: confirmationSchema,
  })
  .strict()
  .superRefine((input, context) => {
    if (input.interestSelfDeclaration !== undefined && input.paymentType !== "interest-resident") {
      context.addIssue({
        code: "custom",
        path: ["interestSelfDeclaration"],
        message: "The interest self-declaration applies only to interest payments.",
      });
    }
    if (input.paymentType === "service-fee-resident" && input.residentServiceScopeConfirmed !== "yes") {
      context.addIssue({
        code: "custom",
        path: ["residentServiceScopeConfirmed"],
        message: "Confirm that the resident service is listed for the payment date.",
      });
    } else if (input.paymentType !== "service-fee-resident" && input.residentServiceScopeConfirmed !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["residentServiceScopeConfirmed"],
        message: "The resident service-scope confirmation applies only to resident service fees.",
      });
    }

    const nonResidentPayment = isNonResidentPayment(input.paymentType);
    if (nonResidentPayment && input.nonResidentConditionsConfirmed !== "yes") {
      context.addIssue({
        code: "custom",
        path: ["nonResidentConditionsConfirmed"],
        message: "Confirm that no treaty reduction, exemption, or Sri Lankan permanent-establishment treatment applies.",
      });
    } else if (!nonResidentPayment && input.nonResidentConditionsConfirmed !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["nonResidentConditionsConfirmed"],
        message: "The non-resident conditions confirmation applies only to non-resident payments.",
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
  serviceScopeRevision: string | null;
  serviceScopeEffectiveFrom: string | null;
  wthAmount: string;
  netPayment: string;
  treatment: "final" | "creditable";
  reason: string;
};

type Money = InstanceType<typeof MoneyDecimal>;

function money(value: Money): string {
  return value.toFixed(2);
}

const paymentTypeLabels: Record<PaymentType, string> = {
  "interest-resident": "Interest or discount to a resident individual",
  dividend: "Dividend",
  "rent-resident": "Rent to a resident person",
  "rent-non-resident": "Rent to a non-resident person",
  "service-fee-resident": "Service fee to a resident individual",
  "service-fee-non-resident": "Service fee to a non-resident person",
  "royalty-resident": "Royalty to a resident person",
  "royalty-non-resident": "Royalty to a non-resident person",
};

const rateScheduleKeys: Record<PaymentType, keyof WithholdingTaxPayload["rates"]> = {
  "interest-resident": "interest",
  dividend: "dividend",
  "rent-resident": "rentResident",
  "rent-non-resident": "rentNonResident",
  "service-fee-resident": "serviceFeeResident",
  "service-fee-non-resident": "serviceFeeNonResident",
  "royalty-resident": "royalty",
  "royalty-non-resident": "royalty",
};

const rateLabels: Record<PaymentType, string> = {
  "interest-resident": "AIT on interest or discount paid to a resident individual",
  dividend: "WHT on dividends paid",
  "rent-resident": "WHT on rent to a resident person, above the calendar-month threshold",
  "rent-non-resident": "WHT on rent to a non-resident person",
  "service-fee-resident": "AIT on service fees to a resident individual, above the calendar-month threshold",
  "service-fee-non-resident": "WHT on service fees to a non-resident person",
  "royalty-resident": "WHT on royalties paid to a resident person",
  "royalty-non-resident": "WHT on royalties paid to a non-resident person",
};

function isMonthlyThresholdCategory(paymentType: PaymentType): boolean {
  return paymentType === "rent-resident" || paymentType === "service-fee-resident";
}

function isNonResidentPayment(paymentType: PaymentType): boolean {
  return paymentType === "rent-non-resident"
    || paymentType === "service-fee-non-resident"
    || paymentType === "royalty-non-resident";
}

function rateFor(
  schedule: ReadonlyArray<{ effectiveFrom: string; ratePercent: string }>,
  paymentDate: string,
): { effectiveFrom: string; ratePercent: string } {
  let selected: { effectiveFrom: string; ratePercent: string } | undefined;
  for (const item of schedule) {
    if (item.effectiveFrom <= paymentDate) {
      selected = item;
    } else {
      break;
    }
  }
  if (selected === undefined) {
    throw new Error(`No withholding-tax rate is effective on ${paymentDate}.`);
  }
  return selected;
}

function serviceScopeFor(
  schedule: ReadonlyArray<{ effectiveFrom: string; revision: string }>,
  paymentDate: string,
): { effectiveFrom: string; revision: string } {
  let selected: { effectiveFrom: string; revision: string } | undefined;
  for (const item of schedule) {
    if (item.effectiveFrom <= paymentDate) {
      selected = item;
    } else {
      break;
    }
  }
  if (selected === undefined) {
    throw new Error(`No resident service scope is effective on ${paymentDate}.`);
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
  const serviceScope = paymentType === "service-fee-resident"
    ? serviceScopeFor(parsedPayload.residentServiceScopeRevisions, parsedInput.asOfDate)
    : null;

  const thresholdApplied = isMonthlyThresholdCategory(paymentType);
  const gross = decimal(parsedInput.grossAmount);
  const monthlyThreshold = decimal(parsedPayload.monthlyThreshold);

  let thresholdExceeded: boolean | null = null;
  if (thresholdApplied) {
    thresholdExceeded = gross.greaterThan(monthlyThreshold);
  }

  const selfDeclarationApplied =
    paymentType === "interest-resident" && parsedInput.interestSelfDeclaration === "yes";

  const ratePercent =
    (thresholdApplied && thresholdExceeded === false) || selfDeclarationApplied ? "0" : applicable.ratePercent;

  const wthAmount = gross.mul(decimal(ratePercent).div(100)).toDecimalPlaces(2, MoneyDecimal.ROUND_HALF_UP);
  const netPayment = gross.sub(wthAmount);

  const treatment: WithholdingTaxResult["treatment"] =
    paymentType === "dividend" || isNonResidentPayment(paymentType) ? "final" : "creditable";

  const reasons: string[] = [];
  if (selfDeclarationApplied) {
    reasons.push(
      "The payer confirms that the resident individual has a valid self-declaration on file because they do not derive taxable income for the relevant year of assessment, so AIT is not deducted.",
    );
  } else if (thresholdApplied && thresholdExceeded === false) {
    reasons.push(
      `The calendar-month aggregate of LKR ${parsedInput.grossAmount} does not exceed the LKR ${parsedPayload.monthlyThreshold} threshold, so no tax is deducted.`,
    );
  } else {
    reasons.push(`Rate for payments on or after ${applicable.effectiveFrom}: ${applicable.ratePercent}%.`);
  }
  if (serviceScope !== null) {
    reasons.push(
      `The payer confirms that the service is listed under scope revision ${serviceScope.revision}, effective ${serviceScope.effectiveFrom}.`,
    );
  }
  if (isNonResidentPayment(paymentType)) {
    reasons.push(
      "The payer confirms that no treaty reduction or exemption applies and the payment is not attributable to a Sri Lankan permanent establishment.",
    );
  }
  reasons.push(
    treatment === "final"
      ? "This withholding is a final tax under the confirmed recipient conditions."
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
    serviceScopeRevision: serviceScope?.revision ?? null,
    serviceScopeEffectiveFrom: serviceScope?.effectiveFrom ?? null,
    wthAmount: money(wthAmount),
    netPayment: money(netPayment),
    treatment,
    reason: reasons.join(" "),
  };
}
