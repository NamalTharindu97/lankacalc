# Paint Quantity Calculator Specification

## Identity

- Identifier: `paint`
- Display name: Paint quantity calculator
- Owner: LankaCalc calculation kernel
- Classification: static
- Calculation version: `1.0.0`

## Approval

- Status: Approved Stage 5 construction family
- Approval basis: the repository owner authorized phased implementation on 2026-08-15
- Localization inventory: `docs/calculators/localization-keys.md`

## Inputs

| Field | Type | Unit | Required | Bounds |
|---|---|---|---|---|
| `surfaceArea` | decimal | surface area | yes | at least `0.01`, at most `1,000,000`; at most 2 decimal places |
| `unit` | select | `square-metre` / `square-foot` | yes | default `square-metre` |
| `coats` | integer | coats | yes | `1` to `4`; default `2` |
| `coveragePerLitre` | decimal | m2 per litre | yes | `1` to `50`; at most 1 decimal place; default `10` |
| `wastagePercent` | decimal | percent | yes | `0` to `50`; at most 1 decimal place; default `10` |

Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing and blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected. `coats` must remain an integer after parsing.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `surfaceAreaSquareMetres` | string | m2 | Surface area converted to square metres |
| `areaToCover` | string | m2 | Surface area × coats |
| `exactLitres` | string | litres | `areaToCover / coveragePerLitre`, rounded to one decimal |
| `litresToBuy` | integer | litres | Ceiling of exact litres × (1 + wastage) |
| `wastageLitres` | string | litres | `litresToBuy - exactLitres`, rounded to one decimal |

## Formula And Rounding Order

1. Convert `surfaceArea` to square metres (`1 sq ft = 0.09290304 m2`).
2. `areaToCover = surfaceArea * coats`.
3. `rawLitres = areaToCover / coveragePerLitre`.
4. `wastageAdjusted = rawLitres * (1 + wastagePercent / 100)`.
5. `litresToBuy = ceil(wastageAdjusted)` (whole litres; paint is purchased in litre or larger containers).
6. `exactLitres = round(rawLitres, 1)`.
7. `wastageLitres = litresToBuy - rawLitres`, rounded to one decimal.

## Assumptions And Exclusions

- Coverage is a flat-rate estimate: the default of `10` m2 per litre is typical of emulsion paint on smooth, primed masonry. Porous, rough, or unprimed surfaces reduce real coverage.
- The coverage input is user-supplied; the default is not a brand claim.
- Each coat covers the full surface; the total area is surface area multiplied by coats.
- Wastage covers cutting in, touch-ups, roller loss, and leftover-in-tin effects and is absorbed by rounding up to a whole litre.
- Ceilings, trims, woodwork, primer, undercoat, and gloss coats are separate decisions and are not estimated.
- This is an estimate, not a professional paint specification.

## Boundary Cases

- A coverage of zero or below, zero surface area, more than four coats, or negative wastage is rejected.
- `coveragePerLitre` below `1` or above `50` is rejected.
- Any non-finite or out-of-contract intermediate/result fails instead of serializing as `null`.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `surfaceArea: 40`, `unit: square-metre`, `coats: 2`, `coveragePerLitre: 10`, `wastagePercent: 10` | `areaToCover: "80"`, `exactLitres: "8.0"`, `litresToBuy: 9`, `wastageLitres: "1.0"` |
| `surfaceArea: 100`, `unit: square-metre`, `coats: 1`, `coveragePerLitre: 10`, `wastagePercent: 0` | `areaToCover: "100"`, `exactLitres: "10.0"`, `litresToBuy: 10`, `wastageLitres: "0.0"` |

## Provenance

This is a static arithmetic estimate driven only by user inputs. No paint brand, regulated rule, official source, effective date, or verification date is supplied; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`.

## Localization And Privacy

Localize the display name, field and breakdown labels, coverage and wastage explanations, assumptions, estimate warning, validation errors, and examples into reviewed English, Sinhala, and Tamil. Preserve square metre, litre, coat, and percentage semantics.

The calculator is anonymous and may run in the browser. Inputs and results are not persisted and raw values must not be captured in logs or analytics; an API call sends only the five required fields.
