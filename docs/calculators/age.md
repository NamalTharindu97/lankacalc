# Age Calculator Specification

## Identity

- Identifier: `age`
- Display name: Age calculator
- Owner: LankaCalc calculation kernel
- Classification: static
- Calculation version: `1.0.0`

## Approval

- Status: Approved Stage 0 baseline
- Approval basis: the repository owner authorized phased implementation on 2026-08-14
- Localization inventory: `docs/calculators/localization-keys.md`

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `dateOfBirth` | string | calendar date | yes | Valid `YYYY-MM-DD`, year `0100`-`9999` |
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`, year `0100`-`9999`; must be on or after `dateOfBirth` |

Dates are interpreted in the proleptic Gregorian calendar without a time, timezone, or locale-dependent parsing.

## Outputs

| Field | Type | Unit | Meaning |
|---|---|---|---|
| `completedYears` | integer | years | Whole anniversaries reached by `asOfDate` |
| `totalDays` | integer | days | Calendar days elapsed from birth date to calculation date |

The breakdown repeats both outputs. `asOfDate` is also the result's effective date.

## Formula And Rounding

`completedYears` is the difference between calendar years, reduced by one when the current year's birthday has not occurred. A 29 February birthday has a 28 February anniversary in non-leap years. `totalDays = floor((asOfDateUTC - dateOfBirthUTC) / 86,400,000)`.

Both outputs are exact integers; no decimal rounding or rate convention applies.

## Assumptions And Exclusions

- Age means completed calendar years, not fractional years.
- Elapsed days do not include the starting date.
- Times of day, timezones, leap seconds, historical calendar changes, and legal age rules are excluded.

## Boundary Cases

- Equal dates return zero years and zero days.
- A date before the birthday in the current year does not complete another year.
- Invalid dates such as `2023-02-29`, non-ISO strings, and a birth date after `asOfDate` are rejected.
- `2000-02-29` reaches 23 completed years on `2023-02-28` and emits the leap-day warning.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `dateOfBirth: "2000-02-29"`, `asOfDate: "2023-02-28"` | `completedYears: 23`, `totalDays: 8400` |
| `dateOfBirth: "2024-01-01"`, `asOfDate: "2024-01-01"` | `completedYears: 0`, `totalDays: 0` |

## Provenance

This is fixed calendar arithmetic, not a regulated calculation. It has no official source, rule version, or verification date; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`.

## Localization And Privacy

Localize the display name, date labels and guidance, breakdown labels, assumptions, leap-day warning, validation errors, and examples into reviewed English, Sinhala, and Tamil. API dates remain ISO `YYYY-MM-DD`; presentation may be localized without changing the calculation.

The calculator is anonymous and may run in the browser. Inputs are not persisted and must not be recorded as raw values in logs or analytics; when the API is used, only the two required dates are sent.
