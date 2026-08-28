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

Use the same Compose files and project name for every command:

```sh
export COMPOSE_ENV_FILES=/etc/lankacalc/production.env
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml config
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml build web migrate
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml up -d db
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml run --rm migrate
docker compose -p lankacalc-production -f compose.yaml -f compose.production.yaml up -d web proxy
APP_BASE_URL=http://127.0.0.1:3100 npm run test:edge
```

Application startup never applies migrations. Back up PostgreSQL before every migration and retain the previous application image for rollback.

## Shared Caddy

Attach Caddy and `lankacalc-production-proxy-1` to `edge`, then proxy the canonical hostname to `lankacalc-production-proxy-1:80`. The fixed edge subnet matches the trusted proxy range in `deploy/nginx.production.conf`; do not widen it or attach untrusted containers.

With Cloudflare, use Full (strict) TLS and a dedicated origin certificate. Do not cache `/api/*`, authentication, saved calculations, reminders, or admin responses. Validate both the Caddy configuration and existing sites before replacing the current ingress container.

## Verification

- `/api/health` confirms process liveness.
- `/api/ready` confirms database readiness.
- `npm run test:edge` confirms health, readiness, and Nginx rate limiting.
- Confirm `/robots.txt`, `/sitemap.xml`, canonical redirects, and structured data after setting the final domain.
- Confirm only SSH, HTTP, and HTTPS are publicly reachable.

Before enabling indexing, run the launch contract against the public hostname. `EXPECTED_SITE_URL` is the canonical metadata origin; `APP_BASE_URL` may point to the public hostname or the private verification port. Set `REDIRECT_FROM_URL` to a secondary hostname such as the apex or `www` variant when that redirect exists.

```sh
EXPECTED_SITE_URL=https://example.lk \
APP_BASE_URL=https://example.lk \
REDIRECT_FROM_URL=https://www.example.lk \
npm run test:launch
```

The verifier requires HTTPS, successful health and readiness checks, the `/en` root redirect, indexable pages, canonical and reciprocal language links, a canonical social image, valid JSON-LD, a canonical sitemap, and working `llms.txt`. It rejects local origins in public metadata. For a loopback rehearsal only, set `ALLOW_INSECURE_LAUNCH_CHECK=true`; never use that override as evidence that the public edge passed.

After the verifier passes, confirm Cloudflare uses proxied DNS, Full (strict) TLS, an origin certificate, no caching for private or API routes, and canonical redirects at the edge. Then submit the canonical sitemap to Google Search Console and Bing Webmaster Tools. Keep `PUBLIC_INDEXING_ENABLED=false` until native-language review is complete and immediately return it to `false` if launch validation fails.

## Backup And Rollback

Create encrypted daily `pg_dump` backups and copy them off the VPS. Test restoration into a temporary database. To roll back application code, start the previously recorded image and rerun health checks; restore the database only when a migration is incompatible with the previous release.
