import { eq, and, desc, asc, ne } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/server/db/client";
import {
  guides,
  guideVersions,
  decisionTrees,
  decisionNodes,
  decisionEdges,
  decisionOutcomes,
  contentSources,
  contentTranslations,
  guideValidationFixtures,
} from "@/server/db/schema";
import { evaluateDecisionTree } from "./decision-engine";
import { validateDecisionGraph } from "./validator";
import type {
  ContentSourceRow,
  DecisionCondition,
  DecisionEdgeRow,
  DecisionNodeRow,
  DecisionOutcomeRow,
  DecisionTreeRow,
  EscalationLevel,
  EvaluationResult,
  GuideDocument,
  GuideFee,
  GuideForm,
  GuideLink,
  GuideOffice,
  GuideRow,
  GuideStep,
  GuideValidationFixtureRow,
  GuideVersionRow,
  TranslationRow,
  ValidationResult,
} from "./types";

const DEV_ACTOR = "dev-system";

/* eslint-disable @typescript-eslint/no-explicit-any */
function castEdgeRow(row: any): DecisionEdgeRow {
  return {
    ...row,
    condition: row.condition as DecisionCondition,
  };
}

function castOutcomeRow(row: any): DecisionOutcomeRow {
  return {
    ...row,
    documents: row.documents as GuideDocument[],
    fees: row.fees as GuideFee[],
    steps: row.steps as GuideStep[],
    offices: row.offices as GuideOffice[],
    forms: row.forms as GuideForm[],
    links: row.links as GuideLink[],
    escalation: row.escalation as EscalationLevel[] | undefined,
  };
}

function castFixtureRow(row: any): GuideValidationFixtureRow {
  return {
    ...row,
    answers: row.answers as Record<string, string | string[]>,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const guideInputSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  product: z.string().min(1).max(40),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
});

const guideVersionInputSchema = z.object({
  version: z.string().min(1).max(40),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const nodeInputSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  type: z.enum(["single-choice", "multi-choice", "text", "date"]),
  question: z.string().min(1).max(1000),
  sortOrder: z.number().int().min(0),
});

const edgeInputSchema = z.object({
  fromNodeId: z.string().uuid(),
  toNodeId: z.string().uuid().optional(),
  toOutcomeId: z.string().uuid().optional(),
  condition: z.object({
    answer: z.string().optional(),
    answers: z.array(z.string()).optional(),
  }),
  sortOrder: z.number().int().min(0),
});

const outcomeInputSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(500),
  documents: z
    .array(
      z.object({
        name: z.string(),
        required: z.boolean(),
        note: z.string().optional(),
      }),
    )
    .default([]),
  fees: z
    .array(z.object({ name: z.string(), amount: z.string() }))
    .default([]),
  steps: z
    .array(
      z.object({
        order: z.number(),
        text: z.string(),
        url: z.string().optional(),
      }),
    )
    .default([]),
  offices: z
    .array(
      z.object({
        name: z.string(),
        address: z.string().optional(),
        hours: z.string().optional(),
      }),
    )
    .default([]),
  forms: z
    .array(z.object({ name: z.string(), url: z.string().optional() }))
    .default([]),
  links: z
    .array(z.object({ label: z.string(), url: z.string() }))
    .default([]),
  escalation: z
    .array(
      z.object({
        level: z.number(),
        authority: z.string(),
        procedure: z.string(),
      }),
    )
    .optional(),
  note: z.string().optional(),
});

export async function createGuide(input: z.infer<typeof guideInputSchema>): Promise<GuideRow> {
  const parsed = guideInputSchema.parse(input);
  const db = getDatabase();
  const [row] = await db.insert(guides).values(parsed).returning();
  return row;
}

export async function listGuides(product?: string): Promise<GuideRow[]> {
  const db = getDatabase();
  if (product) {
    return db.select().from(guides).where(eq(guides.product, product)).orderBy(asc(guides.key));
  }
  return db.select().from(guides).orderBy(asc(guides.key));
}

export async function getGuide(key: string): Promise<GuideRow | undefined> {
  const db = getDatabase();
  const [row] = await db.select().from(guides).where(eq(guides.key, key)).limit(1);
  return row;
}

