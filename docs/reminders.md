# Obligation Reminders

## Purpose

A signed-in user can set a reminder for a date-only obligation (e.g. an EPS filing due `2026-09-30`). The reminder is an intent, not a document: instead of the report pipeline copying a snapshot, `createReminder` materializes concrete scheduled deliveries at configurable offsets before the obligation date, each expressed in the user's local timezone. A scheduler endpoint processes deliveries and sends an email through a pluggable delivery provider.

## Lifecycle

```text
POST /api/v1/reminders                      -> 201 { reminder, deliveries }
GET  /api/v1/reminders                      -> { reminders }
GET  /api/v1/reminders/{id}                 -> { reminder, deliveries }
PATCH /api/v1/reminders/{id}                -> cancel / edit title, note, actionUrl
DELETE /api/v1/reminders/{id}               -> 204
GET/PATCH /api/v1/reminders/preferences     -> { emailEnabled, timezone }
GET/POST /api/v1/reminders/unsubscribe?token={token} -> disable email
POST /api/internal/reminders/process        -> process due deliveries
```

`createReminder` requires a session, defaults the timezone from the profile (`Asia/Colombo` fallback) and the offsets to `[30, 7, 1]` days, rejects duplicate offsets and offsets whose scheduled time is already in the past, and inserts the reminder plus one `scheduled_deliveries` row per offset inside a transaction.

Reminder statuses: `active` → `delivered` | `failed` | `cancelled`. Delivery statuses: `pending` → `claimed` → `sent` | `failed` | `skipped`.

## Scheduling

`scheduleOffsets` uses `luxon` with the reminder's IANA timezone: a delivery for offset `N` is scheduled at `obligationDate - N days` at 09:00 local time (e.g. `2026-09-30` in `Asia/Colombo` with offset `1` becomes `2026-09-29T09:00+05:30`, i.e. `03:30Z`). Because the day boundary and 09:00 local time are computed in the user's zone, date-only obligations stay correct across DST transitions and for the region the product targets.

## Delivery processing

`processDueDeliveries(now, provider)` is the scheduler entrypoint (`src/server/reminders/service.ts`). It is idempotent across duplicate runs:

1. `claimDueDeliveries` selects at most `MAX_DELIVERIES_PER_RUN` rows that are due — pending with `scheduledFor <= now` (and no future retry), pending with `nextAttemptAt <= now`, or `claimed` but untouched for longer than `STUCK_CLAIM_TIMEOUT_MS` — with `FOR UPDATE SKIP LOCKED`, then flips them to `claimed` in the same transaction. A second concurrent run can never claim the same rows.
2. Each claimed delivery is checked: skipped if the reminder is no longer `active` (cancelled or deleted) or email notifications are disabled; failed if the account is gone.
3. `processDelivery` records a `delivery_attempts` row, calls `provider.send(message)`, and on success marks the delivery `sent` with `attempts`, `sentAt`, and the provider detail. On failure it retries with backoff `[15m, 1h, 6h, 24h]` up to `MAX_DELIVERY_ATTEMPTS` (4); non-transient failures and exhausted retries mark the delivery `failed`.
4. `reconcileReminder` folds delivery outcomes back into the reminder: any failed delivery → reminder `failed`; every delivery finished (`sent`/`skipped`/`failed`) → reminder `delivered`.

The route at `/api/internal/reminders/process` requires the `WORKER_API_TOKEN` bearer token (compared with a timing-safe constant-time check) so the endpoint is safe to expose to a cron/queue worker.

## Email provider

`src/server/email/provider.ts` defines an `EmailProvider` interface. `getEmailProvider()` returns `SmtpEmailProvider` (nodemailer) when `SMTP_HOST` is configured, otherwise `SimulatedEmailProvider`, which records messages in `console.info` with the simulated delivery time. In development the simulated provider is the default, so the full lifecycle (create → schedule → process → send → reconcile) runs without an SMTP server. The scheduler accepts the provider as an argument, so tests inject a fake that can force transient or permanent failures.

## Unsubscribe

Every email includes a one-click unsubscribe URL built by `buildUnsubscribeUrl`: an HMAC-SHA-256 of `` `${userId}:reminder-unsubscribe` `` under `BETTER_AUTH_SECRET`. `resolveUnsubscribeToken` verifies the token with a timing-safe compare. `unsubscribeByToken` disables `emailEnabled` on the user's preferences and records the `source` (`email-link` or `settings`) and optional reason in `unsubscribe_records`. Disabled email means subsequent deliveries are `skipped` at processing time, so unsubscribe never silently drops a scheduled row.

## Configuration

```text
DEFAULT_OFFSET_DAYS       = [30, 7, 1]
MIN_OFFSET_DAYS           = 1
MAX_OFFSET_DAYS           = 365
MAX_OFFSETS               = 5
DELIVERY_HOUR             = 9 (local time)
MAX_DELIVERY_ATTEMPTS     = 4
DELIVERY_RETRY_BACKOFFS_MS = [15m, 1h, 6h, 24h]
STUCK_CLAIM_TIMEOUT_MS    = 30m
MAX_DELIVERIES_PER_RUN    = 100
```

Environment (`src/server/env.ts`): `WORKER_API_TOKEN`, `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_SECURE` (default false), `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (default `LankaCalc <noreply@lankacalc.local>`). Deletes and user deletion cascade to deliveries and attempts through the schema.

## Code layout

```text
src/server/reminders/service.ts       CRUD, scheduling, unsubscribe, processDueDeliveries
src/server/reminders/service.test.ts  behavior against the test database (14 tests)
src/server/email/provider.ts          EmailProvider, SMTP + simulated implementations
src/app/api/v1/reminders/route.ts     POST/GET reminders
src/app/api/v1/reminders/[id]/route.ts GET/PATCH/DELETE a reminder
src/app/api/v1/reminders/preferences/route.ts
src/app/api/v1/reminders/unsubscribe/route.ts
src/app/api/internal/reminders/process/route.ts  worker endpoint (WORKER_API_TOKEN)
src/app/reminders/page.tsx            reminders UI
src/components/reminders-list.tsx     create/cancel/delete + email toggle
src/server/db/schema.ts               reminders tables + enums (migration 0004)
```
