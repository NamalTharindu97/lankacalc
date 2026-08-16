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
  calculateWithholdingTax,
  withholdingTaxInputSchema,
  withholdingTaxPayloadSchema,
} from "@/domain/calculators/business-tax/withholding-tax";
import {
  calculateFreelanceTaxEstimate,
  freelanceTaxEstimateInputSchema,
  freelanceTaxEstimatePayloadSchema,
} from "@/domain/calculators/business-tax/freelance-tax-estimate";
import {
  calculateSsclCheck,
  ssclCheckInputSchema,
  ssclCheckPayloadSchema,
} from "@/domain/calculators/business-tax/sscl-check";
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

const withholdingTaxRule: RuleDependency = {
  name: "withholdingTax",
  key: "withholding-tax-lk-2026",
  scope: "lk",
};

const paymentTypeOptions = [
  { label: "Select the payment type", value: "" },
  { label: "Interest or discount", value: "interest" },
  { label: "Dividend", value: "dividend" },
  { label: "Rent to a resident person", value: "rent-resident" },
  { label: "Rent to a non-resident person", value: "rent-non-resident" },
  { label: "Service fee to a resident individual", value: "service-fee-resident" },
  { label: "Service fee to a non-resident person", value: "service-fee-non-resident" },
  { label: "Royalty", value: "royalty" },
];

const selfDeclarationOptions = [
  { label: "Select an option", value: "" },
  { label: "No — deduct the tax", value: "no" },
  { label: "Yes — self-declaration on file", value: "yes" },
];

const withholdingTaxMetadata = {
  key: "withholding-tax",
  name: "Withholding tax (AIT/WHT) on payments",
  shortName: "Withholding tax",
  summary: "Estimate withholding or advance income tax on interest, dividends, rent, service fees, and royalties by payment date.",
  category: "Business & Tax",
  classification: "regulated",
  version: "1.0.0",
  accent: "rose",
  fields: [
    { name: "asOfDate", label: "Payment date", type: "date", required: true, min: "2025-04-01", max: "9999-12-31", description: "The date of the payment. The rate is selected by the payment date." },
    { name: "paymentType", label: "Payment type", type: "select", required: true, options: paymentTypeOptions, description: "The kind of payment being made. This selects the withholding or advance income tax rate and whether it is a final or creditable tax." },
    { name: "grossAmount", label: "Gross payment amount", type: "number", required: true, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "The gross amount of the payment, before any deduction. For rent or a resident service fee, use the total paid to this recipient in the calendar month." },
    { name: "interestSelfDeclaration", label: "Interest self-declaration (optional)", type: "select", required: false, options: selfDeclarationOptions, visibleWhen: { field: "paymentType", equals: "interest" }, description: "A resident individual whose total assessable income does not exceed the personal relief may declare to the payer to stop advance income tax on interest." },
  ],
} satisfies CalculatorMetadata;

