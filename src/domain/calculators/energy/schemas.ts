import Decimal from "decimal.js";
import { z } from "zod";

const decimalStringPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export const nonnegativeDecimalStringSchema = z
  .string()
  .regex(decimalStringPattern, "Expected a nonnegative decimal string.");

export const nonnegativeMoneyStringSchema = nonnegativeDecimalStringSchema.refine(
  (value) => new Decimal(value).decimalPlaces() <= 2,
  "Expected a decimal string with no more than two decimal places.",
);

export const nonnegativePercentStringSchema = nonnegativeDecimalStringSchema.refine(
  (value) => new Decimal(value).lessThanOrEqualTo(100),
  "Expected a percentage between 0 and 100.",
);

export const ElectricityDecimal = Decimal.clone({ precision: 100 });

export function decimal(value: string) {
  return new ElectricityDecimal(value);
}

export function money(value: InstanceType<typeof ElectricityDecimal>): string {
  return value.toFixed(2);
}
