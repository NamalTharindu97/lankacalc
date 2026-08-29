# Loan Schedule Calculator Specification

## Identity

- Identifier: `loan-schedule`
- Display name: Loan schedule calculator
- Owner: LankaCalc calculation kernel
- Classification: configurable
- Calculation version: `1.1.0`

## Approval

- Status: Approved Stage 5 lending family
- Approval basis: the repository owner authorized phased implementation on 2026-08-15
- Localization inventory: `docs/calculators/localization-keys.md`

## Inputs

| Field | Type | Unit | Required | Bounds |
|---|---|---|---|---|
| `asOfDate` | date | ISO date | yes | `2026-01-01` or later |
| `rateSource` | enum | - | yes (default `user`) | `user` or `platform` |
| `principal` | decimal | LKR | yes | at least `0.01`, at most `1,000,000,000,000`; at most 2 decimal places |
| `annualRatePercent` | decimal | percent per year | when `rateSource: "user"` | `0` to `100`, inclusive; at most 6 decimal places |
| `termMonths` | integer | months | yes | `1` to `1200`, inclusive |
| `processingFeePercent` | decimal | percent of principal | yes | `0` to `100`; at most 2 decimal places; default `0` |
| `monthlyInsurancePremium` | decimal | LKR per month | yes | `0` to `100,000,000`; at most 2 decimal places; default `0` |
| `extraPaymentAmount` | decimal | LKR | yes | `0` to `1,000,000,000,000`; at most 2 decimal places; default `0` |
| `extraPaymentMonth` | integer | month | yes | `0` to `1200`; `0` means no early payment; must be `0` or within the term; default `0` |

`rateSource` selects the source of `annualRatePercent`: `user` uses the entered `annualRatePercent`; `platform` ignores any entered rate and resolves the CBSL average weighted prime lending rate (AWPR) observed on or before `asOfDate` from the `observed-lending-rates-lk-2026` rule. `annualRatePercent` is required and validated only when `rateSource` is `user`.

Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing and blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected. `termMonths` and `extraPaymentMonth` must remain integers after parsing.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `rateSource` | string | - | `user` or `platform` |
| `appliedAnnualRatePercent` | string | percent per year | The entered rate, or the resolved AWPR observation for `platform` |
| `monthlyPayment` | string | LKR/month | Rounded fixed monthly instalment |
| `finalPayment` | string | LKR | Adjusted final instalment that reconciles rounded payments |
| `totalPayment` | string | LKR | Full-precision schedule total rounded to cents |
| `totalInterest` | string | LKR | `totalPayment - principal` |
| `processingFeeAmount` | string | LKR | `principal * processingFeePercent / 100`, rounded to cents |
| `totalInsurance` | string | LKR | `monthlyInsurancePremium * termMonths`, rounded to cents |
| `totalCost` | string | LKR | `totalPayment + processingFeeAmount + totalInsurance` |

Platform-rate fields are present only when `rateSource: "platform"`:

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `rateLabel` | string | - | Label of the resolved AWPR observation |
| `rateObservationDate` | string | ISO date | `observedOn` of the resolved observation |
| `rateAuthority` | string | - | `Central Bank of Sri Lanka` |

Early-payment fields are present only when `extraPaymentMonth >= 1` and `extraPaymentAmount > 0`:

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `extraPaymentAmount` | string | LKR | The entered extra payment |
| `termMonthsWithExtraPayment` | integer | months | Simulated term after the extra payment |
| `termMonthsSaved` | integer | months | `termMonths - termMonthsWithExtraPayment` |
| `finalPaymentWithExtraPayment` | string | LKR | Last simulated instalment |
| `totalPaymentWithExtraPayment` | string | LKR | Total instalments plus the extra payment |
| `totalInterestWithExtraPayment` | string | LKR | Simulated total interest |
| `interestSaved` | string | LKR | `totalInterest - totalInterestWithExtraPayment` |

## Formula And Rate Convention

Let `P = principal`, `N = termMonths`, and `i = appliedAnnualRatePercent / 100 / 12`.

- If `i = 0`: `unroundedMonthlyPayment = P / N`.
- Otherwise: `unroundedMonthlyPayment = P * i * (1 + i)^N / ((1 + i)^N - 1)`.

The applied rate is a nominal annual percentage rate divided by 12. It is not an effective annual rate; monthly compounding and monthly payments are assumed. For `rateSource: "platform"`, the applied rate is the CBSL monthly AWPR observation with the latest `observedOn` on or before `asOfDate`; if no observation predates `asOfDate`, the calculation fails as out of range.

## Rounding Order

1. Calculate the monthly payment at full decimal precision.
2. Round it to two decimal places using round-half-up; this is `monthlyPayment`.
3. Calculate and round `totalPayment = unroundedMonthlyPayment * termMonths` to two decimals.
4. Calculate `finalPayment = totalPayment - monthlyPayment * (termMonths - 1)`.
5. If that final payment is not positive because a very small regular payment rounded up, round the regular payment down to cents and recalculate the final payment.
6. Calculate `totalInterest = totalPayment - principal`.
7. Round `processingFeeAmount`, `totalInsurance`, and `totalCost` to cents.
8. For an early payment, simulate the schedule month by month using the rounded `monthlyPayment`: each month charges interest on the outstanding balance; in the chosen month the extra payment is applied after the regular instalment and is capped at the outstanding balance. The schedule ends in the first month whose balance plus interest is covered by the instalment, with that instalment as `finalPaymentWithExtraPayment`. Derive the scenario fields from this simulation and round to cents or whole months.

