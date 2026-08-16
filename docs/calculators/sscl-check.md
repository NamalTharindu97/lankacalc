# SSCL Liability And Registration Check Specification

## Identity

- Identifier: `sscl-check`
- Display name: SSCL liability and registration check
- Owner: LankaCalc regulated business and tax calculation kernel
- Classification: regulated
- Calculation version: `1.0.0-candidate`
- Candidate rule version: `sscl-lk-2026-2024-01-01-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent formula/accounting review
- Source research and link verification: 2026-08-16
- Source dossier: `docs/business-and-tax-product-spec.md`

Approval as an implementation candidate does not authorize a public production result. The rule must remain unpublished until an independent reviewer confirms the rate, liable fractions, registration thresholds, exemption scope, rounding, effective dates, and treatment of turnover.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve to the rule effective from `2024-01-01` |
| `turnoverCategory` | enum | — | yes | `importer`, `manufacturer`, `service-provider`, `financial-service`, `land-improvement`, `wholesale-retail-distributor`, or `wholesale-retail-other` |
| `periodEndDate` | string | calendar date | yes | Must be the last day of March, June, September, or December |
| `quarterlyTurnover` | integer | LKR | yes for non-exempt categories | `0` to `10,000,000,000`; whole rupees; optional for `financial-service` |
| `rollingFourQuarterTurnover` | integer | LKR | no | `0` to `10,000,000,000`; whole rupees; completes the annual-threshold leg of the registration check |

`quarterlyTurnover` is total turnover for the quarter ending on `periodEndDate` before deducting the liable fraction. `rollingFourQuarterTurnover` is the total over the current quarter and the previous three. The upper bounds are product safety bounds, not statutory thresholds. For an exempt `financial-service` period, quarterly turnover is optional.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `turnoverCategory` / `turnoverCategoryLabel` | string | — | Selected category and display label |
| `periodStartDate` / `periodEndDate` | string | calendar date | Quarter covered by the estimate |
| `ratePercent` | string | percent | SSCL rate (`2.5`) selected by the rule |
| `rateEffectiveFrom` | string | date | Start of the rate entry that applied |
| `liableFractionPercent` | string | percent | Share of turnover subject to SSCL for this category |
| `quarterlyTurnover` | string | LKR | Turnover entered (whole rupees) |
| `liableTurnover` | string | LKR | `quarterlyTurnover × liableFractionPercent / 100`; `0` when exempt |
| `exemptionApplied` | string | `yes`/`no` | Whether the financial-services exemption applies to the period |
| `registrationStatus` | string | — | `mandatory`, `required`, `not-required`, `indeterminate`, or `exempt` |
| `registrationReason` | string | — | Plain-language explanation of the registration test |
| `deregistrationEligible` | string | `yes`/`no` | Whether four-quarter turnover is below the annual threshold and deregistration may be possible |
| `ssclPayable` | string | LKR | Estimated SSCL for the quarter, or `0.00` when not registrable or exempt |

The breakdown presents the business type, period, rate, liable fraction, turnover, liable turnover, registration conclusion, and estimated SSCL. All LKR values are decimal strings.

## Formula And Rate Convention

Let `T = quarterlyTurnover`, `f` the liable fraction for the category, `r = 2.5%` the SSCL rate, and `exempt` whether the financial-services exemption applies to the quarter. Then:

- `liableTurnover = exempt ? 0 : T × f`
- `ssclPayable = roundToNearestRupee(liableTurnover × r)`

### Rate

| Rate | Effective from | Scope |
|---|---|---|
| `2.5%` | `2024-01-01` | All chargeable turnover under the SSCL Act No. 25 of 2022 as amended |

### Liable fractions

| Category | Liable fraction of turnover |
|---|---|
| `importer` | 100% |
| `manufacturer` | 85% |
| `service-provider` | 100% |
| `financial-service` | 100% (exempt from `2025-12-17` onward) |
| `land-improvement` | 100% |
| `wholesale-retail-distributor` | 25% |
| `wholesale-retail-other` | 50% |

### Registration thresholds

| Effective from | Quarter | Four quarters | Trigger |
|---|---|---|---|
| `2024-01-01` | LKR 15,000,000 | LKR 60,000,000 | Exceeding either triggers registration |
| `2026-07-01` | LKR 9,000,000 | LKR 36,000,000 | Exceeding either triggers registration |

The applicable threshold is the last schedule entry whose `effectiveFrom` is on or before the quarter start date. For a quarter ending `2026-06-30` (start `2026-04-01`) the `15,000,000`/`60,000,000` figures apply; for a quarter ending `2026-09-30` (start `2026-07-01`) the `9,000,000`/`36,000,000` figures apply.

Registration status:

- `exempt` — financial-service period commencing on or after the exemption date.
- `mandatory` — importer of any article, regardless of turnover.
- `required` — quarterly turnover exceeds the quarter threshold, or four-quarter turnover exceeds the annual threshold.
- `not-required` — both turnover figures are known and neither exceeds its threshold.
- `indeterminate` — quarterly turnover is below the quarter threshold but the four-quarter turnover was not provided.

`deregistrationEligible` is `yes` only when the four-quarter turnover is known, is below the annual threshold, the category is not `importer`, and the exemption does not apply.

## Rounding Order

1. Validate all LKR inputs as whole rupees; do not round an input into the contract.
2. Select the rate and the liable fraction for the category; apply the exemption when the quarter starts on or after the exemption date.
3. Compute `liableTurnover = T × f` with exact decimal arithmetic.
4. Compute `ssclPayable = roundToNearestRupee(liableTurnover × r)`, rounding once half up.
5. Serialize LKR values as fixed two-decimal strings.

For example, an importer with `T = 1,000,020` gives `liableTurnover = 1,000,020`, levy `25,000.50`, and `ssclPayable = 25,001.00`. A manufacturer with `T = 20,000,000` gives `liableTurnover = 17,000,000` and `ssclPayable = 425,000.00`.

## Assumptions And Exclusions

- Turnover is the total value of chargeable transactions before the liability fraction; the calculator does not decide whether a transaction is chargeable.
- SSCL is estimated only for a quarter where the business is required or mandatory to register; a below-threshold business is not estimated as paying SSCL.
- The registration threshold is tested on the current quarter and the previous three quarters.
- Financial services subject to VAT at 20.5% are exempt from SSCL for quarters commencing on or after the exemption date; earlier quarters remain subject.
- Exemptions outside the financial-services 20.5% VAT rule, input-credit/offset mechanisms, penalties, and interest are not modelled.
- The threshold figures effective from `2026-07-01` are statutory and are modelled as a dated schedule entry, not as a proposed change.
- A registration decision must be confirmed with the Inland Revenue Department before acting on it.
- The result is an estimate for guidance, not tax, legal, or accounting advice.

## Boundary Cases

- A `periodEndDate` that is not the last day of March, June, September, or December is rejected.
- A missing `quarterlyTurnover` for any non-financial category is rejected.
- A financial-service input may omit both turnover figures and returns `exempt` for an exempt period.
- Without `rollingFourQuarterTurnover` and without a quarterly trigger, the status is `indeterminate` and no SSCL is estimated.
- A quarter with turnover exactly equal to a threshold does not exceed it.
- If `asOfDate` cannot resolve to a reviewed active rule version, calculation fails rather than silently using this candidate.

## Official Sources

- [Social Security Contribution Levy Act, No. 25 of 2022](https://www.ird.gov.lk/en/publications/Social%20Security%20Contribution%20Levy/Social%20Security%20Contribution%20Levy%20Act%20No.%2025%20of%202022.pdf): charge of levy, liable fraction of turnover, and the 2.5% rate.
- [Social Security Contribution Levy (Amendment) Act, No. 29 of 2023](https://www.ird.gov.lk/en/publications/SSCL%20Acts/SSCL%20Amendment%20Act%20No.%2029%20of%202023.pdf): deduction of the liable fraction and related amendments.
- [Social Security Contribution Levy (Amendment) Act, No. 11 of 2025](https://www.ird.gov.lk/en/publications/SSCL%20Acts/SSCL%20Amendment%20Act%20No.%2011%20of%202025.pdf): reduction of registration thresholds to LKR 36,000,000 annual effective from 2026-07-01.
- [Social Security Contribution Levy (Amendment) Act, No. 39 of 2025](https://www.ird.gov.lk/en/publications/SSCL%20Acts/SSCL%20Amendment%20Act%20No.%2039%20of%202025.pdf): exemption of financial services subject to VAT at 20.5% with effect from 2025-12-17.
- [IRD SSCL overview](https://www.ird.gov.lk/en/type%20of%20taxes/sitepages/social%20security%20contribution%20levy.aspx): liable fractions, registration thresholds, and registration obligations.

## Golden Fixtures

All fixtures use `asOfDate: "2026-08-16"` and are candidate fixtures transcribed from the formula above; they require the review gate before production publication.

| Category | Period end | Quarterly turnover | Four-quarter turnover | Rate | Liable turnover | SSCL payable | Registration |
|---|---|---|---|---:|---:|---:|---:|---|
| manufacturer | 2026-06-30 | 20000000 | — | 2.5% | `"17000000"` | `"425000.00"` | required (quarter trigger) |
| manufacturer | 2026-06-30 | 10000000 | 50000000 | 2.5% | `"8500000"` | `"0.00"` | not-required |
| importer | 2026-06-30 | 4000000 | — | 2.5% | `"4000000"` | `"100000.00"` | mandatory |
| wholesale-retail-distributor | 2026-09-30 | 8000000 | 40000000 | 2.5% | `"2000000"` | `"50000.00"` | required (annual trigger) |
| service-provider | 2026-09-30 | 10000000 | — | 2.5% | `"10000000"` | `"250000.00"` | required (new quarter threshold) |
| financial-service | 2026-06-30 | 100000000 | — | 2.5% | `"0"` | `"0.00"` | exempt |
| financial-service | 2025-09-30 | 10000000 | 30000000 | 2.5% | `"10000000"` | `"0.00"` | not-required (pre-exemption) |
| importer | 2026-06-30 | 1000020 | — | 2.5% | `"1000020"` | `"25001.00"` | rounding observable |

## Provenance

Every result must include the resolved calculation version, rule version, effective date, all attached IRD source references, and the latest successful source verification time. The source-link verification date is `2026-08-16`; it is not a substitute for independent content review. Regulated execution is server-authoritative. Missing, draft-only, stale-without-policy, or unresolved rule/source provenance must fail closed rather than return an unversioned result.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.sscl-check.name` | SSCL liability and registration check |
| `calculator.sscl-check.summary` | Check whether a business owes the 2.5% Social Security Contribution Levy and whether it must register, quarter by quarter. |
| `calculator.sscl-check.input.asOfDate` | Calculation date |
| `calculator.sscl-check.input.turnoverCategory` | Business type |
| `calculator.sscl-check.input.periodEndDate` | Quarter ending |
| `calculator.sscl-check.input.quarterlyTurnover` | Quarterly turnover |
| `calculator.sscl-check.input.rollingFourQuarterTurnover` | Four-quarter turnover (optional) |
| `calculator.sscl-check.output.ssclPayable` | SSCL for the quarter |
| `calculator.sscl-check.breakdown.liableFraction` | Liable fraction |
| `calculator.sscl-check.breakdown.registration` | Registration status |
| `calculator.sscl-check.assumption.rate` | SSCL is charged at 2.5% on the liable fraction of turnover. |
| `calculator.sscl-check.warning.estimate` | This candidate estimate still requires independent formula and accounting review before production publication. |
| `calculator.sscl-check.error.periodEnd` | The quarter ending date must be the last day of March, June, September, or December. |
| `calculator.sscl-check.error.ruleUnavailable` | No reviewed SSCL rule is available for this date. |

Translate the complete labels, guidance, formula explanation, breakdown, assumptions, exclusions, source titles, warnings, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve LKR, field identifiers, dates, percentages, and threshold semantics.

## Privacy

The calculator is anonymous. Turnover and results are not persisted by default and raw values must not be captured in logs, analytics, source-verification records, or rule-publication events. A calculation request sends only the required date, category, period, and amounts. Saved scenarios are separate future scope and require an explicit retention and deletion policy.
