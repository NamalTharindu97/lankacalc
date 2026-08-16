import {
  businessIncomeTaxInputSchema,
  businessIncomeTaxPayloadSchema,
  calculateBusinessIncomeTax,
} from "@/domain/calculators/business-tax/business-income-tax";
import {
  calculateVatLiability,
  vatLiabilityInputSchema,
  vatLiabilityPayloadSchema,
} from "@/domain/calculators/business-tax/vat-liability";
import {
  defineRegulatedCalculator,
  type CalculationResult,
  type CalculatorMetadata,
  type RuleDependency,
} from "@/domain/calculators/types";

const businessIncomeTaxRule: RuleDependency = {
  name: "businessIncomeTax",
  key: "business-income-tax-lk-2026",
  scope: "lk",
};

const categoryOptions = [
  { label: "Select the business type", value: "" },
  { label: "Individual sole proprietor", value: "individual-sole-proprietor" },
  { label: "Partnership", value: "partnership" },
  { label: "Company", value: "company" },
];

const businessIncomeTaxMetadata = {
  key: "business-income-tax",
  name: "Business income tax calculator",
  shortName: "Business income tax",
  summary: "Estimate annual income tax on business profits for a sole proprietor, partnership, or company.",
  category: "Business & Tax",
  classification: "regulated",
  version: "1.0.0",
  accent: "orange",
  fields: [
    { name: "asOfDate", label: "Calculation date", type: "date", required: true, min: "2025-04-01", max: "9999-12-31" },
    { name: "taxpayerCategory", label: "Business type", type: "select", required: true, options: categoryOptions, description: "Who the business profits belong to. This selects the tax rates that apply." },
    { name: "businessIncome", label: "Business income", type: "number", required: true, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "Gross gains and profits from the business for the year of assessment." },
    { name: "allowableExpenses", label: "Allowable expenses", type: "number", required: true, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "Expenses incurred in producing the business income and allowed as deductions." },
    { name: "capitalAllowances", label: "Capital allowances (optional)", type: "number", required: false, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "Fourth Schedule depreciation on depreciable business assets. Leave blank for none." },
    { name: "personalReliefOverride", label: "Personal relief (optional)", type: "number", required: false, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", visibleWhen: { field: "taxpayerCategory", equals: "individual-sole-proprietor" }, description: "Override the statutory personal relief, for example when part of it is consumed by other income in your return." },
  ],
} satisfies CalculatorMetadata;

const businessIncomeTaxDefinitionSchema = businessIncomeTaxInputSchema;

function baseResult(
  metadata: Pick<CalculatorMetadata, "key" | "version">,
  values: Omit<CalculationResult, "calculator" | "calculationVersion" | "ruleVersions" | "sources" | "verifiedAt">,
): CalculationResult {
  return {
    calculator: metadata.key,
    calculationVersion: metadata.version,
    ruleVersions: [],
    sources: [],
    verifiedAt: null,
    ...values,
  };
}

export const businessIncomeTaxCalculator = defineRegulatedCalculator({
  ...businessIncomeTaxMetadata,
  schema: businessIncomeTaxDefinitionSchema,
  ruleDependencies: [businessIncomeTaxRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const payload = businessIncomeTaxPayloadSchema.parse(payloads.businessIncomeTax);
    const calculation = calculateBusinessIncomeTax(input, payload);

    const reliefLine =
      calculation.personalReliefSource === "not-applicable"
        ? "No personal relief applies to this business type"
        : calculation.personalReliefSource === "user"
          ? `Custom relief LKR ${calculation.personalRelief} (official relief was LKR ${payload.personalRelief})`
          : `Official relief LKR ${calculation.personalRelief}`;

    const deductionsExpression =
      input.capitalAllowances === undefined
        ? `${calculation.allowableExpenses} expenses`
        : `${calculation.allowableExpenses} expenses + ${calculation.capitalAllowances} capital allowances`;

    const resultFields: Record<string, string | number> = {
      taxpayerCategory: calculation.taxpayerCategory,
      taxpayerCategoryLabel: calculation.taxpayerCategoryLabel,
      yearOfAssessment: calculation.yearOfAssessment,
      businessIncome: calculation.businessIncome,
      allowableExpenses: calculation.allowableExpenses,
      capitalAllowances: calculation.capitalAllowances,
      totalDeductions: calculation.totalDeductions,
      taxableIncomeBeforeRelief: calculation.taxableIncomeBeforeRelief,
      personalRelief: calculation.personalRelief,
      personalReliefSource: calculation.personalReliefSource,
      taxableIncome: calculation.taxableIncome,
      unroundedTax: calculation.unroundedTax,
      incomeTax: calculation.incomeTax,
      effectiveRatePercent: calculation.effectiveRatePercent,
    };

    const breakdown = [
      { label: "Business type", value: calculation.taxpayerCategoryLabel },
      { label: "Year of assessment", value: calculation.yearOfAssessment },
      { label: "Business income", value: calculation.businessIncome, unit: "LKR", expression: "Gross gains and profits for the year" },
      { label: "Allowable expenses", value: calculation.allowableExpenses, unit: "LKR" },
      { label: "Capital allowances", value: calculation.capitalAllowances, unit: "LKR", expression: input.capitalAllowances === undefined ? "None entered" : "Fourth Schedule depreciation" },
      { label: "Total deductions", value: calculation.totalDeductions, unit: "LKR", expression: deductionsExpression },
      { label: "Taxable income before relief", value: calculation.taxableIncomeBeforeRelief, unit: "LKR", expression: `${calculation.businessIncome} − ${calculation.totalDeductions}` },
      { label: "Personal relief", value: calculation.personalRelief, unit: "LKR", expression: reliefLine },
      { label: "Taxable income", value: calculation.taxableIncome, unit: "LKR", expression: `${calculation.taxableIncomeBeforeRelief} − ${calculation.personalRelief}` },
      ...calculation.taxBands.map((band) => ({
        label: `Tax at ${band.ratePercent}%`,
        value: band.tax,
        unit: "LKR",
        expression: `${band.ratePercent}% on ${band.taxableAmount} (${band.label})`,
      })),
      { label: "Unrounded tax", value: calculation.unroundedTax, unit: "LKR", expression: "Sum of the band amounts before rounding" },
      { label: "Income tax payable", value: calculation.incomeTax, unit: "LKR", expression: `Rounded to the nearest rupee (${payload.rounding})` },
      { label: "Effective rate", value: calculation.effectiveRatePercent, unit: "%", expression: `${calculation.incomeTax} ÷ ${calculation.taxableIncome}` },
    ];

    return baseResult(businessIncomeTaxMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: resultFields,
      breakdown,
      assumptions: [
        `Rates apply to year of assessment ${calculation.yearOfAssessment} (effective ${payload.effectiveFrom}) as published by the Inland Revenue Department.`,
        "Business income is the gross gains and profits from the business for the year, before deductions.",
        "Expenses must be allowable deductions incurred in producing the business income; personal and disallowed items are excluded.",
        `The personal relief of LKR ${payload.personalRelief} applies only to individual sole proprietors and is shared across all income sources in a full return.`,
        "Tax is computed on taxable income after deductions and any relief, rounded once to the nearest rupee.",
      ],
      warnings: [
        "This is an estimate for self-assessment, not tax, legal, or accounting advice.",
        "Rates, reliefs, and thresholds change each year of assessment; the result uses the rule effective for the date entered.",
        "The full statutory personal relief is applied by default; use the override if other income in your return consumes part of it.",
        "Losses carried forward, disallowed expenses, capital-gain interaction, and Commissioner-General discretion cases are not modelled.",
        "Independent formula and accounting review is still required before this regulated rule is published for production use.",
      ],
    });
  },
});

