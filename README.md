# LankaCalc

LankaCalc is a web-first collection of transparent calculation and decision tools for Sri Lanka. The foundation release contains anonymous static calculators that run in the browser plus a versioned public API. Regulated calculators will be added only with effective-dated rules, official sources, verification dates, and regression fixtures.

## Requirements

- Node.js 22 or newer
- npm
- Docker with Compose for PostgreSQL and self-hosted deployment

## Local Development

Create `.env` from `.env.example` and replace the development password, then run:

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

## Docker Deployment

Set a strong `POSTGRES_PASSWORD` in `.env`. Build and start PostgreSQL, the web application, and the Nginx edge proxy:

```sh
docker compose up -d --build db web proxy
```

Apply migrations as a separate operator action:

```sh
docker compose --profile tools run --rm migrate
```

Only Nginx publishes the application port. It enforces request-size and calculation-rate limits while replacing client IP headers before forwarding to Next.js. Production should terminate TLS in this Nginx. If a separate trusted proxy terminates TLS, configure Nginx `set_real_ip_from` with only that proxy's CIDR and set the matching `real_ip_header` before deployment; otherwise all users will share the proxy's rate-limit identity. Back up the PostgreSQL volume before storing user data.

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
