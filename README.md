# LankaCalc

LankaCalc is a web-first collection of transparent calculation and decision tools for Sri Lanka. The foundation release contains anonymous static calculators and a versioned public API. Regulated calculators will be added only with effective-dated rules, official sources, verification dates, and regression fixtures.

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

## Docker Deployment

Set a strong `POSTGRES_PASSWORD` in `.env`. Build and start PostgreSQL and the web application:

```sh
docker compose up -d --build db web
```

Apply migrations as a separate operator action:

```sh
docker compose --profile tools run --rm migrate
```

Production deployments should place TLS termination in front of the exposed application port and back up the PostgreSQL volume.

## Architecture

- `src/domain/calculators/` contains framework-independent calculator definitions and the registry.
- `src/app/calculators/` renders anonymous calculator pages from registry metadata.
- `src/app/api/v1/` exposes calculator metadata and calculation endpoints.
- `src/server/db/` owns PostgreSQL schema and access.
- `docs/` contains product research.
- `plan/` contains the backend platform blueprint.

The database is not required to execute the initial static calculators. It establishes the source and rule persistence foundation for regulated calculators.