export async function createDraftVersion(
  guideKey: string,
  input: z.infer<typeof guideVersionInputSchema>,
): Promise<GuideVersionRow> {
  const parsed = guideVersionInputSchema.parse(input);
  const guide = await getGuide(guideKey);
  if (!guide) {
    throw new Error(`Guide '${guideKey}' not found.`);
  }

  const db = getDatabase();
  const [row] = await db
    .insert(guideVersions)
    .values({
      guideId: guide.id,
      version: parsed.version,
      effectiveFrom: parsed.effectiveFrom,
      createdBy: DEV_ACTOR,
    })
    .returning();
  return row;
}

export async function listVersions(guideKey: string): Promise<GuideVersionRow[]> {
  const guide = await getGuide(guideKey);
  if (!guide) {
    throw new Error(`Guide '${guideKey}' not found.`);
  }
  const db = getDatabase();
  return db
    .select()
    .from(guideVersions)
    .where(eq(guideVersions.guideId, guide.id))
    .orderBy(desc(guideVersions.createdAt));
}

export async function getVersion(guideKey: string, version: string): Promise<GuideVersionRow | undefined> {
  const guide = await getGuide(guideKey);
  if (!guide) {
    throw new Error(`Guide '${guideKey}' not found.`);
  }
  const db = getDatabase();
  const [row] = await db
    .select()
    .from(guideVersions)
    .where(and(eq(guideVersions.guideId, guide.id), eq(guideVersions.version, version)))
    .limit(1);
  return row;
}

export async function getPublishedVersion(guideKey: string): Promise<GuideVersionRow | undefined> {
  const guide = await getGuide(guideKey);
  if (!guide) {
    return undefined;
  }
  const db = getDatabase();
  const [row] = await db
    .select()
    .from(guideVersions)
    .where(and(eq(guideVersions.guideId, guide.id), eq(guideVersions.status, "published")))
    .limit(1);
  return row;
}

async function getTreeForVersion(versionId: string): Promise<DecisionTreeRow | undefined> {
  const db = getDatabase();
  const [row] = await db
    .select()
    .from(decisionTrees)
    .where(eq(decisionTrees.guideVersionId, versionId))
    .limit(1);
  return row;
}

async function ensureTree(versionId: string, name: string): Promise<DecisionTreeRow> {
  const existing = await getTreeForVersion(versionId);
  if (existing) {
    return existing;
  }
  const db = getDatabase();
  const [row] = await db
    .insert(decisionTrees)
    .values({ guideVersionId: versionId, name })
    .returning();
  return row;
}

export async function addNode(
  guideKey: string,
  version: string,
  input: z.infer<typeof nodeInputSchema>,
): Promise<DecisionNodeRow> {
  const parsed = nodeInputSchema.parse(input);
  const versionRow = await getVersion(guideKey, version);
  if (!versionRow) {
    throw new Error(`Version '${version}' not found for guide '${guideKey}'.`);
  }
  if (versionRow.status !== "draft") {
    throw new Error("Cannot modify a non-draft version.");
  }

  const tree = await ensureTree(versionRow.id, `${guideKey} decision tree`);
  const db = getDatabase();
  const [row] = await db
    .insert(decisionNodes)
    .values({ treeId: tree.id, ...parsed })
    .returning();
  return row;
}

export async function listNodes(
  guideKey: string,
  version: string,
): Promise<DecisionNodeRow[]> {
  const versionRow = await getVersion(guideKey, version);
  if (!versionRow) {
    throw new Error(`Version '${version}' not found for guide '${guideKey}'.`);
  }
  const tree = await getTreeForVersion(versionRow.id);
  if (!tree) {
    return [];
  }
  const db = getDatabase();
  return db
    .select()
    .from(decisionNodes)
    .where(eq(decisionNodes.treeId, tree.id))
    .orderBy(asc(decisionNodes.sortOrder));
}

