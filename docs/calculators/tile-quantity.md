# Tile Quantity Calculator Specification

## Identity

- Identifier: `tile-quantity`
- Display name: Tile quantity calculator
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
| `length` | decimal | room length | yes | at least `0.001`, at most `1,000,000`; at most 6 decimal places |
| `width` | decimal | room width | yes | at least `0.001`, at most `1,000,000`; at most 6 decimal places |
| `unit` | select | `metre` / `centimetre` / `foot` | yes | default `metre` |
| `tileLength` | integer | millimetres | yes | `1` to `2000` |
| `tileWidth` | integer | millimetres | yes | `1` to `2000` |
| `jointMillimetres` | decimal | millimetres | yes | `0` to `20`; at most 1 decimal place; default `3` |
| `wastagePercent` | decimal | percent | yes | `0` to `50`; at most 1 decimal place; default `5` |

Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing and blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected. `tileLength` and `tileWidth` must remain integers after parsing.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `floorArea` | string | m2 | Length × width converted to square metres |
| `effectiveTileLength` | string | m | `(tileLength + jointMillimetres) / 1000` |
| `effectiveTileWidth` | string | m | `(tileWidth + jointMillimetres) / 1000` |
| `tilesBeforeWastage` | integer | tiles | Ceiling of floor area divided by effective tile area |
| `tilesAfterWastage` | integer | tiles | Ceiling of tiles before wastage × (1 + wastage) |

## Formula And Rounding Order

1. Convert `length` and `width` to metres using the selected unit.
2. `floorArea = lengthMetres * widthMetres`.
3. `effectiveLength = (tileLength + jointMillimetres) / 1000`, and likewise for width.
4. `rawTiles = floorArea / (effectiveLength * effectiveWidth)`.
5. Round `rawTiles` up to a whole number: `tilesBeforeWastage = ceil(rawTiles)`.
6. `tilesAfterWastage = ceil(tilesBeforeWastage * (1 + wastagePercent / 100))`.
7. Serialize areas and effective sizes as rounded strings (up to 3 decimal places, trailing zeros trimmed except the area which uses a fixed 3 places for the normalized value).

## Assumptions And Exclusions

- Tiles are laid edge to edge on a plane with a uniform joint on all four sides of each tile.
- The calculation counts tiles for a flush rectangular area; borders, borders with cut tiles, diagonal layouts, patterns, and repeating borders require more tiles than this estimate.
- The wastage percentage is applied by rounding up the final count; it is not an instruction to order precisely that many.
- Floor area, openings, thresholds, and fixture cut-outs are not deducted.
- Tile thickness, substrate, adhesive, and joint material are excluded.
- This is an estimate, not a structural, engineering, or procurement specification.

## Boundary Cases

- Zero, negative, or fractional millimetre tile sizes are rejected.
- A joint of `0` millimetres is allowed.
- Zero or negative room dimensions, and values above the maxima, are rejected.
- Any non-finite or out-of-contract intermediate/result fails instead of serializing as `null`.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `length: 4`, `width: 3`, `unit: metre`, `tileLength: 600`, `tileWidth: 600`, `jointMillimetres: 0`, `wastagePercent: 0` | `floorArea: "12.000"`, `tilesBeforeWastage: 34`, `tilesAfterWastage: 34` |
| `length: 4`, `width: 3`, `unit: metre`, `tileLength: 600`, `tileWidth: 600`, `jointMillimetres: 0`, `wastagePercent: 5` | `tilesBeforeWastage: 34`, `tilesAfterWastage: 36` |
| `length: 10`, `width: 6`, `unit: foot`, `tileLength: 300`, `tileWidth: 300`, `jointMillimetres: 0`, `wastagePercent: 0` | `floorArea: "5.574"` (60 sq ft ≈ 5.574 m2), `tilesBeforeWastage: 62` |

## Provenance

This is a static arithmetic estimate driven only by user inputs. No material price, regulated rule, official source, effective date, or verification date is supplied; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`.

## Localization And Privacy

Localize the display name, field and breakdown labels, joint and wastage explanations, assumptions, estimate warning, validation errors, and examples into reviewed English, Sinhala, and Tamil. Preserve millimetre, square metre, and percentage semantics.

The calculator is anonymous and may run in the browser. Inputs and results are not persisted and raw values must not be captured in logs or analytics; an API call sends only the seven required fields.
