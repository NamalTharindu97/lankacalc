import { describe, expect, it } from "vitest";

import {
  leaseCalculator,
  loanScheduleCalculator,
} from "@/domain/calculators/lending-calculators";
import {
  observedLendingRatesPayloadSchema,
  resolveObservedRate,
  resolveVehicleLeaseLtvCap,
  type ObservedLendingRatesPayload,
} from "@/domain/calculators/lending/observed-rates";
import { getCalculators } from "@/domain/calculators/registry";

const observedLendingRatesPayload = {
  observedLendingRates: {
    authority: "cbsl",
    effectiveFrom: "2026-01-01",
    rounding: "two-decimal-percent",
    rates: [
      { rateType: "awpr", label: "Average Weighted Prime Lending Rate (monthly)", value: "8.99", observedOn: "2026-01-31" },
      { rateType: "awpr", label: "Average Weighted Prime Lending Rate (monthly)", value: "9.39", observedOn: "2026-03-31" },
      { rateType: "awpr", label: "Average Weighted Prime Lending Rate (monthly)", value: "9.75", observedOn: "2026-05-31" },
    ],
  },
} satisfies { observedLendingRates: ObservedLendingRatesPayload };

const vehicleLeaseLtvPayload = {
  vehicleLeaseLtv: {
    authority: "cbsl",
    effectiveFrom: "2025-07-18",
    rounding: "two-decimal-percent",
    rates: [
      { rateType: "max-motor-vehicle-ltv", category: "motor-car", label: "Motor cars, SUVs and vans (DMT class B, other than light trucks and single cabs)", value: "60", observedOn: "2025-07-18" },
      { rateType: "max-motor-vehicle-ltv", category: "three-wheeler", label: "Three wheelers (DMT class B1)", value: "50", observedOn: "2025-07-18" },
      { rateType: "max-motor-vehicle-ltv", category: "commercial", label: "Commercial vehicles and light trucks (DMT classes C1, C, CE, D1, D, DE, G1, G, J)", value: "80", observedOn: "2025-07-18" },
      { rateType: "max-motor-vehicle-ltv", category: "other", label: "Other vehicles (DMT classes A1, A and single cabs under B)", value: "70", observedOn: "2025-07-18" },
      { rateType: "max-motor-vehicle-ltv", category: "used", label: "Registered vehicles used in Sri Lanka for more than one year after first registration", value: "70", observedOn: "2025-07-18" },
    ],
  },
} satisfies { vehicleLeaseLtv: ObservedLendingRatesPayload };

