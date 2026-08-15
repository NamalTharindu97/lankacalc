import { z } from "zod";

import { decimal, money } from "@/domain/calculators/decimal";
import {
  apitPayloadSchema,
  calculateApit,
  calculateEpf,
  calculateEtf,
  calculateSalary,
  epfPayloadSchema,
  etfPayloadSchema,
  salaryPayloadsSchema,
} from "@/domain/calculators/employment";
import { decimalInput } from "@/domain/calculators/input";
import {
  defineRegulatedCalculator,
  type CalculationResult,
  type CalculatorField,
  type CalculatorMetadata,
  type RuleDependency,
} from "@/domain/calculators/types";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const maximumMonthlyEarnings = 1_000_000_000_000;

const apitRule: RuleDependency = { name: "apit", key: "apit-primary-regular-monthly", scope: "standard" };
const epfRule: RuleDependency = { name: "epf", key: "epf-standard-contribution", scope: "standard" };
const etfRule: RuleDependency = { name: "etf", key: "etf-standard-contribution", scope: "standard" };

const asOfDateSchema = z.string().regex(dateOnlyPattern, "Enter a valid calculation date.").refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid calculation date.");
const wholeRupees = decimalInput({ min: 0, max: maximumMonthlyEarnings, maxDecimalPlaces: 0 });
const moneyInput = decimalInput({ min: 0, max: maximumMonthlyEarnings, maxDecimalPlaces: 2 });
const supportedScenario = z.literal("confirmed", { error: "Confirm that the supported employment scenario applies." });

const scenarioField: CalculatorField = {
  name: "supportedScenario",
  label: "Employment scenario",
  type: "select",
  required: true,
  description: "Use only for one standard-covered primary employment and regular monthly cash earnings.",
  options: [
    { label: "Select the supported scenario", value: "" },
    { label: "I confirm the supported standard scenario", value: "confirmed" },
  ],
};

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

const commonWarnings = [
  "Estimate only; confirm payroll, tax, fund coverage, and earnings classification with the relevant authorities or a qualified adviser.",
  "Bonuses, arrears, non-cash benefits, secondary employment, non-resident non-citizens, employer-paid tax, and cumulative cases are excluded.",
];

const apitMetadata = {
  key: "apit",
  name: "APIT calculator",
  shortName: "APIT",
  summary: "Estimate monthly APIT for regular profits from one primary employment.",
  category: "Employment",
  classification: "regulated",
  version: "1.0.0",
  accent: "rose",
  fields: [
    { name: "asOfDate", label: "Calculation date", type: "date", required: true, min: "2025-04-01", max: "9999-12-31" },
    { name: "monthlyRegularEmploymentEarnings", label: "Monthly regular employment earnings", type: "number", required: true, min: 0, max: maximumMonthlyEarnings, maxDecimalPlaces: 0, step: 1, suffix: "LKR" },
    scenarioField,
  ],
} satisfies CalculatorMetadata;

const apitInputSchema = z.object({
  asOfDate: asOfDateSchema,
  monthlyRegularEmploymentEarnings: wholeRupees,
  supportedScenario,
}).strict();

export const apitCalculator = defineRegulatedCalculator({
  ...apitMetadata,
  schema: apitInputSchema,
  ruleDependencies: [apitRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const payload = apitPayloadSchema.parse(payloads.apit);
    const apit = calculateApit({ monthlyTaxableIncome: input.monthlyRegularEmploymentEarnings }, payload);
    const amount = money(decimal(apit.tax));
    const ratePercent = decimal(apit.selectedBracket.rate).mul(100).toString();
    return baseResult(apitMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: { apit: amount, monthlyRegularEmploymentEarnings: input.monthlyRegularEmploymentEarnings, ratePercent },
      breakdown: [
        { label: "Monthly regular earnings", value: money(decimal(input.monthlyRegularEmploymentEarnings)), unit: "LKR" },
        { label: "Applicable APIT rate", value: ratePercent, unit: "%" },
        { label: "Formula deduction", value: money(decimal(apit.selectedBracket.deduction)), unit: "LKR" },
        { label: "Monthly APIT", value: amount, unit: "LKR" },
      ],
      assumptions: ["One calendar month of regular cash earnings from one primary employment.", "The APIT base has already been classified under the official table."],
      warnings: commonWarnings,
    });
  },
});

