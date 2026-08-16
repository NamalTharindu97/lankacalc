import Decimal from "decimal.js";
import { z } from "zod";

import { decimal, money, moneyRoundedDown } from "@/domain/calculators/decimal";
import { decimalInput, integerInput } from "@/domain/calculators/input";
import {
  defineCalculator,
  type BreakdownItem,
  type CalculatorMetadata,
  type CalculationResult,
} from "@/domain/calculators/types";

function lendingResult(
  calculator: Pick<CalculatorMetadata, "key" | "version">,
  values: Omit<CalculationResult, "calculator" | "calculationVersion" | "ruleVersions" | "sources" | "verifiedAt">,
): CalculationResult {
  return {
    calculator: calculator.key,
    calculationVersion: calculator.version,
    ruleVersions: [],
    sources: [],
    verifiedAt: null,
    ...values,
  };
}

const lkrAmount = decimalInput({ min: "0.01", max: 1_000_000_000_000, maxDecimalPlaces: 2 });
const lkrNonNegative = decimalInput({ min: 0, max: 1_000_000_000_000, maxDecimalPlaces: 2 });
const nominalRatePercent = decimalInput({ min: 0, max: 100, maxDecimalPlaces: 6 });
const feePercent = decimalInput({ min: 0, max: 100, maxDecimalPlaces: 2 });
const termMonths = integerInput({ min: 1, max: 1200 });

function schedulePayments(principal: Decimal, monthlyRate: Decimal, term: number) {
  const unroundedMonthly = monthlyRate.isZero()
    ? principal.div(term)
    : principal
        .mul(monthlyRate)
        .mul(decimal(1).plus(monthlyRate).pow(term))
        .div(decimal(1).plus(monthlyRate).pow(term).minus(1));
  let monthlyPayment = decimal(money(unroundedMonthly));
  const totalPayment = decimal(money(unroundedMonthly.mul(term)));
  let finalPayment = totalPayment.minus(monthlyPayment.mul(term - 1));
  if (term > 1 && !finalPayment.isPositive()) {
    monthlyPayment = decimal(moneyRoundedDown(totalPayment.div(term)));
    finalPayment = totalPayment.minus(monthlyPayment.mul(term - 1));
  }
  return {
    monthlyPayment,
    finalPayment,
    totalPayment,
    totalInterest: totalPayment.minus(principal),
  };
}

function simulateEarlyPayment(
  principal: Decimal,
  monthlyRate: Decimal,
  term: number,
  monthlyPayment: Decimal,
  extraAmount: Decimal,
  extraMonth: number,
) {
  let balance = principal;
  let appliedExtra = decimal(0);
  let months = 0;
  let lastPayment = decimal(0);

  for (let month = 1; month <= term; month += 1) {
    const interest = balance.mul(monthlyRate);
    if (balance.plus(interest).lessThanOrEqualTo(monthlyPayment)) {
      lastPayment = balance.plus(interest);
      months = month;
      break;
    }
    balance = balance.plus(interest).minus(monthlyPayment);
    if (month === extraMonth) {
      const credit = Decimal.min(extraAmount, balance);
      balance = balance.minus(credit);
      appliedExtra = appliedExtra.plus(credit);
      if (balance.isZero()) {
        lastPayment = monthlyPayment;
        months = month;
        break;
      }
    }
    if (month === term) {
      lastPayment = balance.plus(interest);
      months = term;
    }
  }

  const totalWithExtra = monthlyPayment
    .mul(months - 1)
    .plus(lastPayment)
    .plus(appliedExtra);
  const interestWithExtra = totalWithExtra.minus(principal).minus(appliedExtra);
  return { months, lastPayment, totalWithExtra, interestWithExtra };
}

