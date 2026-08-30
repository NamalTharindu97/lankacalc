import { describe, expect, it } from "vitest";

import {
  electricityBillCalculator,
  electricityNonDomesticBillCalculator,
} from "@/domain/calculators/electricity-calculators";
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

  it.each([
    [30, "0-60", "150.00", "80.00", "235.75"],
    [31, "0-60", "159.00", "210.00", "378.23"],
    [60, "0-60", "420.00", "210.00", "645.75"],
    [61, "61-180", "860.00", "400.00", "1291.50"],
    [90, "61-180", "1440.00", "400.00", "1886.00"],
    [91, "61-180", "1468.00", "1000.00", "2529.70"],
    [120, "61-180", "2280.00", "1000.00", "3362.00"],
    [121, "61-180", "2324.00", "1500.00", "3919.60"],
    [180, "61-180", "4920.00", "1500.00", "6580.50"],
    [181, "above 180", "5950.00", "2500.00", "8661.25"],
  ])("bills the %i-unit tariff transition", (unitsConsumed, category, energyCharge, fixedCharge, totalPayable) => {
    const result = electricityBillCalculator.calculate(
      { asOfDate: "2026-08-14", unitsConsumed, billingDays: 30 },
      electricityPayloads,
    );

    expect(result.result).toMatchObject({ category, energyCharge, fixedCharge, totalPayable });
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

const nonDomesticPayload = {
  provider: "ceb",
  standardBillingDays: 30,
  sscLPercent: "2.5",
  rounding: "half-up-cent",
  categories: {
    religious: {
      structure: "block",
      categories: [
        {
          maxUnits: 180,
          blocks: [
            { minUnits: 0, maxUnits: 30, energyRatePerKwh: "4.5", fixedCharge: "75" },
            { minUnits: 30, maxUnits: 90, energyRatePerKwh: "4.5", fixedCharge: "200" },
            { minUnits: 90, maxUnits: 120, energyRatePerKwh: "8", fixedCharge: "350" },
            { minUnits: 120, maxUnits: 180, energyRatePerKwh: "19", fixedCharge: "1300" },
          ],
        },
        {
          maxUnits: null,
          blocks: [
            { minUnits: 0, maxUnits: 180, energyRatePerKwh: "11.8", fixedCharge: "0" },
            { minUnits: 180, maxUnits: null, energyRatePerKwh: "35", fixedCharge: "2000" },
          ],
        },
      ],
    },
    "gp-1": {
      structure: "v-dmc",
      thresholdUnits: 180,
      lowTier: { energyRatePerKwh: "27", fixedCharge: "500" },
      highTier: { energyRatePerKwh: "36", fixedCharge: "1600" },
    },
    "ip-1": {
      structure: "v-dmc",
      thresholdUnits: 300,
      lowTier: { energyRatePerKwh: "9", fixedCharge: "300" },
      highTier: { energyRatePerKwh: "18", fixedCharge: "800" },
    },
    "h-1": {
      structure: "v-dmc",
      thresholdUnits: 300,
      lowTier: { energyRatePerKwh: "9", fixedCharge: "300" },
      highTier: { energyRatePerKwh: "18", fixedCharge: "800" },
    },
    "gv-1": {
      structure: "v-dmc",
      thresholdUnits: 180,
      lowTier: { energyRatePerKwh: "34.5", fixedCharge: "600" },
      highTier: { energyRatePerKwh: "45", fixedCharge: "1900" },
    },
    "gp-2": {
      structure: "tou",
      peakRatePerKwh: "77",
      dayRatePerKwh: "49",
      offPeakRatePerKwh: "39",
      fixedCharge: "6000",
      demandChargePerKva: "1800",
    },
    "ip-2": {
      structure: "tou",
      peakRatePerKwh: "38",
      dayRatePerKwh: "18",
      offPeakRatePerKwh: "15.5",
      fixedCharge: "6000",
      demandChargePerKva: "1650",
    },
    "h-2": {
      structure: "tou",
      peakRatePerKwh: "38",
      dayRatePerKwh: "18",
      offPeakRatePerKwh: "15.5",
      fixedCharge: "6000",
      demandChargePerKva: "1650",
    },
    "gv-2": {
      structure: "tou",
      peakRatePerKwh: "77",
      dayRatePerKwh: "53",
      offPeakRatePerKwh: "39",
      fixedCharge: "6000",
      demandChargePerKva: "1800",
    },
    "gp-3": {
      structure: "tou",
      peakRatePerKwh: "77",
      dayRatePerKwh: "49",
      offPeakRatePerKwh: "39",
      fixedCharge: "6000",
      demandChargePerKva: "1700",
    },
    "ip-3": {
      structure: "tou",
      peakRatePerKwh: "38",
      dayRatePerKwh: "18",
      offPeakRatePerKwh: "15.5",
      fixedCharge: "6000",
      demandChargePerKva: "1600",
    },
    "h-3": {
      structure: "tou",
      peakRatePerKwh: "38",
      dayRatePerKwh: "18",
      offPeakRatePerKwh: "15.5",
      fixedCharge: "6000",
      demandChargePerKva: "1600",
    },
    "gv-3": {
      structure: "tou",
      peakRatePerKwh: "77",
      dayRatePerKwh: "53",
      offPeakRatePerKwh: "39",
      fixedCharge: "6000",
      demandChargePerKva: "1700",
    },
    "street-lighting": {
      structure: "single-rate",
      energyRatePerKwh: "60",
      fixedCharge: "0",
    },
    "agriculture-tou": {
      structure: "tou",
      peakRatePerKwh: "28",
      dayRatePerKwh: "14",
      offPeakRatePerKwh: "8",
      fixedCharge: "750",
      demandChargePerKva: null,
    },
    "evcs-1": {
      structure: "tou",
      peakRatePerKwh: "70",
      dayRatePerKwh: "15",
      offPeakRatePerKwh: "31",
      fixedCharge: "1600",
      demandChargePerKva: null,
    },
    "evcs-2": {
      structure: "tou",
      peakRatePerKwh: "70",
      dayRatePerKwh: "15",
      offPeakRatePerKwh: "31",
      fixedCharge: "5000",
      demandChargePerKva: "1500",
    },
  },
} as const;

const nonDomesticPayloads = {
  electricity: nonDomesticPayload,
} as const;

describe("regulated non-domestic electricity calculator definition", () => {
  it("registers the non-domestic electricity bill calculator for server execution", () => {
    expect(getCalculator("electricity-non-domestic-bill")).toMatchObject({
      key: "electricity-non-domestic-bill",
      classification: "regulated",
      execution: "server",
    });
  });

  it("exposes the non-domestic standard rule dependency", () => {
    expect(electricityNonDomesticBillCalculator.ruleDependencies).toEqual([
      { name: "electricity", key: "electricity-non-domestic-standard", scope: "standard" },
    ]);
  });

  it("presents a time-of-use bill through the common result contract", () => {
    const result = electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "gp-2", dayUnits: 800, peakUnits: 400, offPeakUnits: 300, billedDemandKva: 50 },
      nonDomesticPayloads,
    );

    expect(result).toMatchObject({
      calculator: "electricity-non-domestic-bill",
      asOfDate: "2026-08-14",
      ruleVersions: [],
      sources: [],
      result: {
        category: "General purpose GP-2 (Rate 2)",
        categoryKey: "gp-2",
        structure: "tou",
        energyCharge: "81700.00",
        demandCharge: "90000.00",
        fixedCharge: "6000.00",
        tariffCharge: "177700.00",
        sscLAmount: "4442.50",
        totalPayable: "182142.50",
      },
    });
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.breakdown.some((item) => item.label === "Demand charge")).toBe(true);
    expect(result.assumptions.some((note) => note.includes("05:30-18:30"))).toBe(true);
  });
});

