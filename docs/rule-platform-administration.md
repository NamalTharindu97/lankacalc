# Rule Platform Administration

## Boundary

The internal API manages structured parameters and publication metadata for formulas implemented in TypeScript. It never accepts or executes stored formula code. Rule handlers must be registered in `src/server/rules/registry.ts` with a payload validator and fixture calculator before a draft can be created.

Public provenance is read through:

```text
GET /api/v1/calculators/{calculator}/rules?asOfDate=YYYY-MM-DD
GET /api/v1/calculators/{calculator}/sources?asOfDate=YYYY-MM-DD
```

## Authentication

`POST /api/internal/rule-platform` requires a bearer token. Tokens must be separate random secrets of at least 32 characters. Actor environment values are written to append-only history.

```text
ADMIN_API_TOKEN
ADMIN_ACTOR
REVIEWER_API_TOKEN
REVIEWER_ACTOR
```

The reviewer token can verify/check sources, run fixtures, compare a draft with the active payload, review a draft, and inspect history. The administrator token can perform every action. Leaving both tokens unset disables administration.

## Operator GUI

Open `/admin/rules` to use the protected rule desk. The GUI provides live source and version registers, guided forms for every lifecycle action, fixture/result output, and quick actions from existing records. It sends the same bounded requests documented below.

The bearer token remains only in React component memory. It is not placed in cookies, local storage, session storage, URLs, or server-rendered markup. Reloading or closing the tab clears it.

## Workflow

All requests are JSON with an `action` discriminator and are limited to 16 KiB at both Nginx and the route.

1. `createSource` creates the canonical source and revision 1.
2. `checkSource` retrieves at most 2 MiB, follows redirects, and records status and SHA-256 metadata.
3. `verifySource` records the verifier, outcome, reason, revision, and time.
4. `createDefinition` creates a rule key, calculator owner, and scope.
5. `createDraft` validates a structured payload through its TypeScript rule handler and calculates its canonical checksum.
6. `updateDraft`, `attachSource`, and `addFixture` prepare evidence while the version is editable.
7. `runFixtures` executes the registered TypeScript handler and persists actual results, pass/fail state, checksum, and a structured diff.
8. `compareRule` reports payload differences from the active version for an `asOfDate`.
9. `reviewRule` attributes review and moves the draft to reviewed.
10. `publishRule` publishes immediately or schedules a future-effective version. It requires review, a verified official source, and passing fixtures for the current checksum. `replacesRuleVersionId` atomically retires a superseded version on the replacement's effective date.
11. `promoteScheduled` records publication when scheduled versions reach their effective Sri Lankan business date.
12. `retireRule` retires an active/scheduled version on an explicit effective date; corrections are new versions, never edits.
13. `ruleHistory` returns the version, fixture evidence, and publication events.
14. `dashboard` returns bounded source, definition, and version summaries for the protected GUI.

The route's Zod discriminated union in `src/app/api/internal/rule-platform/route.ts` is the executable request contract.

## Database Safeguards

- A GiST exclusion constraint transactionally blocks overlapping scheduled/published periods for the same rule definition.
- PostgreSQL triggers reject edits/deletes to published versions and their source/fixture evidence.
- Source revisions, verification events, link checks, and publication events are append-only.
- Source checks accept only the official authority hosts listed in `src/server/sources/service.ts`, reject private/reserved addresses, and revalidate every redirect. Adding another authority requires a reviewed code change.
- A database trigger independently enforces review, verified official-source, and passing-fixture publication gates.
- Future-effective versions remain `scheduled` and resolve only when `asOfDate` enters their effective range.
- Retiring a wrong version preserves it for exact historical references; a corrected version receives a new identifier, semantic version, checksum, and publication event.

## Migration Recovery

Migration `0001` backfills keys for any pre-existing sources before making the key non-null. Apply it through the explicit migration job after taking a PostgreSQL backup.

Before production data is written, a failed deployment can restore the pre-migration backup. Once revisions or rules exist, do not drop the Stage 1 tables or rewrite history; restore service with a forward corrective migration. Validate backup restoration and the explicit migration job in the deployment environment before publishing regulated rules.
