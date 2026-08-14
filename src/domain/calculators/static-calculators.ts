import { z } from "zod";

import { decimal, money, moneyRoundedDown, rounded } from "@/domain/calculators/decimal";
import {
  decimalInput,
  integerInput,
} from "@/domain/calculators/input";
import {
  defineCalculator,
  type CalculationResult,
  type CalculatorMetadata,
} from "@/domain/calculators/types";
import {
  distanceInKilometres,
  distanceUnitOptions,
  distanceUnits,
  lengthInMetres,
  lengthUnitOptions,
  lengthUnits,
  squareMetresInUnit,
  squareUnitLabels,
  volumeInLitres,
  volumeUnitOptions,
  volumeUnits,
} from "@/domain/calculators/units";

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
    { name: "dateOfBirth", label: "Date of birth", type: "date", required: true, min: "0100-01-01", max: "9999-12-31" },
    { name: "asOfDate", label: "Calculate age on", type: "date", required: true, min: "0100-01-01", max: "9999-12-31" },
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
  version: "2.0.0",
  accent: "orange",
  fields: [
    {
      name: "percentage",
      label: "Percentage",
      type: "number",
      required: true,
      min: -1_000_000,
      max: 1_000_000,
      maxDecimalPlaces: 12,
      step: 0.000000000001,
      suffix: "%",
    },
    {
      name: "value",
      label: "Value",
      type: "number",
      required: true,
      min: -1_000_000_000_000,
      max: 1_000_000_000_000,
      maxDecimalPlaces: 12,
      step: 0.000000000001,
    },
  ],
} as const satisfies CalculatorMetadata;

const percentageSchema = z.object({
  percentage: decimalInput({ min: -1_000_000, max: 1_000_000, maxDecimalPlaces: 12 }),
  value: decimalInput({
    min: -1_000_000_000_000,
    max: 1_000_000_000_000,
    maxDecimalPlaces: 12,
  }),
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
      assumptions: ["The result is rounded to a maximum of six decimal places."],
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
  version: "2.0.0",
  accent: "green",
  fields: [
    { name: "principal", label: "Starting principal", type: "number", required: true, min: 0, max: 1_000_000_000_000, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR" },
    { name: "annualRatePercent", label: "Nominal annual interest rate", type: "number", required: true, min: 0, max: 100, maxDecimalPlaces: 6, step: 0.000001, suffix: "%" },
    { name: "years", label: "Duration", type: "number", required: true, min: 0, max: 100, maxDecimalPlaces: 4, step: 0.0001, suffix: "years" },
    {
      name: "compoundsPerYear",
      label: "Compounding",
      type: "select",
      required: true,
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
  principal: decimalInput({ min: 0, max: 1_000_000_000_000, maxDecimalPlaces: 2 }),
  annualRatePercent: decimalInput({ min: 0, max: 100, maxDecimalPlaces: 6 }),
  years: decimalInput({ min: 0, max: 100, maxDecimalPlaces: 4 }),
  compoundsPerYear: z
    .union([
      z.literal("1"),
      z.literal("4"),
      z.literal("12"),
      z.literal("365"),
      z.literal(1),
      z.literal(4),
      z.literal(12),
      z.literal(365),
    ])
    .transform(Number),
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
        finalAmount: money(finalAmount),
        totalInterest: money(totalInterest),
      },
      breakdown: [
        { label: "Starting principal", value: money(principal), unit: "LKR" },
        { label: "Interest earned", value: money(totalInterest), unit: "LKR" },
        { label: "Final amount", value: money(finalAmount), unit: "LKR" },
      ],
      assumptions: [
        "The entered annual rate is nominal and is divided by the selected compounding frequency.",
        "The interest rate remains fixed and interest is reinvested.",
      ],
      warnings: ["Taxes, fees, deposits, and withdrawals are not included."],
    });
  },
});

const dimension = decimalInput({
  min: "0.000001",
  max: 1_000_000_000,
  maxDecimalPlaces: 6,
});

