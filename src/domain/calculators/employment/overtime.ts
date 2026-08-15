import Decimal from "decimal.js";
import { z } from "zod";

import { decimal, money, nonnegativeDecimalStringSchema, nonnegativeWholeRupeeStringSchema } from "./schemas";

const halfHourStepsSchema = nonnegativeDecimalStringSchema.refine(
  (value) => {
    const parsed = new Decimal(value);
    return parsed.lessThanOrEqualTo(744) && parsed.mul(2).isInteger();
  },
  "Expected overtime hours in half-hour steps up to 744.",
);

const multiplierSchema = nonnegativeDecimalStringSchema;

const hourlyRateDivisorsSchema = z
  .object({
    statutoryMonthly: nonnegativeWholeRupeeStringSchema,
    conventionMonthly: nonnegativeWholeRupeeStringSchema,
  })
  .strict();

export const overtimeInputSchema = z
  .object({
    monthlyRemuneration: nonnegativeWholeRupeeStringSchema,
    hourlyRateBasis: z.enum(["statutory-240", "convention-200"]),
    weekdayOvertimeHours: halfHourStepsSchema,
    restDayOvertimeHours: halfHourStepsSchema,
  })
  .strict();

export const overtimePayloadSchema = z
  .object({
    normalDailyHours: z.string().regex(/^\d+$/, "Expected a whole number of daily hours."),
    normalWeeklyHours: z.string().regex(/^\d+$/, "Expected a whole number of weekly hours."),
    weekdayMultiplier: multiplierSchema,
    restDayMultiplier: multiplierSchema,
    maximumWeeklyOvertimeHours: z.string().regex(/^\d+$/, "Expected a whole number of cap hours."),
    hourlyRateDivisors: hourlyRateDivisorsSchema,
    rounding: z.literal("half-up-cent"),
  })
  .strict();

export type OvertimeInput = z.infer<typeof overtimeInputSchema>;
export type OvertimePayload = z.infer<typeof overtimePayloadSchema>;

export type OvertimeResult = {
  hourlyRate: string;
  hourlyRateDivisor: number;
  weekdayMultiplier: string;
  restDayMultiplier: string;
  weekdayOvertimePay: string;
  restDayOvertimePay: string;
  totalOvertimePay: string;
  totalOvertimeHours: string;
  averageWeeklyOvertimeHours: string;
  weeklyCapExceeded: "possible" | "no";
};

export function calculateOvertime(input: OvertimeInput, payload: OvertimePayload): OvertimeResult {
  const parsedInput = overtimeInputSchema.parse(input);
  const parsedPayload = overtimePayloadSchema.parse(payload);

  const divisor = parsedInput.hourlyRateBasis === "statutory-240"
    ? parsedPayload.hourlyRateDivisors.statutoryMonthly
    : parsedPayload.hourlyRateDivisors.conventionMonthly;

  const hourlyRate = decimal(parsedInput.monthlyRemuneration).div(divisor);
  const weekdayHours = decimal(parsedInput.weekdayOvertimeHours);
  const restDayHours = decimal(parsedInput.restDayOvertimeHours);

  const weekdayMultiplier = parsedPayload.weekdayMultiplier;
  const restDayMultiplier = parsedPayload.restDayMultiplier;

  const weekdayOvertimePay = hourlyRate
    .mul(weekdayMultiplier)
    .mul(weekdayHours)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const restDayOvertimePay = hourlyRate
    .mul(restDayMultiplier)
    .mul(restDayHours)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const totalOvertimePay = weekdayOvertimePay.plus(restDayOvertimePay);
  const totalOvertimeHours = weekdayHours.plus(restDayHours);
  const averageWeeklyOvertimeHours = totalOvertimeHours.div(52).mul(12);
  const capExceeded = averageWeeklyOvertimeHours.greaterThan(parsedPayload.maximumWeeklyOvertimeHours);

  return {
    hourlyRate: money(hourlyRate),
    hourlyRateDivisor: new Decimal(divisor).toNumber(),
    weekdayMultiplier,
    restDayMultiplier,
    weekdayOvertimePay: money(weekdayOvertimePay),
    restDayOvertimePay: money(restDayOvertimePay),
    totalOvertimePay: money(totalOvertimePay),
    totalOvertimeHours: totalOvertimeHours.toFixed(1),
    averageWeeklyOvertimeHours: averageWeeklyOvertimeHours.toFixed(2),
    weeklyCapExceeded: capExceeded ? "possible" : "no",
  };
}
