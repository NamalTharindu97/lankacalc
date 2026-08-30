# LankaCalc

LankaCalc is a web-first collection of transparent calculation and decision tools for Sri Lanka. Anonymous static calculators run in the browser, while server-authoritative calculators use effective-dated rules, official sources, verification dates, and regression fixtures.

## Requirements

- Node.js 22 or newer
- npm
- Docker with Compose for PostgreSQL and self-hosted deployment

## Local Development

Create `.env` from `.env.example`, set `SITE_URL` to the public origin outside local development, and replace the development password, then run:

```sh
npm install
docker compose up -d db
npm run db:migrate
npm run dev
```

The app is available at `http://localhost:3000`.

Liveness is available at `/api/health`; database readiness is available at `/api/ready`.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Run the complete sequence with `npm run verify`. Run one test file with:

```sh
npx vitest run src/domain/calculators/static-calculators.test.ts
```

## Database Changes

Edit `src/server/db/schema.ts`, generate a migration, review the SQL under `drizzle/`, and apply it:

```sh
npm run db:generate
npm run db:migrate
```

Migrations are explicit and are not applied during application startup.

## Rule Administration

The temporary Stage 1 operator API is `POST /api/internal/rule-platform`. Set independent random values of at least 32 characters for `ADMIN_API_TOKEN` and `REVIEWER_API_TOKEN`; leave them unset to disable administration. `ADMIN_ACTOR` and `REVIEWER_ACTOR` identify people in immutable verification and publication events.

Send a token as `Authorization: Bearer <token>`. Administrators manage sources, drafts, publication, scheduling, and retirement. Reviewers verify sources, run fixtures, compare draft and active payloads, review drafts, and inspect history. See `docs/rule-platform-administration.md` for request contracts and operational safeguards.

The operator GUI is available at `http://localhost:3000/admin/rules`. Tokens stay in component memory and are cleared by a page reload.

APIT, EPF, ETF, Salary, and Take-home are server-authoritative regulated calculators. They fail closed until their official sources, fixtures, and effective-dated rules are independently reviewed and published. See `docs/employment-rule-publication.md` for the release procedure and `docs/employment-rule-sources.md` for the source dossier.

## Local Docker Stack

Set a development `POSTGRES_PASSWORD` in `.env`. Build and start PostgreSQL, the web application, and the local Nginx proxy:

```sh
docker compose up -d --build db web proxy
```

Apply migrations as a separate operator action:

```sh
docker compose --profile tools run --rm migrate
```

Only the local Nginx proxy publishes the application port. It enforces request-size and calculation-rate limits before forwarding to Next.js. Run `npm run test:edge` against the running stack.

## Self-Hosted Production

Production uses `compose.production.yaml` over `compose.yaml`. PostgreSQL has no host port, Nginx binds only to the loopback verification port, and standalone Caddy on the fixed external `edge` network is the only public origin connection. Cloudflare terminates browser-facing TLS; Caddy connects to Nginx, whose trusted proxy range is restricted by `deploy/nginx.production.conf`.

Production requirements:

- Store the root-owned mode-`600` environment at `/etc/lankacalc/production.env`.
- Set `SITE_URL` and `BETTER_AUTH_URL` to the same canonical HTTPS origin.
- Keep `PUBLIC_INDEXING_ENABLED=false` until every domain, language, monitoring, backup, and search-launch gate passes.
- Apply migrations explicitly; application startup never migrates.
- Never run `npm run db:seed:dev-rules` in production.
- Keep regulated calculators fail-closed until independently reviewed rules and source revisions are published.

Deploy a reviewed private revision from a clean checkout with:

```sh
sudo ./scripts/deploy-production.sh "$(git rev-parse HEAD)"
```

The guarded release creates a pre-migration database dump and checksum, records the previous image, builds and migrates explicitly, starts the stack, and runs edge plus private-indexing verification. Public mode is a separate explicit operation after all launch gates pass. Rollback uses the failed release record and does not restore PostgreSQL.

Operational documentation:

- `docs/contabo-deployment.md`: initial setup, private/public releases, shared Caddy, verification, and rollback.
- `docs/production-monitoring.md`: monitoring, alerting, incident response, and recovery verification.
- `docs/production-backups.md`: encrypted off-server backups and isolated restore exercises.
- `docs/search-platform-launch.md`: indexing activation, Google/Bing submission, observation, and containment.

## Architecture

- `src/domain/calculators/` contains framework-independent calculator definitions and the registry.
- `docs/calculators/` contains the approved behavior, rounding, units, and fixtures for each implemented calculator.
- `src/app/calculators/` renders anonymous calculator pages from registry metadata.
- `src/app/api/v1/` exposes calculator metadata and calculation endpoints.
- `src/server/db/` owns PostgreSQL schema and access.
- `docs/` contains product research.
- `plan/LankaTools_Backend_Plan.md` contains the architecture blueprint.
- `plan/LankaTools_Implementation_Roadmap.md` tracks current gaps, execution order, and completion gates.

The database is not required to execute static calculators. Regulated calculators use the server-authoritative, effective-dated rule and source platform.
