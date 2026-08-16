# Electricity Tariff Rule Source Dossier

## Purpose

This dossier records the primary sources and candidate rule findings for the Stage 5 electricity bill calculators (`electricity-bill`), covering the CEB standard domestic tariff and the CEB non-domestic tariff categories. The candidate findings are sufficient to implement code and automated fixtures within the narrow documented scope. They are not approval for public production publication: published rules still require attached source revisions, passing fixtures, and independent tariff/accounting review of price setting authority, block rates, fixed charges, time-of-use periods, demand charges, and tax treatment.

Research retrieved and link-verified: 2026-08-16.

## Status

| Rule area | Research status | Publication status |
|---|---|---|
| Domestic tariff effective 11 May 2026 | PUCSL decision, effective date, no-change-under-180-units, and 18% above-180 revision verified against PUCSL and media announcements; block rates and fixed charges transcribed as candidates | Approved implementation candidate; blocked pending independent review and transcription verification against the PUCSL tariff table |
| Non-domestic tariffs effective 11 May 2026 | Category structure, 18% application scope, and per-category rates transcribed from the Wikipedia transcription of the PUCSL tariff table and corroborated against the April 2026 base and media announcements; the official PUCSL tariff table is published as an image, so every value requires transcription verification | Candidate only; blocked pending transcription verification against the PUCSL tariff table and independent review |
| Billing-period proration | PUCSL and LECO official calculators both state block limits are adjusted to the billing period | Implemented and fixture-tested |
| Social Security Contribution Levy (SSCL) | 2.5% applied on the tariff charge, corroborated by independent calculators | Approved implementation candidate; blocked pending independent review |
| Provider coverage | Candidate covers the CEB standard domestic and CEB non-domestic tariffs only; LECO domestic and all LECO non-domestic tariffs, pre-paid LECO tariffs, and EDL-owned EV charging tariffs are excluded | Out of scope for the candidate |

## Sources

Issuing authorities: Public Utilities Commission of Sri Lanka (PUCSL), the Ceylon Electricity Board (CEB), and the Ministry of Finance of Sri Lanka for the SSCL rate.

### Official Sources

