import { describe, expect, it } from "vitest";

import { getCalculator } from "@/domain/calculators/registry";
import { businessIncomeTaxCalculator } from "@/domain/calculators/business-tax-calculators";
import {
  businessIncomeTaxInputSchema,
  businessIncomeTaxPayloadSchema,
  calculateBusinessIncomeTax,
  type BusinessIncomeTaxPayload,
} from "@/domain/calculators/business-tax/business-income-tax";

const businessIncomeTaxPayload = {
  businessIncomeTax: {
    authority: "ird-income-tax-2025",
    effectiveFrom: "2025-04-01",
    yearOfAssessment: "2025/26",
    rounding: "nearest-rupee",
    personalRelief: "1800000",
    individualBrackets: [
      { upTo: "1000000", ratePercent: "6" },
      { upTo: "1500000", ratePercent: "18" },
      { upTo: "2000000", ratePercent: "24" },
      { upTo: "2500000", ratePercent: "30" },
      { upTo: null, ratePercent: "36" },
    ],
    partnershipExemptAmount: "1000000",
    partnershipRatePercent: "6",
    companyRatePercent: "30",
  },
} satisfies { businessIncomeTax: BusinessIncomeTaxPayload };

const individualBaseInput = {
  asOfDate: "2026-08-16",
  taxpayerCategory: "individual-sole-proprietor",
  businessIncome: 3000000,
  allowableExpenses: 200000,
  capitalAllowances: undefined,
  personalReliefOverride: undefined,
} as const;

