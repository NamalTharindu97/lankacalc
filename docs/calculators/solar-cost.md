# Solar Cost Calculator Specification

## Identity

- Identifier: `solar-cost`
- Display name: Solar cost calculator
- Owner: LankaCalc solar cost kernel
- Classification: configurable (assumption rule defaults; user may override)
- Calculation version: `1.0.0`
- Candidate rule version: `solar-assumptions-lk-2026-2026-07-01-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent review of generation, cost, and tariff assumptions
- Source research and link verification: 2026-08-16
- Source dossier: `docs/solar-rule-sources.md`

The candidate implements a rooftop solar estimator that converts a district typical yield and an entered system size into generation, prices a turnkey grid-tied system per kW, models net accounting savings against a retail and an export rate, and reports simple payback and a 20-year saving with degradation. Financing is optional. Approval does not authorize a solar purchasing decision, a technical design, or production publication.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve to a reviewed assumption rule version |
| `systemSizeKw` | string | kW | yes | Decimal `0.5` to `50`, at most 1 decimal |
| `location` | string | label | yes | One of `colombo`, `galle`, `kandy`, `nuvara-eliya`, `kurunegala`, `anuradhapura`, `hambantota`, `jaffna` |
| `averageMonthlyConsumptionKwh` | integer | kWh | yes | `1` to `5000` |
| `systemCostPerKwOverride` | integer | LKR/kW | no | `1` to `2000000`; blank uses the default assumption |
| `retailRatePerKwhOverride` | string | LKR/kWh | no | Decimal `0.01` to `500`, at most 2 decimals; blank uses the default assumption |
| `exportRatePerKwhOverride` | string | LKR/kWh | no | Decimal `0` to `500`, at most 2 decimals; blank uses the default assumption |
| `loanTermYears` | integer | years | no | `1` to `15`; must be paired with a rate |
| `loanAnnualRatePercent` | string | %/yr | no | Decimal `0` to `50`, at most 2 decimals; must be paired with a term |

The `location` selects the district used for the typical yearly generation estimate. Financing is optional and is modeled as a loan for the full system cost; entering only the term or only the rate is rejected.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `locationLabel` | string | label | District label |
| `yieldKwhPerKwPerDay` | string | kWh/kWp/day | District typical daily yield per kWp |
| `annualYieldKwhPerKw` | string | kWh/kWp | `yieldKwhPerKwPerDay × 365` |
| `annualGenerationKwh` | string | kWh | Year-1 generation `systemSizeKw × annualYieldKwhPerKw` |
| `monthlyGenerationKwh` | string | kWh | `annualGenerationKwh ÷ 12` |
| `finalYearGenerationKwh` | string | kWh | Generation in the final year after annual degradation |
| `systemSizeKw` | string | kW | Entered system size |
| `officialSystemCostPerKw` | string | LKR/kW | Default turnkey cost per kW |
| `systemCostPerKw` | string | LKR/kW | Cost per kW actually used |
| `systemCostPerKwSource` | string | label | `official` or `user` |
| `systemCost` | string | LKR | `systemSizeKw × systemCostPerKw` |
| `annualConsumptionKwh` | string | kWh | `averageMonthlyConsumptionKwh × 12` |
| `selfConsumedKwh` | string | kWh | `min(annualGenerationKwh × self-consumption ratio, annualConsumptionKwh)` |
| `exportedKwh` | string | kWh | `annualGenerationKwh − selfConsumedKwh` |
| `importedKwh` | string | kWh | `annualConsumptionKwh − selfConsumedKwh` |
| `officialRetailRatePerKwh` | string | LKR/kWh | Default retail rate |
| `retailRatePerKwh` | string | LKR/kWh | Retail rate actually used |
| `retailRateSource` | string | label | `official` or `user` |
| `officialExportRatePerKwh` | string | LKR/kWh | Default export credit rate |
| `exportRatePerKwh` | string | LKR/kWh | Export rate actually used |
| `exportRateSource` | string | label | `official` or `user` |
| `annualSavingLkr` | string | LKR | Year-1 saving `selfConsumedKwh × retailRatePerKwh + exportedKwh × exportRatePerKwh` |
| `monthlySavingLkr` | string | LKR | `annualSavingLkr ÷ 12` |
| `simplePaybackYears` | string | years | `systemCost ÷ annualSavingLkr`; `n/a` when there is no year-1 saving |
| `twentyYearSavingLkr` | string | LKR | Cumulative saving over the system life with annual degradation |
| `loanAmountLkr` | string | LKR | System cost financed (present when a loan is entered) |
| `loanMonthlyPaymentLkr` | string | LKR | Equal monthly payment over the term |
| `loanTotalPaymentLkr` | string | LKR | `loanMonthlyPaymentLkr × term months` |
| `loanTotalInterestLkr` | string | LKR | `loanTotalPaymentLkr − loanAmountLkr` |
| `monthlyCashFlowLkr` | string | LKR | `monthlySavingLkr − loanMonthlyPaymentLkr` |

Every monetary output is a two-decimal-cent string (rounded to the nearest cent, half up). Generation and payback values are rounded to two decimals, half up, for display. The breakdown lists the location, system size, annual yield, annual/monthly/final-year generation, system cost per kW and total, annual consumption, self-consumed/exported/imported energy, retail and export rates, year-1 saving, monthly saving, simple payback, 20-year saving, and the loan lines when financing is present.

## Formula And Rate Convention

Let `s = systemSizeKw`, `y = location yield (kWh/kWp/day)`, `c = cost per kW` (override if entered, otherwise the default), `r = retail rate`, `x = export rate`, `q = annual consumption`, `p = self-consumption ratio`, and `d = degradation per year`.

```text
annualYield    = y × 365
gen1           = s × annualYield
systemCost     = s × c
selfConsumed1  = min(gen1 × p, q)
exported1      = gen1 − selfConsumed1
imported1      = q − selfConsumed1
saving1        = selfConsumed1 × r + exported1 × x
payback        = systemCost / saving1
finalGen       = gen1 × (1 − d)^(life − 1)
twentyYearSaving = Σ [min(gen1 × (1 − d)^(year−1) × p, q) × r
                    + (gen1 × (1 − d)^(year−1) − min(...)) × x]  for year 1..life