describe("loan schedule calculator", () => {
  it("matches the loan EMI baseline for a plain loan", () => {
    const calculation = loanScheduleCalculator.calculate({
      asOfDate: "2026-08-16",
      rateSource: "user",
      principal: 1_000_000,
      annualRatePercent: 12,
      termMonths: 12,
      processingFeePercent: 0,
      monthlyInsurancePremium: 0,
      extraPaymentAmount: 0,
      extraPaymentMonth: 0,
    }, observedLendingRatesPayload);

    expect(calculation.result).toMatchObject({
      rateSource: "user",
      appliedAnnualRatePercent: "12",
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
      asOfDate: "2026-08-16",
      rateSource: "user",
      principal: 120_000,
      annualRatePercent: 0,
      termMonths: 12,
      processingFeePercent: 0,
      monthlyInsurancePremium: 0,
      extraPaymentAmount: 0,
      extraPaymentMonth: 0,
    }, observedLendingRatesPayload);

    expect(calculation.result.monthlyPayment).toBe("10000.00");
    expect(calculation.result.totalInterest).toBe("0.00");
  });

  it("adds the processing fee and insurance to the total cost", () => {
    const calculation = loanScheduleCalculator.calculate({
      asOfDate: "2026-08-16",
      rateSource: "user",
      principal: 1_000_000,
      annualRatePercent: 12,
      termMonths: 12,
      processingFeePercent: 2,
      monthlyInsurancePremium: 500,
      extraPaymentAmount: 0,
      extraPaymentMonth: 0,
    }, observedLendingRatesPayload);

    expect(calculation.result.processingFeeAmount).toBe("20000.00");
    expect(calculation.result.totalInsurance).toBe("6000.00");
    expect(calculation.result.totalCost).toBe("1092185.46");
  });

  it("shortens the term and reports interest saved for an early payment", () => {
    const calculation = loanScheduleCalculator.calculate({
      asOfDate: "2026-08-16",
      rateSource: "user",
      principal: 1_000_000,
      annualRatePercent: 12,
      termMonths: 24,
      processingFeePercent: 0,
      monthlyInsurancePremium: 0,
      extraPaymentAmount: 100_000,
      extraPaymentMonth: 12,
    }, observedLendingRatesPayload);

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
        asOfDate: "2026-08-16",
        rateSource: "user",
        principal: 1_000_000,
        annualRatePercent: 12,
        termMonths: 12,
        processingFeePercent: 0,
        monthlyInsurancePremium: 0,
        extraPaymentAmount: 100_000,
        extraPaymentMonth: 13,
      }, observedLendingRatesPayload),
    ).toThrow();
  });

  it("rejects a user rate source without a rate", () => {
    expect(() =>
      loanScheduleCalculator.calculate({
        asOfDate: "2026-08-16",
        rateSource: "user",
        principal: 1_000_000,
        termMonths: 12,
        processingFeePercent: 0,
        monthlyInsurancePremium: 0,
        extraPaymentAmount: 0,
        extraPaymentMonth: 0,
      }, observedLendingRatesPayload),
    ).toThrow();
  });

  it("uses the platform-observed AWPR resolved for the calculation date", () => {
    const calculation = loanScheduleCalculator.calculate({
      asOfDate: "2026-08-16",
      rateSource: "platform",
      principal: 1_000_000,
      termMonths: 12,
      processingFeePercent: 0,
      monthlyInsurancePremium: 0,
      extraPaymentAmount: 0,
      extraPaymentMonth: 0,
    }, observedLendingRatesPayload);

    expect(calculation.result).toMatchObject({
      rateSource: "platform",
      appliedAnnualRatePercent: "9.75",
      rateLabel: "Average Weighted Prime Lending Rate (monthly)",
      rateObservationDate: "2026-05-31",
      rateAuthority: "Central Bank of Sri Lanka",
      monthlyPayment: "87799.66",
    });
  });

  it("resolves the observation on or before the calculation date", () => {
    const calculation = loanScheduleCalculator.calculate({
      asOfDate: "2026-02-15",
      rateSource: "platform",
      principal: 1_000_000,
      termMonths: 12,
      processingFeePercent: 0,
      monthlyInsurancePremium: 0,
      extraPaymentAmount: 0,
      extraPaymentMonth: 0,
    }, observedLendingRatesPayload);

    expect(calculation.result.appliedAnnualRatePercent).toBe("8.99");
    expect(calculation.result.rateObservationDate).toBe("2026-01-31");
  });

  it("fails when no observation predates the calculation date", () => {
    expect(() =>
      loanScheduleCalculator.calculate({
        asOfDate: "2025-12-01",
        rateSource: "platform",
        principal: 1_000_000,
        termMonths: 12,
        processingFeePercent: 0,
        monthlyInsurancePremium: 0,
        extraPaymentAmount: 0,
        extraPaymentMonth: 0,
      }, observedLendingRatesPayload),
    ).toThrow(RangeError);
  });
});

describe("observed lending rates resolver", () => {
  it("picks the most recent observation on or before the date", () => {
    const payload = observedLendingRatesPayloadSchema.parse(
      observedLendingRatesPayload.observedLendingRates,
    );

    expect(resolveObservedRate(payload, "2026-04-15", "awpr")).toMatchObject({
      value: "9.39",
      observedOn: "2026-03-31",
    });
  });

  it("rejects duplicate observations for the same rate type and date", () => {
    expect(() =>
      observedLendingRatesPayloadSchema.parse({
        authority: "cbsl",
        effectiveFrom: "2026-01-01",
        rounding: "two-decimal-percent",
        rates: [
          { rateType: "awpr", label: "Average Weighted Prime Lending Rate (monthly)", value: "9.00", observedOn: "2026-01-31" },
          { rateType: "awpr", label: "Average Weighted Prime Lending Rate (monthly)", value: "9.25", observedOn: "2026-01-31" },
        ],
      }),
    ).toThrow();
  });

  it("allows distinct LTV caps per vehicle category on the same date", () => {
    const payload = vehicleLeaseLtvPayload.vehicleLeaseLtv;

    expect(() => observedLendingRatesPayloadSchema.parse(payload)).not.toThrow();
  });

  it("rejects a duplicate LTV cap for the same category and date", () => {
    expect(() =>
      observedLendingRatesPayloadSchema.parse({
        authority: "cbsl",
        effectiveFrom: "2025-07-18",
        rounding: "two-decimal-percent",
        rates: [
          { rateType: "max-motor-vehicle-ltv", category: "motor-car", label: "Motor cars", value: "60", observedOn: "2025-07-18" },
          { rateType: "max-motor-vehicle-ltv", category: "motor-car", label: "Motor cars", value: "55", observedOn: "2025-07-18" },
        ],
      }),
    ).toThrow();
  });

  it("resolves the motor-vehicle LTV cap by category and date", () => {
    const payload = observedLendingRatesPayloadSchema.parse(
      vehicleLeaseLtvPayload.vehicleLeaseLtv,
    );

    expect(
      resolveVehicleLeaseLtvCap(payload, {
        asOfDate: "2026-08-16",
        vehicleClass: "motor-car",
        vehicleUsedMoreThanOneYear: "no",
      }),
    ).toMatchObject({ category: "motor-car", value: "60", observedOn: "2025-07-18" });

    expect(
      resolveVehicleLeaseLtvCap(payload, {
        asOfDate: "2026-08-16",
        vehicleClass: "motor-car",
        vehicleUsedMoreThanOneYear: "yes",
      }),
    ).toMatchObject({ category: "used", value: "70" });
  });

  it("fails to resolve an LTV cap before the direction effective date", () => {
    const payload = observedLendingRatesPayloadSchema.parse(
      vehicleLeaseLtvPayload.vehicleLeaseLtv,
    );

    expect(() =>
      resolveVehicleLeaseLtvCap(payload, {
        asOfDate: "2025-07-01",
        vehicleClass: "motor-car",
        vehicleUsedMoreThanOneYear: "no",
      }),
    ).toThrow(RangeError);
  });
});

