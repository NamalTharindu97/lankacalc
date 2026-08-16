# Business And Tax Product Specification (Stage 10.6 Candidate)

## Status

- Owner: LankaCalc regulated business and tax calculation kernel
- Roadmap gate: `plan/LankaTools_Implementation_Roadmap.md` section 10.6 requires product specifications before implementation. This document is that specification.
- Status: Candidate product specification for review. It defines scope, categories, periods, and sources. It authorizes specification drafting and, after approval, implementation and automated fixture testing of the candidate calculators below. It does not authorize public production results: regulated rules still require attached source revisions, passing fixtures, and independent formula/accounting review before publication.
- Research retrieved and link-verified: 2026-08-16.
- Product source: `docs/Sri_Lanka_Web_Application_Service_Research.md` sections 4 (LankaCalc), 11 (SME Compliance Assistant), and 12 (FreelancerLK).

## Purpose

Define the Business And Tax slice of the catalog before implementation so that no generic-named calculator is built without a specification. Concretely this document fixes the six areas the roadmap requires:

- intended taxpayer or business category;
- tax period;
- income and expense categories;
- regulatory scope;
- official sources;
- classification of each tool (arithmetic, regulated, configurable, or workflow-based).

## Product Scope

### In scope (Stage 10.6 candidate calculators)

| Candidate identifier | Display | Classification | One-line scope |
|---|---|---|---|
| `business-income-tax` | Business income tax estimator | regulated | Estimated annual income tax for a sole proprietor, partnership share, or company from profit-based business income, by year of assessment and applicable rate. |
| `vat-liability` | VAT liability and registration check | regulated | Estimated VAT payable (output less input credit) and registration-threshold indication, by taxable period. |
| `withholding-tax` | Withholding tax (AIT/WHT) on payments | regulated | Estimated withholding or advance income tax on interest, dividends, and specified payments, by payment date. |
| `freelance-tax-estimate` | Freelancer tax estimate | regulated | Estimated annual income tax for freelancers and service exporters, including the foreign-currency-remitted capped-rate path and foreign tax credit. |
| `sscl-check` | Social Security Contribution Levy check | regulated | Registration-threshold check and estimated SSCL on liable turnover, by turnover period. |

These map to the arithmetic/regulated needs of the SME Compliance Assistant (APIT support, payroll figures) and FreelancerLK (tax estimates), without duplicating the existing employment family.

### Already covered elsewhere (do not rebuild here)

- APIT, salary, take-home, net-to-gross, EPF, ETF, gratuity, overtime, job-offer comparison: existing employment family (`docs/calculators/apit.md` and siblings, `docs/employment-rule-sources.md`).

### Out of scope for 10.6 (workflow or account products, not calculators)

These are product features of sections 11 and 12 but are workflow-based or persistence-based, not calculation kernels. They are deferred to Stage 6 guidance/deadline products or a future account stage and must not be widened into the current stage:

- compliance calendar, deadline reminders, tax calendar (defer to `LankaDeadline`, Stage 6);
- invoice generator, income tracking, expense tracking, client records (account features);
- document storage, proof-of-payment records, employee records, compliance history, income reports, PDF/Excel export (account features);
- USD/LKR conversion (changing price data, not a tax rule; requires a source-backed FX service, out of the regulated family).

## Intended Taxpayer Or Business Category

Candidate calculators target these categories only. A calculator must declare which category it supports and reject inputs that imply an unsupported category rather than silently applying a wrong rate.

| Category | Business income tax | Freelance tax estimate | VAT | WHT/AIT | SSCL |
|---|:---:|:---:|:---:|:---:|:---:|
| Resident individual sole proprietor | yes | no | yes* | n/a | yes* |
| Resident freelancer / service exporter (foreign-currency-remitted) | no | yes | no | n/a | no |
| Partnership (resident) | yes (share basis) | no | yes* | n/a | yes* |
| Private company / SME (resident) | yes | no | yes* | yes | yes* |
| Person receiving interest / dividends / specified payments | n/a | n/a | n/a | yes | n/a |
| VAT-registered or threshold-crossing supplier | n/a | n/a | yes | n/a | yes |
| Financial-services supplier | n/a | n/a | yes (20.5% path) | n/a | no (exempt where VAT at 20.5%) |
| Non-resident digital service provider (VAT) | n/a | n/a | registration check only | n/a | n/a |

`*` within the registered/liable-turnover thresholds; non-registrants get a threshold indication, not a return estimate.