const areaMetadata = {
  key: "area",
  name: "Area calculator",
  shortName: "Area",
  summary: "Calculate rectangular, triangular, or circular area in one unit.",
  category: "Build",
  classification: "static",
  version: "2.0.0",
  accent: "blue",
  fields: [
    {
      name: "shape",
      label: "Shape",
      type: "select",
      required: true,
      defaultValue: "rectangle",
      options: [
        { label: "Rectangle", value: "rectangle" },
        { label: "Triangle", value: "triangle" },
        { label: "Circle", value: "circle" },
      ],
    },
    {
      name: "unit",
      label: "Dimension unit",
      type: "select",
      required: true,
      defaultValue: "metre",
      options: lengthUnitOptions,
    },
    { name: "length", label: "Length", type: "number", required: true, min: 0.000001, max: 1_000_000_000, maxDecimalPlaces: 6, step: 0.000001, visibleWhen: { field: "shape", equals: "rectangle" } },
    { name: "width", label: "Width", type: "number", required: true, min: 0.000001, max: 1_000_000_000, maxDecimalPlaces: 6, step: 0.000001, visibleWhen: { field: "shape", equals: "rectangle" } },
    { name: "base", label: "Base", type: "number", required: true, min: 0.000001, max: 1_000_000_000, maxDecimalPlaces: 6, step: 0.000001, visibleWhen: { field: "shape", equals: "triangle" } },
    { name: "height", label: "Height", type: "number", required: true, min: 0.000001, max: 1_000_000_000, maxDecimalPlaces: 6, step: 0.000001, visibleWhen: { field: "shape", equals: "triangle" } },
    { name: "radius", label: "Radius", type: "number", required: true, min: 0.000001, max: 1_000_000_000, maxDecimalPlaces: 6, step: 0.000001, visibleWhen: { field: "shape", equals: "circle" } },
  ],
} as const satisfies CalculatorMetadata;

const areaSchema = z.discriminatedUnion("shape", [
  z.object({
    shape: z.literal("rectangle"),
    unit: z.enum(lengthUnits),
    length: dimension,
    width: dimension,
  }),
  z.object({
    shape: z.literal("triangle"),
    unit: z.enum(lengthUnits),
    base: dimension,
    height: dimension,
  }),
  z.object({
    shape: z.literal("circle"),
    unit: z.enum(lengthUnits),
    radius: dimension,
  }),
]);

