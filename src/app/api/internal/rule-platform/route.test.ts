import { afterEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/internal/rule-platform/route";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("POST /api/internal/rule-platform", () => {
  it("requires operator authentication", async () => {
    const response = await POST(new Request("https://example.test/api/internal/rule-platform", {
      method: "POST",
      body: JSON.stringify({ action: "ruleHistory", ruleVersionId: crypto.randomUUID() }),
    }));
    expect(response.status).toBe(401);
  });

  it("prevents reviewers from performing administrator actions", async () => {
    process.env.REVIEWER_API_TOKEN = "r".repeat(32);
    const response = await POST(new Request("https://example.test/api/internal/rule-platform", {
      method: "POST",
      headers: { authorization: `Bearer ${"r".repeat(32)}` },
      body: JSON.stringify({
        action: "createDefinition",
        key: "test-rule",
        calculatorKey: "percentage",
        scope: "default",
        name: "Test rule",
      }),
    }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  it("rejects oversized bodies before dispatch", async () => {
    process.env.ADMIN_API_TOKEN = "a".repeat(32);
    const response = await POST(new Request("https://example.test/api/internal/rule-platform", {
      method: "POST",
      headers: { authorization: `Bearer ${"a".repeat(32)}` },
      body: "x".repeat(16_385),
    }));
    expect(response.status).toBe(413);
  });

  it("rejects inverted effective ranges", async () => {
    process.env.ADMIN_API_TOKEN = "a".repeat(32);
    const response = await POST(new Request("https://example.test/api/internal/rule-platform", {
      method: "POST",
      headers: { authorization: `Bearer ${"a".repeat(32)}` },
      body: JSON.stringify({
        action: "createDraft",
        ruleDefinitionId: crypto.randomUUID(),
        version: "1.0.0",
        effectiveFrom: "2026-02-01",
        effectiveTo: "2026-01-31",
        payload: {},
        payloadSchemaVersion: "1",
      }),
    }));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("rejects source hosts outside the official allowlist", async () => {
    process.env.ADMIN_API_TOKEN = "a".repeat(32);
    const response = await POST(new Request("https://example.test/api/internal/rule-platform", {
      method: "POST",
      headers: { authorization: `Bearer ${"a".repeat(32)}` },
      body: JSON.stringify({
        action: "createSource",
        key: "untrusted-source",
        official: true,
        authority: "Untrusted",
        title: "Untrusted source",
        url: "https://example.test/source",
        retrievedAt: "2026-08-14T00:00:00.000Z",
        changeNote: "Must be rejected",
      }),
    }));
    expect(response.status).toBe(422);
  });

  it("rejects year zero source timestamps", async () => {
    process.env.ADMIN_API_TOKEN = "a".repeat(32);
    const response = await POST(new Request("https://example.test/api/internal/rule-platform", {
      method: "POST",
      headers: { authorization: `Bearer ${"a".repeat(32)}` },
      body: JSON.stringify({
        action: "createSource",
        key: "year-zero-source",
        official: true,
        authority: "Inland Revenue Department",
        title: "Invalid timestamp",
        url: "https://www.ird.gov.lk/en/",
        retrievedAt: "0000-01-01T00:00:00.000Z",
        changeNote: "Must be rejected",
      }),
    }));
    expect(response.status).toBe(422);
  });
});