- [PUCSL — Electricity Tariff Revision, 2026 May](https://www.pucsl.gov.lk/electricity-tariff-revision-2026-may/) publishes the tariff decision and the tariff table (published 2026-05-09, effective 2026-05-11). The tariff table is published as an image; the candidate matrices below are transcriptions.
- [PUCSL — Electricity Bill Calculator (Domestic Users)](https://www.pucsl.gov.lk/calculator/) states the approved tariff is effective from 11 May 2026 and that tariff block limits are adjusted according to the selected billing period before calculating the bill.
- [PUCSL — End User Tariff Decisions](https://www.pucsl.gov.lk/end-user-tariff-decisions/) hosts the tariff decision archive and the 2026 May tariff schedule.
- [PUCSL — Extraordinary Tariff Review, April 2026](https://www.pucsl.gov.lk/extraordinary-tariff-review-april-2026/) and the [PUCSL press release of 2026-05-09](https://www.pucsl.gov.lk/press-rel-2026-05-09/) are the related decision documents for the 2026 May revision.
- [PUCSL — Electricity Tariff Revision, 2026 Q2](https://www.pucsl.gov.lk/electricity-tariff-revision-2026-q2/) publishes the 2026-04-01 tariff decision that set the base non-domestic rates before the May extraordinary review.
- [CEB — Rates and tariffs](https://ceb.lk/rates-and-tariffs/en) publishes the CEB domestic and non-domestic tariff schedules and official billing guidance.
- [CEB Care — Bill Calculator](https://cebcare.ceb.lk/Incognito/BillCalculator) lists the official CEB tariff categories used for billing (Domestic, Domestic TOU, Industrial, General, Government, Hotel, Religious, Agriculture (71), and the Rate 2/3 bulk categories).

### Secondary Sources (transcription and corroboration)

- [Wikipedia — Electricity sector in Sri Lanka, "End-user power tariffs"](https://en.wikipedia.org/wiki/Electricity_sector_in_Sri_Lanka) carries a text transcription of the PUCSL tariff table effective 11 May 2026. This is the only accessible text rendering of the full table; every value is treated as a candidate pending verification against the PUCSL image.
- [guruwaraya.lk — Electricity Tariff Revision Sri Lanka April 2026](https://www.guruwaraya.lk/2026/04/electricity-tariff-revision-sri-lanka.html) transcribes the full 2026-04-01 tariff table in text, including the April base values used below for historical comparison.
- [Adaderana — PUCSL approves 18% electricity tariff increase for consumers exceeding 180 units](https://adaderana.lk/news/122285), [ONLANKA — Sri Lanka electricity tariffs increased by 18%](https://www.onlanka.com/news/sri-lanka-electricity-tariffs-increased-by-18-for-high-usage-consumers.html), and [Newswire — Revised electricity tariffs effective from Monday](https://www.newswire.lk/2026/05/10/revised-electricity-tariffs-effective-from-monday-government-subsidy-until-september/) corroborate the 18% application scope: GP-2/GP-3, all government, large-scale industry, hotel high-consumption, religious above 180 units, and domestic above 180 units; GP-1 below 180 units, SMEs (I/H-1), and standard hotel/religious consumption are unchanged.
- [LECO — Monthly Bill Calculator](https://www.leco.lk/revisedbillCal_e.php) confirms the 11 May 2026 effective date and that units per block are prorated by the billing period; LECO is a separate licensee and outside the candidate provider scope.

### Extraction Method

The 2026 May tariff decision, its effective date, and the 18% application scope were cross-checked against the PUCSL tariff revision page and at least two independent media reports of the same decision. The candidate block rates, fixed charges, time-of-use rates, and demand charges were transcribed from the Wikipedia text rendering of the PUCSL table and compared against the guruwaraya transcription of the April 2026 base to identify which categories were revised on 11 May 2026. The official tariff table itself is published as an image on the PUCSL page, so every value still requires transcription verification against that table before publication. The billing-period proration method is confirmed by both official calculators (PUCSL and LECO), which state block limits are adjusted to the billing period.

## Candidate Tariff Matrix (CEB standard domestic, effective 2026-05-11)

Block limits are exclusive-maximum boundaries in the rule payload (`minUnits: 30, maxUnits: 60` covers the 31st through 60th unit) and are shown below as the official inclusive ranges.

### Category 0-60 units (`maxUnits: 60`)

| Inclusive block | Rate (LKR/kWh) | Fixed charge (LKR) |
|---|---|---:|---:|
| 0-30 | 5.00 | 80.00 |
| 31-60 | 9.00 | 210.00 |

### Category 61-180 units (`maxUnits: 180`)

| Inclusive block | Rate (LKR/kWh) | Fixed charge (LKR) |
|---|---|---:|---:|
| 0-60 | 14.00 | 0.00 |
| 61-90 | 20.00 | 400.00 |
| 91-120 | 28.00 | 1000.00 |
| 121-180 | 44.00 | 1500.00 |

### Category above 180 units (open ended)

| Inclusive block | Rate (LKR/kWh) | Fixed charge (LKR) |
|---|---|---:|---:|
| 0-180 | 32.50 | 0.00 |
| above 180 | 100.00 | 2500.00 |

SSCL: 2.5% applied on the tariff charge (energy charge plus fixed charge), rounded to the nearest cent (LKR 0.01, round half up).

Notes:

- The fixed charge is the tier of the block containing the billed consumption; the 0-30 block's 80.00 LKR fixed charge applies even at zero consumption.
- A consumption that spans a category boundary bills its low units in the lower block and moves the fixed charge to the tier containing the billed consumption.
- The 2026 May revision leaves tariffs unchanged for consumption up to 180 units and applies an 18% increase above 180 units; the candidate matrix reflects that structure for the domestic category.
- VAT is treated as included in the approved tariff charges; no separate VAT line is modeled.

## Candidate Non-Domestic Tariff Matrix (CEB, effective 2026-05-11)

The non-domestic categories divide into low-voltage two-tier or block tariffs (Rate 1), low-voltage time-of-use with a maximum-demand charge (Rate 2), and high-voltage time-of-use (Rate 3). Supply classes: Rate 1 = supply at 400/230 V with contract demand up to 42 kVA; Rate 2 = supply at 400/230 V with contract demand above 42 kVA; Rate 3 = supply at 11 kV and above. `VDMC` = volume differentiated monthly consumption, the two-tier boundary within Rate 1. Time-of-use periods: Day 05:30-18:30, Peak 18:30-22:30, Off-peak 22:30-05:30.

All values below are candidates transcribed from the Wikipedia rendering of the PUCSL table and must be verified against the official PUCSL tariff table image before publication.

### Rate 1 — two-tier (VDMC) tariffs (400/230 V, contract demand up to 42 kVA)

| Category | Tier boundary | Energy rate (LKR/kWh) | Fixed charge (LKR/month) |
|---|---|---|---:|
| GP-1-1 | monthly consumption up to 180 kWh | 27.00 | 500.00 |
| GP-1-2 | monthly consumption above 180 kWh | 36.00 | 1600.00 |
| GV-1-1 | monthly consumption up to 180 kWh | 34.50 | 600.00 |
| GV-1-2 | monthly consumption above 180 kWh | 45.00 | 1900.00 |
| IP/H-1-1 | monthly consumption up to 300 kWh | 9.00 | 300.00 |
| IP/H-1-2 | monthly consumption above 300 kWh | 18.00 | 800.00 |

### Rate 1 — block tariff (Religious and Charitable, R-1)

| Inclusive block | Rate (LKR/kWh) | Fixed charge (LKR) |
|---|---:|---:|
| 0-30 | 4.50 | 75.00 |
| 31-90 | 4.50 | 200.00 |
| 91-120 | 8.00 | 350.00 |
| 121-180 | 19.00 | 1300.00 |
| 0-180 (category >180) | 11.80 | 0.00 |
| above 180 | 35.00 | 2000.00 |

Note: the May 2026 table introduces an 11.80 LKR/kWh block for the first 180 units of consumption that falls in the above-180 category (the same structure the domestic tariff uses with its 32.50 LKR/kWh 0-180 block).

### Rate 2 — time-of-use with maximum-demand charge (400/230 V, contract demand above 42 kVA)

| Category | Day (LKR/kWh) | Peak (LKR/kWh) | Off-peak (LKR/kWh) | Fixed charge (LKR/month) | Max. demand charge (LKR/kVA) |
|---|---:|---:|---:|---:|---:|
| GP-2 | 51.00 | 78.00 | 40.00 | 6000.00 | 1800.00 |
| GV-2 | 54.00 | 78.00 | 40.00 | 6000.00 | 1800.00 |
| IP/H-2 | 19.00 | 39.00 | 16.50 | 6000.00 | 1650.00 |
| EVCS-2 | 15.00 | 70.00 | 31.00 | 1500.00 | 5000.00 |

### Rate 3 — time-of-use (11 kV and above)

| Category | Day (LKR/kWh) | Peak (LKR/kWh) | Off-peak (LKR/kWh) | Fixed charge (LKR/month) |
|---|---:|---:|---:|---:|
| GP-3 | 49.00 | 77.00 | 39.00 | 1700.00 |
| GV-3 | 53.00 | 77.00 | 39.00 | 1700.00 |
| IP/H-3 | 18.00 | 38.00 | 15.50 | 1600.00 |

Note: the Wikipedia rendering shows no maximum-demand charge column for Rate 3 categories in the May 2026 table; the April 2026 base carried demand charges for Rate 3 (e.g. 1450.00 LKR/kVA for GP-3), so this structural change requires verification against the official table.

### Other categories

| Category | Day (LKR/kWh) | Peak (LKR/kWh) | Off-peak (LKR/kWh) | Fixed charge (LKR/month) |
|---|---:|---:|---:|---:|
| Street lighting (SL) | 60.00 | - | - | 0.00 |
| Agriculture (AG, up to 42 kVA) | 14.00 | 28.00 | 8.00 | 750.00 |
| EVCS-1 (up to 42 kVA) | 15.00 | 70.00 | 31.00 | 1600.00 |
| EDL DC fast charging | 87.00 | 111.00 | 53.00 | 0.00 |
| EDL AC level 2 charging | 70.00 | 90.00 | 40.00 | 0.00 |

SSCL: 2.5% applied on the tariff charge, rounded to the nearest cent (LKR 0.01, round half up). VAT is treated as included in the approved tariff charges.

### April 2026 base (for historical versioning)

The 2026-04-01 decision set the base for the above categories. On 11 May 2026 an 18% increase was applied, with PUCSL rounding (values are not strict 1.18 multiplication), to: GP-2/GP-3, all government (GV-1/2/3), large-scale industry (IP/H-2/3), hotel high-consumption, religious above 180 units, and domestic above 180 units. Categories unchanged on 11 May: GP-1, GV-1, IP/H-1, standard hotel and religious consumption, and agriculture. April base values for the revised categories (from the guruwaraya transcription of the Q2 table):

| Category | April base | May 2026 value |
|---|---|---|
| GP-2 day/peak/off-peak | 43.00 / 66.00 / 34.00 | 51.00 / 78.00 / 40.00 |
| GV-1-1 / GV-1-2 | 29.00 / 38.00 | 34.50 / 45.00 |
| IP/H-2 day/peak/off-peak | 16.00 / 33.00 / 14.00 | 19.00 / 39.00 / 16.50 |
| Religious >180 block | 30.00 / fixed 1700.00 | 35.00 / fixed 2000.00 (plus new 11.80 block) |
| Street lighting | 50.00 | 60.00 |

## Modeling Implications

Implementing the non-domestic categories requires extending the current block-only engine:

- A tariff-category and supply-class selector input (religious, general purpose, government, industrial, hotel, street lighting, agriculture; Rate 1 / 2 / 3).
- Rate 1 two-tier selection by monthly consumption (VDMC) for GP-1, GV-1, IP-1, H-1, plus the religious block tariff.
- Time-of-use inputs (day, peak, and off-peak kWh) for Rate 2/3, agriculture, and EVCS categories, with the fixed charge and, for Rate 2, the maximum-demand charge (LKR per kVA of billed demand).
- SSCL at 2.5% on the tariff charge, and VAT-inclusive treatment.
- Effective-dated rule versioning resolving the April 2026 base and the 11 May 2026 revision by `asOfDate`, failing closed when no reviewed version exists.

The following are excluded from the candidate: LECO tariffs (including LECO pre-paid), the EDL-owned EV charging tariffs, domestic and industrial time-of-use option tariffs, net-metering and rooftop-solar programs, fuel-adjustment charges, delayed-payment surcharges, and taxes other than the modeled SSCL.

## Limitations

- The official PUCSL tariff table is published as an image; the candidate block rates, fixed charges, time-of-use rates, and demand charges require transcription verification against that table and the tariff decision before any public publication. Discrepancies already observed between transcriptions (EVCS-1 off-peak 15.00 vs 31.00; EVCS-2 fixed/demand column order; Rate 3 demand charges present in April but absent in the May rendering) must be resolved against the official table.
- Tariffs change by PUCSL decision; the rule version must carry an explicit effective date and the calculation must resolve the applicable version by date, failing closed when no reviewed version exists.
- The candidate covers the CEB standard domestic and non-domestic tariffs only. LECO, time-of-use domestic/industrial options, net-metering and rooftop solar programs, concession and lifeline rates, fuel-adjustment charges, delayed-payment surcharges, and taxes other than the modeled SSCL are excluded.
- This dossier records the decisions and their public announcements; it does not independently verify the cost-of-service study, revenue-deficit projections, or the regulatory basis for each charge.
- Sources were verified on 2026-08-16 against the 2026-05-11 revision. Later revisions require a new rule version and dossier update.
