import { z } from "zod";

import { decimal, money } from "@/domain/calculators/decimal";
import {
  apitPayloadSchema,
  calculateApit,
  calculateEpf,
  calculateEtf,
  calculateGratuity,
  calculateNetToGross,
  calculateOvertime,
  calculateSalary,
  epfPayloadSchema,
  etfPayloadSchema,
  gratuityPayloadSchema,
  overtimePayloadSchema,
  salaryPayloadsSchema,
} from "@/domain/calculators/employment";
import { decimalInput, integerInput } from "@/domain/calculators/input";
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
const gratuityRule: RuleDependency = { name: "gratuity", key: "gratuity-payment-act-employment-1983-03-18", scope: "standard" };
const overtimeRule: RuleDependency = { name: "overtime", key: "overtime-shop-office-employment-1954-08-09", scope: "standard" };

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

const netToGrossMetadata = {
  key: "net-to-gross",
  name: "Net-to-gross calculator",
  shortName: "Net-to-gross",
  summary: "Find the gross monthly salary needed for a target take-home.",
  category: "Employment",
  classification: "regulated",
  version: "1.0.0",
  accent: "blue",
  fields: [
    { name: "asOfDate", label: "Calculation date", type: "date", required: true, min: "2025-04-01", max: "9999-12-31" },
    { name: "targetTakeHomePay", label: "Target monthly take-home pay", type: "number", required: true, min: 0, max: maximumMonthlyEarnings, maxDecimalPlaces: 0, step: 1, suffix: "LKR" },
    {
      name: "apitOnlyEarnings",
      label: "APIT-only earnings in the needed salary",
      type: "number",
      required: true,
      min: 0,
      max: maximumMonthlyEarnings,
      maxDecimalPlaces: 0,
      step: 1,
      suffix: "LKR",
      description: "The portion of the salary outside the EPF/ETF base. Use zero when the whole salary is fund-eligible.",
    },
    scenarioField,
  ],
} satisfies CalculatorMetadata;

const netToGrossRequestSchema = z.object({
  asOfDate: asOfDateSchema,
  targetTakeHomePay: wholeRupees,
  apitOnlyEarnings: wholeRupees,
  supportedScenario,
}).strict();

export const netToGrossCalculator = defineRegulatedCalculator({
  ...netToGrossMetadata,
  schema: netToGrossRequestSchema,
  ruleDependencies: [apitRule, epfRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const inversion = calculateNetToGross(
      { targetTakeHomePay: input.targetTakeHomePay, apitOnlyEarnings: input.apitOnlyEarnings },
      {
        apit: apitPayloadSchema.parse(payloads.apit),
        epf: epfPayloadSchema.parse(payloads.epf),
      },
    );

    if (!inversion.converged) {
      return baseResult(netToGrossMetadata, {
        asOfDate: input.asOfDate,
        normalizedInputs: input,
        result: {
          convergence: "not-converged",
          targetTakeHomePay: input.targetTakeHomePay,
          maxAchievableTakeHomePay: inversion.maxAchievableTakeHomePay,
        },
        breakdown: [
          { label: "Target monthly take-home", value: money(decimal(input.targetTakeHomePay)), unit: "LKR" },
          { label: "Maximum achievable take-home at the supported salary bound", value: inversion.maxAchievableTakeHomePay, unit: "LKR" },
        ],
        assumptions: ["The supported salary bound is LKR 1,000,000,000,000 per month."],
        warnings: [...commonWarnings, "The requested take-home exceeds the maximum achievable within the supported salary bound."],
      });
    }

    return baseResult(netToGrossMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: {
        requiredGrossPay: inversion.requiredGrossPay ?? "",
        fundBase: inversion.fundBase ?? "",
        apitOnlyEarnings: input.apitOnlyEarnings,
        apit: inversion.apit ?? "",
        employeeEpf: inversion.employeeEpf ?? "",
        computedTakeHomePay: inversion.computedTakeHomePay ?? "",
        excessOverTarget: inversion.excessOverTarget ?? "",
        resolvedBracketRatePercent: inversion.resolvedBracketRatePercent ?? "",
        bracketsEvaluated: inversion.bracketsEvaluated,
        convergence: "minimum-gross",
      },
      breakdown: [
        { label: "Target monthly take-home", value: money(decimal(input.targetTakeHomePay)), unit: "LKR" },
        { label: "Required gross monthly salary", value: inversion.requiredGrossPay ?? "", unit: "LKR" },
        { label: "EPF/ETF base of the required salary", value: inversion.fundBase ?? "", unit: "LKR" },
        { label: "Less APIT on the required salary", value: inversion.apit ?? "", unit: "LKR" },
        { label: "Less employee EPF", value: inversion.employeeEpf ?? "", unit: "LKR" },
        { label: "Achieved take-home pay", value: inversion.computedTakeHomePay ?? "", unit: "LKR" },
        { label: "Rounding surplus above target", value: inversion.excessOverTarget ?? "", unit: "LKR" },
      ],
      assumptions: [
        "The result is the minimum whole-rupee salary that achieves the target.",
        "The result depends on the entered APIT-only split and inherits the approved take-home component formulas.",
      ],
      warnings: [
        ...commonWarnings,
        "Whole-rupee rounding means a few gross amounts satisfy the same target; the minimum is returned.",
        "Confirm the APIT-only amount before relying on the required salary; a different split changes it.",
      ],
    });
  },
});

