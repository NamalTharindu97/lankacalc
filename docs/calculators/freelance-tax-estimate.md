# Freelancer Tax Estimate Specification

## Identity

- Identifier: `freelance-tax-estimate`
- Display name: Freelancer tax estimate
- Owner: LankaCalc regulated business-tax calculation kernel
- Classification: regulated
- Execution: server
- Calculation version: `1.0.0-candidate`
- Rule dependency: `freelance-tax-estimate-lk-2026`, scope `lk`
- Candidate period: year of assessment 2025/2026 (`2025-04-01` through `2026-03-31`)

## Approval And Review

- Status: Draft candidate specification
- Implementation use: domestic-only and wholly eligible-income arithmetic may be tested within this scope
- Production publication: blocked
- Source research and link verification: 2026-08-30

Publication requires independent tax/accounting review of income classification, deduction and relief allocation, the 15% maximum-rate method, foreign tax credit eligibility, rounding, and every fixture. The existing executable implementation is broader than the approved candidate boundary below and must remain unavailable in production.

## Supported Taxpayer

The candidate estimates annual income tax for a resident individual carrying on a freelance or service business. It accepts business income and deductions already classified under the Inland Revenue Act; it does not decide whether a worker is an employee, determine residence, classify arbitrary expenses, or prepare a return.

Only these scenarios are candidates:

1. All supported taxable income is ordinary Sri Lankan business income taxed at the individual progressive rates.
2. All supported business income is eligible for the 15% maximum rate because it is either:
   - gains and profits from services rendered in or outside Sri Lanka for use outside Sri Lanka, paid in foreign currency and remitted through a bank to Sri Lanka; or
   - foreign-source gains and profits earned in foreign currency and remitted through a bank to Sri Lanka.

Mixed ordinary and maximum-rate income is excluded until the rule defines authoritative allocation of expenses, capital allowances, qualifying payments, and personal relief between those amounts. A foreign tax credit is excluded from the initial candidate because the current input does not distinguish foreign-source income from export-service income and does not collect the per-source facts needed by sections 80 and 81.

## Inputs

| Field | Type | Unit | Required | Candidate meaning |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD` within Y/A 2025/2026 |
| `businessIncome` | integer | LKR/year | yes | Gross business income already classified under section 6 |
| `allowableExpenses` | integer | LKR/year | yes | Deductible section 9 expenses already classified and supported by records |
| `capitalAllowances` | integer | LKR/year | no | Fourth Schedule allowance already calculated outside this estimator |
| `personalReliefOverride` | integer | LKR/year | no | Remaining personal relief available to this estimate; default `1,800,000` |
| `foreignIncomeAmount` | integer | LKR/year | no | Existing implementation field; candidate use is limited to `0` or the full `businessIncome` |
| `foreignTaxPaid` | integer | LKR/year | no | Not approved in the initial candidate; must be absent or zero |

All monetary inputs are nonnegative whole rupees, with a product safety maximum of LKR `10,000,000,000`. Inputs are annual amounts for one year of assessment. The calculator does not convert currencies; the caller must use an independently supportable LKR amount.

## Rule Payload

The Y/A 2025/2026 candidate payload is:

```json
{
  "authority": "ird-income-tax-2025",
  "effectiveFrom": "2025-04-01",
  "yearOfAssessment": "2025/26",
  "rounding": "nearest-rupee",
  "personalRelief": "1800000",
  "individualBrackets": [
    { "upTo": "1000000", "ratePercent": "6" },
    { "upTo": "1500000", "ratePercent": "18" },
    { "upTo": "2000000", "ratePercent": "24" },
    { "upTo": "2500000", "ratePercent": "30" },
    { "upTo": null, "ratePercent": "36" }
  ],
  "foreignCurrencyRemittedCapPercent": "15"
}
```

The rule version must end on `2026-03-31`. A 2025/2026 Tax Chart does not establish rates for a later year of assessment.

## Calculation

Let `I` be business income, `E` allowable expenses, `C` capital allowances, and `R` the available personal relief:

```text
taxableBeforeRelief = max(I - E - C, 0)
taxableIncome = max(taxableBeforeRelief - R, 0)
```

For ordinary income, apply the progressive bands sequentially to `taxableIncome`:

```text
normalTax =
  first 1,000,000 * 6%
  + next 500,000 * 18%
  + next 500,000 * 24%
  + next 500,000 * 30%
  + balance * 36%
