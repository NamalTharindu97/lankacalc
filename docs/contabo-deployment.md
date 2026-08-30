# Contabo Production Deployment

This runbook deploys LankaCalc beside other workloads without publishing PostgreSQL or Next.js. A standalone Caddy instance on the external `edge` network is the only public ingress.

## Server Layout

- Application checkout: `/opt/lankacalc/repository`
- Environment: `/etc/lankacalc/production.env` with mode `600`
- Compose project: `lankacalc-production`
- Shared network: `edge` on `172.30.0.0/24`
- Private verification URL: `http://127.0.0.1:3100`

Create the edge network once:

```sh
docker network create --driver bridge --subnet 172.30.0.0/24 edge
```

## Environment

Copy `.env.example` to `/etc/lankacalc/production.env` and replace every placeholder. Set `SITE_URL` and `BETTER_AUTH_URL` to the same canonical HTTPS origin. Keep `PUBLIC_INDEXING_ENABLED=false` until the permanent domain, native-language review, and launch checks are complete; set it to `true` only for the public launch. Admin, reviewer, worker, database, and auth secrets must be independent random values; leave optional operator tokens unset to disable those capabilities.

Never run `npm run db:seed:dev-rules` in production. Regulated calculators must remain unavailable until independently reviewed rules and sources are published through the production rule workflow.

## Initial Deployment

Use the same Compose files and project name for every command. The `verify` tools image avoids requiring Node or npm on the host:

```sh
export COMPOSE_ENV_FILES=/etc/lankacalc/production.env
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml config
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml build web migrate
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml up -d db
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml run --rm migrate
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml up -d web proxy
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml run --rm verify
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml run --rm verify node scripts/verify-private.mjs
```

Application startup never applies migrations. Back up PostgreSQL before every migration and retain the previous application image for rollback.

## Repeatable Private Release

For pre-launch updates, keep `PUBLIC_INDEXING_ENABLED=false` explicit in `/etc/lankacalc/production.env`, fast-forward the clean checkout to the reviewed commit, and run:

```sh
sudo ./scripts/deploy-production.sh "$(git rev-parse HEAD)"
```

The script refuses a dirty or unexpected revision, validates Compose and the private indexing gate, starts PostgreSQL, creates a compressed pre-migration dump and SHA-256 checksum, records the previous web image, builds the web/migration/verifier images, runs migrations, starts the application, and executes edge plus private-deployment contracts. Defaults are:

- Backups: `/var/backups/lankacalc/pre-release-<UTC timestamp>.sql.gz`
- Release records: `/var/lib/lankacalc/releases/<UTC timestamp>.env`
- Compose project: `lankacalc-production`

Override locations only with `PRODUCTION_ENV_FILE`, `BACKUP_DIRECTORY`, or `RELEASE_DIRECTORY`. Copy encrypted backups off the VPS separately; a local dump is not an off-server backup.

## Repeatable Public Release

Public mode uses the same guarded release path but requires `PUBLIC_INDEXING_ENABLED=true`, a canonical `SITE_URL` match, and a distinct HTTPS redirect origin. Run it only after every gate in [Search Platform Launch Checklist](search-platform-launch.md) is approved:

```sh
sudo EXPECTED_SITE_URL=https://example.lk \
  REDIRECT_FROM_URL=https://www.example.lk \
  PREVIOUS_DEPLOYMENT_VISIBILITY=private \
  ./scripts/deploy-production.sh "$(git rev-parse HEAD)" public
```

Set `PREVIOUS_DEPLOYMENT_VISIBILITY=private` for the first public launch and `public` when the currently running image is already a verified public release. Public mode rebuilds the web image with indexing enabled, performs the pre-migration backup and migrations, runs internal edge verification, then runs the complete launch contract through the canonical public edge. It records deployment and rollback visibility plus the canonical origins. Omitting the mode continues to mean `private`.

## Shared Caddy

Attach Caddy and `lankacalc-production-proxy-1` to `edge`, then proxy the canonical hostname to `lankacalc-production-proxy-1:80`. The fixed edge subnet matches the trusted proxy range in `deploy/nginx.production.conf`; do not widen it or attach untrusted containers.

With Cloudflare, use Full (strict) TLS and a dedicated origin certificate. Do not cache `/api/*`, authentication, saved calculations, reminders, or admin responses. Validate both the Caddy configuration and existing sites before replacing the current ingress container.

## Verification

- `/api/health` confirms process liveness.
- `/api/ready` confirms database readiness.
- `npm run test:edge` confirms health, readiness, and Nginx rate limiting.
- Confirm `/robots.txt`, `/sitemap.xml`, canonical redirects, and structured data after setting the final domain.
- Confirm only SSH, HTTP, and HTTPS are publicly reachable.

Continuous probes, alert thresholds, incident triage, privacy-safe logging, and recovery verification are defined in [Production Monitoring And Incident Runbook](production-monitoring.md). Complete its activation record and alert test before treating production monitoring as operational.

Before enabling indexing, run the launch contract against the public hostname. `EXPECTED_SITE_URL` is the canonical metadata origin; `APP_BASE_URL` may point to the public hostname or the private verification port. Set `REDIRECT_FROM_URL` to a secondary hostname such as the apex or `www` variant when that redirect exists.

```sh
EXPECTED_SITE_URL=https://example.lk \
APP_BASE_URL=https://example.lk \
REDIRECT_FROM_URL=https://www.example.lk \
npm run test:launch
```

The verifier requires HTTPS, successful health and readiness checks, the `/en` root redirect, indexable pages, canonical and reciprocal language links, a canonical social image, valid JSON-LD, a canonical sitemap, and working `llms.txt`. It rejects local origins in public metadata. For a loopback rehearsal only, set `ALLOW_INSECURE_LAUNCH_CHECK=true`; never use that override as evidence that the public edge passed.

After the verifier passes, follow the gated ownership, submission, observation, and indexability rollback procedure in [Search Platform Launch Checklist](search-platform-launch.md). Keep `PUBLIC_INDEXING_ENABLED=false` until every pre-launch gate, including native-language review, is complete and immediately return it to `false` if launch validation fails.

## Backup And Rollback

Activate the encrypted daily off-server backup and isolated restore-verification procedure in [Production Backup And Restore Runbook](production-backups.md). Every guarded release also records `PREVIOUS_WEB_IMAGE`, `DATABASE_BACKUP`, and checksums before migration; that local pre-migration dump is not the daily disaster-recovery copy.

To roll back application code, pass the failed deployment's release record:

```sh
sudo ./scripts/rollback-production.sh /var/lib/lankacalc/releases/<UTC timestamp>.env
```

The rollback script verifies the recorded image still exists, requires the production indexing flag to match `ROLLBACK_VISIBILITY`, retags the image, force-recreates the web and proxy containers without building, and reruns edge checks plus the target private or public contract. A first-public-launch rollback therefore requires returning `PUBLIC_INDEXING_ENABLED` to `false`; later public-to-public rollback keeps it `true`. Legacy records without visibility remain private. The script deliberately does not restore PostgreSQL. Review the migration direction and application compatibility first; restore the recorded dump only when an incompatible migration requires it, and test the restore procedure in an isolated database before using it on production.
