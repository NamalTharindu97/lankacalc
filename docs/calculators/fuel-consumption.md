# Fuel Consumption Calculator Specification

## Identity

- Identifier: `fuel-consumption`
- Display name: Fuel consumption calculator
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
| `distance` | decimal | selected distance unit | yes | Greater than `0`, at most `10,000,000`; at most 6 decimal places |
| `distanceUnit` | enum string | distance | yes | `kilometre` or `mile`; UI default `kilometre` |
| `fuelVolume` | decimal | selected volume unit | yes | Greater than `0`, at most `1,000,000`; at most 6 decimal places |
| `volumeUnit` | enum string | volume | yes | `litre`, `us-gallon`, or `imperial-gallon`; UI default `litre` |

Numeric fields accept finite JSON numbers or strings matching `^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$`. Surrounding whitespace, missing or blank values, booleans, `null`, arrays, objects, `NaN`, and infinities are rejected.

## Unit Normalization

Normalize before calculation using these exact conversion constants:

- `1 mile = 1.609344 kilometres`
- `1 US gallon = 3.785411784 litres`
- `1 imperial gallon = 4.54609 litres`

Preserve the original values and selected units in result metadata alongside normalized kilometres and litres.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `kilometresPerLitre` | string | km/L | Normalized distance per litre |
| `litresPerHundredKilometres` | string | L/100 km | Normalized litres consumed per 100 kilometres |

Outputs remain in the two canonical metric conventions regardless of input units. Both output and breakdown decimal values are serialized as strings.

## Formula And Rounding

Let `D` be normalized kilometres and `V` be normalized litres:

`kilometresPerLitre = D / V`

`litresPerHundredKilometres = V / D * 100`

Calculate after exact unit conversion, then round each output independently and once to at most three decimal places using round-half-up. Canonical strings may omit insignificant trailing zeros. No rate convention applies.

## Assumptions And Exclusions

- Distance and fuel volume cover the same journey or measurement period.
- The result is observed average consumption, not an instantaneous reading.
- Fuel price, trip cost, vehicle type, driving conditions, odometer error, and measurement uncertainty are excluded.
- US and imperial gallons are distinct and never inferred from a generic “gallon.”

## Boundary Cases

- Zero or negative distance/volume is rejected to prevent undefined division and meaningless consumption.
- Entered values at their maxima are valid in the selected unit; larger values are rejected before normalization.
- Every supported distance unit can be combined with every supported volume unit.
- Conversion round trips must remain within the three-decimal output tolerance.

## Golden Fixtures

| Input | Expected result |
|---|---|
| `distance: 500`, `distanceUnit: "kilometre"`, `fuelVolume: 40`, `volumeUnit: "litre"` | `kilometresPerLitre: "12.5"`, `litresPerHundredKilometres: "8"` |
| `distance: 300`, `distanceUnit: "mile"`, `fuelVolume: 10`, `volumeUnit: "us-gallon"` | `kilometresPerLitre: "12.754"`, `litresPerHundredKilometres: "7.84"` |
| `distance: 100`, `distanceUnit: "mile"`, `fuelVolume: 5`, `volumeUnit: "imperial-gallon"` | `kilometresPerLitre: "7.08"`, `litresPerHundredKilometres: "14.124"` |

## Provenance

This is static arithmetic using internationally defined unit conversions, with no changing or regulated parameter. It has no official regulated source, rule version, effective date, or verification date; `sources` and `ruleVersions` are empty and `verifiedAt` is `null`.

## Localization And Privacy

Localize the display name, field and unit-option labels, input guidance, breakdown, assumptions, validation errors, gallon distinction, and examples into reviewed English, Sinhala, and Tamil. Stable API unit identifiers map to familiar localized names and symbols.

The calculator is anonymous and may run in the browser. Journey inputs and results are not persisted and raw values must not be captured in logs or analytics; an API call sends only the two measurements and their selected units.
