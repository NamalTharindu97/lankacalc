import { describe, expect, it } from "vitest";

import { getCalculator } from "@/domain/calculators/registry";
import {
  businessIncomeTaxCalculator,
  freelanceTaxEstimateCalculator,
  ssclCheckCalculator,
  vatLiabilityCalculator,
  withholdingTaxCalculator,
} from "@/domain/calculators/business-tax-calculators";
import {
  businessIncomeTaxInputSchema,
  businessIncomeTaxPayloadSchema,
  calculateBusinessIncomeTax,
  type BusinessIncomeTaxPayload,
} from "@/domain/calculators/business-tax/business-income-tax";
import {
  calculateVatLiability,
  vatLiabilityInputSchema,
  vatLiabilityPayloadSchema,
  type VatLiabilityPayload,
} from "@/domain/calculators/business-tax/vat-liability";
import {
  calculateWithholdingTax,
  withholdingTaxInputSchema,
  withholdingTaxPayloadSchema,
  type WithholdingTaxPayload,
} from "@/domain/calculators/business-tax/withholding-tax";
import {
  calculateFreelanceTaxEstimate,
  freelanceTaxEstimateInputSchema,
  freelanceTaxEstimatePayloadSchema,
  type FreelanceTaxEstimatePayload,
} from "@/domain/calculators/business-tax/freelance-tax-estimate";
import {
  calculateSsclCheck,
  ssclCheckInputSchema,
  ssclCheckPayloadSchema,
  type SsclCheckPayload,
} from "@/domain/calculators/business-tax/sscl-check";

const vatLiabilityPayload = {
  vatLiability: {
    authority: "ird-vat-act-2002-as-amended",
    effectiveFrom: "2024-01-01",
    rounding: "nearest-rupee",
    standardRates: [{ effectiveFrom: "2024-01-01", ratePercent: "18" }],
    financialServicesRates: [
      { effectiveFrom: "2022-01-01", ratePercent: "18" },
      { effectiveFrom: "2026-07-01", ratePercent: "20.5" },
    ],
    registrationThresholds: {
      goodsServices: { quarter: "15000000", annual: "60000000" },
      financialServices: { quarter: "3000000", annual: "12000000" },
    },
    importerExporterMandatoryRegistration: true,
  },
} satisfies { vatLiability: VatLiabilityPayload };

const goodsQuarterlyInput = {
  asOfDate: "2026-08-16",
  supplierCategory: "goods-services",
  taxablePeriod: "quarterly",
  periodEndDate: "2026-06-30",
  taxableSuppliesAmount: 20000000,
  inputTaxCreditAmount: 2000000,
  rolling12MonthTurnover: undefined,
} as const;

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

const withholdingTaxPayload = {
  withholdingTax: {
    authority: "ird-income-tax-2025",
    effectiveFrom: "2025-04-01",
    rounding: "nearest-rupee",
    personalRelief: "1800000",
    monthlyThreshold: "100000",
    rates: {
      interest: [{ effectiveFrom: "2025-04-01", ratePercent: "10" }],
      dividend: [{ effectiveFrom: "2025-04-01", ratePercent: "15" }],
      rentResident: [{ effectiveFrom: "2025-04-01", ratePercent: "10" }],
      rentNonResident: [{ effectiveFrom: "2025-04-01", ratePercent: "14" }],
      serviceFeeResident: [{ effectiveFrom: "2025-04-01", ratePercent: "5" }],
      serviceFeeNonResident: [{ effectiveFrom: "2025-04-01", ratePercent: "14" }],
      royalty: [{ effectiveFrom: "2025-04-01", ratePercent: "14" }],
    },
  },
} satisfies { withholdingTax: WithholdingTaxPayload };

const interestInput = {
  asOfDate: "2026-08-16",
  paymentType: "interest",
  grossAmount: 200000,
  interestSelfDeclaration: undefined,
} as const;

const freelanceTaxEstimatePayload = {
  freelanceTaxEstimate: {
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
    foreignCurrencyRemittedCapPercent: "15",
  },
} satisfies { freelanceTaxEstimate: FreelanceTaxEstimatePayload };

const freelancerBaseInput = {
  asOfDate: "2026-08-16",
  businessIncome: 3000000,
  allowableExpenses: 200000,
  capitalAllowances: undefined,
  personalReliefOverride: undefined,
  foreignIncomeAmount: undefined,
  foreignTaxPaid: undefined,
} as const;