const loanScheduleMetadata = {
  key: "loan-schedule",
  name: "Loan schedule calculator",
  shortName: "Loan schedule",
  summary: "Estimate the full repayment picture for a fixed-rate loan, including fees, insurance, and an optional early payment.",
  category: "Money",
  classification: "static",
  version: "1.0.0",
  accent: "rose",
  fields: [
    { name: "principal", label: "Loan amount", type: "number", required: true, min: 0.01, max: 1_000_000_000_000, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR" },
    { name: "annualRatePercent", label: "Nominal annual interest rate", type: "number", required: true, min: 0, max: 100, maxDecimalPlaces: 6, step: 0.000001, suffix: "%" },
    { name: "termMonths", label: "Loan term", type: "number", required: true, min: 1, max: 1200, maxDecimalPlaces: 0, step: 1, suffix: "months" },
    { name: "processingFeePercent", label: "Processing fee", type: "number", required: true, min: 0, max: 100, maxDecimalPlaces: 2, step: 0.01, suffix: "% of loan", defaultValue: 0 },
    { name: "monthlyInsurancePremium", label: "Monthly insurance premium", type: "number", required: true, min: 0, max: 100_000_000, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR/month", defaultValue: 0 },
    { name: "extraPaymentAmount", label: "Extra one-off payment", type: "number", required: true, min: 0, max: 1_000_000_000_000, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR", defaultValue: 0, description: "Optional lump-sum paid against the principal. Keep the regular payment unchanged to shorten the term." },
    { name: "extraPaymentMonth", label: "Extra payment month", type: "number", required: true, min: 0, max: 1200, maxDecimalPlaces: 0, step: 1, suffix: "month", defaultValue: 0, description: "Which month the extra payment is made; 0 means no early payment." },
  ],
} as const satisfies CalculatorMetadata;

const loanScheduleSchema = z
  .object({
    principal: lkrAmount,
    annualRatePercent: nominalRatePercent,
    termMonths: termMonths,
    processingFeePercent: feePercent,
    monthlyInsurancePremium: decimalInput({ min: 0, max: 100_000_000, maxDecimalPlaces: 2 }),
    extraPaymentAmount: lkrNonNegative,
    extraPaymentMonth: integerInput({ min: 0, max: 1200 }),
  })
  .refine(
    (input) => input.extraPaymentMonth === 0 || input.extraPaymentMonth <= input.termMonths,
    {
      message: "The extra payment month must be within the loan term.",
      path: ["extraPaymentMonth"],
    },
  );

export const loanScheduleCalculator = defineCalculator({
  ...loanScheduleMetadata,
  schema: loanScheduleSchema,
  run(input) {
    const principal = decimal(input.principal);
    const monthlyRate = decimal(input.annualRatePercent).div(1200);
    const payments = schedulePayments(principal, monthlyRate, input.termMonths);
    const processingFeeAmount = principal.mul(input.processingFeePercent).div(100);
    const totalInsurance = decimal(input.monthlyInsurancePremium).mul(input.termMonths);
    const totalCost = payments.totalPayment.plus(processingFeeAmount).plus(totalInsurance);

    const breakdown: BreakdownItem[] = [
      { label: "Regular monthly installment", value: money(payments.monthlyPayment), unit: "LKR" },
      { label: "Adjusted final installment", value: money(payments.finalPayment), unit: "LKR" },
      { label: "Total interest", value: money(payments.totalInterest), unit: "LKR" },
      { label: "Total repayment", value: money(payments.totalPayment), unit: "LKR" },
      { label: "Processing fee", value: money(processingFeeAmount), unit: "LKR" },
      { label: "Insurance premium total", value: money(totalInsurance), unit: "LKR" },
      { label: "Total cost", value: money(totalCost), unit: "LKR" },
    ];

    const result: Record<string, string | number> = {
      monthlyPayment: money(payments.monthlyPayment),
      finalPayment: money(payments.finalPayment),
      totalPayment: money(payments.totalPayment),
      totalInterest: money(payments.totalInterest),
      processingFeeAmount: money(processingFeeAmount),
      totalInsurance: money(totalInsurance),
      totalCost: money(totalCost),
    };

    const assumptions = [
      "The entered rate is a nominal annual rate divided by 12 for monthly calculations.",
      "Regular installments are rounded to cents; the final installment is adjusted so displayed payments reconcile with the displayed total.",
      "The processing fee and insurance premium are paid separately and are not financed into the loan.",
    ];

    if (input.extraPaymentMonth >= 1 && decimal(input.extraPaymentAmount).greaterThan(0)) {
      const scenario = simulateEarlyPayment(
        principal,
        monthlyRate,
        input.termMonths,
        payments.monthlyPayment,
        decimal(input.extraPaymentAmount),
        input.extraPaymentMonth,
      );
      const interestSaved = payments.totalInterest.minus(scenario.interestWithExtra);

      result.extraPaymentAmount = money(decimal(input.extraPaymentAmount));
      result.termMonthsWithExtraPayment = scenario.months;
      result.termMonthsSaved = input.termMonths - scenario.months;
      result.finalPaymentWithExtraPayment = money(scenario.lastPayment);
      result.totalPaymentWithExtraPayment = money(scenario.totalWithExtra);
      result.totalInterestWithExtraPayment = money(scenario.interestWithExtra);
      result.interestSaved = money(interestSaved);

      breakdown.push(
        { label: "Extra payment", value: money(decimal(input.extraPaymentAmount)), unit: "LKR" },
        { label: "Term with early payment", value: scenario.months, unit: "months" },
        { label: "Term shortened", value: input.termMonths - scenario.months, unit: "months" },
        { label: "Interest saved", value: money(interestSaved), unit: "LKR" },
      );
      assumptions.push(
        "The extra payment reduces the principal in its chosen month while the regular payment stays unchanged, shortening the term.",
        "The extra payment is capped at the outstanding balance, and the interest saved compares the standard schedule with the early-payment schedule using the rounded regular payment.",
      );
    }

    return lendingResult(loanScheduleMetadata, {
      asOfDate: null,
      normalizedInputs: input,
      result,
      breakdown,
      assumptions,
      warnings: [
        "This is an estimate, not loan approval, financial advice, or a lender quotation.",
        "Lender day-count conventions, penalties, taxes, and lender-specific rounding are not included.",
      ],
    });
  },
});

const leaseMetadata = {
  key: "lease",
  name: "Lease calculator",
  shortName: "Lease",
  summary: "Estimate monthly lease payments for an asset from deposit, rate, fees, residual, and term.",
  category: "Money",
  classification: "static",
  version: "1.0.0",
  accent: "rose",
  fields: [
    { name: "assetValue", label: "Asset value", type: "number", required: true, min: 0.01, max: 1_000_000_000_000, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR" },
    { name: "deposit", label: "Deposit", type: "number", required: true, min: 0, max: 1_000_000_000_000, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR", description: "Upfront payment that reduces the financed amount." },
    { name: "residualValue", label: "Residual value (balloon)", type: "number", required: true, min: 0, max: 1_000_000_000_000, maxDecimalPlaces: 2, step: 0.01, suffix: "LKR", description: "The amount still owed at the end of the term, paid as a final balloon." },
    { name: "annualRatePercent", label: "Nominal annual interest rate", type: "number", required: true, min: 0, max: 100, maxDecimalPlaces: 6, step: 0.000001, suffix: "%" },
    { name: "termMonths", label: "Lease term", type: "number", required: true, min: 1, max: 1200, maxDecimalPlaces: 0, step: 1, suffix: "months" },
    { name: "processingFeePercent", label: "Processing fee", type: "number", required: true, min: 0, max: 100, maxDecimalPlaces: 2, step: 0.01, suffix: "% of asset", defaultValue: 0 },
  ],
} as const satisfies CalculatorMetadata;

const leaseSchema = z
  .object({
    assetValue: lkrAmount,
    deposit: lkrNonNegative,
    residualValue: lkrNonNegative,
    annualRatePercent: nominalRatePercent,
    termMonths: termMonths,
    processingFeePercent: feePercent,
  })
  .refine(
    (input) =>
      decimal(input.assetValue)
        .minus(decimal(input.deposit))
        .minus(decimal(input.residualValue))
        .greaterThan(0),
    {
      message: "Deposit and residual value together must be less than the asset value.",
      path: ["deposit"],
    },
  );

export const leaseCalculator = defineCalculator({
  ...leaseMetadata,
  schema: leaseSchema,
  run(input) {
    const financedAmount = decimal(input.assetValue)
      .minus(decimal(input.deposit))
      .minus(decimal(input.residualValue));
    const monthlyRate = decimal(input.annualRatePercent).div(1200);
    const unroundedMonthly = monthlyRate.isZero()
      ? financedAmount.div(input.termMonths)
      : financedAmount
          .mul(monthlyRate)
          .mul(decimal(1).plus(monthlyRate).pow(input.termMonths))
          .div(decimal(1).plus(monthlyRate).pow(input.termMonths).minus(1));
    const monthlyPayment = decimal(money(unroundedMonthly));
    const totalInstallments = monthlyPayment.mul(input.termMonths);
    const totalInterest = totalInstallments.minus(financedAmount);
    const processingFeeAmount = decimal(input.assetValue).mul(input.processingFeePercent).div(100);
    const totalCost = decimal(input.deposit)
      .plus(processingFeeAmount)
      .plus(totalInstallments)
      .plus(decimal(input.residualValue));

    return lendingResult(leaseMetadata, {
      asOfDate: null,
      normalizedInputs: {
        ...input,
        financedAmount: money(financedAmount),
      },
      result: {
        financedAmount: money(financedAmount),
        monthlyPayment: money(monthlyPayment),
        balloonPayment: money(decimal(input.residualValue)),
        totalInstallments: money(totalInstallments),
        totalInterest: money(totalInterest),
        processingFeeAmount: money(processingFeeAmount),
        totalCost: money(totalCost),
      },
      breakdown: [
        { label: "Financed amount", value: money(financedAmount), unit: "LKR" },
        { label: "Monthly lease payment", value: money(monthlyPayment), unit: "LKR" },
        { label: "Balloon payment", value: money(decimal(input.residualValue)), unit: "LKR" },
        { label: "Total installments", value: money(totalInstallments), unit: "LKR" },
        { label: "Total interest", value: money(totalInterest), unit: "LKR" },
        { label: "Processing fee", value: money(processingFeeAmount), unit: "LKR" },
        { label: "Total cost", value: money(totalCost), unit: "LKR" },
      ],
      assumptions: [
        "The entered rate is a nominal annual rate divided by 12 for monthly calculations.",
        "Every month pays the same rounded installment; the residual is due as a final balloon and is not amortized.",
        "The processing fee is paid upfront and is not financed into the lease.",
      ],
      warnings: [
        "This is an estimate, not lease approval, financial advice, or a lessor quotation.",
        "Taxes, penalties, insurance charges, and lessor-specific rounding are not included.",
      ],
    });
  },
});
