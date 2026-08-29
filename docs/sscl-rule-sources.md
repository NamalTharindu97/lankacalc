# SSCL Rule Source And Revision Dossier

## Purpose

This dossier maps the candidate `sscl-lk-2026` rule to the current official Inland Revenue Department (IRD) instruments. It supports implementation and fixture review only. It does not authorize publication; independent legal or accounting review remains required.

Research retrieved and link-verified: 2026-08-29.

## Source Revisions

| Instrument | Certified or consolidated | Rule fact supported |
|---|---|---|
| [Social Security Contribution Levy Act, No. 25 of 2022](https://www.ird.gov.lk/en/publications/Acts_SSCL/SSCL_Act_No.%2025_2022_E.pdf) | 2022-09-20 | Levy charge, registration framework, turnover definitions, liable-turnover fractions, rate, and importer treatment |
| [Amendment Act, No. 15 of 2023](https://www.ird.gov.lk/en/publications/Acts_SSCL/SSCL_Act_No._15_2023_E.pdf) | 2023-09-08 | Amendments to exempt-turnover schedules incorporated into the current law |
| [Amendment Act, No. 15 of 2024](https://www.ird.gov.lk/en/publications/Acts_SSCL/SSCL_(Amd)_Act_No_15_of%202024_E.pdf) | 2024-03-20 | Amendments incorporated into the current law |
| [Amendment Act, No. 24 of 2025](https://www.ird.gov.lk/en/publications/Acts_SSCL/SSCL_Act_No_24_2025_E.pdf) | 2025-12-17 | Exemption for financial services liable to VAT at 20.5% |
| [Amendment Act, No. 10 of 2026](https://www.ird.gov.lk/en/publications/Acts_SSCL/SSCL_Act_No_10-2026_E.pdf) | 2026-04-09 | LKR 9 million quarterly and LKR 36 million four-quarter registration thresholds from 2026-07-01 |
| [Consolidated SSCL Act](https://www.ird.gov.lk/en/publications/Acts_SSCL/SSCL_Cons_Act_-_2026_Changes.pdf) | Amendments through 2026-06-30 | Cross-check of the principal Act and amendments |

The former IRD URLs recorded under `publications/Social Security Contribution Levy`, `publications/SSCL Acts`, and the old tax overview path returned `404` on the verification date. The candidate rule now uses the documents linked by the current [IRD Acts index](https://www.ird.gov.lk/en/publications/sitepages/acts.aspx).

## Rule Mapping

| Payload field or behavior | Candidate value | Official basis |
|---|---|---|
| `ratePercent` | `2.5` | Principal Act and consolidated text |
| `liableFractions` | 100%, 85%, 100%, 100%, 100%, 25%, and 50% by modeled category | Principal Act schedules and consolidated text; the financial-service percentage applies to attributable value addition, not raw turnover |
| Initial registration thresholds | LKR 15 million per quarter or LKR 60 million over four quarters | Principal Act as previously amended and consolidated text |
| Thresholds from `2026-07-01` | LKR 9 million per quarter or LKR 36 million over four quarters | Amendment Act No. 10 of 2026, sections 2 and 3 |
| Threshold comparison | Turnover must exceed the threshold | Statutory wording “exceeds or likely to exceed” |
| `financialServicesExemptFrom` | `2025-12-17` | Amendment Act No. 24 of 2025, sections 1(2) and 2(3)(d) |
| Pre-exemption financial services | Unsupported and fail closed | Principal Act requires the VAT Chapter IIIA attributable-value-addition method, which the calculator does not model |
| Importer registration | Mandatory regardless of turnover | Principal Act registration provisions |
| Final levy rounding | Nearest whole rupee, half up | Candidate implementation convention requiring independent review |

## Fixture Boundaries

The review package covers:

- old thresholds through the quarter commencing `2026-04-01`;
- new thresholds for the quarter commencing `2026-07-01`;
- equality at each threshold, which does not trigger registration;
- one rupee above the new quarterly threshold, which does trigger registration;
- fail-closed handling before, and exempt handling after, the `2025-12-17` financial-services exemption;
- mandatory importer registration, category fractions, annual-trigger registration, and half-rupee rounding.

## Review Gate

Before publication, an independent reviewer must confirm the modeled category mapping, turnover scope, importer treatment, effective dates, threshold tests, exemption scope, and nearest-rupee convention against the Sinhala controlling text where relevant. Source availability and automated fixtures are evidence inputs, not approval.
