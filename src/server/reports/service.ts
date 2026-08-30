import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { and, desc, eq, lt, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getCalculator } from "@/domain/calculators/registry";
import { getSessionUser } from "@/server/auth";
import { getDatabase } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import { getServerEnvironment } from "@/server/env";
import { renderReportPdf } from "@/server/reports/pdf";

type Database = PostgresJsDatabase<typeof schema>;

export type ReportApiResponse = {
  status: number;
  body: unknown;
};

export const REPORT_VERSION = "1";
const REPORT_DOWNLOAD_TTL_MS = 60 * 60 * 1000;
const REPORT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const REPORT_STUCK_JOB_TIMEOUT_MS = 15 * 60 * 1000;

type ReportRow = typeof schema.reports.$inferSelect;

function unauthorized(): ReportApiResponse {
  return {
    status: 401,
    body: {
      error: { code: "UNAUTHORIZED", message: "Sign in to manage your reports." },
    },
  };
}

function notFound(): ReportApiResponse {
  return {
    status: 404,
    body: {
      error: { code: "NOT_FOUND", message: "The report was not found." },
    },
  };
}

async function requireSession(headers: Headers) {
  const session = await getSessionUser(headers);
  if (!session) return null;
  return session;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "calculation";
}

function sha256Hex(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function signingKey(): Buffer {
  return Buffer.from(getServerEnvironment().BETTER_AUTH_SECRET, "utf8");
}

export function buildDownloadUrl(reportId: string, expiresAt: Date): string {
  const expires = expiresAt.getTime().toString();
  const signature = createHmac("sha256", signingKey()).update(`${reportId}:${expires}`).digest("hex");
  return `/api/v1/reports/${reportId}/download?expires=${expires}&sig=${signature}`;
}

function verifyDownloadSignature(reportId: string, expires: string, signature: string): boolean {
  const expected = createHmac("sha256", signingKey()).update(`${reportId}:${expires}`).digest("hex");
  const actual = Buffer.from(signature, "hex");
  const anticipated = Buffer.from(expected, "hex");
  return actual.length === anticipated.length && timingSafeEqual(actual, anticipated);
}

function reportJson(row: ReportRow): Record<string, unknown> {
  const ready = row.status === "ready" && row.downloadExpiresAt !== null && row.downloadExpiresAt.getTime() > Date.now();
  return {
    id: row.id,
    savedCalculationId: row.savedCalculationId,
    status: row.status,
    format: row.format,
    reportVersion: row.reportVersion,
    title: row.title,
    fileName: row.fileName,
    errorMessage: row.errorMessage,
    requestedAt: row.requestedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    downloadExpiresAt: row.downloadExpiresAt?.toISOString() ?? null,
    downloadUrl: ready ? buildDownloadUrl(row.id, row.downloadExpiresAt!) : null,
  };
}

async function findOwnedSavedCalculation(database: Database, userId: string, id: string) {
  return database.query.savedCalculations.findFirst({
    where: and(
      eq(schema.savedCalculations.id, id),
      eq(schema.savedCalculations.userId, userId),
    ),
  });
}

export async function createReport(
  headers: Headers,
  savedCalculationId: string,
  database: Database = getDatabase(),
): Promise<ReportApiResponse> {
  const session = await requireSession(headers);
  if (!session) return unauthorized();

  const saved = await findOwnedSavedCalculation(database, session.user.id, savedCalculationId);
  if (!saved) return notFound();

  const snapshot = await database.query.calculationSnapshots.findFirst({
    where: eq(schema.calculationSnapshots.savedCalculationId, saved.id),
  });
  if (!snapshot) return notFound();

  const row = await database.insert(schema.reports)
    .values({
      userId: session.user.id,
      savedCalculationId: saved.id,
      reportVersion: REPORT_VERSION,
      title: saved.name,
      fileName: `${slugify(saved.name)}-report.pdf`,
      snapshot: {
        savedCalculation: {
          id: saved.id,
          name: saved.name,
          calculatorKey: saved.calculatorKey,
          createdAt: saved.createdAt.toISOString(),
          updatedAt: saved.updatedAt.toISOString(),
        },
        input: snapshot.input,
        result: snapshot.result,
      },
    })
    .returning()
    .then((rows) => rows[0]);

  void runReportJob(row.id, database).catch(() => undefined);

  return { status: 201, body: reportJson(row) };
}

export async function runReportJob(
  reportId: string,
  database: Database = getDatabase(),
): Promise<ReportRow | null> {
  const claimed = await database.update(schema.reports)
    .set({ status: "generating", updatedAt: new Date() })
    .where(and(eq(schema.reports.id, reportId), eq(schema.reports.status, "queued")))
    .returning()
    .then((rows) => rows[0]);
  if (!claimed) return null;

  try {
    const snapshot = claimed.snapshot as {
      savedCalculation: { name: string; createdAt: string; calculatorKey: string };
      input: unknown;
      result: Parameters<typeof renderReportPdf>[0]["result"];
    };
    const calculator = getCalculator(snapshot.result.calculator);
    const pdf = await renderReportPdf({
      title: claimed.title,
      calculatorName: calculator?.name ?? snapshot.result.calculator,
      savedName: snapshot.savedCalculation.name,
      savedCreatedAt: snapshot.savedCalculation.createdAt,
      generatedAt: new Date().toISOString(),
      result: snapshot.result,
    });

    const now = new Date();
    const completed = await database.update(schema.reports)
      .set({
        status: "ready",
        pdf,
        pdfSize: pdf.length,
        pdfChecksum: sha256Hex(pdf),
        downloadExpiresAt: new Date(now.getTime() + REPORT_DOWNLOAD_TTL_MS),
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.reports.id, reportId))
      .returning()
      .then((rows) => rows[0]);

    return completed ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown report generation failure.";
    await database.update(schema.reports)
      .set({ status: "failed", errorMessage: message.slice(0, 2000), updatedAt: new Date() })
      .where(eq(schema.reports.id, reportId));
    return null;
  }
}

export async function listReports(
  headers: Headers,
  database: Database = getDatabase(),
): Promise<ReportApiResponse> {
  const session = await requireSession(headers);
  if (!session) return unauthorized();

  await sweepExpiredReports(database);

  const rows = await database.query.reports.findMany({
    where: eq(schema.reports.userId, session.user.id),
    orderBy: desc(schema.reports.createdAt),
  });

  return { status: 200, body: rows.map(reportJson) };
}

export async function getReport(
  headers: Headers,
  id: string,
  database: Database = getDatabase(),
): Promise<ReportApiResponse> {
  const session = await requireSession(headers);
  if (!session) return unauthorized();

  const row = await database.query.reports.findFirst({
    where: and(eq(schema.reports.id, id), eq(schema.reports.userId, session.user.id)),
  });
  if (!row) return notFound();

  return { status: 200, body: reportJson(row) };
}

export async function downloadReport(
  headers: Headers,
  id: string,
  query: URLSearchParams,
  database: Database = getDatabase(),
): Promise<ReportApiResponse> {
  const row = await database.query.reports.findFirst({ where: eq(schema.reports.id, id) });
  if (!row || row.status !== "ready" || row.pdf === null) return notFound();

  const expires = query.get("expires");
  const signature = query.get("sig");
  if (!expires || !signature || !verifyDownloadSignature(row.id, expires, signature)) {
    return { status: 403, body: { error: { code: "FORBIDDEN", message: "The download link is invalid." } } };
  }

  const now = Date.now();
  const expiresAt = Number(expires);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    return { status: 410, body: { error: { code: "EXPIRED", message: "The download link has expired. Generate a new report." } } };
  }

  await database.update(schema.reports)
    .set({ lastDownloadedAt: new Date(now), updatedAt: new Date(now) })
    .where(eq(schema.reports.id, row.id));

  return {
    status: 200,
    body: {
      pdf: row.pdf,
      fileName: row.fileName,
      contentType: "application/pdf",
    },
  };
}

