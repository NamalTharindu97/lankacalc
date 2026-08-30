# LankaCalc Unpublished Calculator Readiness Audit

**Audit date:** 2026-08-29
**Scope:** all registry calculators whose `execution` is not `browser` (22 server-executed candidates).

## Control Statement

This is an evidence-gap audit for operators and reviewers. It **does not authorize publication** of any calculator or rule. It makes no registry, navigation, sitemap, source, rule, or publication-state change. A favorable tier below is only a work-order signal; the production publication workflow and its independent reviewers remain authoritative.

## Readiness Standard

A candidate is production-ready only when all of the following are evidenced together:

- The calculator specification matches the executable input/output contract, formula version, failure behavior, units, precision, and rounding order.
- Every relied-on official instrument or operational publication has a captured source revision; link availability or a transcription alone is insufficient.
- A reviewer independent of implementation has approved formulas, rates, thresholds, effective dates, units, inclusions/exclusions, and rounding.
- The applicable published rule version attaches its official source revisions, successful verification events, review/publication events, checksum-matched validation fixtures, and effective period.
- Golden fixtures cover ordinary, boundary, effective-date, rounding, and fail-closed cases and have independently derived expected results.
- User-facing English, Sinhala, and Tamil content is complete and editorially reviewed by suitable native-language reviewers, including labels, guidance, warnings, errors, assumptions, breakdowns, source titles, and examples.

Tier meanings: **R1** = nearest evidence candidate, still blocked; **R2** = substantial implementation/spec evidence, major review or provenance gaps; **R3** = incomplete or higher-risk evidence package; **R4** = defer pending prerequisite or specialist review. No tier means approved or production-ready.

## Inventory

The table is grouped by readiness tier and is sortable by key. “Tests” means repository automated tests exist, not that legal, accounting, engineering, or editorial review has passed. “Dev rule” refers only to `scripts/seed-dev-rules.ts`.

| Key | Classification | Implementation / tests | Spec / official-source status | Dev rule | Decisive blocker | Tier |
|---|---|---|---|---|---|---|
| `lease` | configurable | Server v1.1.0; lending tests include category/date LTV behavior | v1.1.0 configurable/server spec and lending source dossier align with current code | Yes | Independently review the CBSL source revisions, category mapping, effective date, formulas, rounding, and candidate fixtures | R1 |
| `loan-schedule` | configurable | Server v1.1.0; user/platform AWPR and schedule tests | v1.1.0 spec and lending dossier; observation needs refresh/review | Yes | Refresh current official AWPR revision and independently review observation selection and schedule fixtures | R1 |
| `sscl-check` | regulated | Server v1.0.0; business-tax tests | Detailed spec cites IRD material but explicitly lacks independent content approval | Yes | Complete official source-revision and independent legal/accounting review package | R1 |
| `fuel-cost` | configurable | Server v1.0.0; fuel tests | Spec and fuel dossier exist; exact pump-price source evidence is incomplete | No | Capture exact official dated price source, transcribe/review it, and create validated rule fixtures | R1 |
| `electricity-bill` | regulated | Server v1.0.0; tariff/proration tests | Detailed spec and electricity dossier; candidate calculations only | Yes | Independent tariff/transcription, SSCL, proration, and rounding review | R1 |
| `epf` | regulated | Server v1.0.0; employment tests | Detailed spec and employment dossier; links verified, formula not independently approved | No | Independent statutory earnings/rates/effective-date/rounding review and publishable rule package | R2 |
| `apit` | regulated | Server v1.0.0; employment tests | Detailed spec and employment dossier; links verified, content not independently approved | No | Independent IRD table/formula/effective-date review and publishable rule package | R2 |
| `etf` | regulated | Server v1.0.0; employment tests | Detailed spec and employment dossier; coverage and fractional policy remain material | No | Review coverage instruments, effective dates, 3% formula, units, and rounding after EPF/APIT | R2 |
| `business-income-tax` | regulated | Server v1.0.0; business-tax tests | Spec exists; no dedicated source dossier or demonstrated approval package | No | Assemble official Act/amendment revisions, formal review, and explicit independent golden evidence | R3 |
| `electricity-non-domestic-bill` | regulated | Server v1.0.0; category/tariff tests | Spec and dossier exist; broad tariff transcription is not independently approved | Yes | Resolve official table/source-revision and transcription concerns across every supported category | R3 |
| `freelance-tax-estimate` | regulated | Server v1.0.0; business-tax tests | Detailed draft candidate spec, primary-source boundary, explicit Golden Fixtures, and publication blockers | No | Redesign mixed/foreign-credit inputs, enforce Y/A end date, then obtain independent tax/accounting approval | R3 |
| `gratuity` | regulated | Server v1.0.0; employment tests | Detailed spec and employment dossier; formula questions remain unapproved | No | Independent legal review of coverage, completed-year/partial-year treatment, and fixtures | R3 |
| `overtime` | regulated | Server v1.0.0; employment tests | Detailed spec and employment dossier; hourly-rate basis remains a review question | No | Specialist review of scope, hourly basis, effective date, and rounding | R3 |
| `solar-cost` | configurable | Server v1.0.0; solar tests | Spec and solar dossier exist; assumptions are platform-maintained | No | Establish reviewed assumption revisions, validity policy, and publishable fixtures | R3 |
| `vat-liability` | regulated | Server v1.0.0; business-tax tests | Spec exists; no dedicated source dossier or demonstrated approval package | No | Assemble official VAT revisions and independently review thresholds, dates, units, and fixtures | R3 |
| `withholding-tax` | regulated | Server v2.0.0 candidate; formal specification and fixtures | Input/treatment/precision/effective-date corrections implemented fail-closed; source revisions and independent legal-accounting approval remain | No | Attach reviewed circular/service-scope/form revisions and obtain formal WHT/AIT legal-accounting approval | R3 |
| `job-offer` | regulated | Server v1.0.0; composite employment tests | Detailed composite spec inherits APIT/EPF/ETF evidence | No | Defer until all components pass review, then review annualization and comparison fixtures | R4 |
| `net-to-gross` | regulated | Server v1.0.0; inversion tests | Detailed composite spec inherits APIT/EPF evidence | No | Defer until components pass review, then independently review inversion bounds and fixtures | R4 |
| `salary` | regulated | Server v1.0.0; employment tests | Composite implementation depends on employment rules | No | Defer until APIT/EPF/ETF packages are independently approved and published | R4 |
| `salary-increment` | regulated | Server v1.0.0; composite employment tests | Detailed composite spec inherits APIT/EPF/ETF evidence | No | Defer until components pass review, then review increment convention and comparison fixtures | R4 |
| `take-home` | regulated | Server v1.0.0; composite employment tests | Detailed composite spec inherits APIT/EPF/ETF evidence | No | Defer until each component rule and source set is independently approved and published | R4 |
| `vehicle-import-duty` | regulated | Server v1.0.0; tariff/banding tests | Large candidate table and dossier; row reading is explicitly not customs/legal approval | Yes | Defer pending specialist customs review of every tariff row, tax interaction, date, and fixture | R4 |

