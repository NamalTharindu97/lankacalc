import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type { RegulatedCalculatorDefinition, RuleReference, SourceReference } from "@/domain/calculators/types";
import { getDatabase } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import { ruleHandlers } from "@/server/rules/registry";
import { resolveRuleVersion, type RuleHandler } from "@/server/rules/service";
import type { JsonValue } from "@/server/rules/json";

type Database = PostgresJsDatabase<typeof schema>;

export class RegulatedRuleUnavailableError extends Error {
  constructor(readonly ruleKey: string) {
    super(`No published ${ruleKey} rule is available for the selected date.`);
    this.name = "RegulatedRuleUnavailableError";
  }
}

export type RegulatedProvenance = {
  payloads: Readonly<Record<string, unknown>>;
  rules: Array<RuleReference & { scope: string; name: string; payloadSchemaVersion: string; checksum: string }>;
  sources: SourceReference[];
  verifiedAt: string;
};

export async function resolveRegulatedProvenance(
  calculator: RegulatedCalculatorDefinition,
  asOfDate: string,
  database: Database = getDatabase(),
  handlers: Readonly<Record<string, RuleHandler>> = ruleHandlers,
): Promise<RegulatedProvenance> {
  const keys = calculator.ruleDependencies.map((dependency) => dependency.key);
  const definitions = await database.select().from(schema.ruleDefinitions)
    .where(inArray(schema.ruleDefinitions.key, keys));
  const definitionByIdentity = new Map(definitions.map((definition) => [`${definition.key}:${definition.scope}`, definition]));
  const resolved = await Promise.all(calculator.ruleDependencies.map(async (dependency) => {
    const definition = definitionByIdentity.get(`${dependency.key}:${dependency.scope}`);
    if (!definition) throw new RegulatedRuleUnavailableError(dependency.key);
    const version = await resolveRuleVersion(database, definition.id, asOfDate);
    if (!version) throw new RegulatedRuleUnavailableError(dependency.key);
    const handler = handlers[definition.key];
    if (!handler || handler.payloadSchemaVersion !== version.payloadSchemaVersion) {
      throw new RegulatedRuleUnavailableError(dependency.key);
    }
    handler.validatePayload(version.payload as JsonValue);
    return { dependency, definition, version };
  }));
  const versionIds = resolved.map(({ version }) => version.id);
  const sourceRows = await database.select({
    ruleVersionId: schema.ruleVersionSources.ruleVersionId,
    authority: schema.sourceRevisions.authority,
    title: schema.sourceRevisions.title,
    url: schema.sourceRevisions.url,
    publishedOn: schema.sourceRevisions.publishedOn,
    retrievedAt: schema.sourceRevisions.retrievedAt,
    verifiedAt: schema.verificationEvents.verifiedAt,
  }).from(schema.ruleVersionSources)
    .innerJoin(schema.sourceRevisions, eq(schema.sourceRevisions.id, schema.ruleVersionSources.sourceRevisionId))
    .innerJoin(schema.verificationEvents, and(
      eq(schema.verificationEvents.id, schema.ruleVersionSources.verificationEventId),
      eq(schema.verificationEvents.outcome, "verified"),
    ))
    .where(inArray(schema.ruleVersionSources.ruleVersionId, versionIds));
  for (const { dependency, version } of resolved) {
    if (!sourceRows.some((source) => source.ruleVersionId === version.id)) {
      throw new RegulatedRuleUnavailableError(dependency.key);
    }
  }
  const sources = [...new Map(sourceRows.map((source) => [source.url, {
    authority: source.authority,
    title: source.title,
    url: source.url,
    publishedOn: source.publishedOn,
    retrievedAt: source.retrievedAt.toISOString(),
    verifiedAt: source.verifiedAt.toISOString(),
  }])).values()];
  const verifiedAt = sources.map((source) => source.verifiedAt).sort()[0];
  if (!verifiedAt) throw new RegulatedRuleUnavailableError(keys[0] ?? calculator.key);

  return {
    payloads: Object.fromEntries(resolved.map(({ dependency, version }) => [dependency.name, version.payload])),
    rules: resolved.map(({ definition, version }) => ({
      key: definition.key,
      scope: definition.scope,
      name: definition.name,
      version: version.version,
      effectiveFrom: version.effectiveFrom,
      effectiveTo: version.effectiveTo,
      payloadSchemaVersion: version.payloadSchemaVersion,
      checksum: version.checksum,
    })),
    sources,
    verifiedAt,
  };
}