export async function deleteReport(
  headers: Headers,
  id: string,
  database: Database = getDatabase(),
): Promise<ReportApiResponse> {
  const session = await requireSession(headers);
  if (!session) return unauthorized();

  const deleted = await database.delete(schema.reports)
    .where(and(eq(schema.reports.id, id), eq(schema.reports.userId, session.user.id)))
    .returning()
    .then((rows) => rows[0]);

  if (!deleted) return notFound();

  return { status: 204, body: null };
}

export async function sweepExpiredReports(
  database: Database = getDatabase(),
): Promise<{ purged: number; failedStuck: number }> {
  const cutOff = new Date(Date.now() - REPORT_RETENTION_MS);
  const purgeResult = await database.delete(schema.reports)
    .where(and(eq(schema.reports.status, "ready"), lt(schema.reports.createdAt, cutOff)))
    .returning({ id: schema.reports.id });

  const stuckCutOff = new Date(Date.now() - REPORT_STUCK_JOB_TIMEOUT_MS);
  const failResult = await database.update(schema.reports)
    .set({
      status: "failed",
      errorMessage: "Report generation did not complete in time. Try again.",
      updatedAt: new Date(),
    })
    .where(and(
      or(
        eq(schema.reports.status, "queued"),
        eq(schema.reports.status, "generating"),
      ),
      lt(schema.reports.requestedAt, stuckCutOff),
    ))
    .returning({ id: schema.reports.id });

  return { purged: purgeResult.length, failedStuck: failResult.length };
}
