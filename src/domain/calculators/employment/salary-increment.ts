import Decimal from "decimal.js";
import { z } from "zod";

import { calculateSalary, salaryPayloadsSchema, type SalaryPayloads } from "./salary";
import { decimal, money, nonnegativeDecimalStringSchema, nonnegativeWholeRupeeStringSchema } from "./schemas";

export const salaryIncrementInputSchema = z
  .object({
    basicPay: nonnegativeWholeRupeeStringSchema,
    additionalFundEarnings: nonnegativeWholeRupeeStringSchema,
    apitOnlyEarnings: nonnegativeWholeRupeeStringSchema,
    incrementType: z.enum(["percentage", "amount"]),
    incrementValue: nonnegativeDecimalStringSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const parsed = new Decimal(value.incrementValue);
    if (value.incrementType === "percentage") {
      if (parsed.greaterThan(1000) || parsed.decimalPlaces() > 2) {
        context.addIssue({
          code: "custom",
          path: ["incrementValue"],
          message: "Expected an increment percentage between 0 and 1000 with no more than two decimals.",
        });
      }
    } else if (!parsed.isInteger()) {
      context.addIssue({
        code: "custom",
        path: ["incrementValue"],
        message: "Expected an increment amount as a nonnegative whole number of rupees.",
      });
    }
  });

export type SalaryIncrementInput = z.infer<typeof salaryIncrementInputSchema>;

type SalarySnapshot = {
  grossPay: string;
  takeHomePay: string;
  apit: string;
  employeeEpf: string;
  employerEpf: string;
  employerEtf: string;
};

type SalaryIncreases = {
  gross: string;
  takeHome: string;
  apit: string;
  employeeEpf: string;
  employerEpf: string;
  employerEtf: string;
};

export type SalaryIncrementResult = {
  newBasicPay: string;
  incrementAmount: string;
  incrementPercent: string;
  current: SalarySnapshot;
  incremented: SalarySnapshot;
  increases: SalaryIncreases;
  noBasePercent: boolean;
};

function readSnapshot(salary: ReturnType<typeof calculateSalary>): SalarySnapshot {
  return {
    grossPay: salary.grossPay,
    takeHomePay: salary.takeHomePay,
    apit: money(decimal(salary.contributions.apit.tax)),
    employeeEpf: salary.contributions.epf.employee.amount,
    employerEpf: salary.contributions.epf.employer.amount,
    employerEtf: salary.contributions.etf.employer.amount,
  };
}

function difference(incremented: string, current: string): string {
  return money(decimal(incremented).minus(current));
}

export function calculateSalaryIncrement(
  input: SalaryIncrementInput,
  payloads: SalaryPayloads,
): SalaryIncrementResult {
  const parsedInput = salaryIncrementInputSchema.parse(input);
  const parsedPayloads = salaryPayloadsSchema.parse(payloads);

  const basicPay = decimal(parsedInput.basicPay);
  const incrementValue = decimal(parsedInput.incrementValue);

  const newBasicPayValue = parsedInput.incrementType === "percentage"
    ? basicPay.mul(incrementValue.div(100).plus(1)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    : basicPay.plus(incrementValue);
  const newBasicPay = newBasicPayValue.toFixed(0);

  const incrementAmount = newBasicPayValue.minus(basicPay);
  const incrementPercent = basicPay.isZero() ? decimal("0") : incrementAmount.div(basicPay).mul(100);

  const salaryInput = {
    basicPay: parsedInput.basicPay,
    additionalFundEarnings: parsedInput.additionalFundEarnings,
    apitOnlyEarnings: parsedInput.apitOnlyEarnings,
  };
  const current = readSnapshot(calculateSalary(salaryInput, parsedPayloads));
  const incremented = readSnapshot(calculateSalary({ ...salaryInput, basicPay: newBasicPay }, parsedPayloads));

  return {
    newBasicPay: money(newBasicPayValue),
    incrementAmount: money(incrementAmount),
    incrementPercent: incrementPercent.toFixed(2),
    current,
    incremented,
    increases: {
      gross: difference(incremented.grossPay, current.grossPay),
      takeHome: difference(incremented.takeHomePay, current.takeHomePay),
      apit: difference(incremented.apit, current.apit),
      employeeEpf: difference(incremented.employeeEpf, current.employeeEpf),
      employerEpf: difference(incremented.employerEpf, current.employerEpf),
      employerEtf: difference(incremented.employerEtf, current.employerEtf),
    },
    noBasePercent: basicPay.isZero(),
  };
}
