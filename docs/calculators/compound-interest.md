# Compound Interest Calculator Specification

## Identity

- Identifier: `compound-interest`
- Display name: Compound interest calculator
- Owner: LankaCalc calculation kernel
- Classification: static
- Calculation version: `2.0.0`

## Approval

- Status: Approved Stage 0 baseline
- Approval basis: the repository owner authorized phased implementation on 2026-08-14
- Localization inventory: `docs/calculators/localization-keys.md`

## Inputs

| Field | Type | Unit | Required | Bounds/default |
|---|---|---|---|---|
| `principal` | decimal | LKR | yes | `0` to `1,000,000,000,000`, inclusive; at most 2 decimal places |
| `annualRatePercent` | decimal | percent per year | yes | `0` to `100`, inclusive; at most 6 decimal places |
| `years` | decimal | years | yes | `0` to `100`, inclusive; at most 4 decimal places |
| `compoundsPerYear` | integer | periods/year | yes | `1`, `4`, `12`, or `365`; UI default `12` |

The domain, UI, and API support annual, quarterly, monthly, and daily compounding through `1`, `4`, `12`, and `365`. Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing or blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `finalAmount` | string | LKR | Principal plus compounded interest |
| `totalInterest` | string | LKR | `finalAmount` before display rounding minus principal |

The breakdown shows starting principal, interest earned, and final amount. Every decimal amount is serialized as a string.

## Formula And Rate Convention

Let `P = principal`, `r = annualRatePercent / 100`, `n = compoundsPerYear`, and `t = years`:

`finalAmount = P * (1 + r / n)^(n * t)`

`totalInterest = finalAmount - P`

The input rate is a nominal annual rate divided equally by `n`, not an effective annual rate. Fractional `years` are supported; when `n * t` is fractional, the formula uses that fractional exponent rather than truncating to a whole compounding period.

## Rounding

Compute both formulas at full decimal precision. Round `finalAmount` and `totalInterest` independently, once, to two decimal places using round-half-up, then serialize fixed two-decimal strings. Results must never become a JSON number, infinity, or `null`.

## Assumptions And Exclusions

- The nominal rate and compounding frequency remain fixed and all interest is reinvested.
- LKR is the display denomination; no currency conversion occurs.
- Taxes, fees, inflation, deposits, withdrawals, day-count conventions, and institution-specific posting rules are excluded.
- The calculator is a projection, not a quoted investment return.

## Boundary Cases

- Zero principal returns zero amounts.
- Zero rate or zero years returns the principal and zero interest.
- `compoundsPerYear` must be one of `1`, `4`, `12`, or `365`.
- Values at inclusive bounds are valid; negative principal, rate, or duration is rejected.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `principal: 100000`, `annualRatePercent: 10`, `years: 1`, `compoundsPerYear: 12` | `finalAmount: "110471.31"`, `totalInterest: "10471.31"` |
| `principal: 1234.56`, `annualRatePercent: 10`, `years: 0`, `compoundsPerYear: 12` | `finalAmount: "1234.56"`, `totalInterest: "0.00"` |

## Provenance

This is a static mathematical projection using only user inputs. It has no regulated rate, official source, rule version, effective date, or verification date; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`.

## Localization And Privacy

Localize the display name, field and period-option labels, input guidance, nominal-rate explanation, breakdown, assumptions, warnings, validation errors, rounding disclosure, and examples into reviewed English, Sinhala, and Tamil. Preserve `%`, LKR, and formula semantics across locales.

The calculator is anonymous and may run in the browser. Financial inputs and results are not persisted and raw values must not appear in logs or analytics; an API call sends only the four required fields.
