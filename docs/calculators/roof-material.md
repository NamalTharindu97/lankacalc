# Roof Material Quantity Calculator Specification

## Identity

- Identifier: `roof-material`
- Display name: Roof material quantity calculator
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
| `length` | decimal | building length | yes | at least `0.001`, at most `1,000,000`; at most 6 decimal places |
| `width` | decimal | building width | yes | at least `0.001`, at most `1,000,000`; at most 6 decimal places |
| `unit` | select | `metre` / `centimetre` / `foot` | yes | default `metre` |
| `slopeDegrees` | decimal | degrees | yes | `0` to `60`; at most 1 decimal place; default `15` |
| `material` | select | material preset | yes | `corrugated-metal-sheet`, `clay-tile`, `concrete-tile`; default `clay-tile` |
| `coveragePerUnit` | decimal | m2 per unit | yes | `0.01` to `5`; at most 4 decimal places; default by material |
| `wastagePercent` | decimal | percent | yes | `0` to `50`; at most 1 decimal place; default `5` |

Material presets set a suggested `coveragePerUnit`: `clay-tile` `0.111` (about 9 tiles per m2), `concrete-tile` `0.1` (about 10 tiles per m2), and `corrugated-metal-sheet` `1.44` (a 2.4 m × 0.6 m effective sheet). The coverage value is always user-adjustable.

Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing and blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `footprintArea` | string | m2 | Length × width converted to square metres |
| `roofArea` | string | m2 | Footprint area / cos(slope), rounded to two decimal places |
| `unitsBeforeWastage` | integer | units | Ceiling of `roofArea / coveragePerUnit` |
| `unitsAfterWastage` | integer | units | Ceiling of units before wastage × (1 + wastage) |
| `unitLabel` | string | label | `sheets` for metal, `tiles` for clay or concrete |

## Formula And Rounding Order

1. Convert `length` and `width` to metres using the selected unit.
2. `footprintArea = length * width`.
3. `roofArea = footprintArea / cos(slopeDegrees)`.
4. `rawUnits = roofArea / coveragePerUnit`.
5. `unitsBeforeWastage = ceil(rawUnits)`.
6. `unitsAfterWastage = ceil(unitsBeforeWastage * (1 + wastagePercent / 100))`.
7. Serialize `footprintArea` and `roofArea` to two decimal places (trailing zeros trimmed for footprint, fixed two for roof area).

## Assumptions And Exclusions

- A single-plane roof over a rectangular footprint is assumed; the roof surface expands by `1 / cos(slope)`.
- `coveragePerUnit` is the effective covered area of one unit after overlaps are accounted for, not its physical size. The defaults are user-adjustable suggestions, not brand claims.
- Ridge caps, hip and valley flashings, eaves fillers, fascias, guttering, ridge ventilators, and cut waste around hips and valleys are excluded.
- The slope is measured from horizontal and is not a structural rafter-pitch analysis.
- This is an estimate, not an engineering calculation; roofing decisions depend on the truss design, weatherproofing details, and manufacturer instructions.

## Boundary Cases

- A slope of `90` degrees or more is rejected (division by a non-positive cosine); `0` degrees (flat) is allowed.
- Zero or negative building dimensions, zero or negative coverage, and values above the maxima are rejected.
- Any non-finite or out-of-contract intermediate/result fails instead of serializing as `null`.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `length: 10`, `width: 6`, `unit: metre`, `slopeDegrees: 0`, `material: clay-tile`, `coveragePerUnit: 0.111`, `wastagePercent: 5` | `footprintArea: "60"`, `roofArea: "60.00"`, `unitsBeforeWastage: 541`, `unitsAfterWastage: 569`, `unitLabel: "tiles"` |
| `length: 10`, `width: 6`, `unit: metre`, `slopeDegrees: 45`, `material: corrugated-metal-sheet`, `coveragePerUnit: 1.44`, `wastagePercent: 0` | `roofArea: "84.85"`, `unitsBeforeWastage: 59`, `unitsAfterWastage: 59`, `unitLabel: "sheets"` |

## Provenance

This is a static arithmetic estimate driven only by user inputs. No roofing price, regulated rule, official source, effective date, or verification date is supplied; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`.

## Localization And Privacy

Localize the display name, field and breakdown labels, the slope and overlap explanations, assumptions, estimate warning, validation errors, and examples into reviewed English, Sinhala, and Tamil. Preserve metre, square metre, degree, and percentage semantics.

The calculator is anonymous and may run in the browser. Inputs and results are not persisted and raw values must not be captured in logs or analytics; an API call sends only the seven required fields.
