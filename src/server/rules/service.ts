import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/server/db/schema";
import { getColomboDate } from "@/server/rules/date";
import { canonicalJson, checksumJson, diffJson, type JsonValue } from "@/server/rules/json";

type Database = PostgresJsDatabase<typeof schema>;

export async function resolveRuleVersion(database: Database, ruleDefinitionId: string, asOfDate: string) {
  const inEffectiveRange = and(
    lte(schema.ruleVersions.effectiveFrom, asOfDate),
    or(isNull(schema.ruleVersions.effectiveTo), gte(schema.ruleVersions.effectiveTo, asOfDate)),
  );
  const [version] = await database.select().from(schema.ruleVersions).where(and(
    eq(schema.ruleVersions.ruleDefinitionId, ruleDefinitionId),
    inEffectiveRange,
    or(
      eq(schema.ruleVersions.status, "published"),
      and(
        eq(schema.ruleVersions.status, "retired"),
        isNotNull(schema.ruleVersions.publishedAt),
        or(
          isNull(schema.ruleVersions.retiredEffectiveOn),
          sql`${asOfDate}::date < ${schema.ruleVersions.retiredEffectiveOn}`,
        ),
      ),
    ),
  )).orderBy(
    sql`case when ${schema.ruleVersions.status} = 'retired' then 1 else 0 end`,
    desc(schema.ruleVersions.effectiveFrom),
    desc(schema.ruleVersions.publishedAt),
  ).limit(1);
  return version ?? null;
}

export type RuleHandler = {
  payloadSchemaVersion: string;
  validatePayload(payload: JsonValue): void;
  calculate(input: JsonValue, payload: JsonValue): JsonValue;
};

export class RulePlatform {
  constructor(
    private readonly database: Database,
    private readonly handlers: Readonly<Record<string, RuleHandler>> = {},
  ) {}

  async createDefinition(input: {
    key: string;
    calculatorKey: string;
    scope: string;
    name: string;
    description?: string;
  }, actor: string) {
    const [definition] = await this.database.insert(schema.ruleDefinitions).values({
      key: input.key,
      calculatorKey: input.calculatorKey,
      scope: input.scope,
      name: input.name,
      description: input.description,
      createdBy: actor,
    }).returning();
    return definition;
  }

  async createDraft(input: {
    ruleDefinitionId: string;
    version: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    payload: JsonValue;
    payloadSchemaVersion: string;
  }, actor: string) {
    await this.validatePayload(input.ruleDefinitionId, input.payloadSchemaVersion, input.payload);
    const [draft] = await this.database.insert(schema.ruleVersions).values({
      ruleDefinitionId: input.ruleDefinitionId,
      version: input.version,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      payload: input.payload,
      payloadSchemaVersion: input.payloadSchemaVersion,
      checksum: checksumJson(input.payload),
      author: actor,
    }).returning();
    return draft;
  }

  async updateDraft(ruleVersionId: string, input: {
    version: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    payload: JsonValue;
    payloadSchemaVersion: string;
  }) {
    const [existing] = await this.database.select().from(schema.ruleVersions)
      .where(eq(schema.ruleVersions.id, ruleVersionId));
    if (!existing) throw new Error("RULE_VERSION_NOT_FOUND");
    if (existing.status !== "draft") throw new Error("PUBLISHED_RULE_IMMUTABLE");
    await this.validatePayload(existing.ruleDefinitionId, input.payloadSchemaVersion, input.payload);

    const [draft] = await this.database.update(schema.ruleVersions).set({
      version: input.version,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      payload: input.payload,
      payloadSchemaVersion: input.payloadSchemaVersion,
      checksum: checksumJson(input.payload),
      updatedAt: new Date(),
    }).where(and(eq(schema.ruleVersions.id, ruleVersionId), eq(schema.ruleVersions.status, "draft"))).returning();
    if (!draft) throw new Error("RULE_VERSION_NOT_DRAFT");
    return draft;
  }

