import { describe, expect, it } from "vitest";

import { electricityBillCalculator } from "@/domain/calculators/electricity-calculators";
import { getCalculator } from "@/domain/calculators/registry";

const electricityPayloads = {
  electricity: {
    provider: "ceb",
    standardBillingDays: 30,
    domesticCategories: [
      {
        maxUnits: 60,
        blocks: [
          { minUnits: 0, maxUnits: 30, energyRatePerKwh: "5", fixedCharge: "80" },
          { minUnits: 30, maxUnits: 60, energyRatePerKwh: "9", fixedCharge: "210" },
        ],
      },
      {
        maxUnits: 180,
        blocks: [
          { minUnits: 0, maxUnits: 60, energyRatePerKwh: "14", fixedCharge: "0" },
          { minUnits: 60, maxUnits: 90, energyRatePerKwh: "20", fixedCharge: "400" },
          { minUnits: 90, maxUnits: 120, energyRatePerKwh: "28", fixedCharge: "1000" },
          { minUnits: 120, maxUnits: 180, energyRatePerKwh: "44", fixedCharge: "1500" },
        ],
      },
      {
        maxUnits: null,
        blocks: [
          { minUnits: 0, maxUnits: 180, energyRatePerKwh: "32.5", fixedCharge: "0" },
          { minUnits: 180, maxUnits: null, energyRatePerKwh: "100", fixedCharge: "2500" },
        ],
      },
    ],
    sscLPercent: "2.5",
    rounding: "half-up-cent",
  },
} as const;

describe("regulated electricity calculator definition", () => {
  it("registers the electricity bill calculator for server execution", () => {
    expect(getCalculator("electricity-bill")).toMatchObject({
      key: "electricity-bill",
      classification: "regulated",
      execution: "server",
    });
  });

  it("exposes the domestic standard rule dependency", () => {
    expect(electricityBillCalculator.ruleDependencies).toEqual([
      { name: "electricity", key: "electricity-domestic-standard", scope: "standard" },
    ]);
  });

  it("presents the bill through the common result contract", () => {
    const result = electricityBillCalculator.calculate(
      { asOfDate: "2026-08-14", unitsConsumed: 100, billingDays: 30 },
      electricityPayloads,
    );

    expect(result).toMatchObject({
      calculator: "electricity-bill",
      asOfDate: "2026-08-14",
      ruleVersions: [],
      sources: [],
      normalizedInputs: { unitsConsumed: 100, billingDays: 30 },
      result: {
        unitsConsumed: 100,
        billingDays: 30,
        category: "61-180",
        energyCharge: "1720.00",
        fixedCharge: "1000.00",
        tariffCharge: "2720.00",
        sscLRatePercent: "2.5",
        sscLAmount: "68.00",
        totalPayable: "2788.00",
      },
    });
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });
});

describe("domestic electricity bill engine", () => {
  it("bills a low-consumption 30-day bill across both low-user blocks", () => {
    const result = electricityBillCalculator.calculate(
      { asOfDate: "2026-08-14", unitsConsumed: 40, billingDays: 30 },
      electricityPayloads,
    );

    expect(result.result).toMatchObject({
      category: "0-60",
      energyCharge: "240.00",
      fixedCharge: "210.00",
      tariffCharge: "450.00",
      sscLAmount: "11.25",
      totalPayable: "461.25",
    });
  });

  it("applies the second fixed-charge tier at exactly the 60-unit boundary", () => {
    const result = electricityBillCalculator.calculate(
      { asOfDate: "2026-08-14", unitsConsumed: 60, billingDays: 30 },
      electricityPayloads,
    );

    expect(result.result).toMatchObject({
      category: "0-60",
      energyCharge: "420.00",
      fixedCharge: "210.00",
      tariffCharge: "630.00",
      sscLAmount: "15.75",
      totalPayable: "645.75",
    });
  });

  it("moves into the 61-180 category from 61 units", () => {
    const result = electricityBillCalculator.calculate(
      { asOfDate: "2026-08-14", unitsConsumed: 61, billingDays: 30 },
      electricityPayloads,
    );

    expect(result.result).toMatchObject({
      category: "61-180",
      energyCharge: "860.00",
      fixedCharge: "400.00",
      tariffCharge: "1260.00",
      sscLAmount: "31.50",
      totalPayable: "1291.50",
    });
  });

  it("bills the open-ended high-consumption category", () => {
    const result = electricityBillCalculator.calculate(
      { asOfDate: "2026-08-14", unitsConsumed: 210, billingDays: 30 },
      electricityPayloads,
    );

    expect(result.result).toMatchObject({
      category: "above 180",
      energyCharge: "8850.00",
      fixedCharge: "2500.00",
      tariffCharge: "11350.00",
      sscLAmount: "283.75",
      totalPayable: "11633.75",
    });
  });

  it("charges the minimum fixed charge even for zero units", () => {
    const result = electricityBillCalculator.calculate(
      { asOfDate: "2026-08-14", unitsConsumed: 0, billingDays: 30 },
      electricityPayloads,
    );

    expect(result.result).toMatchObject({
      category: "0-60",
      energyCharge: "0.00",
      fixedCharge: "80.00",
      tariffCharge: "80.00",
      sscLAmount: "2.00",
      totalPayable: "82.00",
    });
  });

  it("prorates block limits from the billing period against the standard cycle", () => {
    const result = electricityBillCalculator.calculate(
      { asOfDate: "2026-08-14", unitsConsumed: 62, billingDays: 31 },
      electricityPayloads,
    );

    expect(result.result).toMatchObject({
      category: "0-60",
      energyCharge: "434.00",
      fixedCharge: "210.00",
      tariffCharge: "644.00",
      sscLAmount: "16.10",
      totalPayable: "660.10",
    });
  });

  it("rejects a malformed payload with overlapping category boundaries", () => {
    const malformed = {
      ...electricityPayloads.electricity,
      domesticCategories: [
        { maxUnits: 180, blocks: [{ minUnits: 0, maxUnits: 180, energyRatePerKwh: "32.5", fixedCharge: "0" }] },
        { maxUnits: 60, blocks: [{ minUnits: 0, maxUnits: 60, energyRatePerKwh: "5", fixedCharge: "80" }] },
      ],
    };
    expect(() => electricityBillCalculator.calculate(
      { asOfDate: "2026-08-14", unitsConsumed: 100, billingDays: 30 },
      { electricity: malformed },
    )).toThrow();
  });

  it("rejects input outside the supported billing period", () => {
    expect(() => electricityBillCalculator.calculate(
      { asOfDate: "2026-08-14", unitsConsumed: 100, billingDays: 10 },
      electricityPayloads,
    )).toThrow("Value must be at least 15.");
  });
});