```

For a wholly eligible maximum-rate scenario:

```text
candidateTax = min(normalTax, taxableIncome * 15%)
```

The 15% provision is a maximum rate, so it must not increase tax that is lower under ordinary rates. Apply no intermediate monetary rounding. The candidate rounds the final amount once to the nearest whole rupee, half up, but that convention still requires independent confirmation before publication.

## Outputs

- `yearOfAssessment` and taxpayer category.
- Gross income, expenses, capital allowances, total deductions, and income before relief.
- Personal relief and whether it came from the official rule or a user override.
- Taxable income and progressive-band breakdown.
- Eligible-income amount, normal tax comparison, 15% maximum-rate amount, and whether the cap reduced tax.
- Unrounded tax, final income tax, and effective rate.

The foreign tax credit outputs are not approved candidate outputs until the input and calculation redesign is complete.

## Golden Fixtures

These fixtures are independently reproducible from the IRD Y/A 2025/2026 Tax Chart. They are candidate fixtures, not official worked examples, and require independent review.

| Scenario | Inputs after classification | Expected taxable income | Expected tax | Purpose |
|---|---|---:|---:|---|
| Below relief | `I=1,800,000`, `E=0`, `C=0`, ordinary | `0` | `0.00` | Personal-relief boundary |
| First band upper boundary | `I=2,800,000`, `E=0`, `C=0`, ordinary | `1,000,000` | `60,000.00` | 6% band boundary |
| Second band upper boundary | `I=3,300,000`, `E=0`, `C=0`, ordinary | `1,500,000` | `150,000.00` | 18% band boundary |
| Third band upper boundary | `I=3,800,000`, `E=0`, `C=0`, ordinary | `2,000,000` | `270,000.00` | 24% band boundary |
| Fourth band upper boundary | `I=4,300,000`, `E=0`, `C=0`, ordinary | `2,500,000` | `420,000.00` | 30% band boundary |
| Top band | `I=5,300,000`, `E=0`, `C=0`, ordinary | `3,500,000` | `780,000.00` | 36% balance |
| Eligible income below cap | `I=2,800,000`, `E=0`, `C=0`, wholly eligible | `1,000,000` | `60,000.00` | Maximum rate must not increase tax |
| Eligible income cap applies | `I=5,300,000`, `E=0`, `C=0`, wholly eligible | `3,500,000` | `525,000.00` | 15% maximum-rate path |
| Deduction and relief order | `I=3,000,000`, `E=200,000`, `C=0`, ordinary | `1,000,000` | `60,000.00` | Deductions before relief |

Required rejection fixtures:

- `asOfDate` outside `2025-04-01..2026-03-31` when no separately reviewed rule resolves.
- A mixed `foreignIncomeAmount` greater than zero but less than `businessIncome`.
- Any positive `foreignTaxPaid` under the initial candidate.
- Expenses or capital allowances greater than gross business income are accepted arithmetically but produce zero before relief; the calculator does not characterize or carry forward a tax loss.

## Sources

- [IRD Tax Chart Y/A 2025/2026](https://www.ird.gov.lk/en/publications/SitePages/tax_chart_2526.aspx?menuid=1404): personal relief, individual bands, and the two 15% maximum-rate categories.
- [Consolidated Inland Revenue Act incorporating changes through 31 March 2025](https://www.ird.gov.lk/en/publications/Acts_Income%20Tax_2017/IRA_Cons_Act_-_2025_Changes.pdf): business income, deductions, relief, foreign tax credit, source, and schedules.
- [Inland Revenue (Amendment) Act, No. 2 of 2025](https://www.ird.gov.lk/en/publications/Acts_Income%20Tax_2017/IR_Act_No_02-2025_E.pdf): amendments effective for Y/A 2025/2026, including the maximum-rate path.
- [IRD Notice SEC/PN/IT/2026/02](https://www.ird.gov.lk/en/Lists/Latest%20News%20%20Notices/Attachments/788/SEC_PN_IT_2026-02.pdf): 2026 changes, including expense-payment restrictions, enhanced capital allowances from Y/A 2026/2027, and other matters that must not be silently folded into this rule.

## Assumptions And Exclusions

- The caller has determined residence, source, business-income classification, deductible expenses, capital allowances, and remaining personal relief.
- Cash or non-approved-method payments of LKR 500,000 or more may be disallowed under section 10(2A); the calculator does not inspect payment evidence.
- Personal relief is shared across relevant income sources. The override means the amount still available, not an elective statutory rate.
- Employment, investment, other income, investment-asset gains, losses, qualifying payments, WHT/AIT credits, quarterly instalments, treaties, foreign tax credits, and return filing are excluded.
- Mixed ordinary and maximum-rate business income is excluded until allocation rules are independently approved.
- Y/A 2026/2027 is excluded. The 2026 amendment introduces matters such as enhanced capital allowances but does not by itself provide a complete reviewed replacement payload.
- The estimate is not tax, legal, or accounting advice.

## Publication Blockers

1. Replace the ambiguous `foreignIncomeAmount` with inputs that distinguish export-service income from foreign-source income and represent taxable eligible amounts after supported allocation.
2. Reject mixed-income and foreign-credit requests until their formulas and evidence are approved.
3. Add an explicit rule-version end date of `2026-03-31`.
4. Attach immutable revisions of all governing sources and record content hashes.
5. Obtain independent tax/accounting review of every formula, exclusion, rounding decision, and fixture.
6. Complete reviewed English, Sinhala, and Tamil strings or make an explicit English-only launch decision.

## Privacy

The calculator is anonymous. Inputs and results are not persisted by default, and raw financial values must not be captured in logs, analytics, source-verification records, or publication events.
