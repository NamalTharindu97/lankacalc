import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createGuide,
  listGuides,
  getGuide,
  createDraftVersion,
  listVersions,
  getVersion,
  getPublishedVersion,
  addNode,
  listNodes,
  addEdge,
  listEdges,
  addOutcome,
  listOutcomes,
  validateVersion,
  publishVersion,
  evaluateGuide,
  addContentSource,
  listContentSources,
  verifyContentSource,
  upsertTranslation,
  listTranslations,
  markTranslationsStale,
  addFixture,
  listFixtures,
  executeFixture,
  executeAllFixtures,
} from "./service";

const EMPTY_OUTCOME_FIELDS = {
  documents: [] as { name: string; required: boolean; note?: string }[],
  fees: [] as { name: string; amount: string }[],
  steps: [] as { order: number; text: string; url?: string }[],
  offices: [] as { name: string; address?: string; hours?: string }[],
  forms: [] as { name: string; url?: string }[],
  links: [] as { label: string; url: string }[],
};

describe.sequential("guide service", () => {
  it("creates a guide and retrieves it by key", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;

    const created = await createGuide({
      key,
      product: "govguide",
      name: "Test Guide",
      description: "A test guide for integration testing",
    });

    expect(created.key).toBe(key);
    expect(created.product).toBe("govguide");
    expect(created.status).toBe("draft");

    const found = await getGuide(key);
    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
  });

  it("lists guides ordered by key", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const keyA = `test-guide-a-${suffix}`;
    const keyB = `test-guide-b-${suffix}`;

    await createGuide({
      key: keyB,
      product: "govguide",
      name: "Guide B",
      description: "Second guide",
    });
    await createGuide({
      key: keyA,
      product: "govguide",
      name: "Guide A",
      description: "First guide",
    });

    const all = await listGuides();
    const keys = all.map((g) => g.key);
    const idxA = keys.indexOf(keyA);
    const idxB = keys.indexOf(keyB);
    expect(idxA).toBeGreaterThanOrEqual(0);
    expect(idxB).toBeGreaterThanOrEqual(0);
    expect(idxA).toBeLessThan(idxB);
  });

  it("lists guides filtered by product", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key1 = `test-guide-gov-${suffix}`;
    const key2 = `test-guide-deadline-${suffix}`;

    await createGuide({
      key: key1,
      product: "govguide",
      name: "Gov Guide",
      description: "Gov",
    });
    await createGuide({
      key: key2,
      product: "lankadeadline",
      name: "Deadline Guide",
      description: "Deadline",
    });

    const govGuides = await listGuides("govguide");
    expect(govGuides.every((g) => g.product === "govguide")).toBe(true);
    expect(govGuides.some((g) => g.key === key1)).toBe(true);
  });

  it("returns undefined for nonexistent guide", async () => {
    const found = await getGuide("nonexistent-guide-key");
    expect(found).toBeUndefined();
  });

  it("rejects guide creation with invalid key format", async () => {
    await expect(
      createGuide({
        key: "Invalid Key!",
        product: "govguide",
        name: "Bad",
        description: "Bad key",
      }),
    ).rejects.toThrow();
  });

  it("creates a draft version", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "Version Test",
      description: "Testing versions",
    });

    const version = await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });

    expect(version.version).toBe("1.0.0");
    expect(version.status).toBe("draft");
    expect(version.effectiveFrom).toBe("2026-01-01");
  });

  it("throws when creating version for nonexistent guide", async () => {
    await expect(
      createDraftVersion("nonexistent-guide", {
        version: "1.0.0",
        effectiveFrom: "2026-01-01",
      }),
    ).rejects.toThrow("not found");
  });

  it("lists versions for a guide", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "List Versions",
      description: "Testing list versions",
    });
    await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });
    await createDraftVersion(key, {
      version: "2.0.0",
      effectiveFrom: "2026-06-01",
    });

    const versions = await listVersions(key);
    expect(versions.length).toBeGreaterThanOrEqual(2);
  });

  it("gets a specific version", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "Get Version",
      description: "Testing get version",
    });
    await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });

    const v = await getVersion(key, "1.0.0");
    expect(v).toBeDefined();
    expect(v!.version).toBe("1.0.0");
    expect(v!.status).toBe("draft");
  });

  it("adds nodes, edges, and outcomes to a draft version", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "Tree Test",
      description: "Testing tree building",
    });
    await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });

    const n1 = await addNode(key, "1.0.0", {
      key: "service-type",
      type: "single-choice",
      question: "What service do you need?",
      sortOrder: 0,
    });
    expect(n1.key).toBe("service-type");

    const nodes = await listNodes(key, "1.0.0");
    expect(nodes).toHaveLength(1);
    expect(nodes[0].key).toBe("service-type");

    const o1 = await addOutcome(key, "1.0.0", {
      key: "passport",
      title: "Passport Application",
      documents: [{ name: "NIC", required: true }],
      fees: [],
      steps: [],
      offices: [],
      forms: [],
      links: [],
    });
    expect(o1.key).toBe("passport");

    const e1 = await addEdge(key, "1.0.0", {
      fromNodeId: n1.id,
      toOutcomeId: o1.id,
      condition: { answer: "passport" },
      sortOrder: 0,
    });
    expect(e1.fromNodeId).toBe(n1.id);
    expect(e1.toOutcomeId).toBe(o1.id);

    const edges = await listEdges(key, "1.0.0");
    expect(edges).toHaveLength(1);

    const outcomes = await listOutcomes(key, "1.0.0");
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].key).toBe("passport");
  });

  it("rejects adding nodes to a non-draft version", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "Non-Draft Test",
      description: "Testing non-draft rejection",
    });
    await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });

    const versionRow = await getVersion(key, "1.0.0");
    expect(versionRow).toBeDefined();
  });

  it("validates a valid graph", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "Validate Test",
      description: "Testing validation",
    });
    await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });

    const n1 = await addNode(key, "1.0.0", {
      key: "root",
      type: "single-choice",
      question: "Root question?",
      sortOrder: 0,
    });
    const o1 = await addOutcome(key, "1.0.0", {
      key: "result",
      title: "Result",
      ...EMPTY_OUTCOME_FIELDS,
    });
    await addEdge(key, "1.0.0", {
      fromNodeId: n1.id,
      toOutcomeId: o1.id,
      condition: { answer: "yes" },
      sortOrder: 0,
    });

    const result = await validateVersion(key, "1.0.0");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("validates a broken graph as invalid", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "Broken Graph Test",
      description: "Testing broken graph validation",
    });
    await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });

    const n1 = await addNode(key, "1.0.0", {
      key: "root",
      type: "single-choice",
      question: "Root?",
      sortOrder: 0,
    });
    await addNode(key, "1.0.0", {
      key: "disconnected",
      type: "single-choice",
      question: "Disconnected?",
      sortOrder: 1,
    });
    const o1 = await addOutcome(key, "1.0.0", {
      key: "result",
      title: "Result",
      ...EMPTY_OUTCOME_FIELDS,
    });
    await addEdge(key, "1.0.0", {
      fromNodeId: n1.id,
      toOutcomeId: o1.id,
      condition: { answer: "yes" },
      sortOrder: 0,
    });

    const result = await validateVersion(key, "1.0.0");
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((i) => i.message.includes("not reachable")),
    ).toBe(true);
  });

  it("publishes a valid version and retires previous", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "Publish Test",
      description: "Testing publish lifecycle",
    });

    await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });
    const n1 = await addNode(key, "1.0.0", {
      key: "root",
      type: "single-choice",
      question: "Root?",
      sortOrder: 0,
    });
    const o1 = await addOutcome(key, "1.0.0", {
      key: "result",
      title: "Result",
      ...EMPTY_OUTCOME_FIELDS,
    });
    await addEdge(key, "1.0.0", {
      fromNodeId: n1.id,
      toOutcomeId: o1.id,
      condition: { answer: "yes" },
      sortOrder: 0,
    });

    const published1 = await publishVersion(key, "1.0.0");
    expect(published1.status).toBe("published");
    expect(published1.publishedBy).toBe("dev-system");

    const guide1 = await getGuide(key);
    expect(guide1!.status).toBe("published");

    await createDraftVersion(key, {
      version: "2.0.0",
      effectiveFrom: "2026-06-01",
    });
    const n2 = await addNode(key, "2.0.0", {
      key: "root",
      type: "single-choice",
      question: "Root v2?",
      sortOrder: 0,
    });
    const o2 = await addOutcome(key, "2.0.0", {
      key: "result-v2",
      title: "Result V2",
      ...EMPTY_OUTCOME_FIELDS,
    });
    await addEdge(key, "2.0.0", {
      fromNodeId: n2.id,
      toOutcomeId: o2.id,
      condition: { answer: "yes" },
      sortOrder: 0,
    });

    const published2 = await publishVersion(key, "2.0.0");
    expect(published2.status).toBe("published");

    const v1 = await getVersion(key, "1.0.0");
    expect(v1!.status).toBe("retired");

    const published = await getPublishedVersion(key);
    expect(published!.version).toBe("2.0.0");
  }, 30_000);

  it("rejects publishing a version with invalid graph", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "Publish Invalid Test",
      description: "Testing publish rejection",
    });
    await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });

    await expect(publishVersion(key, "1.0.0")).rejects.toThrow(
      "Cannot publish",
    );
  });

  it("evaluates a guide with published version", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "Evaluate Test",
      description: "Testing evaluation",
    });
    await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });

    const n1 = await addNode(key, "1.0.0", {
      key: "service",
      type: "single-choice",
      question: "Which service?",
      sortOrder: 0,
    });
    const o1 = await addOutcome(key, "1.0.0", {
      key: "passport",
      title: "Passport",
      documents: [{ name: "NIC", required: true }],
      fees: [{ name: "Fee", amount: "5000" }],
      steps: [{ order: 1, text: "Visit office" }],
      offices: [],
      forms: [],
      links: [],
    });
    await addEdge(key, "1.0.0", {
      fromNodeId: n1.id,
      toOutcomeId: o1.id,
      condition: { answer: "passport" },
      sortOrder: 0,
    });

    await publishVersion(key, "1.0.0");

    const result = await evaluateGuide(key, { service: "passport" });
    expect(result).toMatchObject({
      resolved: true,
      key: "passport",
      title: "Passport",
    });
  });

  it("returns unresolved for guide without published version", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "Unpublished Test",
      description: "Testing unpublished evaluation",
    });

    const result = await evaluateGuide(key, {});
    expect(result).toMatchObject({
      resolved: false,
      title: "Unresolved",
      note: "No reviewed guide is available for this service.",
    });
  });

  it("rejects publishing a guide without a decision tree", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "No Tree Test",
      description: "Testing no tree evaluation",
    });
    await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });
    await expect(publishVersion(key, "1.0.0"))
      .rejects.toThrow("Cannot publish: Decision tree has no nodes.");
  });

  it("evaluates multi-step path correctly", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "Multi-Step Test",
      description: "Testing multi-step evaluation",
    });
    await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });

    const n1 = await addNode(key, "1.0.0", {
      key: "category",
      type: "single-choice",
      question: "Category?",
      sortOrder: 0,
    });
    const n2 = await addNode(key, "1.0.0", {
      key: "sub-type",
      type: "single-choice",
      question: "Sub type?",
      sortOrder: 1,
    });
    const o1 = await addOutcome(key, "1.0.0", {
      key: "nic-new",
      title: "New NIC",
      ...EMPTY_OUTCOME_FIELDS,
    });
    const o2 = await addOutcome(key, "1.0.0", {
      key: "nic-renew",
      title: "Renew NIC",
      ...EMPTY_OUTCOME_FIELDS,
    });

    await addEdge(key, "1.0.0", {
      fromNodeId: n1.id,
      toNodeId: n2.id,
      condition: { answer: "identity" },
      sortOrder: 0,
    });
    await addEdge(key, "1.0.0", {
      fromNodeId: n2.id,
      toOutcomeId: o1.id,
      condition: { answer: "new" },
      sortOrder: 0,
    });
    await addEdge(key, "1.0.0", {
      fromNodeId: n2.id,
      toOutcomeId: o2.id,
      condition: { answer: "renew" },
      sortOrder: 1,
    });

    await publishVersion(key, "1.0.0");

    const r1 = await evaluateGuide(key, {
      category: "identity",
      "sub-type": "new",
    });
    expect(r1).toMatchObject({ resolved: true, key: "nic-new" });

    const r2 = await evaluateGuide(key, {
      category: "identity",
      "sub-type": "renew",
    });
    expect(r2).toMatchObject({ resolved: true, key: "nic-renew" });
  }, 30_000);

  it("returns unresolved when answers don't match any path", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({
      key,
      product: "govguide",
      name: "No Match Test",
      description: "Testing no match",
    });
    await createDraftVersion(key, {
      version: "1.0.0",
      effectiveFrom: "2026-01-01",
    });

    const n1 = await addNode(key, "1.0.0", {
      key: "service",
      type: "single-choice",
      question: "Service?",
      sortOrder: 0,
    });
    const o1 = await addOutcome(key, "1.0.0", {
      key: "passport",
      title: "Passport",
      ...EMPTY_OUTCOME_FIELDS,
    });
    await addEdge(key, "1.0.0", {
      fromNodeId: n1.id,
      toOutcomeId: o1.id,
      condition: { answer: "passport" },
      sortOrder: 0,
    });

    await publishVersion(key, "1.0.0");

    const result = await evaluateGuide(key, { service: "licence" });
    expect(result).toMatchObject({ resolved: false, title: "Unresolved" });
  });
});

