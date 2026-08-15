# Saved Calculation Reports

## Purpose

A signed-in user can turn a saved calculation snapshot into a downloadable PDF. The report reproduces the inputs, result, breakdown, assumptions, warnings, rule versions, and sources exactly as captured when the snapshot was saved. It is a static document; it never re-runs a formula against a live rule version.

## Lifecycle

```text
POST /api/v1/saved-calculations/{id}/report   -> 201 { id, status: "queued" }
GET  /api/v1/reports/{id}                     -> { id, status, downloadUrl, ... }
GET  /api/v1/reports/{id}/download            -> application/pdf
GET  /api/v1/reports                          -> list of my reports
DELETE /api/v1/reports/{id}                   -> delete my report
```

Generation runs in a background job started by `createReport`:

1. `createReport` requires a session, verifies the saved calculation belongs to the caller, and copies its immutable snapshot into the `reports.snapshot` JSONB column with the current `REPORT_VERSION`.
2. `runReportJob` claims the row (`generating`), renders the PDF with `pdfkit` (see `src/server/reports/pdf.ts`), and writes the bytes, byte size, and SHA-256 checksum. It sets an expiring download window.
3. On failure the row is marked `failed` with an `errorMessage`; the UI surfaces it and allows retry.

Statuses: `queued` → `generating` → `ready` | `failed`.

## Signed download URLs

Download URLs are not stored. `buildDownloadUrl` issues:

```text
/api/v1/reports/{id}/download?expires={epochMs}&signature={hex}
```

where the signature is an HMAC-SHA-256 of `` `${reportId}:${expires}` `` using `BETTER_AUTH_SECRET`. `downloadReport` verifies the signature (403 on tamper), then checks the expiry window (410 on expiry), streams the PDF with `Cache-Control: private, no-store`, `Content-Disposition: attachment`, and `X-Content-Type-Options: nosniff`, and records `lastDownloadedAt`. No session cookie is required to follow a link.

## Configuration

Constants live at the top of `src/server/reports/service.ts`:

```text
REPORT_VERSION         = "1"
REPORT_DOWNLOAD_TTL_MS = 60 * 60 * 1000        (60 minutes)
REPORT_RETENTION_MS    = 30 * 24 * 60 * 60 * 1000  (30 days)
STUCK_JOB_TIMEOUT_MS   = 15 * 60 * 1000        (15 minutes)
```

`sweepExpiredReports` deletes `ready` reports older than retention and fails `queued`/`generating` jobs stuck longer than the timeout. Deletes and user deletions cascade to reports through the schema.

## Code layout

```text
src/server/reports/service.ts       lifecycle, ownership, HMAC URLs, sweep
src/server/reports/pdf.ts           pdfkit renderer
src/server/reports/service.test.ts  API behavior against the test database
src/server/db/schema.ts             reports table + report_status enum
src/components/saved-list.tsx       Report / Preparing / Download PDF UI
```
