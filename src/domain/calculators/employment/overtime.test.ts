import { describe, expect, it } from "vitest";

import { type OvertimePayload, calculateOvertime } from "./index";

const payload: OvertimePayload = {
  normalDailyHours: "8",
  normalWeeklyHours: "45",
  weekdayMultiplier: "1.5",
  restDayMultiplier: "1.5",
  maximumWeeklyOvertimeHours: "12",
  hourlyRateDivisors: {
    statutoryMonthly: "240",
    conventionMonthly: "200",
  },
  rounding: "half-up-cent",
};

describe("overtime statutory calculation", () => {
  it.each([
    ["100000", "statutory-240", "12", "4", "416.67", 240, "7500.00", "2500.00", "10000.00", "16.0", "3.69", "no"],
    ["60000", "convention-200", "12", "0", "300.00", 200, "5400.00", "0.00", "5400.00", "12.0", "2.77", "no"],
    ["60000", "statutory-240", "0.5", "0", "250.00", 240, "187.50", "0.00", "187.50", "0.5", "0.12", "no"],
    ["123457", "statutory-240", "1", "0", "514.40", 240, "771.61", "0.00", "771.61", "1.0", "0.23", "no"],
    ["120000", "convention-200", "12", "6", "600.00", 200, "10800.00", "5400.00", "16200.00", "18.0", "4.15", "no"],
    ["60000", "convention-200", "60", "0", "300.00", 200, "27000.00", "0.00", "27000.00", "60.0", "13.85", "possible"],
    ["0", "statutory-240", "0", "0", "0.00", 240, "0.00", "0.00", "0.00", "0.0", "0.00", "no"],
  ])("computes overtime for remuneration %s on basis %s with %s weekday and %s rest-day hours", (
    remuneration,
    basis,
    weekday,
    restDay,
    hourlyRate,
    divisor,
    weekdayPay,
    restDayPay,
    total,
    totalHours,
    averageWeekly,
    cap,
  ) => {
    const result = calculateOvertime({
      monthlyRemuneration: remuneration,
      hourlyRateBasis: basis as "statutory-240" | "convention-200",
      weekdayOvertimeHours: weekday,
      restDayOvertimeHours: restDay,
    }, payload);

    expect(result.hourlyRate).toBe(hourlyRate);
    expect(result.hourlyRateDivisor).toBe(divisor);
    expect(result.weekdayMultiplier).toBe("1.5");
    expect(result.restDayMultiplier).toBe("1.5");
    expect(result.weekdayOvertimePay).toBe(weekdayPay);
    expect(result.restDayOvertimePay).toBe(restDayPay);
    expect(result.totalOvertimePay).toBe(total);
    expect(result.totalOvertimeHours).toBe(totalHours);
    expect(result.averageWeeklyOvertimeHours).toBe(averageWeekly);
    expect(result.weeklyCapExceeded).toBe(cap);
  });

  it("rejects hours that are not half-hour steps", () => {
    expect(() => calculateOvertime({
      monthlyRemuneration: "60000",
      hourlyRateBasis: "statutory-240",
      weekdayOvertimeHours: "0.25",
      restDayOvertimeHours: "0",
    }, payload)).toThrow();
    expect(() => calculateOvertime({
      monthlyRemuneration: "60000",
      hourlyRateBasis: "statutory-240",
      weekdayOvertimeHours: "745",
      restDayOvertimeHours: "0",
    }, payload)).toThrow();
  });

  it("rejects fractional remuneration and blank hours", () => {
    expect(() => calculateOvertime({
      monthlyRemuneration: "100000.5",
      hourlyRateBasis: "statutory-240",
      weekdayOvertimeHours: "0",
      restDayOvertimeHours: "0",
    }, payload)).toThrow();
    expect(() => calculateOvertime({
      monthlyRemuneration: "100000",
      hourlyRateBasis: "statutory-240",
      weekdayOvertimeHours: "",
      restDayOvertimeHours: "0",
    }, payload)).toThrow();
    expect(() => calculateOvertime({
      monthlyRemuneration: "100000",
      hourlyRateBasis: "unknown",
      weekdayOvertimeHours: "0",
      restDayOvertimeHours: "0",
    } as never, payload)).toThrow();
  });
});
