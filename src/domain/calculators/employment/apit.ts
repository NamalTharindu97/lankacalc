import Decimal from "decimal.js";
import { z } from "zod";

import {
  decimal,
  nonnegativeDecimalStringSchema,
  nonnegativeWholeRupeeStringSchema,
  rateStringSchema,
} from "./schemas";

export const apitBracketSchema = z
  .object({
    upperBound: nonnegativeWholeRupeeStringSchema.optional(),
    rate: rateStringSchema,
    deduction: nonnegativeDecimalStringSchema,
  })
  .strict();

export const apitPayloadSchema = z
  .object({
    brackets: z.array(apitBracketSchema).min(1),
    rounding: z.literal("ceiling-whole-rupee"),
  })
  .strict()
  .superRefine((payload, context) => {
    let previousUpperBound: string | undefined;

    payload.brackets.forEach((bracket, index) => {
      const isLast = index === payload.brackets.length - 1;

      if (!isLast && bracket.upperBound === undefined) {
        context.addIssue({
          code: "custom",
          path: ["brackets", index, "upperBound"],
          message: "Only the final APIT bracket may omit its upper bound.",
        });
      }
      if (isLast && bracket.upperBound !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["brackets", index, "upperBound"],
          message: "The final APIT bracket must be open-ended.",
        });
      }
      if (
        bracket.upperBound !== undefined &&
        previousUpperBound !== undefined &&
        decimal(bracket.upperBound).lessThanOrEqualTo(previousUpperBound)
      ) {
        context.addIssue({
          code: "custom",
          path: ["brackets", index, "upperBound"],
          message: "APIT bracket upper bounds must be strictly increasing.",
        });
      }

      if (bracket.upperBound !== undefined) {
        previousUpperBound = bracket.upperBound;
      }
    });
  });

export const apitInputSchema = z
  .object({ monthlyTaxableIncome: nonnegativeWholeRupeeStringSchema })
  .strict();

export type ApitPayload = z.infer<typeof apitPayloadSchema>;
export type ApitInput = z.infer<typeof apitInputSchema>;

export function calculateApit(input: ApitInput, payload: ApitPayload) {
  const parsedInput = apitInputSchema.parse(input);
  const parsedPayload = apitPayloadSchema.parse(payload);
  const income = decimal(parsedInput.monthlyTaxableIncome);
  const bracketIndex = parsedPayload.brackets.findIndex(
    (bracket) =>
      bracket.upperBound === undefined || income.lessThanOrEqualTo(bracket.upperBound),
  );

  if (bracketIndex < 0) {
    throw new RangeError("No APIT bracket covers the taxable income.");
  }

  const bracket = parsedPayload.brackets[bracketIndex];
  const previousUpperBound = parsedPayload.brackets[bracketIndex - 1]?.upperBound;
  const calculatedTax = Decimal.max(
    income.mul(bracket.rate).minus(bracket.deduction),
    0,
  );
  const tax = calculatedTax.toDecimalPlaces(0, Decimal.ROUND_CEIL).toFixed(0);

  return {
    monthlyTaxableIncome: income.toFixed(0),
    tax,
    selectedBracket: {
      index: bracketIndex,
      lowerBound: previousUpperBound
        ? decimal(previousUpperBound).plus(1).toFixed(0)
        : "0",
      upperBound: bracket.upperBound,
      rate: bracket.rate,
      deduction: bracket.deduction,
    },
  };
}