Non-resident individuals, non-resident companies, trusts, unit trusts, NGOs, betting/gaming, and liquor/tobacco manufacture are out of the initial candidate scope even though rates exist in the Tax Chart; they are separate reviewed rules.

## Tax Period

- **Year of assessment (income tax):** 1 April to 31 March (`business-income-tax`, `freelance-tax-estimate`). A user always selects the year of assessment; the calculator resolves the rule version effective for that year.
- **Monthly:** APIT is a monthly withholding (already the employment family's concern). VAT is a monthly taxable period for the registered persons the VAT Act designates; SSCL follows the turnover period.
- **Quarterly:** VAT taxable period is quarterly for other registered persons (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec). SSCL thresholds are assessed per rolling 12 months and per quarter.
- **Payment dates:** VAT is payable by the 20th of the following month; these are calendar/deadline features (Stage 6), not calculation outputs, except where a return-period end date affects rounding of period totals.

## Income And Expense Categories

### Income sources (Inland Revenue Act No. 24 of 2017)

The Act classifies assessable income into employment, business, investment, and other income (sections 5-8). The business and tax family uses only:

- **Business income (section 6):** service fees; consideration for trading stock; business capital gains; amounts on realisation of depreciable assets; gifts received for the business; amounts effectively connected with the business; other amounts the Act includes.
- **Investment income (section 7):** dividends, interest, and other investment profits, where relevant to WHT and to the sole-proprietor return.
- **Other income (section 8):** only where the supported category requires it.

Employment income (section 5) belongs to the existing employment family and is not re-modelled here, though the freelance tool must accept that a freelancer's foreign service income is business income, not employment income.

### Expense categories (deductions)

- Expenses incurred in producing the assessable income (section 9), apportioned where partly private;
- Capital allowances on depreciable assets (Fourth Schedule);
- Loss deductions subject to the Act's loss-ring-fencing and reduced-rate rules;
- Foreign tax credit for foreign-source income taxed abroad (section 80);
- Explicitly excluded by the calculator: personal and capital expenditure, disallowed items, and any deduction that requires the Commissioner-General's discretion or specific approval.

### Rates that must come from official tables, not the product spec

This spec does not fix rate values. The following are pinned only inside date-effective rule payloads built from official sources and confirmed by independent review:

- individual progressive and company/partnership rates (Tax Chart by year of assessment, First Schedule);
- the 15% capped-rate path for service exports and remitted foreign-source income;
- VAT standard and financial-services rates by date;
- SSCL rate and liable-turnover fractions;
- WHT/AIT rates on interest, dividends, and specified payments;
- capital gains tax rates by date.

## Regulatory Scope

- Inland Revenue Act No. 24 of 2017, as amended, including Inland Revenue (Amendment) Act No. 2 of 2025 (effective 01.04.2025) and Inland Revenue (Amendment) Act No. 11 of 2026 (certified 03.06.2026). The consolidated text incorporating 2025 changes is the primary working text.
- Value Added Tax Act No. 14 of 2002, as amended, including Value Added Tax (Amendment) Act No. 4 of 2025 (certified 11.04.2025) and Value Added Tax (Amendment) Act No. 14 of 2026 (certified 30.06.2026).
- Social Security Contribution Levy Act No. 25 of 2022, as amended.
- EPF Act No. 15 of 1958 and ETF Act No. 46 of 1980: referenced through the employment family, not re-derived.
- Gazette notifications referenced by the VAT Act (chargeability, exemptions, liable-turnover fractions under SSCL).

## Official Sources

Primary sources (link-verified 2026-08-16):

- [IRD Tax Chart Year of Assessment 2025/2026](https://www.ird.gov.lk/en/publications/SitePages/tax_chart_2526.aspx?menuid=1401): individual, company, partnership, WHT/AIT, VAT, and SSCL rate summaries.
- [IRD Income Tax Publications (Acts)](https://www.ird.gov.lk/en/publications/Acts_Income%20Tax_2017/IRA_Cons_Act_-_2025_Changes.pdf): consolidated Inland Revenue Act incorporating 2025 changes.
- [Inland Revenue (Amendment) Act No. 2 of 2025](https://www.ird.gov.lk/en/publications/Acts_Income%20Tax_2017/IR_Act_No_02-2025_E.pdf).
- [IRD web notice SEC/PN/IT/2026-02](https://www.ird.gov.lk/en/Lists/Latest%20News%20%20Notices/Attachments/788/SEC_PN_IT_2026-02.pdf): Inland Revenue (Amendment) Act No. 11 of 2026 changes.
- [IRD VAT overview and registration thresholds](https://www.ird.gov.lk/en/type%20of%20taxes/sitepages/value%20added%20tax%20(vat).aspx).
- [IRD VAT web notice PN/VAT/2025-01](https://www.ird.gov.lk/en/Lists/Latest%20News%20%20Notices/Attachments/677/PN_VAT_2025-01_11042025_E.pdf).
- [IRD web notice SEC/PN/VAT/2026-03](https://assets.kpmg.com/content/dam/kpmgsites/lk/pdf/kpmg-tax-news/2026/july/Notice_on_Amendments_to_the_VAT_Act.pdf): Value Added Tax (Amendment) Act No. 14 of 2026 changes.
- [Value Added Tax (Amendment) Act No. 14 of 2026](https://www.parliament.lk/uploads/acts/gbills/english/6427.pdf).
- [IRD Forms and Returns](https://www.ird.gov.lk/en/downloads/sitepages/forms.aspx?menuid=1603): TPR registration forms, return schedules.

Secondary cross-checks (not authoritative): KPMG Sri Lanka tax flash news and the IBA country tax report. Where a secondary source disagrees with an IRD publication, the IRD publication governs and the disagreement is recorded.

## Classification

- `business-income-tax`, `vat-liability`, `withholding-tax`, `freelance-tax-estimate`, `sscl-check`: **regulated**. Server-authoritative, date-effective rule versions, published-gate enforced, fail closed when provenance is missing.
- Threshold and registration checks are **arithmetic** helpers within the regulated tools (e.g., "does 12-month turnover exceed the VAT threshold?"), not independent calculators.
- Everything in the "Out of scope" list is **workflow-based or account-based**, not a calculator.

## Rule-Version And Publication Gate

Each candidate calculator depends on a date-effective rule:

| Calculator | Candidate rule key (pattern) | Candidate initial effective date |
|---|---|---|
| `business-income-tax` | `business-income-tax-lk-2026` | 2025-04-01 (Y/A 2025/26) |
| `vat-liability` | `vat-liability-lk-2026` | 2024-01-01 (thresholds); 2026-07-01 (financial services rate) |
| `withholding-tax` | `withholding-tax-lk-2026` | 2025-04-01 (interest WHT) |
| `freelance-tax-estimate` | `freelance-tax-estimate-lk-2026` | 2025-04-01 (Y/A 2025/26) |
| `sscl-check` | `sscl-lk-2026` | 2024-01-01 |

Publication rules mirror the employment family: an official verified source revision, at least one passing fixture executed against the payload checksum, and an independent formula/accounting review. Until then, rules remain implementation candidates and results are labelled estimates. Missing, draft-only, or unresolved provenance fails closed.

## Golden Fixtures

Fixtures are built after each payload pins its rates from the official tables. Each calculator ships at minimum:

- a boundary fixture at every threshold transition in the initial rule;
- a mid-band fixture per supported category;
- an out-of-category rejection fixture;
- for `freelance-tax-estimate`, a foreign-currency-remitted fixture exercising the 15% cap and the foreign tax credit;
- for `vat-liability`, an input-credit fixture and a registration-threshold boundary.

## Localization

All labels, guidance, category names, explanation text, assumptions, exclusions, source titles, warnings, errors, and examples are localized targets for English, Sinhala, and Tamil. Preserve statute citations, field identifiers, LKR, percentages, dates, and `APIT`/`VAT`/`WHT`/`AIT`/`SSCL`/`TIN` abbreviations in their familiar forms.

## Privacy

The calculators are anonymous. Tax and turnover inputs and results are not persisted by default and raw values must not be captured in logs, analytics, source-verification records, or rule-publication events. A request sends only the fields the selected category requires. Saved business scenarios, invoices, and employee records are account features with an explicit retention and deletion policy, separate from these calculators.

## Dependencies And Open Items

- The exact personal relief and individual annual bracket boundaries for Y/A 2025/26 and later must be transcribed from the First Schedule / Tax Chart and confirmed by independent review; the monthly APIT table is not sufficient to derive the annual assessment.
- SME/provincial special company rates and any turnover-based presumptive regime for 2025/26 and later must be confirmed against the current Tax Chart before `business-income-tax` adds those paths.
- SSCL's current status (in-force rate, exemptions, liable-turnover fractions) must be confirmed as of each effective date before `sscl-check` publishes.
- Dividend WHT rates and payments-to-non-resident rates are taken from the IRD withholding schedules at implementation time, not asserted here.
- This specification requires the product owner's approval before `business-income-tax` or any other candidate calculator here is implemented.
