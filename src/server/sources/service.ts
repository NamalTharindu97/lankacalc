import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { desc, eq, max, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/server/db/schema";
import { resolveRuleVersion } from "@/server/rules/service";

type Database = PostgresJsDatabase<typeof schema>;

export const officialSourceHosts: ReadonlySet<string> = new Set([
  "ird.gov.lk",
  "www.ird.gov.lk",
  "epf.lk",
  "www.epf.lk",
  "etfb.lk",
  "www.etfb.lk",
  "labourdept.gov.lk",
  "www.labourdept.gov.lk",
  "cbsl.gov.lk",
  "www.cbsl.gov.lk",
  "treasury.gov.lk",
  "www.treasury.gov.lk",
]);

export function isAllowedSourceUrl(rawUrl: string, allowedHosts = officialSourceHosts): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && allowedHosts.has(url.hostname);
  } catch {
    return false;
  }
}

export type SourceDetails = {
  key: string;
  authority: string;
  title: string;
  url: string;
  official: boolean;
  publishedOn?: string | null;
  retrievedAt: Date;
  contentHash?: string | null;
  archiveUrl?: string | null;
  changeNote: string;
};

export async function createSource(database: Database, details: SourceDetails, actor: string) {
  return database.transaction(async (transaction) => {
    const [source] = await transaction.insert(schema.sources).values({
      key: details.key,
      authority: details.authority,
      title: details.title,
      url: details.url,
      official: details.official,
      publishedOn: details.publishedOn,
      retrievedAt: details.retrievedAt,
    }).returning();
    const [revision] = await transaction.insert(schema.sourceRevisions).values({
      sourceId: source.id,
      revision: 1,
      authority: details.authority,
      title: details.title,
      url: details.url,
      official: details.official,
      publishedOn: details.publishedOn,
      retrievedAt: details.retrievedAt,
      contentHash: details.contentHash,
      archiveUrl: details.archiveUrl,
      changeNote: details.changeNote,
      createdBy: actor,
    }).returning();
    return { source, revision };
  });
}

export async function reviseSource(
  database: Database,
  sourceId: string,
  details: Omit<SourceDetails, "key" | "official">,
  actor: string,
) {
  return database.transaction(async (transaction) => {
    await transaction.execute(sql`select id from sources where id = ${sourceId} for update`);
    const [current] = await transaction.select().from(schema.sources).where(eq(schema.sources.id, sourceId));
    if (!current) throw new Error("SOURCE_NOT_FOUND");

    const [revisionCount] = await transaction.select({ value: max(schema.sourceRevisions.revision) })
      .from(schema.sourceRevisions).where(eq(schema.sourceRevisions.sourceId, sourceId));
    const [revision] = await transaction.insert(schema.sourceRevisions).values({
      sourceId,
      revision: (revisionCount.value ?? 0) + 1,
      authority: details.authority,
      title: details.title,
      url: details.url,
      official: current.official,
      publishedOn: details.publishedOn,
      retrievedAt: details.retrievedAt,
      contentHash: details.contentHash,
      archiveUrl: details.archiveUrl,
      changeNote: details.changeNote,
      createdBy: actor,
    }).returning();
    const [source] = await transaction.update(schema.sources).set({
      authority: details.authority,
      title: details.title,
      url: details.url,
      publishedOn: details.publishedOn,
      retrievedAt: details.retrievedAt,
      verifiedAt: null,
      updatedAt: new Date(),
    }).where(eq(schema.sources.id, sourceId)).returning();
    return { source, revision };
  });
}

