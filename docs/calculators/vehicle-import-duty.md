# Vehicle Import Duty Calculator Specification

## Identity

- Identifier: `vehicle-import-duty`
- Display name: Vehicle import duty calculator
- Owner: LankaCalc regulated vehicle calculation kernel
- Classification: regulated
- Calculation version: `1.0.0`
- Candidate rule version: `vehicle-import-excise-nitg-2026-2026-04-01-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent tariff and legal review
- Source research and link verification: 2026-08-16
- Source dossier: `docs/vehicle-import-rule-sources.md`

The candidate implements the Chapter 87 motor-vehicle excise schedule of the National Import Tariff Guide (NITG) 2026 as an import-cost estimator for the three-year new/used classification. Approval does not authorize a customs declaration, tariff interpretation, classification ruling, or production publication.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve to a reviewed standard rule version |
| `vehicleType` | string | label | yes | One of `petrol`, `diesel`, `petrol-hybrid`, `diesel-hybrid`, `petrol-phev`, `diesel-phev`, `electric` |
| `cifValue` | string | LKR | yes | Nonnegative decimal string; max `1000000000000` (1 trillion), 2 decimals |
| `engineCc` | integer | cc | petrol, diesel, hybrids, PHEVs | `1` to `10000`, inclusive; required when `vehicleType` is not `electric` |
| `motorKw` | integer | kW | electric | `1` to `2000`, inclusive; required when `vehicleType` is `electric` |
| `vehicleAge` | string | label | yes | One of `not-more-than-one-year`, `one-to-three-years`, `more-than-three-years` |
| `lcEstablishedOn` | string | calendar date | no | Optional `YYYY-MM-DD`; the letter-of-credit establishment date tested against the S.P.D. surcharge order cutoff |
| `shippedOnBoardOn` | string | calendar date | no | Optional `YYYY-MM-DD`; the Bill of Lading / Airway Bill shipped-on-board date tested against the S.P.D. surcharge order cutoff |

`cifValue` is the cost, insurance, and freight value in Sri Lankan rupees at the entry date; foreign-currency conversion is out of scope and the user must convert to LKR. `engineCc` and `motorKw` are whole numbers only.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `vehicleType` | string | label | Selected vehicle type |
| `scheduleLabel` | string | label | Applied excise schedule label |
| `bandLabel` | string | label | Applied excise band, shown as official inclusive range |
| `bandUnit` | string | unit | `cc` or `kW` |
| `bandValue` | integer | cc or kW | Engine capacity or motor power used for banding |
| `vehicleAge` | string | label | Age band used to select the EV rate |
| `appliedRate` | string | LKR | Applied per-unit, per-band-unit, or per-kW rate |
| `appliedRateUnit` | string | unit | `per unit`, `per cc`, or `per kW` |
| `cif` | string | LKR | Validated CIF value |
| `customsDuty` | string | LKR | CID at the rule rate on the CIF value |
| `surcharge` | string | LKR | S.P.D. surcharge on the customs duty, zero when the LC exemption applies |
| `surchargeExemption` | string | label | `applied`, `not-applied`, or `not-available` (no LC exemption in the rule payload) |
| `surchargeExemptionNote` | string | label | Explains the exemption decision and the order cutoffs used |
| `excise` | string | LKR | Specific excise duty |
| `luxuryTax` | string | LKR | Luxury tax above the vehicle-type threshold |
| `vatBase` | string | LKR | `CIF + 10% of CIF + customs duty + surcharge + excise` |
| `vat` | string | LKR | VAT on the VAT base |
| `sscl` | string | LKR | SSCL on the VAT base |
| `totalPayable` | string | LKR | `CIF + customs duty + surcharge + excise + luxury tax + VAT + SSCL` |

Every monetary output is a whole-rupee string (components rounded nearest rupee, half up). The breakdown lists the CIF value, customs duty, surcharge, excise (with its rate expression), luxury tax, VAT base, VAT, SSCL, and total lines.

## Formula And Rate Convention

Let `v = cifValue`, `r = applied excise rate`, `u = bandValue`, and `q = applicable unit quantity`.

1. Select the schedule by `vehicleType`. Within the schedule, select the first band covering the band value: `min ≤ bandValue ≤ max`, where the final band is open-ended (`max` omitted).
2. The excise rate is `ratePerBandUnit` for engine-capacity bands, `ageRates[vehicleAge]` for electric bands, or `perUnitRate` for a fixed per-vehicle charge. Where a band defines both `perUnitRate` and `ratePerBandUnit` (the "or" rows of the tariff), the charge is the higher of the two:
   ```text
   e = round(max(perUnitRate, ratePerBandUnit × u))       when both are defined
   e = round(ratePerBandUnit × u)                         when only a band-unit rate is defined
   e = round(perUnitRate)                                 when only a per-vehicle charge is defined
   ```
3. `customsDuty d = round(v × cidRate)`.
4. `surcharge s = round(d × surchargeRate)`, unless the S.P.D. LC exemption applies:
   when the payload defines `surchargeExemption`, the surcharge is zero if `lcEstablishedOn` is present, `lcEstablishedOn ≤ lcEstablishedOnOrBefore`, and (`shippedOnBoardOn` is absent or `shippedOnBoardOn ≤ shippedOnBoardOnOrBefore`). An absent LC date leaves the surcharge payable; a missing shipped-on-board date still qualifies and adds a confirmation note.
5. `luxuryTax l = round(max(0, v − luxuryThreshold) × luxuryRate)`.
6. `vatBase = round(v × 1.10 + d + s + e)`. The luxury tax is excluded from the VAT base.
7. `vat = round(vatBase × vatRate)`; `sscl = round(vatBase × ssclRate)`.
8. `totalPayable = v + d + s + e + l + vat + sscl`.

The "or" rows are a tariff shorthand: the official columns list both a per-vehicle and a per-cc/kW amount and the payable is the higher. The rate expression on each result states which leg applied, e.g. `max(1992000 per unit, 2450 per cc × 1000)`.

## Rounding Order

1. Validate inputs; reject non-whole capacity/power, out-of-range CIF, and missing capacity for the selected type.
2. Select the schedule and band; compute the excise at full precision, then round to the nearest rupee.
3. Round customs duty, surcharge, luxury tax, VAT, and SSCL to the nearest rupee each.
4. Compute `totalPayable` from the rounded components.
5. Serialize all monetary outputs as whole-rupee strings.

## Assumptions And Exclusions

- The CIF value is entered in Sri Lankan rupees; foreign-currency conversion is excluded.
- The estimate covers the NITG 2026 three-year classification (vehicles not exceeding three years old) using the age band rates; the excise schedule for vehicles over three years old is treated as identical for engine-capacity rows and covered by the EV age bands.
- The customs import duty (CID) applies at the standard column rate of 30%; the NITG and an April 2026 gazette order set this rate.
- The S.P.D. surcharge is charged at 50% of the customs duty; this is a time-limited levy that may change.
- The S.P.D. surcharge order defines an LC-establishment exemption. When entered, an LC established on or before the order cutoff (and a shipped-on-board date on or before its cutoff) waives the surcharge. The exemption is void if key LC details are amended after establishment.
- VAT is charged at 18% and SSCL at 2.5% on the VAT base defined above; the luxury tax is not part of that base.
- Cess and PAL are excluded for HS heading 8703 motor vehicles, as recorded in the customs preamble.
- The result is an estimate, not a customs declaration, tariff interpretation, or import-cost decision.

Excluded: foreign-exchange conversion and bank charges, port and terminal handling, freight beyond CIF, insurance, agent fees, licenses and permits, emission/road taxes collected separately, vehicles over three years old beyond the modeled age bands, commercial/dual-purpose vehicle lines, and any concession schemes or exemptions other than the modeled S.P.D. LC-establishment exemption.

## Dated Exemption: S.P.D. Surcharge LC Establishment

The current S.P.D. surcharge order (effective 2025-02-01, extended through 2026-12-31) exempts a specified motor vehicle from the 50% surcharge when a letter of credit for it was established on or before 2026-05-15, subject to conditions. The surcharge applies anyway if key LC details (number of vehicles, vehicle identification number, description, technical specifications, or expiry date) were amended, or if the shipped-on-board date on the Bill of Lading or Airway Bill falls after 2026-11-15.

The calculator models this as the payload-level `surchargeExemption` block with `lcEstablishedOnOrBefore`, `shippedOnBoardOnOrBefore`, and an `instrument` label. The block is dated by the rule version that carries it; a new surcharge order is a new rule version, not a payload mutation. The exemption is shown in the result and breakdown, and the amendment condition is surfaced as a warning whenever the exemption is applied. Because the tool cannot observe whether an LC was amended, a zero surcharge from this exemption is an estimate condition, not a clearance guarantee.

## Boundary Cases

- A petrol or hybrid vehicle of 1000 cc uses the higher of the per-unit and per-cc charge; at 1001 cc it moves to the next band.
- A diesel vehicle of 1500 cc uses the `1-1500` band; at 1501 cc it moves to the next band.
- An electric vehicle of 50 kW uses the `1-50` band; at 51 kW it moves to the next band.
- An electric vehicle with a missing or zero motor power is rejected; a non-electric vehicle with a missing engine capacity is rejected.
- A band or schedule that is absent from the payload fails closed rather than using the latest rates without provenance.
- A payload with non-contiguous, non-ascending, or non-1-starting bands is rejected at parse time.
- A luxury value at or below the threshold yields zero luxury tax.
- An LC established on the order cutoff date qualifies for the surcharge exemption; the day after does not.
- A shipped-on-board date after the order cutoff disqualifies the exemption even when the LC qualified.
- A payload without `surchargeExemption` never applies an exemption, even when LC dates are entered.
- A malformed LC or shipped-on-board date is rejected.

## Official Sources

- [Sri Lanka Customs — National Import Tariff Guide (NITG) 2026, Chapter 87](https://www.customs.gov.lk/)
- [Sri Lanka Customs — Preamble to the National Import Tariff Guide (NITG) 2026](https://www.customs.gov.lk/wp-content/uploads/2026/06/Preamble%20intergrated.pdf)
- Gazette Extraordinary No. 2421/41 (luxury tax on motor vehicles)
- Gazette Extraordinary No. 2488/56 (temporary S.P.D. surcharge, 16 May – 15 Aug 2026), extended to 31 December 2026 by the August 2026 surcharge order, which also defines the LC-establishment exemption (LC on or before 2026-05-15; shipped-on-board on or before 2026-11-15)

The rule version must attach the NITG 2026 Chapter 87 schedule, the luxury tax gazette order, the CID rate authority, and the surcharge order as separate source records or revisions.

## Golden Fixtures

These are candidate calculations, not official worked examples. All use the candidate payload.

| Input | Expected result |
|---|---|
| `vehicleType: "petrol"`, `engineCc: 1800`, `cifValue: "3000000"`, `vehicleAge: "not-more-than-one-year"` | `bandLabel: "1601-1800"`, `appliedRate: "6400"`, `excise: "11520000"`, `vatBase: "16170000"`, `vat: "2910600"`, `sscl: "404250"`, `luxuryTax: "0"`, `totalPayable: "19184850"` |
| `vehicleType: "petrol"`, `engineCc: 1000`, `cifValue: "2000000"`, `vehicleAge: "not-more-than-one-year"` | `bandLabel: "1-1000"`, `excise: "2450000"` (per-cc leg wins), `vatBase: "5550000"`, `vat: "999000"`, `sscl: "138750"`, `totalPayable: "6487750"` |
| `vehicleType: "petrol"`, `engineCc: 2000`, `cifValue: "6000000"`, `vehicleAge: "not-more-than-one-year"` | `bandLabel: "1801-2000"`, `excise: "15400000"`, `luxuryTax: "1000000"`, `vat: "4446000"`, `sscl: "617500"`, `totalPayable: "30163500"` |
| `vehicleType: "diesel-hybrid"`, `engineCc: 2000`, `cifValue: "4000000"`, `vehicleAge: "one-to-three-years"` | `bandLabel: "1801-2000"`, `appliedRate: "8350"`, `excise: "16700000"`, `luxuryTax: "0"`, `totalPayable: "27194500"` |
| `vehicleType: "electric"`, `motorKw: 120`, `cifValue: "8000000"`, `vehicleAge: "not-more-than-one-year"` | `bandLabel: "101-200"`, `appliedRate: "36200"` per kW, `excise: "4344000"`, `luxuryTax: "1200000"`, `vat: "3013920"`, `sscl: "418600"`, `totalPayable: "20576520"` |
| `vehicleType: "electric"`, `motorKw: 40`, `cifValue: "3000000"`, `vehicleAge: "one-to-three-years"` | `bandLabel: "1-50"`, `appliedRate: "36200"` per kW, `excise: "1448000"`, `luxuryTax: "0"`, `totalPayable: "7048090"` |
| `vehicleType: "petrol"`, `engineCc: 1800`, `cifValue: "3000000"`, `vehicleAge: "not-more-than-one-year"`, `lcEstablishedOn: "2026-05-15"`, `shippedOnBoardOn: "2026-08-01"` | `surcharge: "0"`, `surchargeExemption: "applied"`, `vatBase: "15720000"`, `vat: "2829600"`, `sscl: "393000"`, `totalPayable: "18642600"` |
| `vehicleType: "petrol"`, `engineCc: 1800`, `cifValue: "3000000"`, `vehicleAge: "not-more-than-one-year"`, `lcEstablishedOn: "2026-05-16"`, `shippedOnBoardOn: "2026-08-01"` | `surcharge: "450000"`, `surchargeExemption: "not-applied"` (LC after the order cutoff) |

## Candidate Rule Payload

The candidate payload below is what the test suite loads inline and what a reviewed rule version must contain. All rates are NITG 2026 Chapter 87 values effective 2026-04-01.

```json
{
  "authority": "srilanka-customs-nitg-2026",
  "effectiveFrom": "2026-04-01",
  "cidRate": "0.30",
  "surchargeRate": "0.50",
  "surchargeExemption": {
    "instrument": "S.P.D. surcharge order 2026-08-15 to 2026-12-31",
    "lcEstablishedOnOrBefore": "2026-05-15",
    "shippedOnBoardOnOrBefore": "2026-11-15"
  },
  "vatRate": "0.18",
  "ssclRate": "0.025",
  "vatBaseCifMultiplier": "1.10",
  "rounding": "nearest-whole-rupee",
  "schedules": [
    {
      "vehicleType": "petrol",
      "label": "Petrol engine",
      "bandUnit": "cc",
      "ageSensitive": false,
      "luxuryThreshold": "5000000",
      "luxuryRate": "1.00",
      "bands": [
        { "min": 1, "max": 1000, "ratePerBandUnit": "2450", "perUnitRate": "1992000" },
        { "min": 1001, "max": 1300, "ratePerBandUnit": "3850" },
        { "min": 1301, "max": 1500, "ratePerBandUnit": "4450" },
        { "min": 1501, "max": 1600, "ratePerBandUnit": "5150" },
        { "min": 1601, "max": 1800, "ratePerBandUnit": "6400" },
        { "min": 1801, "max": 2000, "ratePerBandUnit": "7700" },
        { "min": 2001, "max": 2500, "ratePerBandUnit": "8450" },
        { "min": 2501, "max": 2750, "ratePerBandUnit": "9650" },
        { "min": 2751, "max": 3000, "ratePerBandUnit": "10850" },
        { "min": 3001, "max": 4000, "ratePerBandUnit": "12050" },
        { "min": 4001, "max": null, "ratePerBandUnit": "13300" }
      ]
    },
    {
      "vehicleType": "diesel",
      "label": "Diesel engine",
      "bandUnit": "cc",
      "ageSensitive": false,
      "luxuryThreshold": "5000000",
      "luxuryRate": "1.20",
      "bands": [
        { "min": 1, "max": 1500, "ratePerBandUnit": "5550" },
        { "min": 1501, "max": 1600, "ratePerBandUnit": "6950" },
        { "min": 1601, "max": 1800, "ratePerBandUnit": "8300" },
        { "min": 1801, "max": 2000, "ratePerBandUnit": "9650" },
        { "min": 2001, "max": 2500, "ratePerBandUnit": "9650" },
        { "min": 2501, "max": 2750, "ratePerBandUnit": "10850" },
        { "min": 2751, "max": 3000, "ratePerBandUnit": "12050" },
        { "min": 3001, "max": 4000, "ratePerBandUnit": "13300" },
        { "min": 4001, "max": null, "ratePerBandUnit": "14500" }
      ]
    },
    {
      "vehicleType": "petrol-hybrid",
      "label": "Petrol hybrid",
      "bandUnit": "cc",
      "ageSensitive": false,
      "luxuryThreshold": "5500000",
      "luxuryRate": "0.80",
      "bands": [
        { "min": 1, "max": 1000, "perUnitRate": "1810900" },
        { "min": 1001, "max": 1300, "ratePerBandUnit": "2750" },
        { "min": 1301, "max": 1500, "ratePerBandUnit": "3450" },
        { "min": 1501, "max": 1600, "ratePerBandUnit": "4800" },
        { "min": 1601, "max": 1800, "ratePerBandUnit": "6300" },
        { "min": 1801, "max": 2000, "ratePerBandUnit": "6900" },
        { "min": 2001, "max": 2500, "ratePerBandUnit": "7250" },
        { "min": 2501, "max": 2750, "ratePerBandUnit": "8450" },
        { "min": 2751, "max": 3000, "ratePerBandUnit": "9650" },
        { "min": 3001, "max": 4000, "ratePerBandUnit": "10850" },
        { "min": 4001, "max": null, "ratePerBandUnit": "12050" }
      ]
    },
    {
      "vehicleType": "diesel-hybrid",
      "label": "Diesel hybrid",
      "bandUnit": "cc",
      "ageSensitive": false,
      "luxuryThreshold": "5500000",
      "luxuryRate": "0.90",
      "bands": [
        { "min": 1, "max": 1500, "ratePerBandUnit": "4150" },
        { "min": 1501, "max": 1600, "ratePerBandUnit": "5550" },
        { "min": 1601, "max": 1800, "ratePerBandUnit": "6900" },
        { "min": 1801, "max": 2000, "ratePerBandUnit": "8350" },
        { "min": 2001, "max": 2500, "ratePerBandUnit": "8450" },
        { "min": 2501, "max": 2750, "ratePerBandUnit": "9650" },
        { "min": 2751, "max": 3000, "ratePerBandUnit": "10850" },
        { "min": 3001, "max": 4000, "ratePerBandUnit": "12050" },
        { "min": 4001, "max": null, "ratePerBandUnit": "13300" }
      ]
    },
    {
      "vehicleType": "petrol-phev",
      "label": "Petrol plug-in hybrid",
      "bandUnit": "cc",
      "ageSensitive": false,
      "luxuryThreshold": "5500000",
      "luxuryRate": "0.80",
      "bands": [
        { "min": 1, "max": 1000, "perUnitRate": "1810900" },
        { "min": 1001, "max": 1300, "ratePerBandUnit": "2750" },
        { "min": 1301, "max": 1500, "ratePerBandUnit": "3450" },
        { "min": 1501, "max": 1600, "ratePerBandUnit": "4800" },
        { "min": 1601, "max": 1800, "ratePerBandUnit": "6250" },
        { "min": 1801, "max": 2000, "ratePerBandUnit": "6900" },
        { "min": 2001, "max": 2500, "ratePerBandUnit": "7250" },
        { "min": 2501, "max": 2750, "ratePerBandUnit": "8450" },
        { "min": 2751, "max": 3000, "ratePerBandUnit": "9650" },
        { "min": 3001, "max": 4000, "ratePerBandUnit": "10850" },
        { "min": 4001, "max": null, "ratePerBandUnit": "12050" }
      ]
    },
    {
      "vehicleType": "diesel-phev",
      "label": "Diesel plug-in hybrid",
      "bandUnit": "cc",
      "ageSensitive": false,
      "luxuryThreshold": "5500000",
      "luxuryRate": "0.90",
      "bands": [
        { "min": 1, "max": 1500, "ratePerBandUnit": "4150" },
        { "min": 1501, "max": 1600, "ratePerBandUnit": "5550" },
        { "min": 1601, "max": 1800, "ratePerBandUnit": "6900" },
        { "min": 1801, "max": 2000, "ratePerBandUnit": "8300" },
        { "min": 2001, "max": 2500, "ratePerBandUnit": "8450" },
        { "min": 2501, "max": 2750, "ratePerBandUnit": "9650" },
        { "min": 2751, "max": 3000, "ratePerBandUnit": "10850" },
        { "min": 3001, "max": 4000, "ratePerBandUnit": "12050" },
        { "min": 4001, "max": null, "ratePerBandUnit": "13300" }
      ]
    },
    {
      "vehicleType": "electric",
      "label": "Electric (grid-charged)",
      "bandUnit": "kW",
      "ageSensitive": true,
      "luxuryThreshold": "6000000",
      "luxuryRate": "0.60",
      "bands": [
        {
          "min": 1,
          "max": 50,
          "ageRates": {
            "not-more-than-one-year": "18100",
            "one-to-three-years": "36200",
            "more-than-three-years": "48300"
          }
        },
        {
          "min": 51,
          "max": 100,
          "ageRates": {
            "not-more-than-one-year": "24100",
            "one-to-three-years": "36200",
            "more-than-three-years": "72400"
          }
        },
        {
          "min": 101,
          "max": 200,
          "ageRates": {
            "not-more-than-one-year": "36200",
            "one-to-three-years": "60400",
            "more-than-three-years": "108700"
          }
        },
        {
          "min": 201,
          "max": null,
          "ageRates": {
            "not-more-than-one-year": "96600",
            "one-to-three-years": "132800",
            "more-than-three-years": "144900"
          }
        }
      ]
    }
  ]
}
```

## Provenance

Every result must include the calculation version, resolved vehicle import rule version and effective date, attached regulatory sources, and latest successful source verification time. Link verification on `2026-08-16` confirms source availability and per-row rate reading against the NITG pages, not independent customs or legal approval. Regulated execution is server-authoritative and must fail if a reviewed applicable rule or required source provenance cannot be resolved.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.vehicleImport.name` | Vehicle import duty calculator |
| `calculator.vehicleImport.summary` | Estimate the import cost of a motor vehicle from its type, capacity, CIF value, and age. |
| `calculator.vehicleImport.input.asOfDate` | Import date |
| `calculator.vehicleImport.input.vehicleType` | Vehicle type |
| `calculator.vehicleImport.input.cifValue` | CIF value (LKR) |
| `calculator.vehicleImport.input.engineCc` | Engine capacity |
| `calculator.vehicleImport.input.motorKw` | Motor power |
| `calculator.vehicleImport.input.vehicleAge` | Vehicle age |
| `calculator.vehicleImport.input.lcEstablishedOn` | LC establishment date |
| `calculator.vehicleImport.input.shippedOnBoardOn` | Shipped-on-board date |
| `calculator.vehicleImport.output.customsDuty` | Customs import duty |
| `calculator.vehicleImport.output.surcharge` | Surcharge (S.P.D.) |
| `calculator.vehicleImport.output.surchargeExemption` | Surcharge exemption |
| `calculator.vehicleImport.output.excise` | Excise duty |
| `calculator.vehicleImport.output.luxuryTax` | Luxury tax |
| `calculator.vehicleImport.output.vatBase` | VAT base |
| `calculator.vehicleImport.output.vat` | VAT |
| `calculator.vehicleImport.output.sscl` | SSCL |
| `calculator.vehicleImport.output.totalPayable` | Total payable |
| `calculator.vehicleImport.assumption.cifInLkr` | The CIF value is entered in Sri Lankan rupees; convert foreign currency before calculating. |
| `calculator.vehicleImport.assumption.vatBase` | VAT and SSCL are charged on the CIF value plus 10% of CIF plus customs duty, surcharge, and excise duty; the luxury tax is excluded from that base. |
| `calculator.vehicleImport.warning.estimate` | This candidate estimate still requires independent customs and legal review before production publication. |
| `calculator.vehicleImport.warning.declaration` | The official customs assessment remains authoritative. |
| `calculator.vehicleImport.warning.surcharge` | The 50% surcharge is time-limited and may change; confirm the rate for the entry date. |
| `calculator.vehicleImport.warning.exclusions` | Exchange conversion, port, freight, license, and concession items are excluded. |
| `calculator.vehicleImport.error.capacity` | Enter the engine capacity in cc for this vehicle type. |
| `calculator.vehicleImport.error.power` | Enter the motor power in kW for an electric vehicle. |
| `calculator.vehicleImport.error.ruleUnavailable` | No reviewed vehicle import rule is available for this date. |

Translate all labels, tariff guidance, rate and banding explanations, breakdowns, assumptions, exclusions, warnings, source titles, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve `CID`, `S.P.D.`, `SSCL`, LKR, cc, kW, percentages, dates, HS references, and API field identifiers.

## Privacy

The calculator is anonymous. Vehicle import amounts are not persisted by default, and raw amounts must not appear in logs or analytics. A calculation request sends only the import date, vehicle type, capacity or power, age, and CIF value.
