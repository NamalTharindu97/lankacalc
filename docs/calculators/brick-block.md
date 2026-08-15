# Brick And Block Quantity Calculator Specification

## Identity

- Identifier: `brick-block`
- Display name: Brick and block quantity calculator
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
| `length` | decimal | wall length | yes | at least `0.001`, at most `1,000,000`; at most 6 decimal places |
| `height` | decimal | wall height | yes | at least `0.001`, at most `1,000,000`; at most 6 decimal places |
| `unit` | select | `metre` / `centimetre` / `foot` | yes | default `metre` |
| `openingArea` | decimal | m2 | yes | `0` to `1,000,000`; at most 2 decimal places; default `0` |
| `brickLength` | integer | millimetres | yes | `50` to `1000`; default `222` |
| `brickHeight` | integer | millimetres | yes | `20` to `500`; default `72` |
| `jointMillimetres` | decimal | millimetres | yes | `0` to `30`; at most 1 decimal place; default `10` |
| `wastagePercent` | decimal | percent | yes | `0` to `50`; at most 1 decimal place; default `5` |

Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing and blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected. `brickLength` and `brickHeight` must remain integers after parsing.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `wallArea` | string | m2 | Wall length × height minus opening area |
| `bricksPerSquareMetre` | string | bricks | `1 / (effectiveLength * effectiveHeight)` |
| `bricksBeforeWastage` | integer | bricks | Ceiling of `wallArea * bricksPerSquareMetre` |
| `bricksAfterWastage` | integer | bricks | Ceiling of bricks before wastage × (1 + wastage) |

## Formula And Rounding Order

1. Convert `length` and `height` to metres using the selected unit.
2. `wallArea = length * height - openingArea`.
3. `effectiveLength = (brickLength + jointMillimetres) / 1000`, `effectiveHeight = (brickHeight + jointMillimetres) / 1000`.
4. `bricksPerSquareMetre = 1 / (effectiveLength * effectiveHeight)`.
5. `bricksBeforeWastage = ceil(wallArea * bricksPerSquareMetre)`.
6. `bricksAfterWastage = ceil(bricksBeforeWastage * (1 + wastagePercent / 100))`.
7. Serialize `wallArea` to three decimal places (trailing zeros trimmed) and `bricksPerSquareMetre` to two decimal places.

## Assumptions And Exclusions

- A single-layer (half-brick) wall is assumed: each unit contributes `brickLength` by `brickHeight` to the face area, plus one mortar joint on each dimension.
- The default `222` by `72` millimetre brick and `10` millimetre joint represent a common Sri Lankan brick with a standard mortar bed; the values are user-adjustable.
- `openingArea` deducts doors, windows, and other openings; each opening is assumed to be fully deducted with no extra brickwork for reveals.
- Hollow block walls and multi-leaf walls require a different bond and are not covered by this half-brick model.
- Mortar volume and mix proportions, tie beams, lintels, copings, and columns are excluded.
- This is an estimate, not a structural, masonry-design, or engineering calculation.

## Boundary Cases

- Zero or negative wall dimensions, negative openings, or a wall area below zero after deductions are rejected.
- A joint of `0` millimetres is allowed.
- Out-of-range brick dimensions or wastage values are rejected.
- Any non-finite or out-of-contract intermediate/result fails instead of serializing as `null`.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `length: 5`, `height: 3`, `unit: metre`, `openingArea: 0`, `brickLength: 222`, `brickHeight: 72`, `jointMillimetres: 10`, `wastagePercent: 5` | `wallArea: "15"`, `bricksBeforeWastage: 789`, `bricksAfterWastage: 829` |
| `length: 5`, `height: 3`, `unit: metre`, `openingArea: 2`, `brickLength: 222`, `brickHeight: 72`, `jointMillimetres: 10`, `wastagePercent: 0` | `wallArea: "13"`, `bricksBeforeWastage: 684`, `bricksAfterWastage: 684` |

## Provenance

This is a static arithmetic estimate driven only by user inputs. No material price, regulated rule, official source, effective date, or verification date is supplied; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`.

## Localization And Privacy

Localize the display name, field and breakdown labels, bond and joint explanations, assumptions, estimate warning, validation errors, and examples into reviewed English, Sinhala, and Tamil. Preserve millimetre, square metre, and percentage semantics.

The calculator is anonymous and may run in the browser. Inputs and results are not persisted and raw values must not be captured in logs or analytics; an API call sends only the eight required fields.
