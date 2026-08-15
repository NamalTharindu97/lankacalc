import { describe, expect, it } from "vitest";

import { type GratuityPayload, calculateGratuity } from "./index";

const payload: GratuityPayload = {
  ratePerCompletedYear: "0.5",
  minimumCompletedYears: "5",
  minimumEmployerWorkmen: "15",
  rounding: "half-up-rupee",
};

const confirmed = { employerWorkmenAtLeast15: "confirmed", notExcludedByAct: "confirmed" } as const;

describe("gratuity statutory calculation", () => {
  it.each([
    ["100000", "5", "250000.00", "50000.00"],
    ["123001", "5", "307503.00", "61500.50"],
    ["250000", "11", "1375000.00", "125000.00"],
    ["0", "5", "0.00", "0.00"],
    ["100000", "100", "5000000.00", "50000.00"],
  ])("computes half a month's wage per completed year for wage %s and %s years", (
    wage,
    years,
    expectedGratuity,
    expectedHalfMonth,
  ) => {
    const result = calculateGratuity(
      { lastDrawnMonthlyWage: wage, completedYearsOfService: years, ...confirmed },
      payload,
    );

    expect(result.eligible).toBe(true);
    expect(result.gratuity).toBe(expectedGratuity);
    expect(result.halfMonthAmount).toBe(expectedHalfMonth);
    expect(result.ratePerCompletedYear).toBe("half-month");
    expect(result.notEligibleReason).toBeUndefined();
  });

  it.each([
    ["4", "service-below-five-years"],
    ["0", "service-below-five-years"],
  ])("reports non-eligibility below five completed years (%s)", (years, reason) => {
    const result = calculateGratuity(
      { lastDrawnMonthlyWage: "100000", completedYearsOfService: years, ...confirmed },
      payload,
    );

    expect(result.eligible).toBe(false);
    expect(result.notEligibleReason).toBe(reason);
    expect(result.gratuity).toBe("0.00");
  });

  it("reports non-eligibility when the workmen condition is denied", () => {
    const result = calculateGratuity({
      lastDrawnMonthlyWage: "100000",
      completedYearsOfService: "5",
      employerWorkmenAtLeast15: "not-confirmed",
      notExcludedByAct: "confirmed",
    }, payload);

    expect(result.eligible).toBe(false);
    expect(result.notEligibleReason).toBe("employer-workmen-below-fifteen");
    expect(result.gratuity).toBe("0.00");
  });

  it("reports non-eligibility when the exclusion condition is denied", () => {
    const result = calculateGratuity({
      lastDrawnMonthlyWage: "100000",
      completedYearsOfService: "5",
      employerWorkmenAtLeast15: "confirmed",
      notExcludedByAct: "not-confirmed",
    }, payload);

    expect(result.eligible).toBe(false);
    expect(result.notEligibleReason).toBe("excluded-by-act");
    expect(result.gratuity).toBe("0.00");
  });

  it("rejects a blank eligibility confirmation", () => {
    expect(() => calculateGratuity({
      lastDrawnMonthlyWage: "100000",
      completedYearsOfService: "5",
      employerWorkmenAtLeast15: "" as "confirmed" | "not-confirmed",
      notExcludedByAct: "confirmed",
    }, payload)).toThrow();
  });

  it("rejects fractional and out-of-range values", () => {
    expect(() => calculateGratuity({
      lastDrawnMonthlyWage: "100000.5",
      completedYearsOfService: "5",
      ...confirmed,
    }, payload)).toThrow();
    expect(() => calculateGratuity({
      lastDrawnMonthlyWage: "-1",
      completedYearsOfService: "5",
      ...confirmed,
    }, payload)).toThrow();
    expect(() => calculateGratuity({
      lastDrawnMonthlyWage: "100000",
      completedYearsOfService: "101",
      ...confirmed,
    }, payload)).toThrow();
    expect(() => calculateGratuity({
      lastDrawnMonthlyWage: "100000",
      completedYearsOfService: "5.5",
      ...confirmed,
    }, payload)).toThrow();
  });
});