const ssclCheckPayload = {
  ssclCheck: {
    authority: "sscl-act-2022-as-amended",
    effectiveFrom: "2024-01-01",
    rounding: "nearest-rupee",
    ratePercent: "2.5",
    liableFractions: {
      importer: "100",
      manufacturer: "85",
      "service-provider": "100",
      "financial-service": "100",
      "land-improvement": "100",
      "wholesale-retail-distributor": "25",
      "wholesale-retail-other": "50",
    },
    registrationThresholds: [
      { effectiveFrom: "2024-01-01", quarter: "15000000", annual: "60000000" },
      { effectiveFrom: "2026-07-01", quarter: "9000000", annual: "36000000" },
    ],
    financialServicesExemptFrom: "2025-12-17",
  },
} satisfies { ssclCheck: SsclCheckPayload };

const ssclBaseInput = {
  asOfDate: "2026-08-16",
  turnoverCategory: "manufacturer",
  periodEndDate: "2026-06-30",
  quarterlyTurnover: 10000000,
  rollingFourQuarterTurnover: 50000000,
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

describe("regulated VAT liability calculator definition", () => {
  it("registers the calculator for server execution", () => {
    expect(getCalculator("vat-liability")).toMatchObject({
      key: "vat-liability",
      classification: "regulated",
      execution: "server",
    });
  });

  it("exposes the VAT liability rule dependency", () => {
    expect(vatLiabilityCalculator.ruleDependencies).toEqual([
      { name: "vatLiability", key: "vat-liability-lk-2026", scope: "lk" },
    ]);
  });

  it("presents the result through the common result contract", () => {
    const result = vatLiabilityCalculator.calculate(
      { ...goodsQuarterlyInput },
      vatLiabilityPayload,
    );

    expect(result).toMatchObject({
      calculator: "vat-liability",
      asOfDate: "2026-08-16",
      ruleVersions: [],
      sources: [],
      result: {
        supplierCategoryLabel: "Goods and services supplier",
        ratePercent: "18",
        periodStartDate: "2026-04-01",
        outputVat: "3600000.00",
        vatPayable: "1600000.00",
      },
    });
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("VAT liability engine", () => {
  it("computes quarterly goods/services VAT and the quarterly threshold trigger", () => {
    const result = calculateVatLiability(
      { ...goodsQuarterlyInput },
      vatLiabilityPayload.vatLiability,
    );

    expect(result).toMatchObject({
      supplierCategoryLabel: "Goods and services supplier",
      taxablePeriod: "quarterly",
      periodStartDate: "2026-04-01",
      periodEndDate: "2026-06-30",
      ratePercent: "18",
      rateEffectiveFrom: "2024-01-01",
      taxableSuppliesAmount: "20000000",
      outputVat: "3600000.00",
      inputTaxCredit: "2000000.00",
      netVat: "1600000.00",
      vatPayable: "1600000.00",
      excessCredit: "0.00",
      registrationStatus: "required",
      registrationReason:
        "Registration is required: taxable supplies exceed the threshold (quarter LKR 15000000 / 12-month LKR 60000000).",
    });
  });

  it("carries forward excess input credit on a monthly period", () => {
    const result = calculateVatLiability(
      {
        asOfDate: "2026-08-16",
        supplierCategory: "goods-services",
        taxablePeriod: "monthly",
        periodEndDate: "2026-08-31",
        taxableSuppliesAmount: 5000000,
        inputTaxCreditAmount: 1000000,
        rolling12MonthTurnover: undefined,
      },
      vatLiabilityPayload.vatLiability,
    );

    expect(result).toMatchObject({
      periodStartDate: "2026-08-01",
      outputVat: "900000.00",
      netVat: "-100000.00",
      vatPayable: "0.00",
      excessCredit: "100000.00",
      registrationStatus: "indeterminate",
    });
  });

  it("marks a monthly supplier not-required when rolling turnover stays below the annual threshold", () => {
    const result = calculateVatLiability(
      {
        asOfDate: "2026-08-16",
        supplierCategory: "goods-services",
        taxablePeriod: "monthly",
        periodEndDate: "2026-08-31",
        taxableSuppliesAmount: 5000000,
        inputTaxCreditAmount: 900000,
        rolling12MonthTurnover: 55000000,
      },
      vatLiabilityPayload.vatLiability,
    );

    expect(result).toMatchObject({
      outputVat: "900000.00",
      vatPayable: "0.00",
      registrationStatus: "not-required",
    });
  });

  it("applies the 18% financial services rate before 1 July 2026", () => {
    const result = calculateVatLiability(
      {
        asOfDate: "2026-08-16",
        supplierCategory: "financial-services",
        taxablePeriod: "quarterly",
        periodEndDate: "2026-06-30",
        taxableSuppliesAmount: 10000000,
        inputTaxCreditAmount: 300000,
        rolling12MonthTurnover: undefined,
      },
      vatLiabilityPayload.vatLiability,
    );

    expect(result).toMatchObject({
      ratePercent: "18",
      rateEffectiveFrom: "2022-01-01",
      outputVat: "1800000.00",
      vatPayable: "1500000.00",
      registrationStatus: "required",
    });
  });

  it("applies the 20.5% financial services rate for periods commencing on or after 1 July 2026", () => {
    const result = calculateVatLiability(
      {
        asOfDate: "2026-08-16",
        supplierCategory: "financial-services",
        taxablePeriod: "quarterly",
        periodEndDate: "2026-09-30",
        taxableSuppliesAmount: 10000000,
        inputTaxCreditAmount: 500000,
        rolling12MonthTurnover: undefined,
      },
      vatLiabilityPayload.vatLiability,
    );

    expect(result).toMatchObject({
      periodStartDate: "2026-07-01",
      ratePercent: "20.5",
      rateEffectiveFrom: "2026-07-01",
      outputVat: "2050000.00",
      vatPayable: "1550000.00",
      registrationStatus: "required",
    });
  });

  it("reports mandatory registration for a commercial importer or exporter", () => {
    const result = calculateVatLiability(
      {
        asOfDate: "2026-08-16",
        supplierCategory: "importer-exporter",
        taxablePeriod: "quarterly",
        periodEndDate: "2026-06-30",
        taxableSuppliesAmount: 5000000,
        inputTaxCreditAmount: 2000000,
        rolling12MonthTurnover: undefined,
      },
      vatLiabilityPayload.vatLiability,
    );

    expect(result).toMatchObject({
      ratePercent: "18",
      outputVat: "900000.00",
      registrationStatus: "mandatory",
      registrationReason:
        "All persons importing or exporting goods for commercial purposes must register for VAT regardless of turnover or exemptions.",
    });
  });

  it("gives a non-resident digital service provider a registration check only", () => {
    const required = calculateVatLiability(
      {
        asOfDate: "2026-08-16",
        supplierCategory: "digital-service",
        taxablePeriod: "quarterly",
        periodEndDate: "2026-09-30",
        taxableSuppliesAmount: undefined,
        inputTaxCreditAmount: undefined,
        rolling12MonthTurnover: 70000000,
      },
      vatLiabilityPayload.vatLiability,
    );

    expect(required).toMatchObject({
      ratePercent: "n/a",
      outputVat: "0.00",
      vatPayable: "0.00",
      registrationStatus: "required",
      registrationReason: "Registration is required: 12-month digital services exceed LKR 60000000.",
    });

    const notRequired = calculateVatLiability(
      {
        asOfDate: "2026-08-16",
        supplierCategory: "digital-service",
        taxablePeriod: "quarterly",
        periodEndDate: "2026-09-30",
        taxableSuppliesAmount: undefined,
        inputTaxCreditAmount: undefined,
        rolling12MonthTurnover: 40000000,
      },
      vatLiabilityPayload.vatLiability,
    );

    expect(notRequired).toMatchObject({
      registrationStatus: "not-required",
    });
  });

  it("rounds the payable once to the nearest rupee", () => {
    const result = calculateVatLiability(
      {
        asOfDate: "2026-08-16",
        supplierCategory: "goods-services",
        taxablePeriod: "monthly",
        periodEndDate: "2026-08-31",
        taxableSuppliesAmount: 1000003,
        inputTaxCreditAmount: 100000,
        rolling12MonthTurnover: undefined,
      },
      vatLiabilityPayload.vatLiability,
    );

    expect(result).toMatchObject({
      outputVat: "180000.54",
      netVat: "80000.54",
      vatPayable: "80001.00",
    });
  });
});

describe("VAT liability schemas", () => {
  it("rejects a period end date that is not the last day of its month", () => {
    expect(
      vatLiabilityInputSchema.safeParse({
        ...goodsQuarterlyInput,
        periodEndDate: "2026-06-15",
      }).success,
    ).toBe(false);
  });

  it("rejects a quarterly period that does not end on a quarter month", () => {
    expect(
      vatLiabilityInputSchema.safeParse({
        ...goodsQuarterlyInput,
        periodEndDate: "2026-05-31",
      }).success,
    ).toBe(false);
  });

  it("rejects a digital service provider that enters supplies or input credit", () => {
    expect(
      vatLiabilityInputSchema.safeParse({
        ...goodsQuarterlyInput,
        supplierCategory: "digital-service",
        taxableSuppliesAmount: 5000000,
      }).success,
    ).toBe(false);
  });

  it("requires supplies and input credit for a liability category", () => {
    expect(
      vatLiabilityInputSchema.safeParse({
        ...goodsQuarterlyInput,
        taxableSuppliesAmount: undefined,
        inputTaxCreditAmount: undefined,
      }).success,
    ).toBe(false);
  });

  it("rejects a rate schedule that is not strictly ascending", () => {
    const bad = {
      ...vatLiabilityPayload.vatLiability,
      financialServicesRates: [
        { effectiveFrom: "2026-07-01", ratePercent: "20.5" },
        { effectiveFrom: "2022-01-01", ratePercent: "18" },
      ],
    };
    expect(() => vatLiabilityPayloadSchema.parse(bad)).toThrow();
  });
});

describe("regulated withholding tax calculator definition", () => {
  it("registers the calculator for server execution", () => {
    expect(getCalculator("withholding-tax")).toMatchObject({
      key: "withholding-tax",
      classification: "regulated",
      execution: "server",
    });
  });

  it("exposes the withholding tax rule dependency", () => {
    expect(withholdingTaxCalculator.ruleDependencies).toEqual([
      { name: "withholdingTax", key: "withholding-tax-lk-2026", scope: "lk" },
    ]);
  });

  it("presents the result through the common result contract", () => {
    const result = withholdingTaxCalculator.calculate(
      { ...interestInput },
      withholdingTaxPayload,
    );

    expect(result).toMatchObject({
      calculator: "withholding-tax",
      asOfDate: "2026-08-16",
      ruleVersions: [],
      sources: [],
      result: {
        paymentTypeLabel: "Interest or discount",
        ratePercent: "10",
        wthAmount: "20000.00",
        netPayment: "180000.00",
        treatment: "creditable",
      },
    });
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("withholding tax engine", () => {
  it("deducts AIT at 10% on interest to a resident or non-resident", () => {
    const result = calculateWithholdingTax(
      { ...interestInput },
      withholdingTaxPayload.withholdingTax,
    );

    expect(result).toMatchObject({
      paymentType: "interest",
      ratePercent: "10",
      wthAmount: "20000.00",
      netPayment: "180000.00",
      treatment: "creditable",
      thresholdApplied: false,
      selfDeclarationApplied: false,
    });
  });

  it("stops the interest deduction when a self-declaration is on file", () => {
    const result = calculateWithholdingTax(
      { ...interestInput, interestSelfDeclaration: "yes" },
      withholdingTaxPayload.withholdingTax,
    );

    expect(result).toMatchObject({
      ratePercent: "0",
      wthAmount: "0.00",
      netPayment: "200000.00",
      selfDeclarationApplied: true,
    });
  });

  it("applies dividend WHT as a 15% final tax", () => {
    const result = calculateWithholdingTax(
      { asOfDate: "2026-08-16", paymentType: "dividend", grossAmount: 500000 },
      withholdingTaxPayload.withholdingTax,
    );

    expect(result).toMatchObject({
      ratePercent: "15",
      wthAmount: "75000.00",
      netPayment: "425000.00",
      treatment: "final",
    });
  });

  it("deducts 10% on resident rent above the calendar-month threshold", () => {
    const result = calculateWithholdingTax(
      { asOfDate: "2026-08-16", paymentType: "rent-resident", grossAmount: 150000 },
      withholdingTaxPayload.withholdingTax,
    );

    expect(result).toMatchObject({
      ratePercent: "10",
      wthAmount: "15000.00",
      thresholdApplied: true,
      thresholdExceeded: true,
    });
  });

  it("deducts nothing for resident rent at or below the calendar-month threshold", () => {
    const atThreshold = calculateWithholdingTax(
      { asOfDate: "2026-08-16", paymentType: "rent-resident", grossAmount: 100000 },
      withholdingTaxPayload.withholdingTax,
    );

    expect(atThreshold).toMatchObject({
      ratePercent: "0",
      wthAmount: "0.00",
      thresholdApplied: true,
      thresholdExceeded: false,
    });

    const belowThreshold = calculateWithholdingTax(
      { asOfDate: "2026-08-16", paymentType: "rent-resident", grossAmount: 90000 },
      withholdingTaxPayload.withholdingTax,
    );

    expect(belowThreshold).toMatchObject({
      ratePercent: "0",
      wthAmount: "0.00",
    });
  });

  it("deducts 5% AIT on service fees to a resident individual above the threshold", () => {
    const result = calculateWithholdingTax(
      { asOfDate: "2026-08-16", paymentType: "service-fee-resident", grossAmount: 250000 },
      withholdingTaxPayload.withholdingTax,
    );

    expect(result).toMatchObject({
      ratePercent: "5",
      wthAmount: "12500.00",
      netPayment: "237500.00",
      treatment: "creditable",
    });
  });

  it("deducts nothing for a resident service fee at or below the threshold", () => {
    const result = calculateWithholdingTax(
      { asOfDate: "2026-08-16", paymentType: "service-fee-resident", grossAmount: 100000 },
      withholdingTaxPayload.withholdingTax,
    );

    expect(result).toMatchObject({
      ratePercent: "0",
      wthAmount: "0.00",
      thresholdExceeded: false,
    });
  });

  it("deducts 14% on service fees to a non-resident person without a threshold gate", () => {
    const result = calculateWithholdingTax(
      { asOfDate: "2026-08-16", paymentType: "service-fee-non-resident", grossAmount: 2000000 },
      withholdingTaxPayload.withholdingTax,
    );

    expect(result).toMatchObject({
      ratePercent: "14",
      wthAmount: "280000.00",
      netPayment: "1720000.00",
      thresholdApplied: false,
    });
  });

  it("deducts 14% on rent to a non-resident person", () => {
    const result = calculateWithholdingTax(
      { asOfDate: "2026-08-16", paymentType: "rent-non-resident", grossAmount: 200000 },
      withholdingTaxPayload.withholdingTax,
    );

    expect(result).toMatchObject({
      ratePercent: "14",
      wthAmount: "28000.00",
      thresholdApplied: false,
    });
  });

  it("deducts 14% on royalties as a creditable tax", () => {
    const result = calculateWithholdingTax(
      { asOfDate: "2026-08-16", paymentType: "royalty", grossAmount: 300000 },
      withholdingTaxPayload.withholdingTax,
    );

    expect(result).toMatchObject({
      ratePercent: "14",
      wthAmount: "42000.00",
      netPayment: "258000.00",
      treatment: "creditable",
    });
  });

  it("rounds the deduction once to the nearest rupee", () => {
    const result = calculateWithholdingTax(
      { asOfDate: "2026-08-16", paymentType: "service-fee-resident", grossAmount: 333333 },
      withholdingTaxPayload.withholdingTax,
    );

    expect(result).toMatchObject({
      wthAmount: "16667.00",
      netPayment: "316666.00",
    });
  });

  it("selects the rate for the payment date from a multi-entry schedule", () => {
    const twoTier = {
      ...withholdingTaxPayload.withholdingTax,
      rates: {
        ...withholdingTaxPayload.withholdingTax.rates,
        interest: [
          { effectiveFrom: "2025-04-01", ratePercent: "10" },
          { effectiveFrom: "2026-01-01", ratePercent: "12" },
        ],
      },
    };

    const earlier = calculateWithholdingTax(
      { asOfDate: "2025-12-15", paymentType: "interest", grossAmount: 100000 },
      twoTier,
    );
    const later = calculateWithholdingTax(
      { asOfDate: "2026-06-15", paymentType: "interest", grossAmount: 100000 },
      twoTier,
    );

    expect(earlier).toMatchObject({ ratePercent: "10", rateEffectiveFrom: "2025-04-01" });
    expect(later).toMatchObject({ ratePercent: "12", rateEffectiveFrom: "2026-01-01" });
  });
});

describe("withholding tax schemas", () => {
  it("accepts an empty interest self-declaration", () => {
    const parsed = withholdingTaxInputSchema.safeParse({
      ...interestInput,
      interestSelfDeclaration: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.interestSelfDeclaration).toBeUndefined();
    }
  });

  it("rejects a self-declaration on a non-interest payment", () => {
    expect(
      withholdingTaxInputSchema.safeParse({
        ...interestInput,
        paymentType: "dividend",
        interestSelfDeclaration: "yes",
      }).success,
    ).toBe(false);
  });

  it("rejects a rate schedule that is not strictly ascending", () => {
    const bad = {
      ...withholdingTaxPayload.withholdingTax,
      rates: {
        ...withholdingTaxPayload.withholdingTax.rates,
        interest: [
          { effectiveFrom: "2026-01-01", ratePercent: "12" },
          { effectiveFrom: "2025-04-01", ratePercent: "10" },
        ],
      },
    };
    expect(() => withholdingTaxPayloadSchema.parse(bad)).toThrow();
  });
});

describe("regulated freelance tax estimate calculator definition", () => {
  it("registers the calculator for server execution", () => {
    expect(getCalculator("freelance-tax-estimate")).toMatchObject({
      key: "freelance-tax-estimate",
      classification: "regulated",
      execution: "server",
    });
  });

  it("exposes the freelance tax estimate rule dependency", () => {
    expect(freelanceTaxEstimateCalculator.ruleDependencies).toEqual([
      { name: "freelanceTaxEstimate", key: "freelance-tax-estimate-lk-2026", scope: "lk" },
    ]);
  });

  it("presents the result through the common result contract", () => {
    const result = freelanceTaxEstimateCalculator.calculate(
      { ...freelancerBaseInput },
      freelanceTaxEstimatePayload,
    );

    expect(result).toMatchObject({
      calculator: "freelance-tax-estimate",
      asOfDate: "2026-08-16",
      ruleVersions: [],
      sources: [],
      result: {
        taxpayerCategoryLabel: "Freelancer / service exporter (individual)",
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

describe("freelance tax estimate engine", () => {
  it("applies official relief and the first individual band without a foreign path", () => {
    const result = calculateFreelanceTaxEstimate(
      { ...freelancerBaseInput },
      freelanceTaxEstimatePayload.freelanceTaxEstimate,
    );

    expect(result).toMatchObject({
      taxableIncomeBeforeRelief: "2800000",
      taxableIncome: "1000000",
      foreignIncomePortion: "0",
      domesticPortion: "1000000",
      foreignTaxCapped: "0.00",
      capApplied: false,
      foreignTaxCredit: "0.00",
      incomeTax: "60000.00",
      effectiveRatePercent: "6.00",
    });
  });

  it("never increases the tax when all taxable income is foreign-currency-remitted", () => {
    const result = calculateFreelanceTaxEstimate(
      { ...freelancerBaseInput, foreignIncomeAmount: 2000000 },
      freelanceTaxEstimatePayload.freelanceTaxEstimate,
    );

    expect(result).toMatchObject({
      taxableIncome: "1000000",
      foreignIncomePortion: "1000000",
      domesticPortion: "0",
      foreignTaxNormal: "60000.00",
      foreignTaxCapped: "60000.00",
      capApplied: false,
      incomeTax: "60000.00",
    });
  });

  it("caps a top-bracket foreign slice at 15%", () => {
    const result = calculateFreelanceTaxEstimate(
      { ...freelancerBaseInput, businessIncome: 5000000, foreignIncomeAmount: 500000 },
      freelanceTaxEstimatePayload.freelanceTaxEstimate,
    );

    expect(result).toMatchObject({
      taxableIncome: "3000000",
      domesticPortion: "2500000",
      foreignIncomePortion: "500000",
      foreignTaxNormal: "180000.00",
      foreignTaxCapped: "75000.00",
      capApplied: true,
      unroundedTax: "495000.00",
      incomeTax: "495000.00",
      effectiveRatePercent: "16.50",
    });
  });

  it("caps a mid-band foreign slice at 15%", () => {
    const result = calculateFreelanceTaxEstimate(
      {
        ...freelancerBaseInput,
        businessIncome: 4000000,
        allowableExpenses: 0,
        foreignIncomeAmount: 500000,
      },
      freelanceTaxEstimatePayload.freelanceTaxEstimate,
    );

    expect(result).toMatchObject({
      taxableIncome: "2200000",
      foreignIncomePortion: "500000",
      foreignTaxNormal: "132000.00",
      foreignTaxCapped: "75000.00",
      capApplied: true,
      incomeTax: "273000.00",
    });
  });

  it("leaves a below-15% marginal slice unchanged", () => {
    const result = calculateFreelanceTaxEstimate(
      { ...freelancerBaseInput, allowableExpenses: 0, foreignIncomeAmount: 500000 },
      freelanceTaxEstimatePayload.freelanceTaxEstimate,
    );

    expect(result).toMatchObject({
      taxableIncome: "1200000",
      foreignIncomePortion: "500000",
      foreignTaxNormal: "54000.00",
      foreignTaxCapped: "54000.00",
      capApplied: false,
      incomeTax: "96000.00",
    });
  });

  it("allows a foreign tax credit up to the Sri Lankan tax on the foreign income", () => {
    const result = calculateFreelanceTaxEstimate(
      {
        ...freelancerBaseInput,
        businessIncome: 5000000,
        foreignIncomeAmount: 500000,
        foreignTaxPaid: 60000,
      },
      freelanceTaxEstimatePayload.freelanceTaxEstimate,
    );

    expect(result).toMatchObject({
      foreignTaxCapped: "75000.00",
      foreignTaxCredit: "60000.00",
      creditApplied: true,
      incomeTax: "435000.00",
    });
  });

  it("limits the foreign tax credit to the Sri Lankan tax on the foreign income", () => {
    const result = calculateFreelanceTaxEstimate(
      {
        ...freelancerBaseInput,
        businessIncome: 5000000,
        foreignIncomeAmount: 500000,
        foreignTaxPaid: 100000,
      },
      freelanceTaxEstimatePayload.freelanceTaxEstimate,
    );

    expect(result).toMatchObject({
      foreignTaxCapped: "75000.00",
      foreignTaxCredit: "75000.00",
      creditApplied: true,
      incomeTax: "420000.00",
    });
  });

  it("honours a personal relief override", () => {
    const result = calculateFreelanceTaxEstimate(
      { ...freelancerBaseInput, personalReliefOverride: 0 },
      freelanceTaxEstimatePayload.freelanceTaxEstimate,
    );

    expect(result).toMatchObject({
      personalReliefSource: "user",
      taxableIncome: "2800000",
      incomeTax: "528000.00",
    });
  });
});

describe("freelance tax estimate schemas", () => {
  it("rejects foreign tax paid without foreign-currency-remitted income", () => {
    expect(
      freelanceTaxEstimateInputSchema.safeParse({
        ...freelancerBaseInput,
        foreignTaxPaid: 50000,
      }).success,
    ).toBe(false);
  });

  it("rejects a foreign-currency-remitted income above the total business income", () => {
    expect(
      freelanceTaxEstimateInputSchema.safeParse({
        ...freelancerBaseInput,
        foreignIncomeAmount: 4000000,
      }).success,
    ).toBe(false);
  });

  it("rejects an individual bracket table that is not strictly ascending", () => {
    const bad = {
      ...freelanceTaxEstimatePayload.freelanceTaxEstimate,
      individualBrackets: [
        { upTo: "1500000", ratePercent: "18" },
        { upTo: "1000000", ratePercent: "6" },
        { upTo: null, ratePercent: "36" },
      ],
    };
    expect(() => freelanceTaxEstimatePayloadSchema.parse(bad)).toThrow();
  });
});

describe("regulated SSCL check calculator definition", () => {
  it("registers the calculator for server execution", () => {
    expect(getCalculator("sscl-check")).toMatchObject({
      key: "sscl-check",
      classification: "regulated",
      execution: "server",
    });
  });

  it("exposes the SSCL rule dependency", () => {
    expect(ssclCheckCalculator.ruleDependencies).toEqual([
      { name: "ssclCheck", key: "sscl-lk-2026", scope: "lk" },
    ]);
  });

  it("presents the result through the common result contract", () => {
    const result = ssclCheckCalculator.calculate(
      { ...ssclBaseInput },
      ssclCheckPayload,
    );

    expect(result).toMatchObject({
      calculator: "sscl-check",
      asOfDate: "2026-08-16",
      ruleVersions: [],
      sources: [],
      result: {
        turnoverCategoryLabel: "Manufacturer of any article",
        periodStartDate: "2026-04-01",
        periodEndDate: "2026-06-30",
        ratePercent: "2.5",
        registrationStatus: "Not required",
        ssclPayable: "0.00",
      },
    });
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("SSCL check engine", () => {
  it("does not estimate SSCL below the old registration thresholds", () => {
    const result = calculateSsclCheck(
      { ...ssclBaseInput },
      ssclCheckPayload.ssclCheck,
    );

    expect(result).toMatchObject({
      turnoverCategory: "manufacturer",
      liableFractionPercent: "85",
      liableTurnover: "8500000",
      registrationStatus: "not-required",
      deregistrationEligible: true,
      ssclPayable: "0.00",
    });
  });

  it("applies the 2.5% rate to the liable fraction when registration is required", () => {
    const result = calculateSsclCheck(
      { ...ssclBaseInput, quarterlyTurnover: 20000000 },
      ssclCheckPayload.ssclCheck,
    );

    expect(result).toMatchObject({
      registrationStatus: "required",
      liableTurnover: "17000000",
      ssclPayable: "425000.00",
    });
  });

  it("treats importers as mandatory registrants at full turnover regardless of threshold", () => {
    const result = calculateSsclCheck(
      { ...ssclBaseInput, turnoverCategory: "importer", quarterlyTurnover: 4000000 },
      ssclCheckPayload.ssclCheck,
    );

    expect(result).toMatchObject({
      registrationStatus: "mandatory",
      liableFractionPercent: "100",
      liableTurnover: "4000000",
      ssclPayable: "100000.00",
      deregistrationEligible: false,
    });
  });

  it("uses the lowered thresholds for quarters from 2026-07-01", () => {
    const result = calculateSsclCheck(
      {
        ...ssclBaseInput,
        turnoverCategory: "wholesale-retail-distributor",
        periodEndDate: "2026-09-30",
        quarterlyTurnover: 8000000,
        rollingFourQuarterTurnover: 40000000,
      },
      ssclCheckPayload.ssclCheck,
    );

    expect(result).toMatchObject({
      periodStartDate: "2026-07-01",
      liableFractionPercent: "25",
      registrationStatus: "required",
      liableTurnover: "2000000",
      ssclPayable: "50000.00",
    });
  });

  it("requires turnover to exceed rather than equal each quarterly threshold", () => {
    const oldThreshold = calculateSsclCheck(
      {
        ...ssclBaseInput,
        turnoverCategory: "service-provider",
        quarterlyTurnover: 15000000,
        rollingFourQuarterTurnover: 60000000,
      },
      ssclCheckPayload.ssclCheck,
    );
    const newThreshold = calculateSsclCheck(
      {
        ...ssclBaseInput,
        turnoverCategory: "service-provider",
        periodEndDate: "2026-09-30",
        quarterlyTurnover: 9000000,
        rollingFourQuarterTurnover: 36000000,
      },
      ssclCheckPayload.ssclCheck,
    );

    expect(oldThreshold).toMatchObject({ registrationStatus: "not-required", ssclPayable: "0.00" });
    expect(newThreshold).toMatchObject({ registrationStatus: "not-required", ssclPayable: "0.00" });
  });

  it("exempts financial services subject to 20.5% VAT from the exemption date onward", () => {
    const result = calculateSsclCheck(
      {
        ...ssclBaseInput,
        turnoverCategory: "financial-service",
        periodEndDate: "2026-06-30",
        quarterlyTurnover: 100000000,
        rollingFourQuarterTurnover: undefined,
      },
      ssclCheckPayload.ssclCheck,
    );

    expect(result).toMatchObject({
      exemptionApplied: true,
      liableTurnover: "0",
      registrationStatus: "exempt",
      deregistrationEligible: false,
      ssclPayable: "0.00",
    });
  });

  it("fails closed for financial services before the exemption date", () => {
    expect(() =>
      calculateSsclCheck(
        {
          ...ssclBaseInput,
          turnoverCategory: "financial-service",
          periodEndDate: "2025-09-30",
          quarterlyTurnover: 10000000,
          rollingFourQuarterTurnover: 30000000,
        },
        ssclCheckPayload.ssclCheck,
      ),
    ).toThrow("VAT attributable-value-addition method");
  });

  it("reports the annual-threshold leg as indeterminate when the four-quarter turnover is missing", () => {
    const result = calculateSsclCheck(
      { ...ssclBaseInput, rollingFourQuarterTurnover: undefined },
      ssclCheckPayload.ssclCheck,
    );

    expect(result).toMatchObject({
      registrationStatus: "indeterminate",
      ssclPayable: "0.00",
    });
  });
});

describe("SSCL check schemas", () => {
  it("rejects a period that does not end on the last day of a quarter", () => {
    expect(
      ssclCheckInputSchema.safeParse({
        ...ssclBaseInput,
        periodEndDate: "2026-07-15",
      }).success,
    ).toBe(false);
  });

  it("rejects a missing quarterly turnover for a non-financial category", () => {
    expect(
      ssclCheckInputSchema.safeParse({
        ...ssclBaseInput,
        quarterlyTurnover: undefined,
      }).success,
    ).toBe(false);
  });

  it("allows a financial-service input without quarterly turnover", () => {
    expect(
      ssclCheckInputSchema.safeParse({
        ...ssclBaseInput,
        turnoverCategory: "financial-service",
        quarterlyTurnover: undefined,
        rollingFourQuarterTurnover: undefined,
      }).success,
    ).toBe(true);
  });

  it("rejects a registration threshold schedule that is not strictly ascending", () => {
    const bad = {
      ...ssclCheckPayload.ssclCheck,
      registrationThresholds: [
        { effectiveFrom: "2026-07-01", quarter: "9000000", annual: "36000000" },
        { effectiveFrom: "2024-01-01", quarter: "15000000", annual: "60000000" },
      ],
    };
    expect(() => ssclCheckPayloadSchema.parse(bad)).toThrow();
  });
});
