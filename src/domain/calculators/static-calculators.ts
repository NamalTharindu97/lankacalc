import { z } from "zod";

import { decimal, rounded } from "@/domain/calculators/decimal";
import {
  defineCalculator,
  type CalculationResult,
  type CalculatorMetadata,
} from "@/domain/calculators/types";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isValidDateOnly(value: string): boolean {
  if (!dateOnlyPattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = parseDateOnly(value);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function staticResult(
  calculator: Pick<CalculatorMetadata, "key" | "version">,
  values: Omit<CalculationResult, "calculator" | "calculationVersion" | "ruleVersions" | "sources" | "verifiedAt">,
): CalculationResult {
  return {
    calculator: calculator.key,
    calculationVersion: calculator.version,
    ruleVersions: [],
    sources: [],
    verifiedAt: null,
    ...values,
  };
}

const ageMetadata = {
  key: "age",
  name: "Age calculator",
  shortName: "Age",
  summary: "Find completed years and elapsed days between two dates.",
  category: "Everyday",
  classification: "static",
  version: "1.0.0",
  accent: "ink",
  fields: [
    { name: "dateOfBirth", label: "Date of birth", type: "date" },
    { name: "asOfDate", label: "Calculate age on", type: "date" },
  ],
} as const satisfies CalculatorMetadata;

const ageSchema = z
  .object({
    dateOfBirth: z.string().refine(isValidDateOnly, "Enter a valid date of birth."),
    asOfDate: z.string().refine(isValidDateOnly, "Enter a valid calculation date."),
  })
  .refine((input) => parseDateOnly(input.dateOfBirth) <= parseDateOnly(input.asOfDate), {
    message: "Date of birth cannot be after the calculation date.",
    path: ["dateOfBirth"],
  });

export const ageCalculator = defineCalculator({
  ...ageMetadata,
  schema: ageSchema,
  run(input) {
    const birthDate = parseDateOnly(input.dateOfBirth);
    const asOfDate = parseDateOnly(input.asOfDate);
    let completedYears = asOfDate.getUTCFullYear() - birthDate.getUTCFullYear();
    const birthMonth = birthDate.getUTCMonth();
    const birthDay = birthDate.getUTCDate();
    const anniversaryDay = Math.min(
      birthDay,
      new Date(Date.UTC(asOfDate.getUTCFullYear(), birthMonth + 1, 0)).getUTCDate(),
    );
    const anniversary = new Date(Date.UTC(asOfDate.getUTCFullYear(), birthMonth, anniversaryDay));

    if (asOfDate < anniversary) {
      completedYears -= 1;
    }

    const totalDays = Math.floor((asOfDate.getTime() - birthDate.getTime()) / 86_400_000);

    return staticResult(ageMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: { completedYears, totalDays },
      breakdown: [
        { label: "Completed years", value: completedYears, unit: "years" },
        { label: "Elapsed days", value: totalDays, unit: "days" },
      ],
      assumptions: ["Dates are interpreted as calendar dates without a time of day."],
      warnings: birthMonth === 1 && birthDay === 29
        ? ["In non-leap years, a 29 February birthday is treated as 28 February."]
        : [],
    });
  },
});

const percentageMetadata = {
  key: "percentage",
  name: "Percentage calculator",
  shortName: "Percentage",
  summary: "Calculate a percentage of any value without hidden rounding.",
  category: "Everyday",
  classification: "static",
  version: "1.0.0",
  accent: "orange",
  fields: [
    { name: "percentage", label: "Percentage", type: "number", step: 0.01, suffix: "%" },
    { name: "value", label: "Value", type: "number", step: 0.01 },
  ],
} as const satisfies CalculatorMetadata;

const percentageSchema = z.object({
  percentage: z.coerce.number().finite().min(-1_000_000).max(1_000_000),
  value: z.coerce.number().finite().min(-1_000_000_000_000).max(1_000_000_000_000),
});

export const percentageCalculator = defineCalculator({
  ...percentageMetadata,
  schema: percentageSchema,
  run(input) {
    const result = decimal(input.value).mul(input.percentage).div(100);

    return staticResult(percentageMetadata, {
      asOfDate: null,
      normalizedInputs: input,
      result: { percentageValue: rounded(result, 6) },
      breakdown: [
        {
          label: "Percentage value",
          expression: `${input.value} x ${input.percentage} / 100`,
          value: rounded(result, 6),
        },
      ],
      assumptions: [],
      warnings: [],
    });
  },
});

const compoundInterestMetadata = {
  key: "compound-interest",
  name: "Compound interest calculator",
  shortName: "Compound interest",
  summary: "Project a principal using a fixed rate and compounding frequency.",
  category: "Money",
  classification: "static",
  version: "1.0.0",
  accent: "green",
  fields: [
    { name: "principal", label: "Starting principal", type: "number", min: 0, step: 0.01, suffix: "LKR" },
    { name: "annualRatePercent", label: "Annual interest rate", type: "number", min: 0, max: 100, step: 0.01, suffix: "%" },
    { name: "years", label: "Duration", type: "number", min: 0, max: 100, step: 0.1, suffix: "years" },
    {
      name: "compoundsPerYear",
      label: "Compounding",
      type: "select",
      defaultValue: "12",
      options: [
        { label: "Annually", value: "1" },
        { label: "Quarterly", value: "4" },
        { label: "Monthly", value: "12" },
        { label: "Daily", value: "365" },
      ],
    },
  ],
} as const satisfies CalculatorMetadata;

const compoundInterestSchema = z.object({
  principal: z.coerce.number().finite().min(0).max(1_000_000_000_000),
  annualRatePercent: z.coerce.number().finite().min(0).max(100),
  years: z.coerce.number().finite().min(0).max(100),
  compoundsPerYear: z.coerce.number().int().min(1).max(365),
});

export const compoundInterestCalculator = defineCalculator({
  ...compoundInterestMetadata,
  schema: compoundInterestSchema,
  run(input) {
    const principal = decimal(input.principal);
    const periodicRate = decimal(input.annualRatePercent).div(100).div(input.compoundsPerYear);
    const periods = decimal(input.compoundsPerYear).mul(input.years);
    const finalAmount = principal.mul(decimal(1).plus(periodicRate).pow(periods));
    const totalInterest = finalAmount.minus(principal);

    return staticResult(compoundInterestMetadata, {
      asOfDate: null,
      normalizedInputs: input,
      result: {
        finalAmount: rounded(finalAmount),
        totalInterest: rounded(totalInterest),
      },
      breakdown: [
        { label: "Starting principal", value: rounded(principal), unit: "LKR" },
        { label: "Interest earned", value: rounded(totalInterest), unit: "LKR" },
        { label: "Final amount", value: rounded(finalAmount), unit: "LKR" },
      ],
      assumptions: ["The interest rate remains fixed and interest is reinvested."],
      warnings: ["Taxes, fees, deposits, and withdrawals are not included."],
    });
  },
});

const optionalDimension = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().finite().positive().max(1_000_000_000).optional(),
);

