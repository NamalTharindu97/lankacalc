import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/server/db/schema";
import { STUCK_CLAIM_TIMEOUT_MS } from "@/server/reminders/service";
import { REPORT_STUCK_JOB_TIMEOUT_MS } from "@/server/reports/service";

type Database = PostgresJsDatabase<typeof schema>;

type AgedCount = {
  count: number;
  oldestAt: string | null;
  oldestAgeSeconds: number | null;
};

export type OperationalStatus = {
  generatedAt: string;
  thresholdsSeconds: { reminderStaleClaim: number; reportStuck: number };
  reminders: {
    deliveries: Record<"pending" | "claimed" | "sent" | "skipped" | "failed", number>;
    attempts: Record<"success" | "transientFailure" | "permanentFailure" | "skipped", number>;
    overduePending: AgedCount;
    staleClaimed: AgedCount;
    failed: AgedCount;
  };
  reports: {
    jobs: Record<"queued" | "generating" | "completed" | "ready" | "failed", number>;
    stuckQueued: AgedCount;
    stuckGenerating: AgedCount;
    failed: AgedCount;
  };
};

function agedCount(now: Date, count: number, oldestAt: Date | null): AgedCount {
  return {
    count,
    oldestAt: oldestAt?.toISOString() ?? null,
    oldestAgeSeconds: oldestAt === null
      ? null
      : Math.max(0, Math.floor((now.getTime() - oldestAt.getTime()) / 1000)),
  };
}