export async function verifySource(
  database: Database,
  sourceId: string,
  outcome: "verified" | "rejected",
  reason: string,
  actor: string,
) {
  return database.transaction(async (transaction) => {
    await transaction.execute(sql`select id from sources where id = ${sourceId} for update`);
    const [revision] = await transaction.select().from(schema.sourceRevisions)
      .where(eq(schema.sourceRevisions.sourceId, sourceId))
      .orderBy(desc(schema.sourceRevisions.revision)).limit(1);
    if (!revision) throw new Error("SOURCE_NOT_FOUND");
    const [linkCheck] = await transaction.select().from(schema.sourceLinkChecks)
      .where(eq(schema.sourceLinkChecks.sourceRevisionId, revision.id))
      .orderBy(desc(schema.sourceLinkChecks.checkedAt), desc(schema.sourceLinkChecks.id)).limit(1);
    if (outcome === "verified" && (!linkCheck || !(["healthy", "redirected"] as const).includes(linkCheck.status as "healthy" | "redirected"))) {
      throw new Error("HEALTHY_SOURCE_LINK_CHECK_REQUIRED");
    }
    if (outcome === "verified" && revision.contentHash && revision.contentHash !== linkCheck?.contentHash) {
      throw new Error("SOURCE_CONTENT_CHANGED");
    }

    const [event] = await transaction.insert(schema.verificationEvents).values({
      sourceId,
      sourceRevisionId: revision.id,
      outcome,
      verifier: actor,
      reason,
    }).returning();
    await transaction.update(schema.sources).set({
      verifiedAt: outcome === "verified" ? event.verifiedAt : null,
      updatedAt: event.verifiedAt,
    }).where(eq(schema.sources.id, sourceId));
    return event;
  });
}

type HostResolver = (hostname: string) => Promise<string[]>;

const defaultHostResolver: HostResolver = async (hostname) =>
  (await lookup(hostname, { all: true })).map((result) => result.address);

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19));
  }

  const normalized = address.toLowerCase();
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") ||
    normalized.startsWith("fd") || /^fe[89ab]/.test(normalized) || normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:") || normalized.startsWith("::ffff:");
}

async function validateSourceUrl(
  rawUrl: string,
  resolveHost: HostResolver,
  allowedHosts: ReadonlySet<string>,
): Promise<URL> {
  const url = new URL(rawUrl);
  if (!isAllowedSourceUrl(rawUrl, allowedHosts)) {
    throw new Error("UNSAFE_SOURCE_URL");
  }
  if (url.hostname === "localhost" || isIP(url.hostname) && isPrivateAddress(url.hostname)) {
    throw new Error("UNSAFE_SOURCE_URL");
  }
  const addresses = await resolveHost(url.hostname);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error("UNSAFE_SOURCE_URL");
  }
  return url;
}

async function boundedBodyHash(response: Response): Promise<string> {
  const maximumBytes = 2 * 1024 * 1024;
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > maximumBytes) throw new Error("SOURCE_BODY_TOO_LARGE");

  const reader = response.body?.getReader();
  const hash = createHash("sha256");
  let bytesRead = 0;
  if (!reader) return hash.digest("hex");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > maximumBytes) {
      await reader.cancel();
      throw new Error("SOURCE_BODY_TOO_LARGE");
    }
    hash.update(value);
  }
  return hash.digest("hex");
}

