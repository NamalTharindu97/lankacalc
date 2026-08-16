import Decimal from "decimal.js";
import { z } from "zod";

const decimalStringPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export const nonnegativeDecimalStringSchema = z
  .string()
  .regex(decimalStringPattern, "Expected a nonnegative decimal string.");

export const nonnegativeCentStringSchema = nonnegativeDecimalStringSchema.refine(
  (value) => new Decimal(value).decimalPlaces() <= 2,
  "Expected a decimal string with no more than two decimal places.",
);

export const FuelDecimal = Decimal.clone({ precision: 100 });

export function decimal(value: Decimal.Value) {
  return new FuelDecimal(value);
}

export function cents(value: Decimal.Value): string {
  return new FuelDecimal(value).toFixed(2);
}
