import { describe, expect, it } from "vitest";

import {
  ageCalculator,
  areaCalculator,
  compoundInterestCalculator,
  fuelConsumptionCalculator,
  loanEmiCalculator,
  percentageCalculator,
} from "@/domain/calculators/static-calculators";

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

    expect(calculation.result.percentageValue).toBe(100);
  });

  it("calculates compound interest", () => {
    const calculation = compoundInterestCalculator.calculate({
      principal: 100_000,
      annualRatePercent: 10,
      years: 1,
      compoundsPerYear: 12,
    });

    expect(calculation.result.finalAmount).toBe(110_471.31);
    expect(calculation.result.totalInterest).toBe(10_471.31);
  });

  it.each([
    [{ shape: "rectangle", length: 10, width: 5 }, 50],
    [{ shape: "triangle", base: 10, height: 5 }, 25],
    [{ shape: "circle", radius: 2 }, 12.566371],
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

    expect(calculation.result.monthlyPayment).toBe(88_848.79);
    expect(calculation.result.totalPayment).toBe(1_066_185.46);
    expect(calculation.result.totalInterest).toBe(66_185.46);
  });

  it("handles a zero-interest loan", () => {
    const calculation = loanEmiCalculator.calculate({
      principal: 120_000,
      annualRatePercent: 0,
      termMonths: 12,
    });

    expect(calculation.result.monthlyPayment).toBe(10_000);
    expect(calculation.result.totalInterest).toBe(0);
  });

  it("calculates both fuel-efficiency conventions", () => {
    const calculation = fuelConsumptionCalculator.calculate({
      distanceKilometres: 500,
      fuelLitres: 40,
    });

    expect(calculation.result.kilometresPerLitre).toBe(12.5);
    expect(calculation.result.litresPerHundredKilometres).toBe(8);
  });
});
