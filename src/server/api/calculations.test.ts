import { describe, expect, it } from "vitest";

import { executeCalculationRequest } from "@/server/api/calculations";

describe("calculation API contract", () => {
  it("returns a versioned calculation response", () => {
    const response = executeCalculationRequest("percentage", {
      percentage: "20",
      value: "250",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      calculator: "percentage",
      calculationVersion: "2.0.0",
      result: { percentageValue: "50" },
      ruleVersions: [],
      sources: [],
    });
  });

  it("returns field-level validation errors", () => {
    const response = executeCalculationRequest("fuel-consumption", {
      distance: 0,
      distanceUnit: "kilometre",
      fuelVolume: 0,
      volumeUnit: "litre",
    });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        issues: expect.arrayContaining([
          expect.objectContaining({ path: "distance" }),
          expect.objectContaining({ path: "fuelVolume" }),
        ]),
      },
    });
  });

  it.each([
    { percentage: "", value: "250" },
    { percentage: true, value: 250 },
    { percentage: 10, value: [250] },
    { percentage: null, value: 250 },
  ])("does not coerce malformed JSON values: %j", (payload) => {
    const response = executeCalculationRequest("percentage", payload);

    expect(response.status).toBe(422);
  });

  it("returns a stable not-found error", () => {
    const response = executeCalculationRequest("missing-calculator", {});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "CALCULATOR_NOT_FOUND",
        message: "Calculator 'missing-calculator' was not found.",
      },
    });
  });
});