export const withholdingTaxCalculator = defineRegulatedCalculator({
  ...withholdingTaxMetadata,
  schema: withholdingTaxInputSchema,
  ruleDependencies: [withholdingTaxRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const payload = withholdingTaxPayloadSchema.parse(payloads.withholdingTax);
    const calculation = calculateWithholdingTax(input, payload);

    const resultFields: Record<string, string | number> = {
      paymentType: calculation.paymentType,
      paymentTypeLabel: calculation.paymentTypeLabel,
      paymentDate: calculation.paymentDate,
      ratePercent: calculation.ratePercent,
      rateEffectiveFrom: calculation.rateEffectiveFrom,
      rateLabel: calculation.rateLabel,
      grossAmount: calculation.grossAmount,
      thresholdApplied: calculation.thresholdApplied ? "yes" : "no",
      thresholdExceeded:
        calculation.thresholdExceeded === null ? "n/a" : calculation.thresholdExceeded ? "yes" : "no",
      selfDeclarationApplied: calculation.selfDeclarationApplied ? "yes" : "no",
      wthAmount: calculation.wthAmount,
      netPayment: calculation.netPayment,
      treatment: calculation.treatment,
      reason: calculation.reason,
    };

    const breakdown = [
      { label: "Payment type", value: calculation.paymentTypeLabel },
      { label: "Payment date", value: calculation.paymentDate },
      { label: "Applicable rate", value: calculation.ratePercent, unit: "%", expression: `${calculation.rateLabel}, effective ${calculation.rateEffectiveFrom}` },
      { label: "Gross payment", value: calculation.grossAmount, unit: "LKR", expression: "Amount before any deduction" },
      { label: "WHT / AIT deducted", value: calculation.wthAmount, unit: "LKR", expression: `${calculation.grossAmount} × ${calculation.ratePercent}%` },
      { label: "Net payment", value: calculation.netPayment, unit: "LKR", expression: `${calculation.grossAmount} − ${calculation.wthAmount}` },
      { label: "Treatment", value: calculation.treatment, expression: calculation.treatment === "final" ? "Final tax, not reclaimable" : "Creditable against the recipient's return" },
      { label: "Notes", value: calculation.reason },
    ];

    return baseResult(withholdingTaxMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: resultFields,
      breakdown,
      assumptions: [
        `Withholding and advance income tax are deducted at the rate for the payment date, effective ${payload.effectiveFrom} as published by the Inland Revenue Department.`,
        "Interest, rent, service fees, and royalties are creditable against the recipient's annual return; dividends are a final tax.",
        "Rent to a resident person and service fees to a resident individual are taxed only when the calendar-month aggregate exceeds the LKR 100000 threshold; the gross amount entered is treated as the calendar-month aggregate.",
        `The interest self-declaration applies to a resident individual whose total assessable income does not exceed the personal relief of LKR ${payload.personalRelief}.`,
        "Tax is rounded once to the nearest rupee.",
      ],
      warnings: [
        "This is an estimate for payer guidance, not tax, legal, or accounting advice.",
        "The calendar-month threshold test treats the amount entered as the aggregate paid to this recipient in the month; other payments to the same recipient may change the outcome.",
        "Treaty-reduced rates for non-residents require a tax-residence certificate and are not modelled.",
        "Rates and thresholds change; the result uses the rule effective for the payment date.",
        "Independent formula and accounting review is still required before this regulated rule is published for production use.",
      ],
    });
  },
});

const freelanceTaxEstimateRule: RuleDependency = {
  name: "freelanceTaxEstimate",
  key: "freelance-tax-estimate-lk-2026",
  scope: "lk",
};

const freelanceTaxEstimateMetadata = {
  key: "freelance-tax-estimate",
  name: "Freelancer tax estimate",
  shortName: "Freelancer tax",
  summary: "Estimate annual income tax for a freelancer or service exporter, including the foreign-currency-remitted capped-rate path and foreign tax credit.",
  category: "Business & Tax",
  classification: "regulated",
  version: "1.0.0",
  accent: "gold",
  fields: [
    { name: "asOfDate", label: "Calculation date", type: "date", required: true, min: "2025-04-01", max: "9999-12-31" },
    { name: "businessIncome", label: "Service income", type: "number", required: true, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "Gross service income for the year of assessment. Foreign service income is business income, not employment income." },
    { name: "allowableExpenses", label: "Allowable expenses", type: "number", required: true, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "Expenses incurred in producing the service income and allowed as deductions." },
    { name: "capitalAllowances", label: "Capital allowances (optional)", type: "number", required: false, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "Fourth Schedule depreciation on depreciable business assets. Leave blank for none." },
    { name: "personalReliefOverride", label: "Personal relief (optional)", type: "number", required: false, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "Override the statutory personal relief, for example when part of it is consumed by other income in your return." },
    { name: "foreignIncomeAmount", label: "Foreign-currency-remitted income (optional)", type: "number", required: false, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "Service income rendered for use outside Sri Lanka or foreign-source income, received in foreign currency and remitted through a bank in Sri Lanka. Taxed at a maximum of 15%." },
    { name: "foreignTaxPaid", label: "Foreign tax paid (optional)", type: "number", required: false, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "Income tax paid abroad on the foreign-currency-remitted income, creditable against Sri Lankan tax under section 80. Leave blank if no foreign tax was paid." },
  ],
} satisfies CalculatorMetadata;