describe.sequential("content sources", () => {
  it("adds and lists sources for a draft version", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({ key, product: "govguide", name: "Src Test", description: "..." });
    await createDraftVersion(key, { version: "1.0.0", effectiveFrom: "2026-01-01" });

    const src = await addContentSource(key, "1.0.0", {
      key: "gazette-2024",
      authority: "Govt Printer",
      title: "Extraordinary Gazette 2024/001",
      url: "https://example.com/gazette",
      publishedOn: "2024-03-15",
    });
    expect(src.key).toBe("gazette-2024");
    expect(src.authority).toBe("Govt Printer");

    const list = await listContentSources(key, "1.0.0");
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(src.id);
  });

  it("rejects source on non-draft version", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({ key, product: "govguide", name: "Src Reject", description: "..." });
    await createDraftVersion(key, { version: "1.0.0", effectiveFrom: "2026-01-01" });
    const n1 = await addNode(key, "1.0.0", { key: "root", type: "single-choice", question: "Q?", sortOrder: 0 });
    const o1 = await addOutcome(key, "1.0.0", { key: "res", title: "Res", ...EMPTY_OUTCOME_FIELDS });
    await addEdge(key, "1.0.0", { fromNodeId: n1.id, toOutcomeId: o1.id, condition: { answer: "y" }, sortOrder: 0 });
    await publishVersion(key, "1.0.0");

    await expect(
      addContentSource(key, "1.0.0", {
        key: "bad",
        authority: "X",
        title: "X",
        url: "https://example.com",
      }),
    ).rejects.toThrow("non-draft");
  });

  it("verifies a source", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({ key, product: "govguide", name: "Verify Src", description: "..." });
    await createDraftVersion(key, { version: "1.0.0", effectiveFrom: "2026-01-01" });

    const src = await addContentSource(key, "1.0.0", {
      key: "doc-1",
      authority: "Auth",
      title: "Doc 1",
      url: "https://example.com/doc1",
    });
    expect(src.verifiedAt).toBeNull();

    const verified = await verifyContentSource(src.id, new Date());
    expect(verified.verifiedAt).toBeInstanceOf(Date);
  });

  it("rejects invalid source input", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({ key, product: "govguide", name: "Src Invalid", description: "..." });
    await createDraftVersion(key, { version: "1.0.0", effectiveFrom: "2026-01-01" });

    await expect(
      addContentSource(key, "1.0.0", {
        key: "Invalid Key!",
        authority: "",
        title: "",
        url: "not-a-url",
      }),
    ).rejects.toThrow();
  });
});