  async attachSource(ruleVersionId: string, sourceId: string, note?: string) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`select id from rule_versions where id = ${ruleVersionId} for update`);
      const [version] = await transaction.select().from(schema.ruleVersions)
        .where(eq(schema.ruleVersions.id, ruleVersionId));
      if (!version) throw new Error("RULE_VERSION_NOT_FOUND");
      if (version.status !== "draft") throw new Error("REVIEWED_RULE_IMMUTABLE");
      await transaction.execute(sql`select id from sources where id = ${sourceId} for update`);
      const [revision] = await transaction.select().from(schema.sourceRevisions)
        .where(eq(schema.sourceRevisions.sourceId, sourceId))
        .orderBy(desc(schema.sourceRevisions.revision)).limit(1);
      if (!revision) throw new Error("SOURCE_NOT_FOUND");
      const [verification] = await transaction.select().from(schema.verificationEvents).where(and(
        eq(schema.verificationEvents.sourceId, sourceId),
        eq(schema.verificationEvents.sourceRevisionId, revision.id),
        eq(schema.verificationEvents.outcome, "verified"),
      )).orderBy(desc(schema.verificationEvents.verifiedAt), desc(schema.verificationEvents.id)).limit(1);
      if (!verification) throw new Error("VERIFIED_SOURCE_REVISION_REQUIRED");
      const [linkCheck] = await transaction.select().from(schema.sourceLinkChecks)
        .where(eq(schema.sourceLinkChecks.sourceRevisionId, revision.id))
        .orderBy(desc(schema.sourceLinkChecks.checkedAt), desc(schema.sourceLinkChecks.id)).limit(1);
      if (!linkCheck || !(["healthy", "redirected"] as const).includes(linkCheck.status as "healthy" | "redirected") || verification.verifiedAt < linkCheck.checkedAt) {
        throw new Error("VERIFIED_SOURCE_REVISION_REQUIRED");
      }
      const [attachment] = await transaction.insert(schema.ruleVersionSources).values({
        ruleVersionId,
        sourceId,
        sourceRevisionId: revision.id,
        verificationEventId: verification.id,
        note,
      }).onConflictDoUpdate({
        target: [schema.ruleVersionSources.ruleVersionId, schema.ruleVersionSources.sourceId],
        set: {
          sourceRevisionId: revision.id,
          verificationEventId: verification.id,
          note,
        },
      }).returning();
      return attachment;
    });
  }

  async addFixture(ruleVersionId: string, input: {
    name: string;
    input: JsonValue;
    expectedResult: JsonValue;
  }) {
    const [version] = await this.database.select().from(schema.ruleVersions)
      .where(eq(schema.ruleVersions.id, ruleVersionId));
    if (!version) throw new Error("RULE_VERSION_NOT_FOUND");
    if (version.status !== "draft") throw new Error("REVIEWED_RULE_IMMUTABLE");
    const [fixture] = await this.database.insert(schema.ruleValidationFixtures)
      .values({ ruleVersionId, ...input }).returning();
    return fixture;
  }

  async review(ruleVersionId: string, actor: string, reason: string) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`select id from rule_versions where id = ${ruleVersionId} for update`);
      const [version] = await transaction.select().from(schema.ruleVersions)
        .where(eq(schema.ruleVersions.id, ruleVersionId));
      if (!version) throw new Error("RULE_VERSION_NOT_FOUND");
      if (version.status !== "draft") throw new Error("RULE_VERSION_NOT_DRAFT");
      await this.assertPublicationEvidence(transaction as Database, version);
      const reviewedAt = new Date();
      const [reviewed] = await transaction.update(schema.ruleVersions).set({
        status: "reviewed",
        reviewer: actor,
        reviewedAt,
        updatedAt: reviewedAt,
      }).where(and(eq(schema.ruleVersions.id, ruleVersionId), eq(schema.ruleVersions.status, "draft"))).returning();
      if (!reviewed) throw new Error("RULE_VERSION_NOT_DRAFT");
      await transaction.insert(schema.publicationEvents).values({
        ruleVersionId,
        type: "reviewed",
        actor,
        reason,
      });
      return reviewed;
    });
  }

  async runFixtures(ruleVersionId: string) {
    const [version] = await this.database.select().from(schema.ruleVersions)
      .where(eq(schema.ruleVersions.id, ruleVersionId));
    if (!version) throw new Error("RULE_VERSION_NOT_FOUND");
    if (version.status !== "draft") throw new Error("REVIEWED_RULE_IMMUTABLE");
    const [definition] = await this.database.select().from(schema.ruleDefinitions)
      .where(eq(schema.ruleDefinitions.id, version.ruleDefinitionId));
    const handler = definition ? this.handlers[definition.key] : undefined;
    if (!handler) throw new Error("RULE_HANDLER_NOT_FOUND");
    handler.validatePayload(version.payload as JsonValue);

    const fixtures = await this.database.select().from(schema.ruleValidationFixtures)
      .where(eq(schema.ruleValidationFixtures.ruleVersionId, ruleVersionId));
    if (fixtures.length === 0) throw new Error("RULE_FIXTURES_REQUIRED");

    return this.database.transaction(async (transaction) => Promise.all(fixtures.map(async (fixture) => {
      let actualResult: JsonValue;
      try {
        actualResult = handler.calculate(fixture.input as JsonValue, version.payload as JsonValue);
      } catch {
        throw new Error("RULE_FIXTURE_EXECUTION_FAILED");
      }
      const expectedResult = fixture.expectedResult as JsonValue;
      const differences = diffJson(expectedResult, actualResult);
      await transaction.update(schema.ruleValidationFixtures).set({
        actualResult,
        passed: differences.length === 0,
        ruleChecksum: version.checksum,
        executedAt: new Date(),
      }).where(eq(schema.ruleValidationFixtures.id, fixture.id));
      return { id: fixture.id, name: fixture.name, passed: differences.length === 0, differences };
    })));
  }

  async compareWithActive(ruleVersionId: string, asOfDate: string) {
    const [draft] = await this.database.select().from(schema.ruleVersions)
      .where(eq(schema.ruleVersions.id, ruleVersionId));
    if (!draft) throw new Error("RULE_VERSION_NOT_FOUND");
    const active = await this.resolve(draft.ruleDefinitionId, asOfDate);
    const [definition] = await this.database.select().from(schema.ruleDefinitions)
      .where(eq(schema.ruleDefinitions.id, draft.ruleDefinitionId));
    const handler = definition ? this.handlers[definition.key] : undefined;
    if (!handler) throw new Error("RULE_HANDLER_NOT_FOUND");
    const fixtures = await this.database.select().from(schema.ruleValidationFixtures)
      .where(eq(schema.ruleValidationFixtures.ruleVersionId, ruleVersionId));
    const resultComparisons = active ? fixtures.map((fixture) => {
      let activeResult: JsonValue;
      let draftResult: JsonValue;
      try {
        activeResult = handler.calculate(fixture.input as JsonValue, active.payload as JsonValue);
        draftResult = handler.calculate(fixture.input as JsonValue, draft.payload as JsonValue);
      } catch {
        throw new Error("RULE_FIXTURE_EXECUTION_FAILED");
      }
      return {
        fixture: fixture.name,
        activeResult,
        draftResult,
        differences: diffJson(activeResult, draftResult),
      };
    }) : [];
    return {
      activeVersion: active?.version ?? null,
      activeChecksum: active?.checksum ?? null,
      draftChecksum: draft.checksum,
      payloadDifferences: active ? diffJson(active.payload as JsonValue, draft.payload as JsonValue) : [],
      resultComparisons,
    };
  }

  async publish(
    ruleVersionId: string,
    actor: string,
    reason: string,
    today = getColomboDate(),
    replacesRuleVersionId?: string,
  ) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`select id from rule_versions where id = ${ruleVersionId} for update`);
      const [version] = await transaction.select().from(schema.ruleVersions)
        .where(eq(schema.ruleVersions.id, ruleVersionId));
      if (!version) throw new Error("RULE_VERSION_NOT_FOUND");
      if (version.status !== "reviewed" || !version.reviewer || !version.reviewedAt) {
        throw new Error("RULE_REVIEW_REQUIRED");
      }

      await this.assertPublicationEvidence(transaction as Database, version);

      if (replacesRuleVersionId) {
        await transaction.execute(sql`select id from rule_versions where id = ${replacesRuleVersionId} for update`);
        const [replaced] = await transaction.select().from(schema.ruleVersions)
          .where(eq(schema.ruleVersions.id, replacesRuleVersionId));
        if (!replaced || replaced.ruleDefinitionId !== version.ruleDefinitionId || !(["scheduled", "published"] as const).includes(replaced.status as "scheduled" | "published")) {
          throw new Error("REPLACED_RULE_VERSION_INVALID");
        }
        const retiredAt = new Date();
        await transaction.update(schema.ruleVersions).set({
          status: "retired",
          retiredAt,
          retiredEffectiveOn: version.effectiveFrom,
          updatedAt: retiredAt,
        }).where(eq(schema.ruleVersions.id, replaced.id));
        await transaction.insert(schema.publicationEvents).values({
          ruleVersionId: replaced.id,
          type: "retired",
          actor,
          reason: `Replaced by ${version.version}: ${reason}`,
          metadata: { replacementRuleVersionId: version.id },
        });
      }

      const status = version.effectiveFrom > today ? "scheduled" : "published";
      const transitionAt = new Date();
      const [published] = await transaction.update(schema.ruleVersions).set({
        status,
        scheduledAt: status === "scheduled" ? transitionAt : null,
        publishedAt: status === "published" ? transitionAt : null,
        updatedAt: transitionAt,
      }).where(eq(schema.ruleVersions.id, ruleVersionId)).returning();
      await transaction.insert(schema.publicationEvents).values({
        ruleVersionId,
        type: status,
        actor,
        reason,
        metadata: { checksum: version.checksum },
      });
      return published;
    });
  }

  async promoteScheduled(asOfDate: string, actor: string) {
    const candidates = await this.database.select().from(schema.ruleVersions).where(and(
      eq(schema.ruleVersions.status, "scheduled"),
      lte(schema.ruleVersions.effectiveFrom, asOfDate),
    ));
    const promoted = [];
    const blocked: Array<{ id: string; code: string }> = [];
    for (const candidate of candidates) {
      try {
        const version = await this.database.transaction(async (transaction) => {
          await transaction.execute(sql`select id from rule_versions where id = ${candidate.id} for update`);
          const [current] = await transaction.select().from(schema.ruleVersions)
            .where(eq(schema.ruleVersions.id, candidate.id));
          if (!current || current.status !== "scheduled") return null;
          await this.assertPublicationEvidence(transaction as Database, current);
          const publishedAt = new Date();
          const [updated] = await transaction.update(schema.ruleVersions).set({
            status: "published",
            publishedAt,
            updatedAt: publishedAt,
          }).where(and(eq(schema.ruleVersions.id, candidate.id), eq(schema.ruleVersions.status, "scheduled"))).returning();
          if (!updated) return null;
          await transaction.insert(schema.publicationEvents).values({
            ruleVersionId: candidate.id,
            type: "published",
            actor,
            reason: `Scheduled rule became effective on ${asOfDate}.`,
            metadata: { checksum: candidate.checksum },
          });
          return updated;
        });
        if (version) promoted.push(version);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        blocked.push({ id: candidate.id, code: /^[A-Z][A-Z0-9_]+$/.test(message) ? message : "PROMOTION_FAILED" });
      }
    }
    return { promoted, blocked };
  }

  async retire(ruleVersionId: string, effectiveOn: string, actor: string, reason: string) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`select id from rule_versions where id = ${ruleVersionId} for update`);
      const [version] = await transaction.select().from(schema.ruleVersions)
        .where(eq(schema.ruleVersions.id, ruleVersionId));
      if (!version) throw new Error("RULE_VERSION_NOT_FOUND");
      if (!(["scheduled", "published"] as const).includes(version.status as "scheduled" | "published")) {
        throw new Error("RULE_VERSION_NOT_ACTIVE");
      }
      const retiredAt = new Date();
      const [retired] = await transaction.update(schema.ruleVersions).set({
        status: "retired",
        retiredAt,
        retiredEffectiveOn: effectiveOn,
        updatedAt: retiredAt,
      }).where(eq(schema.ruleVersions.id, ruleVersionId)).returning();
      await transaction.insert(schema.publicationEvents).values({
        ruleVersionId,
        type: "retired",
        actor,
        reason,
      });
      return retired;
    });
  }

  async resolve(ruleDefinitionId: string, asOfDate: string) {
    return resolveRuleVersion(this.database, ruleDefinitionId, asOfDate);
  }

  async listCalculatorRules(calculatorKey: string, asOfDate: string) {
    const definitions = await this.database.select().from(schema.ruleDefinitions)
      .where(eq(schema.ruleDefinitions.calculatorKey, calculatorKey));
    const versions = await Promise.all(definitions.map(async (definition) => ({
      definition,
      version: await this.resolve(definition.id, asOfDate),
    })));
    return versions.filter((item) => item.version).map(({ definition, version }) => ({
      key: definition.key,
      scope: definition.scope,
      name: definition.name,
      version: version!.version,
      effectiveFrom: version!.effectiveFrom,
      effectiveTo: version!.effectiveTo,
      payloadSchemaVersion: version!.payloadSchemaVersion,
      checksum: version!.checksum,
    }));
  }

  async getHistory(ruleVersionId: string) {
    const [version] = await this.database.select().from(schema.ruleVersions)
      .where(eq(schema.ruleVersions.id, ruleVersionId));
    if (!version) throw new Error("RULE_VERSION_NOT_FOUND");
    const events = await this.database.select().from(schema.publicationEvents)
      .where(eq(schema.publicationEvents.ruleVersionId, ruleVersionId))
      .orderBy(schema.publicationEvents.createdAt);
    const fixtures = await this.database.select().from(schema.ruleValidationFixtures)
      .where(eq(schema.ruleValidationFixtures.ruleVersionId, ruleVersionId))
      .orderBy(schema.ruleValidationFixtures.createdAt);
    return { version, events, fixtures };
  }

  async getDashboard() {
    const [sourceRows, definitions, versions, sourceCount, definitionCount, draftCount, publishedCount] = await Promise.all([
      this.database.select().from(schema.sources).orderBy(desc(schema.sources.updatedAt)).limit(50),
      this.database.select().from(schema.ruleDefinitions).orderBy(desc(schema.ruleDefinitions.createdAt)).limit(50),
      this.database.select({
        id: schema.ruleVersions.id,
        ruleDefinitionId: schema.ruleVersions.ruleDefinitionId,
        ruleName: schema.ruleDefinitions.name,
        version: schema.ruleVersions.version,
        status: schema.ruleVersions.status,
        effectiveFrom: schema.ruleVersions.effectiveFrom,
        effectiveTo: schema.ruleVersions.effectiveTo,
        checksum: schema.ruleVersions.checksum,
        reviewer: schema.ruleVersions.reviewer,
        publishedAt: schema.ruleVersions.publishedAt,
        updatedAt: schema.ruleVersions.updatedAt,
      }).from(schema.ruleVersions)
        .innerJoin(schema.ruleDefinitions, eq(schema.ruleDefinitions.id, schema.ruleVersions.ruleDefinitionId))
        .orderBy(desc(schema.ruleVersions.updatedAt)).limit(100),
      this.database.$count(schema.sources),
      this.database.$count(schema.ruleDefinitions),
      this.database.$count(schema.ruleVersions, eq(schema.ruleVersions.status, "draft")),
      this.database.$count(schema.ruleVersions, eq(schema.ruleVersions.status, "published")),
    ]);
    const revisions = sourceRows.length ? await this.database.select({
      id: schema.sourceRevisions.id,
      sourceId: schema.sourceRevisions.sourceId,
      revision: schema.sourceRevisions.revision,
    }).from(schema.sourceRevisions)
      .where(inArray(schema.sourceRevisions.sourceId, sourceRows.map((source) => source.id)))
      .orderBy(desc(schema.sourceRevisions.revision)) : [];
    const latestRevisions = new Map<string, (typeof revisions)[number]>();
    for (const revision of revisions) {
      if (!latestRevisions.has(revision.sourceId)) latestRevisions.set(revision.sourceId, revision);
    }
    const revisionIds = [...latestRevisions.values()].map((revision) => revision.id);
    const checks = revisionIds.length ? await this.database.select({
      sourceRevisionId: schema.sourceLinkChecks.sourceRevisionId,
      status: schema.sourceLinkChecks.status,
      checkedAt: schema.sourceLinkChecks.checkedAt,
    }).from(schema.sourceLinkChecks)
      .where(inArray(schema.sourceLinkChecks.sourceRevisionId, revisionIds))
      .orderBy(desc(schema.sourceLinkChecks.checkedAt), desc(schema.sourceLinkChecks.id)) : [];
    const latestChecks = new Map<string, (typeof checks)[number]>();
    for (const check of checks) {
      if (!latestChecks.has(check.sourceRevisionId)) latestChecks.set(check.sourceRevisionId, check);
    }
    const sources = sourceRows.map((source) => {
      const revision = latestRevisions.get(source.id);
      return {
        ...source,
        revision: revision?.revision ?? 0,
        linkCheck: revision ? latestChecks.get(revision.id) ?? null : null,
      };
    });
    return {
      sources,
      definitions,
      versions,
      totals: { sources: sourceCount, definitions: definitionCount, drafts: draftCount, published: publishedCount },
    };
  }

  private async validatePayload(ruleDefinitionId: string, payloadSchemaVersion: string, payload: JsonValue) {
    const [definition] = await this.database.select().from(schema.ruleDefinitions)
      .where(eq(schema.ruleDefinitions.id, ruleDefinitionId));
    if (!definition) throw new Error("RULE_DEFINITION_NOT_FOUND");
    const handler = this.handlers[definition.key];
    if (!handler) throw new Error("RULE_HANDLER_NOT_FOUND");
    if (handler.payloadSchemaVersion !== payloadSchemaVersion) throw new Error("RULE_SCHEMA_VERSION_MISMATCH");
    try {
      handler.validatePayload(payload);
      canonicalJson(payload);
    } catch {
      throw new Error("RULE_PAYLOAD_INVALID");
    }
  }

  private async assertPublicationEvidence(database: Database, version: typeof schema.ruleVersions.$inferSelect) {
    const sources = await database.select({
      official: schema.sourceRevisions.official,
      outcome: schema.verificationEvents.outcome,
      sourceRevisionId: schema.ruleVersionSources.sourceRevisionId,
      verificationEventId: schema.ruleVersionSources.verificationEventId,
      verifiedAt: schema.verificationEvents.verifiedAt,
      sourceId: schema.ruleVersionSources.sourceId,
    }).from(schema.ruleVersionSources)
      .innerJoin(schema.sourceRevisions, eq(schema.sourceRevisions.id, schema.ruleVersionSources.sourceRevisionId))
      .innerJoin(schema.verificationEvents, eq(schema.verificationEvents.id, schema.ruleVersionSources.verificationEventId))
      .where(eq(schema.ruleVersionSources.ruleVersionId, version.id));
    for (const sourceId of [...new Set(sources.map((source) => source.sourceId))].sort()) {
      await database.execute(sql`select id from sources where id = ${sourceId} for update`);
    }
    const validSources = await Promise.all(sources.map(async (source) => {
      const [latestVerification] = await database.select().from(schema.verificationEvents)
        .where(eq(schema.verificationEvents.sourceRevisionId, source.sourceRevisionId))
        .orderBy(desc(schema.verificationEvents.verifiedAt), desc(schema.verificationEvents.id)).limit(1);
      const [latestCheck] = await database.select().from(schema.sourceLinkChecks)
        .where(eq(schema.sourceLinkChecks.sourceRevisionId, source.sourceRevisionId))
        .orderBy(desc(schema.sourceLinkChecks.checkedAt), desc(schema.sourceLinkChecks.id)).limit(1);
      return source.official && source.outcome === "verified" &&
        latestVerification?.outcome === "verified" &&
        latestCheck !== undefined &&
        (["healthy", "redirected"] as const).includes(latestCheck.status as "healthy" | "redirected") &&
        latestVerification.verifiedAt >= latestCheck.checkedAt;
    }));
    if (!validSources.some(Boolean)) {
      throw new Error("VERIFIED_OFFICIAL_SOURCE_REQUIRED");
    }
    const fixtures = await database.select().from(schema.ruleValidationFixtures)
      .where(eq(schema.ruleValidationFixtures.ruleVersionId, version.id));
    if (fixtures.length === 0 || fixtures.some((fixture) => !fixture.passed || fixture.ruleChecksum !== version.checksum)) {
      throw new Error("PASSING_FIXTURES_REQUIRED");
    }
  }
}
