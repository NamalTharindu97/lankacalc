# Take-Home Pay Calculator Specification

## Identity

- Identifier: `take-home`
- Display name: Take-home pay calculator
- Owner: LankaCalc regulated employment calculation kernel
- Classification: regulated/composite
- Calculation version: `1.0.0-candidate`
- Candidate component rules: `apit-primary-regular-monthly-2025-04-01-candidate`, `epf-standard-covered-employment-1981-01-01-candidate`, `etf-standard-employer-3-percent-whole-rupee-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent formula/accounting review of every component and deduction order
- Source research and link verification: 2026-08-14
- Source dossier: `docs/employment-rule-sources.md`

This candidate defines take-home narrowly as the three supported earnings inputs less APIT and employee EPF. It does not authorize public production publication or represent a complete payslip.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve all component rules, including APIT from `2025-04-01` |
| `basicPay` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `additionalFundEarnings` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `apitOnlyEarnings` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |

All amounts are nonnegative whole LKR for one calendar month. `additionalFundEarnings` is already classified as belonging in both APIT and fund bases; `apitOnlyEarnings` is already classified as regular APIT earnings outside the fund base. The calculator does not make those legal classifications.

Each amount and their sums must remain within the product safety bound of LKR `1,000,000,000,000`. Finite JSON integers and numeric strings accepted by the shared parser are valid only when they resolve to whole LKR. Missing, blank, fractional, negative, non-finite, boolean, `null`, array, and object values are rejected.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `grossPay` | string | LKR | Sum of all three earnings inputs |
| `apitBase` | string | LKR | `basicPay + additionalFundEarnings + apitOnlyEarnings` |
| `fundBase` | string | LKR | `basicPay + additionalFundEarnings` |
| `apit` | string | LKR | Whole-rupee monthly APIT deduction |
| `employeeEpf` | string | LKR | Employee EPF deduction at 8% of fund base |
| `employeeDeductions` | string | LKR | `apit + employeeEpf` |
| `takeHomePay` | string | LKR | `grossPay - apit - employeeEpf` |
| `employerEpf` | string | LKR | Informational employer EPF at 12% of fund base |
| `employerEtf` | string | LKR | Informational employer-only ETF at 3% of fund base |

Every amount and breakdown value is a fixed two-decimal string. Employer EPF and ETF are shown for transparency but are not subtracted from take-home. Other employee additions and deductions are outside the output contract.

## Formula And Rate Convention

Let `B = basicPay`, `F = additionalFundEarnings`, and `A = apitOnlyEarnings`:

```text
grossPay = B + F + A
apitBase = B + F + A
fundBase = B + F
apit = calculateApit(apitBase)
employeeEpf = roundHalfUpToCents(fundBase * 0.08)
employerEpf = roundHalfUpToCents(fundBase * 0.12)
employerEtf = fundBase * 0.03
employeeDeductions = apit + employeeEpf
takeHomePay = grossPay - employeeDeductions
```

`calculateApit` uses the current Table 01 monthly percentage-and-deduction formula and final whole-rupee ceiling in `docs/calculators/apit.md`. EPF uses separate employee and employer rates; ETF is employer-only. Neither employer contribution is part of `employeeDeductions` or the take-home subtraction.

## Rounding Order

1. Validate each amount as nonnegative whole LKR and add inputs exactly.
2. Calculate APIT from all three fields with no intermediate rounding, then ceiling final APIT to a whole rupee.
3. Calculate employee and employer EPF independently from the first two fields and round each nearest-cent, half-up.
4. Calculate ETF from the same whole-rupee fund base; 3% produces exact cents, so no fractional-cent policy is invoked.
5. Add finalized APIT and employee EPF to obtain `employeeDeductions`.
6. Subtract only `employeeDeductions` from `grossPay` to obtain `takeHomePay`.
7. Serialize every amount as a fixed two-decimal string.

Do not subtract employer EPF or ETF, and do not calculate take-home from unrounded component values.

## Assumptions And Exclusions

- The calculation covers one calendar month of regular primary employment under the APIT Table 01 candidate and standard EPF/ETF-covered arrangements.
- The caller has already classified the three earnings amounts and confirmed fund treatment; fund coverage decisions are excluded.
- Bonuses and lump sums, arrears, non-cash benefits, secondary or multiple employment, non-resident non-citizens, employer-paid tax and tax-on-tax, and mid-year cumulative cases are excluded.
- Higher EPF rates, ETF coordination with higher rates, approved funds, pension schemes, pensionable public employment, and all nonstandard arrangements are excluded.
- Loans, advances, welfare or union deductions, voluntary contributions, reimbursements, expenses, other taxes, and any other payslip additions or deductions are excluded.
- The result is a narrow estimate, not guaranteed net pay or legal, tax, payroll, or accounting advice.

## Boundary Cases

- All three zero inputs produce zero take-home and contributions.
- `apitOnlyEarnings` increases gross and APIT but does not increase employee EPF, employer EPF, or ETF.
- At an APIT base of `150001`, the LKR `1.00` APIT ceiling is subtracted before take-home is calculated.
- Employer contributions never reduce take-home, including when the employee EPF contribution is zero.
- If any component rule cannot resolve for `asOfDate`, the entire calculation fails rather than returning a partial or mixed-version result.

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
| `basicPay: 0`, `additionalFundEarnings: 0`, `apitOnlyEarnings: 0` | `grossPay: "0.00"`, `apitBase: "0.00"`, `fundBase: "0.00"`, `apit: "0.00"`, `employeeEpf: "0.00"`, `employeeDeductions: "0.00"`, `takeHomePay: "0.00"`, `employerEpf: "0.00"`, `employerEtf: "0.00"` |
| `basicPay: 100000`, `additionalFundEarnings: 20000`, `apitOnlyEarnings: 30000` | `grossPay: "150000.00"`, `apitBase: "150000.00"`, `fundBase: "120000.00"`, `apit: "0.00"`, `employeeEpf: "9600.00"`, `employeeDeductions: "9600.00"`, `takeHomePay: "140400.00"`, `employerEpf: "14400.00"`, `employerEtf: "3600.00"` |
| `basicPay: 100000`, `additionalFundEarnings: 20000`, `apitOnlyEarnings: 30001` | `grossPay: "150001.00"`, `apitBase: "150001.00"`, `fundBase: "120000.00"`, `apit: "1.00"`, `employeeEpf: "9600.00"`, `employeeDeductions: "9601.00"`, `takeHomePay: "140400.00"`, `employerEpf: "14400.00"`, `employerEtf: "3600.00"` |
| `basicPay: 0`, `additionalFundEarnings: 0`, `apitOnlyEarnings: 358334` | `grossPay: "358334.00"`, `apitBase: "358334.00"`, `fundBase: "0.00"`, `apit: "35001.00"`, `employeeEpf: "0.00"`, `employeeDeductions: "35001.00"`, `takeHomePay: "323333.00"`, `employerEpf: "0.00"`, `employerEtf: "0.00"` |

The complete APIT just-below/at/above threshold matrix in `docs/calculators/apit.md` is normative and must run through this composite with equivalent `apitBase` values.

## Provenance

Every result must include the calculation version and each independently resolved APIT, EPF, and ETF rule version, effective date, official source set, and verification time. Link verification on `2026-08-14` does not satisfy independent formula/accounting review. The composite is server-authoritative and atomic: it must not return a take-home result if any required rule or source is unavailable.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.takeHome.name` | Take-home pay calculator |
| `calculator.takeHome.summary` | Estimate monthly pay after APIT and employee EPF. |
| `calculator.takeHome.input.asOfDate` | Calculation date |
| `calculator.takeHome.input.basicPay` | Basic pay |
| `calculator.takeHome.input.additionalFundEarnings` | Additional APIT and fund earnings |
| `calculator.takeHome.input.apitOnlyEarnings` | Additional APIT-only earnings |
| `calculator.takeHome.output.grossPay` | Gross pay |
| `calculator.takeHome.output.apit` | APIT deduction |
| `calculator.takeHome.output.employeeEpf` | Employee EPF deduction |
| `calculator.takeHome.output.employeeDeductions` | Employee deductions in this estimate |
| `calculator.takeHome.output.takeHomePay` | Estimated take-home pay |
| `calculator.takeHome.output.employerEpf` | Employer EPF, not deducted |
| `calculator.takeHome.output.employerEtf` | Employer ETF, not deducted |
| `calculator.takeHome.assumption.deductionOrder` | Take-home subtracts APIT and employee EPF only. |
| `calculator.takeHome.warning.classification` | Enter amounts only after their APIT and fund treatment has been determined. |
| `calculator.takeHome.warning.exclusions` | Other payslip additions, deductions, special cases, and nonstandard arrangements are not supported. |
| `calculator.takeHome.warning.estimate` | This candidate estimate still requires independent formula and accounting review before production publication. |
| `calculator.takeHome.error.wholeRupees` | Enter each amount as a nonnegative whole number of Sri Lankan rupees. |
| `calculator.takeHome.error.ruleUnavailable` | A required reviewed employment rule is unavailable for this date. |

Translate all labels, input guidance, deduction-order explanation, breakdowns, assumptions, exclusions, source titles, warnings, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `APIT`, `EPF`, `ETF`, LKR, percentages, dates, and API field identifiers.

## Privacy

The calculator is anonymous. Salary components and results are not persisted by default and raw values must not appear in logs, analytics, source checks, or rule audit events. A request sends only the date and three required amounts. Employer or employee identity must not be collected to infer coverage. Saved salary scenarios and payroll records are separate future scope requiring explicit consent, authorization, retention, export, and deletion behavior.
