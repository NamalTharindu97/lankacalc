# Gratuity Calculator Specification

## Identity

- Identifier: `gratuity`
- Display name: Gratuity calculator
- Owner: LankaCalc WorkMoney statutory employment payment kernel
- Classification: regulated/statutory
- Calculation version: `1.0.0-candidate`
- Candidate rule: `gratuity-payment-act-employment-1983-03-18-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent legal/accounting review of the Payment of Gratuity Act formula and the partial-year question below
- Source research and link verification: 2026-08-15
- Source dossier: `docs/employment-rule-sources.md`

This candidate computes the statutory gratuity under the Payment of Gratuity Act, No. 12 of 1983 for a monthly-rated workman. It does not authorize public production publication, does not cover daily/contract/piece-rated workmen, and does not estimate APIT treatment of the payment.

## Purpose And Scope

WorkMoney asks "what gratuity am I owed when I leave this job?" This calculator answers with the statutory minimum under the Payment of Gratuity Act for the common case: a monthly-rated workman whose employment terminates. It applies the Act's effective-dated eligibility conditions and the half-month-per-completed-year rate, exposes the assumptions the user must confirm, and refuses to produce a result outside the supported scope.

## Statutory Basis

Under the Payment of Gratuity Act, No. 12 of 1983 (commencement 18 March 1983):

- Section 5(1) — an employer who employs or has employed fifteen or more workmen on any day during the twelve months immediately preceding the termination must pay gratuity to a workman who has a period of service of **not less than five completed years**, on termination whether by the employer, the workman, retirement, death, operation of law, or otherwise, within **thirty days** of termination.
- Section 6(2)(a) — for a monthly-rated workman, gratuity is **half a month's wage or salary for each year of completed service**, computed at the rate of wage or salary **last drawn** by the workman.
- Section 7 — the section 5 liability does not apply to a workman employed as a domestic servant or personal chauffeur in a private household, or to a workman entitled to a pension under a non-contributory pension scheme.

The Act rates monthly-rated and other (daily/contract/piece-rated) workmen differently. This candidate covers **monthly-rated workmen only**; other categories return a scope error.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve the gratuity rule; termination date on or after `1983-03-18` |
| `lastDrawnMonthlyWage` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `completedYearsOfService` | integer | years | yes | `0` to `100`, inclusive; whole years only |
| `employerWorkmenAtLeast15` | select | — | yes | `confirmed` or `not-confirmed`; the employer had at least fifteen workmen during the twelve months before termination |
| `notExcludedByAct` | select | — | yes | `confirmed` or `not-confirmed`; the workman is not excluded by section 7 (not a domestic servant or personal chauffeur in a private household, and not entitled to a non-contributory pension) |
| `supportedScenario` | select | — | yes | `confirmed`; same supported primary-employment scenario as the employment family |

`lastDrawnMonthlyWage` is the monthly wage or salary last drawn by the workman at the rate of which gratuity is computed. `completedYearsOfService` is the count of fully completed years of service under the employer; the calculator does not prorate partial years (see the partial-year question below).

Missing, blank, fractional, negative, non-finite, boolean, `null`, array, and object values are rejected for all amount and count fields. Each eligibility confirmation is a three-state select: the placeholder/blank value is a validation error (never a silent negative verdict), while an explicit `confirmed` or `not-confirmed` choice drives the verdict. The scenario confirmation is required; an absent or unconfirmed value is a validation error, not a silent no. All sums must remain within the product safety bound of LKR `1,000,000,000,000`.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `eligibility` | string | — | `"eligible"` when all statutory conditions are met, otherwise `"not-eligible"` |
| `notEligibleReason` | string | — | Present only when not eligible: `"service-below-five-years"`, `"employer-workmen-below-fifteen"`, `"excluded-by-act"`, or `"scope-not-confirmed"`; empty string when eligible |
| `gratuity` | string | LKR | Statutory gratuity, whole rupees; `"0.00"` when not eligible |
| `halfMonthAmount` | string | LKR | `lastDrawnMonthlyWage / 2`, the per-completed-year gratuity amount |
| `ratePerCompletedYear` | string | — | Resolved statutory rate text, e.g. `"half-month"` |
| `completedYearsOfService` | number | years | Echo of the completed-years input |

All LKR outputs are fixed two-decimal strings; whole-rupee fields always end in `.00`. The breakdown presents the last drawn monthly wage, the half-month per-year amount, the completed years, the statutory gratuity, and the thirty-day payment deadline as an assumption. When the workman is not eligible, the result carries `eligibility`, `notEligibleReason`, and `gratuity: "0.00"` and explains which statutory condition failed.

## Formula Definition

Let `W = lastDrawnMonthlyWage`, `Y = completedYearsOfService`, and `C` be the confirmation of the three eligibility conditions (workmen count, section 7 exclusion, supported scenario). Let `g = roundHalfUpRupee(W * 0.5 * Y)`.

```text
eligible = Y >= 5 and C all confirmed
gratuity = eligible ? g : 0
```

`g` is computed exactly, then rounded to the nearest rupee half-up. The statutory text does not prescribe rounding; nearest-rupee half-up is declared as the calculator convention and appears in the assumptions.

## Algorithm

1. Validate the date, wage, and completed years; require all three confirmations.
2. Resolve the gratuity rule for `asOfDate`; if no published rule covers the date, fail the entire calculation.
3. Apply the formula and rounding; build the eligibility verdict with a reason when negative.
4. Return the verdict, the gratuity, the half-month amount, and the echoed inputs.

The algorithm is deterministic and O(1).

## Rounding Order

1. Validate `W` and `Y` as whole values; do not round inputs into the contract.
2. Compute `W * 0.5 * Y` exactly, then round to the nearest rupee half-up for `gratuity`.
3. Serialize every LKR output as a fixed two-decimal string.

Do not round the monthly wage or the half-month amount before multiplying, and do not serialize gratuity with cents.

## Assumptions And Exclusions

- The calculation covers one statutory gratuity under the Payment of Gratuity Act for a monthly-rated workman whose employment has terminated, with the wage rate last drawn.
- The workman must have at least five completed years of service and the employer must have employed at least fifteen workmen during the twelve months before termination; both are user-confirmed, not verified by the tool.
- The workman is not excluded by section 7 (not a domestic servant or personal chauffeur in a private household; not entitled to a non-contributory pension).
- Gratuity is rounded to the nearest rupee half-up as a calculator convention; the Act does not specify rounding.
- Daily, contract, and piece-rated workmen (fourteen days' wage per completed year) are excluded from v1; the calculator returns a scope error for them.
- Partial years are not prorated; only fully completed years count, matching the statutory text. This is an open question for the review gate because some model contracts and Department of Labour practice references prorate partial years.
- APIT treatment of the gratuity payment, employer size verification, termination-cause legal advice, and other statutory termination payments (for example redundancy compensation) are excluded.
- The result is a statutory-minimum estimate, not legal, tax, payroll, or accounting advice.

## Eligibility Reporting

- On success, `eligibility` is `"eligible"`, `notEligibleReason` is `""`, and `gratuity` is the computed statutory amount.
- When any statutory condition fails, `eligibility` is `"not-eligible"` and `notEligibleReason` identifies the first failing condition; `gratuity` is `"0.00"`.
- The result warns that eligibility conditions are user-confirmed and that gratuity is payable within thirty days of termination.

## Boundary Cases

- `W = 100000`, `Y = 5`: eligible, `gratuity` `"250000.00"`.
- `W = 123001`, `Y = 5`: `W * 0.5 * Y = 307502.5`, rounded half-up to `"307503.00"`.
- `Y = 4`: `"not-eligible"`, reason `"service-below-five-years"`, `gratuity` `"0.00"`.
- `Y = 0`: `"not-eligible"`, reason `"service-below-five-years"`.
- `W = 0`, `Y >= 5`: eligible, `gratuity` `"0.00"`.
- Blank eligibility confirmation: validation error, not a silent `"not-eligible"`.
- Explicit `not-confirmed` eligibility choice: `"not-eligible"` with the matching reason (`employer-workmen-below-fifteen` or `excluded-by-act`).
- `asOfDate` before `1983-03-18`: rule unavailable, entire calculation fails.
- If the gratuity rule cannot resolve for `asOfDate`, the entire calculation fails rather than returning a partial result.

## Official Sources

- [Payment of Gratuity Act, No. 12 of 1983 (ss. 5, 6, 7) — Labour Department text](https://labourdept.gov.lk/downloads/labour_code/55.pdf)
- [Payment of Gratuity Act, s. 5 — CommonLII](https://www.commonlii.org/lk/legis/num_act/poga12o1983286/s5.html)
- [Payment of Gratuity Act — Laws of Sri Lanka revised statutes (commencement 18 March 1983)](https://www.srilankalaw.lk/revised-statutes/alphabetical-list-of-statutes/876-payment-of-gratuity-act.html)

The legal instrument and each revised text must be registered as separate sources or revisions as described in the source dossier, with verified link checks.

## Golden Fixtures

All fixtures use `asOfDate: "2026-08-15"` and `supportedScenario: "confirmed"`. Values are independently derived candidates and require the review gate before production publication.

| Inputs | Expected result |
|---|---|
| `W = 100000`, `Y = 5`, confirmations confirmed | `eligibility: "eligible"`, `gratuity: "250000.00"`, `halfMonthAmount: "50000.00"` |
| `W = 123001`, `Y = 5`, confirmations confirmed | `eligibility: "eligible"`, `gratuity: "307503.00"` |
| `W = 250000`, `Y = 11`, confirmations confirmed | `eligibility: "eligible"`, `gratuity: "1375000.00"` |
| `W = 0`, `Y = 5`, confirmations confirmed | `eligibility: "eligible"`, `gratuity: "0.00"` |
| `W = 100000`, `Y = 4`, confirmations confirmed | `eligibility: "not-eligible"`, `notEligibleReason: "service-below-five-years"`, `gratuity: "0.00"` |
| `W = 100000`, `Y = 5`, `employerWorkmenAtLeast15 = not-confirmed` | `eligibility: "not-eligible"`, `notEligibleReason: "employer-workmen-below-fifteen"`, `gratuity: "0.00"` |
| `W = 100000`, `Y = 5`, `notExcludedByAct = not-confirmed` | `eligibility: "not-eligible"`, `notEligibleReason: "excluded-by-act"`, `gratuity: "0.00"` |

## Provenance

Every result must include the calculation version and the independently resolved gratuity rule version, effective date, official source set, and verification time. Link verification on `2026-08-15` does not satisfy independent legal/accounting review of the formula and the partial-year question. The calculation is server-authoritative and atomic: it must not return a gratuity result if the required rule or source is unavailable.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.gratuity.name` | Gratuity calculator |
| `calculator.gratuity.summary` | Estimate the statutory gratuity for a completed service period. |
| `calculator.gratuity.input.asOfDate` | Termination date |
| `calculator.gratuity.input.lastDrawnMonthlyWage` | Last drawn monthly wage |
| `calculator.gratuity.input.lastDrawnMonthlyWage.description` | The monthly wage or salary at which gratuity is computed. |
| `calculator.gratuity.input.completedYearsOfService` | Completed years of service |
| `calculator.gratuity.input.employerWorkmenAtLeast15` | The employer had at least 15 workmen in the 12 months before termination |
| `calculator.gratuity.input.notExcludedByAct` | Not excluded by section 7 of the Payment of Gratuity Act |
| `calculator.gratuity.output.eligibility` | Statutory eligibility |
| `calculator.gratuity.output.gratuity` | Statutory gratuity |
| `calculator.gratuity.output.halfMonthAmount` | Half-month amount per completed year |
| `calculator.gratuity.output.ratePerCompletedYear` | Rate per completed year |
| `calculator.gratuity.assumption.monthlyRated` | The calculation covers a monthly-rated workman only. |
| `calculator.gratuity.assumption.rounded` | Gratuity is rounded to the nearest rupee as a calculator convention. |
| `calculator.gratuity.assumption.thirtyDays` | Gratuity is payable within thirty days of termination. |
| `calculator.gratuity.assumption.partialYears` | Partial years are not prorated; only fully completed years count. |
| `calculator.gratuity.warning.confirmEligibility` | Eligibility conditions are user-confirmed and are not verified by the tool. |
| `calculator.gratuity.error.wholeRupees` | Enter each amount as a nonnegative whole number of Sri Lankan rupees. |
| `calculator.gratuity.error.scopeMonthlyRated` | Only monthly-rated workmen are supported; daily, contract, and piece-rated workmen are out of scope. |
| `calculator.gratuity.error.ruleUnavailable` | A required reviewed employment rule is unavailable for this date. |

Translate all labels, input guidance, formula explanation, breakdowns, assumptions, exclusions, source titles, warnings, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `Payment of Gratuity Act`, LKR, percentages, dates, and API field identifiers.

## Privacy

The calculator is anonymous. Wage and service values are not persisted by default and raw values must not appear in logs, analytics, source checks, or rule audit events. A request sends only the date, the wage, the completed years, and the three confirmations. Saved employment records and payslips are separate future scope requiring explicit consent, authorization, retention, export, and deletion behavior.
