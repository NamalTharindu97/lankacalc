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

export const rateStringSchema = nonnegativeDecimalStringSchema.refine(
  (value) => new Decimal(value).lessThanOrEqualTo(1),
  "Expected a rate between 0 and 1.",
);

export const VehicleImportDecimal = Decimal.clone({ precision: 100 });

export type VehicleImportDecimalType = Decimal;

export function decimal(value: Decimal.Value) {
  return new VehicleImportDecimal(value);
}
