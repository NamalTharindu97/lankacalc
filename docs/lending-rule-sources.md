# Lending Rate Rule Source Dossier

## Purpose

This dossier records the primary sources and candidate rule findings for the Stage 5 lending calculators (`loan-schedule` and `lease`). The candidate findings are sufficient to implement code and automated fixtures within the narrow documented scope. They are not approval for public production publication: published rules still require attached source revisions, passing fixtures, and independent review of rate-setting authority and coverage.

Research retrieved and link-verified: 2026-08-16.

## Status

| Rule area | Research status | Publication status |
|---|---|---|
| CBSL average weighted prime lending rate (AWPR), monthly | Monthly AWPR values verified against the CBSL Statistics page and monthly bulletin PDFs | Approved implementation candidate; blocked pending independent review |
| Licensed finance company (LFC) / bank lending rates for lease finance | LFC rates are institution-specific and market-set rather than a single published series | Out of scope for the current rule; the lease calculator remains user-rate only |

## Sources

Issuing authority: Central Bank of Sri Lanka (CBSL).

### Official Sources

- [CBSL Statistics — Interest Rates](https://www.cbsl.gov.lk/en/statistics/statistical-tables/interest-rates) publishes the monthly average weighted prime lending rate (AWPR) and related interest-rate tables.
- [CBSL Economic and Financial Statistics / monthly bulletin PDFs](https://www.cbsl.gov.lk/en/publications/economic-and-financial-reports/economic-and-financial-statistics) carry the detailed monthly AWPR series; the January 2026 bulletin reports AWPR at 8.99% and the May 2026 bulletin at 9.75%.
- [CBSL — Main Publications](https://www.cbsl.gov.lk/en/publications) hosts the monthly bulletins used for cross-checking the statistics-page series.

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
- The lease calculator does not use this series; CBSL does not publish a single equivalent series for licensed finance company lease pricing.

## Limitations

- The AWPR changes monthly; the rule version must carry an explicit observation date and the calculation must resolve the applicable observation by date.
- This dossier records the published series and its public announcement; it does not independently verify each bank's reported prime rate submissions.
- Values were verified on 2026-08-16 against the January and May 2026 bulletins. Later bulletins require a new rule version.
