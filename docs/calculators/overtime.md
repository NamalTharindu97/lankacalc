# Overtime Calculator Specification

## Identity

- Identifier: `overtime`
- Display name: Overtime calculator
- Owner: LankaCalc WorkMoney statutory remuneration kernel
- Classification: regulated/statutory
- Calculation version: `1.0.0-candidate`
- Candidate rule: `overtime-shop-office-employment-1954-08-09-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent legal/accounting review of the Shop and Office Employees Act formula and the hourly-rate-basis question below
- Source research and link verification: 2026-08-15
- Source dossier: `docs/employment-rule-sources.md`

This candidate computes overtime pay under the Shop and Office Employees (Regulation of Employment and Remuneration) Act, No. 19 of 1954 for a monthly-rated shop/office employee. It does not authorize public production publication, does not cover daily/weekly/fortnightly-rated or wage-board trades, and does not compute public-holiday or Poya compensation.

## Purpose And Scope

WorkMoney asks "what am I owed for the extra hours I worked this month?" This calculator answers with the statutory minimum overtime pay for the common case: a monthly-rated employee in a shop or office covered by the S&O Act who works beyond the normal period. It applies the statutory 1.5x ordinary hourly rate for weekday and weekly-day-off (rest-day) work, computes the hourly rate from the monthly remuneration, and reports the weekly overtime cap as an informational check.

## Statutory Basis

Under the Shop and Office Employees (Regulation of Employment and Remuneration) Act, No. 19 of 1954 (commencement 9 August 1954):

- Section 3 — the normal period of employment is not more than eight hours on any one day and not more than forty-five hours in any one week, excluding rest or meal intervals.
- Section 2 — "overtime" means work in excess of that normal maximum period.
- Section 6 — overtime employment is restricted by regulation; overtime is capped at **twelve hours in any week** (the cap is per-week and is not strictly enforced).
- Section 11(2) — for computing overtime remuneration, the hourly rate of a monthly-rated employee is **one-eighth of the monthly rate divided by thirty**, i.e. `monthly remuneration / 240`.
- Section 11 — overtime is payable at **not less than 1.5 times** the normal hourly rate, with a proportionate amount for less than an hour.
- Work on a weekly holiday (the weekly whole-day holiday of section 5) is paid with a **1.5x surcharge** on the normal hourly wage.

The remuneration base includes ordinary remuneration including cost-of-living allowances. The statutory divisor is `240`. A separate convention used by Labour Department inspectors and many wage-board trades divides by `200`; it is a practice, not a section 11 rule, and the two divisors are exposed as an explicit choice.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve the overtime rule; on or after `1954-08-09` |
| `monthlyRemuneration` | integer | LKR/month | yes | `0` to `1,000,000,000,000`, inclusive; whole rupees only |
| `hourlyRateBasis` | select | — | yes | `statutory-240` or `convention-200` |
| `weekdayOvertimeHours` | decimal | hours/month | yes | `0` to `744`, inclusive; multiples of `0.5` |
| `restDayOvertimeHours` | decimal | hours/month | yes | `0` to `744`, inclusive; multiples of `0.5` |
| `supportedScenario` | select | — | yes | `confirmed`; same supported primary-employment scenario as the employment family |

`monthlyRemuneration` is the ordinary monthly remuneration on which the hourly rate is computed (wages including cost-of-living allowances), as the employer reports it. `hourlyRateBasis` chooses the divisor: `statutory-240` (section 11) or `convention-200` (Labour Department inspection convention used in many wage-board trades). Overtime hours accept half-hour steps and a proportionate amount for less than an hour.

Missing, blank, fractional rupees, non-finite, boolean, `null`, array, and object values are rejected for the remuneration field. Hours must be multiples of `0.5` within `0` to `744`. All sums must remain within the product safety bound of LKR `1,000,000,000,000`.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `hourlyRate` | string | LKR | `monthlyRemuneration / divisor`, fixed two decimals |
| `hourlyRateDivisor` | number | hours | `240` or `200`, echoing the selected basis |
| `weekdayMultiplier` | string | — | Resolved weekday overtime multiplier, e.g. `"1.5"` |
| `restDayMultiplier` | string | — | Resolved rest-day overtime multiplier, e.g. `"1.5"` |
| `weekdayOvertimePay` | string | LKR | Weekday overtime pay, rounded to cents |
| `restDayOvertimePay` | string | LKR | Rest-day overtime pay, rounded to cents |
| `totalOvertimePay` | string | LKR | `weekdayOvertimePay + restDayOvertimePay` |
| `totalOvertimeHours` | string | hours | `weekdayOvertimeHours + restDayOvertimeHours`, fixed one decimal |
| `averageWeeklyOvertimeHours` | string | hours | `totalOvertimeHours / (52 / 12)`, fixed two decimals |
| `weeklyCapExceeded` | string | — | `"possible"` when `averageWeeklyOvertimeHours > 12`, otherwise `"no"` |

All LKR outputs are fixed two-decimal strings. The breakdown presents the monthly remuneration, the selected divisor, the derived hourly rate, each bucket at its multiplier, and the total; the average weekly hours and the twelve-hour section 6 cap are shown as an informational check, not a hard block.

## Formula Definition

Let `R = monthlyRemuneration`, `D` the resolved divisor (`240` or `200`), `h_w` the weekday overtime hours, `h_r` the rest-day overtime hours, and `m_w = m_r = 1.5` the resolved multipliers.

```text
hourlyRate = R / D
weekdayOvertimePay = round2(hourlyRate * m_w * h_w)
restDayOvertimePay = round2(hourlyRate * m_r * h_r)
totalOvertimePay = weekdayOvertimePay + restDayOvertimePay
totalOvertimeHours = h_w + h_r
averageWeeklyOvertimeHours = totalOvertimeHours / (52 / 12)
weeklyCapExceeded = averageWeeklyOvertimeHours > 12 ? "possible" : "no"
```

`round2` is nearest-cent half-up rounding applied once to each bucket, using the unrounded hourly rate.

## Algorithm

1. Validate the date, remuneration, basis, and the two hour buckets.
2. Resolve the overtime rule for `asOfDate`; if no published rule covers the date, fail the entire calculation.
3. Derive the hourly rate from the selected divisor; compute each bucket exactly and round to cents.
4. Sum the buckets and report the weekly-cap check as an informational warning when flagged.

The algorithm is deterministic and O(1).

## Rounding Order

1. Validate `R` and the hours as whole/fractional values; do not round inputs into the contract.
2. Derive `hourlyRate = R / D` exactly; serialize it to two decimals for display only.
3. Compute each bucket with the unrounded hourly rate, then round the bucket total to the nearest cent half-up.
4. Sum the rounded buckets for `totalOvertimePay`; serialize all LKR outputs as fixed two-decimal strings.

Do not round the hourly rate before multiplying, and do not sum unrounded buckets before rounding.

## Assumptions And Exclusions

- The calculation covers a monthly-rated employee in a shop or office covered by the S&O Act, working beyond the normal eight-hour day or forty-five-hour week.
- The hourly rate is the ordinary remuneration divided by the selected divisor; the `convention-200` basis is a Labour Department inspection practice, not a section 11 rule, and is the user's declared choice.
- Overtime is paid at not less than 1.5 times the normal hourly rate; the tool reports the statutory floor and does not model more generous contract multipliers.
- The twelve-hour section 6 weekly cap is reported as an informational check only; per-week enforcement cannot be verified from a monthly total.
- Daily-, weekly-, and fortnightly-rated employees, executives (management trainee and above, not remunerated by hours), wage-board trades with trade-specific divisors and holiday multipliers, and piece-rated work are excluded.
- Public/statutory holiday work under the Act is compensated by an extra day's wage or an alternative holiday and is excluded from cash overtime; Poya-holiday work follows its own surcharge rules and is excluded.
- Night-shift, shift allowance, meal/rest interval disputes, and payroll rounding schemes are excluded.
- The result is a statutory-minimum estimate, not legal, payroll, or accounting advice.

## Boundary Cases

- `R = 0`: hourly rate `"0.00"`, all overtime pay `"0.00"`.
- `h_w = 0`, `h_r = 0`: all buckets and total `"0.00"`, `weeklyCapExceeded` `"no"`.
- Half-hour step: `h_w = 0.5` pays `hourlyRate * 1.5 * 0.5`, rounded to cents.
- A zero hour count must be an explicit `"0"`, not a blank; a blank is a validation error.
- Average weekly hours exactly at the cap (12.00) is not flagged.
- `asOfDate` before `1954-08-09`: rule unavailable, entire calculation fails.
- If the overtime rule cannot resolve for `asOfDate`, the entire calculation fails rather than returning a partial result.

## Official Sources

- [Shop and Office Employees (Regulation of Employment and Remuneration) Act, No. 19 of 1954 (ss. 2, 3, 5, 6, 11) — NIOSH text](https://niosh.gov.lk/images/pdfs/downloads/acts_and_cerculars/shop_and_office_employees_2.pdf)
- [Shop and Office Employees (Regulation of Employment and Remuneration) Act — Laws of Sri Lanka revised statutes (commencement 9 August 1954)](https://www.srilankalaw.lk/s/1110-shop-and-office-employees-regulation-of-employment-and-remuneration-act.html)
- [Shop and Office Employees Act, consolidated (2024) — Lanka Law](https://lankalaw.net/wp-content/uploads/2025/03/Shop-and-Office-Employees-Consolidated-2024.pdf)

The legal instrument and each revised text must be registered as separate sources or revisions as described in the source dossier, with verified link checks.

## Golden Fixtures

All fixtures use `asOfDate: "2026-08-15"` and `supportedScenario: "confirmed"`. Values are independently derived candidates and require the review gate before production publication.

| Inputs | Expected result |
|---|---|
| `R = 100000`, basis `statutory-240`, `h_w = 12`, `h_r = 4` | `hourlyRate: "416.67"`, `hourlyRateDivisor: 240`, `weekdayOvertimePay: "7500.00"`, `restDayOvertimePay: "2500.00"`, `totalOvertimePay: "10000.00"`, `averageWeeklyOvertimeHours: "3.69"`, `weeklyCapExceeded: "no"` |
| `R = 60000`, basis `convention-200`, `h_w = 12`, `h_r = 0` | `hourlyRate: "300.00"`, `hourlyRateDivisor: 200`, `weekdayOvertimePay: "5400.00"`, `totalOvertimePay: "5400.00"` |
| `R = 60000`, basis `statutory-240`, `h_w = 0.5`, `h_r = 0` | `hourlyRate: "250.00"`, `weekdayOvertimePay: "187.50"` |
| `R = 123457`, basis `statutory-240`, `h_w = 1`, `h_r = 0` | `hourlyRate: "514.40"`, `weekdayOvertimePay: "771.61"` (exact `514.404167 * 1.5 = 771.60625` rounded half-up) |
| `R = 120000`, basis `convention-200`, `h_w = 12`, `h_r = 6` | `hourlyRate: "600.00"`, `weekdayOvertimePay: "10800.00"`, `restDayOvertimePay: "5400.00"`, `totalOvertimePay: "16200.00"` |
| `R = 60000`, basis `convention-200`, `h_w = 60`, `h_r = 0` | `averageWeeklyOvertimeHours: "13.85"`, `weeklyCapExceeded: "possible"` |

## Provenance

Every result must include the calculation version and the independently resolved overtime rule version, effective date, official source set, and verification time. Link verification on `2026-08-15` does not satisfy independent legal/accounting review of the formula and the hourly-rate-basis question. The calculation is server-authoritative and atomic: it must not return an overtime result if the required rule or source is unavailable.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.overtime.name` | Overtime calculator |
| `calculator.overtime.summary` | Estimate overtime pay for work beyond normal hours. |
| `calculator.overtime.input.asOfDate` | Calculation month date |
| `calculator.overtime.input.monthlyRemuneration` | Monthly remuneration |
| `calculator.overtime.input.monthlyRemuneration.description` | The ordinary monthly remuneration (including cost-of-living allowance) on which the hourly rate is computed. |
| `calculator.overtime.input.hourlyRateBasis` | Hourly-rate basis |
| `calculator.overtime.input.weekdayOvertimeHours` | Weekday overtime hours |
| `calculator.overtime.input.restDayOvertimeHours` | Weekly day-off overtime hours |
| `calculator.overtime.output.hourlyRate` | Ordinary hourly rate |
| `calculator.overtime.output.weekdayMultiplier` | Weekday multiplier |
| `calculator.overtime.output.restDayMultiplier` | Weekly day-off multiplier |
| `calculator.overtime.output.weekdayOvertimePay` | Weekday overtime pay |
| `calculator.overtime.output.restDayOvertimePay` | Weekly day-off overtime pay |
| `calculator.overtime.output.totalOvertimePay` | Total overtime pay |
| `calculator.overtime.output.totalOvertimeHours` | Total overtime hours |
| `calculator.overtime.output.averageWeeklyOvertimeHours` | Average overtime hours per week |
| `calculator.overtime.output.weeklyCapExceeded` | Weekly overtime cap check |
| `calculator.overtime.assumption.monthlyRated` | The calculation covers a monthly-rated shop or office employee under the Shop and Office Employees Act. |
| `calculator.overtime.assumption.multiplier` | Overtime is paid at not less than 1.5 times the normal hourly rate. |
| `calculator.overtime.assumption.basis` | The statutory hourly rate is monthly remuneration divided by 240; the 200 basis is a Labour Department inspection convention. |
| `calculator.overtime.assumption.rounding` | Overtime pay is rounded to the nearest cent as a calculator convention. |
| `calculator.overtime.warning.cap` | The twelve-hour weekly cap is checked on an average-month basis and cannot verify per-week compliance. |
| `calculator.overtime.warning.holidays` | Public-holiday work under the Act is compensated by an extra day's wage or an alternative holiday and is not part of this cash calculation. |
| `calculator.overtime.error.wholeRupees` | Enter the remuneration as a nonnegative whole number of Sri Lankan rupees. |
| `calculator.overtime.error.halfHours` | Enter overtime hours in steps of half an hour. |
| `calculator.overtime.error.scopeMonthlyRated` | Only monthly-rated shop and office employees are supported. |
| `calculator.overtime.error.ruleUnavailable` | A required reviewed employment rule is unavailable for this date. |

Translate all labels, input guidance, formula explanation, breakdowns, assumptions, exclusions, source titles, warnings, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `Shop and Office Employees Act`, LKR, percentages, dates, and API field identifiers.

## Privacy

The calculator is anonymous. Remuneration and hour values are not persisted by default and raw values must not appear in logs, analytics, source checks, or rule audit events. A request sends only the date, the monthly remuneration, the selected basis, and the two hour buckets. Saved payslips and payroll records are separate future scope requiring explicit consent, authorization, retention, export, and deletion behavior.