describe("non-domestic electricity bill engine", () => {
  it("bills the restructured religious above-180 category", () => {
    const result = electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "religious", unitsConsumed: 200, billingDays: 30 },
      nonDomesticPayloads,
    );

    expect(result.result).toMatchObject({
      category: "Religious & charitable",
      tier: "above 180",
      energyCharge: "2824.00",
      fixedCharge: "2000.00",
      tariffCharge: "4824.00",
      sscLAmount: "120.60",
      totalPayable: "4944.60",
    });
  });

  it("bills religious consumption within the 0-180 blocks", () => {
    const result = electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "religious", unitsConsumed: 150, billingDays: 30 },
      nonDomesticPayloads,
    );

    expect(result.result).toMatchObject({
      tier: "0-180",
      energyCharge: "1215.00",
      fixedCharge: "1300.00",
      tariffCharge: "2515.00",
      sscLAmount: "62.88",
      totalPayable: "2577.88",
    });
  });

  it("applies the gp-1 low tier at the volume-differentiation boundary", () => {
    const result = electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "gp-1", unitsConsumed: 180, billingDays: 30 },
      nonDomesticPayloads,
    );

    expect(result.result).toMatchObject({
      tier: "Tier 1 (≤ 180 kWh/month)",
      energyCharge: "4860.00",
      fixedCharge: "500.00",
      totalPayable: "5494.00",
    });
  });

  it("applies the gp-1 high tier to all units above the boundary", () => {
    const result = electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "gp-1", unitsConsumed: 181, billingDays: 30 },
      nonDomesticPayloads,
    );

    expect(result.result).toMatchObject({
      tier: "Tier 2 (> 180 kWh/month)",
      energyCharge: "6516.00",
      fixedCharge: "1600.00",
      totalPayable: "8318.90",
    });
  });

  it("bills government rate 1 with the increased tier", () => {
    const result = electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "gv-1", unitsConsumed: 200, billingDays: 30 },
      nonDomesticPayloads,
    );

    expect(result.result).toMatchObject({
      tier: "Tier 2 (> 180 kWh/month)",
      energyCharge: "9000.00",
      fixedCharge: "1900.00",
      totalPayable: "11172.50",
    });
  });

  it("bills a rate 2 general-purpose time-of-use bill with a demand charge", () => {
    const result = electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "gp-2", dayUnits: 800, peakUnits: 400, offPeakUnits: 300, billedDemandKva: 50 },
      nonDomesticPayloads,
    );

    expect(result.result).toMatchObject({
      structure: "tou",
      energyCharge: "81700.00",
      demandCharge: "90000.00",
      fixedCharge: "6000.00",
      tariffCharge: "177700.00",
      totalPayable: "182142.50",
    });
  });

  it("bills a rate 3 industrial time-of-use bill at 11 kV", () => {
    const result = electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "ip-3", dayUnits: 1000, peakUnits: 500, offPeakUnits: 500, billedDemandKva: 100 },
      nonDomesticPayloads,
    );

    expect(result.result).toMatchObject({
      structure: "tou",
      energyCharge: "44750.00",
      demandCharge: "160000.00",
      fixedCharge: "6000.00",
      totalPayable: "216018.75",
    });
  });

  it("bills street lighting at the single energy rate", () => {
    const result = electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "street-lighting", unitsConsumed: 500 },
      nonDomesticPayloads,
    );

    expect(result.result).toMatchObject({
      structure: "single-rate",
      energyCharge: "30000.00",
      fixedCharge: "0.00",
      totalPayable: "30750.00",
    });
  });

  it("bills agriculture on the optional time-of-use tariff", () => {
    const result = electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "agriculture-tou", dayUnits: 1000, peakUnits: 200, offPeakUnits: 500 },
      nonDomesticPayloads,
    );

    expect(result.result).toMatchObject({
      structure: "tou",
      energyCharge: "23600.00",
      fixedCharge: "750.00",
      demandCharge: "0.00",
      totalPayable: "24958.75",
    });
  });

  it("charges EVCS-1 off-peak units at the approved rate", () => {
    const result = electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "evcs-1", dayUnits: 100, peakUnits: 50, offPeakUnits: 200 },
      nonDomesticPayloads,
    );

    expect(result.result).toMatchObject({
      structure: "tou",
      energyCharge: "11200.00",
      fixedCharge: "1600.00",
      totalPayable: "13120.00",
    });
  });

  it("charges EVCS-2 with a demand charge", () => {
    const result = electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "evcs-2", dayUnits: 100, peakUnits: 50, offPeakUnits: 200, billedDemandKva: 30 },
      nonDomesticPayloads,
    );

    expect(result.result).toMatchObject({
      structure: "tou",
      energyCharge: "11200.00",
      demandCharge: "45000.00",
      fixedCharge: "5000.00",
      totalPayable: "62730.00",
    });
  });

  it("rejects a time-of-use bill without the window unit values", () => {
    expect(() => electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "gp-2", dayUnits: 800, peakUnits: 400, billedDemandKva: 50 },
      nonDomesticPayloads,
    )).toThrow("Enter the off-peak (22:30-05:30) units for a time-of-use tariff.");
  });

  it("rejects a demand value for a tariff without a demand charge", () => {
    expect(() => electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "agriculture-tou", dayUnits: 1000, peakUnits: 200, offPeakUnits: 500, billedDemandKva: 50 },
      nonDomesticPayloads,
    )).toThrow("The billed demand is not used for this tariff.");
  });

  it("rejects a volume-differentiated bill without the units consumed", () => {
    expect(() => electricityNonDomesticBillCalculator.calculate(
      { asOfDate: "2026-08-14", category: "gp-1", billingDays: 30 },
      nonDomesticPayloads,
    )).toThrow("Enter the units consumed for this tariff.");
  });
});
