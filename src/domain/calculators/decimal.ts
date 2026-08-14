import Decimal from "decimal.js";

Decimal.set({
  precision: 100,
  rounding: Decimal.ROUND_HALF_UP,
});

export function decimal(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

export function rounded(value: Decimal, decimalPlaces = 2, minimumPlaces = 0): string {
  if (!value.isFinite()) {
    throw new RangeError("Calculation produced a non-finite decimal value.");
  }

  const fixed = value.toDecimalPlaces(decimalPlaces).toFixed(decimalPlaces);
  if (minimumPlaces >= decimalPlaces) {
    return fixed;
  }

  const [integer, fraction = ""] = fixed.split(".");
  const trimmed = fraction.replace(/0+$/, "").padEnd(minimumPlaces, "0");
  return trimmed ? `${integer}.${trimmed}` : integer;
}

export function money(value: Decimal): string {
  return rounded(value, 2, 2);
}

export function moneyRoundedDown(value: Decimal): string {
  return value.toDecimalPlaces(2, Decimal.ROUND_DOWN).toFixed(2);
}