export async function getOperationalStatus(database: Database, now = new Date()): Promise<OperationalStatus> {
  const staleClaimBefore = new Date(now.getTime() - STUCK_CLAIM_TIMEOUT_MS);
  const stuckReportBefore = new Date(now.getTime() - REPORT_STUCK_JOB_TIMEOUT_MS);
  const nowIso = now.toISOString();
  const staleClaimBeforeIso = staleClaimBefore.toISOString();
  const stuckReportBeforeIso = stuckReportBefore.toISOString();

  const [deliveryRows, attemptRows, reportRows] = await Promise.all([
    database.select({
      pending: sql<number>`count(*) filter (where ${schema.scheduledDeliveries.status} = 'pending')`.mapWith(Number),
      claimed: sql<number>`count(*) filter (where ${schema.scheduledDeliveries.status} = 'claimed')`.mapWith(Number),
      sent: sql<number>`count(*) filter (where ${schema.scheduledDeliveries.status} = 'sent')`.mapWith(Number),
      skipped: sql<number>`count(*) filter (where ${schema.scheduledDeliveries.status} = 'skipped')`.mapWith(Number),
      failed: sql<number>`count(*) filter (where ${schema.scheduledDeliveries.status} = 'failed')`.mapWith(Number),
      overduePending: sql<number>`count(*) filter (where ${schema.scheduledDeliveries.status} = 'pending' and coalesce(${schema.scheduledDeliveries.nextAttemptAt}, ${schema.scheduledDeliveries.scheduledFor}) <= ${nowIso}::timestamptz)`.mapWith(Number),
      oldestOverduePending: sql<Date | null>`min(coalesce(${schema.scheduledDeliveries.nextAttemptAt}, ${schema.scheduledDeliveries.scheduledFor})) filter (where ${schema.scheduledDeliveries.status} = 'pending' and coalesce(${schema.scheduledDeliveries.nextAttemptAt}, ${schema.scheduledDeliveries.scheduledFor}) <= ${nowIso}::timestamptz)`.mapWith(schema.scheduledDeliveries.scheduledFor),
      staleClaimed: sql<number>`count(*) filter (where ${schema.scheduledDeliveries.status} = 'claimed' and ${schema.scheduledDeliveries.updatedAt} <= ${staleClaimBeforeIso}::timestamptz)`.mapWith(Number),
      oldestStaleClaimed: sql<Date | null>`min(${schema.scheduledDeliveries.updatedAt}) filter (where ${schema.scheduledDeliveries.status} = 'claimed' and ${schema.scheduledDeliveries.updatedAt} <= ${staleClaimBeforeIso}::timestamptz)`.mapWith(schema.scheduledDeliveries.updatedAt),
      oldestFailed: sql<Date | null>`min(${schema.scheduledDeliveries.updatedAt}) filter (where ${schema.scheduledDeliveries.status} = 'failed')`.mapWith(schema.scheduledDeliveries.updatedAt),
    }).from(schema.scheduledDeliveries),
    database.select({
      success: sql<number>`count(*) filter (where ${schema.deliveryAttempts.outcome} = 'success')`.mapWith(Number),
      transientFailure: sql<number>`count(*) filter (where ${schema.deliveryAttempts.outcome} = 'transient_failure')`.mapWith(Number),
      permanentFailure: sql<number>`count(*) filter (where ${schema.deliveryAttempts.outcome} = 'permanent_failure')`.mapWith(Number),
      skipped: sql<number>`count(*) filter (where ${schema.deliveryAttempts.outcome} = 'skipped')`.mapWith(Number),
    }).from(schema.deliveryAttempts),
    database.select({
      queued: sql<number>`count(*) filter (where ${schema.reports.status} = 'queued')`.mapWith(Number),
      generating: sql<number>`count(*) filter (where ${schema.reports.status} = 'generating')`.mapWith(Number),
      completed: sql<number>`count(*) filter (where ${schema.reports.status} = 'completed')`.mapWith(Number),
      ready: sql<number>`count(*) filter (where ${schema.reports.status} = 'ready')`.mapWith(Number),
      failed: sql<number>`count(*) filter (where ${schema.reports.status} = 'failed')`.mapWith(Number),
      stuckQueued: sql<number>`count(*) filter (where ${schema.reports.status} = 'queued' and ${schema.reports.requestedAt} <= ${stuckReportBeforeIso}::timestamptz)`.mapWith(Number),
      oldestStuckQueued: sql<Date | null>`min(${schema.reports.requestedAt}) filter (where ${schema.reports.status} = 'queued' and ${schema.reports.requestedAt} <= ${stuckReportBeforeIso}::timestamptz)`.mapWith(schema.reports.requestedAt),
      stuckGenerating: sql<number>`count(*) filter (where ${schema.reports.status} = 'generating' and ${schema.reports.requestedAt} <= ${stuckReportBeforeIso}::timestamptz)`.mapWith(Number),
      oldestStuckGenerating: sql<Date | null>`min(${schema.reports.requestedAt}) filter (where ${schema.reports.status} = 'generating' and ${schema.reports.requestedAt} <= ${stuckReportBeforeIso}::timestamptz)`.mapWith(schema.reports.requestedAt),
      oldestFailed: sql<Date | null>`min(${schema.reports.updatedAt}) filter (where ${schema.reports.status} = 'failed')`.mapWith(schema.reports.updatedAt),
    }).from(schema.reports),
  ]);

  const deliveries = deliveryRows[0]!;
  const attempts = attemptRows[0]!;
  const reports = reportRows[0]!;

  return {
    generatedAt: now.toISOString(),
    thresholdsSeconds: {
      reminderStaleClaim: STUCK_CLAIM_TIMEOUT_MS / 1000,
      reportStuck: REPORT_STUCK_JOB_TIMEOUT_MS / 1000,
    },
    reminders: {
      deliveries: { pending: deliveries.pending, claimed: deliveries.claimed, sent: deliveries.sent, skipped: deliveries.skipped, failed: deliveries.failed },
      attempts: { success: attempts.success, transientFailure: attempts.transientFailure, permanentFailure: attempts.permanentFailure, skipped: attempts.skipped },
      overduePending: agedCount(now, deliveries.overduePending, deliveries.oldestOverduePending),
      staleClaimed: agedCount(now, deliveries.staleClaimed, deliveries.oldestStaleClaimed),
      failed: agedCount(now, deliveries.failed, deliveries.oldestFailed),
    },
    reports: {
      jobs: { queued: reports.queued, generating: reports.generating, completed: reports.completed, ready: reports.ready, failed: reports.failed },
      stuckQueued: agedCount(now, reports.stuckQueued, reports.oldestStuckQueued),
      stuckGenerating: agedCount(now, reports.stuckGenerating, reports.oldestStuckGenerating),
      failed: agedCount(now, reports.failed, reports.oldestFailed),
    },
  };
}