describe("regulated business income tax calculator definition", () => {
  it("registers the calculator for server execution", () => {
    expect(getCalculator("business-income-tax")).toMatchObject({
      key: "business-income-tax",
      classification: "regulated",
      execution: "server",
    });
  });

  it("exposes the business income tax rule dependency", () => {
    expect(businessIncomeTaxCalculator.ruleDependencies).toEqual([
      { name: "businessIncomeTax", key: "business-income-tax-lk-2026", scope: "lk" },
    ]);
  });

  it("presents the result through the common result contract", () => {
    const result = businessIncomeTaxCalculator.calculate(
      { ...individualBaseInput },
      businessIncomeTaxPayload,
    );

    expect(result).toMatchObject({
      calculator: "business-income-tax",
      asOfDate: "2026-08-16",
      ruleVersions: [],
      sources: [],
      result: {
        taxpayerCategoryLabel: "Individual sole proprietor",
        yearOfAssessment: "2025/26",
        taxableIncome: "1000000",
        incomeTax: "60000.00",
      },
    });
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("business income tax engine", () => {
  it("applies official relief and the first individual band", () => {
    const result = calculateBusinessIncomeTax(
      { ...individualBaseInput },
      businessIncomeTaxPayload.businessIncomeTax,
    );

    expect(result).toMatchObject({
      taxpayerCategoryLabel: "Individual sole proprietor",
      businessIncome: "3000000",
      allowableExpenses: "200000",
      totalDeductions: "200000",
      taxableIncomeBeforeRelief: "2800000",
      personalRelief: "1800000",
      personalReliefSource: "official",
      taxableIncome: "1000000",
      taxBands: [{ label: "First LKR 1000000", ratePercent: "6", taxableAmount: "1000000", tax: "60000.00" }],
      unroundedTax: "60000.00",
      incomeTax: "60000.00",
      effectiveRatePercent: "6.00",
    });
  });

  it("steps through multiple marginal bands with capital allowances", () => {
    const result = calculateBusinessIncomeTax(
      {
        ...individualBaseInput,
        businessIncome: 4000000,
        allowableExpenses: 500000,
        capitalAllowances: 100000,
      },
      businessIncomeTaxPayload.businessIncomeTax,
    );

    expect(result).toMatchObject({
      totalDeductions: "600000",
      taxableIncomeBeforeRelief: "3400000",
      taxableIncome: "1600000",
      taxBands: [
        { label: "First LKR 1000000", ratePercent: "6", taxableAmount: "1000000", tax: "60000.00" },
        { label: "LKR 1000000 – 1500000", ratePercent: "18", taxableAmount: "500000", tax: "90000.00" },
        { label: "LKR 1500000 – 2000000", ratePercent: "24", taxableAmount: "100000", tax: "24000.00" },
      ],
      incomeTax: "174000.00",
      effectiveRatePercent: "10.88",
    });
  });

  it("yields no tax when income is below the personal relief", () => {
    const result = calculateBusinessIncomeTax(
      { ...individualBaseInput, businessIncome: 1500000 },
      businessIncomeTaxPayload.businessIncomeTax,
    );

    expect(result).toMatchObject({
      taxableIncomeBeforeRelief: "1300000",
      taxableIncome: "0",
      taxBands: [],
      incomeTax: "0.00",
      effectiveRatePercent: "0.00",
    });
  });

  it("honours a user personal relief override", () => {
    const result = calculateBusinessIncomeTax(
      { ...individualBaseInput, businessIncome: 3500000, personalReliefOverride: 2000000 },
      businessIncomeTaxPayload.businessIncomeTax,
    );

    expect(result).toMatchObject({
      taxableIncomeBeforeRelief: "3300000",
      personalRelief: "2000000",
      personalReliefSource: "user",
      taxableIncome: "1300000",
      taxBands: [
        { label: "First LKR 1000000", ratePercent: "6", taxableAmount: "1000000", tax: "60000.00" },
        { label: "LKR 1000000 – 1500000", ratePercent: "18", taxableAmount: "300000", tax: "54000.00" },
      ],
      incomeTax: "114000.00",
    });
  });

  it("taxes a partnership within the exempt first tranche", () => {
    const result = calculateBusinessIncomeTax(
      {
        asOfDate: "2026-08-16",
        taxpayerCategory: "partnership",
        businessIncome: 1200000,
        allowableExpenses: 200000,
        capitalAllowances: undefined,
        personalReliefOverride: undefined,
      },
      businessIncomeTaxPayload.businessIncomeTax,
    );

    expect(result).toMatchObject({
      taxpayerCategoryLabel: "Partnership",
      personalRelief: "0",
      personalReliefSource: "not-applicable",
      taxableIncome: "1000000",
      taxBands: [{ label: "First LKR 1000000", ratePercent: "0", taxableAmount: "1000000", tax: "0.00" }],
      incomeTax: "0.00",
      effectiveRatePercent: "0.00",
    });
  });

  it("applies the flat partnership rate above the exemption", () => {
    const result = calculateBusinessIncomeTax(
      {
        asOfDate: "2026-08-16",
        taxpayerCategory: "partnership",
        businessIncome: 2500000,
        allowableExpenses: 300000,
        capitalAllowances: undefined,
        personalReliefOverride: undefined,
      },
      businessIncomeTaxPayload.businessIncomeTax,
    );

    expect(result).toMatchObject({
      taxableIncome: "2200000",
      taxBands: [
        { label: "First LKR 1000000", ratePercent: "0", taxableAmount: "1000000", tax: "0.00" },
        { label: "Over LKR 1000000", ratePercent: "6", taxableAmount: "1200000", tax: "72000.00" },
      ],
      incomeTax: "72000.00",
      effectiveRatePercent: "3.27",
    });
  });

  it("applies the flat company rate to all taxable income", () => {
    const result = calculateBusinessIncomeTax(
      {
        asOfDate: "2026-08-16",
        taxpayerCategory: "company",
        businessIncome: 10000000,
        allowableExpenses: 4000000,
        capitalAllowances: 1000000,
        personalReliefOverride: undefined,
      },
      businessIncomeTaxPayload.businessIncomeTax,
    );

    expect(result).toMatchObject({
      taxpayerCategoryLabel: "Company",
      personalRelief: "0",
      personalReliefSource: "not-applicable",
      taxableIncome: "5000000",
      taxBands: [{ label: "All taxable income", ratePercent: "30", taxableAmount: "5000000", tax: "1500000.00" }],
      incomeTax: "1500000.00",
      effectiveRatePercent: "30.00",
    });
  });

  it("rounds the unrounded tax once to the nearest rupee", () => {
    const result = calculateBusinessIncomeTax(
      { ...individualBaseInput, businessIncome: 3000003 },
      businessIncomeTaxPayload.businessIncomeTax,
    );

    expect(result).toMatchObject({
      taxableIncome: "1000003",
      unroundedTax: "60000.54",
      incomeTax: "60001.00",
    });
  });
});

describe("business income tax schemas", () => {
  it("rejects personal relief for a non-individual category", () => {
    expect(
      businessIncomeTaxInputSchema.safeParse({
        asOfDate: "2026-08-16",
        taxpayerCategory: "partnership",
        businessIncome: 2500000,
        allowableExpenses: 300000,
        capitalAllowances: undefined,
        personalReliefOverride: 1000000,
      }).success,
    ).toBe(false);
  });

  it("rejects negative business income", () => {
    expect(
      businessIncomeTaxInputSchema.safeParse({
        ...individualBaseInput,
        businessIncome: -1,
      }).success,
    ).toBe(false);
  });

  it("rejects brackets that are not strictly ascending", () => {
    const bad = {
      ...businessIncomeTaxPayload.businessIncomeTax,
      individualBrackets: [
        { upTo: "1500000", ratePercent: "6" },
        { upTo: "1000000", ratePercent: "18" },
        { upTo: null, ratePercent: "24" },
      ],
    };
    expect(() => businessIncomeTaxPayloadSchema.parse(bad)).toThrow();
  });

  it("rejects an unbounded bracket that is not the final one", () => {
    const bad = {
      ...businessIncomeTaxPayload.businessIncomeTax,
      individualBrackets: [
        { upTo: null, ratePercent: "6" },
        { upTo: "1500000", ratePercent: "18" },
      ],
    };
    expect(() => businessIncomeTaxPayloadSchema.parse(bad)).toThrow();
  });
});
