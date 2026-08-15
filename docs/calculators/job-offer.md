# Job Offer Comparison Calculator Specification

## Identity

- Identifier: `job-offer`
- Display name: Job offer comparison calculator
- Owner: LankaCalc WorkMoney employment comparison kernel
- Classification: regulated/comparison
- Calculation version: `1.0.0-candidate`
- Candidate component rules: `apit-primary-regular-monthly-2025-04-01-candidate`, `epf-standard-covered-employment-1981-01-01-candidate`, `etf-standard-employer-3-percent-whole-rupee-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent formula/accounting review of the annualization conventions below
- Source research and link verification: 2026-08-15
- Source dossier: `docs/employment-rule-sources.md`

This candidate compares a current job and a new offer by running the approved take-home composite on each job's monthly salary components, annualizing each monthly result, and reconciling annual bonus, travel cost, and work-from-home saving differences into one real annual financial improvement. It does not authorize public production publication and does not model relocation, benefits-in-kind, employer-paid tax, or non-cash compensation.

## Purpose And Scope

Job-offer comparison answers "is the new offer financially better?" The roadmap requires estimated annual take-home, additional tax, travel-cost difference, yearly bonus difference, employer contributions, and a real annual financial improvement. Each difference is explained in the breakdown rather than reduced to one total, and each job's scenario is preserved.

## Annualization Conventions

Each job is described by monthly salary components (`basicPay`, `additionalFundEarnings`, `apitOnlyEarnings`) plus three annual cash figures (`annualBonus`, `annualTravelCost`, `annualWorkFromHomeSaving`).

- The monthly APIT base of a job is `basicPay + additionalFundEarnings + apitOnlyEarnings + round(annualBonus / 12)`; the bonus is APIT-taxable and excluded from the EPF/ETF base. The rounded monthly bonus is a declared calculator convention because the monthly composite requires whole-rupee components.
- Monthly take-home and contributions come from the approved composite on that base.
- Annual figures are the monthly composite results multiplied by 12.
- `annualTravelCost` and `annualWorkFromHomeSaving` are annual cash figures; they do not enter the tax or fund base and are applied to the financial position after tax.
- `realAnnualFinancialImprovement = annualTakeHomeNew - annualTakeHomeCurrent - annualTravelCostNew + annualTravelCostCurrent + annualWorkFromHomeSavingNew - annualWorkFromHomeSavingCurrent`.

The travel and work-from-home figures are user-entered annual cash amounts; the platform must not imply an employer subsidy or statutory deduction for them.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve the APIT, EPF, and ETF rules |
| `currentBasicPay` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `currentAdditionalFundEarnings` | integer | LKR/month | yes | same bounds |
| `currentApitOnlyEarnings` | integer | LKR/month | yes | same bounds |
| `currentAnnualBonus` | integer | LKR/year | yes | same bounds |
| `currentAnnualTravelCost` | integer | LKR/year | yes | same bounds |
| `currentAnnualWorkFromHomeSaving` | integer | LKR/year | yes | same bounds |
| `newBasicPay` | integer | LKR/month | yes | same bounds |
| `newAdditionalFundEarnings` | integer | LKR/month | yes | same bounds |
| `newApitOnlyEarnings` | integer | LKR/month | yes | same bounds |
| `newAnnualBonus` | integer | LKR/year | yes | same bounds |
| `newAnnualTravelCost` | integer | LKR/year | yes | same bounds |
| `newAnnualWorkFromHomeSaving` | integer | LKR/year | yes | same bounds |
| `supportedScenario` | select | — | yes | `confirmed`; same supported primary-employment scenario as the employment family |

Each amount is a nonnegative whole LKR value. Missing, blank, fractional, negative, non-finite, boolean, `null`, array, and object values are rejected. The combined monthly salary of each job (`basic + additional + apitOnly + rounded monthly bonus`) must remain within the product safety bound of LKR `1,000,000,000,000`.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `currentMonthlyGrossPay` | string | LKR | Current gross pay including the rounded monthly bonus equivalent |
| `newMonthlyGrossPay` | string | LKR | New gross pay including the rounded monthly bonus equivalent |
| `currentAnnualTakeHomePay` | string | LKR | Current monthly take-home annualized |
| `newAnnualTakeHomePay` | string | LKR | New monthly take-home annualized |
| `annualTakeHomeDifference` | string | LKR | `new - current` |
| `currentAnnualBonus` | string | LKR | Entered current annual bonus |
| `newAnnualBonus` | string | LKR | Entered new annual bonus |
| `annualBonusDifference` | string | LKR | `new - current` |
| `currentAnnualTravelCost` | string | LKR | Entered current annual travel cost |
| `newAnnualTravelCost` | string | LKR | Entered new annual travel cost |
| `annualTravelCostDifference` | string | LKR | `new - current` (positive means the new job costs more to commute) |
| `currentAnnualWorkFromHomeSaving` | string | LKR | Entered current annual work-from-home saving |
| `newAnnualWorkFromHomeSaving` | string | LKR | Entered new annual work-from-home saving |
| `annualWorkFromHomeSavingDifference` | string | LKR | `new - current` |
| `currentAnnualApit` | string | LKR | Current annual APIT |
| `newAnnualApit` | string | LKR | New annual APIT |
| `additionalAnnualTax` | string | LKR | `newAnnualApit - currentAnnualApit` (negative when the new job taxes less) |
| `currentAnnualEmployeeEpf` | string | LKR | Current annual employee EPF |
| `newAnnualEmployeeEpf` | string | LKR | New annual employee EPF |
| `currentAnnualEmployerEpf` | string | LKR | Current annual employer EPF |
| `newAnnualEmployerEpf` | string | LKR | New annual employer EPF |
| `currentAnnualEmployerEtf` | string | LKR | Current annual employer ETF |
| `newAnnualEmployerEtf` | string | LKR | New annual employer ETF |
| `currentEmployerContributions` | string | LKR | `currentAnnualEmployerEpf + currentAnnualEmployerEtf` |
| `newEmployerContributions` | string | LKR | `newAnnualEmployerEpf + newAnnualEmployerEtf` |
| `employerContributionDifference` | string | LKR | `new - current` |
| `realAnnualFinancialImprovement` | string | LKR | The after-tax, after-travel, after-work-from-home annual improvement of switching |
| `recommendation` | string | — | `new-job`, `current-job`, or `equal` |

All LKR outputs are fixed two-decimal strings. The breakdown presents each job's monthly gross, annual take-home, annual bonus, annual travel cost, annual work-from-home saving, annual APIT, and employer contributions, then each difference and the real annual improvement.

## Formula Definition

For job `j` with components `B`, `F`, `A`, annual bonus `G`, annual travel `T`, and annual work-from-home saving `W`:

```text
bonusMonth_j = round(G_j / 12)
base_j = calculateSalary({ basicPay: B_j, additionalFundEarnings: F_j, apitOnlyEarnings: A_j + bonusMonth_j })

