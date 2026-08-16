import { describe, expect, it } from "vitest";

import { getCalculator } from "@/domain/calculators/registry";
import { solarCostCalculator } from "@/domain/calculators/solar-calculators";
import {
  calculateSolarCost,
  solarAssumptionsPayloadSchema,
  solarCostInputSchema,
  type SolarAssumptionsPayload,
} from "@/domain/calculators/solar/solar-cost";

const solarAssumptionsPayload = {
  solarAssumptions: {
    authority: "sea-solar-atlas-ceb-pucsl-market",
    effectiveFrom: "2026-07-01",
    rounding: "nearest-cent",
    locations: [
      { key: "colombo", label: "Colombo", yieldKwhPerKwPerDay: "4.20" },
      { key: "galle", label: "Galle", yieldKwhPerKwPerDay: "4.20" },
      { key: "kandy", label: "Kandy", yieldKwhPerKwPerDay: "4.10" },
      { key: "nuvara-eliya", label: "Nuwara Eliya", yieldKwhPerKwPerDay: "3.90" },
      { key: "kurunegala", label: "Kurunegala", yieldKwhPerKwPerDay: "4.40" },
      { key: "anuradhapura", label: "Anuradhapura", yieldKwhPerKwPerDay: "4.70" },
      { key: "hambantota", label: "Hambantota", yieldKwhPerKwPerDay: "4.60" },
      { key: "jaffna", label: "Jaffna", yieldKwhPerKwPerDay: "5.20" },
    ],
    defaultSystemCostPerKw: "250000",
    defaultSelfConsumptionPercent: "35",
    defaultRetailRatePerKwh: "48.00",
    defaultExportRatePerKwh: "22.00",
    degradationPercentPerYear: "0.5",
    systemLifeYears: 20,
  },
} satisfies { solarAssumptions: SolarAssumptionsPayload };

