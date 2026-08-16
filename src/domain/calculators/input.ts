import Decimal from "decimal.js";
import { z } from "zod";

const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

type DecimalInputOptions = {
  min?: Decimal.Value;
  max?: Decimal.Value;
  positive?: boolean;
  maxDecimalPlaces?: number;
  message?: string;
};

function invalid(context: z.RefinementCtx, message: string) {
  context.addIssue({ code: "custom", message });
  return z.NEVER;
}

export function decimalInput(options: DecimalInputOptions = {}) {
  const message = options.message ?? "Enter a valid number.";

  return z.union([z.string(), z.number()]).transform((value, context) => {
    if (typeof value === "number" && !Number.isFinite(value)) {
      return invalid(context, message);
    }

    const text = String(value);
    if (!text || text !== text.trim() || !decimalPattern.test(text)) {
      return invalid(context, message);
    }

    let parsed: Decimal;
    try {
      parsed = new Decimal(text);
    } catch {
      return invalid(context, message);
    }

    if (!parsed.isFinite()) {
      return invalid(context, message);
    }
    if (options.positive && !parsed.isPositive()) {
      return invalid(context, "Value must be greater than zero.");
    }
    if (options.min !== undefined && parsed.lessThan(options.min)) {
      return invalid(context, `Value must be at least ${options.min}.`);
    }
    if (options.max !== undefined && parsed.greaterThan(options.max)) {
      return invalid(context, `Value must be at most ${options.max}.`);
    }
    if (
      options.maxDecimalPlaces !== undefined &&
      parsed.decimalPlaces() > options.maxDecimalPlaces
    ) {
      return invalid(
        context,
        `Value must have no more than ${options.maxDecimalPlaces} decimal places.`,
      );
    }

    return parsed.toString();
  });
}

export function optionalDecimalInput(options: DecimalInputOptions = {}) {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    decimalInput(options).optional(),
  );
}

export function optionalIntegerInput(options: Omit<DecimalInputOptions, "positive"> = {}) {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    integerInput(options).optional(),
  );
}

export function integerInput(options: Omit<DecimalInputOptions, "positive"> = {}) {
  return decimalInput(options).transform((value, context) => {
    const parsed = new Decimal(value);
    if (!parsed.isInteger() || parsed.abs().greaterThan(Number.MAX_SAFE_INTEGER)) {
      return invalid(context, "Enter a whole number within the supported range.");
    }

    return parsed.toNumber();
  });
}
