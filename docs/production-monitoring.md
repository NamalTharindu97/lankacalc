# Production Monitoring And Incident Runbook

This runbook defines the minimum operational monitoring for LankaCalc's self-hosted production deployment. It is provider-neutral: the operator may use any external uptime, host-metrics, log, and alerting service that satisfies the checks below.

Monitoring is not active merely because this document exists. Record the provider, probe URLs, alert recipients, and successful alert test in the activation record before treating this gate as complete.

## System Boundary

The production request path is Cloudflare, shared Caddy, the private Nginx proxy, Next.js, and PostgreSQL. The Compose project is `lankacalc-production`; the private verification origin is `http://127.0.0.1:3100`.

- `GET /api/health` is process liveness only. It returns `200` without checking PostgreSQL.
- `GET /api/ready` executes a PostgreSQL `SELECT 1`. It returns `200` when the database is reachable and `503` otherwise.
- Docker health checks use `/api/health`, so a database incident may leave the web and proxy containers healthy while `/api/ready` fails.
- Neither endpoint checks Cloudflare, Caddy, DNS, TLS, SMTP, reminder delivery, report generation, published rules, backup freshness, disk space, or application correctness.

Do not put secrets in probe URLs or make authenticated operator endpoints externally monitorable.

## Ownership And Activation Record

Complete this record outside the public repository because it may contain personal contact details:

| Item | Required value |
|---|---|
| Primary operator | Name and alert destination |
| Backup operator | Name and alert destination |
| Hosting contact | Contabo account/escalation route |
| DNS/edge contact | Cloudflare account/escalation route |
| Monitoring provider | Provider and account owner |
| Canonical origin | Public HTTPS origin |
| Status communication | Status page or approved public channel |
| Activated at | UTC timestamp |
| Last alert test | UTC timestamp and evidence link |
| Last incident exercise | UTC timestamp and evidence link |

Store the record in the restricted operator system. Review it quarterly and whenever ownership, domain, infrastructure, or alert routing changes.

## Severity And Response

| Severity | Examples | Acknowledge | Update cadence | Target action |
|---|---|---:|---:|---|
| SEV-1 | Public site unavailable; suspected compromise; data loss or corruption; incorrect regulated result publicly served | 15 minutes | 30 minutes | Contain immediately; recover or disable affected capability |
| SEV-2 | Readiness failure; sustained elevated 5xx; degraded authentication, saves, reports, reminders, or one public route | 30 minutes | 60 minutes | Restore service or fail the affected feature closed |
| SEV-3 | Capacity warning; backup or scheduled-job failure without current data loss; elevated 429; expiring TLS certificate | 1 business day | Daily | Correct before it becomes user-impacting |

If nobody acknowledges within the target, notify the backup operator. If a SEV-1 remains unacknowledged for 30 minutes, use the hosting or edge escalation route as applicable.

## External Probes

Run probes from outside the VPS. Use at least two geographic locations when supported.

| Probe | Interval | Success condition | Alert condition |
|---|---:|---|---|
| Canonical homepage | 1 minute | HTTPS `200`, expected title/content, no redirect loop | 2 consecutive failures |
| `/api/health` | 1 minute | HTTPS `200` and `{"status":"ok"}` | 2 consecutive failures |
| `/api/ready` | 1 minute | HTTPS `200` and `{"status":"ready"}` | 2 consecutive failures |
| Canonical redirect | 5 minutes | Secondary host redirects to the canonical HTTPS origin | 2 consecutive failures |
| Static calculator page | 5 minutes | Representative public calculator returns `200` with expected content | 2 consecutive failures |
| Static calculation API | 5 minutes | Fixed non-sensitive fixture returns the reviewed status and result | 2 consecutive failures |
| Private-publication guard | 15 minutes before launch | `robots.txt`, sitemap, and page metadata remain non-indexable | Any failure while `PUBLIC_INDEXING_ENABLED=false` |
| TLS certificate | Daily | Valid chain and more than 21 days remaining | Fewer than 21 days; critical below 7 days |

Use synthetic fixture values only. Never send real or user-derived financial data from a probe. Do not probe regulated calculators as successful until their reviewed production rules are published; an unpublished regulated calculator should instead be tested for its expected fail-closed response during release verification.

Run `npm run test:launch` after the permanent domain is configured. It is a release/launch contract, not a replacement for continuous monitoring.

