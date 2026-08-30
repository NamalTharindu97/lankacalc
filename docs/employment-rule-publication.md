# Employment Rule Publication

## Scope

The five regulated employment calculators execute only after the required rules have completed the protected source, fixture, review, and publication lifecycle. There are three rule definitions; Salary and Take-home reuse all three rather than duplicating rates.

`npm run db:seed:dev-rules` creates and locally publishes development versions of these definitions with their candidate source and fixture packages. It is for local rule-desk and end-to-end testing only; local publication is not production approval, and the command must never be run in production.

| Definition key | Scope | Owner calculator | Effective date for initial candidate |
|---|---|---|---|
| `apit-primary-regular-monthly` | `standard` | `apit` | `2025-04-01` through `2026-03-31` |
| `epf-standard-contribution` | `standard` | `epf` | `1981-01-01` |
| `etf-standard-contribution` | `standard` | `etf` | `1982-01-01` for the initial broad private-sector scope |

Do not publish these candidates merely to make the calculator return a result. Publication means that a named independent reviewer has confirmed the source text, legal scope, effective date, formula, rounding behavior, exclusions, and every fixture in the corresponding specification.

## Payloads

All three definitions use payload schema version `1`.

### APIT

```json
{
  "rounding": "ceiling-whole-rupee",
  "brackets": [
    { "upperBound": "150000", "rate": "0", "deduction": "0" },
    { "upperBound": "233333", "rate": "0.06", "deduction": "9000" },
    { "upperBound": "275000", "rate": "0.18", "deduction": "37000" },
    { "upperBound": "316667", "rate": "0.24", "deduction": "53500" },
    { "upperBound": "358333", "rate": "0.30", "deduction": "72500" },
    { "rate": "0.36", "deduction": "94000" }
  ]
}
```

### EPF

```json
{
  "employeeRate": "0.08",
  "employerRate": "0.12",
  "rounding": "half-up-cent"
}
```

### ETF

```json
{
  "employerRate": "0.03",
  "rounding": "exact-cent-only"
}
```

ETF-facing forms accept whole-rupee earnings in this version. That keeps a 3% result exact to cents and avoids inventing an unsupported fractional-cent rule.

## Required Sources

Register governing legal instruments and operational guidance as separate official sources. Attach every source needed to understand the supported scope, not only a web page that repeats a percentage.

- APIT: Inland Revenue (Amendment) Act No. 2 of 2025, Table 01 instructions, full Table 01 lookup, and the 2025/2026 employer guideline.
- EPF: EPF Act No. 15 of 1958, Amendment Act No. 26 of 1981, the current earnings definition, and current EPF operational guidance.
- ETF: ETF Act No. 46 of 1980, relevant earnings-definition amendments, the commencement instrument for the supported employer category, and current ETF Board operational guidance.

Use the exact official URLs in `docs/employment-rule-sources.md`. Record a successful link check and a separate content review for each attached revision.

## Fixture Gate

Use every boundary fixture in `docs/calculators/apit.md`, every independent rounding fixture in `docs/calculators/epf.md`, and every exact-cent fixture in `docs/calculators/etf.md`. The executable counterparts are in:

- `src/domain/calculators/employment/employment.test.ts`
- `src/domain/calculators/employment-calculators.test.ts`

The rule desk compares complete structured results. Expected APIT fixtures therefore include the selected bracket metadata, and EPF/ETF fixtures include rates and all contribution totals.

## Publication Sequence

1. Register each official source and immutable revision.
2. Run its official-link check.
3. Record reviewer verification of the content and scope.
4. Create the rule definition and draft using the payload above.
5. Attach every required verified source revision.
6. Add all specification fixtures and run them.
7. Compare any correction against the active version.
8. Have an independent reviewer freeze the draft with a substantive reason.
9. Publish as an administrator only after the review record is complete.
10. Verify the calculator result, `/rules`, and `/sources` responses for the effective date.

Published payloads are immutable. Corrections require a new effective-dated version and must preserve historical resolution.

## Runtime Behavior

Regulated requests fail with HTTP `503` and `RULE_UNAVAILABLE` when any required rule version, supported payload handler, or attached verified source is missing. Salary and Take-home require all three rules for the same `asOfDate`. Results include the exact rule versions, pinned source revisions, retrieval and verification timestamps, and the oldest attached verification time as the conservative aggregate `verifiedAt`.
