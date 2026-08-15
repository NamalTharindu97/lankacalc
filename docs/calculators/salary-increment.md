# Salary Increment Calculator Specification

## Identity

- Identifier: `salary-increment`
- Display name: Salary increment calculator
- Owner: LankaCalc WorkMoney remuneration comparison kernel
- Classification: regulated/comparison
- Calculation version: `1.0.0-candidate`
- Candidate component rules: `apit-primary-regular-monthly-2025-04-01-candidate`, `epf-standard-covered-employment-1981-01-01-candidate`, `etf-standard-employer-3-percent-whole-rupee-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent formula/accounting review of the take-home composite and the increment convention below
- Source research and link verification: 2026-08-15
- Source dossier: `docs/employment-rule-sources.md`

This candidate compares gross pay and take-home pay before and after a salary increment, applying the increment to the basic pay and running the approved take-home composite on both salaries. It does not authorize public production publication and does not model performance appraisals, promotional grade changes, or collective agreements.

## Purpose And Scope

WorkMoney asks "what difference will my salary increase actually make to my take-home pay?" This calculator answers by computing the current and incremented gross and take-home amounts, then reporting how much of the gross increment survives APIT and employee EPF. Because APIT bands step, a raise that crosses a band threshold yields a smaller take-home increase than the gross increase; the calculator makes the gap explicit rather than assuming take-home grows one-for-one.

## Increment Convention

The increment is applied to the **basic pay only**; `additionalFundEarnings` and `apitOnlyEarnings` are unchanged. For a percentage increment, the new basic pay is the current basic multiplied by `(1 + percent/100)`, rounded to the nearest rupee half-up. For an amount increment, the new basic pay is the current basic plus the amount (already whole rupees). The effective applied percent is reported as `incrementAmount / basicPay * 100` for both types (guarded to zero when basic pay is zero).

This basic-pay-only convention matches common payroll practice. It is a declared assumption, not a statutory rule; the regulated content is the APIT, EPF, and ETF treatment of the incremented salary.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve the APIT, EPF, and ETF rules |
| `basicPay` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `additionalFundEarnings` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `apitOnlyEarnings` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `incrementType` | select | — | yes | `percentage` or `amount` |
| `incrementValue` | decimal | percent or LKR | yes | percentage: `0` to `1000`, up to two decimals; amount: `0` to `1,000,000,000,000`, whole rupees |
| `supportedScenario` | select | — | yes | `confirmed`; same supported primary-employment scenario as the employment family |

Each amount is a nonnegative whole LKR value for one calendar month. Missing, blank, fractional, negative, non-finite, boolean, `null`, array, and object values are rejected. The increment value is validated against the selected type: percentages allow fractional values, amounts must be whole rupees. All sums must remain within the product safety bound of LKR `1,000,000,000,000`.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `newBasicPay` | string | LKR | Basic pay after the increment, whole rupees |
| `incrementAmount` | string | LKR | `newBasicPay - basicPay` |
| `incrementPercent` | string | percent | `incrementAmount / basicPay * 100` when basic pay is positive, otherwise `"0.00"` |
| `currentGrossPay` | string | LKR | Gross pay before the increment |
| `currentTakeHomePay` | string | LKR | Take-home pay before the increment |
| `currentApit` | string | LKR | APIT before the increment |
| `currentEmployeeEpf` | string | LKR | Employee EPF before the increment |
| `currentEmployerEpf` | string | LKR | Employer EPF before the increment |
| `currentEmployerEtf` | string | LKR | Employer ETF before the increment |
| `incrementedGrossPay` | string | LKR | Gross pay after the increment |
| `incrementedTakeHomePay` | string | LKR | Take-home pay after the increment |
| `incrementedApit` | string | LKR | APIT after the increment |
| `incrementedEmployeeEpf` | string | LKR | Employee EPF after the increment |
| `incrementedEmployerEpf` | string | LKR | Employer EPF after the increment |
| `incrementedEmployerEtf` | string | LKR | Employer ETF after the increment |
| `grossIncrease` | string | LKR | `incrementedGrossPay - currentGrossPay` |
| `takeHomeIncrease` | string | LKR | `incrementedTakeHomePay - currentTakeHomePay` |
| `apitIncrease` | string | LKR | `incrementedApit - currentApit` |
| `employeeEpfIncrease` | string | LKR | `incrementedEmployeeEpf - currentEmployeeEpf` |
| `employerEpfIncrease` | string | LKR | `incrementedEmployerEpf - currentEmployerEpf` |
| `employerEtfIncrease` | string | LKR | `incrementedEmployerEtf - currentEmployerEtf` |

All LKR outputs are fixed two-decimal strings; whole-rupee fields always end in `.00`. The breakdown presents the current gross/take-home, the increment applied, the incremented gross/take-home, and the differences for gross, take-home, APIT, employee EPF, employer EPF, and employer ETF.

## Formula Definition

Let `B = basicPay`, `F = additionalFundEarnings`, `A = apitOnlyEarnings`, and `I` the increment value.

```text
newBasic = type = percentage
  ? roundNearestRupee(B * (1 + I / 100))
  : B + I
