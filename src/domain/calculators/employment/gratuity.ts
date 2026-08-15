import Decimal from "decimal.js";
import { z } from "zod";

import { decimal, money, nonnegativeWholeRupeeStringSchema, rateStringSchema } from "./schemas";

const wholeYearsStringSchema = z
  .string()
  .regex(/^\d+$/, "Expected a whole number of completed years.")
  .refine(
    (value) => new Decimal(value).lessThanOrEqualTo(100),
    "Expected between 0 and 100 completed years.",
  );

const confirmationSchema = z.enum(["confirmed", "not-confirmed"], {
  error: "Confirm the eligibility condition.",
});

export const gratuityInputSchema = z
  .object({
    lastDrawnMonthlyWage: nonnegativeWholeRupeeStringSchema,
    completedYearsOfService: wholeYearsStringSchema,
    employerWorkmenAtLeast15: confirmationSchema,
    notExcludedByAct: confirmationSchema,
  })
  .strict();

export const gratuityPayloadSchema = z
  .object({
    ratePerCompletedYear: rateStringSchema,
    minimumCompletedYears: wholeYearsStringSchema,
    minimumEmployerWorkmen: z
      .string()
      .regex(/^\d+$/, "Expected a whole number of workmen.")
      .refine(
        (value) => new Decimal(value).greaterThanOrEqualTo(1),
        "Expected at least one workman.",
      ),
    rounding: z.literal("half-up-rupee"),
  })
  .strict();

export type GratuityInput = z.infer<typeof gratuityInputSchema>;
export type GratuityPayload = z.infer<typeof gratuityPayloadSchema>;

export type GratuityResult = {
  eligible: boolean;
  notEligibleReason?: "service-below-five-years" | "employer-workmen-below-fifteen" | "excluded-by-act";
  gratuity: string;
  halfMonthAmount: string;
  ratePerCompletedYear: string;
};

export function calculateGratuity(input: GratuityInput, payload: GratuityPayload): GratuityResult {
  const parsedInput = gratuityInputSchema.parse(input);
  const parsedPayload = gratuityPayloadSchema.parse(payload);

  const wage = decimal(parsedInput.lastDrawnMonthlyWage);
  const years = decimal(parsedInput.completedYearsOfService);

  let eligible = true;
  let notEligibleReason: GratuityResult["notEligibleReason"];

  if (years.lessThan(parsedPayload.minimumCompletedYears)) {
    eligible = false;
    notEligibleReason = "service-below-five-years";
  } else if (parsedInput.employerWorkmenAtLeast15 === "not-confirmed") {
    eligible = false;
    notEligibleReason = "employer-workmen-below-fifteen";
  } else if (parsedInput.notExcludedByAct === "not-confirmed") {
    eligible = false;
    notEligibleReason = "excluded-by-act";
  }

  const halfMonthAmount = wage.mul(parsedPayload.ratePerCompletedYear);
  const gratuity = eligible
    ? halfMonthAmount.mul(years).toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    : decimal("0");

  return {
    eligible,
    ...(notEligibleReason ? { notEligibleReason } : {}),
    gratuity: money(gratuity),
    halfMonthAmount: money(halfMonthAmount),
    ratePerCompletedYear: "half-month",
  };
}