describe("lease calculator", () => {
  it("estimates monthly lease payments with deposit, residual, and fee", () => {
    const calculation = leaseCalculator.calculate({
      asOfDate: "2026-08-16",
      rateSource: "user",
      assetValue: 2_000_000,
      deposit: 200_000,
      residualValue: 400_000,
      annualRatePercent: 12,
      termMonths: 24,
      processingFeePercent: 1,
    }, vehicleLeaseLtvPayload);

    expect(calculation.result).toMatchObject({
      financedAmount: "1400000.00",
      monthlyPayment: "65902.86",
      balloonPayment: "400000.00",
      totalInstallments: "1581668.64",
      totalInterest: "181668.64",
      processingFeeAmount: "20000.00",
      totalCost: "2201668.64",
    });
    expect(calculation.result.rateSource).toBeUndefined();
  });

  it("handles a zero-rate lease", () => {
    const calculation = leaseCalculator.calculate({
      asOfDate: "2026-08-16",
      rateSource: "user",
      assetValue: 1_200_000,
      deposit: 120_000,
      residualValue: 0,
      annualRatePercent: 0,
      termMonths: 12,
      processingFeePercent: 0,
    }, vehicleLeaseLtvPayload);

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
        asOfDate: "2026-08-16",
        rateSource: "user",
        assetValue: 1_000_000,
        deposit: 600_000,
        residualValue: 500_000,
        annualRatePercent: 12,
        termMonths: 24,
        processingFeePercent: 0,
      }, vehicleLeaseLtvPayload),
    ).toThrow();
  });

  it("reports the effective LTV against the CBSL cap in platform mode", () => {
    const calculation = leaseCalculator.calculate({
      asOfDate: "2026-08-16",
      rateSource: "platform",
      assetValue: 2_000_000,
      deposit: 200_000,
      residualValue: 400_000,
      annualRatePercent: 12,
      termMonths: 24,
      processingFeePercent: 1,
      vehicleClass: "motor-car",
      vehicleUsedMoreThanOneYear: "no",
    }, vehicleLeaseLtvPayload);

    expect(calculation.result).toMatchObject({
      rateSource: "platform",
      vehicleClass: "motor-car",
      effectiveLtvPercent: "90.00",
      maxLtvPercent: "60",
      rateLabel: "Motor cars, SUVs and vans (DMT class B, other than light trucks and single cabs)",
      rateObservationDate: "2025-07-18",
      rateAuthority: "Central Bank of Sri Lanka",
      monthlyPayment: "65902.86",
    });
    expect(calculation.warnings.some((warning) => warning.includes("above the CBSL cap"))).toBe(true);
  });

  it("applies the flat cap for vehicles used more than one year", () => {
    const calculation = leaseCalculator.calculate({
      asOfDate: "2026-08-16",
      rateSource: "platform",
      assetValue: 2_000_000,
      deposit: 400_000,
      residualValue: 400_000,
      annualRatePercent: 12,
      termMonths: 24,
      processingFeePercent: 1,
      vehicleClass: "motor-car",
      vehicleUsedMoreThanOneYear: "yes",
    }, vehicleLeaseLtvPayload);

    expect(calculation.result).toMatchObject({
      effectiveLtvPercent: "80.00",
      maxLtvPercent: "70",
      rateLabel: "Registered vehicles used in Sri Lanka for more than one year after first registration",
    });
    expect(calculation.warnings.some((warning) => warning.includes("above the CBSL cap"))).toBe(true);
  });

  it("passes the LTV check when the deposit keeps the deal within the cap", () => {
    const calculation = leaseCalculator.calculate({
      asOfDate: "2026-08-16",
      rateSource: "platform",
      assetValue: 2_000_000,
      deposit: 1_000_000,
      residualValue: 400_000,
      annualRatePercent: 12,
      termMonths: 24,
      processingFeePercent: 1,
      vehicleClass: "motor-car",
      vehicleUsedMoreThanOneYear: "no",
    }, vehicleLeaseLtvPayload);

    expect(calculation.result.effectiveLtvPercent).toBe("50.00");
    expect(calculation.warnings.some((warning) => warning.includes("above the CBSL cap"))).toBe(false);
  });

  it("uses the three-wheeler cap for a three wheeler", () => {
    const calculation = leaseCalculator.calculate({
      asOfDate: "2026-08-16",
      rateSource: "platform",
      assetValue: 1_000_000,
      deposit: 400_000,
      residualValue: 0,
      annualRatePercent: 12,
      termMonths: 24,
      processingFeePercent: 0,
      vehicleClass: "three-wheeler",
      vehicleUsedMoreThanOneYear: "no",
    }, vehicleLeaseLtvPayload);

    expect(calculation.result.maxLtvPercent).toBe("50");
    expect(calculation.result.effectiveLtvPercent).toBe("60.00");
  });

  it("fails in platform mode before the direction effective date", () => {
    expect(() =>
      leaseCalculator.calculate({
        asOfDate: "2025-07-01",
        rateSource: "platform",
        assetValue: 2_000_000,
        deposit: 200_000,
        residualValue: 400_000,
        annualRatePercent: 12,
        termMonths: 24,
        processingFeePercent: 1,
        vehicleClass: "motor-car",
        vehicleUsedMoreThanOneYear: "no",
      }, vehicleLeaseLtvPayload),
    ).toThrow(RangeError);
  });

  it("requires a vehicle class in platform mode", () => {
    expect(() =>
      leaseCalculator.calculate({
        asOfDate: "2026-08-16",
        rateSource: "platform",
        assetValue: 2_000_000,
        deposit: 200_000,
        residualValue: 400_000,
        annualRatePercent: 12,
        termMonths: 24,
        processingFeePercent: 1,
      }, vehicleLeaseLtvPayload),
    ).toThrow();
  });
});