const epfMetadata = {
  key: "epf",
  name: "EPF contribution calculator",
  shortName: "EPF",
  summary: "Estimate statutory employee and employer EPF contributions.",
  category: "Employment",
  classification: "regulated",
  version: "1.0.0",
  accent: "green",
  fields: [
    { name: "asOfDate", label: "Calculation date", type: "date", required: true, min: "1981-01-01", max: "9999-12-31" },
    { name: "eligibleEarnings", label: "EPF-eligible monthly earnings", type: "number", required: true, min: 0, max: maximumMonthlyEarnings, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR" },
    scenarioField,
  ],
} satisfies CalculatorMetadata;

const epfInputSchema = z.object({ asOfDate: asOfDateSchema, eligibleEarnings: moneyInput, supportedScenario }).strict();

export const epfCalculator = defineRegulatedCalculator({
  ...epfMetadata,
  schema: epfInputSchema,
  ruleDependencies: [epfRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const epf = calculateEpf({ eligibleEarnings: input.eligibleEarnings }, epfPayloadSchema.parse(payloads.epf));
    return baseResult(epfMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: { eligibleEarnings: epf.eligibleEarnings, employeeContribution: epf.employee.amount, employerContribution: epf.employer.amount, totalContribution: epf.totalContribution },
      breakdown: [
        { label: "Eligible monthly earnings", value: epf.eligibleEarnings, unit: "LKR" },
        { label: "Employee EPF", expression: `${decimal(epf.employee.rate).mul(100)}%`, value: epf.employee.amount, unit: "LKR" },
        { label: "Employer EPF", expression: `${decimal(epf.employer.rate).mul(100)}%`, value: epf.employer.amount, unit: "LKR" },
        { label: "Total EPF contribution", value: epf.totalContribution, unit: "LKR" },
      ],
      assumptions: ["The employment is covered and the statutory standard contribution rates apply.", "The entered amount has already been classified as EPF-eligible earnings."],
      warnings: [...commonWarnings, "Higher elected rates, approved funds, and coverage exceptions are not supported."],
    });
  },
});

const etfMetadata = {
  key: "etf",
  name: "ETF contribution calculator",
  shortName: "ETF",
  summary: "Estimate the employer-only ETF contribution for standard-covered employment.",
  category: "Employment",
  classification: "regulated",
  version: "1.0.0",
  accent: "blue",
  fields: [
    { name: "asOfDate", label: "Calculation date", type: "date", required: true, min: "1982-01-01", max: "9999-12-31" },
    { name: "eligibleEarnings", label: "ETF-eligible monthly earnings", type: "number", required: true, min: 0, max: maximumMonthlyEarnings, maxDecimalPlaces: 0, step: 1, suffix: "LKR" },
    scenarioField,
  ],
} satisfies CalculatorMetadata;

const etfInputSchema = z.object({ asOfDate: asOfDateSchema, eligibleEarnings: wholeRupees, supportedScenario }).strict();

export const etfCalculator = defineRegulatedCalculator({
  ...etfMetadata,
  schema: etfInputSchema,
  ruleDependencies: [etfRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const etf = calculateEtf({ eligibleEarnings: input.eligibleEarnings }, etfPayloadSchema.parse(payloads.etf));
    return baseResult(etfMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: { eligibleEarnings: etf.eligibleEarnings, employerContribution: etf.employer.amount },
      breakdown: [
        { label: "Eligible monthly earnings", value: etf.eligibleEarnings, unit: "LKR" },
        { label: "Employer ETF", expression: `${decimal(etf.employer.rate).mul(100)}%`, value: etf.employer.amount, unit: "LKR" },
        { label: "Employee ETF deduction", value: "0.00", unit: "LKR" },
      ],
      assumptions: ["The employment is covered by the standard ETF rule.", "Whole-rupee earnings keep the statutory percentage exact to cents."],
      warnings: [...commonWarnings, "ETF is paid by the employer and must not be deducted from employee earnings."],
    });
  },
});

const salaryFields = [
  { name: "asOfDate", label: "Calculation date", type: "date", required: true, min: "2025-04-01", max: "9999-12-31" },
  { name: "basicPay", label: "Basic monthly pay", type: "number", required: true, min: 0, max: maximumMonthlyEarnings, maxDecimalPlaces: 0, step: 1, suffix: "LKR" },
  { name: "additionalFundEarnings", label: "Additional EPF/ETF-eligible earnings", type: "number", required: true, min: 0, max: maximumMonthlyEarnings, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "For example, already-classified COLA, holiday pay, meal allowance, or commission." },
  { name: "apitOnlyEarnings", label: "Additional APIT-only earnings", type: "number", required: true, min: 0, max: maximumMonthlyEarnings, maxDecimalPlaces: 0, step: 1, suffix: "LKR", description: "For example, already-classified regular overtime or taxable cash allowances excluded from the fund base." },
  scenarioField,
] satisfies CalculatorMetadata["fields"];

const salaryInputSchema = z.object({
  asOfDate: asOfDateSchema,
  basicPay: wholeRupees,
  additionalFundEarnings: wholeRupees,
  apitOnlyEarnings: wholeRupees,
  supportedScenario,
}).strict();