export async function checkSourceLink(
  database: Database,
  sourceId: string,
  fetcher: typeof fetch = fetch,
  resolveHost: HostResolver = defaultHostResolver,
  allowedHosts: ReadonlySet<string> = officialSourceHosts,
) {
  const { source, revision } = await database.transaction(async (transaction) => {
    await transaction.execute(sql`select id from sources where id = ${sourceId} for update`);
    const [source] = await transaction.select().from(schema.sources).where(eq(schema.sources.id, sourceId));
    const [revision] = await transaction.select().from(schema.sourceRevisions)
      .where(eq(schema.sourceRevisions.sourceId, sourceId))
      .orderBy(desc(schema.sourceRevisions.revision)).limit(1);
    return { source, revision };
  });
  if (!source || !revision) throw new Error("SOURCE_NOT_FOUND");
  const [previousCheck] = await database.select().from(schema.sourceLinkChecks)
    .where(eq(schema.sourceLinkChecks.sourceRevisionId, revision.id))
    .orderBy(desc(schema.sourceLinkChecks.checkedAt), desc(schema.sourceLinkChecks.id)).limit(1);

  try {
    let currentUrl = await validateSourceUrl(source.url, resolveHost, allowedHosts);
    let response: Response | undefined;
    let redirectCount = 0;
    while (redirectCount <= 5) {
      response = await fetcher(currentUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
        headers: { "user-agent": "LankaCalc-SourceVerifier/1.0" },
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || redirectCount === 5) throw new Error("SOURCE_REDIRECT_LIMIT");
      currentUrl = await validateSourceUrl(new URL(location, currentUrl).toString(), resolveHost, allowedHosts);
      redirectCount += 1;
    }
    if (!response) throw new Error("SOURCE_CHECK_FAILED");
    const contentHash = response.ok ? await boundedBodyHash(response) : null;
    const finalUrl = currentUrl.toString();
    const expectedHash = revision.contentHash ?? previousCheck?.contentHash;
    const status = !response.ok
      ? "broken"
      : expectedHash && expectedHash !== contentHash
        ? "changed"
        : finalUrl !== source.url ? "redirected" : "healthy";
    return database.transaction(async (transaction) => {
      await transaction.execute(sql`select id from sources where id = ${sourceId} for update`);
      const [check] = await transaction.insert(schema.sourceLinkChecks).values({
        sourceId,
        sourceRevisionId: revision.id,
        status,
        httpStatus: response.status,
        finalUrl,
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
        contentHash,
      }).returning();
      if (!(["healthy", "redirected"] as const).includes(status as "healthy" | "redirected")) {
        const [latestRevision] = await transaction.select({ id: schema.sourceRevisions.id })
          .from(schema.sourceRevisions).where(eq(schema.sourceRevisions.sourceId, sourceId))
          .orderBy(desc(schema.sourceRevisions.revision)).limit(1);
        if (latestRevision?.id === revision.id) {
          await transaction.update(schema.sources).set({ verifiedAt: null, updatedAt: new Date() })
            .where(eq(schema.sources.id, sourceId));
        }
      }
      return check;
    });
  } catch (error) {
    return database.transaction(async (transaction) => {
      await transaction.execute(sql`select id from sources where id = ${sourceId} for update`);
      const [check] = await transaction.insert(schema.sourceLinkChecks).values({
        sourceId,
        sourceRevisionId: revision.id,
        status: "error",
        detail: error instanceof Error ? error.message : "Unknown link-check error",
      }).returning();
      const [latestRevision] = await transaction.select({ id: schema.sourceRevisions.id })
        .from(schema.sourceRevisions).where(eq(schema.sourceRevisions.sourceId, sourceId))
        .orderBy(desc(schema.sourceRevisions.revision)).limit(1);
      if (latestRevision?.id === revision.id) {
        await transaction.update(schema.sources).set({ verifiedAt: null, updatedAt: new Date() })
          .where(eq(schema.sources.id, sourceId));
      }
      return check;
    });
  }
}

export async function listSourcesForCalculator(database: Database, calculatorKey: string, asOfDate: string) {
  const definitions = await database.select({ id: schema.ruleDefinitions.id }).from(schema.ruleDefinitions)
    .where(eq(schema.ruleDefinitions.calculatorKey, calculatorKey));
  const resolved = (await Promise.all(definitions.map(({ id }) => resolveRuleVersion(database, id, asOfDate))))
    .filter((version) => version !== null);
  const sourceGroups = await Promise.all(resolved.map((version) => database.select({
    authority: schema.sourceRevisions.authority,
    title: schema.sourceRevisions.title,
    url: schema.sourceRevisions.url,
    publishedOn: schema.sourceRevisions.publishedOn,
    retrievedAt: schema.sourceRevisions.retrievedAt,
    verifiedAt: schema.verificationEvents.verifiedAt,
  }).from(schema.ruleVersionSources)
    .innerJoin(schema.sourceRevisions, eq(schema.sourceRevisions.id, schema.ruleVersionSources.sourceRevisionId))
    .innerJoin(schema.verificationEvents, eq(schema.verificationEvents.id, schema.ruleVersionSources.verificationEventId))
    .where(eq(schema.ruleVersionSources.ruleVersionId, version!.id))));
  return [...new Map(sourceGroups.flat().map((source) => [source.url, source])).values()];
}