export const freelanceTaxEstimateCalculator = defineRegulatedCalculator({
  ...freelanceTaxEstimateMetadata,
  schema: freelanceTaxEstimateInputSchema,
  ruleDependencies: [freelanceTaxEstimateRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const payload = freelanceTaxEstimatePayloadSchema.parse(payloads.freelanceTaxEstimate);
    const calculation = calculateFreelanceTaxEstimate(input, payload);

    const reliefLine =
      calculation.personalReliefSource === "user"
        ? `Custom relief LKR ${calculation.personalRelief} (official relief was LKR ${payload.personalRelief})`
        : `Official relief LKR ${calculation.personalRelief}`;

    const deductionsExpression =
      input.capitalAllowances === undefined
        ? `${calculation.allowableExpenses} expenses`
        : `${calculation.allowableExpenses} expenses + ${calculation.capitalAllowances} capital allowances`;

    const resultFields: Record<string, string | number> = {
      yearOfAssessment: calculation.yearOfAssessment,
      taxpayerCategoryLabel: calculation.taxpayerCategoryLabel,
      businessIncome: calculation.businessIncome,
      allowableExpenses: calculation.allowableExpenses,
      capitalAllowances: calculation.capitalAllowances,
      totalDeductions: calculation.totalDeductions,
      taxableIncomeBeforeRelief: calculation.taxableIncomeBeforeRelief,
      personalRelief: calculation.personalRelief,
      personalReliefSource: calculation.personalReliefSource,
      taxableIncome: calculation.taxableIncome,
      foreignIncomePortion: calculation.foreignIncomePortion,
      domesticPortion: calculation.domesticPortion,
      capPercent: calculation.capPercent,
      foreignTaxNormal: calculation.foreignTaxNormal,
      foreignTaxCapped: calculation.foreignTaxCapped,
      capApplied: calculation.capApplied ? "yes" : "no",
      unroundedTax: calculation.unroundedTax,
      foreignTaxCredit: calculation.foreignTaxCredit,
      creditApplied: calculation.creditApplied ? "yes" : "no",
      incomeTax: calculation.incomeTax,
      effectiveRatePercent: calculation.effectiveRatePercent,
    };

    const foreignNote =
      calculation.foreignIncomePortion === "0"
        ? "No foreign-currency-remitted income entered"
        : calculation.capApplied
          ? `${calculation.foreignTaxCapped} at the ${calculation.capPercent}% cap instead of ${calculation.foreignTaxNormal} at the normal marginal rates`
          : `${calculation.foreignTaxCapped} at the ${calculation.capPercent}% cap (below it the normal marginal rates applied)`;

    const breakdown = [
      { label: "Taxpayer type", value: calculation.taxpayerCategoryLabel },
      { label: "Year of assessment", value: calculation.yearOfAssessment },
      { label: "Service income", value: calculation.businessIncome, unit: "LKR", expression: "Gross service income for the year" },
      { label: "Allowable expenses", value: calculation.allowableExpenses, unit: "LKR" },
      { label: "Capital allowances", value: calculation.capitalAllowances, unit: "LKR", expression: input.capitalAllowances === undefined ? "None entered" : "Fourth Schedule depreciation" },
      { label: "Total deductions", value: calculation.totalDeductions, unit: "LKR", expression: deductionsExpression },
      { label: "Taxable income before relief", value: calculation.taxableIncomeBeforeRelief, unit: "LKR", expression: `${calculation.businessIncome} − ${calculation.totalDeductions}` },
      { label: "Personal relief", value: calculation.personalRelief, unit: "LKR", expression: reliefLine },
      { label: "Taxable income", value: calculation.taxableIncome, unit: "LKR", expression: `${calculation.taxableIncomeBeforeRelief} − ${calculation.personalRelief}` },
      { label: "Domestic taxable portion", value: calculation.domesticPortion, unit: "LKR", expression: "Portion not eligible for the foreign-currency-remitted cap" },
      { label: "Foreign-currency-remitted portion", value: calculation.foreignIncomePortion, unit: "LKR", expression: input.foreignIncomeAmount === undefined ? "None entered" : `Taxed at a maximum of ${calculation.capPercent}%` },
      ...calculation.domesticBands.map((band) => ({
        label: `Tax at ${band.ratePercent}%`,
        value: band.tax,
        unit: "LKR",
        expression: `${band.ratePercent}% on ${band.taxableAmount} (${band.label})`,
      })),
      { label: "Foreign income tax", value: calculation.foreignTaxCapped, unit: "LKR", expression: foreignNote },
      { label: "Unrounded tax", value: calculation.unroundedTax, unit: "LKR", expression: "Sum before rounding and before the foreign tax credit" },
      { label: "Foreign tax credit", value: calculation.foreignTaxCredit, unit: "LKR", expression: calculation.creditApplied ? "Limited to the Sri Lankan tax on the foreign income" : "None" },
      { label: "Income tax payable", value: calculation.incomeTax, unit: "LKR", expression: `Rounded to the nearest rupee (${payload.rounding})` },
      { label: "Effective rate", value: calculation.effectiveRatePercent, unit: "%", expression: `${calculation.incomeTax} ÷ ${calculation.taxableIncome}` },
    ];

    const assumptions = [
      `Rates apply to year of assessment ${calculation.yearOfAssessment} (effective ${payload.effectiveFrom}) as published by the Inland Revenue Department.`,
      `Foreign service income is business income, not employment income; the personal relief of LKR ${payload.personalRelief} applies to the individual's total assessable income.`,
      "Foreign-currency-remitted income (services for use outside Sri Lanka, or foreign-source income, received in foreign currency and remitted through a bank in Sri Lanka) is taxed at a maximum of 15%; the cap never increases the tax above the normal marginal rates.",
      `A foreign tax credit under section 80 is limited to the Sri Lankan tax attributable to the foreign income (LKR ${calculation.foreignTaxCapped}), and excess foreign tax is not refundable or carried forward.`,
      "Tax is computed on taxable income after deductions and relief, then rounded once to the nearest rupee.",
    ];
    if (input.foreignIncomeAmount !== undefined && Number(input.foreignIncomeAmount) > Number(calculation.foreignIncomePortion)) {
      assumptions.push(
        `The foreign-currency-remitted income entered (LKR ${input.foreignIncomeAmount}) exceeds the taxable income and is capped at LKR ${calculation.foreignIncomePortion}.`,
      );
    }

    return baseResult(freelanceTaxEstimateMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: resultFields,
      breakdown,
      assumptions,
      warnings: [
        "This is an estimate for self-assessment, not tax, legal, or accounting advice.",
        "The 15% cap applies only where the foreign service income is for use outside Sri Lanka, is received in foreign currency, and is remitted through a bank in Sri Lanka; otherwise the normal progressive rates apply.",
        "Expenses must be allowable deductions incurred in producing the service income; personal and disallowed items are excluded.",
        "The foreign tax credit requires evidence of the foreign tax actually paid and is limited to the Sri Lankan tax on that income; treaty relief is not modelled.",
        "Losses carried forward, disallowed expenses, and Commissioner-General discretion cases are not modelled.",
        "Independent formula and accounting review is still required before this regulated rule is published for production use.",
      ],
    });
  },
});