## Host And Container Alerts

Collect host and Docker metrics without exposing a public metrics port.

| Signal | Warning | Critical |
|---|---:|---:|
| Root or Docker filesystem usage | 75% for 15 minutes | 90% or fewer than 5 GiB free |
| PostgreSQL volume usage | 75% | 90% |
| Inode usage | 75% | 90% |
| Memory usage | 85% for 15 minutes | 95% for 5 minutes or OOM event |
| CPU usage | 85% for 15 minutes | 95% for 15 minutes |
| Container restart | Any unexpected restart | Restart loop or more than 3 in 15 minutes |
| Container health | Unhealthy for 2 checks | Unhealthy for 5 minutes |
| PostgreSQL connections | 70% of configured capacity | 90% of configured capacity |
| Clock offset | More than 1 second | More than 5 seconds |

Alert on monitoring-agent silence so loss of telemetry is not interpreted as a healthy system.

## HTTP, Job, And Security Signals

Create alerts when the selected monitoring/logging stack can measure these signals:

- HTTP 5xx exceeds 2% of requests for 5 minutes, excluding health probes.
- P95 server response latency exceeds 2 seconds for 10 minutes.
- HTTP 429 exceeds 5% of calculation requests for 10 minutes, or suddenly increases by more than five times its normal baseline.
- Authentication failures or operator-endpoint denials increase sharply from one source or across sources.
- Reminder permanent failures occur, retries remain overdue, or the scheduler stops invoking the worker.
- Report jobs remain processing beyond their retention sweep's stuck-job threshold or fail repeatedly.
- Rule publication, source verification, or privileged operator actions fail unexpectedly.
- Cloudflare, Caddy, or Nginx reports sustained TLS, upstream, or origin errors.
- The newest successful off-server backup exceeds 26 hours or a restore drill exceeds 90 days.

Do not alert on raw request bodies, calculation inputs, saved-calculation contents, report contents, email addresses, tokens, cookies, or database credentials.

## Logging

Production Compose rotates each service's local JSON logs at 10 MB with five files. This bounds local disk use but is not durable centralized retention.

Centralized collection, when activated, must:

- collect Caddy, Nginx, web, worker, and PostgreSQL operational events;
- encrypt logs in transit and at rest, restrict operator access, and record access where supported;
- retain only the shortest period needed for incident response;
- preserve UTC timestamps, service/container, deployment revision, route template, status, duration, and request ID when available;
- redact authorization headers, cookies, query secrets, personal details, and all anonymous financial inputs; and
- avoid indexing full database errors or report error text until redaction has been reviewed.

The calculation route emits structured internal-error events with a generated request ID and calculator key. Not every route currently has end-to-end correlation IDs, so operators must not assume an edge request ID can always be joined to an application event.

Useful local inspection commands:

```sh
export COMPOSE_ENV_FILES=/etc/lankacalc/production.env
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml ps
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml logs --since 30m web proxy db
docker stats --no-stream
df -h
df -i
```

Do not paste unreviewed logs into public issues or chat systems.

## First Response

1. Declare severity, incident owner, start time in UTC, affected functions, and the latest known good deployment.
2. Confirm the alert from a second network or monitoring location.
3. Compare public `/api/health` and `/api/ready` results.
4. Inspect Compose state, recent restarts, host capacity, and bounded recent logs.
5. Check Cloudflare and Caddy only if the private origin is healthy but the public origin is not.
6. Stop risky changes. Preserve the release record, relevant timestamps, request IDs, image IDs, and checksums without copying user inputs.
7. Contain the failure: disable an affected optional capability, keep regulated calculations fail-closed, or return the site to private/non-indexed mode when that is safer.
8. Choose forward fix, application rollback, or database recovery only after checking migration compatibility.
9. Verify recovery from outside the VPS and continue monitoring through a stable observation period.

## Triage Matrix