export const areaCalculator = defineCalculator({
  ...areaMetadata,
  schema: areaSchema,
  run(input) {
    let squareMetres;
    let expression;

    if (input.shape === "rectangle") {
      squareMetres = lengthInMetres(input.length, input.unit).mul(
        lengthInMetres(input.width, input.unit),
      );
      expression = `${input.length} x ${input.width} ${input.unit}`;
    } else if (input.shape === "triangle") {
      squareMetres = lengthInMetres(input.base, input.unit)
        .mul(lengthInMetres(input.height, input.unit))
        .div(2);
      expression = `${input.base} x ${input.height} / 2 ${input.unit}`;
    } else {
      squareMetres = lengthInMetres(input.radius, input.unit)
        .pow(2)
        .mul("3.141592653589793238462643383279502884197");
      expression = `pi x ${input.radius}^2 ${input.unit}`;
    }

    const selectedArea = squareMetresInUnit(squareMetres.toString(), input.unit);

    return staticResult(areaMetadata, {
      asOfDate: null,
      normalizedInputs: input,
      result: {
        area: rounded(selectedArea, 6),
        squareMetres: rounded(squareMetres, 6),
      },
      breakdown: [
        {
          label: "Area",
          expression,
          value: rounded(selectedArea, 6),
          unit: squareUnitLabels[input.unit],
        },
        {
          label: "Normalized area",
          value: rounded(squareMetres, 6),
          unit: "m2",
        },
      ],
      assumptions: ["All dimensions use the selected unit."],
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
  version: "2.0.0",
  accent: "rose",
  fields: [
    { name: "principal", label: "Loan amount", type: "number", required: true, min: 0.01, max: 1_000_000_000_000, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR" },
    { name: "annualRatePercent", label: "Nominal annual interest rate", type: "number", required: true, min: 0, max: 100, maxDecimalPlaces: 6, step: 0.000001, suffix: "%" },
    { name: "termMonths", label: "Loan term", type: "number", required: true, min: 1, max: 1200, maxDecimalPlaces: 0, step: 1, suffix: "months" },
  ],
} as const satisfies CalculatorMetadata;

const loanEmiSchema = z.object({
  principal: decimalInput({ min: "0.01", max: 1_000_000_000_000, maxDecimalPlaces: 2 }),
  annualRatePercent: decimalInput({ min: 0, max: 100, maxDecimalPlaces: 6 }),
  termMonths: integerInput({ min: 1, max: 1200 }),
});

export const loanEmiCalculator = defineCalculator({
  ...loanEmiMetadata,
  schema: loanEmiSchema,
  run(input) {
    const principal = decimal(input.principal);
    const monthlyRate = decimal(input.annualRatePercent).div(1200);
    const exactMonthlyPayment = monthlyRate.isZero()
      ? principal.div(input.termMonths)
      : principal
          .mul(monthlyRate)
          .mul(decimal(1).plus(monthlyRate).pow(input.termMonths))
          .div(decimal(1).plus(monthlyRate).pow(input.termMonths).minus(1));
    let monthlyPayment = decimal(money(exactMonthlyPayment));
    const totalPayment = decimal(money(exactMonthlyPayment.mul(input.termMonths)));
    let finalPayment = totalPayment.minus(monthlyPayment.mul(input.termMonths - 1));
    if (input.termMonths > 1 && !finalPayment.isPositive()) {
      monthlyPayment = decimal(moneyRoundedDown(totalPayment.div(input.termMonths)));
      finalPayment = totalPayment.minus(monthlyPayment.mul(input.termMonths - 1));
    }
    const totalInterest = totalPayment.minus(principal);

    return staticResult(loanEmiMetadata, {
      asOfDate: null,
      normalizedInputs: input,
      result: {
        monthlyPayment: money(monthlyPayment),
        finalPayment: money(finalPayment),
        totalPayment: money(totalPayment),
        totalInterest: money(totalInterest),
      },
      breakdown: [
        { label: "Regular monthly installment", value: money(monthlyPayment), unit: "LKR" },
        { label: "Adjusted final installment", value: money(finalPayment), unit: "LKR" },
        { label: "Total interest", value: money(totalInterest), unit: "LKR" },
        { label: "Total repayment", value: money(totalPayment), unit: "LKR" },
      ],
      assumptions: [
        "The entered rate is a nominal annual rate divided by 12 for monthly calculations.",
        "Regular installments are rounded to cents; the final installment is adjusted so displayed payments reconcile with the displayed total.",
        "The interest rate remains fixed for the full term.",
      ],
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
  version: "2.0.0",
  accent: "gold",
  fields: [
    { name: "distance", label: "Distance travelled", type: "number", required: true, min: 0.000001, max: 10_000_000, maxDecimalPlaces: 6, step: 0.000001 },
    { name: "distanceUnit", label: "Distance unit", type: "select", required: true, defaultValue: "kilometre", options: distanceUnitOptions },
    { name: "fuelVolume", label: "Fuel used", type: "number", required: true, min: 0.000001, max: 1_000_000, maxDecimalPlaces: 6, step: 0.000001 },
    { name: "volumeUnit", label: "Fuel unit", type: "select", required: true, defaultValue: "litre", options: volumeUnitOptions },
  ],
} as const satisfies CalculatorMetadata;

const fuelConsumptionSchema = z.object({
  distance: decimalInput({ min: "0.000001", max: 10_000_000, maxDecimalPlaces: 6 }),
  distanceUnit: z.enum(distanceUnits),
  fuelVolume: decimalInput({ min: "0.000001", max: 1_000_000, maxDecimalPlaces: 6 }),
  volumeUnit: z.enum(volumeUnits),
});

export const fuelConsumptionCalculator = defineCalculator({
  ...fuelConsumptionMetadata,
  schema: fuelConsumptionSchema,
  run(input) {
    const distance = distanceInKilometres(input.distance, input.distanceUnit);
    const fuel = volumeInLitres(input.fuelVolume, input.volumeUnit);
    const kilometresPerLitre = distance.div(fuel);
    const litresPerHundredKilometres = fuel.div(distance).mul(100);

    return staticResult(fuelConsumptionMetadata, {
      asOfDate: null,
      normalizedInputs: {
        ...input,
        distanceKilometres: rounded(distance, 6),
        fuelLitres: rounded(fuel, 6),
      },
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