const gratuityConfirmationField: Omit<CalculatorField, "name" | "label"> = {
  type: "select",
  required: true,
  options: [
    { label: "Select an answer", value: "" },
    { label: "Yes", value: "confirmed" },
    { label: "No", value: "not-confirmed" },
  ],
};

const gratuityMetadata = {
  key: "gratuity",
  name: "Gratuity calculator",
  shortName: "Gratuity",
  summary: "Estimate the statutory gratuity for a completed service period.",
  category: "Employment",
  classification: "regulated",
  version: "1.0.0",
  accent: "green",
  fields: [
    { name: "asOfDate", label: "Termination date", type: "date", required: true, min: "1983-03-18", max: "9999-12-31" },
    {
      name: "lastDrawnMonthlyWage",
      label: "Last drawn monthly wage",
      type: "number",
      required: true,
      min: 0,
      max: maximumMonthlyEarnings,
      maxDecimalPlaces: 0,
      step: 1,
      suffix: "LKR",
      description: "The monthly wage or salary at which gratuity is computed.",
    },
    { name: "completedYearsOfService", label: "Completed years of service", type: "number", required: true, min: 0, max: 100, maxDecimalPlaces: 0, step: 1, suffix: "years" },
    {
      ...gratuityConfirmationField,
      name: "employerWorkmenAtLeast15",
      label: "Employer had at least 15 workmen in the 12 months before termination",
      description: "Section 5(1) of the Payment of Gratuity Act applies when the employer employs or has employed fifteen or more workmen during that period.",
    },
    {
      ...gratuityConfirmationField,
      name: "notExcludedByAct",
      label: "Not excluded by section 7 of the Payment of Gratuity Act",
      description: "Section 7 excludes domestic servants or personal chauffeurs in private households and workmen entitled to a pension under a non-contributory pension scheme.",
    },
    scenarioField,
  ],
} satisfies CalculatorMetadata;

const gratuityConfirmationSchema = z.enum(["confirmed", "not-confirmed"], {
  error: "Select an answer for each statutory condition.",
});

const gratuityRequestSchema = z.object({
  asOfDate: asOfDateSchema,
  lastDrawnMonthlyWage: wholeRupees,
  completedYearsOfService: integerInput({ min: 0, max: 100 }),
  employerWorkmenAtLeast15: gratuityConfirmationSchema,
  notExcludedByAct: gratuityConfirmationSchema,
  supportedScenario,
}).strict();

