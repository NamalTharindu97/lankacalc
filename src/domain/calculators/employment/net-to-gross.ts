import Decimal from "decimal.js";
import { z } from "zod";

import { apitPayloadSchema, calculateApit } from "./apit";
import { calculateEpf, epfPayloadSchema } from "./epf";
import { decimal, money, nonnegativeWholeRupeeStringSchema } from "./schemas";

const maximumGross = "1000000000000";

export const netToGrossInputSchema = z
  .object({
    targetTakeHomePay: nonnegativeWholeRupeeStringSchema,
    apitOnlyEarnings: nonnegativeWholeRupeeStringSchema,
  })
  .strict();

export const netToGrossPayloadsSchema = z
  .object({
    apit: apitPayloadSchema,
    epf: epfPayloadSchema,
  })
  .strict();

export type NetToGrossInput = z.infer<typeof netToGrossInputSchema>;
export type NetToGrossPayloads = z.infer<typeof netToGrossPayloadsSchema>;

export type NetToGrossResult = {
  converged: boolean;
  requiredGrossPay?: string;
  fundBase?: string;
  apit?: string;
  employeeEpf?: string;
  computedTakeHomePay?: string;
  excessOverTarget?: string;
  resolvedBracketRatePercent?: string;
  bracketsEvaluated: number;
  maxAchievableTakeHomePay: string;
};

function takeHomeAt(gross: string, nonFund: string, payloads: NetToGrossPayloads): Decimal {
  const apit = calculateApit({ monthlyTaxableIncome: gross }, payloads.apit);
  const fundBase = decimal(gross).minus(nonFund);
  const epf = calculateEpf({ eligibleEarnings: fundBase.toFixed(0) }, payloads.epf);
  return decimal(gross).minus(apit.tax).minus(epf.employee.amount);
}

export function calculateNetToGross(
  input: NetToGrossInput,
  payloads: NetToGrossPayloads,
): NetToGrossResult {
  const parsedInput = netToGrossInputSchema.parse(input);
  const parsedPayloads = netToGrossPayloadsSchema.parse(payloads);
  const target = decimal(parsedInput.targetTakeHomePay);
  const nonFund = decimal(parsedInput.apitOnlyEarnings);
  const epfRate = decimal(parsedPayloads.epf.employeeRate);

  const maxAchievableTakeHome = takeHomeAt(maximumGross, parsedInput.apitOnlyEarnings, parsedPayloads);
  if (target.greaterThan(maxAchievableTakeHome)) {
    return {
      converged: false,
      bracketsEvaluated: parsedPayloads.apit.brackets.length,
      maxAchievableTakeHomePay: money(maxAchievableTakeHome),
    };
  }

  const candidates: Decimal[] = [];
  let previousUpperBound: string | undefined;
  let evaluatedBrackets = 0;

  parsedPayloads.apit.brackets.forEach((bracket, index) => {
    const rate = decimal(bracket.rate);
    const deduction = decimal(bracket.deduction);
    const marginalDenominator = decimal("1").minus(rate).minus(epfRate);
    if (marginalDenominator.lessThanOrEqualTo(0)) {
      previousUpperBound = bracket.upperBound ?? maximumGross;
      return;
    }
    evaluatedBrackets += 1;

    const lowerBound = index === 0 || previousUpperBound === undefined
      ? decimal("0")
      : decimal(previousUpperBound).plus(1);
    const upperBound = decimal(bracket.upperBound ?? maximumGross);
    const continuousRoot = target
      .minus(deduction)
      .minus(epfRate.mul(nonFund))
      .div(marginalDenominator);
    const scanLower = Decimal.max(lowerBound, continuousRoot.minus(4)).ceil();
    const scanUpper = Decimal.min(upperBound, continuousRoot.plus(4));

    for (let offset = 0; offset <= 8; offset += 1) {
      const candidate = scanLower.plus(offset);
      if (candidate.greaterThan(scanUpper)) break;
      candidates.push(candidate);
    }

    previousUpperBound = bracket.upperBound ?? maximumGross;
  });

  candidates.push(decimal(maximumGross), nonFund);

  const feasible = candidates
    .filter((gross) => gross.greaterThanOrEqualTo(nonFund))
    .filter((gross) => takeHomeAt(gross.toFixed(0), parsedInput.apitOnlyEarnings, parsedPayloads).greaterThanOrEqualTo(target));

  if (feasible.length === 0) {
    return {
      converged: false,
      bracketsEvaluated: evaluatedBrackets,
      maxAchievableTakeHomePay: money(maxAchievableTakeHome),
    };
  }

  const requiredGross = feasible.reduce((minimum, candidate) => (
    candidate.lessThan(minimum) ? candidate : minimum
  ));
  const fundBase = requiredGross.minus(nonFund);
  const apit = calculateApit({ monthlyTaxableIncome: requiredGross.toFixed(0) }, parsedPayloads.apit);
  const employeeEpf = calculateEpf({ eligibleEarnings: fundBase.toFixed(0) }, parsedPayloads.epf);
  const computedTakeHome = requiredGross.minus(apit.tax).minus(employeeEpf.employee.amount);
  const excess = computedTakeHome.minus(target);

  return {
    converged: true,
    requiredGrossPay: money(requiredGross),
    fundBase: money(fundBase),
    apit: money(decimal(apit.tax)),
    employeeEpf: employeeEpf.employee.amount,
    computedTakeHomePay: money(computedTakeHome),
    excessOverTarget: money(excess),
    resolvedBracketRatePercent: decimal(apit.selectedBracket.rate).mul(100).toString(),
    bracketsEvaluated: evaluatedBrackets,
    maxAchievableTakeHomePay: money(maxAchievableTakeHome),
  };
}
