# APIT Calculator Specification

## Identity

- Identifier: `apit`
- Display name: APIT calculator
- Owner: LankaCalc regulated employment calculation kernel
- Classification: regulated
- Calculation version: `1.0.0-candidate`
- Candidate rule version: `apit-primary-regular-monthly-2025-04-01-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent formula/accounting review
- Source research and link verification: 2026-08-30
- Source dossier: `docs/employment-rule-sources.md`

Approval as an implementation candidate does not authorize a public production result. The rule must remain unpublished until an independent reviewer confirms the formula, whole-rupee input contract, full-lookup-derived ceiling, effective date, and scope.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; this candidate resolves only from `2025-04-01` through `2026-03-31` |
| `monthlyRegularEmploymentEarnings` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |

The amount is the already-classified Table 01 earnings for one calendar month of regular profits from primary employment. Finite JSON integers and numeric strings accepted by the shared numeric parser are valid only when their parsed value is a nonnegative whole number of LKR. Missing, blank, fractional, negative, non-finite, boolean, `null`, array, and object values are rejected. The upper bound is a product safety bound, not a statutory threshold.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `monthlyRegularEmploymentEarnings` | string | LKR/month | Validated APIT base |
| `ratePercent` | string | percent | Percentage selected by the applicable Table 01 band |
| `deduction` | string | LKR | Band deduction subtracted by the formula |
| `unroundedApit` | string | LKR | Formula result before the final ceiling |
| `apit` | string | LKR | APIT deduction after ceiling to a whole rupee |

All LKR outputs are decimal strings. `apit` is serialized with two decimal places for the shared money contract, but always has `.00` cents. The breakdown presents the APIT base, selected rate, deduction, unrounded result, final ceiling, and APIT total.

## Formula And Rate Convention

Let `M = monthlyRegularEmploymentEarnings`:

| Condition | Rate | Deduction | Unrounded APIT |
|---|---:|---:|---:|
| `M <= 150000` | 0% | 0 | `0` |
| `150000 < M <= 233333` | 6% | 9000 | `M * 0.06 - 9000` |
| `233333 < M <= 275000` | 18% | 37000 | `M * 0.18 - 37000` |
| `275000 < M <= 316667` | 24% | 53500 | `M * 0.24 - 53500` |
| `316667 < M <= 358333` | 30% | 72500 | `M * 0.30 - 72500` |
| `M > 358333` | 36% | 94000 | `M * 0.36 - 94000` |

These are Table 01's direct monthly percentage-and-deduction formulas. The selected percentage applies to the full monthly APIT base and the stated deduction is then subtracted. Do not recalculate the result by independently rounding tax within marginal slices.

## Rounding Order

1. Validate `M` as a whole number of LKR; do not round an input into the contract.
2. Select exactly one band using the inclusive upper bounds above.
3. Calculate `M * rate - deduction` with exact decimal arithmetic.
4. Apply no intermediate rounding.
5. Apply a mathematical ceiling once to the final positive result, producing the next whole rupee when a fraction exists.
6. Serialize `apit` as a fixed two-decimal LKR string.

The final ceiling is derived from the IRD full Table 01 lookup, not from a generic nearest-rupee product convention. For example, `0.06` becomes LKR `1.00`, and `22500.08` becomes LKR `22501.00`.

## Assumptions And Exclusions

- The calculation covers one calendar month and the regular primary-employment case in Table 01 only.
- The caller has already determined which earnings belong in the APIT base; the calculator does not classify payroll labels or decide tax status.
- Bonuses and other lump sums, arrears, non-cash benefits, secondary or multiple employment, non-resident non-citizens, employer-paid tax and tax-on-tax, and mid-year cumulative cases are excluded.
- EPF/ETF coverage decisions, higher fund rates, approved funds, and nonstandard employment arrangements are outside this calculator.
- APIT dates outside `2025-04-01` through `2026-03-31` require separately reviewed rule versions; this assessment-period formula must not be back- or forward-applied.
- The result is an estimate of the supported Table 01 deduction, not tax, legal, payroll, or accounting advice.

## Boundary Cases

- `0` through `150000` produce zero APIT.
- Every threshold uses the lower band's inclusive upper bound exactly as documented.
- A fractional formula result is always ceiled, including the `316667` result of `22500.08`.
- Fractional-rupee earnings are rejected even when they would appear to fall within a formula band.
- If `asOfDate` cannot resolve to a reviewed active rule version, calculation fails rather than silently using this candidate.

## Official Sources

- [IRD Advance Personal Income Tax Tables](https://www.ird.gov.lk/en/publications/sitepages/apit_tax_tables.aspx?menuid=1502)
- [Inland Revenue (Amendment) Act, No. 2 of 2025](https://www.ird.gov.lk/en/publications/Acts_Income%20Tax_2017/IR_Act_No_02-2025_E.pdf)
- [IRD 2025-2026 APIT Index](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Index/01.%20APIT_2526_Index.pdf)
- [IRD How to apply Table 01](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Table%20-%201/02.%20APIT_2526_Table_01_Text.pdf)
- [IRD Table 01 full lookup](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Table%20-%201/02.%20APIT_2526_Table_01.pdf)
- [IRD 2025-2026 APIT Guideline](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Guide/APIT_2526_Guideline.pdf)

## Golden Fixtures

All fixtures use `asOfDate: "2025-04-01"`. They are independently transcribed/calculated candidates and require the review gate before production publication.

| Earnings `M` | Expected `apit` | Boundary purpose |
|---:|---:|---|
| 149999 | `"0.00"` | Just below 150000 |
| 150000 | `"0.00"` | At 150000 |
| 150001 | `"1.00"` | Just above 150000 |
| 233332 | `"5000.00"` | Just below 233333 |
| 233333 | `"5000.00"` | At 233333 |
| 233334 | `"5001.00"` | Just above 233333 |
| 274999 | `"12500.00"` | Just below 275000 |
| 275000 | `"12500.00"` | At 275000 |
| 275001 | `"12501.00"` | Just above 275000 |
| 316666 | `"22500.00"` | Just below 316667 |
| 316667 | `"22501.00"` | At 316667; ceiling is observable |
| 316668 | `"22501.00"` | Just above 316667 |
| 358332 | `"35000.00"` | Just below 358333 |
| 358333 | `"35000.00"` | At 358333 |
| 358334 | `"35001.00"` | Just above 358333 |

## Provenance

Every result must include the resolved calculation version, rule version, effective date, all attached IRD source references, and the latest successful source verification time. The source-link verification date is `2026-08-30`; it is not a substitute for independent content review. Regulated execution is server-authoritative. Missing, draft-only, stale-without-policy, or unresolved rule/source provenance must fail closed rather than return an unversioned APIT result.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.apit.name` | APIT calculator |
| `calculator.apit.summary` | Estimate monthly APIT for regular profits from primary employment. |
| `calculator.apit.input.asOfDate` | Calculation date |
| `calculator.apit.input.monthlyRegularEmploymentEarnings` | Monthly regular employment earnings |
| `calculator.apit.output.apit` | Monthly APIT |
| `calculator.apit.breakdown.rate` | Applicable rate |
| `calculator.apit.breakdown.deduction` | Formula deduction |
| `calculator.apit.breakdown.ceiling` | Final APIT is rounded up to the next whole rupee. |
| `calculator.apit.assumption.primaryRegular` | This estimate covers one month of regular primary-employment earnings only. |
| `calculator.apit.warning.exclusions` | Special employment payments and arrangements are not supported. |
| `calculator.apit.warning.estimate` | This candidate estimate still requires independent formula and accounting review before production publication. |
| `calculator.apit.error.wholeRupees` | Enter earnings as a nonnegative whole number of Sri Lankan rupees. |
| `calculator.apit.error.ruleUnavailable` | No reviewed APIT rule is available for this date. |

Translate the complete labels, guidance, formula explanation, breakdown, assumptions, exclusions, source titles, warnings, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `APIT`, LKR, field identifiers, dates, percentages, and threshold semantics.

## Privacy

The calculator is anonymous. Employment earnings and results are not persisted by default and raw values must not be captured in logs, analytics, source-verification records, or rule-publication events. A calculation request sends only the required date and earnings amount. Saved payroll or account scenarios are separate future scope and require an explicit retention and deletion policy.