incrementAmount = newBasic - B
incrementPercent = B > 0 ? incrementAmount / B * 100 : 0
```

Let `composite(P) = calculateSalary({ basicPay: P, additionalFundEarnings: F, apitOnlyEarnings: A })` using the approved APIT, EPF, and ETF rules. Then:

```text
current = composite(B)
incremented = composite(newBasic)
each increase = incremented value - current value
```

## Algorithm

1. Validate the date, the three salary components, the increment type, and the increment value.
2. Resolve the APIT, EPF, and ETF rules for `asOfDate`; if any rule cannot resolve, fail the entire calculation.
3. Derive `newBasic` and `incrementAmount` with the increment convention.
4. Run the take-home composite on the current and incremented salaries.
5. Report current, incremented, and difference values.

The algorithm is deterministic and O(1); it evaluates the composite exactly twice.

## Rounding Order

1. Validate inputs; do not round inputs into the contract.
2. Round `newBasic` to the nearest rupee half-up only for percentage increments; amount increments are already whole rupees.
3. Run the composite on both salaries with no further rounding of inputs (the composite applies its own APIT ceiling and EPF half-up-cent rounding).
4. Compute each difference with no rounding beyond the composite values.
5. Serialize every LKR output as a fixed two-decimal string; serialize the increment percent to two decimals.

Do not derive the incremented take-home by scaling the current take-home; always re-run the composite.

## Assumptions And Exclusions

- The increment applies to the basic pay only; fund earnings and APIT-only earnings are unchanged.
- A percentage increment rounds the new basic pay to the nearest rupee half-up as a calculator convention.
- The comparison inherits the approved take-home composite: one calendar month of regular primary employment under the APIT Table 01 candidate and standard EPF-covered arrangements.
- The incremented salary is taxed and funded at the same rates as the current salary; no band-cap, exemption phase-in, or fund-ceiling behavior is modeled.
- Performance appraisals, promotional grade changes, collective agreements, market adjustments, bonuses, and non-basic allowance changes are excluded; the tool models one increment on the basic pay only.
- Loans, welfare deductions, reimbursements, and other payslip lines are excluded.
- The result is a narrow estimate, not guaranteed net pay or legal, tax, payroll, or accounting advice.

## Boundary Cases

- `I = 0` (either type): no change; all differences are `"0.00"`.
- `B = 0`, amount increment: `newBasic = I`; `incrementPercent` `"0.00"` with a warning that a percent cannot be derived.
- Percentage increment rounding: `B = 123457`, 5% gives `newBasic = 129630`, `incrementAmount = 6173`.
- Increment crossing an APIT band threshold: `takeHomeIncrease < grossIncrease` with a positive `apitIncrease`; the breakdown explains the gap.
- A zero component must be an explicit `"0"`, not a blank; a blank is a validation error.
- If the APIT, EPF, or ETF rule cannot resolve for `asOfDate`, the entire calculation fails rather than returning a partial or mixed-version result.

## Official Sources

The comparison inherits the component sources of the take-home composite:

- [IRD Advance Personal Income Tax Tables](https://www.ird.gov.lk/en/publications/sitepages/apit_tax_tables.aspx?menuid=1502)
- [IRD How to apply Table 01](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Table%20-%201/02.%20APIT_2526_Table_01_Text.pdf)
- [EPF Act and Amendments](https://epf.lk/?page_id=246)
- [EPF Remitting Contributions](https://epf.lk/?p=171)
- [ETF Remitting Contributions](https://www.etf.lk/)

Each legal instrument, Gazette, lookup, instruction, and operational page must be registered as a separate source or revision as described in the source dossier. The increment convention is a declared calculator assumption and has no separate statutory source.

## Golden Fixtures

All fixtures use `asOfDate: "2025-04-01"` and `supportedScenario: "confirmed"`. Values are independently derived candidates and require the review gate before production publication.

| Inputs | Expected result |
|---|---|
| `B = 100000`, `F = 0`, `A = 0`, 10% | `newBasicPay: "110000.00"`, `incrementAmount: "10000.00"`, `incrementPercent: "10.00"`, `currentGrossPay: "100000.00"`, `currentTakeHomePay: "92000.00"`, `incrementedGrossPay: "110000.00"`, `incrementedTakeHomePay: "101200.00"`, `grossIncrease: "10000.00"`, `takeHomeIncrease: "9200.00"`, `apitIncrease: "0.00"`, `employeeEpfIncrease: "800.00"` |
| `B = 200000`, `F = 50000`, `A = 0`, 10% | `currentTakeHomePay: "222000.00"`, `incrementedTakeHomePay: "236800.00"`, `grossIncrease: "20000.00"`, `takeHomeIncrease: "14800.00"`, `apitIncrease: "3600.00"`, `employeeEpfIncrease: "1600.00"` |
| `B = 150000`, `F = 0`, `A = 10000`, amount 20000 | `newBasicPay: "170000.00"`, `incrementAmount: "20000.00"`, `incrementPercent: "13.33"`, `currentTakeHomePay: "147400.00"`, `incrementedTakeHomePay: "164600.00"`, `grossIncrease: "20000.00"`, `takeHomeIncrease: "17200.00"`, `apitIncrease: "1200.00"` |
| `B = 123457`, `F = 0`, `A = 0`, 5% | `newBasicPay: "129630.00"`, `incrementAmount: "6173.00"`, `incrementPercent: "5.00"` |
| `B = 0`, `F = 0`, `A = 0`, amount 1000 | `newBasicPay: "1000.00"`, `incrementAmount: "1000.00"`, `incrementPercent: "0.00"` |

## Provenance

Every result must include the calculation version and each independently resolved APIT, EPF, and ETF rule version, effective date, official source set, and verification time. Link verification on `2026-08-15` does not satisfy independent formula/accounting review of the composite and the increment convention. The comparison is server-authoritative and atomic: it must not return a result if any required rule or source is unavailable.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.salaryIncrement.name` | Salary increment calculator |
| `calculator.salaryIncrement.summary` | Compare the gross and take-home impact of a salary increment. |
| `calculator.salaryIncrement.input.asOfDate` | Calculation date |
| `calculator.salaryIncrement.input.basicPay` | Current basic pay |
| `calculator.salaryIncrement.input.additionalFundEarnings` | Current fund-eligible earnings beyond basic |
| `calculator.salaryIncrement.input.apitOnlyEarnings` | Current APIT-only earnings |
| `calculator.salaryIncrement.input.incrementType` | Increment type |
| `calculator.salaryIncrement.input.incrementValue` | Increment |
| `calculator.salaryIncrement.output.newBasicPay` | New basic pay |
| `calculator.salaryIncrement.output.incrementAmount` | Increment amount |
| `calculator.salaryIncrement.output.incrementPercent` | Effective increment |
| `calculator.salaryIncrement.output.currentGrossPay` | Current gross pay |
| `calculator.salaryIncrement.output.currentTakeHomePay` | Current take-home pay |
| `calculator.salaryIncrement.output.incrementedGrossPay` | Incremented gross pay |
| `calculator.salaryIncrement.output.incrementedTakeHomePay` | Incremented take-home pay |
| `calculator.salaryIncrement.output.grossIncrease` | Gross increase |
| `calculator.salaryIncrement.output.takeHomeIncrease` | Take-home increase |
| `calculator.salaryIncrement.output.apitIncrease` | APIT increase |
| `calculator.salaryIncrement.output.employeeEpfIncrease` | Employee EPF increase |
| `calculator.salaryIncrement.output.employerEpfIncrease` | Employer EPF increase |
| `calculator.salaryIncrement.output.employerEtfIncrease` | Employer ETF increase |
| `calculator.salaryIncrement.assumption.basicOnly` | The increment applies to the basic pay only. |
| `calculator.salaryIncrement.assumption.rounding` | Percentage increments round the new basic pay to the nearest rupee. |
| `calculator.salaryIncrement.assumption.composite` | The comparison inherits the approved take-home component formulas. |
| `calculator.salaryIncrement.warning.taxStep` | A raise crossing an APIT band yields a smaller take-home increase than the gross increase. |
| `calculator.salaryIncrement.warning.noBase` | A percentage cannot be derived when the current basic pay is zero. |
| `calculator.salaryIncrement.error.wholeRupees` | Enter each amount as a nonnegative whole number of Sri Lankan rupees. |
| `calculator.salaryIncrement.error.ruleUnavailable` | A required reviewed employment rule is unavailable for this date. |

Translate all labels, input guidance, comparison explanation, breakdowns, assumptions, exclusions, source titles, warnings, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `APIT`, `EPF`, `ETF`, LKR, percentages, dates, and API field identifiers.

## Privacy

The calculator is anonymous. Salary values are not persisted by default and raw values must not appear in logs, analytics, source checks, or rule audit events. A request sends only the date, the three salary components, the increment type and value, and the scenario confirmation. Saved salary scenarios and payroll records are separate future scope requiring explicit consent, authorization, retention, export, and deletion behavior.