## Cross-Cutting Findings

- **No production-ready calculators:** none of the 22 has repository evidence satisfying the complete readiness standard, especially independent approval, published runtime provenance, and native-reviewed EN/SI/TA content.
- **Dev seed is not approval:** `scripts/seed-dev-rules.ts` identifies its actor as `local-smoke-test`. Its records and fixtures support local execution only and must never be treated as reviewed, production-approved, or publishable evidence.
- **Runtime provenance is mandatory:** every server-authoritative result that resolves platform or regulated data must attach the actual applicable rule version, effective date, official source revisions, and latest successful verification time. A spec citation, source URL, seed payload, or empty provenance array is not a substitute; resolution must fail closed when required provenance is absent.
- **Lease documentation is reconciled, not approved:** `docs/calculators/lease.md` now matches server v1.1.0 platform LTV behavior and its candidate fixtures. The CBSL source revisions, category mapping, effective date, formula, rounding, fixtures, and translations still require independent review before publication.
- **Formal tax gaps:** freelance and WHT have explicit candidate fixtures; WHT's identified fail-closed corrections are implemented, while both still require formal independent approval.
- **Non-domestic electricity risk:** the many category, block, time-of-use, fixed, and demand-charge values increase source-table and transcription risk; neither a dev payload nor tests independently validate the official tariff reading.
- **Localization is incomplete:** localization targets and English inventories are not evidence of native-reviewed Sinhala and Tamil. No candidate may clear readiness without recorded EN/SI/TA editorial review.

## Evidence Work Order

