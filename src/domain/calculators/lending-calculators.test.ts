import { describe, expect, it } from "vitest";

import {
  leaseCalculator,
  loanScheduleCalculator,
} from "@/domain/calculators/lending-calculators";
import { getCalculators } from "@/domain/calculators/registry";
import { executeCalculationRequest } from "@/server/api/calculations";

describe("loan schedule calculator", () => {
  it("matches the loan EMI baseline for a plain loan", () => {
    const calculation = loanScheduleCalculator.calculate({
      principal: 1_000_000,
      annualRatePercent: 12,
      termMonths: 12,
      processingFeePercent: 0,
      monthlyInsurancePremium: 0,
      extraPaymentAmount: 0,
      extraPaymentMonth: 0,
    });

    expect(calculation.result).toMatchObject({
      monthlyPayment: "88848.79",
      finalPayment: "88848.77",
      totalPayment: "1066185.46",
      totalInterest: "66185.46",
      processingFeeAmount: "0.00",
      totalInsurance: "0.00",
      totalCost: "1066185.46",
    });
  });

  it("handles a zero-interest loan", () => {
    const calculation = loanScheduleCalculator.calculate({
      principal: 120_000,
      annualRatePercent: 0,
      termMonths: 12,
      processingFeePercent: 0,
      monthlyInsurancePremium: 0,
      extraPaymentAmount: 0,
      extraPaymentMonth: 0,
    });

    expect(calculation.result.monthlyPayment).toBe("10000.00");
    expect(calculation.result.totalInterest).toBe("0.00");
  });

  it("adds the processing fee and insurance to the total cost", () => {
    const calculation = loanScheduleCalculator.calculate({
      principal: 1_000_000,
      annualRatePercent: 12,
      termMonths: 12,
      processingFeePercent: 2,
      monthlyInsurancePremium: 500,
      extraPaymentAmount: 0,
      extraPaymentMonth: 0,
    });

    expect(calculation.result.processingFeeAmount).toBe("20000.00");
    expect(calculation.result.totalInsurance).toBe("6000.00");
    expect(calculation.result.totalCost).toBe("1092185.46");
  });

  it("shortens the term and reports interest saved for an early payment", () => {
    const calculation = loanScheduleCalculator.calculate({
      principal: 1_000_000,
      annualRatePercent: 12,
      termMonths: 24,
      processingFeePercent: 0,
      monthlyInsurancePremium: 0,
      extraPaymentAmount: 100_000,
      extraPaymentMonth: 12,
    });

    expect(calculation.result).toMatchObject({
      monthlyPayment: "47073.47",
      totalPayment: "1129763.33",
      totalInterest: "129763.33",
      extraPaymentAmount: "100000.00",
      termMonthsWithExtraPayment: 22,
      termMonthsSaved: 2,
      finalPaymentWithExtraPayment: "29364.65",
      totalPaymentWithExtraPayment: "1117907.52",
      totalInterestWithExtraPayment: "17907.52",
      interestSaved: "111855.81",
    });
  });

  it("rejects an extra payment month beyond the term", () => {
    expect(() =>
      loanScheduleCalculator.calculate({
        principal: 1_000_000,
        annualRatePercent: 12,
        termMonths: 12,
        processingFeePercent: 0,
        monthlyInsurancePremium: 0,
        extraPaymentAmount: 100_000,
        extraPaymentMonth: 13,
      }),
    ).toThrow();
  });
});

describe("lease calculator", () => {
  it("estimates monthly lease payments with deposit, residual, and fee", () => {
    const calculation = leaseCalculator.calculate({
      assetValue: 2_000_000,
      deposit: 200_000,
      residualValue: 400_000,
      annualRatePercent: 12,
      termMonths: 24,
      processingFeePercent: 1,
    });

    expect(calculation.result).toMatchObject({
      financedAmount: "1400000.00",
      monthlyPayment: "65902.86",
      balloonPayment: "400000.00",
      totalInstallments: "1581668.64",
      totalInterest: "181668.64",
      processingFeeAmount: "20000.00",
      totalCost: "2201668.64",
    });
  });

  it("handles a zero-rate lease", () => {
    const calculation = leaseCalculator.calculate({
      assetValue: 1_200_000,
      deposit: 120_000,
      residualValue: 0,
      annualRatePercent: 0,
      termMonths: 12,
      processingFeePercent: 0,
    });

    expect(calculation.result).toMatchObject({
      financedAmount: "1080000.00",
      monthlyPayment: "90000.00",
      balloonPayment: "0.00",
      totalInstallments: "1080000.00",
      totalInterest: "0.00",
      totalCost: "1200000.00",
    });
  });

  it("rejects a lease where deposit and residual cover the full asset", () => {
    expect(() =>
      leaseCalculator.calculate({
        assetValue: 1_000_000,
        deposit: 600_000,
        residualValue: 500_000,
        annualRatePercent: 12,
        termMonths: 24,
        processingFeePercent: 0,
      }),
    ).toThrow();
  });
});

describe("lending calculator fixtures", () => {
  it.each([
    ["loan-schedule", loanScheduleCalculator, { principal: "1000000", annualRatePercent: "12", termMonths: "12", processingFeePercent: "0", monthlyInsurancePremium: "0", extraPaymentAmount: "0", extraPaymentMonth: "0" }, { monthlyPayment: "88848.79", finalPayment: "88848.77", totalPayment: "1066185.46", totalInterest: "66185.46", processingFeeAmount: "0.00", totalInsurance: "0.00", totalCost: "1066185.46" }],
    ["loan-schedule", loanScheduleCalculator, { principal: "1000000", annualRatePercent: "12", termMonths: "24", processingFeePercent: "0", monthlyInsurancePremium: "0", extraPaymentAmount: "100000", extraPaymentMonth: "12" }, { monthlyPayment: "47073.47", totalInterest: "129763.33", termMonthsWithExtraPayment: 22, termMonthsSaved: 2, finalPaymentWithExtraPayment: "29364.65", totalPaymentWithExtraPayment: "1117907.52", interestSaved: "111855.81" }],
    ["lease", leaseCalculator, { assetValue: "2000000", deposit: "200000", residualValue: "400000", annualRatePercent: "12", termMonths: "24", processingFeePercent: "1" }, { financedAmount: "1400000.00", monthlyPayment: "65902.86", balloonPayment: "400000.00", totalInstallments: "1581668.64", totalInterest: "181668.64", processingFeeAmount: "20000.00", totalCost: "2201668.64" }],
    ["lease", leaseCalculator, { assetValue: "1200000", deposit: "120000", residualValue: "0", annualRatePercent: "0", termMonths: "12", processingFeePercent: "0" }, { financedAmount: "1080000.00", monthlyPayment: "90000.00", totalInstallments: "1080000.00", totalInterest: "0.00", totalCost: "1200000.00" }],
  ])("matches the approved fixture through the domain and API for %s", async (key, calculator, input, expected) => {
    const direct = calculator.calculate(input);
    const api = await executeCalculationRequest(key, input);

    expect(direct.result).toMatchObject(expected);
    expect(api).toEqual({ status: 200, body: direct });
  });

  it("publishes the lending calculators in the registry", () => {
    const keys = getCalculators().map((calculator) => calculator.key);

    expect(keys).toEqual(expect.arrayContaining(["loan-schedule", "lease"]));
  });
});