```

The loan uses the standard monthly-annuity formula with `rate = loanAnnualRatePercent / 100 / 12` and `n = loanTermYears × 12`. A zero rate divides the principal by `n`. All intermediate arithmetic runs at high decimal precision; only serialized outputs are rounded.

## Rounding Order

1. Validate inputs; reject non-positive size, out-of-range usage, overrides with too many decimals, an unknown location, and one-sided financing.
2. Compute energy, costs, savings, and payback at full precision.
3. Round each serialized monetary output to the nearest cent (half up) independently; round energy and payback values to two decimals (half up).
4. Round the monthly loan payment to the nearest cent, then compute loan totals from the rounded monthly payment.

## Assumptions And Exclusions

- Generation uses the district typical yield for optimally tilted fixed panels; actual output depends on roof orientation, tilt, shading, and inverter performance.
- Residential self-consumption defaults to 35% of generation, the Sustainable Energy Authority reference for a daytime load profile.
- The model follows net accounting: exported units are credited at the export rate and imported units are billed at the retail rate.
- Panels degrade 0.5% per year over a 20-year horizon.
- Turnkey grid-tied system costs default to LKR 250,000 per kW; quotes vary with panel and inverter brand, roof work, and installer.
- Financing covers the full system cost and is modeled at a flat annual rate with monthly repayments.
- The result is an estimate, not a quote, technical design, or investment recommendation.

Excluded: batteries and hybrid/off-grid equipment, roof modifications, structural work, net metering and net plus settlement, time-of-use tariffs, LECO-specific tariffs, tariff escalation, maintenance, insurance, repairs, and disposal.

## Boundary Cases

- A blank override uses the official default and records the source as `official`.
- An override records the used value and the official default.
- An oversized system caps self-consumption at annual usage and reports zero import.
- A zero export rate prices all exported energy at zero.
- No year-1 saving reports `simplePaybackYears: "n/a"`.
- A location absent from the resolved rule fails closed rather than guessing a yield.
- One-sided financing (term without rate or rate without term) is rejected.
- A 0% loan rate divides the principal evenly over the term.

## Official Sources

- [Sri Lanka Sustainable Energy Authority — solar resource atlas](https://www.energy.gov.lk/)
- [CEB — allowed charges and connection](https://www.ceb.lk/)
- [PUCSL — electricity tariffs and feed-in rates](https://www.pucsl.gov.lk/)
- [rooftopsolar.lk — SEA-concurred rooftop solar calculator](https://www.rooftopsolar.lk/)
- [World Bank — Sri Lanka solar irradiation and PV power potential maps (Global Solar Atlas)](https://datacatalog.worldbank.org/search/dataset/0039358/sri-lanka-solar-irradiation-and-pv-power-potential-maps)

The rule version must attach the district yield table (SEA atlas), the turnkey cost observation, and the governing retail/export tariff gazette as separate source records or revisions, with their effective dates.

## Golden Fixtures

These are candidate calculations, not official worked examples. All use the candidate payload (effective 2026-07-01).

| Input | Expected result |
|---|---|
| `systemSizeKw: "5"`, `location: "colombo"`, `averageMonthlyConsumptionKwh: 450`, no overrides, no loan | `annualGenerationKwh: "7665"`, `monthlyGenerationKwh: "638.75"`, `systemCost: "1250000.00"`, `selfConsumedKwh: "2682.75"`, `exportedKwh: "4982.25"`, `annualSavingLkr: "238381.50"`, `simplePaybackYears: "5.24"`, `twentyYearSavingLkr: "4547819.36"` |
| `systemSizeKw: "15"`, `location: "anuradhapura"`, `averageMonthlyConsumptionKwh: 300`, no overrides, no loan | `annualGenerationKwh: "25732.5"`, `selfConsumedKwh: "3600"`, `exportedKwh: "22132.5"`, `importedKwh: "0"`, `annualSavingLkr: "659715.00"`, `simplePaybackYears: "5.68"` |
| `systemSizeKw: "5"`, `location: "colombo"`, `averageMonthlyConsumptionKwh: 450`, `systemCostPerKwOverride: 300000`, `retailRatePerKwhOverride: "60.00"`, `exportRatePerKwhOverride: "0"`, no loan | `systemCostPerKw: "300000.00"`, `systemCostPerKwSource: "user"`, `retailRatePerKwh: "60.00"`, `exportRatePerKwh: "0.00"`, `annualSavingLkr: "160965.00"`, `simplePaybackYears: "9.32"` |
| `systemSizeKw: "5"`, `location: "colombo"`, `averageMonthlyConsumptionKwh: 450`, `loanTermYears: 5`, `loanAnnualRatePercent: "12"` | `loanAmountLkr: "1250000.00"`, `loanMonthlyPaymentLkr: "27805.56"`, `loanTotalInterestLkr: "418333.60"`, `monthlyCashFlowLkr: "-7940.44"` |

## Candidate Rule Payload

The candidate payload below is what the test suite loads inline and what a reviewed rule version must contain. All values are the effective 2026-07-01 assumptions.

```json
{
  "authority": "sea-solar-atlas-ceb-pucsl-market",
  "effectiveFrom": "2026-07-01",
  "rounding": "nearest-cent",
  "locations": [
    { "key": "colombo", "label": "Colombo", "yieldKwhPerKwPerDay": "4.20" },
    { "key": "galle", "label": "Galle", "yieldKwhPerKwPerDay": "4.20" },
    { "key": "kandy", "label": "Kandy", "yieldKwhPerKwPerDay": "4.10" },
    { "key": "nuvara-eliya", "label": "Nuwara Eliya", "yieldKwhPerKwPerDay": "3.90" },
    { "key": "kurunegala", "label": "Kurunegala", "yieldKwhPerKwPerDay": "4.40" },
    { "key": "anuradhapura", "label": "Anuradhapura", "yieldKwhPerKwPerDay": "4.70" },
    { "key": "hambantota", "label": "Hambantota", "yieldKwhPerKwPerDay": "4.60" },
    { "key": "jaffna", "label": "Jaffna", "yieldKwhPerKwPerDay": "5.20" }
  ],
  "defaultSystemCostPerKw": "250000",
  "defaultSelfConsumptionPercent": "35",
  "defaultRetailRatePerKwh": "48.00",
  "defaultExportRatePerKwh": "22.00",
  "degradationPercentPerYear": "0.5",
  "systemLifeYears": 20
}
```

## Provenance

Every result must include the calculation version, the resolved solar assumption rule version and effective date, attached sources, and the latest successful source verification time. Link verification on `2026-08-16` confirms source availability, not independent regulatory approval. Regulated execution is server-authoritative and must fail if a reviewed applicable rule or required source provenance cannot be resolved.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.solarCost.name` | Solar cost calculator |
| `calculator.solarCost.summary` | Estimate rooftop solar generation, system cost, savings, financing, and payback. |
| `calculator.solarCost.input.asOfDate` | Calculation date |
| `calculator.solarCost.input.systemSizeKw` | System size |
| `calculator.solarCost.input.location` | Location |
| `calculator.solarCost.input.averageMonthlyConsumptionKwh` | Average monthly usage |
| `calculator.solarCost.input.systemCostPerKwOverride` | System cost per kW (optional) |
| `calculator.solarCost.input.retailRatePerKwhOverride` | Retail rate (optional) |
| `calculator.solarCost.input.exportRatePerKwhOverride` | Export rate (optional) |
| `calculator.solarCost.input.loanTermYears` | Loan term (optional) |
| `calculator.solarCost.input.loanAnnualRatePercent` | Loan annual rate (optional) |
| `calculator.solarCost.output.annualGenerationKwh` | Annual generation (year 1) |
| `calculator.solarCost.output.monthlyGenerationKwh` | Monthly generation |
| `calculator.solarCost.output.systemCost` | System cost |
| `calculator.solarCost.output.annualSavingLkr` | Annual saving (year 1) |
| `calculator.solarCost.output.monthlySavingLkr` | Monthly saving |
| `calculator.solarCost.output.simplePaybackYears` | Simple payback |
| `calculator.solarCost.output.twentyYearSavingLkr` | 20-year saving |
| `calculator.solarCost.output.loanMonthlyPaymentLkr` | Loan monthly payment |
| `calculator.solarCost.output.monthlyCashFlowLkr` | Monthly cash flow |
| `calculator.solarCost.assumption.districtYield` | Generation uses the district typical yield for optimally tilted fixed panels. |
| `calculator.solarCost.assumption.selfConsumption` | Residential self-consumption defaults to 35% of generation, the Sustainable Energy Authority reference for a daytime load profile. |
| `calculator.solarCost.assumption.netAccounting` | The model follows net accounting: exported units are credited at the export rate and imported units are billed at the retail rate. |
| `calculator.solarCost.assumption.degradation` | Panels degrade 0.5% per year over a 20-year horizon. |
| `calculator.solarCost.warning.notAQuote` | These are estimates, not quotes or technical designs; confirm sizing and cost with at least two installers. |
| `calculator.solarCost.warning.tariffRevision` | Electricity tariffs are revised by the regulator; verify the current retail and export rates. |
| `calculator.solarCost.warning.scheme` | This models the net accounting scheme; net metering and net plus settle surplus differently. |
| `calculator.solarCost.warning.estimate` | This is an estimate, not a quote, technical design, or investment recommendation. |
| `calculator.solarCost.error.ruleUnavailable` | No reviewed solar assumption rule is available for this date. |

Translate all labels, guidance, explanations, breakdowns, assumptions, exclusions, warnings, source titles, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve location identifiers, kW, kWh, LKR, percentages, dates, and API field identifiers.

## Privacy

The calculator is anonymous. Solar cost amounts are not persisted by default, and raw amounts must not appear in logs or analytics. A calculation request sends only the calculation date, system size, location, monthly usage, the optional overrides, and the optional financing fields.
