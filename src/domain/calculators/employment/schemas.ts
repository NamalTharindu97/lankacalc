import Decimal from "decimal.js";
import { z } from "zod";

const decimalStringPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export const nonnegativeDecimalStringSchema = z
  .string()
  .regex(decimalStringPattern, "Expected a nonnegative decimal string.");

export const nonnegativeWholeRupeeStringSchema = nonnegativeDecimalStringSchema.refine(
  (value) => new Decimal(value).isInteger(),
  "Expected a nonnegative whole-rupee decimal string.",
);

export const nonnegativeMoneyStringSchema = nonnegativeDecimalStringSchema.refine(
  (value) => new Decimal(value).decimalPlaces() <= 2,
  "Expected a decimal string with no more than two decimal places.",
);

export const rateStringSchema = nonnegativeDecimalStringSchema.refine(
  (value) => new Decimal(value).lessThanOrEqualTo(1),
  "Expected a rate between 0 and 1.",
);

export const EmploymentDecimal = Decimal.clone({ precision: 100 });

export function decimal(value: string) {
  return new EmploymentDecimal(value);
}

export function money(value: InstanceType<typeof EmploymentDecimal>): string {
  return value.toFixed(2);
}