function runSalaryCalculation(
  metadata: Pick<CalculatorMetadata, "key" | "version">,
  input: z.output<typeof salaryInputSchema>,
  payloads: Readonly<Record<string, unknown>>,
  takeHomeOnly: boolean,
): CalculationResult {
  const salary = calculateSalary({
    basicPay: input.basicPay,
    additionalFundEarnings: input.additionalFundEarnings,
    apitOnlyEarnings: input.apitOnlyEarnings,
  }, salaryPayloadsSchema.parse(payloads));
  const apit = money(decimal(salary.contributions.apit.tax));
  const employeeEpf = salary.contributions.epf.employee.amount;
  const employerEpf = salary.contributions.epf.employer.amount;
  const employerEtf = salary.contributions.etf.employer.amount;
  const employeeDeductions = money(decimal(apit).plus(employeeEpf));
  const apitBase = salary.apitTaxableIncome;
  const fundBase = salary.fundEligibleEarnings;

  return baseResult(metadata, {
    asOfDate: input.asOfDate,
    normalizedInputs: input,
    result: takeHomeOnly ? {
      grossPay: salary.grossPay,
      apitBase,
      fundBase,
      apit,
      employeeEpf,
      employeeDeductions,
      takeHomePay: salary.takeHomePay,
      employerEpf,
      employerEtf,
    } : {
      grossPay: salary.grossPay,
      apitBase,
      fundBase,
      apit,
      employeeEpf,
      employerEpf,
      totalEpf: money(decimal(employeeEpf).plus(employerEpf)),
      employerEtf,
      employeeDeductions,
      employerContributions: money(decimal(employerEpf).plus(employerEtf)),
    },
    breakdown: takeHomeOnly ? [
      { label: "Gross monthly pay", value: salary.grossPay, unit: "LKR" },
      { label: "APIT base", value: apitBase, unit: "LKR" },
      { label: "EPF/ETF base", value: fundBase, unit: "LKR" },
      { label: "Less monthly APIT", value: apit, unit: "LKR" },
      { label: "Less employee EPF", value: employeeEpf, unit: "LKR" },
      { label: "Employee deductions in this estimate", value: employeeDeductions, unit: "LKR" },
      { label: "Estimated take-home pay", value: salary.takeHomePay, unit: "LKR" },
      { label: "Employer EPF (not deducted)", value: employerEpf, unit: "LKR" },
      { label: "Employer ETF (not deducted)", value: employerEtf, unit: "LKR" },
    ] : [
      { label: "Gross monthly pay", value: salary.grossPay, unit: "LKR" },
      { label: "APIT base", value: apitBase, unit: "LKR" },
      { label: "EPF/ETF base", value: fundBase, unit: "LKR" },
      { label: "Monthly APIT", value: apit, unit: "LKR" },
      { label: "Employee EPF", value: employeeEpf, unit: "LKR" },
      { label: "Employer EPF", value: employerEpf, unit: "LKR" },
      { label: "Total EPF", value: money(decimal(employeeEpf).plus(employerEpf)), unit: "LKR" },
      { label: "Employer ETF", value: employerEtf, unit: "LKR" },
      { label: "Employee deductions in this estimate", value: employeeDeductions, unit: "LKR" },
      { label: "Employer fund contributions", value: money(decimal(employerEpf).plus(employerEtf)), unit: "LKR" },
    ],
    assumptions: ["One calendar month, one primary employment, and standard EPF/ETF coverage.", "The entered components have already been classified into APIT and fund earnings bases."],
    warnings: [...commonWarnings, "Employer EPF and ETF are employer costs and are not deducted from take-home pay."],
  });
}

const salaryMetadata = {
  key: "salary",
  name: "Salary calculator",
  shortName: "Salary",
  summary: "Estimate monthly APIT and standard EPF/ETF salary amounts.",
  category: "Employment",
  classification: "regulated",
  version: "1.0.0",
  accent: "gold",
  fields: salaryFields,
} satisfies CalculatorMetadata;

export const salaryCalculator = defineRegulatedCalculator({
  ...salaryMetadata,
  schema: salaryInputSchema,
  ruleDependencies: [apitRule, epfRule, etfRule],
  getAsOfDate: (input) => input.asOfDate,
  run: (input, payloads) => runSalaryCalculation(salaryMetadata, input, payloads, false),
});

const takeHomeMetadata = {
  key: "take-home",
  name: "Take-home pay calculator",
  shortName: "Take-home",
  summary: "Estimate monthly pay after APIT and employee EPF.",
  category: "Employment",
  classification: "regulated",
  version: "1.0.0",
  accent: "orange",
  fields: salaryFields,
} satisfies CalculatorMetadata;

export const takeHomeCalculator = defineRegulatedCalculator({
  ...takeHomeMetadata,
  schema: salaryInputSchema,
  ruleDependencies: [apitRule, epfRule, etfRule],
  getAsOfDate: (input) => input.asOfDate,
  run: (input, payloads) => runSalaryCalculation(takeHomeMetadata, input, payloads, true),
});
