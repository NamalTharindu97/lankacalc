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

  it("lets reviewers load dashboard summaries with their operator identity", async () => {
    process.env.REVIEWER_API_TOKEN = "r".repeat(32);
    process.env.REVIEWER_ACTOR = "test-reviewer";
    const response = await POST(new Request("https://example.test/api/internal/rule-platform", {
      method: "POST",
      headers: { authorization: `Bearer ${"r".repeat(32)}` },
      body: JSON.stringify({ action: "dashboard" }),
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      data: {
        operator: { name: "test-reviewer", role: "reviewer" },
        sources: expect.any(Array),
        definitions: expect.any(Array),
        versions: expect.any(Array),
        operations: {
          generatedAt: expect.any(String),
          thresholdsSeconds: { reminderStaleClaim: 1800, reportStuck: 900 },
          reminders: {
            deliveries: { pending: expect.any(Number), claimed: expect.any(Number), failed: expect.any(Number) },
            overduePending: { count: expect.any(Number) },
            staleClaimed: { count: expect.any(Number) },
          },
          reports: {
            jobs: { queued: expect.any(Number), generating: expect.any(Number), failed: expect.any(Number) },
            stuckQueued: { count: expect.any(Number) },
            stuckGenerating: { count: expect.any(Number) },
          },
        },
      },
    });

    const operations = body.data.operations as Record<string, unknown>;
    const prohibitedKeys = new Set([
      "id", "userId", "email", "title", "note", "actionUrl", "snapshot", "pdf",
      "errorMessage", "detail", "fileName", "savedCalculationId", "reminderId", "deliveryId",
    ]);
    function visit(value: unknown): void {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        expect(prohibitedKeys.has(key)).toBe(false);
        visit(child);
      }
    }
    visit(operations);
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
