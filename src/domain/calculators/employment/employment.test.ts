import { describe, expect, it } from "vitest";

import {
  type ApitPayload,
  type EpfPayload,
  type EtfPayload,
  calculateApit,
  calculateEpf,
  calculateEtf,
  calculateSalary,
} from "./index";

const apitPayload: ApitPayload = {
  rounding: "ceiling-whole-rupee",
  brackets: [
    { upperBound: "150000", rate: "0", deduction: "0" },
    { upperBound: "233333", rate: "0.06", deduction: "9000" },
    { upperBound: "275000", rate: "0.18", deduction: "37000" },
    { upperBound: "316667", rate: "0.24", deduction: "53500" },
    { upperBound: "358333", rate: "0.30", deduction: "72500" },
    { rate: "0.36", deduction: "94000" },
  ],
};

const epfPayload: EpfPayload = {
  employeeRate: "0.08",
  employerRate: "0.12",
  rounding: "half-up-cent",
};

const etfPayload: EtfPayload = {
  employerRate: "0.03",
  rounding: "exact-cent-only",
};

describe("APIT rule engine", () => {
  it.each([
    ["149999", 0, "0"],
    ["150000", 0, "0"],
    ["150001", 1, "1"],
    ["233332", 1, "5000"],
    ["233333", 1, "5000"],
    ["233334", 2, "5001"],
    ["274999", 2, "12500"],
    ["275000", 2, "12500"],
    ["275001", 3, "12501"],
    ["316666", 3, "22500"],
    ["316667", 3, "22501"],
    ["316668", 4, "22501"],
    ["358332", 4, "35000"],
    ["358333", 4, "35000"],
    ["358334", 5, "35001"],
  ])(
    "selects the inclusive bracket for income %s",
    (monthlyTaxableIncome, bracketIndex, expectedTax) => {
      const result = calculateApit({ monthlyTaxableIncome }, apitPayload);

      expect(result.tax).toBe(expectedTax);
      expect(result.selectedBracket.index).toBe(bracketIndex);
    },
  );

  it.each([
    ["150001", "1"],
    ["233334", "5001"],
  ])("matches official lookup fixture %s => %s", (monthlyTaxableIncome, tax) => {
    expect(calculateApit({ monthlyTaxableIncome }, apitPayload).tax).toBe(tax);
  });

  it("floors a negative bracket formula at zero before rounding", () => {
    const payload: ApitPayload = {
      rounding: "ceiling-whole-rupee",
      brackets: [{ rate: "0.10", deduction: "100" }],
    };

    expect(calculateApit({ monthlyTaxableIncome: "1" }, payload).tax).toBe("0");
  });

  it("rejects unordered and non-open-ended bracket rules", () => {
    expect(() =>
      calculateApit(
        { monthlyTaxableIncome: "100" },
        {
          rounding: "ceiling-whole-rupee",
          brackets: [
            { upperBound: "200", rate: "0", deduction: "0" },
            { upperBound: "100", rate: "0.1", deduction: "0" },
          ],
        },
      ),
    ).toThrow();
  });
});

describe("EPF rule engine", () => {
  it.each([
    ["100000.00", "8000.00", "12000.00", "20000.00"],
    ["12345.67", "987.65", "1481.48", "2469.13"],
    ["100.05", "8.00", "12.01", "20.01"],
    ["100.04", "8.00", "12.00", "20.00"],
  ])(
    "rounds employee and employer contributions independently for %s",
    (eligibleEarnings, employee, employer, total) => {
      const result = calculateEpf({ eligibleEarnings }, epfPayload);

      expect(result.employee.amount).toBe(employee);
      expect(result.employer.amount).toBe(employer);
      expect(result.totalContribution).toBe(total);
    },
  );
});

describe("ETF rule engine", () => {
  it.each([
    ["100000", "3000.00"],
    ["12345.00", "370.35"],
  ])("returns exact-cent employer contributions for %s", (eligibleEarnings, amount) => {
    const result = calculateEtf({ eligibleEarnings }, etfPayload);

    expect(result.employer.amount).toBe(amount);
    expect(result).not.toHaveProperty("employee");
  });

  it("rejects an ETF result with a fractional cent", () => {
    expect(() =>
      calculateEtf(
        { eligibleEarnings: "1" },
        { employerRate: "0.001", rounding: "exact-cent-only" },
      ),
    ).toThrow("not an exact-cent amount");
  });
});

describe("salary composition", () => {
  it("reconciles salary and keeps employer-only ETF out of take-home deductions", () => {
    const result = calculateSalary(
      {
        basicPay: "200000",
        additionalFundEarnings: "50000",
        apitOnlyEarnings: "10000",
      },
      { apit: apitPayload, epf: epfPayload, etf: etfPayload },
    );

    expect(result).toMatchObject({
      grossPay: "260000.00",
      apitTaxableIncome: "260000.00",
      fundEligibleEarnings: "250000.00",
      takeHomePay: "230200.00",
      contributions: {
        apit: { tax: "9800" },
        epf: {
          employee: { amount: "20000.00" },
          employer: { amount: "30000.00" },
          totalContribution: "50000.00",
        },
        etf: { employer: { amount: "7500.00" } },
      },
    });

    expect(result.takeHomePay).toBe(
      String(260000 - Number(result.contributions.apit.tax) - 20000) + ".00",
    );
  });
});
