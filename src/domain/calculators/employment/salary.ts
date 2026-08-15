import { z } from "zod";

import { apitPayloadSchema, calculateApit } from "./apit";
import { calculateEpf, epfPayloadSchema } from "./epf";
import { calculateEtf, etfPayloadSchema } from "./etf";
import { decimal, money, nonnegativeWholeRupeeStringSchema } from "./schemas";

export const salaryInputSchema = z
  .object({
    basicPay: nonnegativeWholeRupeeStringSchema,
    additionalFundEarnings: nonnegativeWholeRupeeStringSchema,
    apitOnlyEarnings: nonnegativeWholeRupeeStringSchema,
  })
  .strict();

export const salaryPayloadsSchema = z
  .object({
    apit: apitPayloadSchema,
    epf: epfPayloadSchema,
    etf: etfPayloadSchema,
  })
  .strict();

export type SalaryInput = z.infer<typeof salaryInputSchema>;
export type SalaryPayloads = z.infer<typeof salaryPayloadsSchema>;

export function calculateSalary(input: SalaryInput, payloads: SalaryPayloads) {
  const parsedInput = salaryInputSchema.parse(input);
  const parsedPayloads = salaryPayloadsSchema.parse(payloads);
  const basicPay = decimal(parsedInput.basicPay);
  const additionalFundEarnings = decimal(parsedInput.additionalFundEarnings);
  const apitOnlyEarnings = decimal(parsedInput.apitOnlyEarnings);
  const fundEligibleEarnings = basicPay.plus(additionalFundEarnings);
  const grossPay = fundEligibleEarnings.plus(apitOnlyEarnings);
  const apit = calculateApit(
    { monthlyTaxableIncome: grossPay.toFixed(0) },
    parsedPayloads.apit,
  );
  const epf = calculateEpf(
    { eligibleEarnings: fundEligibleEarnings.toFixed(0) },
    parsedPayloads.epf,
  );
  const etf = calculateEtf(
    { eligibleEarnings: fundEligibleEarnings.toFixed(0) },
    parsedPayloads.etf,
  );
  const takeHomePay = grossPay.minus(apit.tax).minus(epf.employee.amount);

  return {
    basicPay: money(basicPay),
    additionalFundEarnings: money(additionalFundEarnings),
    apitOnlyEarnings: money(apitOnlyEarnings),
    grossPay: money(grossPay),
    apitTaxableIncome: money(grossPay),
    fundEligibleEarnings: money(fundEligibleEarnings),
    takeHomePay: money(takeHomePay),
    contributions: { apit, epf, etf },
  };
}
