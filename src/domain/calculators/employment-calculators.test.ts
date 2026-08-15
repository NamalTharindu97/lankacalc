import { describe, expect, it } from "vitest";

import {
  apitCalculator,
  epfCalculator,
  etfCalculator,
  salaryCalculator,
  takeHomeCalculator,
} from "@/domain/calculators/employment-calculators";
import { getCalculator } from "@/domain/calculators/registry";

const payloads = {
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
} as const;

describe("regulated employment calculator definitions", () => {
  it("registers all five calculators for server execution", () => {
    for (const key of ["apit", "epf", "etf", "salary", "take-home"]) {
      expect(getCalculator(key)).toMatchObject({ key, classification: "regulated", execution: "server" });
    }
  });

  it("presents the APIT lookup result through the common result contract", () => {
    expect(apitCalculator.calculate({
      asOfDate: "2026-08-14",
      monthlyRegularEmploymentEarnings: "316667",
      supportedScenario: "confirmed",
    }, payloads)).toMatchObject({
      calculator: "apit",
      asOfDate: "2026-08-14",
      result: { apit: "22501.00", ratePercent: "24" },
      ruleVersions: [],
      sources: [],
    });
  });

  it("keeps EPF and ETF employer contributions distinct", () => {
    expect(epfCalculator.calculate({
      asOfDate: "2026-08-14",
      eligibleEarnings: "100000",
      supportedScenario: "confirmed",
    }, payloads)).toMatchObject({
      result: { employeeContribution: "8000.00", employerContribution: "12000.00" },
    });
    expect(etfCalculator.calculate({
      asOfDate: "2026-08-14",
      eligibleEarnings: "100000",
      supportedScenario: "confirmed",
    }, payloads)).toMatchObject({
      result: { eligibleEarnings: "100000.00", employerContribution: "3000.00" },
    });
  });

  it("reconciles salary and take-home results from the same rules", () => {
    const input = {
      asOfDate: "2026-08-14",
      basicPay: "200000",
      additionalFundEarnings: "50000",
      apitOnlyEarnings: "10000",
      supportedScenario: "confirmed",
    };
    const salary = salaryCalculator.calculate(input, payloads);
    const takeHome = takeHomeCalculator.calculate(input, payloads);

    expect(salary.result).toMatchObject({
      grossPay: "260000.00",
      apitBase: "260000.00",
      fundBase: "250000.00",
      apit: "9800.00",
      employeeEpf: "20000.00",
      employerEpf: "30000.00",
      totalEpf: "50000.00",
      employerEtf: "7500.00",
      employeeDeductions: "29800.00",
      employerContributions: "37500.00",
    });
    expect(takeHome.result).toMatchObject({
      grossPay: "260000.00",
      apitBase: "260000.00",
      fundBase: "250000.00",
      apit: "9800.00",
      employeeEpf: "20000.00",
      employeeDeductions: "29800.00",
      takeHomePay: "230200.00",
      employerEpf: "30000.00",
      employerEtf: "7500.00",
    });
    expect(salary.result).not.toHaveProperty("takeHomePay");
    expect(takeHome.result).not.toHaveProperty("totalEpf");
    expect(takeHome.result).not.toHaveProperty("employerContributions");
  });

  it.each([
    [
      { basicPay: "0", additionalFundEarnings: "0", apitOnlyEarnings: "0" },
      { grossPay: "0.00", apitBase: "0.00", fundBase: "0.00", apit: "0.00", employeeEpf: "0.00", employerEpf: "0.00", totalEpf: "0.00", employerEtf: "0.00", employeeDeductions: "0.00", employerContributions: "0.00" },
    ],
    [
      { basicPay: "100000", additionalFundEarnings: "20000", apitOnlyEarnings: "30000" },
      { grossPay: "150000.00", apitBase: "150000.00", fundBase: "120000.00", apit: "0.00", employeeEpf: "9600.00", employerEpf: "14400.00", totalEpf: "24000.00", employerEtf: "3600.00", employeeDeductions: "9600.00", employerContributions: "18000.00" },
    ],
    [
      { basicPay: "100000", additionalFundEarnings: "20000", apitOnlyEarnings: "30001" },
      { grossPay: "150001.00", apitBase: "150001.00", fundBase: "120000.00", apit: "1.00", employeeEpf: "9600.00", employerEpf: "14400.00", totalEpf: "24000.00", employerEtf: "3600.00", employeeDeductions: "9601.00", employerContributions: "18000.00" },
    ],
    [
      { basicPay: "0", additionalFundEarnings: "0", apitOnlyEarnings: "358334" },
      { grossPay: "358334.00", apitBase: "358334.00", fundBase: "0.00", apit: "35001.00", employeeEpf: "0.00", employerEpf: "0.00", totalEpf: "0.00", employerEtf: "0.00", employeeDeductions: "35001.00", employerContributions: "0.00" },
    ],
  ])("matches the documented salary golden fixture for %o", (inputs, expected) => {
    const salary = salaryCalculator.calculate({ asOfDate: "2025-04-01", supportedScenario: "confirmed", ...inputs }, payloads);
    expect(salary.result).toEqual(expected);
  });

  it.each([
    [
      { basicPay: "0", additionalFundEarnings: "0", apitOnlyEarnings: "0" },
      { grossPay: "0.00", apitBase: "0.00", fundBase: "0.00", apit: "0.00", employeeEpf: "0.00", employeeDeductions: "0.00", takeHomePay: "0.00", employerEpf: "0.00", employerEtf: "0.00" },
    ],
    [
      { basicPay: "100000", additionalFundEarnings: "20000", apitOnlyEarnings: "30000" },
      { grossPay: "150000.00", apitBase: "150000.00", fundBase: "120000.00", apit: "0.00", employeeEpf: "9600.00", employeeDeductions: "9600.00", takeHomePay: "140400.00", employerEpf: "14400.00", employerEtf: "3600.00" },
    ],
    [
      { basicPay: "100000", additionalFundEarnings: "20000", apitOnlyEarnings: "30001" },
      { grossPay: "150001.00", apitBase: "150001.00", fundBase: "120000.00", apit: "1.00", employeeEpf: "9600.00", employeeDeductions: "9601.00", takeHomePay: "140400.00", employerEpf: "14400.00", employerEtf: "3600.00" },
    ],
    [
      { basicPay: "0", additionalFundEarnings: "0", apitOnlyEarnings: "358334" },
      { grossPay: "358334.00", apitBase: "358334.00", fundBase: "0.00", apit: "35001.00", employeeEpf: "0.00", employeeDeductions: "35001.00", takeHomePay: "323333.00", employerEpf: "0.00", employerEtf: "0.00" },
    ],
  ])("matches the documented take-home golden fixture for %o", (inputs, expected) => {
    const takeHome = takeHomeCalculator.calculate({ asOfDate: "2025-04-01", supportedScenario: "confirmed", ...inputs }, payloads);
    expect(takeHome.result).toEqual(expected);
  });

  it.each([
    ["149999", "0.00"],
    ["150000", "0.00"],
    ["150001", "1.00"],
    ["233332", "5000.00"],
    ["233333", "5000.00"],
    ["233334", "5001.00"],
    ["274999", "12500.00"],
    ["275000", "12500.00"],
    ["275001", "12501.00"],
    ["316666", "22500.00"],
    ["316667", "22501.00"],
    ["316668", "22501.00"],
    ["358332", "35000.00"],
    ["358333", "35000.00"],
    ["358334", "35001.00"],
  ])("runs the APIT threshold matrix through the salary composite at %s", (apitOnlyEarnings, apit) => {
    const salary = salaryCalculator.calculate({
      asOfDate: "2025-04-01",
      supportedScenario: "confirmed",
      basicPay: "0",
      additionalFundEarnings: "0",
      apitOnlyEarnings,
    }, payloads);
    expect(salary.result).toMatchObject({ apitBase: `${apitOnlyEarnings}.00`, apit, fundBase: "0.00" });
  });

  it("requires explicit confirmation of the supported scope", () => {
    expect(() => salaryCalculator.getAsOfDate({
      asOfDate: "2026-08-14",
      basicPay: "200000",
      additionalFundEarnings: "0",
      apitOnlyEarnings: "0",
      supportedScenario: "",
    })).toThrow("Confirm that the supported employment scenario applies");
  });
});
