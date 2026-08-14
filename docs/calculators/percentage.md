# Percentage Calculator Specification

## Identity

- Identifier: `percentage`
- Display name: Percentage calculator
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
| `percentage` | decimal | percent (`%`) | yes | `-1,000,000` to `1,000,000`, inclusive; at most 12 decimal places |
| `value` | decimal | unitless | yes | `-1,000,000,000,000` to `1,000,000,000,000`, inclusive; at most 12 decimal places |

Each numeric field accepts a finite JSON number or a string matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing or blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected rather than coerced.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `percentageValue` | string | same conceptual unit as `value` | The requested percentage of `value` |

The decimal output and its breakdown value are serialized as decimal strings, never JSON numbers.

## Formula And Rounding

`percentageValue = value * percentage / 100`.

Calculate with decimal arithmetic, then round once to at most six decimal places using round-half-up. The canonical string may omit insignificant trailing zeros. No interest-rate convention applies.

## Assumptions And Exclusions

- This operation only computes “X percent of Y.”
- Percentage change, reverse percentage, ratios, and adding or subtracting a percentage are excluded.
- `value` is unitless to the calculator; callers supply its business meaning.

## Boundary Cases

- Zero in either field returns `"0"`.
- Negative percentages and values are valid and follow ordinary sign multiplication.
- Both inclusive limits are valid; values outside either bound are rejected.
- Inputs that pass type parsing but produce a non-finite or out-of-contract result must fail rather than serialize as `null`.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `percentage: 12.5`, `value: 800` | `percentageValue: "100"` |
| `percentage: -25`, `value: 80` | `percentageValue: "-20"` |
| `percentage: 33.333333`, `value: 3` | `percentageValue: "1"` |

## Provenance

This is static mathematics with no regulated or external parameters. It has no official source, rule version, effective date, or verification date; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`.

## Localization And Privacy

Localize the display name, field and breakdown labels, formula explanation, rounding disclosure, guidance, validation errors, assumptions, and examples into reviewed English, Sinhala, and Tamil. Decimal entry and display may follow locale conventions in the UI, but the API contract remains an unambiguous base-10 value.

The calculator is anonymous and may run in the browser. Inputs and results are not persisted and raw values must not be captured in logs or analytics; an API call sends only the two required values.
