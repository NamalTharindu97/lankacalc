# Area Calculator Specification

## Identity

- Identifier: `area`
- Display name: Area calculator
- Owner: LankaCalc calculation kernel
- Classification: static
- Calculation version: `2.0.0`

## Approval

- Status: Approved Stage 0 baseline
- Approval basis: the repository owner authorized phased implementation on 2026-08-14
- Localization inventory: `docs/calculators/localization-keys.md`

## Inputs

| Field | Type | Unit | Required | Bounds/options |
|---|---|---|---|---|
| `shape` | enum string | none | yes | `rectangle`, `triangle`, or `circle`; UI default `rectangle` |
| `unit` | enum string | linear unit | yes | `metre`, `foot`, or `centimetre`; UI default `metre` |
| `length` | decimal | selected unit | rectangle only | Greater than `0`, at most `1,000,000,000`; at most 6 decimal places |
| `width` | decimal | selected unit | rectangle only | Greater than `0`, at most `1,000,000,000`; at most 6 decimal places |
| `base` | decimal | selected unit | triangle only | Greater than `0`, at most `1,000,000,000`; at most 6 decimal places |
| `height` | decimal | selected unit | triangle only | Greater than `0`, at most `1,000,000,000`; at most 6 decimal places |
| `radius` | decimal | selected unit | circle only | Greater than `0`, at most `1,000,000,000`; at most 6 decimal places |

All dimensions for one calculation use the selected unit. Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`; surrounding whitespace, blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected. Inactive shape dimensions are omitted and do not affect the result.

## Units And Outputs

Normalize dimensions to metres before calculation using `1 foot = 0.3048 metre` and `1 centimetre = 0.01 metre`, both exact. Preserve the original dimensions and selected unit in result metadata.

| Field | JSON type | Unit |
|---|---|---|
| `area` | string | `m2` for `metre`, `ft2` for `foot`, or `cm2` for `centimetre` |
| `squareMetres` | string | `m2` normalized area |

The result is converted from square metres back to the selected square unit. The breakdown identifies the shape expression, decimal value, and explicit square unit; `square units` is not permitted.

## Formula And Rounding

- Rectangle: `area = length * width`
- Triangle: `area = base * height / 2`
- Circle: `area = pi * radius^2`, using a 40-digit decimal constant for pi

Calculate after unit normalization, convert the result to the selected square unit, then round once to at most six decimal places using round-half-up. Serialize the decimal value as a canonical string; insignificant trailing zeros may be omitted. No rate convention applies.

## Assumptions And Exclusions

- Dimensions describe a flat Euclidean shape and are measured in one unit.
- Triangle `height` is perpendicular to `base`.
- Circle input is a radius, not a diameter.
- Irregular shapes, composite areas, openings, slope, wastage, material quantities, and engineering tolerances are excluded.

## Boundary Cases

- Zero and negative dimensions are rejected; UI and API metadata publish the same positive minimum.
- The active shape's dimensions are required; inactive dimensions are ignored.
- A value of `1,000,000,000` is valid and any larger value is rejected.
- Unit round trips must reproduce the original value within the six-decimal output tolerance.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `shape: "rectangle"`, `unit: "metre"`, `length: 10`, `width: 5` | `area: "50"`, unit `m2` |
| `shape: "triangle"`, `unit: "foot"`, `base: 10`, `height: 5` | `area: "25"`, unit `ft2` |
| `shape: "circle"`, `unit: "centimetre"`, `radius: 2` | `area: "12.566371"`, unit `cm2` |
| `shape: "rectangle"`, `unit: "foot"`, `length: 1`, `width: 1` | normalized area `0.092903 m2`; returned `area: "1"`, unit `ft2` |

## Provenance

This is static geometry and exact unit conversion, except for the standard numerical approximation of pi. It has no regulated source, rule version, effective date, or verification date; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`.

## Localization And Privacy

Localize the display name, shape and unit options, dimension and breakdown labels, guidance, formula explanations, assumptions, validation errors, and examples into reviewed English, Sinhala, and Tamil. Unit identifiers remain stable; localized UIs may display familiar symbols.

The calculator is anonymous and may run in the browser. Inputs and results are not persisted or captured as raw analytics/log data; an API call sends only the selected shape, unit, and active dimensions.