export const gratuityCalculator = defineRegulatedCalculator({
  ...gratuityMetadata,
  schema: gratuityRequestSchema,
  ruleDependencies: [gratuityRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const gratuity = calculateGratuity(
      {
        lastDrawnMonthlyWage: input.lastDrawnMonthlyWage,
        completedYearsOfService: String(input.completedYearsOfService),
        employerWorkmenAtLeast15: input.employerWorkmenAtLeast15,
        notExcludedByAct: input.notExcludedByAct,
      },
      gratuityPayloadSchema.parse(payloads.gratuity),
    );

    const notEligibleReason = gratuity.notEligibleReason ?? "";
    const notEligibleLabels: Record<string, string> = {
      "service-below-five-years": "Service below the statutory five completed years",
      "employer-workmen-below-fifteen": "Employer below the statutory fifteen-workmen threshold",
      "excluded-by-act": "The employment is excluded by section 7 of the Payment of Gratuity Act",
    };

    return baseResult(gratuityMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: {
        eligibility: gratuity.eligible ? "eligible" : "not-eligible",
        notEligibleReason,
        gratuity: gratuity.gratuity,
        halfMonthAmount: gratuity.halfMonthAmount,
        ratePerCompletedYear: gratuity.ratePerCompletedYear,
        completedYearsOfService: input.completedYearsOfService,
      },
      breakdown: [
        { label: "Last drawn monthly wage", value: money(decimal(input.lastDrawnMonthlyWage)), unit: "LKR" },
        { label: "Half-month amount per completed year", value: gratuity.halfMonthAmount, unit: "LKR" },
        { label: "Completed years of service", value: String(input.completedYearsOfService), unit: "years" },
        { label: "Statutory gratuity", value: gratuity.gratuity, unit: "LKR" },
      ],
      assumptions: [
        "The calculation covers a monthly-rated workman only.",
        "Gratuity is half a month's wage for each completed year, computed at the wage last drawn.",
        "Gratuity is rounded to the nearest rupee as a calculator convention.",
        "Gratuity is payable within thirty days of termination.",
        "Partial years are not prorated; only fully completed years count.",
      ],
      warnings: [
        ...commonWarnings,
        gratuity.eligible
          ? "Eligibility conditions are user-confirmed and are not verified by the tool."
          : `${notEligibleLabels[notEligibleReason]}; no statutory gratuity is payable.`,
        "Daily, contract, and piece-rated workmen are out of scope.",
      ],
    });
  },
});

const overtimeHours = decimalInput({ min: 0, max: 744, maxDecimalPlaces: 1 }).refine(
  (value) => decimal(value).mul(2).isInteger(),
  "Enter overtime hours in steps of half an hour.",
);

const overtimeMetadata = {
  key: "overtime",
  name: "Overtime calculator",
  shortName: "Overtime",
  summary: "Estimate overtime pay for work beyond normal hours.",
  category: "Employment",
  classification: "regulated",
  version: "1.0.0",
  accent: "gold",
  fields: [
    { name: "asOfDate", label: "Calculation month date", type: "date", required: true, min: "1954-08-09", max: "9999-12-31" },
    {
      name: "monthlyRemuneration",
      label: "Monthly remuneration",
      type: "number",
      required: true,
      min: 0,
      max: maximumMonthlyEarnings,
      maxDecimalPlaces: 0,
      step: 1,
      suffix: "LKR",
      description: "The ordinary monthly remuneration (including cost-of-living allowance) on which the hourly rate is computed.",
    },
    {
      name: "hourlyRateBasis",
      label: "Hourly-rate basis",
      type: "select",
      required: true,
      description: "The statute divides the monthly remuneration by 240; many payslips use the Labour Department 200-hour convention.",
      options: [
        { label: "Select a basis", value: "" },
        { label: "Monthly remuneration ÷ 240 (statutory)", value: "statutory-240" },
        { label: "Monthly remuneration ÷ 200 (convention)", value: "convention-200" },
      ],
    },
    { name: "weekdayOvertimeHours", label: "Weekday overtime hours", type: "number", required: true, min: 0, max: 744, maxDecimalPlaces: 1, step: 0.5, suffix: "hours" },
    { name: "restDayOvertimeHours", label: "Weekly day-off overtime hours", type: "number", required: true, min: 0, max: 744, maxDecimalPlaces: 1, step: 0.5, suffix: "hours" },
    scenarioField,
  ],
} satisfies CalculatorMetadata;