const areaMetadata = {
  key: "area",
  name: "Area calculator",
  shortName: "Area",
  summary: "Calculate rectangular, triangular, or circular area in one unit.",
  category: "Build",
  classification: "static",
  version: "1.0.0",
  accent: "blue",
  fields: [
    {
      name: "shape",
      label: "Shape",
      type: "select",
      defaultValue: "rectangle",
      options: [
        { label: "Rectangle", value: "rectangle" },
        { label: "Triangle", value: "triangle" },
        { label: "Circle", value: "circle" },
      ],
    },
    { name: "length", label: "Length", type: "number", min: 0, step: 0.01, visibleWhen: { field: "shape", equals: "rectangle" } },
    { name: "width", label: "Width", type: "number", min: 0, step: 0.01, visibleWhen: { field: "shape", equals: "rectangle" } },
    { name: "base", label: "Base", type: "number", min: 0, step: 0.01, visibleWhen: { field: "shape", equals: "triangle" } },
    { name: "height", label: "Height", type: "number", min: 0, step: 0.01, visibleWhen: { field: "shape", equals: "triangle" } },
    { name: "radius", label: "Radius", type: "number", min: 0, step: 0.01, visibleWhen: { field: "shape", equals: "circle" } },
  ],
} as const satisfies CalculatorMetadata;

