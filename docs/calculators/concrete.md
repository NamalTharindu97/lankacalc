# Concrete Quantity Calculator Specification

## Identity

- Identifier: `concrete`
- Display name: Concrete quantity calculator
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
| `length` | decimal | dimension | yes | at least `0.001`, at most `1,000,000`; at most 6 decimal places |
| `width` | decimal | dimension | yes | at least `0.001`, at most `1,000,000`; at most 6 decimal places |
| `depth` | decimal | dimension | yes | at least `0.001`, at most `1,000,000`; at most 6 decimal places |
| `unit` | select | `metre` / `centimetre` / `foot` | yes | default `metre` |
| `wastagePercent` | decimal | percent | yes | `0` to `50`; at most 1 decimal place; default `5` |

Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing and blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `volume` | string | m3 | Length × width × depth converted to cubic metres |
| `wastageVolume` | string | m3 | Volume × wastage percentage |
| `totalVolume` | string | m3 | Volume + wastage volume |

## Formula And Rounding Order

1. Convert `length`, `width`, and `depth` to metres using the selected unit.
2. `volume = length * width * depth`.
3. `wastageVolume = volume * wastagePercent / 100`.
4. `totalVolume = volume + wastageVolume`.
5. Serialize all three as strings rounded to four decimal places with trailing zeros trimmed (a cubic-metre quantity that must be ordered is conventionally quoted to a practical precision; keep 4 decimals so small slabs stay exact).

## Assumptions And Exclusions

- Dimensions are measured from the outer faces of the formwork or excavation as entered.
- The wastage percentage covers spillage, formwork tolerance, and compaction losses at the site; a value of `5` is a common default, not a supplier figure.
- The result is a fresh concrete volume; it does not estimate the dry volumes of cement, sand, or aggregate, and it makes no mix-design assumption.
- Reinforcement, formwork, curing, joints, and hauling are excluded.
- This is not a structural, mix-design, or engineering calculation.

## Boundary Cases

- Any zero, negative, or out-of-range dimension is rejected; all three dimensions must be positive.
- A zero wastage percentage is allowed; negative or above-`50` values are rejected.
- Any non-finite or out-of-contract intermediate/result fails instead of serializing as `null`.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `length: 5`, `width: 4`, `depth: 0.15`, `unit: metre`, `wastagePercent: 5` | `volume: "3"`, `wastageVolume: "0.15"`, `totalVolume: "3.15"` |
| `length: 200`, `width: 100`, `depth: 12`, `unit: centimetre`, `wastagePercent: 0` | `volume: "0.24"`, `wastageVolume: "0"`, `totalVolume: "0.24"` |

## Provenance

This is a static arithmetic estimate driven only by user inputs. No concrete price, regulated rule, official source, effective date, or verification date is supplied; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`.

## Localization And Privacy

Localize the display name, field and breakdown labels, wastage and compaction explanations, assumptions, estimate warning, validation errors, and examples into reviewed English, Sinhala, and Tamil. Preserve metre, cubic metre, and percentage semantics.

The calculator is anonymous and may run in the browser. Inputs and results are not persisted and raw values must not be captured in logs or analytics; an API call sends only the five required fields.
