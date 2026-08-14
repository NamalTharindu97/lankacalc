import { createHash, randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { getDatabase } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import type { JsonValue } from "@/server/rules/json";
import { RulePlatform, type RuleHandler } from "@/server/rules/service";
import {
  checkSourceLink,
  createSource,
  listSourcesForCalculator,
  reviseSource,
  verifySource,
} from "@/server/sources/service";

function record(value: JsonValue): Record<string, JsonValue> {
  if (value === null || Array.isArray(value) || typeof value !== "object") throw new Error("Expected an object");
  return value;
}

const handler: RuleHandler = {
  payloadSchemaVersion: "1",
  validatePayload(payload) {
    const values = record(payload);
    if (typeof values.rate !== "number") throw new Error("rate is required");
  },
  calculate(input, payload) {
    const inputValues = record(input);
    const payloadValues = record(payload);
    if (typeof inputValues.amount !== "number" || typeof payloadValues.rate !== "number") {
      throw new Error("Invalid fixture");
    }
    return { contribution: inputValues.amount * payloadValues.rate };
  },
};

describe.sequential("rule and source platform", () => {
  it("publishes verified rules, resolves history, blocks overlap, and corrects by new version", async () => {
    const database = getDatabase();
    const suffix = randomUUID().replaceAll("-", "");
    const ruleKey = `test-rule-${suffix}`;
    const platform = new RulePlatform(database, { [ruleKey]: handler });
    const expectedSourceBody = "official source revision one";
    const sourceHash = createHash("sha256").update(expectedSourceBody).digest("hex");

    const { source, revision } = await createSource(database, {
      key: `test-source-${suffix}`,
      authority: "Test Authority",
      title: "Official test publication",
      url: `https://example.test/${suffix}`,
      official: true,
      publishedOn: "2025-01-01",
      retrievedAt: new Date("2025-01-02T00:00:00.000Z"),
      contentHash: sourceHash,
      changeNote: "Initial verified revision",
    }, "test-admin");
    expect(revision.revision).toBe(1);

    const resolvePublicHost = async () => ["93.184.216.34"];
    const allowedTestHosts = new Set(["example.test"]);
    const healthyCheck = await checkSourceLink(database, source.id, async () => new Response(expectedSourceBody, { status: 200 }), resolvePublicHost, allowedTestHosts);
    expect(healthyCheck.status).toBe("healthy");
    await verifySource(database, source.id, "verified", "Matched the issuing authority publication.", "test-reviewer");
    const changedCheck = await checkSourceLink(database, source.id, async () => new Response("changed body", { status: 200 }), resolvePublicHost, allowedTestHosts);
    expect(changedCheck.status).toBe("changed");

    const definition = await platform.createDefinition({
      key: ruleKey,
      calculatorKey: "percentage",
      scope: "default",
      name: "Integration test rule",
    }, "test-admin");
    await expect(database.insert(schema.ruleVersions).values({
      ruleDefinitionId: definition.id,
      version: "invalid-direct-publication",
      status: "published",
      effectiveFrom: "2030-01-01",
      payload: { rate: 0.08 },
      payloadSchemaVersion: "1",
      checksum: "0".repeat(64),
      author: "bypass-attempt",
    })).rejects.toThrow();
    const first = await platform.createDraft({
      ruleDefinitionId: definition.id,
      version: "1.0.0",
      effectiveFrom: "2025-01-01",
      payload: { rate: 0.08 },
      payloadSchemaVersion: "1",
    }, "test-admin");
    await platform.addFixture(first.id, {
      name: "basic contribution",
      input: { amount: 1_000 },
      expectedResult: { contribution: 80 },
    });
    await expect(platform.runFixtures(first.id)).resolves.toMatchObject([{ passed: true }]);
    await expect(platform.review(first.id, "test-reviewer", "Attempt without evidence."))
      .rejects.toThrow("VERIFIED_OFFICIAL_SOURCE_REQUIRED");
    await expect(platform.attachSource(first.id, source.id)).rejects.toThrow("VERIFIED_SOURCE_REVISION_REQUIRED");
    await checkSourceLink(database, source.id, async () => new Response(expectedSourceBody, { status: 200 }), resolvePublicHost, allowedTestHosts);
    await verifySource(database, source.id, "verified", "Changed-link alert resolved.", "test-reviewer");
    await platform.attachSource(first.id, source.id, "Primary official source");
    await platform.review(first.id, "test-reviewer", "Fixture and source reviewed.");
    await expect(platform.addFixture(first.id, {
      name: "late fixture",
      input: { amount: 1 },
      expectedResult: { contribution: 0.08 },
    })).rejects.toThrow("REVIEWED_RULE_IMMUTABLE");
    const published = await platform.publish(first.id, "test-admin", "Approved for use.", "2025-01-01");
    expect(published.status).toBe("published");
    await expect(platform.resolve(definition.id, "2025-05-01")).resolves.toMatchObject({ version: "1.0.0" });
    await expect(platform.updateDraft(first.id, {
      version: "1.0.0",
      effectiveFrom: "2025-01-01",
      payload: { rate: 0.09 },
      payloadSchemaVersion: "1",
    })).rejects.toThrow("PUBLISHED_RULE_IMMUTABLE");
    await expect(database.update(schema.ruleVersions).set({ payload: { rate: 0.09 } })
      .where(eq(schema.ruleVersions.id, first.id))).rejects.toThrow();

    const correction = await platform.createDraft({
      ruleDefinitionId: definition.id,
      version: "1.0.1",
      effectiveFrom: "2025-06-01",
      payload: { rate: 0.09 },
      payloadSchemaVersion: "1",
    }, "test-admin");
    await platform.attachSource(correction.id, source.id);
    await platform.addFixture(correction.id, {
      name: "corrected contribution",
      input: { amount: 1_000 },
      expectedResult: { contribution: 90 },
    });
    await platform.runFixtures(correction.id);
    await expect(platform.compareWithActive(correction.id, "2025-07-01")).resolves.toMatchObject({
      activeVersion: "1.0.0",
      resultComparisons: [{
        fixture: "corrected contribution",
        differences: [{ path: "$.contribution", expected: 80, actual: 90 }],
      }],
    });
    await platform.review(correction.id, "test-reviewer", "Correction reviewed.");
    await expect(platform.publish(correction.id, "test-admin", "Correction publication.", "2025-01-01"))
      .rejects.toThrow();

    await expect(platform.publish(correction.id, "test-admin", "Correction publication.", "2025-06-01", first.id))
      .resolves.toMatchObject({ status: "published" });
    await expect(platform.resolve(definition.id, "2025-05-01")).resolves.toMatchObject({ version: "1.0.0" });
    await expect(platform.resolve(definition.id, "2025-07-01")).resolves.toMatchObject({ version: "1.0.1" });
    await expect(platform.getHistory(correction.id)).resolves.toMatchObject({
      events: [{ type: "reviewed" }, { type: "published" }],
      fixtures: [{ passed: true }],
    });

    const historicalOverlap = await platform.createDraft({
      ruleDefinitionId: definition.id,
      version: "historical-overlap",
      effectiveFrom: "2025-03-01",
      effectiveTo: "2025-05-31",
      payload: { rate: 0.085 },
      payloadSchemaVersion: "1",
    }, "test-admin");
    await platform.attachSource(historicalOverlap.id, source.id);
    await platform.addFixture(historicalOverlap.id, {
      name: "historical overlap fixture",
      input: { amount: 1_000 },
      expectedResult: { contribution: 85 },
    });
    await platform.runFixtures(historicalOverlap.id);
    await platform.review(historicalOverlap.id, "test-reviewer", "Historical overlap reviewed for rejection.");
    await expect(platform.publish(historicalOverlap.id, "test-admin", "Must overlap retired history.", "2025-03-01"))
      .rejects.toThrow();

    const scheduledDefinition = await platform.createDefinition({
      key: `scheduled-${ruleKey}`,
      calculatorKey: "percentage",
      scope: "default",
      name: "Scheduled integration rule",
    }, "test-admin");
    const scheduledPlatform = new RulePlatform(database, { [`scheduled-${ruleKey}`]: handler });
    const scheduled = await scheduledPlatform.createDraft({
      ruleDefinitionId: scheduledDefinition.id,
      version: "1.0.0",
      effectiveFrom: "2027-01-01",
      payload: { rate: 0.1 },
      payloadSchemaVersion: "1",
    }, "test-admin");
    await expect(database.update(schema.ruleVersionSources).set({ ruleVersionId: scheduled.id })
      .where(eq(schema.ruleVersionSources.ruleVersionId, correction.id))).rejects.toThrow();
    await scheduledPlatform.attachSource(scheduled.id, source.id);
    await scheduledPlatform.addFixture(scheduled.id, {
      name: "scheduled fixture",
      input: { amount: 1_000 },
      expectedResult: { contribution: 100 },
    });
    await scheduledPlatform.runFixtures(scheduled.id);
    await scheduledPlatform.review(scheduled.id, "test-reviewer", "Future rule reviewed.");
    await expect(scheduledPlatform.publish(scheduled.id, "test-admin", "Schedule future rule.", "2026-08-14"))
      .resolves.toMatchObject({ status: "scheduled", publishedAt: null });
    await expect(scheduledPlatform.resolve(scheduledDefinition.id, "2027-01-01")).resolves.toBeNull();
    await checkSourceLink(database, source.id, async () => new Response(expectedSourceBody), resolvePublicHost, allowedTestHosts);
    await verifySource(database, source.id, "verified", "Scheduled rule evidence refreshed.", "test-reviewer");
    const earlyPromotions = await scheduledPlatform.promoteScheduled("2026-12-31", "test-scheduler");
    expect(earlyPromotions.promoted.some((item) => item.id === scheduled.id)).toBe(false);
    const effectivePromotions = await scheduledPlatform.promoteScheduled("2027-01-01", "test-scheduler");
    expect(effectivePromotions.promoted).toContainEqual(expect.objectContaining({ id: scheduled.id, status: "published" }));
    await expect(scheduledPlatform.getHistory(scheduled.id)).resolves.toMatchObject({
      events: [{ type: "reviewed" }, { type: "scheduled" }, { type: "published" }],
    });

    const originalUrl = source.url;
    await reviseSource(database, source.id, {
      authority: "Test Authority",
      title: "Amended official publication",
      url: `${source.url}/amended`,
      publishedOn: "2025-02-01",
      retrievedAt: new Date("2025-02-02T00:00:00.000Z"),
      contentHash: createHash("sha256").update("amended").digest("hex"),
      changeNote: "Official amendment",
    }, "test-admin");
    const historicalSources = await listSourcesForCalculator(database, "percentage", "2025-05-01");
    expect(historicalSources.some((item) => item.url === originalUrl && item.title === "Official test publication")).toBe(true);
    await expect(platform.getDashboard()).resolves.toMatchObject({
      sources: expect.arrayContaining([expect.objectContaining({ id: source.id, revision: 2 })]),
      definitions: expect.arrayContaining([expect.objectContaining({ id: definition.id })]),
      versions: expect.arrayContaining([expect.objectContaining({ id: correction.id, ruleName: "Integration test rule", status: "published" })]),
      totals: expect.objectContaining({ sources: expect.any(Number), definitions: expect.any(Number), published: expect.any(Number) }),
    });
  }, 30_000);

  it("blocks publication when a fixture fails", async () => {
    const database = getDatabase();
    const suffix = randomUUID().replaceAll("-", "");
    const ruleKey = `failing-rule-${suffix}`;
    const platform = new RulePlatform(database, { [ruleKey]: handler });
    const { source } = await createSource(database, {
      key: `failing-source-${suffix}`,
      authority: "Test Authority",
      title: "Official test publication",
      url: `https://example.test/failing-${suffix}`,
      official: true,
      retrievedAt: new Date(),
      changeNote: "Initial revision",
    }, "test-admin");
    await checkSourceLink(database, source.id, async () => new Response("official"), async () => ["93.184.216.34"], new Set(["example.test"]));
    await verifySource(database, source.id, "verified", "Source checked.", "test-reviewer");
    const definition = await platform.createDefinition({
      key: ruleKey,
      calculatorKey: "percentage",
      scope: "default",
      name: "Failing fixture rule",
    }, "test-admin");
    const draft = await platform.createDraft({
      ruleDefinitionId: definition.id,
      version: "1.0.0",
      effectiveFrom: "2025-01-01",
      payload: { rate: 0.08 },
      payloadSchemaVersion: "1",
    }, "test-admin");
    await platform.attachSource(draft.id, source.id);
    await platform.addFixture(draft.id, {
      name: "incorrect expectation",
      input: { amount: 1_000 },
      expectedResult: { contribution: 81 },
    });
    await expect(platform.runFixtures(draft.id)).resolves.toMatchObject([{ passed: false }]);
    await database.update(schema.ruleVersions).set({
      status: "reviewed",
      reviewer: "test-reviewer",
      reviewedAt: new Date(),
    }).where(eq(schema.ruleVersions.id, draft.id));
    await expect(platform.publish(draft.id, "test-admin", "Must fail.", "2025-01-01"))
      .rejects.toThrow("PASSING_FIXTURES_REQUIRED");
  }, 30_000);

  it("rejects source redirects to private networks", async () => {
    const database = getDatabase();
    const suffix = randomUUID().replaceAll("-", "");
    const { source } = await createSource(database, {
      key: `unsafe-source-${suffix}`,
      authority: "Test Authority",
      title: "Redirect test",
      url: `https://example.test/redirect-${suffix}`,
      official: true,
      retrievedAt: new Date(),
      changeNote: "Initial revision",
    }, "test-admin");
    const result = await checkSourceLink(database, source.id, async () => new Response(null, {
      status: 302,
      headers: { location: "https://127.0.0.1/internal" },
    }), async () => ["93.184.216.34"], new Set(["example.test"]));
    expect(result.status).toBe("error");
    expect(result.detail).toBe("UNSAFE_SOURCE_URL");
  }, 30_000);

  it("blocks direct publication after source verification is rejected", async () => {
    const database = getDatabase();
    const suffix = randomUUID().replaceAll("-", "");
    const ruleKey = `stale-evidence-${suffix}`;
    const platform = new RulePlatform(database, { [ruleKey]: handler });
    const { source } = await createSource(database, {
      key: `stale-source-${suffix}`,
      authority: "Test Authority",
      title: "Stale evidence test",
      url: `https://example.test/stale-${suffix}`,
      official: true,
      retrievedAt: new Date(),
      changeNote: "Initial revision",
    }, "test-admin");
    await checkSourceLink(database, source.id, async () => new Response("official"), async () => ["93.184.216.34"], new Set(["example.test"]));
    await verifySource(database, source.id, "verified", "Initial verification.", "test-reviewer");
    const definition = await platform.createDefinition({
      key: ruleKey,
      calculatorKey: "percentage",
      scope: "default",
      name: "Stale evidence rule",
    }, "test-admin");
    const draft = await platform.createDraft({
      ruleDefinitionId: definition.id,
      version: "1.0.0",
      effectiveFrom: "2025-01-01",
      payload: { rate: 0.08 },
      payloadSchemaVersion: "1",
    }, "test-admin");
    await platform.attachSource(draft.id, source.id);
    await platform.addFixture(draft.id, {
      name: "passing fixture",
      input: { amount: 1_000 },
      expectedResult: { contribution: 80 },
    });
    await platform.runFixtures(draft.id);
    await platform.review(draft.id, "test-reviewer", "Reviewed before rejection.");
    await expect(platform.publish(draft.id, "test-admin", "Schedule before evidence rejection.", "2024-01-01"))
      .resolves.toMatchObject({ status: "scheduled" });
    await verifySource(database, source.id, "rejected", "Publication was withdrawn.", "test-reviewer");
    const stalePromotions = await platform.promoteScheduled("2025-01-01", "test-scheduler");
    expect(stalePromotions.blocked).toContainEqual({ id: draft.id, code: "VERIFIED_OFFICIAL_SOURCE_REQUIRED" });
    await expect(database.update(schema.ruleVersions).set({
      status: "published",
      publishedAt: new Date(),
    }).where(eq(schema.ruleVersions.id, draft.id))).rejects.toThrow();
    await platform.retire(draft.id, "2025-02-01", "test-admin", "Cancel invalid scheduled rule.");
    await expect(platform.resolve(definition.id, "2025-01-15")).resolves.toBeNull();
  }, 30_000);
});
