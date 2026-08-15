import { describe, expect, it } from "vitest";

import { type SalaryPayloads, calculateSalaryIncrement } from "./index";

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

describe("salary increment comparison", () => {
  it("compares a percentage increment below the APIT threshold", () => {
    const result = calculateSalaryIncrement({
      basicPay: "100000",
      additionalFundEarnings: "0",
      apitOnlyEarnings: "0",
      incrementType: "percentage",
      incrementValue: "10",
    }, payloads);

    expect(result.newBasicPay).toBe("110000.00");
    expect(result.incrementAmount).toBe("10000.00");
    expect(result.incrementPercent).toBe("10.00");
    expect(result.current).toEqual({
      grossPay: "100000.00",
      takeHomePay: "92000.00",
      apit: "0.00",
      employeeEpf: "8000.00",
      employerEpf: "12000.00",
      employerEtf: "3000.00",
    });
    expect(result.incremented).toEqual({
      grossPay: "110000.00",
      takeHomePay: "101200.00",
      apit: "0.00",
      employeeEpf: "8800.00",
      employerEpf: "13200.00",
      employerEtf: "3300.00",
    });
    expect(result.increases).toEqual({
      gross: "10000.00",
      takeHome: "9200.00",
      apit: "0.00",
      employeeEpf: "800.00",
      employerEpf: "1200.00",
      employerEtf: "300.00",
    });
    expect(result.noBasePercent).toBe(false);
  });

  it("reports the take-home gap when the increment crosses an APIT band", () => {
    const result = calculateSalaryIncrement({
      basicPay: "200000",
      additionalFundEarnings: "50000",
      apitOnlyEarnings: "0",
      incrementType: "percentage",
      incrementValue: "10",
    }, payloads);

    expect(result.current.takeHomePay).toBe("222000.00");
    expect(result.incremented.takeHomePay).toBe("236800.00");
    expect(result.increases).toEqual({
      gross: "20000.00",
      takeHome: "14800.00",
      apit: "3600.00",
      employeeEpf: "1600.00",
      employerEpf: "2400.00",
      employerEtf: "600.00",
    });
  });

  it("derives the effective percent for a fixed amount increment", () => {
    const result = calculateSalaryIncrement({
      basicPay: "150000",
      additionalFundEarnings: "0",
      apitOnlyEarnings: "10000",
      incrementType: "amount",
      incrementValue: "20000",
    }, payloads);

    expect(result.newBasicPay).toBe("170000.00");
    expect(result.incrementAmount).toBe("20000.00");
    expect(result.incrementPercent).toBe("13.33");
    expect(result.current.takeHomePay).toBe("147400.00");
    expect(result.incremented.takeHomePay).toBe("164600.00");
    expect(result.increases).toEqual({
      gross: "20000.00",
      takeHome: "17200.00",
      apit: "1200.00",
      employeeEpf: "1600.00",
      employerEpf: "2400.00",
      employerEtf: "600.00",
    });
  });

  it("rounds a percentage increment to the nearest rupee", () => {
    const result = calculateSalaryIncrement({
      basicPay: "123457",
      additionalFundEarnings: "0",
      apitOnlyEarnings: "0",
      incrementType: "percentage",
      incrementValue: "5",
    }, payloads);

    expect(result.newBasicPay).toBe("129630.00");
    expect(result.incrementAmount).toBe("6173.00");
    expect(result.incrementPercent).toBe("5.00");
  });

  it("cannot derive a percent when the current basic pay is zero", () => {
    const result = calculateSalaryIncrement({
      basicPay: "0",
      additionalFundEarnings: "0",
      apitOnlyEarnings: "0",
      incrementType: "amount",
      incrementValue: "1000",
    }, payloads);

    expect(result.newBasicPay).toBe("1000.00");
    expect(result.incrementAmount).toBe("1000.00");
    expect(result.incrementPercent).toBe("0.00");
    expect(result.noBasePercent).toBe(true);
  });

  it("rejects a zero increment leaving no change flagged as zero differences", () => {
    const result = calculateSalaryIncrement({
      basicPay: "100000",
      additionalFundEarnings: "0",
      apitOnlyEarnings: "0",
      incrementType: "amount",
      incrementValue: "0",
    }, payloads);

    expect(result.increases).toEqual({
      gross: "0.00",
      takeHome: "0.00",
      apit: "0.00",
      employeeEpf: "0.00",
      employerEpf: "0.00",
      employerEtf: "0.00",
    });
  });

  it("rejects invalid percentages and fractional amounts", () => {
    expect(() => calculateSalaryIncrement({
      basicPay: "100000",
      additionalFundEarnings: "0",
      apitOnlyEarnings: "0",
      incrementType: "percentage",
      incrementValue: "1001",
    }, payloads)).toThrow();
    expect(() => calculateSalaryIncrement({
      basicPay: "100000",
      additionalFundEarnings: "0",
      apitOnlyEarnings: "0",
      incrementType: "percentage",
      incrementValue: "5.555",
    }, payloads)).toThrow();
    expect(() => calculateSalaryIncrement({
      basicPay: "100000",
      additionalFundEarnings: "0",
      apitOnlyEarnings: "0",
      incrementType: "amount",
      incrementValue: "1500.5",
    }, payloads)).toThrow();
    expect(() => calculateSalaryIncrement({
      basicPay: "100000.5",
      additionalFundEarnings: "0",
      apitOnlyEarnings: "0",
      incrementType: "percentage",
      incrementValue: "5",
    }, payloads)).toThrow();
    expect(() => calculateSalaryIncrement({
      basicPay: "100000",
      additionalFundEarnings: "0",
      apitOnlyEarnings: "0",
      incrementType: "unknown",
      incrementValue: "5",
    } as never, payloads)).toThrow();
  });
});
