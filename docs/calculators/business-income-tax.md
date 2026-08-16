# Business Income Tax Calculator Specification

## Identity

- Identifier: `business-income-tax`
- Display name: Business income tax calculator
- Owner: LankaCalc regulated business tax calculation kernel
- Classification: regulated
- Calculation version: `1.0.0-candidate`
- Candidate rule version: `business-income-tax-lk-2026-2025-04-01-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent formula/accounting review
- Source research and link verification: 2026-08-16
- Source dossier: `docs/business-and-tax-product-spec.md`

Approval as an implementation candidate does not authorize a public production result. The rule must remain unpublished until an independent reviewer confirms the year-of-assessment rates, taxpayer-category selection, whole-rupee input contract, marginal-band arithmetic, rounding, effective date, and scope.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve to the rule effective from `2025-04-01` |
| `taxpayerCategory` | enum | — | yes | `individual-sole-proprietor`, `partnership`, or `company` |
| `businessIncome` | integer | LKR | yes | `0` to `10,000,000,000`, inclusive; whole rupees only |
| `allowableExpenses` | integer | LKR | yes | `0` to `10,000,000,000`, inclusive; whole rupees only |
| `capitalAllowances` | integer | LKR | no | `0` to `10,000,000,000`, inclusive; whole rupees only |
| `personalReliefOverride` | integer | LKR | no | `0` to `10,000,000,000`, inclusive; whole rupees only; only valid when `taxpayerCategory` is `individual-sole-proprietor` |

`businessIncome` is the gross gains and profits from the business for the year of assessment, before deductions. `allowableExpenses` are the expenses incurred in producing that income and allowed as deductions. `capitalAllowances` are Fourth Schedule depreciation on depreciable business assets. The upper bounds are product safety bounds, not statutory thresholds. Missing, blank, fractional, negative, non-finite, boolean, `null`, array, and object values are rejected.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `taxpayerCategory` / `taxpayerCategoryLabel` | string | — | Selected category and its display label |
| `yearOfAssessment` | string | — | Year of assessment the rule targets, e.g. `2025/26` |
| `businessIncome` | string | LKR | Validated gross business income |
| `allowableExpenses` | string | LKR | Validated allowable expenses |
| `capitalAllowances` | string | LKR | Validated capital allowances (zero when absent) |
| `totalDeductions` | string | LKR | `allowableExpenses + capitalAllowances` |
| `taxableIncomeBeforeRelief` | string | LKR | `max(businessIncome - totalDeductions, 0)` |
| `personalRelief` | string | LKR | Relief applied (statutory, user override, or zero) |
| `personalReliefSource` | string | — | `official`, `user`, or `not-applicable` |
| `taxableIncome` | string | LKR | `max(taxableIncomeBeforeRelief - personalRelief, 0)` |
| `unroundedTax` | string | LKR | Sum of band tax before the final rounding |
| `incomeTax` | string | LKR | Tax after rounding once to the nearest rupee |
| `effectiveRatePercent` | string | percent | `incomeTax / taxableIncome * 100` when taxable income is positive, else `0.00` |

The result breakdown presents the business type, year of assessment, income, each deduction, relief, taxable income, each marginal band contribution, unrounded tax, final rounded tax, and effective rate. All LKR values are decimal strings.

## Formula And Rate Convention

Let `I = businessIncome`, `E = allowableExpenses`, `C = capitalAllowances`, `R` = personal relief (individual category only), and `T = max(I - E - C - R, 0)`.

Tax is the sum over marginal slices of `slice * rate`, with no intermediate rounding, then rounded once to the nearest rupee (half up).

### Individual sole proprietor — Y/A 2025/26

| Slice of taxable income | Rate |
|---|---:|
| First `1,000,000` | 6% |
| Next `500,000` (to `1,500,000`) | 18% |
| Next `500,000` (to `2,000,000`) | 24% |
| Next `500,000` (to `2,500,000`) | 30% |
| Balance over `2,500,000` | 36% |

The statutory personal relief is LKR `1,800,000` per year of assessment. It is applied automatically; an override is accepted only for this category.

### Partnership

The first `1,000,000` of taxable partnership income is exempt (`0%`); the balance is taxed at a flat `6%`. No personal relief applies.

### Company

All taxable income is taxed at a flat `30%`. No personal relief applies.

## Rounding Order

1. Validate all LKR inputs as whole rupees; do not round an input into the contract.
2. Compute `T` with exact decimal arithmetic.
3. Compute each marginal slice and its tax with exact decimal arithmetic.
4. Sum the slice taxes with no intermediate rounding.
5. Apply `ROUND_HALF_UP` once to the total, producing the nearest whole rupee.
6. Serialize `incomeTax` as a fixed two-decimal LKR string (always `.00` cents).

For example, a taxable income of `1,000,003` produces `60,000.00 + 0.54 = 60,000.54`, which rounds to `60,001.00`.

## Assumptions And Exclusions

- Rates apply to year of assessment `2025/26` effective `2025-04-01` as published by the Inland Revenue Department.
- The caller has already classified the income and expenses; the calculator does not determine tax status or expense allowability.
- The full statutory personal relief is applied for an individual sole proprietor. Because relief is shared across all income sources in a real return, the override exists for cases where other income already consumes part of it.
- Losses carried forward, disallowed expenses, capital-gain interaction, betting/gaming/liquor/tobacco rates, service-export and foreign-remitted income rates, foreign tax credits, withholding-tax credit set-off, and Commissioner-General discretion cases are not modelled.
- Historical dates before `2025-04-01` require separately reviewed rule versions; this formula must not be back-applied.
- The result is an estimate for self-assessment, not tax, legal, or accounting advice.

## Boundary Cases

- `T = 0` produces zero tax with no band contributions.
- Each marginal slice uses the lower band's inclusive upper bound exactly as documented.
- A fractional unrounded total is always rounded once to the nearest rupee.
- A `personalReliefOverride` entered for a partnership or company is rejected by the input schema.
- If `asOfDate` cannot resolve to a reviewed active rule version, calculation fails rather than silently using this candidate.

## Official Sources

- [IRD Tax Chart Year of Assessment 2025/2026](https://www.ird.gov.lk/en/publications/SitePages/tax_chart_2526.aspx?menuid=1401): individual, company, and partnership rate summaries for Y/A 2025/26.
- [IRD Income Tax Publications (Acts)](https://www.ird.gov.lk/en/publications/Acts_Income%20Tax_2017/IRA_Cons_Act_-_2025_Changes.pdf): consolidated Inland Revenue Act incorporating 2025 changes.
- [Inland Revenue (Amendment) Act No. 2 of 2025](https://www.ird.gov.lk/en/publications/Acts_Income%20Tax_2017/IR_Act_No_02-2025_E.pdf).
- [IRD web notice SEC/PN/IT/2026-02](https://www.ird.gov.lk/en/Lists/Latest%20News%20%20Notices/Attachments/788/SEC_PN_IT_2026-02.pdf): Inland Revenue (Amendment) Act No. 11 of 2026 changes.
- [IRD Forms and Returns](https://www.ird.gov.lk/en/downloads/sitepages/forms.aspx?menuid=1603): TPR registration forms and return schedules.

## Golden Fixtures

All fixtures use `asOfDate: "2026-08-16"` and are candidate fixtures transcribed from the formula above; they require the review gate before production publication.

| Category | `businessIncome` | `allowableExpenses` | `capitalAllowances` | Relief | Expected `incomeTax` | Boundary purpose |
|---|---|---:|---:|---:|---:|---|
| individual | 3000000 | 200000 | — | official | `"60000.00"` | Only the first band |
| individual | 4000000 | 500000 | 100000 | official | `"174000.00"` | Multiple bands + capital allowances |
| individual | 1500000 | 200000 | — | official | `"0.00"` | Below relief |
| individual | 3500000 | 200000 | — | 2000000 | `"114000.00"` | User relief override |
| partnership | 1200000 | 200000 | — | n/a | `"0.00"` | Within exemption |
| partnership | 2500000 | 300000 | — | n/a | `"72000.00"` | Balance over exemption |
| company | 10000000 | 4000000 | 1000000 | n/a | `"1500000.00"` | Flat 30% |
| individual | 3000003 | 200000 | — | official | `"60001.00"` | Nearest-rupee rounding observable |

## Provenance

Every result must include the resolved calculation version, rule version, effective date, all attached IRD source references, and the latest successful source verification time. The source-link verification date is `2026-08-16`; it is not a substitute for independent content review. Regulated execution is server-authoritative. Missing, draft-only, stale-without-policy, or unresolved rule/source provenance must fail closed rather than return an unversioned result.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.business-income-tax.name` | Business income tax calculator |
| `calculator.business-income-tax.summary` | Estimate annual income tax on business profits for a sole proprietor, partnership, or company. |
| `calculator.business-income-tax.input.asOfDate` | Calculation date |
| `calculator.business-income-tax.input.taxpayerCategory` | Business type |
| `calculator.business-income-tax.input.businessIncome` | Business income |
| `calculator.business-income-tax.input.allowableExpenses` | Allowable expenses |
| `calculator.business-income-tax.input.capitalAllowances` | Capital allowances (optional) |
| `calculator.business-income-tax.input.personalReliefOverride` | Personal relief (optional) |
| `calculator.business-income-tax.output.incomeTax` | Income tax payable |
| `calculator.business-income-tax.breakdown.taxableIncome` | Taxable income |
| `calculator.business-income-tax.breakdown.effectiveRate` | Effective rate |
| `calculator.business-income-tax.assumption.rates` | Rates apply to year of assessment 2025/26 as published by the Inland Revenue Department. |
| `calculator.business-income-tax.warning.estimate` | This candidate estimate still requires independent formula and accounting review before production publication. |
| `calculator.business-income-tax.error.wholeRupees` | Enter amounts as nonnegative whole numbers of Sri Lankan rupees. |
| `calculator.business-income-tax.error.ruleUnavailable` | No reviewed business income tax rule is available for this date. |

Translate the complete labels, guidance, formula explanation, breakdown, assumptions, exclusions, source titles, warnings, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve LKR, field identifiers, dates, percentages, and threshold semantics.

## Privacy

The calculator is anonymous. Business income, expenses, and results are not persisted by default and raw values must not be captured in logs, analytics, source-verification records, or rule-publication events. A calculation request sends only the required date, category, and amounts. Saved scenarios are separate future scope and require an explicit retention and deletion policy.