describe("regulated solar cost calculator definition", () => {
  it("registers the solar cost calculator for server execution", () => {
    expect(getCalculator("solar-cost")).toMatchObject({
      key: "solar-cost",
      classification: "configurable",
      execution: "server",
    });
  });

  it("exposes the solar assumptions rule dependency", () => {
    expect(solarCostCalculator.ruleDependencies).toEqual([
      { name: "solarAssumptions", key: "solar-assumptions-lk-2026", scope: "lk" },
    ]);
  });

  it("presents the result through the common result contract", () => {
    const result = solarCostCalculator.calculate(
      {
        asOfDate: "2026-08-16",
        systemSizeKw: "5",
        location: "colombo",
        averageMonthlyConsumptionKwh: 450,
        systemCostPerKwOverride: undefined,
        retailRatePerKwhOverride: undefined,
        exportRatePerKwhOverride: undefined,
        loanTermYears: undefined,
        loanAnnualRatePercent: undefined,
      },
      solarAssumptionsPayload,
    );

    expect(result).toMatchObject({
      calculator: "solar-cost",
      asOfDate: "2026-08-16",
      ruleVersions: [],
      sources: [],
      result: {
        locationLabel: "Colombo",
        annualGenerationKwh: "7665",
        systemCost: "1250000.00",
        annualSavingLkr: "238381.50",
        simplePaybackYears: "5.24",
      },
    });
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("solar cost engine", () => {
  it("computes generation, cost, saving, and payback with official defaults", () => {
    const result = calculateSolarCost(
      {
        asOfDate: "2026-08-16",
        systemSizeKw: "5",
        location: "colombo",
        averageMonthlyConsumptionKwh: 450,
        systemCostPerKwOverride: undefined,
        retailRatePerKwhOverride: undefined,
        exportRatePerKwhOverride: undefined,
        loanTermYears: undefined,
        loanAnnualRatePercent: undefined,
      },
      solarAssumptionsPayload.solarAssumptions,
    );

    expect(result).toMatchObject({
      locationLabel: "Colombo",
      yieldKwhPerKwPerDay: "4.2",
      annualYieldKwhPerKw: "1533",
      annualGenerationKwh: "7665",
      monthlyGenerationKwh: "638.75",
      finalYearGenerationKwh: "6968.68",
      officialSystemCostPerKw: "250000.00",
      systemCostPerKw: "250000.00",
      systemCostPerKwSource: "official",
      systemCost: "1250000.00",
      annualConsumptionKwh: "5400",
      selfConsumedKwh: "2682.75",
      exportedKwh: "4982.25",
      importedKwh: "2717.25",
      officialRetailRatePerKwh: "48.00",
      retailRatePerKwh: "48.00",
      retailRateSource: "official",
      officialExportRatePerKwh: "22.00",
      exportRatePerKwh: "22.00",
      exportRateSource: "official",
      annualSavingLkr: "238381.50",
      monthlySavingLkr: "19865.13",
      simplePaybackYears: "5.24",
      twentyYearSavingLkr: "4547819.36",
    });
  });

  it("caps self-consumption at annual usage for oversized systems", () => {
    const result = calculateSolarCost(
      {
        asOfDate: "2026-08-16",
        systemSizeKw: "15",
        location: "anuradhapura",
        averageMonthlyConsumptionKwh: 300,
        systemCostPerKwOverride: undefined,
        retailRatePerKwhOverride: undefined,
        exportRatePerKwhOverride: undefined,
        loanTermYears: undefined,
        loanAnnualRatePercent: undefined,
      },
      solarAssumptionsPayload.solarAssumptions,
    );

    expect(result).toMatchObject({
      locationLabel: "Anuradhapura",
      annualGenerationKwh: "25732.5",
      selfConsumedKwh: "3600",
      exportedKwh: "22132.5",
      importedKwh: "0",
      annualSavingLkr: "659715.00",
      simplePaybackYears: "5.68",
    });
  });

  it("uses user overrides and records the official defaults", () => {
    const result = calculateSolarCost(
      {
        asOfDate: "2026-08-16",
        systemSizeKw: "5",
        location: "colombo",
        averageMonthlyConsumptionKwh: 450,
        systemCostPerKwOverride: 300000,
        retailRatePerKwhOverride: "60.00",
        exportRatePerKwhOverride: "0",
        loanTermYears: undefined,
        loanAnnualRatePercent: undefined,
      },
      solarAssumptionsPayload.solarAssumptions,
    );

    expect(result).toMatchObject({
      officialSystemCostPerKw: "250000.00",
      systemCostPerKw: "300000.00",
      systemCostPerKwSource: "user",
      systemCost: "1500000.00",
      officialRetailRatePerKwh: "48.00",
      retailRatePerKwh: "60.00",
      retailRateSource: "user",
      officialExportRatePerKwh: "22.00",
      exportRatePerKwh: "0.00",
      exportRateSource: "user",
      annualSavingLkr: "160965.00",
      simplePaybackYears: "9.32",
    });
  });

  it("adds financing outputs when a loan is entered", () => {
    const result = calculateSolarCost(
      {
        asOfDate: "2026-08-16",
        systemSizeKw: "5",
        location: "colombo",
        averageMonthlyConsumptionKwh: 450,
        systemCostPerKwOverride: undefined,
        retailRatePerKwhOverride: undefined,
        exportRatePerKwhOverride: undefined,
        loanTermYears: 5,
        loanAnnualRatePercent: "12",
      },
      solarAssumptionsPayload.solarAssumptions,
    );

    expect(result).toMatchObject({
      loanAmountLkr: "1250000.00",
      loanMonthlyPaymentLkr: "27805.56",
      loanTotalPaymentLkr: "1668333.60",
      loanTotalInterestLkr: "418333.60",
      monthlyCashFlowLkr: "-7940.44",
    });
  });

  it("rejects a location absent from the payload", () => {
    expect(() =>
      calculateSolarCost(
        {
          asOfDate: "2026-08-16",
          systemSizeKw: "5",
          location: "jaffna",
          averageMonthlyConsumptionKwh: 450,
          systemCostPerKwOverride: undefined,
          retailRatePerKwhOverride: undefined,
          exportRatePerKwhOverride: undefined,
          loanTermYears: undefined,
          loanAnnualRatePercent: undefined,
        },
        {
          ...solarAssumptionsPayload.solarAssumptions,
          locations: [
            { key: "colombo", label: "Colombo", yieldKwhPerKwPerDay: "4.20" },
          ],
        },
      ),
    ).toThrow(RangeError);
  });

  it("rejects duplicate or overly precise payload values", () => {
    const duplicated = {
      ...solarAssumptionsPayload.solarAssumptions,
      locations: [
        { key: "colombo", label: "Colombo", yieldKwhPerKwPerDay: "4.20" },
        { key: "colombo", label: "Colombo again", yieldKwhPerKwPerDay: "4.20" },
      ],
    };
    expect(() => solarAssumptionsPayloadSchema.parse(duplicated)).toThrow();

    const tooPrecise = {
      ...solarAssumptionsPayload.solarAssumptions,
      defaultRetailRatePerKwh: "48.001",
    };
    expect(() => solarAssumptionsPayloadSchema.parse(tooPrecise)).toThrow();
  });

  it("rejects a one-sided loan through the input schema", () => {
    expect(
      solarCostInputSchema.safeParse({
        asOfDate: "2026-08-16",
        systemSizeKw: "5",
        location: "colombo",
        averageMonthlyConsumptionKwh: 450,
        systemCostPerKwOverride: undefined,
        retailRatePerKwhOverride: undefined,
        exportRatePerKwhOverride: undefined,
        loanTermYears: 5,
        loanAnnualRatePercent: undefined,
      }).success,
    ).toBe(false);
  });

  it("rejects out-of-range input values", () => {
    expect(
      solarCostInputSchema.safeParse({
        asOfDate: "2026-08-16",
        systemSizeKw: "0.4",
        location: "colombo",
        averageMonthlyConsumptionKwh: 450,
        systemCostPerKwOverride: undefined,
        retailRatePerKwhOverride: undefined,
        exportRatePerKwhOverride: undefined,
        loanTermYears: undefined,
        loanAnnualRatePercent: undefined,
      }).success,
    ).toBe(false);
  });
});