const overtimeRequestSchema = z.object({
  asOfDate: asOfDateSchema,
  monthlyRemuneration: wholeRupees,
  hourlyRateBasis: z.enum(["statutory-240", "convention-200"], { error: "Select an hourly-rate basis." }),
  weekdayOvertimeHours: overtimeHours,
  restDayOvertimeHours: overtimeHours,
  supportedScenario,
}).strict();

export const overtimeCalculator = defineRegulatedCalculator({
  ...overtimeMetadata,
  schema: overtimeRequestSchema,
  ruleDependencies: [overtimeRule],
  getAsOfDate: (input) => input.asOfDate,
  run(input, payloads) {
    const overtime = calculateOvertime(
      {
        monthlyRemuneration: input.monthlyRemuneration,
        hourlyRateBasis: input.hourlyRateBasis,
        weekdayOvertimeHours: input.weekdayOvertimeHours,
        restDayOvertimeHours: input.restDayOvertimeHours,
      },
      overtimePayloadSchema.parse(payloads.overtime),
    );

    const basisLabel = input.hourlyRateBasis === "statutory-240"
      ? "Monthly remuneration ÷ 240 (statutory)"
      : "Monthly remuneration ÷ 200 (convention)";

    return baseResult(overtimeMetadata, {
      asOfDate: input.asOfDate,
      normalizedInputs: input,
      result: {
        hourlyRate: overtime.hourlyRate,
        hourlyRateDivisor: overtime.hourlyRateDivisor,
        weekdayMultiplier: overtime.weekdayMultiplier,
        restDayMultiplier: overtime.restDayMultiplier,
        weekdayOvertimePay: overtime.weekdayOvertimePay,
        restDayOvertimePay: overtime.restDayOvertimePay,
        totalOvertimePay: overtime.totalOvertimePay,
        totalOvertimeHours: overtime.totalOvertimeHours,
        averageWeeklyOvertimeHours: overtime.averageWeeklyOvertimeHours,
        weeklyCapExceeded: overtime.weeklyCapExceeded,
      },
      breakdown: [
        { label: "Monthly remuneration", value: money(decimal(input.monthlyRemuneration)), unit: "LKR" },
        { label: "Hourly-rate basis", value: basisLabel },
        { label: "Ordinary hourly rate", value: overtime.hourlyRate, unit: "LKR" },
        { label: `Weekday overtime at ${overtime.weekdayMultiplier}x`, value: overtime.weekdayOvertimePay, unit: "LKR" },
        { label: `Weekly day-off overtime at ${overtime.restDayMultiplier}x`, value: overtime.restDayOvertimePay, unit: "LKR" },
        { label: "Total overtime pay", value: overtime.totalOvertimePay, unit: "LKR" },
      ],
      assumptions: [
        "The calculation covers a monthly-rated shop or office employee under the Shop and Office Employees Act.",
        "Overtime is paid at not less than 1.5 times the normal hourly rate.",
        overtime.hourlyRateDivisor === 240
          ? "The statutory hourly rate is the monthly remuneration divided by 240."
          : "The 200-hour divisor is a Labour Department inspection convention, not a section 11 rule.",
        "Overtime pay is rounded to the nearest cent as a calculator convention.",
        "The twelve-hour weekly cap is an informational average-month check.",
      ],
      warnings: [
        ...commonWarnings,
        "Public-holiday work under the Act is compensated by an extra day's wage or an alternative holiday and is not part of this cash calculation.",
        overtime.weeklyCapExceeded === "possible"
          ? "Average weekly overtime exceeds the twelve-hour cap; verify per-week compliance separately."
          : "The twelve-hour weekly cap is checked on an average-month basis and cannot verify per-week compliance.",
        "Executives and daily-, weekly-, or fortnightly-rated employees are out of scope.",
      ],
    });
  },
});
