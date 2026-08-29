# Lease Calculator Specification

## Identity

- Identifier: `lease`
- Display name: Lease calculator
- Owner: LankaCalc calculation kernel
- Classification: configurable
- Execution: server
- Calculation version: `1.1.0`
- Rule dependency: `vehicle-lease-ltv-lk-2026` (`lk` scope)

## Approval

- Status: Approved implementation candidate
- Implementation use: formula, validation, server integration, and candidate fixtures
- Production publication: blocked pending independent review of the CBSL direction, category mapping, effective date, formula, units, rounding, fixtures, source revisions, and translations
- Source research and link verification: 2026-08-16
- Source dossier: `docs/lending-rule-sources.md`
- Localization inventory: `docs/calculators/localization-keys.md`

Repository approval permits implementation and local testing only. It does not authorize publishing the calculator or its rule in production.

## Inputs

| Field | Type | Unit | Required | Bounds |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve to an applicable reviewed LTV rule version; current candidate coverage starts `2025-07-18` |
| `rateSource` | enum | - | yes, default `user` | `user` or `platform` |
| `assetValue` | decimal | LKR | yes | At least `0.01`, at most `1,000,000,000,000`; at most 2 decimal places |
| `deposit` | decimal | LKR | yes | `0` to `1,000,000,000,000`; at most 2 decimal places |
| `residualValue` | decimal | LKR | yes | `0` to `1,000,000,000,000`; at most 2 decimal places |
| `annualRatePercent` | decimal | percent per year | yes | `0` to `100`, inclusive; at most 6 decimal places |
| `termMonths` | integer | months | yes | `1` to `1200`, inclusive |
| `processingFeePercent` | decimal | percent of asset | yes, default `0` | `0` to `100`; at most 2 decimal places |
| `vehicleClass` | enum | - | when `rateSource: platform` | `motor-car`, `three-wheeler`, `commercial`, or `other` |
| `vehicleUsedMoreThanOneYear` | enum | - | yes, default `no` | `yes` or `no`; used by the platform cap resolver |

Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing and blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected. `termMonths` must remain an integer after parsing. `deposit + residualValue` must be less than `assetValue`.

`rateSource` does not select the payment rate: `annualRatePercent` is always user-entered and drives the payment formula. `platform` additionally resolves and checks the CBSL vehicle LTV cap. The current server registration declares the LTV rule as a calculator dependency for both modes, so the calculation fails closed when an applicable published rule with required provenance cannot be resolved, including in `user` mode.

## Outputs

Base outputs in both modes:

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `financedAmount` | string | LKR | `assetValue - deposit - residualValue` |
| `monthlyPayment` | string | LKR/month | Rounded fixed monthly installment |
| `balloonPayment` | string | LKR | Residual value due at the end of the term |
| `totalInstallments` | string | LKR | `monthlyPayment * termMonths` |
| `totalInterest` | string | LKR | `totalInstallments - financedAmount` |
| `processingFeeAmount` | string | LKR | `assetValue * processingFeePercent / 100`, rounded to cents |
| `totalCost` | string | LKR | `deposit + processingFeeAmount + totalInstallments + residualValue` |

Additional outputs only when `rateSource: platform`:

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `rateSource` | string | - | `platform` |
| `vehicleClass` | string | - | Selected vehicle category |
| `vehicleUsedMoreThanOneYear` | string | - | Whether the flat used-vehicle cap applies |
| `effectiveLtvPercent` | string | percent | `(assetValue - deposit) / assetValue * 100`, rounded to two decimal places |
| `maxLtvPercent` | string | percent | Applicable CBSL candidate cap |
| `rateLabel` | string | - | Resolved cap/category label |
| `rateObservationDate` | string | calendar date | Effective observation date of the resolved cap |
| `rateAuthority` | string | - | `Central Bank of Sri Lanka` |

## Payment Formula And Rate Convention

Let `F = assetValue - deposit - residualValue`, `N = termMonths`, and `i = annualRatePercent / 100 / 12`.

- If `i = 0`: `unroundedMonthlyPayment = F / N`.
- Otherwise: `unroundedMonthlyPayment = F * i * (1 + i)^N / ((1 + i)^N - 1)`.

The annual input is a nominal annual percentage rate divided by 12. It is not an effective annual rate; monthly compounding and monthly payments are assumed. The residual is a balloon due at the end of the term and is not amortized into the monthly payment.

## Platform LTV Check

When `rateSource: platform`:

1. Resolve the latest applicable `max-motor-vehicle-ltv` observation on or before `asOfDate`.
2. If `vehicleUsedMoreThanOneYear: yes`, use the flat `used` category; otherwise resolve the selected `vehicleClass`.
3. Calculate `effectiveLtvPercent = (assetValue - deposit) / assetValue * 100`.
4. Warn when the unrounded effective LTV exceeds the resolved maximum. The cap does not change the entered rate, payment, deposit, or result automatically.

Candidate caps effective `2025-07-18` are 60% for motor cars/SUVs/vans, 50% for three wheelers, 80% for commercial vehicles/light trucks, 70% for other vehicles, and 70% for vehicles registered and used in Sri Lanka for more than one year. These remain review-gated candidate values; the published rule and attached source revisions are authoritative at runtime.

## Rounding Order

