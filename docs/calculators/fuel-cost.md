# Fuel Cost Calculator Specification

## Identity

- Identifier: `fuel-cost`
- Display name: Fuel cost calculator
- Owner: LankaCalc fuel cost kernel
- Classification: configurable (official price rule defaults; user may override)
- Calculation version: `1.0.0`
- Candidate rule version: `fuel-pump-prices-cpc-2026-2026-06-29-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent review of price-setting authority and coverage
- Source research and link verification: 2026-08-16
- Source dossier: `docs/fuel-rule-sources.md`

The candidate implements a fuel cost estimator that multiplies litres used by the official Ceypetco retail pump price for the calculation date. The price is a rule version resolved by date; the user may override the price, in which case the official default remains recorded in the result. Approval does not authorize a fuel-pricing decision or production publication.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve to a reviewed price rule version |
| `fuelType` | string | label | yes | One of `petrol-92`, `petrol-95`, `auto-diesel`, `super-diesel` |
| `distancePerTripKm` | string | km | yes | Decimal `0.01` to `10000`, at most 2 decimals |
| `tripsPerMonth` | integer | trips | yes | `1` to `500` |
| `fuelEfficiency` | string | km/L | yes | Decimal `0.1` to `100`, at most 2 decimals |
| `pricePerLitreOverride` | string | LKR/litre | no | Decimal `0.01` to `10000`, at most 2 decimals; blank uses the official price |

`fuelEfficiency` is the user's average distance per litre; the calculator does not estimate consumption.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `fuelType` | string | label | Selected fuel type |
| `fuelTypeLabel` | string | label | Official product label for the fuel type |
| `priceSource` | string | label | `official` or `user` |
| `officialPricePerLitre` | string | LKR/litre | Official Ceypetco price for the calculation date |
| `pricePerLitre` | string | LKR/litre | Price actually used in the estimate |
| `litresPerTrip` | string | L | Litres per trip at the entered efficiency |
| `litresPerMonth` | string | L | Litres per month (`litresPerTrip × tripsPerMonth`) |
| `costPerTrip` | string | LKR | `litresPerTrip × pricePerLitre` |
| `costPerMonth` | string | LKR | `litresPerMonth × pricePerLitre` |
| `costPerYear` | string | LKR | `costPerMonth × 12` |
| `costPerHundredKm` | string | LKR | `(100 ÷ fuelEfficiency) × pricePerLitre` |

Every monetary output is a two-decimal-cent string (components rounded to the nearest cent, half up). The breakdown lists the trip distance, fuel efficiency, litres per trip, litres per month, price per litre, cost per trip, cost per month, cost per year, and cost per 100 km lines.

## Formula And Rate Convention

Let `d = distancePerTripKm`, `e = fuelEfficiency`, `t = tripsPerMonth`, and `p = price per litre` (the override if entered, otherwise the official rule price for the fuel type on `asOfDate`).

```text
litresPerTrip   = d / e
litresPerMonth  = litresPerTrip × t
costPerTrip     = litresPerTrip × p
costPerMonth    = litresPerMonth × p
costPerYear     = costPerMonth × 12
costPerHundredKm = (100 / e) × p
```

All intermediate arithmetic runs at high decimal precision; only the serialized outputs are rounded to the nearest cent.

## Rounding Order

1. Validate inputs; reject non-positive distance, efficiency, or price, a trips count outside `1–500`, a fuel type with no official price for the date, and overrides with more than two decimals.
2. Compute litres and costs at full precision from the entered values and the resolved price.
3. Round each serialized output to the nearest cent (half up) independently.
4. Serialize litres and costs as two-decimal strings.

## Assumptions And Exclusions

- The monthly distance is the distance per trip multiplied by the number of trips per month; weekend, holiday, and route variation are not modeled.
- The entered efficiency is the user's average; the calculator does not estimate consumption, driving style, or traffic effects.
- Costs use the custom price when one is entered, otherwise the official Ceypetco retail price for the calculation date.
- The official default covers Ceypetco-branded retail stations; unbranded and other-brand stations may price at market and are covered by the custom price override.
- The result is an estimate, not a bill, invoice, or fuel-pricing decision.

Excluded: vehicle purchase and maintenance, insurance, tolls, parking, idling, load/AC effects, fuel station brand variance beyond the official list, and fuels outside the four headline products.

## Boundary Cases

- A blank custom price uses the official price and records `priceSource: "official"`.
- A custom price uses the override and records both the used price and the official default.
- A fuel type absent from the resolved price rule fails closed (rule unavailable or no matching price) rather than falling back to the latest price without provenance.
- A trips count of 1 reduces the monthly figure to the single-trip figure.
- An efficiency or distance outside the documented bounds is rejected.

## Official Sources

- [Ceylon Petroleum Corporation — official website](https://www.ceypetco.gov.lk/)
- [Ceylon Petroleum Storage Terminals (CPC)](https://ceylonpetroleum.com/)
- [Ministry of Power & Energy — Sri Lanka](https://powerenergy.gov.lk/)
- [Sri Lanka Government Gazette](https://www.documents.gov.lk/)

The rule version must attach the Ceypetco price announcement and the governing gazette order as separate source records or revisions, with the effective date.

## Golden Fixtures

These are candidate calculations, not official worked examples. All use the candidate payload (effective 2026-06-29).

| Input | Expected result |
|---|---|
| `fuelType: "petrol-95"`, `distancePerTripKm: "30"`, `tripsPerMonth: 40`, `fuelEfficiency: "12"` | `pricePerLitre: "383.00"`, `priceSource: "official"`, `litresPerTrip: "2.50"`, `costPerTrip: "957.50"`, `costPerMonth: "38300.00"`, `costPerYear: "459600.00"`, `costPerHundredKm: "3191.67"` |
| `fuelType: "auto-diesel"`, `distancePerTripKm: "50"`, `tripsPerMonth: 1`, `fuelEfficiency: "15"` | `pricePerLitre: "333.00"`, `litresPerTrip: "3.33"`, `costPerTrip: "1110.00"`, `costPerMonth: "1110.00"`, `costPerYear: "13320.00"`, `costPerHundredKm: "2220.00"` |
| `fuelType: "petrol-95"`, `distancePerTripKm: "30"`, `tripsPerMonth: 40`, `fuelEfficiency: "12"`, `pricePerLitreOverride: "400.00"` | `priceSource: "user"`, `officialPricePerLitre: "383.00"`, `pricePerLitre: "400.00"`, `costPerTrip: "1000.00"` |

## Candidate Rule Payload

The candidate payload below is what the test suite loads inline and what a reviewed rule version must contain. All prices are the Ceypetco retail prices effective 2026-06-29.

```json
{
  "authority": "ceypetco-cpc-sri-lanka",
  "effectiveFrom": "2026-06-29",
  "rounding": "nearest-cent",
  "prices": [
    { "fuelType": "petrol-92", "label": "Lanka Petrol 92 Octane", "pricePerLitre": "318.00" },
    { "fuelType": "petrol-95", "label": "Lanka Petrol 95 Octane Euro 4", "pricePerLitre": "383.00" },
    { "fuelType": "auto-diesel", "label": "Lanka Auto Diesel", "pricePerLitre": "333.00" },
    { "fuelType": "super-diesel", "label": "Lanka Super Diesel 4 Star Euro 4", "pricePerLitre": "369.00" }
  ]
}
```

## Provenance

Every result must include the calculation version, resolved fuel price rule version and effective date, attached regulatory sources, and latest successful source verification time. Link verification on `2026-08-16` confirms source availability and per-product price reading against the announcements, not independent regulatory approval. Regulated execution is server-authoritative and must fail if a reviewed applicable rule or required source provenance cannot be resolved.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.fuelCost.name` | Fuel cost calculator |
| `calculator.fuelCost.summary` | Estimate trip and monthly fuel costs from distance, efficiency, and dated official pump prices. |
| `calculator.fuelCost.input.asOfDate` | Calculation date |
| `calculator.fuelCost.input.fuelType` | Fuel type |
| `calculator.fuelCost.input.distancePerTripKm` | Distance per trip |
| `calculator.fuelCost.input.tripsPerMonth` | Trips per month |
| `calculator.fuelCost.input.fuelEfficiency` | Fuel efficiency |
| `calculator.fuelCost.input.pricePerLitreOverride` | Custom price per litre (optional) |
| `calculator.fuelCost.output.costPerTrip` | Cost per trip |
| `calculator.fuelCost.output.costPerMonth` | Cost per month |
| `calculator.fuelCost.output.costPerYear` | Cost per year |
| `calculator.fuelCost.output.costPerHundredKm` | Cost per 100 km |
| `calculator.fuelCost.output.litresPerTrip` | Litres per trip |
| `calculator.fuelCost.output.litresPerMonth` | Litres per month |
| `calculator.fuelCost.output.officialPricePerLitre` | Official price per litre |
| `calculator.fuelCost.output.pricePerLitre` | Price per litre |
| `calculator.fuelCost.output.priceSource` | Price source |
| `calculator.fuelCost.assumption.officialPrice` | Costs use the official Ceypetco retail price for the calculation date unless a custom price is entered. |
| `calculator.fuelCost.warning.priceRevision` | Fuel prices are revised periodically; the official price list remains authoritative for the entry date. |
| `calculator.fuelCost.warning.brandVariance` | Actual pump prices may vary by station and brand. |
| `calculator.fuelCost.warning.estimate` | This is an estimate, not a bill, invoice, or fuel-pricing decision. |
| `calculator.fuelCost.error.ruleUnavailable` | No reviewed fuel price rule is available for this date. |

Translate all labels, fuel guidance, explanations, breakdowns, assumptions, exclusions, warnings, source titles, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve fuel type identifiers, LKR, L, km/L, percentages, dates, and API field identifiers.

## Privacy

The calculator is anonymous. Fuel cost amounts are not persisted by default, and raw amounts must not appear in logs or analytics. A calculation request sends only the calculation date, fuel type, distance, trips per month, efficiency, and the optional custom price.