const ssclCheckRule: RuleDependency = {
  name: "ssclCheck",
  key: "sscl-lk-2026",
  scope: "lk",
};

const turnoverCategoryOptions = [
  { label: "Select the business type", value: "" },
  { label: "Importer of any article", value: "importer" },
  { label: "Manufacturer of any article", value: "manufacturer" },
  { label: "Service provider (non-financial)", value: "service-provider" },
  { label: "Financial services supplier (20.5% VAT)", value: "financial-service" },
  { label: "Land and improvements", value: "land-improvement" },
  { label: "Wholesale/retail — registered distributor", value: "wholesale-retail-distributor" },
  { label: "Wholesale/retail — other (including importation and sale)", value: "wholesale-retail-other" },
];

const ssclCheckMetadata = {
  key: "sscl-check",
  name: "SSCL liability and registration check",
  shortName: "SSCL check",
  summary: "Check whether a business owes the 2.5% Social Security Contribution Levy and whether it must register, quarter by quarter.",
  category: "Business & Tax",
  classification: "regulated",
  version: "1.0.0",
  accent: "green",
  fields: [
    { name: "asOfDate", label: "Calculation date", type: "date", required: true, min: "2025-04-01", max: "9999-12-31" },
    { name: "turnoverCategory", label: "Business type", type: "select", required: true, options: turnoverCategoryOptions, description: "The liability fraction and registration treatment depend on the business type. Importers must register regardless of turnover; financial services at the 20.5% VAT rate are exempt from SSCL." },
    { name: "periodEndDate", label: "Quarter ending", type: "date", required: true, description: "The last day of the calendar quarter under review. Only the last day of March, June, September, or December is accepted." },
    { name: "quarterlyTurnover", label: "Quarterly turnover", type: "number", required: true, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "Total turnover for the quarter ending on the period-end date, before deducting the liability fraction." },
    { name: "rollingFourQuarterTurnover", label: "Four-quarter turnover (optional)", type: "number", required: false, min: 0, max: 10_000_000_000, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "Total turnover over the current quarter and the previous three. Needed to complete the registration-threshold check." },
  ],
} satisfies CalculatorMetadata;