export async function addEdge(
  guideKey: string,
  version: string,
  input: z.infer<typeof edgeInputSchema>,
): Promise<DecisionEdgeRow> {
  const parsed = edgeInputSchema.parse(input);
  if (!parsed.toNodeId && !parsed.toOutcomeId) {
    throw new Error("Edge must have either toNodeId or toOutcomeId.");
  }
  if (parsed.toNodeId && parsed.toOutcomeId) {
    throw new Error("Edge cannot have both toNodeId and toOutcomeId.");
  }

  const versionRow = await getVersion(guideKey, version);
  if (!versionRow) {
    throw new Error(`Version '${version}' not found for guide '${guideKey}'.`);
  }
  if (versionRow.status !== "draft") {
    throw new Error("Cannot modify a non-draft version.");
  }

  const tree = await getTreeForVersion(versionRow.id);
  if (!tree) {
    throw new Error("No decision tree exists for this version.");
  }

  const db = getDatabase();
    const [row] = await db
    .insert(decisionEdges)
    .values({ treeId: tree.id, ...parsed })
    .returning();
  return castEdgeRow(row);
}

export async function listEdges(
  guideKey: string,
  version: string,
): Promise<DecisionEdgeRow[]> {
  const versionRow = await getVersion(guideKey, version);
  if (!versionRow) {
    throw new Error(`Version '${version}' not found for guide '${guideKey}'.`);
  }
  const tree = await getTreeForVersion(versionRow.id);
  if (!tree) {
    return [];
  }
  const db = getDatabase();
  const rows = await db
    .select()
    .from(decisionEdges)
    .where(eq(decisionEdges.treeId, tree.id))
    .orderBy(asc(decisionEdges.sortOrder));
  return rows.map(castEdgeRow);
}

export async function addOutcome(
  guideKey: string,
  version: string,
  input: z.infer<typeof outcomeInputSchema>,
): Promise<DecisionOutcomeRow> {
  const parsed = outcomeInputSchema.parse(input);
  const versionRow = await getVersion(guideKey, version);
  if (!versionRow) {
    throw new Error(`Version '${version}' not found for guide '${guideKey}'.`);
  }
  if (versionRow.status !== "draft") {
    throw new Error("Cannot modify a non-draft version.");
  }

  const tree = await ensureTree(versionRow.id, `${guideKey} decision tree`);
  const db = getDatabase();
  const [row] = await db
    .insert(decisionOutcomes)
    .values({ treeId: tree.id, ...parsed })
    .returning();
  return castOutcomeRow(row);
}

export async function listOutcomes(
  guideKey: string,
  version: string,
): Promise<DecisionOutcomeRow[]> {
  const versionRow = await getVersion(guideKey, version);
  if (!versionRow) {
    throw new Error(`Version '${version}' not found for guide '${guideKey}'.`);
  }
  const tree = await getTreeForVersion(versionRow.id);
  if (!tree) {
    return [];
  }
  const db = getDatabase();
  const rows = await db
    .select()
    .from(decisionOutcomes)
    .where(eq(decisionOutcomes.treeId, tree.id))
    .orderBy(asc(decisionOutcomes.key));
  return rows.map(castOutcomeRow);
}

export async function validateVersion(
  guideKey: string,
  version: string,
): Promise<ValidationResult> {
  const nodes = await listNodes(guideKey, version);
  const edges = await listEdges(guideKey, version);
  const outcomes = await listOutcomes(guideKey, version);
  return validateDecisionGraph(nodes, edges, outcomes);
}

export async function publishVersion(
  guideKey: string,
  version: string,
): Promise<GuideVersionRow> {
  const validation = await validateVersion(guideKey, version);
  const errors = validation.issues.filter((i) => i.severity === "error");
  if (errors.length > 0) {
    throw new Error(
      `Cannot publish: ${errors.map((e) => e.message).join("; ")}`,
    );
  }

  const versionRow = await getVersion(guideKey, version);
  if (!versionRow) {
    throw new Error(`Version '${version}' not found for guide '${guideKey}'.`);
  }
  if (versionRow.status !== "draft" && versionRow.status !== "reviewed") {
    throw new Error(`Cannot publish a '${versionRow.status}' version.`);
  }

  const db = getDatabase();
  const guide = await getGuide(guideKey);
  if (!guide) {
    throw new Error(`Guide '${guideKey}' not found.`);
  }

  await db
    .update(guideVersions)
    .set({ status: "retired" })
    .where(
      and(
        eq(guideVersions.guideId, guide.id),
        eq(guideVersions.status, "published"),
      ),
    );

  const [row] = await db
    .update(guideVersions)
    .set({ status: "published", publishedBy: DEV_ACTOR })
    .where(eq(guideVersions.id, versionRow.id))
    .returning();

  await db
    .update(guides)
    .set({ status: "published" })
    .where(eq(guides.id, guide.id));

  return row;
}