1. Calculate the monthly payment at full decimal precision and round it to two decimal places using round-half-up.
2. Multiply the rounded monthly payment by `termMonths` for `totalInstallments`.
3. Subtract the unrounded financed amount from `totalInstallments` for `totalInterest`.
4. Calculate the processing fee and total cost, then serialize monetary outputs as fixed two-decimal strings.
5. Calculate effective LTV from the unrounded asset value and deposit, retain the unrounded value for the cap comparison, and display it to two decimal places.

## Assumptions And Exclusions

- The entered rate remains fixed for the whole term; the deposit is paid upfront and the residual is paid as a final balloon.
- The processing fee is paid upfront and is not financed into the lease.
- Every monthly installment is identical; the balloon absorbs the residual, not a rounding adjustment.
- The platform value is a regulatory LTV cap, not an observed lease rate, lessor quotation, approval decision, or required deposit calculation.
- Taxes, penalties, insurance charges, valuation differences, lender eligibility rules, and lessor-specific rounding are excluded.
- Results are estimates, not lease approval, financial advice, legal advice, or a lessor quotation.

## Boundary And Failure Cases

- A zero rate uses simple division and avoids the annuity formula's zero denominator.
- `deposit + residualValue >= assetValue` is rejected.
- Platform mode without `vehicleClass` is rejected.
- A platform calculation before the resolved direction's effective date fails as out of range.
- A missing, draft-only, unverified, stale-outside-policy, or otherwise inapplicable required rule/source set fails closed.
- Zero or negative asset values, negative deposits or residuals, fractional months, and values above maxima are rejected.
- Any non-finite or out-of-contract intermediate/result fails instead of serializing as `null`.

## Candidate Golden Fixtures

All fixtures use the candidate `vehicle-lease-ltv-lk-2026` payload. They validate implementation behavior but require independent confirmation before production publication.

| Input | Expected result |
|---|---|
| `asOfDate: 2026-08-16`, `rateSource: user`, `assetValue: 2000000`, `deposit: 200000`, `residualValue: 400000`, `annualRatePercent: 12`, `termMonths: 24`, `processingFeePercent: 1` | `financedAmount: "1400000.00"`, `monthlyPayment: "65902.86"`, `balloonPayment: "400000.00"`, `totalInstallments: "1581668.64"`, `totalInterest: "181668.64"`, `processingFeeAmount: "20000.00"`, `totalCost: "2201668.64"` |
| `asOfDate: 2026-08-16`, `rateSource: user`, `assetValue: 1200000`, `deposit: 120000`, `residualValue: 0`, `annualRatePercent: 0`, `termMonths: 12`, `processingFeePercent: 0` | `financedAmount: "1080000.00"`, `monthlyPayment: "90000.00"`, `balloonPayment: "0.00"`, `totalInstallments: "1080000.00"`, `totalInterest: "0.00"`, `totalCost: "1200000.00"` |
| `asOfDate: 2026-08-16`, `rateSource: platform`, `assetValue: 2000000`, `deposit: 200000`, `residualValue: 400000`, `annualRatePercent: 12`, `termMonths: 24`, `processingFeePercent: 1`, `vehicleClass: motor-car`, `vehicleUsedMoreThanOneYear: no` | `effectiveLtvPercent: "90.00"`, `maxLtvPercent: "60"`, `rateObservationDate: "2025-07-18"`, `rateAuthority: "Central Bank of Sri Lanka"`; above-cap warning present |
| Same platform input with `deposit: 1000000` | `effectiveLtvPercent: "50.00"`, `maxLtvPercent: "60"`; no above-cap warning |
| Platform input with `assetValue: 1000000`, `deposit: 400000`, `residualValue: 0`, `vehicleClass: three-wheeler`, `vehicleUsedMoreThanOneYear: no` | `effectiveLtvPercent: "60.00"`, `maxLtvPercent: "50"`; above-cap warning present |
| Platform input with `assetValue: 2000000`, `deposit: 400000`, `residualValue: 400000`, `vehicleClass: motor-car`, `vehicleUsedMoreThanOneYear: yes` | `effectiveLtvPercent: "80.00"`, `maxLtvPercent: "70"`; used-vehicle label and above-cap warning present |
| Platform input with `asOfDate: 2025-07-01` | Fails as out of range before the candidate direction effective date |

## Official Sources And Provenance

The candidate rule is derived from the official sources recorded in `docs/lending-rule-sources.md`, principally CBSL Act Directions No. 02 of 2025 and the CBSL LTV FAQ. Link verification on `2026-08-16` confirms source availability and candidate transcription, not independent legal, formula, or accounting approval.

Every server result must include calculation version `1.1.0`, the resolved rule version and effective date, attached CBSL source revisions, and the latest successful source verification time. Production must not use the local development seed as approval evidence. Missing required provenance must fail closed rather than return an unversioned result.

## Localization And Privacy

Localize the display name, all base and platform field/breakdown labels, vehicle categories, nominal-rate and balloon explanations, LTV cap explanation, assumptions, warnings, validation errors, source titles, and examples into reviewed English, Sinhala, and Tamil. Preserve `CBSL`, LKR, percentages, dates, DMT class semantics, and API field identifiers.

The calculator is anonymous but server-executed. The API receives the calculation date, source mode, financial fields, and platform vehicle fields when selected. Inputs and results are not persisted and raw financial values must not be captured in logs or analytics.