const areaSchema = z
  .object({
    shape: z.enum(["rectangle", "triangle", "circle"]),
    length: optionalDimension,
    width: optionalDimension,
    base: optionalDimension,
    height: optionalDimension,
    radius: optionalDimension,
  })
  .superRefine((input, context) => {
    const requiredByShape = {
      rectangle: ["length", "width"],
      triangle: ["base", "height"],
      circle: ["radius"],
    } as const;

    for (const field of requiredByShape[input.shape]) {
      if (input[field] === undefined) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${field[0].toUpperCase()}${field.slice(1)} is required.`,
        });
      }
    }
  });

export const areaCalculator = defineCalculator({
  ...areaMetadata,
  schema: areaSchema,
  run(input) {
    let area;
    let expression;

    if (input.shape === "rectangle") {
      area = decimal(input.length!).mul(input.width!);
      expression = `${input.length} x ${input.width}`;
    } else if (input.shape === "triangle") {
      area = decimal(input.base!).mul(input.height!).div(2);
      expression = `${input.base} x ${input.height} / 2`;
    } else {
      area = decimal(input.radius!).pow(2).mul(Math.PI);
      expression = `pi x ${input.radius}^2`;
    }

    const normalizedInputs: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        normalizedInputs[key] = value;
      }
    }

    return staticResult(areaMetadata, {
      asOfDate: null,
      normalizedInputs,
      result: { area: rounded(area, 6) },
      breakdown: [{ label: "Area", expression, value: rounded(area, 6), unit: "square units" }],
      assumptions: ["All dimensions use the same unit."],
      warnings: [],
    });
  },
});

const loanEmiMetadata = {
  key: "loan-emi",
  name: "Loan EMI calculator",
  shortName: "Loan EMI",
  summary: "Estimate a fixed monthly installment and total interest.",
  category: "Money",
  classification: "static",
  version: "1.0.0",
  accent: "rose",
  fields: [
    { name: "principal", label: "Loan amount", type: "number", min: 0, step: 0.01, suffix: "LKR" },
    { name: "annualRatePercent", label: "Annual interest rate", type: "number", min: 0, max: 100, step: 0.01, suffix: "%" },
    { name: "termMonths", label: "Loan term", type: "number", min: 1, max: 1200, step: 1, suffix: "months" },
  ],
} as const satisfies CalculatorMetadata;

const loanEmiSchema = z.object({
  principal: z.coerce.number().finite().positive().max(1_000_000_000_000),
  annualRatePercent: z.coerce.number().finite().min(0).max(100),
  termMonths: z.coerce.number().int().min(1).max(1200),
});

export const loanEmiCalculator = defineCalculator({
  ...loanEmiMetadata,
  schema: loanEmiSchema,
  run(input) {
    const principal = decimal(input.principal);
    const monthlyRate = decimal(input.annualRatePercent).div(1200);
    const monthlyPayment = monthlyRate.isZero()
      ? principal.div(input.termMonths)
      : principal
          .mul(monthlyRate)
          .mul(decimal(1).plus(monthlyRate).pow(input.termMonths))
          .div(decimal(1).plus(monthlyRate).pow(input.termMonths).minus(1));
    const totalPayment = monthlyPayment.mul(input.termMonths);
    const totalInterest = totalPayment.minus(principal);

    return staticResult(loanEmiMetadata, {
      asOfDate: null,
      normalizedInputs: input,
      result: {
        monthlyPayment: rounded(monthlyPayment),
        totalPayment: rounded(totalPayment),
        totalInterest: rounded(totalInterest),
      },
      breakdown: [
        { label: "Monthly installment", value: rounded(monthlyPayment), unit: "LKR" },
        { label: "Total interest", value: rounded(totalInterest), unit: "LKR" },
        { label: "Total repayment", value: rounded(totalPayment), unit: "LKR" },
      ],
      assumptions: ["The interest rate and monthly payment remain fixed for the full term."],
      warnings: ["Fees, insurance, taxes, and lender-specific rounding are not included."],
    });
  },
});

const fuelConsumptionMetadata = {
  key: "fuel-consumption",
  name: "Fuel consumption calculator",
  shortName: "Fuel consumption",
  summary: "Convert distance and fuel used into both common efficiency measures.",
  category: "Travel",
  classification: "static",
  version: "1.0.0",
  accent: "gold",
  fields: [
    { name: "distanceKilometres", label: "Distance travelled", type: "number", min: 0, step: 0.01, suffix: "km" },
    { name: "fuelLitres", label: "Fuel used", type: "number", min: 0, step: 0.01, suffix: "litres" },
  ],
} as const satisfies CalculatorMetadata;

const fuelConsumptionSchema = z.object({
  distanceKilometres: z.coerce.number().finite().positive().max(10_000_000),
  fuelLitres: z.coerce.number().finite().positive().max(1_000_000),
});

export const fuelConsumptionCalculator = defineCalculator({
  ...fuelConsumptionMetadata,
  schema: fuelConsumptionSchema,
  run(input) {
    const distance = decimal(input.distanceKilometres);
    const fuel = decimal(input.fuelLitres);
    const kilometresPerLitre = distance.div(fuel);
    const litresPerHundredKilometres = fuel.div(distance).mul(100);

    return staticResult(fuelConsumptionMetadata, {
      asOfDate: null,
      normalizedInputs: input,
      result: {
        kilometresPerLitre: rounded(kilometresPerLitre, 3),
        litresPerHundredKilometres: rounded(litresPerHundredKilometres, 3),
      },
      breakdown: [
        { label: "Fuel efficiency", value: rounded(kilometresPerLitre, 3), unit: "km/L" },
        { label: "Fuel consumption", value: rounded(litresPerHundredKilometres, 3), unit: "L/100 km" },
      ],
      assumptions: ["Distance and fuel refer to the same journey or measurement period."],
      warnings: [],
    });
  },
});