export async function evaluateGuide(
  guideKey: string,
  answers: Record<string, string | string[]>,
): Promise<EvaluationResult> {
  const version = await getPublishedVersion(guideKey);
  if (!version) {
    return {
      resolved: false,
      title: "Unresolved",
      note: "No reviewed guide is available for this service.",
    };
  }

  const tree = await getTreeForVersion(version.id);
  if (!tree) {
    return {
      resolved: false,
      title: "Unresolved",
      note: "No decision tree is available for this guide.",
    };
  }

  const db = getDatabase();

  const nodes = await db
    .select()
    .from(decisionNodes)
    .where(eq(decisionNodes.treeId, tree.id))
    .orderBy(asc(decisionNodes.sortOrder));

  const edgeRows = await db
    .select()
    .from(decisionEdges)
    .where(eq(decisionEdges.treeId, tree.id))
    .orderBy(asc(decisionEdges.sortOrder));

  const outcomeRows = await db
    .select()
    .from(decisionOutcomes)
    .where(eq(decisionOutcomes.treeId, tree.id));

  return evaluateDecisionTree(
    nodes,
    edgeRows.map(castEdgeRow),
    outcomeRows.map(castOutcomeRow),
    answers,
  );
}

const contentSourceInputSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  authority: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  url: z.string().url().startsWith("https://"),
  publishedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function addContentSource(
  guideKey: string,
  version: string,
  input: z.infer<typeof contentSourceInputSchema>,
): Promise<ContentSourceRow> {
  const parsed = contentSourceInputSchema.parse(input);
  const versionRow = await getVersion(guideKey, version);
  if (!versionRow) {
    throw new Error(`Version '${version}' not found for guide '${guideKey}'.`);
  }
  if (versionRow.status !== "draft") {
    throw new Error("Cannot modify a non-draft version.");
  }

  const db = getDatabase();
  const [row] = await db
    .insert(contentSources)
    .values({ guideVersionId: versionRow.id, ...parsed })
    .returning();
  return row;
}

export async function listContentSources(
  guideKey: string,
  version: string,
): Promise<ContentSourceRow[]> {
  const versionRow = await getVersion(guideKey, version);
  if (!versionRow) {
    throw new Error(`Version '${version}' not found for guide '${guideKey}'.`);
  }
  const db = getDatabase();
  return db
    .select()
    .from(contentSources)
    .where(eq(contentSources.guideVersionId, versionRow.id))
    .orderBy(asc(contentSources.key));
}

export async function verifyContentSource(
  sourceId: string,
  verifiedAt: Date,
): Promise<ContentSourceRow> {
  const db = getDatabase();
  const [row] = await db
    .update(contentSources)
    .set({ verifiedAt })
    .where(eq(contentSources.id, sourceId))
    .returning();
  if (!row) {
    throw new Error(`Content source '${sourceId}' not found.`);
  }
  return row;
}

const translationInputSchema = z.object({
  entityType: z.enum(["guide", "node", "outcome"]),
  entityId: z.string().uuid(),
  locale: z.string().min(2).max(10),
  field: z.string().min(1).max(60),
  value: z.string().min(1),
  status: z.enum(["draft", "reviewed", "published", "stale"]).optional(),
});

