# Net-To-Gross (Required Salary) Calculator Specification

## Identity

- Identifier: `net-to-gross`
- Display name: Net-to-gross calculator
- Owner: LankaCalc WorkMoney required-salary calculation kernel
- Classification: regulated/inversion
- Calculation version: `1.0.0-candidate`
- Candidate component rules: `apit-primary-regular-monthly-2025-04-01-candidate`, `epf-standard-covered-employment-1981-01-01-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent formula/accounting review of the forward take-home composite and this inversion
- Source research and link verification: 2026-08-15
- Source dossier: `docs/employment-rule-sources.md`

This candidate solves the inverse of the approved take-home composite (`docs/calculators/take-home.md`): it returns the minimum whole-rupee gross pay that yields at least a requested monthly take-home pay. It does not authorize public production publication and does not represent a complete payslip.

## Purpose And Scope

WorkMoney asks "what salary do I need to take home X?" This calculator answers that question using the same APIT Table 01 and employee EPF components as the forward take-home calculator, with one additional caller-supplied assumption: the portion of the needed salary that is APIT-only (outside the EPF/ETF base). Because APIT-only earnings attract no employee EPF, the required gross is sensitive to that split; the calculator makes the split explicit and reports the sensitivity rather than hiding it.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve the APIT and EPF rules, including APIT from `2025-04-01` |
| `targetTakeHomePay` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `apitOnlyEarnings` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only; must be `<=` the required gross result |
| `supportedScenario` | select | — | yes | `confirmed`; same supported primary-employment scenario as the employment family |

`targetTakeHomePay` is the monthly net amount the user wants after APIT and employee EPF. `apitOnlyEarnings` is the portion of the needed salary that is already classified as APIT earnings outside the EPF/ETF fund base (for example, already-classified regular overtime or taxable cash allowances excluded from the fund base). A zero value means the whole salary is assumed fund-eligible. The calculator does not make the legal classification.

Each amount is a nonnegative whole LKR value for one calendar month. Missing, blank, fractional, negative, non-finite, boolean, `null`, array, and object values are rejected. All sums must remain within the product safety bound of LKR `1,000,000,000,000`.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `requiredGrossPay` | string | LKR | Minimum whole-rupee gross achieving the target (absent when not converged) |
| `fundBase` | string | LKR | `requiredGrossPay - apitOnlyEarnings`, the EPF/ETF base |
| `apitOnlyEarnings` | string | LKR | Echo of the input split assumption |
| `apit` | string | LKR | Whole-rupee APIT on `requiredGrossPay` |
| `employeeEpf` | string | LKR | Employee EPF at the resolved rate on `fundBase` |
| `computedTakeHomePay` | string | LKR | Take-home the minimum gross actually achieves; always `>= targetTakeHomePay` when converged |
| `excessOverTarget` | string | LKR | `computedTakeHomePay - targetTakeHomePay` |
| `resolvedBracketRatePercent` | string | percent | APIT band rate at the returned gross |
| `bracketsEvaluated` | number | count | Number of APIT brackets examined during inversion |
| `convergence` | string | — | `"minimum-gross"` on success, `"not-converged"` when no gross within bounds achieves the target |
| `maxAchievableTakeHomePay` | string | LKR | Only when not converged; take-home at the safety-bound gross |

All LKR outputs are fixed two-decimal strings; whole-rupee fields always end in `.00`. The breakdown presents the target, the minimum-gross solution, the APIT and employee EPF components, the achieved take-home, and the rounding surplus. When convergence fails, the result carries no `requiredGrossPay` or component values and explains the maximum achievable take-home instead.

## Inversion Definition

Let `T = targetTakeHomePay`, `A = apitOnlyEarnings`, and let `e` be the resolved employee EPF rate. For a whole-rupee gross `x >= A`, the forward take-home composite evaluates

```text
fundBase(x) = x - A
apit(x) = ceiling(x * r_i - d_i)          // resolved APIT band for x, final ceiling, whole rupee
employeeEpf(x) = roundHalfUpToCents(fundBase(x) * e)
t(x) = x - apit(x) - employeeEpf(x)
```

The inversion returns

```text
requiredGrossPay = min { x >= A : x integer, t(x) >= T }
```

subject to `x <= 1,000,000,000,000`. `t(x)` is piecewise increasing in `x` within each APIT band; the final whole-rupee APIT ceiling introduces steps of at most one LKR, so `t(x)` can dip by at most a few cents at band-internal rounding points. The minimum is therefore unique and is always the first integer where the achieved take-home is `>= T`; gross values only a few rupees above the continuous solution may satisfy the same target, and gross values below the returned minimum never do.

## Inversion Algorithm

1. Validate `T` and `A` as nonnegative whole LKR; resolve the APIT bands and the employee EPF rate for `asOfDate`.
2. For every resolved APIT band `i` with rate `r_i` and deduction `d_i`, compute the continuous solution of `x - (x * r_i - d_i) - e * (x - A) = T`:
   ```text
   x_hat_i = (T - d_i - e * A) / (1 - r_i - e)
   ```
   Ignore band `i` when `1 - r_i - e <= 0` (no practical APIT band violates this) or when `x_hat_i` lies outside the band.
3. Build the candidate integer set from every `x_hat_i`, every band boundary, and `A`; for each candidate, test the integers `candidate - 3` through `candidate + 3` clipped to `[A, 1,000,000,000,000]` and to the band range. The `+-3` window covers the whole-rupee ceiling step and the integer step above the continuous solution.
4. Evaluate `t(x)` exactly (no intermediate rounding, one final APIT ceiling, exact-cent EPF) for every candidate. If none satisfies `t(x) >= T`, convergence fails.
5. Return the smallest candidate satisfying `t(x) >= T` as `requiredGrossPay`, and evaluate all remaining outputs at that gross.
6. If `T > t(1,000,000,000,000)`, convergence fails with `maxAchievableTakeHomePay = t(1,000,000,000,000)`.

The algorithm is deterministic and bounded: at most six bands, each contributing a small constant number of candidate evaluations, so it is O(1) in the magnitude of `T`.

## Rounding Order

1. Validate `T` and `A` as whole LKR; do not round inputs into the contract.
2. Solve for the minimum whole-rupee `x` using the exact `t(x)` definition; apply no rounding during the search.
3. Compute `apit` with the resolved band formula and the single final ceiling to a whole rupee.
4. Compute `employeeEpf` from the whole-rupee fund base with nearest-cent, half-up rounding; the result is exact to cents because the fund base is whole rupees.
5. Compute `computedTakeHomePay = requiredGrossPay - apit - employeeEpf` with no further rounding.
6. Serialize every LKR output as a fixed two-decimal string.

Do not solve from unrounded forward components, and do not return a gross that still leaves `computedTakeHomePay < T` in order to hit a rounder number.

## Assumptions And Exclusions

- The calculation covers one calendar month of regular primary employment under the APIT Table 01 candidate and standard EPF-covered arrangements, using the same component formulas as the forward take-home composite.
- `apitOnlyEarnings` is the caller's already-classified split assumption; fund coverage and classification decisions are excluded. The result is sensitive to this input: changing it changes the required gross even for the same target.
- The tool returns the minimum gross and its rounding surplus; it does not optimize for a preferred gross amount, benefits, or deductions.
- Bonuses and lump sums, arrears, non-cash benefits, secondary or multiple employment, non-resident non-citizens, employer-paid tax and tax-on-tax, and mid-year cumulative cases are excluded.
- Higher EPF rates, approved funds, pension schemes, pensionable public employment, and all nonstandard arrangements are excluded.
- Loans, advances, welfare or union deductions, voluntary contributions, reimbursements, expenses, other taxes, and any other payslip additions or deductions are excluded.
- The result is a narrow estimate, not guaranteed net pay or legal, tax, payroll, or accounting advice.

## Convergence And Ambiguity Reporting

- On success, `convergence` is `"minimum-gross"` and `computedTakeHomePay >= targetTakeHomePay`; `excessOverTarget` exposes the whole-rupee-rounding surplus.
- On failure, `convergence` is `"not-converged"` and the result explains that the target exceeds the maximum achievable take-home within the safety bound, showing `maxAchievableTakeHomePay`.
- The result warns that several whole-rupee gross amounts a few rupees above the returned minimum also satisfy the target, that the returned value is the minimum, and that the answer depends on the entered APIT-only split.

## Boundary Cases

- `T = 0`, `A = 0`: required gross `0`.
- `T = 0`, `A > 0`: required gross `A` when `A` already nets at least zero (it does); fund base `0`.
- `A > 0`: gross is bounded below by `A`; the result must never report a fund base below zero.
- Targets inside the tax-free band (`T <= 138000` with `A = 0`) invert `t(x) = 0.92x` and never produce APIT.
- The final APIT ceiling means the required gross can be one rupee above the continuous solution; the `+-3` search window covers this.
- If the APIT or EPF rule cannot resolve for `asOfDate`, the entire calculation fails rather than returning a partial or mixed-version result.

## Official Sources

APIT:

- [IRD Advance Personal Income Tax Tables](https://www.ird.gov.lk/en/publications/sitepages/apit_tax_tables.aspx?menuid=1502)
- [IRD How to apply Table 01](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Table%20-%201/02.%20APIT_2526_Table_01_Text.pdf)
- [IRD Table 01 full lookup](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Table%20-%201/02.%20APIT_2526_Table_01.pdf)

EPF:

- [EPF Act and Amendments](https://epf.lk/?page_id=246)
- [EPF Remitting Contributions](https://epf.lk/?p=171)
- [EPF Employer FAQ](https://epf.lk/?page_id=811)

The inversion inherits the component sources. Each legal instrument, Gazette, lookup, instruction, and operational page must be registered as a separate source or revision as described in the source dossier.

## Golden Fixtures

All fixtures use `asOfDate: "2025-04-01"` and `supportedScenario: "confirmed"`. Values are independently derived candidates and require the review gate before production publication.

### Default fund-eligible split (`A = 0`)

| Target `T` | Expected result |
|---|---|
| `0` | `requiredGrossPay: "0.00"`, `fundBase: "0.00"`, `apit: "0.00"`, `employeeEpf: "0.00"`, `computedTakeHomePay: "0.00"`, `excessOverTarget: "0.00"`, `convergence: "minimum-gross"` |
| `100000` | `requiredGrossPay: "108696.00"`, `fundBase: "108696.00"`, `apit: "0.00"`, `employeeEpf: "8695.68"`, `computedTakeHomePay: "100000.32"`, `excessOverTarget: "0.32"`, `convergence: "minimum-gross"` |
| `138000` | `requiredGrossPay: "150000.00"`, `fundBase: "150000.00"`, `apit: "0.00"`, `employeeEpf: "12000.00"`, `computedTakeHomePay: "138000.00"`, `excessOverTarget: "0.00"`, `convergence: "minimum-gross"` |
| `150000` | `requiredGrossPay: "163955.00"`, `fundBase: "163955.00"`, `apit: "838.00"`, `employeeEpf: "13116.40"`, `computedTakeHomePay: "150000.60"`, `excessOverTarget: "0.60"`, `convergence: "minimum-gross"` |
| `200000` | `requiredGrossPay: "222094.00"`, `fundBase: "222094.00"`, `apit: "4326.00"`, `employeeEpf: "17767.52"`, `computedTakeHomePay: "200000.48"`, `excessOverTarget: "0.48"`, `convergence: "minimum-gross"` |
| `233000` | `requiredGrossPay: "264866.00"`, `fundBase: "264866.00"`, `apit: "10676.00"`, `employeeEpf: "21189.28"`, `computedTakeHomePay: "233000.72"`, `excessOverTarget: "0.72"`, `convergence: "minimum-gross"` |
| `400000` | `requiredGrossPay: "546430.00"`, `fundBase: "546430.00"`, `apit: "102715.00"`, `employeeEpf: "43714.40"`, `computedTakeHomePay: "400000.60"`, `excessOverTarget: "0.60"`, `convergence: "minimum-gross"` |

### Nonzero APIT-only split

| Inputs | Expected result |
|---|---|
| `T = 100000`, `A = 10000` | `requiredGrossPay: "107827.00"`, `fundBase: "97827.00"`, `apit: "0.00"`, `employeeEpf: "7826.16"`, `computedTakeHomePay: "100000.84"`, `excessOverTarget: "0.84"`, `convergence: "minimum-gross"` |

### Convergence failure

| Inputs | Expected result |
|---|---|
| `T = 600000000000`, `A = 0` | `convergence: "not-converged"`, `maxAchievableTakeHomePay: "560000094000.00"`, no `requiredGrossPay` |

The complete APIT just-below/at/above threshold matrix in `docs/calculators/apit.md` is normative; inverting its boundary cases must reproduce the forward take-home composite.

## Provenance

Every result must include the calculation version and each independently resolved APIT and EPF rule version, effective date, official source set, and verification time. Link verification on `2026-08-15` does not satisfy independent formula/accounting review. The composite is server-authoritative and atomic: it must not return a required-salary result if any required rule or source is unavailable.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.netToGross.name` | Net-to-gross calculator |
| `calculator.netToGross.summary` | Find the gross monthly salary needed for a target take-home. |
| `calculator.netToGross.input.asOfDate` | Calculation date |
| `calculator.netToGross.input.targetTakeHomePay` | Target monthly take-home pay |
| `calculator.netToGross.input.apitOnlyEarnings` | APIT-only earnings in the needed salary |
| `calculator.netToGross.input.apitOnlyEarnings.description` | The portion of the salary outside the EPF/ETF base, for example already-classified non-fund overtime or cash allowances. Use zero when the whole salary is fund-eligible. |
| `calculator.netToGross.output.requiredGrossPay` | Required gross monthly salary |
| `calculator.netToGross.output.fundBase` | EPF/ETF base of the required salary |
| `calculator.netToGross.output.apit` | APIT on the required salary |
| `calculator.netToGross.output.employeeEpf` | Employee EPF deduction |
| `calculator.netToGross.output.computedTakeHomePay` | Achieved take-home pay |
| `calculator.netToGross.output.excessOverTarget` | Rounding surplus above target |
| `calculator.netToGross.output.resolvedBracketRatePercent` | Applicable APIT rate |
| `calculator.netToGross.assumption.minimumGross` | The result is the minimum whole-rupee salary that achieves the target. |
| `calculator.netToGross.assumption.split` | The result depends on the entered APIT-only split. |
| `calculator.netToGross.warning.rounding` | Whole-rupee rounding means a few gross amounts satisfy the same target; the minimum is returned. |
| `calculator.netToGross.warning.sensitivity` | Confirm the APIT-only amount before relying on the required salary; a different split changes it. |
| `calculator.netToGross.warning.estimate` | This candidate estimate still requires independent formula and accounting review before production publication. |
| `calculator.netToGross.error.wholeRupees` | Enter each amount as a nonnegative whole number of Sri Lankan rupees. |
| `calculator.netToGross.error.ruleUnavailable` | A required reviewed employment rule is unavailable for this date. |
| `calculator.netToGross.error.notConverged` | The target exceeds the maximum take-home achievable within supported bounds. |

Translate all labels, input guidance, inversion explanation, breakdowns, assumptions, exclusions, source titles, warnings, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `APIT`, `EPF`, `ETF`, LKR, percentages, dates, and API field identifiers.

## Privacy

The calculator is anonymous. Salary amounts and results are not persisted by default and raw values must not appear in logs, analytics, source checks, or rule audit events. A request sends only the date, the target take-home, and the APIT-only split. Saved salary scenarios and payroll records are separate future scope requiring explicit consent, authorization, retention, export, and deletion behavior.
