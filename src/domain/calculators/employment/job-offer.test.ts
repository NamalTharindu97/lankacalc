import { describe, expect, it } from "vitest";

import { type SalaryPayloads, calculateJobOfferComparison } from "./index";

const payloads: SalaryPayloads = {
  apit: {
    rounding: "ceiling-whole-rupee",
    brackets: [
      { upperBound: "150000", rate: "0", deduction: "0" },
      { upperBound: "233333", rate: "0.06", deduction: "9000" },
      { upperBound: "275000", rate: "0.18", deduction: "37000" },
      { upperBound: "316667", rate: "0.24", deduction: "53500" },
      { upperBound: "358333", rate: "0.30", deduction: "72500" },
      { rate: "0.36", deduction: "94000" },
    ],
  },
  epf: { employeeRate: "0.08", employerRate: "0.12", rounding: "half-up-cent" },
  etf: { employerRate: "0.03", rounding: "exact-cent-only" },
};

describe("job offer comparison", () => {
  it("recommends the new job when take-home, travel, and work-from-home improve", () => {
    const result = calculateJobOfferComparison({
      current: {
        basicPay: "100000",
        additionalFundEarnings: "0",
        apitOnlyEarnings: "0",
        annualBonus: "120000",
        annualTravelCost: "120000",
        annualWorkFromHomeSaving: "0",
      },
      new: {
        basicPay: "150000",
        additionalFundEarnings: "0",
        apitOnlyEarnings: "0",
        annualBonus: "120000",
        annualTravelCost: "60000",
        annualWorkFromHomeSaving: "12000",
      },
    }, payloads);

    expect(result.current).toEqual({
      monthlyGrossPay: "110000.00",
      annualTakeHomePay: "1224000.00",
      annualApit: "0.00",
      annualEmployeeEpf: "96000.00",
      annualEmployerEpf: "144000.00",
      annualEmployerEtf: "36000.00",
      employerContributions: "180000.00",
      annualBonus: "120000.00",
      annualTravelCost: "120000.00",
      annualWorkFromHomeSaving: "0.00",
    });
    expect(result.new).toEqual({
      monthlyGrossPay: "160000.00",
      annualTakeHomePay: "1768800.00",
      annualApit: "7200.00",
      annualEmployeeEpf: "144000.00",
      annualEmployerEpf: "216000.00",
      annualEmployerEtf: "54000.00",
      employerContributions: "270000.00",
      annualBonus: "120000.00",
      annualTravelCost: "60000.00",
      annualWorkFromHomeSaving: "12000.00",
    });
    expect(result.differences).toEqual({
      annualTakeHomePay: "544800.00",
      additionalAnnualTax: "7200.00",
      annualBonus: "0.00",
      annualTravelCost: "-60000.00",
      annualWorkFromHomeSaving: "12000.00",
      annualEmployeeEpf: "48000.00",
      annualEmployerEpf: "72000.00",
      annualEmployerEtf: "18000.00",
      employerContributions: "90000.00",
    });
    expect(result.realAnnualFinancialImprovement).toBe("616800.00");
    expect(result.recommendation).toBe("new-job");
  });

  it("recommends the current job when the new offer is worse", () => {
    const result = calculateJobOfferComparison({
      current: {
        basicPay: "200000",
        additionalFundEarnings: "0",
        apitOnlyEarnings: "0",
        annualBonus: "0",
        annualTravelCost: "24000",
        annualWorkFromHomeSaving: "0",
      },
      new: {
        basicPay: "180000",
        additionalFundEarnings: "0",
        apitOnlyEarnings: "0",
        annualBonus: "0",
        annualTravelCost: "120000",
        annualWorkFromHomeSaving: "0",
      },
    }, payloads);

    expect(result.differences).toEqual({
      annualTakeHomePay: "-206400.00",
      additionalAnnualTax: "-14400.00",
      annualBonus: "0.00",
      annualTravelCost: "96000.00",
      annualWorkFromHomeSaving: "0.00",
      annualEmployeeEpf: "-19200.00",
      annualEmployerEpf: "-28800.00",
      annualEmployerEtf: "-7200.00",
      employerContributions: "-36000.00",
    });
    expect(result.realAnnualFinancialImprovement).toBe("-302400.00");
    expect(result.recommendation).toBe("current-job");
  });

  it("reports equal when both jobs are identical", () => {
    const job = {
      basicPay: "100000",
      additionalFundEarnings: "0",
      apitOnlyEarnings: "0",
      annualBonus: "0",
      annualTravelCost: "0",
      annualWorkFromHomeSaving: "0",
    };
    const result = calculateJobOfferComparison({ current: job, new: job }, payloads);

    expect(result.realAnnualFinancialImprovement).toBe("0.00");
    expect(result.recommendation).toBe("equal");
  });

  it("spreads an annual bonus across the tax base with monthly rounding", () => {
    const result = calculateJobOfferComparison({
      current: {
        basicPay: "100000",
        additionalFundEarnings: "0",
        apitOnlyEarnings: "0",
        annualBonus: "100000",
        annualTravelCost: "0",
        annualWorkFromHomeSaving: "0",
      },
      new: {
        basicPay: "100000",
        additionalFundEarnings: "0",
        apitOnlyEarnings: "0",
        annualBonus: "200000",
        annualTravelCost: "0",
        annualWorkFromHomeSaving: "0",
      },
    }, payloads);

    expect(result.current.annualTakeHomePay).toBe("1203996.00");
    expect(result.new.annualTakeHomePay).toBe("1304004.00");
    expect(result.differences.annualTakeHomePay).toBe("100008.00");
    expect(result.differences.annualBonus).toBe("100000.00");
    expect(result.recommendation).toBe("new-job");
  });

  it("rejects fractional or missing salary components", () => {
    expect(() => calculateJobOfferComparison({
      current: {
        basicPay: "100000.5",
        additionalFundEarnings: "0",
        apitOnlyEarnings: "0",
        annualBonus: "0",
        annualTravelCost: "0",
        annualWorkFromHomeSaving: "0",
      },
      new: {
        basicPay: "100000",
        additionalFundEarnings: "0",
        apitOnlyEarnings: "0",
        annualBonus: "0",
        annualTravelCost: "0",
        annualWorkFromHomeSaving: "0",
      },
    }, payloads)).toThrow();
    expect(() => calculateJobOfferComparison({
      current: {
        basicPay: "100000",
        additionalFundEarnings: "",
        apitOnlyEarnings: "0",
        annualBonus: "0",
        annualTravelCost: "0",
        annualWorkFromHomeSaving: "0",
      },
      new: {
        basicPay: "100000",
        additionalFundEarnings: "0",
        apitOnlyEarnings: "0",
        annualBonus: "0",
        annualTravelCost: "0",
        annualWorkFromHomeSaving: "0",
      },
    }, payloads)).toThrow();
  });
});
