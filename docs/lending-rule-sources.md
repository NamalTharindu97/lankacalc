# Lending Rate Rule Source Dossier

## Purpose

This dossier records the primary sources and candidate rule findings for the Stage 5 lending calculators (`loan-schedule` and `lease`). The candidate findings are sufficient to implement code and automated fixtures within the narrow documented scope. They are not approval for public production publication: published rules still require attached source revisions, passing fixtures, and independent review of rate-setting authority and coverage.

Research retrieved and link-verified: 2026-08-16.

## Status

| Rule area | Research status | Publication status |
|---|---|---|
| CBSL average weighted prime lending rate (AWPR), monthly | Monthly AWPR values verified against the CBSL Statistics page and monthly bulletin PDFs | Approved implementation candidate; blocked pending independent review |
| CBSL motor-vehicle loan-to-value (LTV) caps | LTV caps verified against CBSL Act Directions No. 02 of 2025 and the CBSL LTV FAQ | Approved implementation candidate; blocked pending independent review |
| Licensed finance company (LFC) / bank lending rates for lease finance | LFC rates are institution-specific and market-set rather than a single published series | Out of scope for the current rule; the lease calculator remains user-rate only for pricing, with the CBSL LTV cap used for the platform cap check |

## Sources

Issuing authority: Central Bank of Sri Lanka (CBSL).

### Official Sources

- [CBSL Statistics — Interest Rates](https://www.cbsl.gov.lk/en/statistics/statistical-tables/interest-rates) publishes the monthly average weighted prime lending rate (AWPR) and related interest-rate tables.
- [CBSL Economic and Financial Statistics / monthly bulletin PDFs](https://www.cbsl.gov.lk/en/publications/economic-and-financial-reports/economic-and-financial-statistics) carry the detailed monthly AWPR series; the January 2026 bulletin reports AWPR at 8.99% and the May 2026 bulletin at 9.75%.
- [CBSL — Main Publications](https://www.cbsl.gov.lk/en/publications) hosts the monthly bulletins used for cross-checking the statistics-page series.
- [CBSL Act Directions No. 02 of 2025: Loan to Value Ratios for Credit Facilities Granted in Respect of Motor Vehicles](https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/laws/cdg/CBSL_Act_Directions_No_2_of_2025.pdf) sets the maximum loan-to-value ratios for motor-vehicle finance leases and credit, effective 2025-07-18.
- [CBSL FAQ on LTV Ratios for Credit Facilities Granted in Respect of Motor Vehicles](https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/laws/cdg/faq_on_loan_to_value_ratios_for_credit_facilities_granted_in_respect_of_motor_vehicles_e.pdf) clarifies how the caps apply, including the flat cap for vehicles already used in Sri Lanka for more than one year.

### Extraction Method

Each monthly AWPR value was cross-checked between the CBSL Statistics page series and the corresponding monthly bulletin PDF. The observation date is the last calendar day of the month the rate applies to. Rates are recorded as annual percentage rates at two decimal places. The calculation resolves the latest published observation on or before the user's chosen calculation date.

## Candidate Rate Series (CBSL AWPR, monthly)

| Observation date | AWPR (percent per year) |
|---|---:|
| 2026-01-31 | 8.99 |
| 2026-03-31 | 9.39 |
| 2026-05-31 | 9.75 |

Notes:

- The AWPR is a weighted average of prime lending rates offered to the best customers by commercial banks; it is a market benchmark, not a regulatory ceiling, and individual loan rates vary by lender, credit profile, and product.
- Only months with a verified bulletin value are recorded in the rule. An `asOfDate` before the first recorded observation fails as out of range.
- The lease calculator does not use the AWPR series; CBSL does not publish a single equivalent series for licensed finance company lease pricing.

## Candidate Motor-Vehicle Loan-to-Value Caps (CBSL, effective 2025-07-18)

| Vehicle category | Maximum LTV (percent) |
|---|---:|
| Motor cars, SUVs and vans (DMT class B, other than light trucks and single cabs) | 60 |
| Three wheelers (DMT class B1) | 50 |
| Commercial vehicles and light trucks (DMT classes C1, C, CE, D1, D, DE, G1, G, J) | 80 |
| Other vehicles (DMT classes A1, A and single cabs under B) | 70 |
| Registered vehicles used in Sri Lanka for more than one year after first registration | 70 |

Notes:

- The effective loan-to-value is the financed portion before the balloon (asset value minus deposit) divided by the asset value, expressed as a percentage. The cap check compares this against the maximum for the selected vehicle category as resolved on the calculation date.
- A vehicle already registered and used in Sri Lanka for more than one year after first registration is subject to the flat 70% cap regardless of its DMT class.
- The lease calculator checks the cap only when the user selects the platform cap check; the payment math always uses the user-entered rate.
- An `asOfDate` before the direction's 2025-07-18 effective date fails as out of range.

## Limitations

- The AWPR changes monthly; the rule version must carry an explicit observation date and the calculation must resolve the applicable observation by date.
- This dossier records the published series and its public announcement; it does not independently verify each bank's reported prime rate submissions.
- Values were verified on 2026-08-16 against the January and May 2026 bulletins. Later bulletins require a new rule version.
