# Electricity Domestic Tariff Rule Source Dossier

## Purpose

This dossier records the primary sources and candidate rule findings for the Stage 5 electricity bill calculator (`electricity-bill`). The candidate findings are sufficient to implement code and automated fixtures within the narrow documented scope. They are not approval for public production publication: published rules still require attached source revisions, passing fixtures, and independent tariff/accounting review of price setting authority, block rates, fixed charges, and tax treatment.

Research retrieved and link-verified: 2026-08-16.

## Status

| Rule area | Research status | Publication status |
|---|---|---|
| Domestic tariff effective 11 May 2026 | PUCSL decision, effective date, no-change-under-180-units, and 18% above-180 revision verified against PUCSL and media announcements; block rates and fixed charges transcribed as candidates | Approved implementation candidate; blocked pending independent review and transcription verification against the PUCSL tariff table |
| Billing-period proration | PUCSL and LECO official calculators both state block limits are adjusted to the billing period | Implemented and fixture-tested |
| Social Security Contribution Levy (SSCL) | 2.5% applied on the tariff charge, corroborated by independent calculators | Approved implementation candidate; blocked pending independent review |
| Provider coverage | Candidate covers the CEB standard domestic tariff only; LECO domestic and all non-domestic tariffs are excluded | Out of scope for the candidate |

## Sources

Issuing authorities: Public Utilities Commission of Sri Lanka (PUCSL), the Ceylon Electricity Board (CEB), and the Ministry of Finance of Sri Lanka for the SSCL rate.

### Official Sources

- [PUCSL — Electricity Tariff Revision, 2026 May](https://www.pucsl.gov.lk/electricity-tariff-revision-2026-may/) publishes the tariff decision and the tariff table (published 2026-05-09, effective 2026-05-11).
- [PUCSL — Electricity Bill Calculator (Domestic Users)](https://www.pucsl.gov.lk/calculator/) states the approved tariff is effective from 11 May 2026 and that tariff block limits are adjusted according to the selected billing period before calculating the bill.
- [PUCSL — End User Tariff Decisions](https://www.pucsl.gov.lk/end-user-tariff-decisions/) hosts the tariff decision archive and the 2026 May tariff schedule.
- [PUCSL — Extraordinary Tariff Review, April 2026](https://www.pucsl.gov.lk/extraordinary-tariff-review-april-2026/) and the [PUCSL press release of 2026-05-09](https://www.pucsl.gov.lk/press-rel-2026-05-09/) are the related decision documents for the 2026 May revision.
- [CEB — Rates and tariffs](https://ceb.lk/rates-and-tariffs/en) publishes the CEB domestic tariff schedule and official billing guidance.
- [LECO — Monthly Bill Calculator](https://www.leco.lk/revisedbillCal_e.php) confirms the 11 May 2026 effective date and that units per block are prorated by the billing period; LECO is a separate licensee and outside the candidate provider scope.
- Sri Lankan national media (Adaderana, NewsCenter) report the 2026-05-09 PUCSL decision, its 11 May 2026 effective date, and that no revision applies under 180 units while an 18% increase applies above 180 units.

### Extraction Method

The 2026 May tariff decision, its effective date, the no-change-under-180-units boundary, and the 18% above-180 revision were cross-checked against the PUCSL tariff revision page and at least two independent media reports of the same decision. The candidate block rates and fixed charges were transcribed for the approved candidate specification from the reviewed tariff structure and are recorded below; the tariff table itself is published as an image on the PUCSL page, so each value still requires transcription verification against that table before publication. The billing-period proration method is confirmed by both official calculators (PUCSL and LECO), which state block limits are adjusted to the billing period.

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

## Limitations

- The tariff table is published as an image on the PUCSL page; the candidate block rates and fixed charges require transcription verification against that table and the tariff decision before any public publication.
- Tariffs change by PUCSL decision; the rule version must carry an explicit effective date and the calculation must resolve the applicable version by date, failing closed when no reviewed version exists.
- The candidate covers the CEB standard domestic tariff only. LECO, time-of-use, industrial/commercial, net-metering and rooftop solar programs, concession and lifeline rates, fuel adjustment charges, delayed-payment surcharges, and taxes other than the modeled SSCL are excluded.
- This dossier records the decision and its public announcement; it does not independently verify the cost-of-service study, revenue-deficit projections, or the regulatory basis for each charge.
- Sources were verified on 2026-08-16 against the 2026-05-11 revision. Later revisions require a new rule version and dossier update.
