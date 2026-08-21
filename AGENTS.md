# Repository Guidance

## Architecture

- This is an npm/Node 22 Next.js 16 App Router modular monolith; PostgreSQL 17 is accessed through Drizzle and supplied by `compose.yaml`.
- `src/domain/calculators/` owns calculator metadata, validation, formulas, and the shared registry. Pages and `/api/v1` routes must use that registry rather than duplicate behavior.
- Keep executable formulas in versioned TypeScript. PostgreSQL stores validated, effective-dated parameters and provenance for server-authoritative calculators, never executable formulas.
- Static calculators run in the browser without PostgreSQL. Regulated calculators fail closed unless their reviewed rules and sources are published; some `configurable` calculators are also server-executed, so inspect `execution`, not only `classification`.
- `src/server/guides/` owns the framework-independent decision engine and graph validation; `src/app/api/v1/guides/` is its HTTP layer.
- Next.js 16 dynamic route `params` are promises and must be awaited.
- Product intent comes from `docs/Sri_Lanka_Web_Application_Service_Research.md`; architecture from `plan/LankaTools_Backend_Plan.md`; sequencing and exit gates from `plan/LankaTools_Implementation_Roadmap.md`. Its older baseline/status prose is partially stale, so executable code and tests win.

## Setup And Commands

- Use Node 22+ and `npm install`; `package-lock.json` is authoritative.
- Create `.env` from `.env.example`. `src/server/env.ts` is the complete server environment contract and also contains optional worker/SMTP settings. Set `SITE_URL` to the public HTTPS origin; secrets/tokens must be at least 32 characters and admin/reviewer tokens must differ.
- Full local setup is `docker compose up -d db`, `npm run db:migrate`, then `npm run dev`. Run `npm run db:seed:dev-rules` when exercising regulated calculators locally.
- `npm run verify` is the required order: `lint -> typecheck -> test -> build`. The test suite includes database integration tests, so PostgreSQL must be running and migrated.
- Run one test file with `npx vitest run <path>`; use `npm run test:watch` for focused iteration.
- `npm run test:edge` requires a running web/proxy deployment and verifies `/api/health`, `/api/ready`, and Nginx rate limiting; override its target with `APP_BASE_URL`.
- After changing `src/server/db/schema.ts`, run `npm run db:generate`, inspect the generated SQL under `drizzle/`, then run `npm run db:migrate`. Application and Docker startup never migrate automatically.
- Production-style migration is an explicit operator step: `docker compose --profile tools run --rm migrate`.
- For self-hosting, layer `compose.production.yaml` over `compose.yaml`; its loopback-only port is for verification while shared Caddy reaches Nginx through the fixed `edge` network. If TLS terminates upstream, preserve the trusted real-IP setup or rate limiting will group all users under the proxy address.

## Delivery Constraints

- Implement calculator behavior as a vertical slice across domain logic, registry metadata, UI/API, specifications under `docs/calculators/`, and tests.
- Regulated formulas require official sources, golden fixtures, effective-dated rules, rule versions, verification dates, and calculation breakdowns before publication.
- Do not log or add analytics for anonymous financial inputs. Accounts are only for explicit persistence features such as saves, reports, and reminders.
- The research catalog is long-term scope, not permission to widen the current implemented slice.

## Git Workflow

- `main` is the integration branch. Use a topic branch for each coherent change, run `npm run verify`, open a PR, and squash-merge; do not push feature work directly to `main`. No repository CI workflow currently enforces verification.
- After merging, fast-forward local `main` before creating the next topic branch.
