import { z } from "zod";

import {
  decimal,
  money,
  nonnegativeWholeRupeeStringSchema,
  rateStringSchema,
} from "./schemas";

export const etfPayloadSchema = z
  .object({
    employerRate: rateStringSchema,
    rounding: z.literal("exact-cent-only"),
  })
  .strict();

export const etfInputSchema = z
  .object({ eligibleEarnings: nonnegativeWholeRupeeStringSchema })
  .strict();

export type EtfPayload = z.infer<typeof etfPayloadSchema>;
export type EtfInput = z.infer<typeof etfInputSchema>;

export function calculateEtf(input: EtfInput, payload: EtfPayload) {
  const parsedInput = etfInputSchema.parse(input);
  const parsedPayload = etfPayloadSchema.parse(payload);
  const earnings = decimal(parsedInput.eligibleEarnings);
  const employerAmount = earnings.mul(parsedPayload.employerRate);

  if (employerAmount.decimalPlaces() > 2) {
    throw new RangeError("ETF contribution is not an exact-cent amount.");
  }

  return {
    eligibleEarnings: money(earnings),
    employer: {
      rate: parsedPayload.employerRate,
      amount: money(employerAmount),
    },
  };
}