| Observation | Likely boundary | First actions |
|---|---|---|
| Public health fails; private health succeeds | DNS, Cloudflare, Caddy, or edge network | Check DNS/TLS/Cloudflare status, Caddy config/logs, and `edge` network attachment |
| Health fails publicly and privately | Nginx or web process | Inspect proxy/web health, restarts, OOM, image, and web logs |
| Health succeeds; readiness fails | PostgreSQL | Inspect DB health, connections, storage, locks, and recent migration; do not restart repeatedly without diagnosis |
| Health and readiness succeed; fixture fails | Application release, rules, or data | Compare revision/rule version, reproduce with a synthetic fixture, fail affected calculator closed |
| Rising 429 | Abuse, proxy-address collapse, or valid traffic spike | Confirm real client IP handling, compare Nginx/application limits, inspect source distribution, tune only after diagnosis |
| Disk critical | Logs, images, backups, or PostgreSQL growth | Identify the consumer; preserve required evidence; never delete DB files manually |
| Reminder/report degradation | Worker scheduling, SMTP, or job state | Check scheduler invocation and persisted failure/backlog state; keep core calculations available |
| Suspected token compromise | Secret exposure | Disable affected optional endpoint, rotate only the affected and dependent credentials, review privileged events |
| Incorrect regulated result | Rule/source/formula defect | Disable or retire the affected published rule, preserve version/source evidence, escalate as SEV-1 |

## Rollback And Recovery

For a compatible application regression, use the failed deployment's release record:

```sh
sudo ./scripts/rollback-production.sh /var/lib/lankacalc/releases/<UTC timestamp>.env
```

The script restores the previous application image and reruns edge verification plus the recorded rollback target's private or public contract. A first-public-launch rollback targets private and requires changing `PUBLIC_INDEXING_ENABLED` back to `false`; a later public-to-public rollback keeps it `true` and reuses the recorded canonical origins. A legacy record defaults to private. It does not reverse migrations or restore PostgreSQL. Before rollback:

- compare the failed release's migrations with the previous image;
- prefer a forward fix when the old image cannot safely use the migrated schema;
- verify the recorded image still exists; and
- preserve the pre-migration backup and checksum.

Database restore is a separate disaster-recovery operation. Never restore over production as an exploratory step. First follow the [Production Backup And Restore Runbook](production-backups.md) to restore the selected backup into an isolated PostgreSQL 17 database, verify its checksum, migration state, critical row counts, rule/source history, and account data, then document the approved cutover plan.

## Recovery Verification

After containment or recovery:

1. Run public health and readiness probes.
2. Run `APP_BASE_URL=<origin> npm run test:edge` against the intended origin.
3. While private, run `npm run test:private`; for a public indexed deployment, run the launch contract without the insecure override.
4. Verify the canonical redirect, TLS, representative page, synthetic calculation, and expected regulated fail-closed behavior.
5. Confirm containers remain stable and error rate, latency, disk, memory, and DB connections return to baseline.
6. Verify reminders/reports separately if they were affected.
7. Record the recovered revision, rule versions, database action, checks performed, and recovery time.

Observe a SEV-1 recovery for at least 60 minutes and a SEV-2 recovery for at least 30 minutes before resolving the incident.

## Communication And Review

Publish an external incident update when a public outage exceeds 30 minutes, user data may be affected, or calculator correctness is in doubt. Do not speculate about cause or expose security details. State affected functions, mitigation, current status, and the next update time.

For every SEV-1 and recurring SEV-2, complete a blameless review within five business days:

- UTC timeline, detection method, and duration;
- user and data impact;
- root and contributing causes;
- what contained and restored service;
- why safeguards or alerts did not prevent earlier impact;
- corrective actions with owners and due dates; and
- monitoring, test, runbook, and recovery changes.

Test alert delivery quarterly, exercise edge-versus-origin diagnosis every six months, and perform an isolated database restore at least every 90 days after off-server backups are activated.

## Activation Checklist

- [ ] Primary and backup operators recorded.
- [ ] External homepage, health, readiness, redirect, calculator, and TLS probes configured.
- [ ] Host, disk, PostgreSQL-volume, container-health, restart, and telemetry-silence alerts configured.
- [ ] Alert delivery tested to both operators.
- [ ] Privacy/redaction review completed for collected logs and synthetic probes.
- [ ] Dashboard or equivalent view identifies deployment revision and service health.
- [ ] SEV-1 edge-versus-origin exercise completed.
- [ ] Encrypted off-server backup alert and isolated restore evidence recorded.
- [ ] Public communication route selected.
- [ ] Activation record reviewed and timestamped.

Until every applicable item is evidenced, monitoring remains prepared but not activated and does not satisfy the public-launch operations gate.
