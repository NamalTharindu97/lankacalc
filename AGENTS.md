# Repository Guidance

## Architecture

- This is an npm-based Next.js 16 App Router modular monolith on Node 22; PostgreSQL is defined through Drizzle and self-hosted with Docker Compose.
- `src/domain/calculators/` is the framework-independent source of calculation behavior and metadata. Pages and `/api/v1` routes must use its registry rather than duplicate formulas.
- Static calculators do not require PostgreSQL. Database tables currently establish calculator/source metadata for future regulated rules.
- `docs/Sri_Lanka_Web_Application_Service_Research.md` is the product source; `plan/LankaTools_Backend_Plan.md` is the architecture blueprint; `plan/LankaTools_Implementation_Roadmap.md` defines execution order and exit criteria.

## Commands

- Install with `npm install`; the lockfile is authoritative.
- Run locally with `npm run dev`; start PostgreSQL separately with `docker compose up -d db` when database work is needed.
- Run verification in order with `npm run verify` (`lint -> typecheck -> test -> build`).
- Run one test file with `npx vitest run <path>`.
- After editing `src/server/db/schema.ts`, run `npm run db:generate`, review generated SQL under `drizzle/`, then run `npm run db:migrate` with `DATABASE_URL` or the discrete `POSTGRES_*` variables set.
- Docker startup does not migrate automatically; use `docker compose --profile tools run --rm migrate` as an explicit deployment step.

## Git Workflow

- `main` is the integration branch. Make each roadmap stage or coherent fix on a topic branch such as `phase-0/stabilize-foundation`, run the required verification, push the branch, open a PR, wait for CI, and squash-merge it into `main`; do not push feature work directly to `main`.
- After merging, update local `main` with a fast-forward pull before creating the next branch.

## Product Constraints

- All documented calculators are long-term scope, but implementation follows `plan/LankaTools_Implementation_Roadmap.md`; do not widen the active stage merely because the catalog is comprehensive.
- For calculator work, distinguish static, configurable, and regulated formulas. Regulated formulas require versioned rules.
- Calculation results should expose official sources, rule versions, last-verified dates, and calculation breakdowns.
- The proposed MVP is web-first and narrow: simple calculations may run entirely in the browser; add backend services only for concrete persistence, account, changing-data, integration, or operational requirements.
- English, Sinhala, and Tamil are long-term localization targets; localization includes explanations, examples, guidance, errors, and calculation descriptions, not only controls.
