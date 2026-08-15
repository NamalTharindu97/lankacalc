# Loan Affordability Calculator Specification

## Identity

- Identifier: `loan-affordability`
- Display name: Loan affordability calculator
- Owner: LankaCalc WorkMoney lending estimate kernel
- Classification: configurable
- Calculation version: `1.0.0`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent formula review
- Source research and link verification: 2026-08-15

This candidate estimates how much of a fixed-rate loan a user might afford from self-entered monthly income, living expenses, and existing debt payments, using a user-chosen debt-to-income cap and an interest-rate stress premium. It is an estimate, not a loan approval, credit decision, or financial advice. No statutory Sri Lankan rule is required; the inputs are user-entered and the rates are user-chosen.

## Purpose And Scope

Loan affordability answers "how much could I borrow each month, and what does that mean for a loan size?" The calculator subtracts living expenses and existing debt payments from monthly income to find an available surplus, caps total monthly debt payments at a user-selected share of income, then inverts the smaller bound into a maximum fixed-rate loan amount for the entered term. A stress case re-inverts the same payment at a higher rate so the user sees how much loan size falls if rates rise.

The platform must not represent the result as loan approval or financial advice. Bank and finance-company rates may be entered by the user; no rate source is assumed.

## Estimation Convention

- `surplus = monthlyIncome - monthlyLivingExpenses - existingMonthlyDebtPayments`
- `debtCapacity = monthlyIncome * affordabilityRatioPercent / 100 - existingMonthlyDebtPayments`
- `affordablePayment = max(0, min(surplus, debtCapacity))`
- `maxLoan = invertFixedRateEMI(affordablePayment, annualRatePercent, loanTermMonths)`
- `maxLoanAtStressedRate = invertFixedRateEMI(affordablePayment, annualRatePercent + stressRatePremiumPercent, loanTermMonths)`

The verdict explains the binding constraint. All amounts are estimated monthly cash flows; the debt-to-income cap is a user-chosen convention, not a statutory or single-lender rule.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `monthlyIncome` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `monthlyLivingExpenses` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `existingMonthlyDebtPayments` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `affordabilityRatioPercent` | decimal | percent | yes | `0` to `100`, inclusive; up to two decimals; default `35` |
| `loanTermMonths` | integer | months | yes | `1` to `1200`, inclusive |
| `annualRatePercent` | decimal | percent | yes | `0` to `100`, inclusive; up to six decimals |
| `stressRatePremiumPercent` | decimal | percent | yes | `0` to `100`, inclusive; up to two decimals; default `2` |

Each amount is a nonnegative whole LKR value for one calendar month. Missing, blank, fractional, negative, non-finite, boolean, `null`, array, and object values are rejected. All sums must remain within the product safety bound of LKR `1,000,000,000,000`.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `verdict` | string | — | `negative-surplus`, `debt-capacity-exhausted`, `surplus-limited`, or `debt-ratio-limited` |
| `availableMonthlySurplus` | string | LKR | `surplus`, which may be negative |
| `debtCapacity` | string | LKR | `debtCapacity`, which may be negative |
| `affordableNewPayment` | string | LKR | `max(0, min(surplus, debtCapacity))` |
| `maxLoanAtEnteredRate` | string | LKR | Inverted fixed-rate EMI at the entered annual rate |
| `maxLoanAtStressedRate` | string | LKR | Inverted fixed-rate EMI at the entered rate plus the stress premium |
| `stressImpact` | string | LKR | `maxLoanAtStressedRate - maxLoanAtEnteredRate` (zero or negative) |
| `affordabilityRatioPercent` | string | percent | Entered cap, echoed |
| `loanTermMonths` | number | months | Entered term, echoed |
| `annualRatePercent` | string | percent | Entered rate, echoed |
| `stressedRatePercent` | string | percent | `annualRatePercent + stressRatePremiumPercent` |

All LKR outputs are fixed two-decimal strings. The breakdown presents income, the expense and debt deductions, the surplus, the debt-to-income cap, the affordable payment, and the max loan at both the entered and stressed rates.

## Formula Definition

Let `Y = monthlyIncome`, `E = monthlyLivingExpenses`, `D = existingMonthlyDebtPayments`, `R = affordabilityRatioPercent / 100`, `n = loanTermMonths`, and `i = annualRatePercent / 1200`.

```text
surplus = Y - E - D
debtCapacity = Y * R - D
payment = max(0, min(surplus, debtCapacity))

maxLoan(payment, i, n) = payment * n                  when i = 0
                       = payment * ((1+i)^n - 1) / (i * (1+i)^n)
```