1. Independently verify the reconciled lease v1.1.0 package against the CBSL direction, categories, effective date, formulas, rounding, and candidate golden cases.
2. Refresh loan-schedule AWPR observations from the exact official CBSL revision; review date selection, units, rounding, and platform-rate fixtures.
3. Build the SSCL source/revision package and obtain independent legal/accounting review of scope, thresholds, dates, formula, and fixtures.
4. Capture the exact official fuel-price source and date, review transcription, then add a local dev rule with checksum-matched fixtures for smoke testing only.
5. Complete independent review of domestic electricity source revisions, tariff transcription, proration, SSCL, rounding, and golden fixtures.
6. Complete component evidence in dependency order: EPF, then APIT, then ETF; only afterward review salary and the take-home, net-to-gross, salary-increment, and job-offer composites.
7. Defer non-domestic electricity, vehicle import duty, gratuity, overtime, broad business taxes, freelance/WHT, and other high-risk or specialist-dependent items until the priority packages establish a repeatable review workflow.

## Per-Candidate Gate Checklist

Apply this checklist separately to each inventory row; retain reviewer identity, date, evidence links, and outcome for every checked item.

- [ ] Registry metadata, execution mode, classification, dependency keys, and calculation version match code and specification.
- [ ] Input/output schemas, units, bounds, formulas, effective-date selection, failure behavior, and rounding order match executable code.
- [ ] Each official source is captured as an immutable revision and mapped to the exact payload fields it supports; unsupported assumptions are explicit.
- [ ] Independent domain reviewer signs off formulas, dates, units, rounding, transcription, assumptions, and exclusions without relying on implementation-derived expected values.
- [ ] Golden fixtures include normal, boundary, date-transition, rounding, provenance, stale/missing-rule, and fail-closed cases and pass against the reviewed checksum.
- [ ] Reviewed rule version has complete source/verification links, non-overlapping effective dates, review event, publication event, and production applicability.
- [ ] Runtime response demonstrates attached rule/source provenance and rejects unresolved, draft-only, stale-outside-policy, or incomplete evidence.
- [ ] English, Sinhala, and Tamil UI/API editorial content is complete and native-reviewed, with statutory names, units, abbreviations, dates, and warnings preserved.
- [ ] Privacy, logging, analytics, operational rollback, monitoring, and post-publication source-reverification behavior have been checked.
- [ ] A final reviewer confirms all preceding evidence and separately authorizes publication through the production workflow.

## Evidence Map

| Evidence | Repository-relative location | Audit use |
|---|---|---|
| Canonical inventory and metadata | `src/domain/calculators/registry.ts`, `src/domain/calculators/types.ts` | Scope, execution, classification, version contract |
| Lending code and fixtures | `src/domain/calculators/lending-calculators.ts`, `src/domain/calculators/lending-calculators.test.ts` | AWPR, LTV, amortization, effective-date behavior |
| Employment code and fixtures | `src/domain/calculators/employment-calculators.ts`, `src/domain/calculators/employment-calculators.test.ts` | Component and composite formulas |
| Tax code and fixtures | `src/domain/calculators/business-tax-calculators.ts`, `src/domain/calculators/business-tax-calculators.test.ts` | Tax contracts and current test evidence |
| Electricity code and fixtures | `src/domain/calculators/electricity-calculators.ts`, `src/domain/calculators/electricity-calculators.test.ts` | Tariff structures, proration, and transcription surface |
| Other server calculators | `src/domain/calculators/fuel-calculators.ts`, `src/domain/calculators/fuel-calculators.test.ts`, `src/domain/calculators/solar-calculators.ts`, `src/domain/calculators/solar-calculators.test.ts`, `src/domain/calculators/vehicle-import-calculators.ts`, `src/domain/calculators/vehicle-import-calculators.test.ts` | Implementation and automated fixture evidence |
| Candidate specifications | `docs/calculators/` | Declared contracts, provenance requirements, localization targets, golden cases |
| Source dossiers | `docs/lending-rule-sources.md`, `docs/employment-rule-sources.md`, `docs/electricity-rule-sources.md`, `docs/fuel-rule-sources.md`, `docs/solar-rule-sources.md`, `docs/vehicle-import-rule-sources.md` | Source discovery and unresolved review notes; not approval |
| Local-only rules | `scripts/seed-dev-rules.ts` | Smoke-test payloads and fixtures only |
| Rule/runtime controls | `src/server/rules/`, `src/server/db/schema.ts`, `drizzle/` | Resolution, provenance, validation, review, and publication gates |
| API integration evidence | `src/app/api/v1/calculators/`, `src/server/api/calculations.ts` | Server execution and response provenance |
| Localization inventory | `docs/calculators/localization-keys.md` | Coverage inventory only; native-language review records remain required |

The operator should treat missing evidence as a failed gate, not as an invitation to infer approval from implementation quality, test coverage, a reachable official URL, or a locally published seed rule.
