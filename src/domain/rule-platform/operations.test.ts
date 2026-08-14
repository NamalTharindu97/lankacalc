import { describe, expect, it } from "vitest";

import { buildOperationRequest, rulePlatformOperations } from "@/domain/rule-platform/operations";

describe("rule platform operation forms", () => {
  it("converts structured form values into API requests", () => {
    const operation = rulePlatformOperations.find((item) => item.action === "createDraft")!;
    expect(buildOperationRequest(operation, {
      ruleDefinitionId: "c4fbaaa0-8258-4b76-81aa-de7f3c6dcb55",
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
      effectiveTo: "",
      payloadSchemaVersion: "1",
      payload: '{"rate":0.08}',
    })).toEqual({
      action: "createDraft",
      ruleDefinitionId: "c4fbaaa0-8258-4b76-81aa-de7f3c6dcb55",
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
      payloadSchemaVersion: "1",
      payload: { rate: 0.08 },
    });
  });

  it("rejects invalid JSON before sending a request", () => {
    const operation = rulePlatformOperations.find((item) => item.action === "addFixture")!;
    expect(() => buildOperationRequest(operation, {
      ruleVersionId: "c4fbaaa0-8258-4b76-81aa-de7f3c6dcb55",
      name: "Boundary",
      input: "{",
      expectedResult: "{}",
    })).toThrow("Input (JSON) must contain valid JSON");
  });
});