export async function upsertTranslation(
  input: z.infer<typeof translationInputSchema>,
): Promise<TranslationRow> {
  const parsed = translationInputSchema.parse(input);
  const db = getDatabase();

  const [existing] = await db
    .select()
    .from(contentTranslations)
    .where(
      and(
        eq(contentTranslations.entityType, parsed.entityType),
        eq(contentTranslations.entityId, parsed.entityId),
        eq(contentTranslations.locale, parsed.locale),
        eq(contentTranslations.field, parsed.field),
      ),
    )
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(contentTranslations)
      .set({
        value: parsed.value,
        status: parsed.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(eq(contentTranslations.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(contentTranslations)
    .values({
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      locale: parsed.locale,
      field: parsed.field,
      value: parsed.value,
      status: parsed.status ?? "draft",
    })
    .returning();
  return row;
}

export async function listTranslations(
  entityType: string,
  entityId: string,
  locale?: string,
): Promise<TranslationRow[]> {
  const db = getDatabase();
  const conditions = [
    eq(contentTranslations.entityType, entityType),
    eq(contentTranslations.entityId, entityId),
  ];
  if (locale) {
    conditions.push(eq(contentTranslations.locale, locale));
  }
  return db
    .select()
    .from(contentTranslations)
    .where(and(...conditions))
    .orderBy(asc(contentTranslations.field));
}

export async function markTranslationsStale(
  entityType: string,
  entityId: string,
): Promise<number> {
  const db = getDatabase();
  const rows = await db
    .update(contentTranslations)
    .set({ status: "stale", updatedAt: new Date() })
    .where(
      and(
        eq(contentTranslations.entityType, entityType),
        eq(contentTranslations.entityId, entityId),
        ne(contentTranslations.status, "stale"),
      ),
    )
    .returning();
  return rows.length;
}

const fixtureInputSchema = z.object({
  name: z.string().min(1).max(200),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  expectedOutcome: z.string().min(1).max(100),
});

export async function addFixture(
  guideKey: string,
  version: string,
  input: z.infer<typeof fixtureInputSchema>,
): Promise<GuideValidationFixtureRow> {
  const parsed = fixtureInputSchema.parse(input);
  const versionRow = await getVersion(guideKey, version);
  if (!versionRow) {
    throw new Error(`Version '${version}' not found for guide '${guideKey}'.`);
  }

  const db = getDatabase();
  const [row] = await db
    .insert(guideValidationFixtures)
    .values({ guideVersionId: versionRow.id, ...parsed })
    .returning();
  return castFixtureRow(row);
}

export async function listFixtures(
  guideKey: string,
  version: string,
): Promise<GuideValidationFixtureRow[]> {
  const versionRow = await getVersion(guideKey, version);
  if (!versionRow) {
    throw new Error(`Version '${version}' not found for guide '${guideKey}'.`);
  }
  const db = getDatabase();
  const rows = await db
    .select()
    .from(guideValidationFixtures)
    .where(eq(guideValidationFixtures.guideVersionId, versionRow.id))
    .orderBy(asc(guideValidationFixtures.name));
  return rows.map(castFixtureRow);
}

export async function executeFixture(
  fixtureId: string,
): Promise<GuideValidationFixtureRow> {
  const db = getDatabase();

  const [fixture] = await db
    .select()
    .from(guideValidationFixtures)
    .where(eq(guideValidationFixtures.id, fixtureId))
    .limit(1);
  if (!fixture) {
    throw new Error(`Fixture '${fixtureId}' not found.`);
  }

  const [versionRow] = await db
    .select()
    .from(guideVersions)
    .where(eq(guideVersions.id, fixture.guideVersionId))
    .limit(1);
  if (!versionRow) {
    throw new Error("Version not found for fixture.");
  }

  const tree = await getTreeForVersion(versionRow.id);
  if (!tree) {
    throw new Error("No decision tree found for this version.");
  }

  const nodes = await db
    .select()
    .from(decisionNodes)
    .where(eq(decisionNodes.treeId, tree.id))
    .orderBy(asc(decisionNodes.sortOrder));

  const edgeRows = await db
    .select()
    .from(decisionEdges)
    .where(eq(decisionEdges.treeId, tree.id))
    .orderBy(asc(decisionEdges.sortOrder));

  const outcomeRows = await db
    .select()
    .from(decisionOutcomes)
    .where(eq(decisionOutcomes.treeId, tree.id));

  const result = evaluateDecisionTree(
    nodes,
    edgeRows.map(castEdgeRow),
    outcomeRows.map(castOutcomeRow),
    fixture.answers as Record<string, string | string[]>,
  );

  const passed = result.resolved && result.key === fixture.expectedOutcome;

  const [updated] = await db
    .update(guideValidationFixtures)
    .set({ passed, executedAt: new Date() })
    .where(eq(guideValidationFixtures.id, fixtureId))
    .returning();
  return castFixtureRow(updated);
}

export async function executeAllFixtures(
  guideKey: string,
  version: string,
): Promise<{ total: number; passed: number; failed: number }> {
  const fixtures = await listFixtures(guideKey, version);
  let passed = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    const result = await executeFixture(fixture.id);
    if (result.passed) {
      passed += 1;
    } else {
      failed += 1;
    }
  }

  return { total: fixtures.length, passed, failed };
}