`i` is the monthly rate derived by dividing the nominal annual rate by 12. The stress case uses `i + stressRatePremiumPercent / 1200`.

## Algorithm

1. Validate all inputs.
2. Compute `surplus` and `debtCapacity` exactly.
3. Determine the verdict and the affordable payment:
   - `surplus < 0`: verdict `negative-surplus`; payment is zero.
   - otherwise `debtCapacity < 0`: verdict `debt-capacity-exhausted`; payment is zero.
   - otherwise `surplus <= debtCapacity`: verdict `surplus-limited`; payment is `surplus`.
   - otherwise: verdict `debt-ratio-limited`; payment is `debtCapacity`.
4. Invert the payment into a max loan at the entered rate and at the stressed rate.
5. Report the surplus, capacity, payment, max loans, stress impact, and verdict.

The algorithm is deterministic and O(1).

## Rounding Order

1. Validate inputs; do not round inputs into the contract.
2. Compute `surplus`, `debtCapacity`, and `payment` without rounding.
3. Round each max-loan result to the nearest cent half-up as the final displayed value.
4. Compute `stressImpact` from the two rounded max loans.
5. Serialize every LKR output as a fixed two-decimal string.

## Verdict Meanings

- `negative-surplus`: existing living expenses and debt payments exceed monthly income; no new borrowing is estimated.
- `debt-capacity-exhausted`: existing debt payments already consume the entire debt-to-income cap; no new borrowing is estimated.
- `surplus-limited`: the affordable payment is capped by the income left after expenses and existing debts.
- `debt-ratio-limited`: the affordable payment is capped by the debt-to-income convention even though a larger surplus exists.

## Assumptions And Exclusions

- All inputs are user-entered monthly amounts and user-chosen assumptions; no lender, credit bureau, or statutory source is implied.
- The debt-to-income cap is a user-chosen convention, not a statutory or universal lender rule.
- The max loan assumes a fixed-rate installment loan amortizing over the full term with no fees, insurance, taxes, prepayment, or lender rounding.
- The stress case only raises the interest rate; income, expenses, debts, and term are unchanged.
- Lenders apply their own income definitions, debt measures, credit scores, collateral, and underwriting; the estimate does not model them.
- The result is an estimate, not a loan approval, credit decision, or financial advice.

## Boundary Cases

- `annualRatePercent = 0`: `maxLoan = payment * loanTermMonths`; the interest inversion is avoided.
- `stressRatePremiumPercent = 0`: the stressed max loan equals the entered-rate max loan and the stress impact is `"0.00"`.
- `monthlyIncome = 0`: `surplus = -expenses - debts`; verdict is `negative-surplus` unless expenses and debts are both zero, in which case surplus and capacity are zero and the verdict is `surplus-limited` with a zero payment and zero max loans.
- `affordabilityRatioPercent = 0`: `debtCapacity = -existingMonthlyDebtPayments`; verdict is `debt-capacity-exhausted` whenever existing debt is positive.
- A zero component must be an explicit `"0"`, not a blank; a blank is a validation error.
- The stress premium is added to the entered annual rate; the stressed rate may exceed 100% even though each input is capped at 100%.

## Official Sources

None required. This is a user-entered estimate with no statutory rate, table, or lookup. The platform must not cite a lending authority or represent the result as approval.

## Golden Fixtures

All fixtures are expressed per calendar month.