This order preserves the full-precision schedule total while making the displayed regular payments plus the adjusted final payment reconcile exactly with the displayed total, and keeps the early-payment scenario on the same rounded regular payment.

## Assumptions And Exclusions

- The rate and payment frequency remain fixed for the whole term.
- Payments occur monthly in arrears; the final payment absorbs regular-payment rounding.
- The processing fee and insurance premium are paid separately and are not financed into the loan.
- An early payment reduces the principal in its chosen month while the regular payment stays unchanged, so the term shortens; the extra payment is capped at the outstanding balance and is fully applied to principal.
- The interest saved compares the standard schedule with the early-payment schedule and is an estimate based on the rounded regular payment.
- For `rateSource: "platform"`, the CBSL AWPR is a market benchmark resolved from the latest published CBSL observation on or before the calculation date, not a personal loan quote; the rate a lender offers may be higher or lower.
- Lender day-count conventions, penalties, taxes, grace periods, variable rates, and lender-specific rounding are excluded.
- Results are estimates, not approval, financial advice, or a lender quotation.

## Boundary Cases

- A zero rate uses simple division and avoids the annuity formula's zero denominator.
- Zero principal, negative values, fractional months, month zero, and values above the maxima are rejected.
- `rateSource: "user"` without `annualRatePercent` is rejected.
- `rateSource: "platform"` with an `asOfDate` before the earliest AWPR observation fails as out of range.
- `extraPaymentMonth` must be `0` or within `1..termMonths`; an extra payment with no month takes no effect because both must be positive for a scenario.
- An extra payment larger than the outstanding balance is capped at the balance.
- At very small principals, the adjusted final payment absorbs regular-payment rounding instead of creating an inconsistent displayed total.
- Any non-finite or out-of-contract intermediate/result fails instead of serializing as `null`.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `asOfDate: 2026-08-16`, `rateSource: user`, `principal: 1000000`, `annualRatePercent: 12`, `termMonths: 12`, `processingFeePercent: 0`, `monthlyInsurancePremium: 0`, `extraPaymentAmount: 0`, `extraPaymentMonth: 0` | `monthlyPayment: "88848.79"`, `finalPayment: "88848.77"`, `totalPayment: "1066185.46"`, `totalInterest: "66185.46"`, `processingFeeAmount: "0.00"`, `totalInsurance: "0.00"`, `totalCost: "1066185.46"` |
| `asOfDate: 2026-08-16`, `rateSource: user`, `principal: 120000`, `annualRatePercent: 0`, `termMonths: 12`, `processingFeePercent: 0`, `monthlyInsurancePremium: 0`, `extraPaymentAmount: 0`, `extraPaymentMonth: 0` | `monthlyPayment: "10000.00"`, `finalPayment: "10000.00"`, `totalPayment: "120000.00"`, `totalInterest: "0.00"` |
| `asOfDate: 2026-08-16`, `rateSource: user`, `principal: 1000000`, `annualRatePercent: 12`, `termMonths: 12`, `processingFeePercent: 2`, `monthlyInsurancePremium: 500`, `extraPaymentAmount: 0`, `extraPaymentMonth: 0` | `processingFeeAmount: "20000.00"`, `totalInsurance: "6000.00"`, `totalCost: "1092185.46"` |
| `asOfDate: 2026-08-16`, `rateSource: user`, `principal: 1000000`, `annualRatePercent: 12`, `termMonths: 24`, `processingFeePercent: 0`, `monthlyInsurancePremium: 0`, `extraPaymentAmount: 100000`, `extraPaymentMonth: 12` | `monthlyPayment: "47073.47"`, `totalPayment: "1129763.33"`, `totalInterest: "129763.33"`, `termMonthsWithExtraPayment: 22`, `termMonthsSaved: 2`, `finalPaymentWithExtraPayment: "29364.65"`, `totalPaymentWithExtraPayment: "1117907.52"`, `totalInterestWithExtraPayment: "17907.52"`, `interestSaved: "111855.81"` |
| `asOfDate: 2026-08-16`, `rateSource: platform`, `principal: 1000000`, `termMonths: 12`, `processingFeePercent: 0`, `monthlyInsurancePremium: 0`, `extraPaymentAmount: 0`, `extraPaymentMonth: 0` | `rateSource: "platform"`, `appliedAnnualRatePercent: "10.34"`, `rateLabel: "Average Weighted Prime Lending Rate (monthly)"`, `rateObservationDate: "2026-06-30"`, `rateAuthority: "Central Bank of Sri Lanka"`, `monthlyPayment: "88074.10"`, `totalCost: "1056889.16"` |

## Provenance

For `rateSource: "user"` the calculation uses only user inputs. For `rateSource: "platform"` the applied rate is resolved from the `observed-lending-rates-lk-2026` rule (CBSL AWPR observations); the API response attaches the resolved rule version and the CBSL source references with their retrieval and verification dates. The resolver has no maximum-age cutoff, so dates after the latest recorded observation continue to use that observation. The lease calculator remains user-rate only until licensed finance-company rate observations are sourced.

## Localization And Privacy

Localize the display name, field and breakdown labels, the nominal-rate and early-payment explanations, assumptions, estimate warning, validation errors, and examples into reviewed English, Sinhala, and Tamil. Preserve LKR, percentage, month, and formula semantics.

The calculator requires the calculation service for `rateSource: "platform"`. Financial inputs and results are not persisted and raw values must not be captured in logs or analytics; an API call sends the calculation date, rate source, and the loan fields.
