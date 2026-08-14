# Loan EMI Calculator Specification

## Identity

- Identifier: `loan-emi`
- Display name: Loan EMI calculator
- Owner: LankaCalc calculation kernel
- Classification: static
- Calculation version: `2.0.0`

## Approval

- Status: Approved Stage 0 baseline
- Approval basis: the repository owner authorized phased implementation on 2026-08-14
- Localization inventory: `docs/calculators/localization-keys.md`

## Inputs

| Field | Type | Unit | Required | Bounds |
|---|---|---|---|---|
| `principal` | decimal | LKR | yes | At least `0.01`, at most `1,000,000,000,000`; at most 2 decimal places |
| `annualRatePercent` | decimal | percent per year | yes | `0` to `100`, inclusive; at most 6 decimal places |
| `termMonths` | integer | months | yes | `1` to `1200`, inclusive |

Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing and blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected. `termMonths` must remain an integer after parsing.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `monthlyPayment` | string | LKR/month | Rounded fixed monthly instalment |
| `finalPayment` | string | LKR | Adjusted final instalment that reconciles rounded payments |
| `totalPayment` | string | LKR | Full-precision schedule total rounded to cents |
| `totalInterest` | string | LKR | `totalPayment - principal` |

The breakdown presents regular monthly instalment, adjusted final instalment, total interest, and total repayment. All monetary outputs and breakdown values are fixed two-decimal strings.

## Formula And Rate Convention

Let `P = principal`, `N = termMonths`, and `i = annualRatePercent / 100 / 12`.

- If `i = 0`: `unroundedMonthlyPayment = P / N`.
- Otherwise: `unroundedMonthlyPayment = P * i * (1 + i)^N / ((1 + i)^N - 1)`.

The annual input is a nominal annual percentage rate divided by 12. It is not an effective annual rate; monthly compounding and monthly payments are assumed.

## Rounding Order

1. Calculate the monthly payment at full decimal precision.
2. Round it to two decimal places using round-half-up; this is `monthlyPayment`.
3. Calculate and round `totalPayment = unroundedMonthlyPayment * termMonths` to two decimals.
4. Calculate `finalPayment = totalPayment - monthlyPayment * (termMonths - 1)`.
5. If that final payment is not positive because a very small regular payment rounded up, round the regular payment down to cents and recalculate the final payment.
6. Calculate `totalInterest = totalPayment - principal`.
7. Serialize all monetary outputs as fixed two-decimal strings.

This order preserves the full-precision schedule total while making the displayed regular payments plus the adjusted final payment reconcile exactly with the displayed total.

## Assumptions And Exclusions

- The rate and payment frequency remain fixed for the whole term.
- Payments occur monthly in arrears; the final payment absorbs regular-payment rounding and can differ materially for impractically small principals spread over long terms.
- No full amortization schedule is produced.
- Fees, insurance, taxes, penalties, grace periods, prepayments, variable rates, lender day-count rules, and lender-specific rounding are excluded.
- Results are estimates, not approval, advice, or a lender quotation.

## Boundary Cases

- A zero rate uses simple division and avoids the annuity formula's zero denominator.
- Zero principal, negative values, fractional months, month zero, and values above the maxima are rejected.
- At very small principals, the adjusted final payment absorbs regular-payment rounding instead of creating an inconsistent displayed total.
- Any non-finite or out-of-contract intermediate/result fails instead of serializing as `null`.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `principal: 1000000`, `annualRatePercent: 12`, `termMonths: 12` | `monthlyPayment: "88848.79"`, `finalPayment: "88848.77"`, `totalPayment: "1066185.46"`, `totalInterest: "66185.46"` |
| `principal: 120000`, `annualRatePercent: 0`, `termMonths: 12` | `monthlyPayment: "10000.00"`, `finalPayment: "10000.00"`, `totalPayment: "120000.00"`, `totalInterest: "0.00"` |

## Provenance

This is a static annuity estimate driven only by user inputs. No bank rate, regulated rule, official source, effective date, or verification date is supplied; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`.

## Localization And Privacy

Localize the display name, field and breakdown labels, nominal-rate and rounding explanations, assumptions, estimate warning, validation errors, and examples into reviewed English, Sinhala, and Tamil. Preserve LKR, percentage, and formula semantics.

The calculator is anonymous and may run in the browser. Financial inputs and results are not persisted and raw values must not be captured in logs or analytics; an API call sends only the three required fields.
