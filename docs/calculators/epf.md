# EPF Calculator Specification

## Identity

- Identifier: `epf`
- Display name: EPF calculator
- Owner: LankaCalc regulated employment calculation kernel
- Classification: regulated
- Calculation version: `1.0.0-candidate`
- Candidate rule version: `epf-standard-covered-employment-1981-01-01-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent formula/accounting review
- Source research and link verification: 2026-08-14
- Source dossier: `docs/employment-rule-sources.md`

The candidate implements only the standard 8% employee and 12% employer contributions for employment already determined to be covered. Approval does not authorize public production publication or a coverage decision.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve to a reviewed standard rule version |
| `eligibleEarnings` | decimal | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; at most 2 decimal places |

`eligibleEarnings` is the already-determined EPF earnings base for one calendar month. The calculator does not accept payroll-component labels and does not decide whether the employment, employer, or payment is covered. Finite JSON numbers and numeric strings accepted by the shared parser are valid only when they resolve to nonnegative LKR with at most two decimal places. The upper bound is a product safety bound, not a statutory cap.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `eligibleEarnings` | string | LKR/month | Validated EPF earnings base |
| `employeeContribution` | string | LKR | Employee EPF contribution at 8% |
| `employerContribution` | string | LKR | Employer EPF contribution at 12% |
| `totalContribution` | string | LKR | Sum of the separately rounded contributions |

Every monetary output and breakdown value is a fixed two-decimal string. The employee contribution is an employee deduction; the employer contribution is additional to pay and must not be subtracted from take-home.

## Formula And Rate Convention

Let `E = eligibleEarnings`:

```text
employeeContribution = roundEpfContribution(E * 0.08)
employerContribution = roundEpfContribution(E * 0.12)
totalContribution = employeeContribution + employerContribution
```

The 8% and 12% rates create separate statutory contributions. The displayed 20% total is their sum, not an independently calculated contribution. Do not calculate `round(E * 0.20)` as the authoritative total.

## Rounding Order

1. Validate `E`; do not round an input with more than two decimal places into the contract.
2. Calculate `E * 0.08` and `E * 0.12` separately with exact decimal arithmetic.
3. Apply EPF Act section 13 independently to each contribution: discard a fraction below half a cent and count a fraction equal to or above half a cent as one cent.
4. Add the two rounded contribution amounts to obtain `totalContribution`.
5. Serialize all amounts as fixed two-decimal LKR strings.

This is nearest-cent, half-up rounding. Decimal earnings can produce fractions of a cent, so the statutory order is observable and must not be replaced by binary floating-point rounding. Salary and take-home use whole-rupee component inputs, but the standalone EPF calculator accepts cents.

## Assumptions And Exclusions

- The calculation covers one calendar month of employment already determined to be covered by standard EPF arrangements.
- The caller has already classified `eligibleEarnings`; the calculator does not determine fund coverage from job title, employer, employee count, or payment name.
- Higher rates elected under EPF Act section 11, approved provident funds, approved contributory pension schemes, pensionable public employment, and other nonstandard arrangements are excluded.
- Bonuses and lump sums, arrears, and non-cash benefits are outside the salary-family MVP even where a different legal analysis could affect an EPF base.
- APIT cases involving secondary or multiple employment, non-resident non-citizens, employer-paid tax, or cumulative treatment are not handled here.
- Remittance deadlines, forms, surcharges, interest, refunds, benefits, registration, and enforcement are excluded.
- The result is an estimate, not a legal coverage decision or payroll/accounting advice.

## Boundary Cases

- Zero eligible earnings produce zero employee, employer, and total contributions.
- A one-rupee input produces exact contributions of LKR `0.08` and `0.12`.
- Earnings with more than two decimal places are rejected rather than rounded into the input contract.
- Decimal earnings can make the separately rounded total differ from a separately calculated 20% amount.
- An unavailable effective-dated rule fails closed rather than using the latest rates without provenance.

## Official Sources

- [EPF Act and Amendments](https://epf.lk/?page_id=246)
- [What is EPF](https://epf.lk/?page_id=2)
- [Remitting Contributions](https://epf.lk/?p=171)
- [EPF Employer FAQ](https://epf.lk/?page_id=811)
- [Becoming a Member](https://epf.lk/?p=203)
- [Registering for EPF](https://epf.lk/?p=163)

The rule version must attach the EPF Act No. 15 of 1958, Employees' Provident Fund (Amendment) Act No. 26 of 1981 for the rates and effective date, Employees' Provident Fund (Amendment) Act No. 1 of 1985 for the current earnings definition, and current operational guidance as separate source records or revisions.

## Golden Fixtures

These are candidate calculations, not official worked examples. The decimal fixtures exercise statutory per-contribution rounding.

| Input | Expected result |
|---|---|
| `eligibleEarnings: 0` | `employeeContribution: "0.00"`, `employerContribution: "0.00"`, `totalContribution: "0.00"` |
| `eligibleEarnings: 1` | `employeeContribution: "0.08"`, `employerContribution: "0.12"`, `totalContribution: "0.20"` |
| `eligibleEarnings: 12345.67` | `employeeContribution: "987.65"`, `employerContribution: "1481.48"`, `totalContribution: "2469.13"` |
| `eligibleEarnings: 100.05` | `employeeContribution: "8.00"`, `employerContribution: "12.01"`, `totalContribution: "20.01"` |
| `eligibleEarnings: 100.04` | `employeeContribution: "8.00"`, `employerContribution: "12.00"`, `totalContribution: "20.00"` |
| `eligibleEarnings: 100000` | `employeeContribution: "8000.00"`, `employerContribution: "12000.00"`, `totalContribution: "20000.00"` |

At `100.04`, the independently calculated 20% amount would round to `20.01`; the authoritative total remains `20.00` because the 8% and 12% liabilities are rounded separately before addition.

## Provenance

Every result must include the calculation version, resolved EPF rule version and effective date, attached legal and operational sources, and latest successful source verification time. Link verification on `2026-08-14` confirms source availability, not independent formula/accounting approval. Regulated execution is server-authoritative and must fail if a reviewed applicable rule or required source provenance cannot be resolved.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.epf.name` | EPF calculator |
| `calculator.epf.summary` | Estimate standard monthly employee and employer EPF contributions. |
| `calculator.epf.input.asOfDate` | Calculation date |
| `calculator.epf.input.eligibleEarnings` | EPF-eligible monthly earnings |
| `calculator.epf.output.employeeContribution` | Employee EPF contribution |
| `calculator.epf.output.employerContribution` | Employer EPF contribution |
| `calculator.epf.output.totalContribution` | Total EPF contribution |
| `calculator.epf.assumption.standardCovered` | This estimate assumes standard EPF-covered employment. |
| `calculator.epf.warning.coverage` | This calculator does not decide whether employment or earnings are covered. |
| `calculator.epf.warning.employerNotDeducted` | The employer contribution is not deducted from take-home pay. |
| `calculator.epf.warning.estimate` | This candidate estimate still requires independent formula and accounting review before production publication. |
| `calculator.epf.error.precision` | Enter nonnegative eligible earnings with no more than two decimal places. |
| `calculator.epf.error.ruleUnavailable` | No reviewed EPF rule is available for this date. |

Translate all labels, earnings guidance, rate and rounding explanations, breakdowns, assumptions, exclusions, warnings, source titles, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `EPF`, LKR, percentages, dates, and API field identifiers.

## Privacy

The calculator is anonymous. Earnings and contribution results are not persisted by default, and raw amounts must not appear in logs or analytics. A calculation request sends only the date and eligible earnings. The calculator must not collect employer or employee identity to decide coverage. Saved payroll records are separate future scope requiring access controls, audit, retention, and deletion policies.
