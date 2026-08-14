import { describe, expect, it } from "vitest";

import { getColomboDate, isIsoDate } from "@/server/rules/date";

describe("rule business dates", () => {
  it("rejects impossible calendar dates", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("0000-01-01")).toBe(false);
    expect(isIsoDate("29-02-2024")).toBe(false);
  });

  it("uses the Sri Lankan business date", () => {
    expect(getColomboDate(new Date("2026-08-13T19:00:00.000Z"))).toBe("2026-08-14");
  });
});
