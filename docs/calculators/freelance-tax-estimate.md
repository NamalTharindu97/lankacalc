# Freelancer tax estimate

Identity and behavior for the regulated `freelance-tax-estimate` calculator.

| | |
|---|---|
| Calculator key | `freelance-tax-estimate` |
| Classification | regulated |
| Rule dependency | `freelance-tax-estimate-lk-2026`, scope `lk` |
| Version | 1.0.0 |
| Category | Business & Tax |
| Accent | gold |

## Scope

Estimates annual income tax for a resident individual freelancer or service exporter. The tool models the general individual progressive rates and the **foreign-currency-remitted capped-rate path**: service income rendered for use outside Sri Lanka (or foreign-source income), received in foreign currency and remitted through a bank in Sri Lanka, is taxed at a **maximum of 15%** for a year of assessment commencing on or after 1 April 2025 (Inland Revenue (Amendment) Act No. 2 of 2025). It also applies the **foreign tax credit** under section 80 of the Inland Revenue Act No. 24 of 2017.

Foreign service income is treated as business income (section 6), not employment income (section 5).

## Inputs

- `asOfDate` — the calculation date; the rule version effective for that year of assessment is resolved from it.
- `businessIncome` — gross service income for the year, in whole rupees.
- `allowableExpenses` — expenses incurred in producing the service income and allowed as deductions.
- `capitalAllowances` (optional) — Fourth Schedule depreciation on depreciable business assets.
- `personalReliefOverride` (optional) — override the statutory personal relief (default LKR 1,800,000).
- `foreignIncomeAmount` (optional) — the portion of income eligible for the 15% cap: services for use outside Sri Lanka or foreign-source income, received in foreign currency and remitted through a bank in Sri Lanka. It cannot exceed the total business income.
- `foreignTaxPaid` (optional) — income tax actually paid abroad on that foreign income; requires `foreignIncomeAmount`.

## Calculation

1. Taxable income = max(service income − allowable expenses − capital allowances − personal relief, 0).
2. The foreign-currency-remitted portion is capped at the taxable income; the rest is the domestic portion.
3. Normal bracket tax is computed on the total taxable income and on the domestic portion. The top slice (the foreign portion) would otherwise be taxed at the normal marginal rates.
4. The foreign portion is taxed at the lower of its normal marginal-rate tax and 15% of the portion — the cap is a ceiling and never increases the tax.
5. Gross tax = normal bracket tax on the domestic portion + capped tax on the foreign portion.
6. Foreign tax credit = lower of the foreign tax actually paid and the Sri Lankan tax attributable to the foreign income (the capped amount); excess foreign tax is not refundable or carried forward.
7. Income tax payable = max(gross tax − foreign tax credit, 0), rounded once to the nearest rupee.

## Outputs

- `yearOfAssessment`, `taxpayerCategoryLabel`, and the income, deduction, relief, and taxable-income steps.
- `domesticPortion`, `foreignIncomePortion`, `capPercent`.
- `foreignTaxNormal` (the tax the foreign slice would carry at the normal marginal rates) and `foreignTaxCapped` (the tax after the cap), plus `capApplied`.
- `unroundedTax`, `foreignTaxCredit`, `creditApplied`, `incomeTax`, `effectiveRatePercent`.
- The breakdown lists the domestic bracket rows, the foreign-income line, the credit, and the payable, with the standard provenance contract.

## Assumptions and exclusions

- The 15% cap applies only where the foreign service income is for use outside Sri Lanka, is received in foreign currency, and is remitted through a bank in Sri Lanka; otherwise the normal progressive rates (up to 36%) apply.
- The foreign tax credit requires evidence of foreign tax actually paid and is limited to the Sri Lankan tax on the foreign income; treaty relief is not modelled.
- Partnerships, companies, trusts, and non-resident individuals are out of scope (covered by other candidate calculators where relevant).
- Losses carried forward, disallowed expenses, capital-gain interaction, withholding-tax credit set-off, and Commissioner-General discretion cases are not modelled.
- This is an estimate for self-assessment, not tax, legal, or accounting advice, and is subject to independent formula and accounting review before production use.

## Sources

- Inland Revenue Act No. 24 of 2017, as amended, First Schedule (individual rates), section 80 (foreign tax credit), and section 81 (calculation of the credit).
- Inland Revenue (Amendment) Act No. 2 of 2025 (effective 1 April 2025): 15% maximum rate for foreign-currency-remitted service and foreign-source income.
- IRD Tax Chart Y/A 2025/26 (personal relief and individual brackets).

## Localization

Labels, guidance, category names, assumptions, exclusions, source titles, warnings, and errors are localization targets for English, Sinhala, and Tamil. Preserve statute citations, field identifiers, LKR, percentages, dates, and `APIT`/`WHT`/`TIN` abbreviations in their familiar forms.

## Privacy

The calculator is anonymous. Inputs and results are not persisted by default and raw values must not be captured in logs, analytics, source-verification records, or rule-publication events.
