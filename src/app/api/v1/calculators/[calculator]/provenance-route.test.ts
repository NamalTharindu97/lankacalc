import { describe, expect, it } from "vitest";

import { GET as getRules } from "@/app/api/v1/calculators/[calculator]/rules/route";
import { GET as getSources } from "@/app/api/v1/calculators/[calculator]/sources/route";

function context(calculator: string) {
  return { params: Promise.resolve({ calculator }) };
}

describe("calculator provenance routes", () => {
  it("returns 404 for calculators outside the code registry", async () => {
    const response = await getRules(new Request("https://example.test/api/v1/calculators/missing/rules"), context("missing"));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "CALCULATOR_NOT_FOUND" } });
  });

  it("validates source and rule asOfDate values", async () => {
    const rulesResponse = await getRules(
      new Request("https://example.test/api/v1/calculators/percentage/rules?asOfDate=14-08-2026"),
      context("percentage"),
    );
    const sourcesResponse = await getSources(
      new Request("https://example.test/api/v1/calculators/percentage/sources?asOfDate=invalid"),
      context("percentage"),
    );
    expect(rulesResponse.status).toBe(422);
    expect(sourcesResponse.status).toBe(422);
  });

  it("rejects impossible calendar dates", async () => {
    const response = await getRules(
      new Request("https://example.test/api/v1/calculators/percentage/rules?asOfDate=2026-02-31"),
      context("percentage"),
    );
    expect(response.status).toBe(422);
    const yearZero = await getRules(
      new Request("https://example.test/api/v1/calculators/percentage/rules?asOfDate=0000-01-01"),
      context("percentage"),
    );
    expect(yearZero.status).toBe(422);
  });

  it("fails closed when regulated provenance is unavailable", async () => {
    const rulesResponse = await getRules(
      new Request("https://example.test/api/v1/calculators/salary/rules?asOfDate=1900-01-01"),
      context("salary"),
    );
    const sourcesResponse = await getSources(
      new Request("https://example.test/api/v1/calculators/salary/sources?asOfDate=1900-01-01"),
      context("salary"),
    );
    expect(rulesResponse.status).toBe(503);
    expect(sourcesResponse.status).toBe(503);
    await expect(rulesResponse.json()).resolves.toMatchObject({ error: { code: "RULE_UNAVAILABLE" } });
  });
});
