# ETF Calculator Specification

## Identity

- Identifier: `etf`
- Display name: ETF calculator
- Owner: LankaCalc regulated employment calculation kernel
- Classification: regulated
- Calculation version: `1.0.0-candidate`
- Candidate rule version: `etf-standard-employer-3-percent-whole-rupee-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing with whole-rupee earnings
- Production publication: blocked pending independent formula/accounting review
- Source research and link verification: 2026-08-30
- Source dossier: `docs/employment-rule-sources.md`

The whole-rupee input boundary is material to approval. It avoids an unresolved fractional-cent policy but does not resolve that policy for a future decimal-earnings contract. The calculator implements only employer-funded 3% ETF for employment already determined to be covered.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve to a reviewed standard rule version and supported coverage date |
| `eligibleEarnings` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |

`eligibleEarnings` is the already-determined ETF earnings base for one calendar month. The calculator does not decide coverage or classify payroll components. Finite JSON integers and numeric strings accepted by the shared parser are valid only when they resolve to nonnegative whole LKR. Decimal earnings are rejected, not rounded. The upper bound is a product safety bound, not a statutory cap.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `eligibleEarnings` | string | LKR/month | Validated ETF earnings base |
| `employerContribution` | string | LKR | Employer-only ETF contribution at 3% |

Every monetary output and breakdown value is a fixed two-decimal string. ETF is not an employee contribution or deduction and must never reduce displayed take-home pay.

## Formula And Rate Convention

Let `E = eligibleEarnings`:

```text
employerContribution = E * 0.03
```

The rate is 3% of the supported monthly earnings base and is entirely employer-funded. The employee rate is 0%. The rate must not be combined with EPF or presented as part of an employee deduction.

## Rounding Order

1. Validate `E` as a whole number of LKR; do not round a decimal input into the contract.
2. Multiply `E` by `0.03` using exact decimal arithmetic.
3. Because whole-rupee earnings multiplied by 3% always produce exact cents, apply no monetary rounding.
4. Serialize the exact result as a fixed two-decimal LKR string.

No ETF authority for resolving fractional cents was identified. Therefore this specification defines no fractional-cent rounding mode. Widening the input to accept cents requires a separately approved policy and new fixtures.

## Assumptions And Exclusions

- The calculation covers one calendar month of employment already determined to be covered by standard ETF arrangements.
- The caller has already classified `eligibleEarnings`; the calculator does not decide fund coverage from employer category, employee count, job title, or payment name.
- Higher EPF elections and their ETF Act section 17 coordination, approved-fund interactions, pensionable public employment, self-employed membership, and nonstandard arrangements are excluded.
- Bonuses and lump sums, arrears, and non-cash benefits are outside the salary-family MVP even where a different legal analysis could affect an ETF base.
- APIT cases involving secondary or multiple employment, non-resident non-citizens, employer-paid tax, or cumulative treatment are not handled here.
- Decimal-rupee earnings, remittance deadlines, forms, surcharges, refunds, benefits, registration, and enforcement are excluded.
- The result is an estimate, not a legal coverage decision or payroll/accounting advice.

## Boundary Cases

- Zero eligible earnings produce zero ETF.
- A one-rupee input produces exactly LKR `0.03`.
- Whole-rupee inputs cannot create a fraction of a cent at a 3% rate.
- Any fractional-rupee input is rejected even when its calculated contribution would happen to have exact cents.
- An unavailable effective-dated rule or unsupported coverage date fails closed.

## Official Sources

- [ETF Downloads](https://etfb.lk/downloads/)
- [ETF Employer Details](https://etfb.lk/employer-details/)
- [ETF Payment of Contributions](https://etfb.lk/payment-of-contributions/)
- [ETF Employer FAQ index](https://etfb.lk/employer-faq/)

The rule version must attach ETF Act No. 46 of 1980, applicable amendments, the Gazette instruments establishing the supported employment category's commencement, and current operational guidance as separate sources. The source dossier records the staged coverage dates and explains why Gazette No. 2311/39 changes electronic submission requirements rather than the 3% formula.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `eligibleEarnings: 0` | `employerContribution: "0.00"` |
| `eligibleEarnings: 1` | `employerContribution: "0.03"` |
| `eligibleEarnings: 12345` | `employerContribution: "370.35"` |
| `eligibleEarnings: 100000` | `employerContribution: "3000.00"` |

Invalid-input fixture: `eligibleEarnings: 12345.67` is rejected. Its mathematical product `370.3701` demonstrates why it cannot be accepted without an approved fractional-cent policy.

## Provenance

Every result must include the calculation version, resolved ETF rule version and coverage-effective date, all attached legal, Gazette, and operational sources, and the latest successful source verification time. Link verification on `2026-08-30` confirms availability, not independent formula/accounting approval. Regulated execution is server-authoritative and must fail if a reviewed applicable rule, supported coverage scope, or required source provenance cannot be resolved.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.etf.name` | ETF calculator |
| `calculator.etf.summary` | Estimate the standard monthly employer ETF contribution. |
| `calculator.etf.input.asOfDate` | Calculation date |
| `calculator.etf.input.eligibleEarnings` | ETF-eligible monthly earnings |
| `calculator.etf.output.employerContribution` | Employer ETF contribution |
| `calculator.etf.assumption.standardCovered` | This estimate assumes standard ETF-covered employment. |
| `calculator.etf.assumption.employerOnly` | ETF is paid by the employer and is not deducted from employee pay. |
| `calculator.etf.warning.coverage` | This calculator does not decide whether employment or earnings are covered. |
| `calculator.etf.warning.precision` | This version accepts whole-rupee earnings only. |
| `calculator.etf.warning.estimate` | This candidate estimate still requires independent formula and accounting review before production publication. |
| `calculator.etf.error.wholeRupees` | Enter eligible earnings as a nonnegative whole number of Sri Lankan rupees. |
| `calculator.etf.error.ruleUnavailable` | No reviewed ETF rule is available for this date and coverage scope. |

Translate all labels, guidance, rate and precision explanations, breakdowns, assumptions, exclusions, warnings, source titles, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `ETF`, LKR, percentages, dates, and API field identifiers.

## Privacy

The calculator is anonymous. Earnings and contribution results are not persisted by default, and raw amounts must not appear in logs or analytics. A request sends only the date and eligible earnings. The calculator must not collect employer or employee identity to decide coverage. Saved payroll records are separate future scope requiring access controls, audit, retention, and deletion policies.
