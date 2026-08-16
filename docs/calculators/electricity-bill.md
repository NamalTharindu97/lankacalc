# Electricity Bill Calculator Specification

## Identity

- Identifier: `electricity-bill`
- Display name: Electricity bill calculator
- Owner: LankaCalc regulated energy calculation kernel
- Classification: regulated
- Calculation version: `1.0.0`
- Candidate rule version: `electricity-domestic-standard-2026-05-11-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent tariff/accounting review
- Source research and link verification: 2026-08-16
- Source dossier: `docs/electricity-rule-sources.md`

The candidate implements only the standard domestic tariff for consumption metered under the CEB domestic category. Approval does not authorize public production publication, a tariff interpretation, or a billing decision.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve to a reviewed standard rule version |
| `unitsConsumed` | integer | kWh | yes | `0` to `100000`, inclusive; whole units only |
| `billingDays` | integer | days | yes | `15` to `62`, inclusive; default `30` |

`unitsConsumed` is the metered consumption for the covered billing period. `billingDays` is the actual length of that period; tariff block limits are prorated from the standard 30-day cycle. The `billingDays` bounds are product safety bounds, not statutory limits. Finite JSON numbers and numeric strings accepted by the shared parser are valid only when they resolve to whole units or days within the bounds.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `unitsConsumed` | integer | kWh | Validated consumption |
| `billingDays` | integer | days | Validated billing period |
| `category` | string | label | Selected domestic category label (`0-60`, `61-180`, or `above 180` for the standard tariff) |
| `energyCharge` | string | LKR | Sum of the per-block energy charges |
| `fixedCharge` | string | LKR | Fixed charge of the block tier containing the billed consumption |
| `tariffCharge` | string | LKR | `energyCharge + fixedCharge` |
| `sscLRatePercent` | string | percent | Applied SSCL rate |
| `sscLAmount` | string | LKR | SSCL on the tariff charge, rounded to cents |
| `totalPayable` | string | LKR | `tariffCharge + sscLAmount` |

Every monetary output and breakdown value is a fixed two-decimal LKR string. The breakdown lists each applied block with its units, rate, and amount, then the energy, fixed, tariff, SSCL, and total lines.

## Formula And Rate Convention

Let `C = unitsConsumed`, `D = billingDays`, and `S = standardBillingDays`.

```text
scale = D / S
proratedBoundary(units) = round6(units * scale)
```

1. Select the category: the first category whose `maxUnits` is `null` or whose `proratedBoundary(maxUnits) >= C`.
2. Within the selected category, each block covers the half-open range `[proratedMin, proratedMax)`. The units charged in a block are `clamp(C - proratedMin, 0, proratedMax - proratedMin)`.
3. `energyCharge` is the exact sum of `blockUnits * energyRatePerKwh`.
4. `fixedCharge` is the fixed charge of the first block whose `proratedMax >= C`.
5. `tariffCharge = energyCharge + fixedCharge`.
6. `sscLAmount = roundCents(tariffCharge * sscLPercent / 100)`.
7. `totalPayable = tariffCharge + sscLAmount`.

Block limits are exclusive-maximum boundaries in the payload (`minUnits: 30, maxUnits: 60` covers the 31st through 60th unit at the standard 30-day cycle) and are displayed as official inclusive ranges in breakdown labels. Because both boundaries in a block scale by the same factor, proration preserves contiguity.

## Rounding Order

1. Validate inputs; reject non-whole units or days and out-of-range values.
2. Prorate block and category boundaries to six decimal places for exact integer comparisons under standard 30-day scaling.
3. Calculate the energy charge at full precision.
4. Add the fixed charge to obtain the tariff charge.
5. Round the SSCL to the nearest cent using round-half-up, then add it to the tariff charge.
6. Serialize all monetary amounts as fixed two-decimal strings.

## Assumptions And Exclusions

- The bill is a standard CEB domestic, single-phase consumption estimate for the covered period.
- Tariff block limits are prorated from the entered billing period against the standard 30-day cycle, matching the official calculator's stated adjustment of block limits.
- The fixed charge is the tier of the block containing the billed consumption.
- The Social Security Contribution Levy (SSCL) is charged at the rule rate on top of the tariff charge.
- VAT is treated as included in the approved tariff charges.
- The result is an estimate, not a utility bill, tariff interpretation, or billing advice.

Excluded: LECO, time-of-use and industrial/commercial tariffs, net-metering and rooftop solar programs, concession rates and lifeline adjustments, fuel adjustment charges, delayed-payment surcharges, taxes other than the modeled SSCL, and any arrears or credit adjustments.

## Boundary Cases

- Zero consumption still incurs the first block's fixed charge and the SSCL on it.
- Consumption at a block boundary charges the boundary units in the lower block and moves the fixed charge to the tier containing the consumption at exactly the boundary.
- Consumption above the last finite category selects the open-ended category.
- Prorated boundaries are rounded to six decimals so fractional scaling cannot select the wrong category or block.
- A billing period outside `15..62` days is rejected.
- An unavailable effective-dated rule fails closed rather than using the latest rates without provenance.

## Official Sources

- [PUCSL approved domestic tariff calculator](https://www.pucsl.gov.lk/electricity/electricity-tariff-calculator/)
- [CEB current tariffs](https://ceb.lk/rates-and-tariffs/en)
- PUCSL decision for the approved tariff effective 11 May 2026

The rule version must attach the PUCSL decision effective 11 May 2026 for the domestic block rates and fixed charges, the SSCL rate set under the Social Security Contribution Levy (Amendment) Act, and current operational guidance as separate source records or revisions.

## Golden Fixtures

These are candidate calculations, not official worked examples. All use a 30-day billing period unless stated.

| Input | Expected result |
|---|---|
| `unitsConsumed: 0`, `billingDays: 30` | `category: "0-60"`, `energyCharge: "0.00"`, `fixedCharge: "80.00"`, `tariffCharge: "80.00"`, `sscLAmount: "2.00"`, `totalPayable: "82.00"` |
| `unitsConsumed: 40`, `billingDays: 30` | `category: "0-60"`, `energyCharge: "240.00"`, `fixedCharge: "210.00"`, `tariffCharge: "450.00"`, `sscLAmount: "11.25"`, `totalPayable: "461.25"` |
| `unitsConsumed: 60`, `billingDays: 30` | `category: "0-60"`, `energyCharge: "420.00"`, `fixedCharge: "210.00"`, `tariffCharge: "630.00"`, `totalPayable: "645.75"` |
| `unitsConsumed: 61`, `billingDays: 30` | `category: "61-180"`, `energyCharge: "860.00"`, `fixedCharge: "400.00"`, `tariffCharge: "1260.00"`, `totalPayable: "1291.50"` |
| `unitsConsumed: 100`, `billingDays: 30` | `category: "61-180"`, `energyCharge: "1720.00"`, `fixedCharge: "1000.00"`, `tariffCharge: "2720.00"`, `sscLAmount: "68.00"`, `totalPayable: "2788.00"` |
| `unitsConsumed: 210`, `billingDays: 30` | `category: "above 180"`, `energyCharge: "8850.00"`, `fixedCharge: "2500.00"`, `tariffCharge: "11350.00"`, `sscLAmount: "283.75"`, `totalPayable: "11633.75"` |
| `unitsConsumed: 62`, `billingDays: 31` | `category: "0-60"`, `energyCharge: "434.00"`, `fixedCharge: "210.00"`, `tariffCharge: "644.00"`, `sscLAmount: "16.10"`, `totalPayable: "660.10"` |

## Provenance

Every result must include the calculation version, resolved electricity rule version and effective date, attached regulatory sources, and latest successful source verification time. Link verification on `2026-08-16` confirms source availability, not independent tariff/accounting approval. Regulated execution is server-authoritative and must fail if a reviewed applicable rule or required source provenance cannot be resolved.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.electricity.name` | Electricity bill calculator |
| `calculator.electricity.summary` | Estimate a domestic CEB electricity bill from units consumed and the billing period. |
| `calculator.electricity.input.asOfDate` | Bill date |
| `calculator.electricity.input.unitsConsumed` | Units consumed |
| `calculator.electricity.input.billingDays` | Billing period |
| `calculator.electricity.output.category` | Category |
| `calculator.electricity.output.energyCharge` | Energy charge |
| `calculator.electricity.output.fixedCharge` | Fixed charge |
| `calculator.electricity.output.tariffCharge` | Tariff charge |
| `calculator.electricity.output.sscLRatePercent` | SSCL rate |
| `calculator.electricity.output.sscLAmount` | SSCL charge |
| `calculator.electricity.output.totalPayable` | Total payable |
| `calculator.electricity.assumption.proration` | Block limits are prorated from the billing period against the standard 30-day cycle. |
| `calculator.electricity.assumption.fixedTier` | The fixed charge is the tier of the block containing the billed consumption. |
| `calculator.electricity.assumption.sscl` | The SSCL is added on top of the tariff charge. |
| `calculator.electricity.assumption.vatIncluded` | VAT is treated as included in the approved tariff charges. |
| `calculator.electricity.warning.estimate` | This candidate estimate still requires independent tariff and accounting review before production publication. |
| `calculator.electricity.warning.officialBill` | The official utility bill remains authoritative. |
| `calculator.electricity.warning.exclusions` | Provider, time-of-use, net-metering, concession, and fuel-adjustment charges are excluded. |
| `calculator.electricity.error.precision` | Enter whole units and a billing period between 15 and 62 days. |
| `calculator.electricity.error.ruleUnavailable` | No reviewed electricity rule is available for this date. |

Translate all labels, tariff guidance, proration and rounding explanations, breakdowns, assumptions, exclusions, warnings, source titles, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `CEB`, `SSCL`, LKR, kWh, percentages, dates, and API field identifiers.

## Privacy

The calculator is anonymous. Consumption and bill results are not persisted by default, and raw amounts must not appear in logs or analytics. A calculation request sends only the date, units consumed, and billing period.
