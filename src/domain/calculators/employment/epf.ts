import Decimal from "decimal.js";
import { z } from "zod";

import { decimal, money, nonnegativeMoneyStringSchema, rateStringSchema } from "./schemas";

export const epfPayloadSchema = z
  .object({
    employeeRate: rateStringSchema,
    employerRate: rateStringSchema,
    rounding: z.literal("half-up-cent"),
  })
  .strict();

export const epfInputSchema = z
  .object({ eligibleEarnings: nonnegativeMoneyStringSchema })
  .strict();

export type EpfPayload = z.infer<typeof epfPayloadSchema>;
export type EpfInput = z.infer<typeof epfInputSchema>;

export function calculateEpf(input: EpfInput, payload: EpfPayload) {
  const parsedInput = epfInputSchema.parse(input);
  const parsedPayload = epfPayloadSchema.parse(payload);
  const earnings = decimal(parsedInput.eligibleEarnings);
  const employeeAmount = earnings
    .mul(parsedPayload.employeeRate)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const employerAmount = earnings
    .mul(parsedPayload.employerRate)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    eligibleEarnings: money(earnings),
    employee: {
      rate: parsedPayload.employeeRate,
      amount: money(employeeAmount),
    },
    employer: {
      rate: parsedPayload.employerRate,
      amount: money(employerAmount),
    },
    totalContribution: money(employeeAmount.plus(employerAmount)),
  };
}
