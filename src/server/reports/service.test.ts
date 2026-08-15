import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  createSavedCalculation,
  deleteSavedCalculation,
  getSavedCalculation,
} from "@/server/api/accounts";
import { signUp, snapshotFixture } from "@/server/api/test-utils";
import { getDatabase } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import {
  buildDownloadUrl,
  createReport,
  deleteReport,
  downloadReport,
  getReport,
  listReports,
  runReportJob,
  sweepExpiredReports,
} from "@/server/reports/service";

const database = getDatabase();

async function saveFixture(headers: Headers, name = "Monthly budget snapshot") {
  const response = await createSavedCalculation(headers, {
    name,
    calculatorKey: "percentage",
    input: { percentage: "20", value: "250" },
    result: snapshotFixture(),
  });
  if (response.status !== 201) throw new Error(`Save failed with status ${response.status}.`);
  const body = response.body as { id: string };
  return body.id;
}

async function waitForStatus(reportId: string, expected: "ready" | "failed", timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await database.query.reports.findFirst({ where: eq(schema.reports.id, reportId) });
    if (row?.status === expected) return;
    if (row?.status && row.status !== "queued" && row.status !== "generating") {
      throw new Error(`Report reached ${row.status} but ${expected} was expected.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Report did not reach ${expected} in time.`);
}

describe("report API", () => {
  it("requires sign-in for report management", async () => {
    const anonymous = new Headers();
    expect((await createReport(anonymous, "00000000-0000-0000-0000-000000000000")).status).toBe(401);
    expect((await listReports(anonymous)).status).toBe(401);
    expect((await getReport(anonymous, "00000000-0000-0000-0000-000000000000")).status).toBe(401);
    expect((await deleteReport(anonymous, "00000000-0000-0000-0000-000000000000")).status).toBe(401);
  });

  it("creates a queued report with an immutable snapshot and generates a ready PDF", async () => {
    const headers = await signUp();
    const savedId = await saveFixture(headers);

    const created = await createReport(headers, savedId);
    expect(created.status).toBe(201);
    const queued = created.body as { id: string; status: string; downloadUrl: string | null };
    expect(queued.status).toBe("queued");
    expect(queued.downloadUrl).toBeNull();

    await waitForStatus(queued.id, "ready");

    const row = await database.query.reports.findFirst({ where: eq(schema.reports.id, queued.id) });
    expect(row).toMatchObject({
      status: "ready",
      format: "pdf",
      reportVersion: "1",
      title: "Monthly budget snapshot",
      fileName: "monthly-budget-snapshot-report.pdf",
    });
    expect(row!.pdf).toBeInstanceOf(Buffer);
    expect(row!.pdf!.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(row!.pdfSize).toBe(row!.pdf!.length);
    expect(row!.pdfChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(row!.downloadExpiresAt).not.toBeNull();
    expect(row!.completedAt).not.toBeNull();
    expect((row!.snapshot as { result: { calculator: string } }).result.calculator).toBe("percentage");

    const fetched = await getReport(headers, queued.id);
    expect(fetched.status).toBe(200);
    const meta = fetched.body as { status: string; downloadUrl: string | null };
    expect(meta.status).toBe("ready");
    expect(meta.downloadUrl).toContain("/api/v1/reports/");
  });

  it("returns the PDF through an expiring signed download link", async () => {
    const headers = await signUp();
    const savedId = await saveFixture(headers);
    const created = await createReport(headers, savedId);
    const reportId = (created.body as { id: string }).id;
    await waitForStatus(reportId, "ready");

    const fetched = await getReport(headers, reportId);
    const meta = fetched.body as { downloadUrl: string };
    const url = new URL(meta.downloadUrl, "http://127.0.0.1:3001");

    const downloaded = await downloadReport(headers, reportId, url.searchParams);
    expect(downloaded.status).toBe(200);
    const payload = downloaded.body as { pdf: Buffer; fileName: string; contentType: string };
    expect(payload.contentType).toBe("application/pdf");
    expect(payload.pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");

    const row = await database.query.reports.findFirst({ where: eq(schema.reports.id, reportId) });
    expect(createHash("sha256").update(payload.pdf).digest("hex")).toBe(row!.pdfChecksum);
    expect(row!.lastDownloadedAt).not.toBeNull();

    const tampered = new URL(url.toString());
    tampered.searchParams.set("sig", `${url.searchParams.get("sig")!.slice(0, -1)}0`);
    expect((await downloadReport(headers, reportId, tampered.searchParams)).status).toBe(403);

    expect((await downloadReport(headers, reportId, new URLSearchParams())).status).toBe(403);
  });

  it("rejects an expired download link with 410", async () => {
    const headers = await signUp();
    const savedId = await saveFixture(headers);
    const created = await createReport(headers, savedId);
    const reportId = (created.body as { id: string }).id;
    await waitForStatus(reportId, "ready");

    const expiredAt = new Date(Date.now() - 60_000);
    await database.update(schema.reports)
      .set({ downloadExpiresAt: expiredAt, updatedAt: new Date() })
      .where(eq(schema.reports.id, reportId));

    const url = new URL(buildDownloadUrl(reportId, expiredAt), "http://127.0.0.1:3001");
    const response = await downloadReport(headers, reportId, url.searchParams);
    expect(response.status).toBe(410);

    const fetched = await getReport(headers, reportId);
    expect((fetched.body as { downloadUrl: string | null }).downloadUrl).toBeNull();
  });

  it("scopes reports to the owning user", async () => {
    const owner = await signUp();
    const other = await signUp();
    const savedId = await saveFixture(owner);

    expect((await createReport(other, savedId)).status).toBe(404);
    expect((await createReport(owner, "00000000-0000-0000-0000-000000000000")).status).toBe(404);

    const created = await createReport(owner, savedId);
    const reportId = (created.body as { id: string }).id;
    await waitForStatus(reportId, "ready");

    expect((await getReport(other, reportId)).status).toBe(404);
    expect((await deleteReport(other, reportId)).status).toBe(404);

    const ownerList = await listReports(owner);
    expect((ownerList.body as Array<{ id: string }>).map((report) => report.id)).toContain(reportId);
    const otherList = await listReports(other);
    expect((otherList.body as Array<{ id: string }>).some((report) => report.id === reportId)).toBe(false);
  });

  it("deletes a report and cascades deletion from the saved calculation", async () => {
    const headers = await signUp();
    const savedId = await saveFixture(headers);
    const created = await createReport(headers, savedId);
    const reportId = (created.body as { id: string }).id;
    await waitForStatus(reportId, "ready");

    expect((await deleteReport(headers, reportId)).status).toBe(204);
    expect((await getReport(headers, reportId)).status).toBe(404);

    const second = await createReport(headers, savedId);
    const secondId = (second.body as { id: string }).id;
    await waitForStatus(secondId, "ready");

    expect((await deleteSavedCalculation(headers, savedId)).status).toBe(204);
    expect((await getReport(headers, secondId)).status).toBe(404);
    expect((await getSavedCalculation(headers, savedId)).status).toBe(404);
  });

  it("purges expired ready reports during retention sweeping", async () => {
    const headers = await signUp();
    const savedId = await saveFixture(headers);
    const created = await createReport(headers, savedId);
    const reportId = (created.body as { id: string }).id;
    await waitForStatus(reportId, "ready");

    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    await database.update(schema.reports)
      .set({ createdAt: oldDate, updatedAt: oldDate, requestedAt: oldDate })
      .where(eq(schema.reports.id, reportId));

    const sweep = await sweepExpiredReports();
    expect(sweep.purged).toBe(1);
    expect((await getReport(headers, reportId)).status).toBe(404);
  });

  it("keeps a queued report failed when generation cannot complete in time", async () => {
    const headers = await signUp();
    const savedId = await saveFixture(headers);
    const saved = await database.query.savedCalculations.findFirst({ where: eq(schema.savedCalculations.id, savedId) });

    const inserted = await database.insert(schema.reports)
      .values({
        userId: saved!.userId,
        savedCalculationId: savedId,
        reportVersion: "1",
        title: "Stuck report",
        fileName: "stuck-report.pdf",
        snapshot: { savedCalculation: {}, input: {}, result: snapshotFixture() },
        requestedAt: new Date(Date.now() - 20 * 60 * 1000),
      })
      .returning()
      .then((rows) => rows[0]);

    const sweep = await sweepExpiredReports();
    expect(sweep.failedStuck).toBe(1);

    const row = await database.query.reports.findFirst({ where: eq(schema.reports.id, inserted.id) });
    expect(row!.status).toBe("failed");
    expect(row!.errorMessage).toContain("did not complete in time");
  });

  it("marks generation as failed when the snapshot is unreadable", async () => {
    const headers = await signUp();
    const savedId = await saveFixture(headers);
    const saved = await database.query.savedCalculations.findFirst({ where: eq(schema.savedCalculations.id, savedId) });

    const inserted = await database.insert(schema.reports)
      .values({
        userId: saved!.userId,
        savedCalculationId: savedId,
        reportVersion: "1",
        title: "Corrupt report",
        fileName: "corrupt-report.pdf",
        snapshot: { savedCalculation: {}, input: {}, result: {} },
      })
      .returning()
      .then((rows) => rows[0]);

    await runReportJob(inserted.id);

    const row = await database.query.reports.findFirst({ where: eq(schema.reports.id, inserted.id) });
    expect(row!.status).toBe("failed");
    expect(row!.errorMessage).toBeTruthy();
  });
});
