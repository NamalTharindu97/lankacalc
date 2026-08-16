# Electricity Non-Domestic Bill Calculator Specification

## Identity

- Identifier: `electricity-non-domestic-bill`
- Display name: Electricity non-domestic bill calculator
- Owner: LankaCalc regulated energy calculation kernel
- Classification: regulated
- Calculation version: `1.0.0`
- Candidate rule version: `electricity-non-domestic-standard-2026-05-11-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent tariff/accounting review
- Source research and link verification: 2026-08-16
- Source dossier: `docs/electricity-rule-sources.md`

The candidate implements only the standard CEB non-domestic tariffs effective 11 May 2026 for the documented categories. Approval does not authorize public production publication, a tariff interpretation, or a billing decision.

## Categories

| Key | Label | Structure | Supply |
|---|---|---|---|
| `religious` | Religious & charitable | block | 400/230 V |
| `gp-1` | General purpose GP-1 (Rate 1) | v-dmc | 400/230 V up to 42 kVA |
| `ip-1` | Industrial IP-1 (Rate 1) | v-dmc | 400/230 V up to 42 kVA |
| `h-1` | Hotel H-1 (Rate 1) | v-dmc | 400/230 V up to 42 kVA |
| `gv-1` | Government GV-1 (Rate 1) | v-dmc | 400/230 V up to 42 kVA |
| `gp-2` | General purpose GP-2 (Rate 2) | tou | 400/230 V above 42 kVA |
| `ip-2` | Industrial IP-2 (Rate 2) | tou | 400/230 V above 42 kVA |
| `h-2` | Hotel H-2 (Rate 2) | tou | 400/230 V above 42 kVA |
| `gv-2` | Government GV-2 (Rate 2) | tou | 400/230 V above 42 kVA |
| `gp-3` | General purpose GP-3 (Rate 3) | tou | 11 kV and above |
| `ip-3` | Industrial IP-3 (Rate 3) | tou | 11 kV and above |
| `h-3` | Hotel H-3 (Rate 3) | tou | 11 kV and above |
| `gv-3` | Government GV-3 (Rate 3) | tou | 11 kV and above |
| `street-lighting` | Street lighting | single-rate | — |
| `agriculture-tou` | Agriculture (optional TOU) | tou | — |
| `evcs-1` | EV charging station EVCS-1 | tou | — |
| `evcs-2` | EV charging station EVCS-2 | tou | — |

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve to a reviewed standard rule version |
| `category` | string | key | yes | One of the documented category keys |
| `unitsConsumed` | integer | kWh | volume-differentiated, block, and single-rate only | `0` to `1000000`, inclusive; whole units only |
| `billingDays` | integer | days | block and volume-differentiated only | `15` to `62`, inclusive; default `30` |
| `peakUnits` | integer | kWh | time-of-use only | `0` to `10000000`, inclusive; whole units only |
| `dayUnits` | integer | kWh | time-of-use only | `0` to `10000000`, inclusive; whole units only |
| `offPeakUnits` | integer | kWh | time-of-use only | `0` to `10000000`, inclusive; whole units only |
| `billedDemandKva` | number | kVA | rate 2, rate 3, and EVCS-2 only | `0` to `1000000`, inclusive; up to two decimals |

`unitsConsumed` is the metered consumption for the covered billing period on block, volume-differentiated, and street-lighting tariffs. `billingDays` is the actual length of that period; block and tier limits are prorated from the standard 30-day cycle. Time-of-use categories require the three window values instead of `unitsConsumed`. `billedDemandKva` is accepted only for categories that carry a demand charge and is rejected for all others. The bounds are product safety bounds, not statutory limits.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `category` | string | label | Selected tariff category label |
| `categoryKey` | string | key | Selected tariff category key |
| `structure` | string | — | `block`, `v-dmc`, `tou`, or `single-rate` |
| `tier` | string | label | Selected block category or consumption tier; empty for `tou` and `single-rate` |
| `lines` | array | LKR | Per-line energy workings: label, units, rate, and amount |
| `energyCharge` | string | LKR | Sum of the applied energy charges |
| `fixedCharge` | string | LKR | Fixed monthly charge |
| `demandCharge` | string | LKR | Billed demand times the rate; `0.00` where no demand charge applies |
| `tariffCharge` | string | LKR | `energyCharge + fixedCharge + demandCharge` |
| `sscLRatePercent` | string | percent | Applied SSCL rate |
| `sscLAmount` | string | LKR | SSCL on the tariff charge, rounded to cents |
| `totalPayable` | string | LKR | `tariffCharge + sscLAmount` |

Every monetary output and breakdown value is a fixed two-decimal LKR string. The breakdown lists each applied energy line, then the energy, fixed, demand, tariff, SSCL, and total lines.

## Formula And Rate Convention

Let `C = unitsConsumed`, `D = billingDays`, and `S = standardBillingDays`.

```text
scale = D / S
proratedBoundary(units) = round6(units * scale)
```

### Block structure (religious)

1. Select the category: the first category whose `maxUnits` is `null` or whose `proratedBoundary(maxUnits) >= C`.
2. Within the selected category, each block covers the half-open range `[proratedMin, proratedMax)`. The units charged in a block are `clamp(C - proratedMin, 0, proratedMax - proratedMin)`.
3. `energyCharge` is the exact sum of `blockUnits * energyRatePerKwh`.
4. `fixedCharge` is the fixed charge of the first block whose `proratedMax >= C`.
5. `tariffCharge = energyCharge + fixedCharge`.

### Volume-differentiated structure (Rate 1 categories)

1. Select the tier: `highTier` when `C > proratedBoundary(thresholdUnits)`, else `lowTier`.
2. `energyCharge = C * selectedTier.energyRatePerKwh` over all units consumed.
3. `fixedCharge` is the selected tier's fixed charge.
4. `tariffCharge = energyCharge + fixedCharge`.

### Time-of-use structure (Rate 2, Rate 3, agriculture, EVCS)

1. `energyCharge = peakUnits * peakRatePerKwh + dayUnits * dayRatePerKwh + offPeakUnits * offPeakRatePerKwh`.
2. `demandCharge = billedDemandKva * demandChargePerKva` where the tariff declares a demand rate; otherwise `0`.
3. `fixedCharge` is the monthly fixed charge.
4. `tariffCharge = energyCharge + fixedCharge + demandCharge`.

Time-of-use windows are day `05:30-18:30`, peak `18:30-22:30`, and off-peak `22:30-05:30`.

### Single-rate structure (street lighting)

1. `energyCharge = C * energyRatePerKwh`.
2. `tariffCharge = energyCharge + fixedCharge`.

### All structures

```text
sscLAmount = roundCents(tariffCharge * sscLPercent / 100)
totalPayable = tariffCharge + sscLAmount
```

## Rounding Order

1. Validate inputs; reject non-whole units or days, out-of-range values, and values that do not match the selected category's structure.
2. Prorate block, category, and tier boundaries to six decimal places for exact integer comparisons under standard 30-day scaling.
3. Calculate the energy and demand charges at full precision.
4. Add the fixed and demand charges to obtain the tariff charge.
5. Round the SSCL to the nearest cent using round-half-up, then add it to the tariff charge.
6. Serialize all monetary amounts as fixed two-decimal strings.

## Assumptions And Exclusions

- The bill is a standard CEB non-domestic estimate for the selected supply class and category on the calculation date.
- Block and tier limits are prorated from the entered billing period against the standard 30-day cycle.
- The volume-differentiated rate applies to all units consumed in the month, selected by the consumption tier.
- The demand charge applies to the entered billed maximum demand where the tariff carries a demand rate.
- The fixed monthly charge and the Social Security Contribution Levy (SSCL) are added on top of the energy and demand charges.
- VAT is treated as included in the approved tariff charges.
- The result is an estimate, not a utility bill, tariff interpretation, or billing advice.

Excluded: LECO, domestic and lifeline tariffs, net-metering and rooftop solar programs, concession rates and fuel-adjustment charges, reactive/ancillary and other authorized charges, delayed-payment surcharges, taxes other than the modeled SSCL, and any arrears or credit adjustments.

## Boundary Cases

- The rate depends on the supply class (voltage and contract demand); a misclassified category changes the bill.
- Consumption at a block boundary charges the boundary units in the lower block and moves the fixed charge to the tier containing the consumption at exactly the boundary.
- Consumption exactly at the volume-differentiation threshold uses the low tier.
- Time-of-use categories reject `unitsConsumed`; volume-differentiated and single-rate categories reject the window values.
- A billed demand is rejected for tariffs without a demand charge.
- A billing period outside `15..62` days is rejected.
- An unavailable effective-dated rule fails closed rather than using the latest rates without provenance.

## Official Sources

- [PUCSL approved tariff table (Annex-2 transcription), effective 11 May 2026](https://www.scribd.com/document/1036840384/Tariff-Table-Approved)
- [PUCSL electricity tariff revision effective 11 May 2026](https://www.pucsl.gov.lk/electricity-tariff-revision-2026-may/)
- [CEB current tariffs](https://ceb.lk/rates-and-tariffs/en)

The rule version must attach the PUCSL decision effective 11 May 2026 for the block rates, volume-differentiation thresholds, time-of-use rates and windows, demand charges, and fixed charges, the SSCL rate set under the Social Security Contribution Levy (Amendment) Act, and current operational guidance as separate source records or revisions.

## Golden Fixtures

These are candidate calculations, not official worked examples. All use a 30-day billing period unless stated.

| Input | Expected result |
|---|---|
| `category: "religious"`, `unitsConsumed: 200`, `billingDays: 30` | `category: "Religious & charitable"`, `tier: "above 180"`, `energyCharge: "2824.00"`, `fixedCharge: "2000.00"`, `totalPayable: "4944.60"` |
| `category: "religious"`, `unitsConsumed: 150`, `billingDays: 30` | `tier: "0-180"`, `energyCharge: "1215.00"`, `fixedCharge: "1300.00"`, `totalPayable: "2577.88"` |
| `category: "gp-1"`, `unitsConsumed: 180`, `billingDays: 30` | `tier: "Tier 1 (≤ 180 kWh/month)"`, `energyCharge: "4860.00"`, `fixedCharge: "500.00"`, `totalPayable: "5494.00"` |
| `category: "gp-1"`, `unitsConsumed: 181`, `billingDays: 30` | `tier: "Tier 2 (> 180 kWh/month)"`, `energyCharge: "6516.00"`, `fixedCharge: "1600.00"`, `totalPayable: "8318.90"` |
| `category: "gv-1"`, `unitsConsumed: 200`, `billingDays: 30` | `tier: "Tier 2 (> 180 kWh/month)"`, `energyCharge: "9000.00"`, `fixedCharge: "1900.00"`, `totalPayable: "11172.50"` |
| `category: "gp-2"`, `dayUnits: 800`, `peakUnits: 400`, `offPeakUnits: 300`, `billedDemandKva: 50` | `structure: "tou"`, `energyCharge: "81700.00"`, `demandCharge: "90000.00"`, `fixedCharge: "6000.00"`, `totalPayable: "182142.50"` |
| `category: "ip-3"`, `dayUnits: 1000`, `peakUnits: 500`, `offPeakUnits: 500`, `billedDemandKva: 100` | `structure: "tou"`, `energyCharge: "44750.00"`, `demandCharge: "160000.00"`, `fixedCharge: "6000.00"`, `totalPayable: "216018.75"` |
| `category: "street-lighting"`, `unitsConsumed: 500` | `structure: "single-rate"`, `energyCharge: "30000.00"`, `fixedCharge: "0.00"`, `totalPayable: "30750.00"` |
| `category: "agriculture-tou"`, `dayUnits: 1000`, `peakUnits: 200`, `offPeakUnits: 500` | `structure: "tou"`, `energyCharge: "23600.00"`, `fixedCharge: "750.00"`, `demandCharge: "0.00"`, `totalPayable: "24958.75"` |
| `category: "evcs-1"`, `dayUnits: 100`, `peakUnits: 50`, `offPeakUnits: 200` | `structure: "tou"`, `energyCharge: "11200.00"`, `fixedCharge: "1600.00"`, `totalPayable: "13120.00"` |
| `category: "evcs-2"`, `dayUnits: 100`, `peakUnits: 50`, `offPeakUnits: 200`, `billedDemandKva: 30` | `structure: "tou"`, `energyCharge: "11200.00"`, `demandCharge: "45000.00"`, `fixedCharge: "5000.00"`, `totalPayable: "62730.00"` |

## Provenance

Every result must include the calculation version, resolved electricity rule version and effective date, attached regulatory sources, and latest successful source verification time. Link verification on `2026-08-16` confirms source availability, not independent tariff/accounting approval. Regulated execution is server-authoritative and must fail if a reviewed applicable rule or required source provenance cannot be resolved.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.electricityNonDomestic.name` | Electricity non-domestic bill calculator |
| `calculator.electricityNonDomestic.summary` | Estimate a CEB non-domestic electricity bill from consumption, time-of-use, and demand values. |
| `calculator.electricityNonDomestic.input.asOfDate` | Bill date |
| `calculator.electricityNonDomestic.input.category` | Tariff category |
| `calculator.electricityNonDomestic.input.unitsConsumed` | Units consumed |
| `calculator.electricityNonDomestic.input.billingDays` | Billing period |
| `calculator.electricityNonDomestic.input.peakUnits` | Peak units |
| `calculator.electricityNonDomestic.input.dayUnits` | Day units |
| `calculator.electricityNonDomestic.input.offPeakUnits` | Off-peak units |
| `calculator.electricityNonDomestic.input.billedDemandKva` | Billed maximum demand |
| `calculator.electricityNonDomestic.output.category` | Category |
| `calculator.electricityNonDomestic.output.structure` | Tariff structure |
| `calculator.electricityNonDomestic.output.tier` | Tier |
| `calculator.electricityNonDomestic.output.energyCharge` | Energy charge |
| `calculator.electricityNonDomestic.output.fixedCharge` | Fixed charge |
| `calculator.electricityNonDomestic.output.demandCharge` | Demand charge |
| `calculator.electricityNonDomestic.output.tariffCharge` | Tariff charge |
| `calculator.electricityNonDomestic.output.sscLRatePercent` | SSCL rate |
| `calculator.electricityNonDomestic.output.sscLAmount` | SSCL charge |
| `calculator.electricityNonDomestic.output.totalPayable` | Total payable |
| `calculator.electricityNonDomestic.assumption.pucslTariff` | The bill uses the PUCSL-approved CEB non-domestic tariff for the calculation date. |
| `calculator.electricityNonDomestic.assumption.proration` | Block and tier limits are prorated from the billing period against the standard 30-day cycle. |
| `calculator.electricityNonDomestic.assumption.vdmc` | The volume-differentiated rate applies to all units consumed in the month, selected by the consumption tier. |
| `calculator.electricityNonDomestic.assumption.touWindows` | Time-of-use windows are day 05:30-18:30, peak 18:30-22:30, and off-peak 22:30-05:30. |
| `calculator.electricityNonDomestic.assumption.demand` | The demand charge applies to the billed maximum demand in kVA. |
| `calculator.electricityNonDomestic.assumption.sscl` | The fixed monthly charge and the SSCL are added on top of the energy and demand charges. |
| `calculator.electricityNonDomestic.assumption.vatIncluded` | VAT is treated as included in the approved tariff charges. |
| `calculator.electricityNonDomestic.warning.estimate` | Estimate only; the official utility bill remains authoritative. |
| `calculator.electricityNonDomestic.warning.classification` | The applicable rate depends on the supply class (voltage and contract demand); misclassification changes the bill. |
| `calculator.electricityNonDomestic.warning.exclusions` | Fuel adjustment, ancillary, and other authorized charges are excluded. |
| `calculator.electricityNonDomestic.error.ruleUnavailable` | No reviewed electricity rule is available for this date. |

Translate all labels, tariff guidance, proration and rounding explanations, breakdowns, assumptions, exclusions, warnings, source titles, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `CEB`, `PUCSL`, `SSCL`, LKR, kWh, kVA, percentages, dates, time-of-use window labels, and API field identifiers.

## Privacy

The calculator is anonymous. Consumption and bill results are not persisted by default, and raw amounts must not appear in logs or analytics. A calculation request sends only the date, tariff category, and the values required for that category's structure.