describe("lending calculator fixtures", () => {
  it.each([
    ["loan-schedule", { asOfDate: "2026-08-16", rateSource: "user", principal: "1000000", annualRatePercent: "12", termMonths: "12", processingFeePercent: "0", monthlyInsurancePremium: "0", extraPaymentAmount: "0", extraPaymentMonth: "0" }, { monthlyPayment: "88848.79", finalPayment: "88848.77", totalPayment: "1066185.46", totalInterest: "66185.46", processingFeeAmount: "0.00", totalInsurance: "0.00", totalCost: "1066185.46" }],
    ["loan-schedule", { asOfDate: "2026-08-16", rateSource: "user", principal: "1000000", annualRatePercent: "12", termMonths: "24", processingFeePercent: "0", monthlyInsurancePremium: "0", extraPaymentAmount: "100000", extraPaymentMonth: "12" }, { monthlyPayment: "47073.47", totalInterest: "129763.33", termMonthsWithExtraPayment: 22, termMonthsSaved: 2, finalPaymentWithExtraPayment: "29364.65", totalPaymentWithExtraPayment: "1117907.52", interestSaved: "111855.81" }],
  ])("matches the approved loan-schedule fixture through the domain for %s", (key, input, expected) => {
    const direct = loanScheduleCalculator.calculate(input, observedLendingRatesPayload);

    expect(direct.result).toMatchObject(expected);
  });

  it.each([
    ["lease", { asOfDate: "2026-08-16", rateSource: "user", assetValue: "2000000", deposit: "200000", residualValue: "400000", annualRatePercent: "12", termMonths: "24", processingFeePercent: "1" }, { financedAmount: "1400000.00", monthlyPayment: "65902.86", balloonPayment: "400000.00", totalInstallments: "1581668.64", totalInterest: "181668.64", processingFeeAmount: "20000.00", totalCost: "2201668.64" }],
    ["lease", { asOfDate: "2026-08-16", rateSource: "user", assetValue: "1200000", deposit: "120000", residualValue: "0", annualRatePercent: "0", termMonths: "12", processingFeePercent: "0" }, { financedAmount: "1080000.00", monthlyPayment: "90000.00", totalInstallments: "1080000.00", totalInterest: "0.00", totalCost: "1200000.00" }],
  ])("matches the approved lease fixture through the domain for %s", (key, input, expected) => {
    const direct = leaseCalculator.calculate(input, vehicleLeaseLtvPayload);

    expect(direct.result).toMatchObject(expected);
  });

  it("publishes the lending calculators in the registry", () => {
    const keys = getCalculators().map((calculator) => calculator.key);

    expect(keys).toEqual(expect.arrayContaining(["loan-schedule", "lease"]));
  });
});
