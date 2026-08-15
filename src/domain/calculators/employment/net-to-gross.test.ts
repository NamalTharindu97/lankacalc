import { describe, expect, it } from "vitest";

import {
  type ApitPayload,
  type EpfPayload,
  calculateNetToGross,
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

const etfPayload = {
  employerRate: "0.03",
  rounding: "exact-cent-only",
} as const;

const payloads = { apit: apitPayload, epf: epfPayload };

describe("net-to-gross inversion", () => {
  it.each([
    ["0", "0", "0.00", "0.00", "0.00", "0.00", "0.00", "0"],
    ["100000", "0", "108696.00", "0.00", "8695.68", "100000.32", "0.32", "0"],
    ["138000", "0", "150000.00", "0.00", "12000.00", "138000.00", "0.00", "0"],
    ["150000", "0", "163955.00", "838.00", "13116.40", "150000.60", "0.60", "6"],
    ["200000", "0", "222094.00", "4326.00", "17767.52", "200000.48", "0.48", "6"],
    ["233000", "0", "264866.00", "10676.00", "21189.28", "233000.72", "0.72", "18"],
    ["400000", "0", "546430.00", "102715.00", "43714.40", "400000.60", "0.60", "36"],
    ["100000", "10000", "107827.00", "0.00", "7826.16", "100000.84", "0.84", "0"],
  ])("solves the minimum gross for target %s with APIT-only %s", (
    target,
    nonFund,
    requiredGross,
    apit,
    employeeEpf,
    takeHome,
    excess,
    ratePercent,
  ) => {
    const result = calculateNetToGross(
      { targetTakeHomePay: target, apitOnlyEarnings: nonFund },
      payloads,
    );

    expect(result.converged).toBe(true);
    expect(result.requiredGrossPay).toBe(requiredGross);
    expect(result.apit).toBe(apit);
    expect(result.employeeEpf).toBe(employeeEpf);
    expect(result.computedTakeHomePay).toBe(takeHome);
    expect(result.excessOverTarget).toBe(excess);
    expect(result.resolvedBracketRatePercent).toBe(ratePercent);
    expect(result.bracketsEvaluated).toBe(6);
  });

  it("matches the forward take-home composite for the solved salary", () => {
    const result = calculateNetToGross(
      { targetTakeHomePay: "150000", apitOnlyEarnings: "20000" },
      payloads,
    );
    if (!result.converged || !result.fundBase) throw new Error("Expected convergence.");

    const fundBase = result.fundBase.replace(".00", "");
    const forward = calculateSalary({
      basicPay: fundBase,
      additionalFundEarnings: "0",
      apitOnlyEarnings: "20000",
    }, { apit: apitPayload, epf: epfPayload, etf: etfPayload });

    expect(forward.grossPay).toBe(result.requiredGrossPay);
    expect(forward.takeHomePay).toBe(result.computedTakeHomePay);
    expect(forward.fundEligibleEarnings).toBe(result.fundBase);
  });

  it("returns zero gross for a zero target and zero APIT-only earnings", () => {
    const result = calculateNetToGross(
      { targetTakeHomePay: "0", apitOnlyEarnings: "0" },
      payloads,
    );
    expect(result.converged).toBe(true);
    expect(result.requiredGrossPay).toBe("0.00");
    expect(result.fundBase).toBe("0.00");
    expect(result.computedTakeHomePay).toBe("0.00");
  });

  it("never reports a negative fund base when APIT-only earnings are large", () => {
    const result = calculateNetToGross(
      { targetTakeHomePay: "0", apitOnlyEarnings: "75000" },
      payloads,
    );
    expect(result.converged).toBe(true);
    expect(result.requiredGrossPay).toBe("75000.00");
    expect(result.fundBase).toBe("0.00");
    expect(result.computedTakeHomePay).toBe("75000.00");
  });

  it("reports non-convergence when the target exceeds the supported bound", () => {
    const result = calculateNetToGross(
      { targetTakeHomePay: "600000000000", apitOnlyEarnings: "0" },
      payloads,
    );
    expect(result.converged).toBe(false);
    expect(result.maxAchievableTakeHomePay).toBe("560000094000.00");
    expect(result.requiredGrossPay).toBeUndefined();
  });

  it("converges exactly at the maximum achievable take-home", () => {
    const result = calculateNetToGross(
      { targetTakeHomePay: "560000094000", apitOnlyEarnings: "0" },
      payloads,
    );
    expect(result.converged).toBe(true);
    expect(result.requiredGrossPay).toBe("1000000000000.00");
    expect(result.computedTakeHomePay).toBe("560000094000.00");
  });

  it("rejects fractional and negative targets", () => {
    expect(() => calculateNetToGross(
      { targetTakeHomePay: "100000.5", apitOnlyEarnings: "0" },
      payloads,
    )).toThrow();
    expect(() => calculateNetToGross(
      { targetTakeHomePay: "-1", apitOnlyEarnings: "0" },
      payloads,
    )).toThrow();
    expect(() => calculateNetToGross(
      { targetTakeHomePay: "100000", apitOnlyEarnings: "0.01" },
      payloads,
    )).toThrow();
  });
});