describe.sequential("translations", () => {
  it("creates and retrieves translations", async () => {
    const entityId = randomUUID();

    const t = await upsertTranslation({
      entityType: "guide",
      entityId,
      locale: "si",
      field: "title",
      value: "සේවා මාර්ගෝපදේශය",
    });
    expect(t.locale).toBe("si");
    expect(t.value).toBe("සේවා මාර්ගෝපදේශය");
    expect(t.status).toBe("draft");

    const all = await listTranslations("guide", entityId);
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(t.id);
  });

  it("upserts existing translation", async () => {
    const entityId = randomUUID();

    await upsertTranslation({
      entityType: "guide",
      entityId,
      locale: "ta",
      field: "title",
      value: "Original",
    });

    const updated = await upsertTranslation({
      entityType: "guide",
      entityId,
      locale: "ta",
      field: "title",
      value: "Updated",
      status: "reviewed",
    });
    expect(updated.value).toBe("Updated");
    expect(updated.status).toBe("reviewed");

    const all = await listTranslations("guide", entityId);
    expect(all).toHaveLength(1);
  });

  it("filters translations by locale", async () => {
    const entityId = randomUUID();

    await upsertTranslation({ entityType: "node", entityId, locale: "si", field: "q", value: "Sinhala" });
    await upsertTranslation({ entityType: "node", entityId, locale: "ta", field: "q", value: "Tamil" });

    const siOnly = await listTranslations("node", entityId, "si");
    expect(siOnly).toHaveLength(1);
    expect(siOnly[0].locale).toBe("si");
  });

  it("marks translations stale", async () => {
    const entityId = randomUUID();

    await upsertTranslation({ entityType: "outcome", entityId, locale: "si", field: "note", value: "Note" });
    await upsertTranslation({ entityType: "outcome", entityId, locale: "ta", field: "note", value: "Note TA" });

    const count = await markTranslationsStale("outcome", entityId);
    expect(count).toBe(2);

    const all = await listTranslations("outcome", entityId);
    expect(all.every((t) => t.status === "stale")).toBe(true);
  });

  it("does not re-stale already stale translations", async () => {
    const entityId = randomUUID();

    await upsertTranslation({ entityType: "guide", entityId, locale: "si", field: "desc", value: "D" });
    await markTranslationsStale("guide", entityId);
    const count = await markTranslationsStale("guide", entityId);
    expect(count).toBe(0);
  });
});

