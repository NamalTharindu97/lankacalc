# Lease Calculator Specification

## Identity

- Identifier: `lease`
- Display name: Lease calculator
- Owner: LankaCalc calculation kernel
- Classification: static
- Calculation version: `1.0.0`

## Approval

- Status: Approved Stage 5 lending family
- Approval basis: the repository owner authorized phased implementation on 2026-08-15
- Localization inventory: `docs/calculators/localization-keys.md`

## Inputs

| Field | Type | Unit | Required | Bounds |
|---|---|---|---|---|
| `assetValue` | decimal | LKR | yes | at least `0.01`, at most `1,000,000,000,000`; at most 2 decimal places |
| `deposit` | decimal | LKR | yes | `0` to `1,000,000,000,000`; at most 2 decimal places; must leave a positive financed amount |
| `residualValue` | decimal | LKR | yes | `0` to `1,000,000,000,000`; at most 2 decimal places; must leave a positive financed amount |
| `annualRatePercent` | decimal | percent per year | yes | `0` to `100`, inclusive; at most 6 decimal places |
| `termMonths` | integer | months | yes | `1` to `1200`, inclusive |
| `processingFeePercent` | decimal | percent of asset | yes | `0` to `100`; at most 2 decimal places; default `0` |

Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing and blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected. `termMonths` must remain an integer after parsing. `deposit + residualValue` must be less than `assetValue`.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `financedAmount` | string | LKR | `assetValue - deposit - residualValue` |
| `monthlyPayment` | string | LKR/month | Rounded fixed monthly instalment |
| `balloonPayment` | string | LKR | The residual value, due at the end of the term |
| `totalInstallments` | string | LKR | `monthlyPayment * termMonths` |
| `totalInterest` | string | LKR | `totalInstallments - financedAmount` |
| `processingFeeAmount` | string | LKR | `assetValue * processingFeePercent / 100`, rounded to cents |
| `totalCost` | string | LKR | `deposit + processingFeeAmount + totalInstallments + residualValue` |

## Formula And Rate Convention

Let `F = financedAmount = assetValue - deposit - residualValue`, `N = termMonths`, and `i = annualRatePercent / 100 / 12`.

- If `i = 0`: `unroundedMonthlyPayment = F / N`.
- Otherwise: `unroundedMonthlyPayment = F * i * (1 + i)^N / ((1 + i)^N - 1)`.

The annual input is a nominal annual percentage rate divided by 12. It is not an effective annual rate; monthly compounding and monthly payments are assumed. The residual is a balloon due at the end of the term and is not amortized into the monthly payment.

## Rounding Order

1. Round `unroundedMonthlyPayment` to two decimal places using round-half-up; this is `monthlyPayment`.
2. Every month pays the same rounded instalment: `totalInstallments = monthlyPayment * termMonths`.
3. `totalInterest = totalInstallments - financedAmount`.
4. Round `processingFeeAmount` and `totalCost` to cents.
5. Serialize all monetary outputs as fixed two-decimal strings.

## Assumptions And Exclusions

- The rate and payment frequency remain fixed for the whole term; the deposit is paid upfront and the residual is paid as a final balloon.
- The processing fee is paid upfront and is not financed into the lease.
- Every monthly instalment is identical; the balloon absorbs the residual, not a rounding adjustment.
- Taxes, penalties, insurance charges, and lessor-specific rounding are excluded.
- Results are estimates, not approval, financial advice, or a lessor quotation.

## Boundary Cases

- A zero rate uses simple division and avoids the annuity formula's zero denominator.
- `deposit` plus `residualValue` equal to or greater than `assetValue` leaves nothing to finance and is rejected.
- Zero or negative asset values, negative deposits or residuals, fractional months, and values above the maxima are rejected.
- Any non-finite or out-of-contract intermediate/result fails instead of serializing as `null`.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `assetValue: 2000000`, `deposit: 200000`, `residualValue: 400000`, `annualRatePercent: 12`, `termMonths: 24`, `processingFeePercent: 1` | `financedAmount: "1400000.00"`, `monthlyPayment: "65902.86"`, `balloonPayment: "400000.00"`, `totalInstallments: "1581668.64"`, `totalInterest: "181668.64"`, `processingFeeAmount: "20000.00"`, `totalCost: "2201668.64"` |
| `assetValue: 1200000`, `deposit: 120000`, `residualValue: 0`, `annualRatePercent: 0`, `termMonths: 12`, `processingFeePercent: 0` | `financedAmount: "1080000.00"`, `monthlyPayment: "90000.00"`, `balloonPayment: "0.00"`, `totalInstallments: "1080000.00"`, `totalInterest: "0.00"`, `processingFeeAmount: "0.00"`, `totalCost: "1200000.00"` |

## Provenance

This is a static arithmetic estimate driven only by user inputs. No lessor rate, regulated rule, official source, effective date, or verification date is supplied; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`. Platform-observed lessor rates with source and date are a future configurable enhancement.

## Localization And Privacy

Localize the display name, field and breakdown labels, the nominal-rate and balloon explanations, assumptions, estimate warning, validation errors, and examples into reviewed English, Sinhala, and Tamil. Preserve LKR, percentage, month, and formula semantics.

The calculator is anonymous and may run in the browser. Financial inputs and results are not persisted and raw values must not be captured in logs or analytics; an API call sends only the six required fields.
