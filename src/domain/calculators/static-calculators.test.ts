import { describe, expect, it } from "vitest";

import {
  ageCalculator,
  areaCalculator,
  compoundInterestCalculator,
  fuelConsumptionCalculator,
  loanEmiCalculator,
  percentageCalculator,
} from "@/domain/calculators/static-calculators";
import { createCalculatorRegistry, getCalculators } from "@/domain/calculators/registry";
import { executeCalculationRequest } from "@/server/api/calculations";

describe("static calculators", () => {
  it("calculates completed age using date-only values", () => {
    const calculation = ageCalculator.calculate({
      dateOfBirth: "2000-02-29",
      asOfDate: "2023-02-28",
    });

    expect(calculation.result.completedYears).toBe(23);
    expect(calculation.asOfDate).toBe("2023-02-28");
    expect(calculation.warnings).toHaveLength(1);
  });

  it("rejects an age calculation before the date of birth", () => {
    expect(() =>
      ageCalculator.calculate({ dateOfBirth: "2020-01-01", asOfDate: "2019-12-31" }),
    ).toThrow();
  });

  it("calculates a percentage with decimal arithmetic", () => {
    const calculation = percentageCalculator.calculate({ percentage: 12.5, value: 800 });

    expect(calculation.result.percentageValue).toBe("100");
  });

  it("calculates compound interest", () => {
    const calculation = compoundInterestCalculator.calculate({
      principal: 100_000,
      annualRatePercent: 10,
      years: 1,
      compoundsPerYear: 12,
    });

    expect(calculation.result.finalAmount).toBe("110471.31");
    expect(calculation.result.totalInterest).toBe("10471.31");
  });

  it("preserves cents at the maximum documented compound-interest magnitude", () => {
    const calculation = compoundInterestCalculator.calculate({
      principal: "999999999999.99",
      annualRatePercent: "100",
      years: "100",
      compoundsPerYear: "1",
    });

    expect(calculation.result.finalAmount).toBe(
      "1267650600228216724990700923081985032967946.24",
    );
  });

  it.each([
    [{ shape: "rectangle", unit: "metre", length: 10, width: 5 }, "50"],
    [{ shape: "triangle", unit: "metre", base: 10, height: 5 }, "25"],
    [{ shape: "circle", unit: "metre", radius: 2 }, "12.566371"],
  ])("calculates area for %#", (input, expectedArea) => {
    const calculation = areaCalculator.calculate(input);

    expect(calculation.result.area).toBe(expectedArea);
  });

  it("calculates a fixed-rate loan installment", () => {
    const calculation = loanEmiCalculator.calculate({
      principal: 1_000_000,
      annualRatePercent: 12,
      termMonths: 12,
    });

    expect(calculation.result.monthlyPayment).toBe("88848.79");
    expect(calculation.result.finalPayment).toBe("88848.77");
    expect(calculation.result.totalPayment).toBe("1066185.46");
    expect(calculation.result.totalInterest).toBe("66185.46");
    expect(
      Number(calculation.result.monthlyPayment) * 11 + Number(calculation.result.finalPayment),
    ).toBe(Number(calculation.result.totalPayment));
  });

  it("handles a zero-interest loan", () => {
    const calculation = loanEmiCalculator.calculate({
      principal: 120_000,
      annualRatePercent: 0,
      termMonths: 12,
    });

    expect(calculation.result.monthlyPayment).toBe("10000.00");
    expect(calculation.result.finalPayment).toBe("10000.00");
    expect(calculation.result.totalInterest).toBe("0.00");
  });

  it("never produces a negative final installment for a tiny long-term loan", () => {
    const calculation = loanEmiCalculator.calculate({
      principal: "6.00",
      annualRatePercent: 0,
      termMonths: 1200,
    });

    expect(calculation.result.monthlyPayment).toBe("0.00");
    expect(calculation.result.finalPayment).toBe("6.00");
  });

  it("calculates both fuel-efficiency conventions", () => {
    const calculation = fuelConsumptionCalculator.calculate({
      distance: 500,
      distanceUnit: "kilometre",
      fuelVolume: 40,
      volumeUnit: "litre",
    });

    expect(calculation.result.kilometresPerLitre).toBe("12.5");
    expect(calculation.result.litresPerHundredKilometres).toBe("8");
  });

  it("normalizes imperial area and fuel inputs", () => {
    const area = areaCalculator.calculate({
      shape: "rectangle",
      unit: "foot",
      length: 10,
      width: 10,
    });
    const fuel = fuelConsumptionCalculator.calculate({
      distance: 100,
      distanceUnit: "mile",
      fuelVolume: 4,
      volumeUnit: "imperial-gallon",
    });

    expect(area.result.area).toBe("100");
    expect(area.result.squareMetres).toBe("9.290304");
    expect(fuel.result.kilometresPerLitre).toBe("8.85");
    expect(fuel.result.litresPerHundredKilometres).toBe("11.299");
    expect(fuel.normalizedInputs).toMatchObject({
      distanceKilometres: "160.9344",
      fuelLitres: "18.18436",
    });
  });

  it.each(["", null, true, [250], { value: 250 }])(
    "rejects an invalid numeric input: %j",
    (value) => {
      expect(() => percentageCalculator.calculate({ percentage: value, value: 250 })).toThrow();
    },
  );

  it("rejects numeric extremes outside practical calculator bounds", () => {
    expect(() =>
      fuelConsumptionCalculator.calculate({
        distance: 5e-324,
        distanceUnit: "kilometre",
        fuelVolume: 1_000_000,
        volumeUnit: "litre",
      }),
    ).toThrow();
  });

  it.each([
    [percentageCalculator, { percentage: "1000000.000000000001", value: "1" }],
    [percentageCalculator, { percentage: "1", value: "1000000000000.000000000001" }],
    [compoundInterestCalculator, { principal: "1.001", annualRatePercent: "1", years: "1", compoundsPerYear: "1" }],
    [compoundInterestCalculator, { principal: "1", annualRatePercent: "100.000001", years: "1", compoundsPerYear: "1" }],
    [compoundInterestCalculator, { principal: "1", annualRatePercent: "1", years: "100.0001", compoundsPerYear: "1" }],
    [compoundInterestCalculator, { principal: "1", annualRatePercent: "1", years: "1", compoundsPerYear: "2" }],
    [areaCalculator, { shape: "rectangle", unit: "metre", length: "0", width: "1" }],
    [areaCalculator, { shape: "rectangle", unit: "metre", length: "1", width: "0" }],
    [areaCalculator, { shape: "triangle", unit: "metre", base: "0", height: "1" }],
    [areaCalculator, { shape: "triangle", unit: "metre", base: "1", height: "1000000000.000001" }],
    [areaCalculator, { shape: "circle", unit: "metre", radius: "1.0000001" }],
    [loanEmiCalculator, { principal: "0", annualRatePercent: "1", termMonths: 12 }],
    [loanEmiCalculator, { principal: "1", annualRatePercent: "100.000001", termMonths: 12 }],
    [loanEmiCalculator, { principal: "1", annualRatePercent: "1", termMonths: 1200.5 }],
    [fuelConsumptionCalculator, { distance: "0", distanceUnit: "kilometre", fuelVolume: "1", volumeUnit: "litre" }],
    [fuelConsumptionCalculator, { distance: "1", distanceUnit: "kilometre", fuelVolume: "1000000.000001", volumeUnit: "litre" }],
  ])("rejects out-of-contract numeric boundaries for %#", (calculator, input) => {
    expect(() => calculator.calculate(input)).toThrow();
  });

  it.each([
    [percentageCalculator, { percentage: "-1000000", value: "1000000000000" }],
    [compoundInterestCalculator, { principal: "0", annualRatePercent: "0", years: "0", compoundsPerYear: "1" }],
    [compoundInterestCalculator, { principal: "1000000000000", annualRatePercent: "100", years: "100", compoundsPerYear: "365" }],
    [areaCalculator, { shape: "rectangle", unit: "metre", length: "0.000001", width: "1000000000" }],
    [areaCalculator, { shape: "triangle", unit: "metre", base: "1000000000", height: "0.000001" }],
    [areaCalculator, { shape: "circle", unit: "metre", radius: "1000000000" }],
    [loanEmiCalculator, { principal: "0.01", annualRatePercent: "0", termMonths: 1 }],
    [loanEmiCalculator, { principal: "1000000000000", annualRatePercent: "100", termMonths: 1200 }],
    [fuelConsumptionCalculator, { distance: "0.000001", distanceUnit: "kilometre", fuelVolume: "1000000", volumeUnit: "litre" }],
    [fuelConsumptionCalculator, { distance: "10000000", distanceUnit: "mile", fuelVolume: "0.000001", volumeUnit: "us-gallon" }],
  ])("accepts inclusive numeric boundaries for %#", (calculator, input) => {
    expect(() => calculator.calculate(input)).not.toThrow();
  });

  it("rejects surrounding whitespace in numeric inputs", () => {
    expect(() => percentageCalculator.calculate({ percentage: " 12.5 ", value: "800" })).toThrow();
  });

  it("ignores inactive area dimensions", () => {
    const calculation = areaCalculator.calculate({
      shape: "circle",
      unit: "metre",
      radius: "2",
      length: "not-a-number",
      width: "not-a-number",
    });

    expect(calculation.result.area).toBe("12.566371");
    expect(calculation.normalizedInputs).toEqual({ shape: "circle", unit: "metre", radius: "2" });
  });

  it.each([
    ["age", ageCalculator, { dateOfBirth: "2000-02-29", asOfDate: "2023-02-28" }, { completedYears: 23, totalDays: 8400 }],
    ["age", ageCalculator, { dateOfBirth: "2024-01-01", asOfDate: "2024-01-01" }, { completedYears: 0, totalDays: 0 }],
    ["percentage", percentageCalculator, { percentage: "12.5", value: "800" }, { percentageValue: "100" }],
    ["percentage", percentageCalculator, { percentage: "-25", value: "80" }, { percentageValue: "-20" }],
    ["percentage", percentageCalculator, { percentage: "33.333333", value: "3" }, { percentageValue: "1" }],
    ["compound-interest", compoundInterestCalculator, { principal: "100000", annualRatePercent: "10", years: "1", compoundsPerYear: "12" }, { finalAmount: "110471.31", totalInterest: "10471.31" }],
    ["compound-interest", compoundInterestCalculator, { principal: "1234.56", annualRatePercent: "10", years: "0", compoundsPerYear: "12" }, { finalAmount: "1234.56", totalInterest: "0.00" }],
    ["area", areaCalculator, { shape: "rectangle", unit: "metre", length: "10", width: "5" }, { area: "50", squareMetres: "50" }],
    ["area", areaCalculator, { shape: "triangle", unit: "foot", base: "10", height: "5" }, { area: "25", squareMetres: "2.322576" }],
    ["area", areaCalculator, { shape: "circle", unit: "centimetre", radius: "2" }, { area: "12.566371", squareMetres: "0.001257" }],
    ["area", areaCalculator, { shape: "rectangle", unit: "foot", length: "1", width: "1" }, { area: "1", squareMetres: "0.092903" }],
    ["loan-emi", loanEmiCalculator, { principal: "1000000", annualRatePercent: "12", termMonths: 12 }, { monthlyPayment: "88848.79", finalPayment: "88848.77", totalPayment: "1066185.46", totalInterest: "66185.46" }],
    ["loan-emi", loanEmiCalculator, { principal: "120000", annualRatePercent: "0", termMonths: 12 }, { monthlyPayment: "10000.00", finalPayment: "10000.00", totalPayment: "120000.00", totalInterest: "0.00" }],
    ["fuel-consumption", fuelConsumptionCalculator, { distance: "500", distanceUnit: "kilometre", fuelVolume: "40", volumeUnit: "litre" }, { kilometresPerLitre: "12.5", litresPerHundredKilometres: "8" }],
    ["fuel-consumption", fuelConsumptionCalculator, { distance: "300", distanceUnit: "mile", fuelVolume: "10", volumeUnit: "us-gallon" }, { kilometresPerLitre: "12.754", litresPerHundredKilometres: "7.84" }],
    ["fuel-consumption", fuelConsumptionCalculator, { distance: "100", distanceUnit: "mile", fuelVolume: "5", volumeUnit: "imperial-gallon" }, { kilometresPerLitre: "7.08", litresPerHundredKilometres: "14.124" }],
  ])("matches the approved fixture through the domain and API for %s", (key, calculator, input, expected) => {
    const direct = calculator.calculate(input);
    const api = executeCalculationRequest(key, input);

    expect(direct.result).toMatchObject(expected);
    expect(api).toEqual({ status: 200, body: direct });
  });

  it("rejects duplicate registry keys", () => {
    expect(() => createCalculatorRegistry([ageCalculator, ageCalculator])).toThrow(
      "Duplicate calculator key 'age'.",
    );
  });

  it("publishes complete constraints for numeric fields", () => {
    const numericFields = getCalculators().flatMap((calculator) =>
      calculator.fields.filter((field) => field.type === "number"),
    );

    for (const field of numericFields) {
      expect(field.required, field.name).toBe(true);
      expect(field.min, field.name).toBeTypeOf("number");
      expect(field.max, field.name).toBeTypeOf("number");
      expect(field.maxDecimalPlaces, field.name).toBeTypeOf("number");
      expect(field.step, field.name).toBeTypeOf("number");
    }
  });

  it("publishes the supported date range for age inputs", () => {
    for (const field of ageCalculator.fields) {
      expect(field.min).toBe("0100-01-01");
      expect(field.max).toBe("9999-12-31");
    }
  });
});