describe.sequential("validation fixtures", () => {
  it("adds and lists fixtures for a version", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({ key, product: "govguide", name: "Fix Test", description: "..." });
    await createDraftVersion(key, { version: "1.0.0", effectiveFrom: "2026-01-01" });

    const f = await addFixture(key, "1.0.0", {
      name: "Passport path",
      answers: { service: "passport" },
      expectedOutcome: "passport",
    });
    expect(f.name).toBe("Passport path");
    expect(f.passed).toBeNull();

    const list = await listFixtures(key, "1.0.0");
    expect(list).toHaveLength(1);
  });

  it("executes a fixture against the decision engine", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({ key, product: "govguide", name: "Exec Fix", description: "..." });
    await createDraftVersion(key, { version: "1.0.0", effectiveFrom: "2026-01-01" });

    const n1 = await addNode(key, "1.0.0", { key: "svc", type: "single-choice", question: "Svc?", sortOrder: 0 });
    const o1 = await addOutcome(key, "1.0.0", { key: "passport", title: "Passport", ...EMPTY_OUTCOME_FIELDS });
    await addEdge(key, "1.0.0", { fromNodeId: n1.id, toOutcomeId: o1.id, condition: { answer: "passport" }, sortOrder: 0 });

    const f = await addFixture(key, "1.0.0", {
      name: "Match",
      answers: { svc: "passport" },
      expectedOutcome: "passport",
    });

    const result = await executeFixture(f.id);
    expect(result.passed).toBe(true);
    expect(result.executedAt).toBeInstanceOf(Date);
  });

  it("records failure when fixture expectation mismatches", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({ key, product: "govguide", name: "Fail Fix", description: "..." });
    await createDraftVersion(key, { version: "1.0.0", effectiveFrom: "2026-01-01" });

    const n1 = await addNode(key, "1.0.0", { key: "svc", type: "single-choice", question: "Svc?", sortOrder: 0 });
    const o1 = await addOutcome(key, "1.0.0", { key: "passport", title: "Passport", ...EMPTY_OUTCOME_FIELDS });
    await addEdge(key, "1.0.0", { fromNodeId: n1.id, toOutcomeId: o1.id, condition: { answer: "passport" }, sortOrder: 0 });

    const f = await addFixture(key, "1.0.0", {
      name: "Wrong expected",
      answers: { svc: "passport" },
      expectedOutcome: "licence",
    });

    const result = await executeFixture(f.id);
    expect(result.passed).toBe(false);
  });

  it("executes all fixtures and returns summary", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
    const key = `test-guide-${suffix}`;
    await createGuide({ key, product: "govguide", name: "ExecAll", description: "..." });
    await createDraftVersion(key, { version: "1.0.0", effectiveFrom: "2026-01-01" });

    const n1 = await addNode(key, "1.0.0", { key: "svc", type: "single-choice", question: "Svc?", sortOrder: 0 });
    const o1 = await addOutcome(key, "1.0.0", { key: "passport", title: "Passport", ...EMPTY_OUTCOME_FIELDS });
    await addEdge(key, "1.0.0", { fromNodeId: n1.id, toOutcomeId: o1.id, condition: { answer: "passport" }, sortOrder: 0 });

    await addFixture(key, "1.0.0", { name: "Pass", answers: { svc: "passport" }, expectedOutcome: "passport" });
    await addFixture(key, "1.0.0", { name: "Fail", answers: { svc: "passport" }, expectedOutcome: "licence" });

    const summary = await executeAllFixtures(key, "1.0.0");
    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
  });

  it("rejects fixture on nonexistent version", async () => {
    await expect(
      addFixture("nonexistent", "1.0.0", {
        name: "Bad",
        answers: {},
        expectedOutcome: "x",
      }),
    ).rejects.toThrow("not found");
  });
});