annualTakeHome_j      = base_j.takeHomePay * 12
annualApit_j          = base_j.apit.tax * 12
annualEmployeeEpf_j   = base_j.epf.employee.amount * 12
annualEmployerEpf_j   = base_j.epf.employer.amount * 12
annualEmployerEtf_j   = base_j.etf.employer.amount * 12
annualBonus_j         = G_j
annualTravelCost_j    = T_j
annualWfhSaving_j     = W_j
```

Each difference is `new - current`. Then:

```text
realAnnualFinancialImprovement =
  annualTakeHomeDifference - annualTravelCostDifference + annualWorkFromHomeSavingDifference

recommendation =
  improvement > 0  -> "new-job"
  improvement < 0  -> "current-job"
  otherwise        -> "equal"
```

## Algorithm

1. Validate the date, both jobs, and the scenario.
2. Resolve the APIT, EPF, and ETF rules for `asOfDate`; if any rule cannot resolve, fail the entire calculation.
3. For each job, derive the rounded monthly bonus, merge it into the APIT-only base, and run the take-home composite.
4. Annualize the monthly take-home, APIT, and contribution results.
5. Compute every difference and the real annual financial improvement.
6. Report the per-job scenarios, the differences, the improvement, and the recommendation.

The algorithm is deterministic and O(1); it evaluates the composite exactly twice.

## Rounding Order

1. Validate inputs; do not round inputs into the contract.
2. Round each monthly bonus to the nearest rupee half-up only.
3. Run the composite on both merged bases with no further rounding of inputs.
4. Annualize each monthly composite result with no additional rounding (multiplying cents by 12 is exact).
5. Compute each difference from the annualized values.
6. Serialize every LKR output as a fixed two-decimal string.

Do not derive one job's result by scaling the other; always run the composite per job.

## Assumptions And Exclusions

- Each job is one calendar month of regular primary employment under the supported scenario, annualized by 12 months.
- The annual bonus is spread evenly across the monthly APIT base (rounded to whole rupees) and is excluded from the EPF/ETF base.
- Travel cost and work-from-home saving are annual cash figures applied after tax; they do not affect APIT, EPF, or ETF.
- The comparison inherits the approved take-home composite rules and their rounding.
- Relocation, benefits-in-kind, employer-paid tax, non-cash compensation, leave, and pension differences are excluded.
- Bonuses are taxed in the month paid in practice; the even monthly spread is an approximation for comparison.
- The result is an estimate, not legal, tax, payroll, relocation, or compensation advice.

## Boundary Cases

- Identical jobs: every difference is `"0.00"` and the recommendation is `"equal"`.
- `annualBonus` not divisible by 12: the rounded monthly equivalent is used; the annualized tax base may differ from the entered bonus by a few rupees, as demonstrated by the fixture below.
- Zero-rate job pair: `annualBonus = 0` in both jobs produces a `"0.00"` additional tax.
- A negative `additionalAnnualTax` means the new job taxes less annually.
- A zero component must be an explicit `"0"`, not a blank; a blank is a validation error.
- If the APIT, EPF, or ETF rule cannot resolve for `asOfDate`, the entire calculation fails rather than returning a partial or mixed-version result.

## Official Sources

The comparison inherits the component sources of the take-home composite:

- [IRD Advance Personal Income Tax Tables](https://www.ird.gov.lk/en/publications/sitepages/apit_tax_tables.aspx?menuid=1502)
- [IRD How to apply Table 01](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Table%20-%201/02.%20APIT_2526_Table_01_Text.pdf)
- [EPF Act and Amendments](https://epf.lk/?page_id=246)
- [EPF Remitting Contributions](https://epf.lk/?p=171)
- [ETF Remitting Contributions](https://www.etf.lk/)

Each legal instrument, Gazette, lookup, instruction, and operational page must be registered as a separate source or revision as described in the source dossier. The annualization and rounding conventions are declared calculator assumptions with no separate statutory source.

## Golden Fixtures

All fixtures use `asOfDate: "2025-04-01"` and `supportedScenario: "confirmed"`. Values are independently derived candidates and require the review gate before production publication.

| Inputs (current / new) | Expected result |
|---|---|
| current: `B=100000, F=0, A=0`, bonus `120000`, travel `120000`, wfh `0`; new: `B=150000, F=0, A=0`, bonus `120000`, travel `60000`, wfh `12000` | `currentAnnualTakeHomePay: "1224000.00"`, `newAnnualTakeHomePay: "1768800.00"`, `annualTakeHomeDifference: "544800.00"`, `additionalAnnualTax: "7200.00"`, `annualBonusDifference: "0.00"`, `annualTravelCostDifference: "-60000.00"`, `annualWorkFromHomeSavingDifference: "12000.00"`, `employerContributionDifference: "90000.00"`, `realAnnualFinancialImprovement: "616800.00"`, `recommendation: "new-job"` |
| current: `B=200000, F=0, A=0`, bonus `0`, travel `24000`, wfh `0`; new: `B=180000, F=0, A=0`, bonus `0`, travel `120000`, wfh `0` | `currentAnnualTakeHomePay: "2172000.00"`, `newAnnualTakeHomePay: "1965600.00"`, `annualTakeHomeDifference: "-206400.00"`, `additionalAnnualTax: "-14400.00"`, `annualTravelCostDifference: "96000.00"`, `realAnnualFinancialImprovement: "-302400.00"`, `recommendation: "current-job"` |
| identical jobs with `B=100000, F=0, A=0`, bonus `0`, travel `0`, wfh `0` | `annualTakeHomeDifference: "0.00"`, `additionalAnnualTax: "0.00"`, `realAnnualFinancialImprovement: "0.00"`, `recommendation: "equal"` |
| current: `B=100000, F=0, A=0`, bonus `100000`, travel `0`, wfh `0`; new: `B=100000, F=0, A=0`, bonus `200000`, travel `0`, wfh `0` | `currentAnnualTakeHomePay: "1203996.00"`, `newAnnualTakeHomePay: "1304004.00"`, `annualTakeHomeDifference: "100008.00"`, `annualBonusDifference: "100000.00"`, `additionalAnnualTax: "0.00"`, `realAnnualFinancialImprovement: "100008.00"`, `recommendation: "new-job"` |

## Provenance

Every result must include the calculation version and each independently resolved APIT, EPF, and ETF rule version, effective date, official source set, and verification time. Link verification on `2026-08-15` does not satisfy independent formula/accounting review of the annualization conventions. The comparison is server-authoritative and atomic: it must not return a result if any required rule or source is unavailable.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.jobOffer.name` | Job offer comparison calculator |
| `calculator.jobOffer.summary` | Compare current and offered jobs across take-home, tax, bonus, travel, and contributions. |
| `calculator.jobOffer.input.asOfDate` | Calculation date |
| `calculator.jobOffer.input.currentBasicPay` | Current basic monthly pay |
| `calculator.jobOffer.input.currentAdditionalFundEarnings` | Current additional EPF/ETF-eligible earnings |
| `calculator.jobOffer.input.currentApitOnlyEarnings` | Current additional APIT-only earnings |
| `calculator.jobOffer.input.currentAnnualBonus` | Current annual bonus |
| `calculator.jobOffer.input.currentAnnualTravelCost` | Current annual commuting cost |
| `calculator.jobOffer.input.currentAnnualWorkFromHomeSaving` | Current annual work-from-home saving |
| `calculator.jobOffer.input.newBasicPay` | New basic monthly pay |
| `calculator.jobOffer.input.newAdditionalFundEarnings` | New additional EPF/ETF-eligible earnings |
| `calculator.jobOffer.input.newApitOnlyEarnings` | New additional APIT-only earnings |
| `calculator.jobOffer.input.newAnnualBonus` | New annual bonus |
| `calculator.jobOffer.input.newAnnualTravelCost` | New annual commuting cost |
| `calculator.jobOffer.input.newAnnualWorkFromHomeSaving` | New annual work-from-home saving |
| `calculator.jobOffer.output.currentAnnualTakeHomePay` | Current annual take-home pay |
| `calculator.jobOffer.output.newAnnualTakeHomePay` | New annual take-home pay |
| `calculator.jobOffer.output.additionalAnnualTax` | Additional annual tax |
| `calculator.jobOffer.output.annualBonusDifference` | Annual bonus difference |
| `calculator.jobOffer.output.annualTravelCostDifference` | Annual travel-cost difference |
| `calculator.jobOffer.output.annualWorkFromHomeSavingDifference` | Annual work-from-home saving difference |
| `calculator.jobOffer.output.employerContributionDifference` | Employer contribution difference |
| `calculator.jobOffer.output.realAnnualFinancialImprovement` | Real annual financial improvement |
| `calculator.jobOffer.output.recommendation` | Financial recommendation |
| `calculator.jobOffer.assumption.bonusSpread` | The annual bonus is spread evenly across the tax base and is not EPF/ETF-eligible. |
| `calculator.jobOffer.assumption.travelAfterTax` | Travel cost and work-from-home saving apply after tax. |
| `calculator.jobOffer.assumption.composite` | The comparison inherits the approved take-home component formulas. |
| `calculator.jobOffer.warning.estimateOnly` | This is a financial comparison estimate, not an offer evaluation or compensation advice. |
| `calculator.jobOffer.warning.bonusTiming` | Bonuses are taxed in the month paid; the even monthly spread is an approximation. |

Translate all labels, input guidance, per-job breakdowns, differences, assumptions, exclusions, source titles, warnings, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `APIT`, `EPF`, `ETF`, LKR, percentages, dates, and API field identifiers.

## Privacy

The calculator is anonymous. Salary and expense values are not persisted by default and raw values must not appear in logs, analytics, source checks, or rule audit events. A request sends only the date, both jobs' components and annual figures, and the scenario confirmation. Saved job-offer scenarios and payroll records are separate future scope requiring explicit consent, authorization, retention, export, and deletion behavior.