| Inputs | Expected result |
|---|---|
| `Y = 200000`, `E = 80000`, `D = 20000`, `R = 35`, `n = 60`, `i = 12`, stress `2` | `verdict: "debt-ratio-limited"`, `availableMonthlySurplus: "100000.00"`, `debtCapacity: "50000.00"`, `affordableNewPayment: "50000.00"`, `maxLoanAtEnteredRate: "2247751.92"`, `maxLoanAtStressedRate: "2148850.82"`, `stressImpact: "-98901.10"`, `stressedRatePercent: "14"` |
| `Y = 150000`, `E = 40000`, `D = 10000`, `R = 40`, `n = 120`, `i = 15`, stress `2` | `verdict: "debt-ratio-limited"`, `availableMonthlySurplus: "100000.00"`, `debtCapacity: "50000.00"`, `affordableNewPayment: "50000.00"`, `maxLoanAtEnteredRate: "3099142.36"`, `maxLoanAtStressedRate: "2876908.83"`, `stressImpact: "-222233.53"`, `stressedRatePercent: "17"` |
| `Y = 100000`, `E = 70000`, `D = 5000`, `R = 50`, `n = 24`, `i = 0`, stress `2` | `verdict: "surplus-limited"`, `availableMonthlySurplus: "25000.00"`, `debtCapacity: "45000.00"`, `affordableNewPayment: "25000.00"`, `maxLoanAtEnteredRate: "600000.00"`, `maxLoanAtStressedRate: "587678.54"`, `stressImpact: "-12321.46"`, `stressedRatePercent: "2"` |
| `Y = 100000`, `E = 110000`, `D = 5000`, `R = 35`, `n = 60`, `i = 12`, stress `2` | `verdict: "negative-surplus"`, `availableMonthlySurplus: "-15000.00"`, `debtCapacity: "30000.00"`, `affordableNewPayment: "0.00"`, `maxLoanAtEnteredRate: "0.00"`, `maxLoanAtStressedRate: "0.00"`, `stressImpact: "0.00"` |
| `Y = 100000`, `E = 30000`, `D = 40000`, `R = 35`, `n = 60`, `i = 12`, stress `2` | `verdict: "debt-capacity-exhausted"`, `availableMonthlySurplus: "30000.00"`, `debtCapacity: "-5000.00"`, `affordableNewPayment: "0.00"`, `maxLoanAtEnteredRate: "0.00"`, `maxLoanAtStressedRate: "0.00"` |

## Provenance

Every result must include the calculation version and `verifiedAt: null` because the estimate uses no regulated rule or source. The result is a configurable browser estimate and must carry the estimate and no-approval warnings. It must not resolve or depend on rule versions.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.loanAffordability.name` | Loan affordability calculator |
| `calculator.loanAffordability.summary` | Estimate how much you could borrow from monthly income, debts, and expenses. |
| `calculator.loanAffordability.input.monthlyIncome` | Monthly take-home income |
| `calculator.loanAffordability.input.monthlyLivingExpenses` | Monthly living expenses |
| `calculator.loanAffordability.input.existingMonthlyDebtPayments` | Existing monthly debt payments |
| `calculator.loanAffordability.input.affordabilityRatioPercent` | Debt-to-income cap |
| `calculator.loanAffordability.input.loanTermMonths` | Desired loan term |
| `calculator.loanAffordability.input.annualRatePercent` | Expected nominal annual rate |
| `calculator.loanAffordability.input.stressRatePremiumPercent` | Interest-rate stress premium |
| `calculator.loanAffordability.output.verdict` | Estimate outcome |
| `calculator.loanAffordability.output.availableMonthlySurplus` | Available monthly surplus |
| `calculator.loanAffordability.output.debtCapacity` | Debt-to-income allowance |
| `calculator.loanAffordability.output.affordableNewPayment` | Affordable new monthly payment |
| `calculator.loanAffordability.output.maxLoanAtEnteredRate` | Maximum loan at the entered rate |
| `calculator.loanAffordability.output.maxLoanAtStressedRate` | Maximum loan at the stressed rate |
| `calculator.loanAffordability.output.stressImpact` | Stress impact on loan size |
| `calculator.loanAffordability.verdict.negativeSurplus` | Existing living expenses and debt payments exceed monthly income. |
| `calculator.loanAffordability.verdict.debtCapacityExhausted` | Existing debt payments already use the entire debt-to-income cap. |
| `calculator.loanAffordability.verdict.surplusLimited` | The payment is capped by the income left after expenses and existing debts. |
| `calculator.loanAffordability.verdict.debtRatioLimited` | The payment is capped by the debt-to-income convention. |
| `calculator.loanAffordability.assumption.selfEntered` | All amounts and rates are self-entered assumptions. |
| `calculator.loanAffordability.assumption.fixedRate` | The max loan assumes a fixed-rate installment loan with no fees or prepayment. |
| `calculator.loanAffordability.assumption.stressRate` | The stress case raises only the interest rate. |
| `calculator.loanAffordability.warning.notApproval` | This is an estimate, not a loan approval, credit decision, or financial advice. |
| `calculator.loanAffordability.warning.lenderUnderwriting` | Lenders use their own income definitions, ratios, credit scores, and collateral. |
| `calculator.loanAffordability.error.wholeRupees` | Enter each amount as a nonnegative whole number of Sri Lankan rupees. |

Translate all labels, input guidance, breakdowns, verdicts, assumptions, warnings, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve LKR, percentages, months, and API field identifiers.

## Privacy

The calculator is anonymous. Values are not persisted by default and raw values must not appear in logs, analytics, or audit events. A request sends only the entered amounts, ratio, term, and rates. Saved affordability scenarios and credit records are separate future scope requiring explicit consent, authorization, retention, export, and deletion behavior.
