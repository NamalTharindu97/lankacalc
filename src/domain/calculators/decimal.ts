import Decimal from "decimal.js";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});

export function decimal(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

export function rounded(value: Decimal, decimalPlaces = 2): number {
  return Number(value.toDecimalPlaces(decimalPlaces).toString());
}