const vatLiabilityRule: RuleDependency = {
  name: "vatLiability",
  key: "vat-liability-lk-2026",
  scope: "lk",
};

const supplierCategoryOptions = [
  { label: "Select the supplier type", value: "" },
  { label: "Goods and services supplier", value: "goods-services" },
  { label: "Financial services supplier", value: "financial-services" },
  { label: "Commercial importer / exporter", value: "importer-exporter" },
  { label: "Non-resident digital service provider", value: "digital-service" },
];

const taxablePeriodOptions = [
  { label: "Select the taxable period", value: "" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
];

const vatLiabilityMetadata = {
  key: "vat-liability",
  name: "VAT liability and registration check",
  shortName: "VAT liability",
  summary: "Estimate VAT payable for a taxable period and check VAT registration thresholds.",
  category: "Business & Tax",
  classification: "regulated",
  version: "1.0.0",
  accent: "blue",
  fields: [
    { name: "asOfDate", label: "Calculation date", type: "date", required: true, min: "2024-01-01", max: "9999-12-31" },
    { name: "supplierCategory", label: "Supplier type", type: "select", required: true, options: supplierCategoryOptions, description: "Which kind of supplier you are. This selects the VAT rate and registration test that apply." },
    { name: "taxablePeriod", label: "Taxable period", type: "select", required: true, options: taxablePeriodOptions, description: "Monthly or quarterly VAT return period." },
    { name: "periodEndDate", label: "Period end date", type: "date", required: true, min: "2024-01-01", max: "9999-12-31", description: "The last day of the month or quarter the return covers. The rate is selected by the period start date." },
    { name: "taxableSuppliesAmount", label: "Taxable supplies", type: "number", required: true, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", visibleWhen: { field: "supplierCategory", notEquals: "digital-service" }, description: "Total value of taxable supplies for the period, excluding VAT." },
    { name: "inputTaxCreditAmount", label: "Input tax credit", type: "number", required: true, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", visibleWhen: { field: "supplierCategory", notEquals: "digital-service" }, description: "VAT paid on creditable purchases for the period." },
    { name: "rolling12MonthTurnover", label: "Rolling 12-month turnover (optional)", type: "number", required: false, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "Total taxable turnover over the last 12 months, used for the registration-threshold check. Leave blank if you are already registered." },
  ],
} satisfies CalculatorMetadata;

export const vatLiabilityCalculator = defineRegulatedCalculator({
  ...vatLiabilityMetadata,
  schema: vatLiabilityInputSchema,
  ruleDependencies: [vatLiabilityRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const payload = vatLiabilityPayloadSchema.parse(payloads.vatLiability);
    const calculation = calculateVatLiability(input, payload);

    const resultFields: Record<string, string | number> = {
      supplierCategory: calculation.supplierCategory,
      supplierCategoryLabel: calculation.supplierCategoryLabel,
      taxablePeriod: calculation.taxablePeriod,
      periodStartDate: calculation.periodStartDate,
      periodEndDate: calculation.periodEndDate,
      ratePercent: calculation.ratePercent,
      rateEffectiveFrom: calculation.rateEffectiveFrom,
      taxableSuppliesAmount: calculation.taxableSuppliesAmount,
      outputVat: calculation.outputVat,
      inputTaxCredit: calculation.inputTaxCredit,
      netVat: calculation.netVat,
      vatPayable: calculation.vatPayable,
      excessCredit: calculation.excessCredit,
      registrationStatus: calculation.registrationStatus,
      registrationReason: calculation.registrationReason,
    };

    const breakdown = [
      { label: "Supplier type", value: calculation.supplierCategoryLabel },
      { label: "Taxable period", value: calculation.taxablePeriod },
      { label: "Period covered", value: `${calculation.periodStartDate} to ${calculation.periodEndDate}` },
      { label: "VAT rate", value: calculation.ratePercent, unit: "%", expression: `Rate for periods commencing ${calculation.rateEffectiveFrom}` },
      { label: "Taxable supplies", value: calculation.taxableSuppliesAmount, unit: "LKR", expression: "Value of taxable supplies excluding VAT" },
      { label: "Output VAT", value: calculation.outputVat, unit: "LKR", expression: calculation.ratePercent === "n/a" ? "Not computed for a registration check" : `${calculation.taxableSuppliesAmount} × ${calculation.ratePercent}%` },
      { label: "Input tax credit", value: calculation.inputTaxCredit, unit: "LKR", expression: "VAT on creditable purchases for the period" },
      { label: "Net VAT", value: calculation.netVat, unit: "LKR", expression: `${calculation.outputVat} − ${calculation.inputTaxCredit}` },
      { label: "VAT payable", value: calculation.vatPayable, unit: "LKR", expression: `Rounded to the nearest rupee (${payload.rounding})` },
      { label: "Excess credit", value: calculation.excessCredit, unit: "LKR", expression: "Carried forward when net VAT is negative" },
      { label: "Registration status", value: calculation.registrationStatus },
      { label: "Registration check", value: calculation.registrationReason },
    ];

    return baseResult(vatLiabilityMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: resultFields,
      breakdown,
      assumptions: [
        `VAT is charged at the rate for the taxable period start date: ${calculation.ratePercent}% (${calculation.rateEffectiveFrom}).`,
        "Taxable supplies are the value of supplies excluding VAT; input tax credit is the VAT paid on creditable purchases in the period.",
        "VAT payable is the excess of output VAT over input tax credit, rounded once to the nearest rupee.",
        "The registration check compares period and rolling 12-month turnover against the thresholds in the rule.",
      ],
      warnings: [
        "This is an estimate for self-assessment, not tax, legal, or accounting advice.",
        "Exempt and zero-rated supplies, partial input credit apportionment, import VAT timing, and the SVAT refund mechanism are not modelled.",
        "Rates, thresholds, and registration rules change; the result uses the rule effective for the date entered.",
        "A registration decision must be confirmed with the Inland Revenue Department before acting on it.",
        "Independent formula and accounting review is still required before this regulated rule is published for production use.",
      ],
    });
  },
});
