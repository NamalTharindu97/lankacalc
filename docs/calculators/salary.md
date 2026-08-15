# Salary Calculator Specification

## Identity

- Identifier: `salary`
- Display name: Salary calculator
- Owner: LankaCalc regulated employment calculation kernel
- Classification: regulated/composite
- Calculation version: `1.0.0-candidate`
- Candidate component rules: `apit-primary-regular-monthly-2025-04-01-candidate`, `epf-standard-covered-employment-1981-01-01-candidate`, `etf-standard-employer-3-percent-whole-rupee-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent formula/accounting review of every component and the composition
- Source research and link verification: 2026-08-14
- Source dossier: `docs/employment-rule-sources.md`

This candidate defines a narrow monthly salary breakdown for standard covered employment. It does not authorize public production publication, decide fund coverage, or classify arbitrary payroll components.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve all component rules, including APIT from `2025-04-01` |
| `basicPay` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `additionalFundEarnings` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `apitOnlyEarnings` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |

All three amounts are nonnegative whole LKR for one calendar month. `additionalFundEarnings` means earnings the caller has already determined belong in both APIT and EPF/ETF bases. `apitOnlyEarnings` means regular earnings the caller has already determined belong in the APIT base but not the fund base. These field names are calculation classifications, not legal decisions or a mapping from payroll labels.

Each amount and their sums must remain within the product safety bound of LKR `1,000,000,000,000`. Finite JSON integers and numeric strings accepted by the shared parser are valid only when they resolve to whole LKR. Missing, blank, fractional, negative, non-finite, boolean, `null`, array, and object values are rejected.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `grossPay` | string | LKR | Sum of all three input earnings fields |
| `apitBase` | string | LKR | `basicPay + additionalFundEarnings + apitOnlyEarnings` |
| `fundBase` | string | LKR | `basicPay + additionalFundEarnings` |
| `apit` | string | LKR | Whole-rupee monthly APIT |
| `employeeEpf` | string | LKR | Employee EPF at 8% of fund base |
| `employerEpf` | string | LKR | Employer EPF at 12% of fund base |
| `totalEpf` | string | LKR | Employee plus employer EPF |
| `employerEtf` | string | LKR | Employer-only ETF at 3% of fund base |
| `employeeDeductions` | string | LKR | `apit + employeeEpf` |
| `employerContributions` | string | LKR | `employerEpf + employerEtf` |

Every amount and breakdown value is a fixed two-decimal string. `employeeDeductions` identifies only deductions included in this narrow MVP. The employer EPF and ETF outputs are not employee deductions. This calculator reports the salary breakdown but does not emit net pay; `take-home` owns that output.

## Formula And Rate Convention

Let `B = basicPay`, `F = additionalFundEarnings`, and `A = apitOnlyEarnings`:

```text
grossPay = B + F + A
apitBase = B + F + A
fundBase = B + F
apit = calculateApit(apitBase)
employeeEpf = roundHalfUpToCents(fundBase * 0.08)
employerEpf = roundHalfUpToCents(fundBase * 0.12)
totalEpf = employeeEpf + employerEpf
employerEtf = fundBase * 0.03
employeeDeductions = apit + employeeEpf
employerContributions = employerEpf + employerEtf
```

`calculateApit` uses the full-base Table 01 percentage-and-deduction bands specified in `docs/calculators/apit.md`, followed by a final ceiling to a whole rupee. EPF contributions are separate 8% and 12% calculations. ETF is an employer-only 3% calculation. No rate is applied to `apitOnlyEarnings` for EPF or ETF.

## Rounding Order

1. Validate each amount as nonnegative whole LKR and add inputs exactly.
2. Calculate APIT from `apitBase` with no intermediate rounding, then ceiling the final APIT to a whole rupee.
3. Calculate employee EPF and employer EPF independently from `fundBase`, applying nearest-cent half-up to each.
4. Add the two rounded EPF amounts for `totalEpf`; do not independently round 20%.
5. Calculate ETF from the whole-rupee `fundBase`; 3% produces exact cents, so apply no fractional-cent rounding.
6. Calculate `employeeDeductions` and `employerContributions` from the already finalized component amounts.
7. Serialize all monetary outputs as fixed two-decimal strings.

## Assumptions And Exclusions

- The calculation covers one calendar month of regular primary employment under the APIT Table 01 candidate and standard EPF/ETF-covered arrangements.
- The caller has already classified the three input amounts and confirmed the fund treatment; fund coverage decisions are excluded.
- Bonuses and lump sums, arrears, non-cash benefits, secondary or multiple employment, non-resident non-citizens, employer-paid tax and tax-on-tax, and mid-year cumulative cases are excluded.
- Higher EPF rates, ETF coordination with higher rates, approved funds, pension schemes, pensionable public employment, and all nonstandard arrangements are excluded.
- Other employee deductions or additions, including loans, salary advances, welfare deductions, union dues, reimbursements, expenses, and voluntary contributions, are excluded.
- Remittance, returns, surcharges, benefits, and employer compliance workflows are excluded.
- The result is an estimate and is not legal, tax, payroll, or accounting advice.

## Boundary Cases

- All three zero inputs produce zero outputs.
- `apitOnlyEarnings` increases `grossPay` and `apitBase` but never `fundBase` or fund contributions.
- An APIT base of `150001` produces APIT of LKR `1.00` after the final ceiling.
- Whole-rupee component inputs guarantee exact-cent ETF output; fractional component inputs are rejected.
- If any component rule cannot resolve for `asOfDate`, the entire composite calculation fails rather than mixing versions or omitting a contribution.

## Official Sources

APIT:

- [IRD Advance Personal Income Tax Tables](https://www.ird.gov.lk/en/publications/sitepages/apit_tax_tables.aspx?menuid=1502)
- [IRD How to apply Table 01](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Table%20-%201/02.%20APIT_2526_Table_01_Text.pdf)
- [IRD Table 01 full lookup](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Table%20-%201/02.%20APIT_2526_Table_01.pdf)

EPF:

- [EPF Act and Amendments](https://epf.lk/?page_id=246)
- [EPF Remitting Contributions](https://epf.lk/?p=171)
- [EPF Employer FAQ](https://epf.lk/?page_id=811)

ETF:

- [ETF Downloads](https://etfb.lk/downloads/)
- [ETF Employer Details](https://etfb.lk/employer-details/)
- [ETF Payment of Contributions](https://etfb.lk/payment-of-contributions/)

Each legal instrument, Gazette, lookup, instruction, and operational page must be registered as a separate source or revision as described in the source dossier.

## Golden Fixtures

All fixtures use `asOfDate: "2025-04-01"` and assume standard covered fund treatment.

| Inputs | Expected result |
|---|---|
| `basicPay: 0`, `additionalFundEarnings: 0`, `apitOnlyEarnings: 0` | `grossPay: "0.00"`, `apitBase: "0.00"`, `fundBase: "0.00"`, `apit: "0.00"`, `employeeEpf: "0.00"`, `employerEpf: "0.00"`, `totalEpf: "0.00"`, `employerEtf: "0.00"`, `employeeDeductions: "0.00"`, `employerContributions: "0.00"` |
| `basicPay: 100000`, `additionalFundEarnings: 20000`, `apitOnlyEarnings: 30000` | `grossPay: "150000.00"`, `apitBase: "150000.00"`, `fundBase: "120000.00"`, `apit: "0.00"`, `employeeEpf: "9600.00"`, `employerEpf: "14400.00"`, `totalEpf: "24000.00"`, `employerEtf: "3600.00"`, `employeeDeductions: "9600.00"`, `employerContributions: "18000.00"` |
| `basicPay: 100000`, `additionalFundEarnings: 20000`, `apitOnlyEarnings: 30001` | `grossPay: "150001.00"`, `apitBase: "150001.00"`, `fundBase: "120000.00"`, `apit: "1.00"`, `employeeEpf: "9600.00"`, `employerEpf: "14400.00"`, `totalEpf: "24000.00"`, `employerEtf: "3600.00"`, `employeeDeductions: "9601.00"`, `employerContributions: "18000.00"` |
| `basicPay: 0`, `additionalFundEarnings: 0`, `apitOnlyEarnings: 358334` | `grossPay: "358334.00"`, `apitBase: "358334.00"`, `fundBase: "0.00"`, `apit: "35001.00"`, `employeeEpf: "0.00"`, `employerEpf: "0.00"`, `totalEpf: "0.00"`, `employerEtf: "0.00"`, `employeeDeductions: "35001.00"`, `employerContributions: "0.00"` |

The complete APIT just-below/at/above threshold matrix is normative in `docs/calculators/apit.md` and must also run through this composite using inputs that produce the same `apitBase`.

## Provenance

Every result must include the calculation version and each independently resolved APIT, EPF, and ETF rule version, effective date, official source set, and verification time. Link verification on `2026-08-14` does not satisfy independent formula/accounting review. The composite is server-authoritative and atomic: it must not return a partial result or silently substitute a current rule when any required rule or source is unavailable.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.salary.name` | Salary calculator |
| `calculator.salary.summary` | Estimate monthly APIT and standard EPF/ETF salary amounts. |
| `calculator.salary.input.asOfDate` | Calculation date |
| `calculator.salary.input.basicPay` | Basic pay |
| `calculator.salary.input.additionalFundEarnings` | Additional APIT and fund earnings |
| `calculator.salary.input.apitOnlyEarnings` | Additional APIT-only earnings |
| `calculator.salary.output.grossPay` | Gross pay |
| `calculator.salary.output.apitBase` | APIT earnings base |
| `calculator.salary.output.fundBase` | EPF/ETF earnings base |
| `calculator.salary.output.apit` | APIT deduction |
| `calculator.salary.output.employeeEpf` | Employee EPF |
| `calculator.salary.output.employerEpf` | Employer EPF |
| `calculator.salary.output.employerEtf` | Employer ETF |
| `calculator.salary.output.employeeDeductions` | Employee deductions in this estimate |
| `calculator.salary.output.employerContributions` | Employer fund contributions |
| `calculator.salary.warning.classification` | Enter amounts only after their APIT and fund treatment has been determined. |
| `calculator.salary.warning.exclusions` | Bonuses, special cases, other deductions, and nonstandard arrangements are not supported. |
| `calculator.salary.warning.estimate` | This candidate estimate still requires independent formula and accounting review before production publication. |
| `calculator.salary.error.wholeRupees` | Enter each amount as a nonnegative whole number of Sri Lankan rupees. |
| `calculator.salary.error.ruleUnavailable` | A required reviewed employment rule is unavailable for this date. |

Translate all labels, input guidance, base explanations, component breakdowns, assumptions, exclusions, source titles, warnings, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `APIT`, `EPF`, `ETF`, LKR, percentages, dates, and API field identifiers.

## Privacy

The calculator is anonymous. Salary components and results are not persisted by default and raw values must not appear in logs, analytics, source checks, or rule audit events. A request sends only the date and three required amounts. Employer or employee identity must not be collected to infer coverage. Saved salary scenarios and payroll records are separate future scope requiring explicit consent, authorization, retention, export, and deletion behavior.
