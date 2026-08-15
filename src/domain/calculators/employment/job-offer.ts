import Decimal from "decimal.js";
import { z } from "zod";

import { calculateSalary, salaryPayloadsSchema } from "./salary";
import { decimal, money, nonnegativeWholeRupeeStringSchema } from "./schemas";

const jobOfferSnapshotSchema = z
  .object({
    basicPay: nonnegativeWholeRupeeStringSchema,
    additionalFundEarnings: nonnegativeWholeRupeeStringSchema,
    apitOnlyEarnings: nonnegativeWholeRupeeStringSchema,
    annualBonus: nonnegativeWholeRupeeStringSchema,
    annualTravelCost: nonnegativeWholeRupeeStringSchema,
    annualWorkFromHomeSaving: nonnegativeWholeRupeeStringSchema,
  })
  .strict();

export const jobOfferInputSchema = z
  .object({
    current: jobOfferSnapshotSchema,
    new: jobOfferSnapshotSchema,
  })
  .strict();

export type JobOfferInput = z.infer<typeof jobOfferInputSchema>;

type JobAnnualResult = {
  monthlyGrossPay: string;
  annualTakeHomePay: string;
  annualApit: string;
  annualEmployeeEpf: string;
  annualEmployerEpf: string;
  annualEmployerEtf: string;
  employerContributions: string;
  annualBonus: string;
  annualTravelCost: string;
  annualWorkFromHomeSaving: string;
};

type JobDifferences = {
  annualTakeHomePay: string;
  additionalAnnualTax: string;
  annualBonus: string;
  annualTravelCost: string;
  annualWorkFromHomeSaving: string;
  annualEmployeeEpf: string;
  annualEmployerEpf: string;
  annualEmployerEtf: string;
  employerContributions: string;
};

export type JobOfferComparisonResult = {
  current: JobAnnualResult;
  new: JobAnnualResult;
  differences: JobDifferences;
  realAnnualFinancialImprovement: string;
  recommendation: "new-job" | "current-job" | "equal";
};

type JobOfferSnapshot = z.infer<typeof jobOfferSnapshotSchema>;

function evaluateJob(input: JobOfferSnapshot, payloads: z.infer<typeof salaryPayloadsSchema>): JobAnnualResult {
  const bonusMonth = decimal(input.annualBonus).div(12).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const apitOnlyEarnings = decimal(input.apitOnlyEarnings).plus(bonusMonth);

  const salary = calculateSalary({
    basicPay: input.basicPay,
    additionalFundEarnings: input.additionalFundEarnings,
    apitOnlyEarnings: apitOnlyEarnings.toFixed(0),
  }, payloads);

  const annualApit = money(decimal(salary.contributions.apit.tax).mul(12));
  const annualEmployeeEpf = money(decimal(salary.contributions.epf.employee.amount).mul(12));
  const annualEmployerEpf = money(decimal(salary.contributions.epf.employer.amount).mul(12));
  const annualEmployerEtf = money(decimal(salary.contributions.etf.employer.amount).mul(12));

  return {
    monthlyGrossPay: salary.grossPay,
    annualTakeHomePay: money(decimal(salary.takeHomePay).mul(12)),
    annualApit,
    annualEmployeeEpf,
    annualEmployerEpf,
    annualEmployerEtf,
    employerContributions: money(decimal(annualEmployerEpf).plus(annualEmployerEtf)),
    annualBonus: money(decimal(input.annualBonus)),
    annualTravelCost: money(decimal(input.annualTravelCost)),
    annualWorkFromHomeSaving: money(decimal(input.annualWorkFromHomeSaving)),
  };
}

function difference(newValue: string, currentValue: string): string {
  return money(decimal(newValue).minus(currentValue));
}

export function calculateJobOfferComparison(
  input: JobOfferInput,
  payloads: z.infer<typeof salaryPayloadsSchema>,
): JobOfferComparisonResult {
  const parsedInput = jobOfferInputSchema.parse(input);
  const parsedPayloads = salaryPayloadsSchema.parse(payloads);

  const current = evaluateJob(parsedInput.current, parsedPayloads);
  const offered = evaluateJob(parsedInput.new, parsedPayloads);

  const differences: JobDifferences = {
    annualTakeHomePay: difference(offered.annualTakeHomePay, current.annualTakeHomePay),
    additionalAnnualTax: difference(offered.annualApit, current.annualApit),
    annualBonus: difference(offered.annualBonus, current.annualBonus),
    annualTravelCost: difference(offered.annualTravelCost, current.annualTravelCost),
    annualWorkFromHomeSaving: difference(offered.annualWorkFromHomeSaving, current.annualWorkFromHomeSaving),
    annualEmployeeEpf: difference(offered.annualEmployeeEpf, current.annualEmployeeEpf),
    annualEmployerEpf: difference(offered.annualEmployerEpf, current.annualEmployerEpf),
    annualEmployerEtf: difference(offered.annualEmployerEtf, current.annualEmployerEtf),
    employerContributions: difference(offered.employerContributions, current.employerContributions),
  };

  const improvement = decimal(differences.annualTakeHomePay)
    .minus(differences.annualTravelCost)
    .plus(differences.annualWorkFromHomeSaving);
  const recommendation: JobOfferComparisonResult["recommendation"] = improvement.greaterThan(0)
    ? "new-job"
    : improvement.lessThan(0)
      ? "current-job"
      : "equal";

  return {
    current,
    new: offered,
    differences,
    realAnnualFinancialImprovement: money(improvement),
    recommendation,
  };
}
