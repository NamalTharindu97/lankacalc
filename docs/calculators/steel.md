# Steel Quantity Calculator Specification

## Identity

- Identifier: `steel`
- Display name: Steel quantity calculator
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
| `diameterMillimetres` | select | mm | yes | `6`, `8`, `10`, `12`, `16`, `20`, `25`, or `32`; default `12` |
| `barLengthMetres` | decimal | metres | yes | `0.1` to `24`; at most 2 decimal places; default `12` |
| `bars` | integer | bars | yes | `1` to `10000` |
| `wastagePercent` | decimal | percent | yes | `0` to `50`; at most 1 decimal place; default `5` |

Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing and blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected. `bars` must remain an integer after parsing.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `totalLength` | string | metres | `barLengthMetres * bars` |
| `unitWeightKilogrammesPerMetre` | string | kg/m | `diameterMillimetres^2 / 162`, rounded to three decimal places |
| `weightKilogrammes` | string | kg | `totalLength * unitWeight`, rounded to two decimal places |
| `wastageKilogrammes` | string | kg | `weightKilogrammes * wastagePercent / 100`, rounded to two decimal places |
| `totalKilogrammes` | string | kg | Weight plus wastage, rounded to two decimal places |

## Formula And Rounding Order

1. `totalLength = barLengthMetres * bars`.
2. `unitWeight = diameter^2 / 162` (diameter in millimetres), rounded to three decimal places for display but carried at full precision in the total.
3. `weight = totalLength * unitWeight` at full precision, then rounded to two decimal places.
4. `wastage = weight * wastagePercent / 100`, rounded to two decimal places.
5. `total = weight + wastage`, rounded to two decimal places.

## Assumptions And Exclusions

- The unit weight formula `d^2/162` kg/m corresponds to the standard density of reinforcement steel (7850 kg/m3) and is the conventional estimate for TMT bars.
- Bars are treated as plain straight lengths; laps, couplers, anchorage, hooks, spacers, chair bars, and binding wire are excluded.
- The bar grade (Fe415/Fe500/Fe550) does not change the mass estimate and is not verified here.
- The wastage default covers off-cuts and site losses; a figure of `5` percent is a common default, not a supplier or fabricator allowance.
- This is a quantity and weight estimate only. It is not a structural design, schedule, or engineering calculation, and it must not be used to size reinforcement.

## Boundary Cases

- Only the standard diameter options are accepted; free-form diameters are rejected.
- Zero bars, zero or negative bar lengths, and values above the maxima are rejected.
- A zero wastage percentage is allowed; negative or above-`50` values are rejected.
- Any non-finite or out-of-contract intermediate/result fails instead of serializing as `null`.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `diameterMillimetres: 12`, `barLengthMetres: 12`, `bars: 100`, `wastagePercent: 0` | `totalLength: "1200"`, `unitWeightKilogrammesPerMetre: "0.889"`, `weightKilogrammes: "1066.67"`, `wastageKilogrammes: "0.00"`, `totalKilogrammes: "1066.67"` |
| `diameterMillimetres: 8`, `barLengthMetres: 12`, `bars: 50`, `wastagePercent: 5` | `unitWeightKilogrammesPerMetre: "0.395"`, `weightKilogrammes: "237.04"`, `totalKilogrammes: "248.89"` |

## Provenance

This is a static arithmetic estimate driven only by user inputs. No steel price, regulated rule, official source, effective date, or verification date is supplied; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`.

## Localization And Privacy

Localize the display name, field and breakdown labels, the `d^2/162` explanation, assumptions, estimate warning, validation errors, and examples into reviewed English, Sinhala, and Tamil. Preserve millimetre, metre, kilogramme, and percentage semantics.

The calculator is anonymous and may run in the browser. Inputs and results are not persisted and raw values must not be captured in logs or analytics; an API call sends only the four required fields.