const registrationStatusLabels: Record<string, string> = {
  mandatory: "Mandatory — must register",
  required: "Registration required",
  "not-required": "Not required",
  indeterminate: "Annual turnover needed",
  exempt: "Exempt from SSCL",
};

export const ssclCheckCalculator = defineRegulatedCalculator({
  ...ssclCheckMetadata,
  schema: ssclCheckInputSchema,
  ruleDependencies: [ssclCheckRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const payload = ssclCheckPayloadSchema.parse(payloads.ssclCheck);
    const calculation = calculateSsclCheck(input, payload);

    const resultFields: Record<string, string | number> = {
      turnoverCategoryLabel: calculation.turnoverCategoryLabel,
      periodStartDate: calculation.periodStartDate,
      periodEndDate: calculation.periodEndDate,
      ratePercent: calculation.ratePercent,
      rateEffectiveFrom: calculation.rateEffectiveFrom,
      liableFractionPercent: calculation.liableFractionPercent,
      quarterlyTurnover: calculation.quarterlyTurnover,
      liableTurnover: calculation.liableTurnover,
      exemptionApplied: calculation.exemptionApplied ? "yes" : "no",
      registrationStatus: registrationStatusLabels[calculation.registrationStatus],
      registrationReason: calculation.registrationReason,
      deregistrationEligible: calculation.deregistrationEligible ? "yes" : "no",
      ssclPayable: calculation.ssclPayable,
    };

    const breakdown = [
      { label: "Business type", value: calculation.turnoverCategoryLabel },
      { label: "Period", value: `${calculation.periodStartDate} to ${calculation.periodEndDate}` },
      { label: "SSCL rate", value: calculation.ratePercent, unit: "%", expression: `Effective ${calculation.rateEffectiveFrom}` },
      { label: "Liable fraction", value: calculation.liableFractionPercent, unit: "%", expression: `SSCL applies to ${calculation.liableFractionPercent}% of this business type's turnover` },
      { label: "Quarterly turnover", value: calculation.quarterlyTurnover, unit: "LKR" },
      { label: "Liable turnover", value: calculation.liableTurnover, unit: "LKR", expression: `${calculation.quarterlyTurnover} × ${calculation.liableFractionPercent}%` },
      { label: "Registration status", value: registrationStatusLabels[calculation.registrationStatus], expression: calculation.registrationReason },
      { label: "SSCL for the quarter", value: calculation.ssclPayable, unit: "LKR", expression: `${calculation.liableTurnover} × ${calculation.ratePercent}% rounded to the nearest rupee` },
    ];

    const assumptions = [
      `SSCL applies at ${calculation.ratePercent}% on the liable fraction of turnover, effective ${calculation.rateEffectiveFrom} under the Social Security Contribution Levy Act, No. 25 of 2022 as amended.`,
      `The liable fraction for this business type is ${calculation.liableFractionPercent}% of turnover.`,
      `Registration is required once the four-quarter turnover exceeds LKR ${payload.registrationThresholds.at(-1)?.annual} or the current quarter's turnover exceeds LKR ${payload.registrationThresholds.at(-1)?.quarter}; importers must register regardless of turnover.`,
      "Turnover means the total value of chargeable transactions before the liability fraction, from which the liable fraction is deducted.",
      "SSCL is computed on the liable fraction of the quarter's turnover and rounded once to the nearest rupee.",
      calculation.exemptionApplied
        ? "Financial services that are subject to VAT at 20.5% are exempt from SSCL for periods commencing on or after the exemption date."
        : "The financial-services exemption does not apply to this period.",
    ];

    const warnings = [
      "This is an estimate for guidance, not tax, legal, or accounting advice.",
      "The registration threshold is tested on turnover of the current quarter and the previous three quarters; leaving the four-quarter turnover blank leaves the annual-threshold leg of the check incomplete.",
      "For a business below both registration thresholds, no SSCL is estimated unless it is an importer (mandatory registration).",
      "The exemption for financial services subject to VAT at 20.5% applies from the exemption date onward; earlier periods are not exempt.",
      "Rates and thresholds change; the result uses the rule effective for the quarter under review.",
      "Independent formula and accounting review is still required before this regulated rule is published for production use.",
    ];

    return baseResult(ssclCheckMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: resultFields,
      breakdown,
      assumptions,
      warnings,
    });
  },
});
