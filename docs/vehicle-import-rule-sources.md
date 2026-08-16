# Vehicle Import Rule Source Dossier

## Purpose

This dossier records the primary sources and candidate rule findings for the Stage 5 vehicle import duty calculator (`vehicle-import-duty`). The candidate findings are sufficient to implement code and automated fixtures within the narrow documented scope. They are not approval for public production publication: published rules still require attached source revisions, passing fixtures, and independent customs/legal review of legal scope, formula, and rounding.

Research retrieved and link-verified: 2026-08-16.

## Status

| Rule area | Research status | Publication status |
|---|---|---|
| NITG 2026 Chapter 87 motor-vehicle excise rates from 2026-04-01 | Every rate row verified by per-cell extraction from the official PDF | Approved implementation candidate; blocked pending independent customs/legal review |
| CID rate, surcharge, VAT base, and luxury tax stack | Formula verified against the official Preamble and luxury tax gazette | Approved implementation candidate; blocked pending independent review |
| Foreign-currency CIF conversion | No official conversion point defined for an estimator | Out of scope; CIF is entered in LKR |

## Sources

Issuing authority: Sri Lanka Customs.

### Official Sources

- [Sri Lanka Customs — NITG main index](https://www.customs.gov.lk/) publishes the National Import Tariff Guide volumes and the integrated Preamble.
- [Preamble to the NITG](https://www.customs.gov.lk/wp-content/uploads/2026/06/Preamble%20intergrated.pdf) publishes the import-duty valuation formula: customs import duty (`d`) on the CIF value, a 50% surcharge (`s`) on the duty, specific excise (`e`) per unit, VAT and SSCL on `CIF + 10% of CIF + d + s + e` plus other excluded components, and the ruling that when the tariff lists both a per-unit and a per-cc/kW amount the higher applies.
- NITG 2026 Chapter 87 motor-vehicle pages (volumes published on the NITG index) publish the seven Chapter 87 excise schedules: petrol engine, diesel engine, petrol hybrid, diesel hybrid, petrol plug-in hybrid, diesel plug-in hybrid, and electric grid-charged vehicles, each with `minLuxuryTax` thresholds and rates, and the three-year EV age bands.
- [Gazette Extraordinary No. 2421/41](https://www.documents.gov.lk/) publishes the luxury tax on motor vehicles and its per-vehicle-type thresholds.
- [Gazette Extraordinary No. 2488/56](https://www.documents.gov.lk/) publishes the temporary S.P.D. surcharge order (16 May – 15 Aug 2026).
- [Gazette Extraordinary No. 2478/03](https://www.documents.gov.lk/) publishes the April 2026 CID rate order used for the standard 30% column.

### Extraction Method

The Chapter 87 pages carry multi-column table layout that plain-text extraction reorders. Every rate used in the candidate payload was therefore verified by a pdfplumber script that reads each cell by word position on the page and reconstructs the per-subheading row: HS code, vehicle description, luxury column, three-year age column (and one-to-three-year EV column), and the minimum luxury threshold. Each candidate rate was traced back to a specific subheading row and page number before it was encoded.

## Candidate Rate Matrix (NITG 2026, effective 2026-04-01)

Units are LKR per cc for engine rows, LKR per kW for electric rows, or LKR per vehicle for the "or" rows. Where both a per-unit and a per-cc/kW rate are shown, the payable is the higher.

### Petrol engine — luxury threshold LKR 5,000,000 at 100%

| Band | LKR/cc | LKR/unit |
|---|---:|---:|
| not exceeding 1000 cc | 2,450 | 1,992,000 |
| 1001 – 1300 cc | 3,850 | — |
| 1301 – 1500 cc | 4,450 | — |
| 1501 – 1600 cc | 5,150 | — |
| 1601 – 1800 cc | 6,400 | — |
| 1801 – 2000 cc | 7,700 | — |
| 2001 – 2500 cc | 8,450 | — |
| 2501 – 2750 cc | 9,650 | — |
| 2751 – 3000 cc | 10,850 | — |
| 3001 – 4000 cc | 12,050 | — |
| exceeding 4000 cc | 13,300 | — |

### Diesel engine — luxury threshold LKR 5,000,000 at 120%

| Band | LKR/cc |
|---|---:|
| not exceeding 1500 cc | 5,550 |
| 1501 – 1600 cc | 6,950 |
| 1601 – 1800 cc | 8,300 |
| 1801 – 2000 cc | 9,650 |
| 2001 – 2500 cc | 9,650 |
| 2501 – 2750 cc | 10,850 |
| 2751 – 3000 cc | 12,050 |
| 3001 – 4000 cc | 13,300 |
| exceeding 4000 cc | 14,500 |

### Petrol hybrid — luxury threshold LKR 5,500,000 at 80%

| Band | LKR/cc | LKR/unit |
|---|---:|---:|
| not exceeding 1000 cc | — | 1,810,900 |
| 1001 – 1300 cc | 2,750 | — |
| 1301 – 1500 cc | 3,450 | — |
| 1501 – 1600 cc | 4,800 | — |
| 1601 – 1800 cc | 6,300 | — |
| 1801 – 2000 cc | 6,900 | — |
| 2001 – 2500 cc | 7,250 | — |
| 2501 – 2750 cc | 8,450 | — |
| 2751 – 3000 cc | 9,650 | — |
| 3001 – 4000 cc | 10,850 | — |
| exceeding 4000 cc | 12,050 | — |

### Diesel hybrid — luxury threshold LKR 5,500,000 at 90%

| Band | LKR/cc |
|---|---:|
| not exceeding 1500 cc | 4,150 |
| 1501 – 1600 cc | 5,550 |
| 1601 – 1800 cc | 6,900 |
| 1801 – 2000 cc | 8,350 |
| 2001 – 2500 cc | 8,450 |
| 2501 – 2750 cc | 9,650 |
| 2751 – 3000 cc | 10,850 |
| 3001 – 4000 cc | 12,050 |
| exceeding 4000 cc | 13,300 |

### Petrol plug-in hybrid — luxury threshold LKR 5,500,000 at 80%

| Band | LKR/cc | LKR/unit |
|---|---:|---:|
| not exceeding 1000 cc | — | 1,810,900 |
| 1001 – 1300 cc | 2,750 | — |
| 1301 – 1500 cc | 3,450 | — |
| 1501 – 1600 cc | 4,800 | — |
| 1601 – 1800 cc | 6,250 | — |
| 1801 – 2000 cc | 6,900 | — |
| 2001 – 2500 cc | 7,250 | — |
| 2501 – 2750 cc | 8,450 | — |
| 2751 – 3000 cc | 9,650 | — |
| 3001 – 4000 cc | 10,850 | — |
| exceeding 4000 cc | 12,050 | — |

### Diesel plug-in hybrid — luxury threshold LKR 5,500,000 at 90%

| Band | LKR/cc |
|---|---:|
| not exceeding 1500 cc | 4,150 |
| 1501 – 1600 cc | 5,550 |
| 1601 – 1800 cc | 6,900 |
| 1801 – 2000 cc | 8,300 |
| 2001 – 2500 cc | 8,450 |
| 2501 – 2750 cc | 9,650 |
| 2751 – 3000 cc | 10,850 |
| 3001 – 4000 cc | 12,050 |
| exceeding 4000 cc | 13,300 |

### Electric grid-charged — luxury threshold LKR 6,000,000 at 60%

| Band | ≤ 1 year | 1 – 3 years | > 3 years |
|---|---:|---:|---:|
| not exceeding 50 kW | 18,100 | 36,200 | 48,300 |
| 50 – 100 kW | 24,100 | 36,200 | 72,400 |
| 100 – 200 kW | 36,200 | 60,400 | 108,700 |
| exceeding 200 kW | 96,600 | 132,800 | 144,900 |

### Verified per-row anomalies

- Petrol `8703.22.60/70/80` (1001–1500 cc) uses 3,850/4,450 per cc for both the three-year and over-three-year columns; the over-three-year rows are not higher for these bands.
- Petrol PHEV `8703.60.53` (1601–1800 cc) is 6,250 per cc, genuinely lower than the petrol hybrid 6,300 row for the same band.
- Diesel PHEV `8703.70.58` (1801–2000 cc) is 8,300 per cc, lower than the diesel hybrid 8,350 row for the same band.
- Petrol ≤ 1000 cc applies the higher of `1,992,000 per unit` and `2,450 per cc`; hybrid/PHEV ≤ 1000 cc apply `1,810,900 per unit` only.
- Engine-capacity rows are identical across the three-year boundary for every non-electric schedule; the age-sensitive rates exist only for the electric kW bands.

## Formula

Let `v` = CIF in LKR, `u` = band value (cc or kW), and `r` = applied specific excise rate.

```text
d = round(v * cidRate)                          customs import duty
s = round(d * surchargeRate)                    surcharge, currently 50%
e = round(max(perUnitRate, r * u))              specific excise, higher of the "or" legs
l = round(max(0, v - luxuryThreshold) * luxuryRate)   luxury tax
vatBase = round(v * 1.10 + d + s + e)           luxury tax excluded
vat = round(vatBase * vatRate)                  currently 18%
sscl = round(vatBase * ssclRate)                currently 2.5%
total = v + d + s + e + l + vat + sscl
```

Cess and PAL (`c` and `p` in the Preamble) are `Ex` for HS heading 8703 and are excluded from the VAT base. The 10% uplift of the CIF value is part of the VAT base per the Preamble.

## Scope Boundary

The candidate covers passenger motor vehicles classifiable in the motor-car, station-wagon, SUV, and similar subheadings of HS heading 8703 whose excise line matches one of the seven schedules:

- petrol, diesel, and the two hybrid/PHEV powertrains by engine capacity, and grid-charged electric vehicles by motor power;
- the three-year classification: vehicles not more than one year old, one to three years old, and over three years old, using the EV age bands;
- the standard duty column at the current 30% CID rate, the current 50% surcharge, 18% VAT, and 2.5% SSCL.

Excluded:

- foreign-currency conversion, bank charges, port and terminal handling, freight beyond CIF, insurance, and agent fees;
- vehicles over three years old where a distinct legal rate applies beyond the modeled age bands;
- commercial vehicles, dual-purpose goods vehicles, motorcycles, tractors, and other chapters of the NITG;
- concession schemes, exemptions, and special end-use regimes;
- Cess and PAL lines outside the 8703 exclusion;
- emission and road levies collected under other instruments; and
- gazetted amendments published after the last-verified source revision.

## Candidate Fixtures

These are independently calculated candidates, not official worked examples. They require independent review before publication.

| Input | Expected result | Purpose |
|---|---|---|
| petrol, 1800 cc, CIF 3,000,000, ≤ 1 yr | excise 11,520,000; VAT base 16,170,000; VAT 2,910,600; SSCL 404,250; total 19,184,850 | Mid-band petrol with no luxury tax |
| petrol, 1000 cc, CIF 2,000,000, ≤ 1 yr | excise 2,450,000 (per-cc leg wins); total 6,487,750 | Per-cc/per-unit "or" row |
| petrol, 2000 cc, CIF 6,000,000, ≤ 1 yr | excise 15,400,000; luxury 1,000,000; total 30,163,500 | Luxury tax and 5.0 Mn threshold |
| diesel hybrid, 2000 cc, CIF 4,000,000, 1–3 yr | excise 16,700,000 (8,350); total 27,194,500 | Diesel hybrid band and age-insensitive engine row |
| electric, 120 kW, CIF 8,000,000, ≤ 1 yr | excise 4,344,000 (36,200/kW); luxury 1,200,000; total 20,576,520 | EV kW band and 6.0 Mn threshold |
| electric, 40 kW, CIF 3,000,000, 1–3 yr | excise 1,448,000 (36,200/kW); total 7,048,090 | EV age-band rate |

## Source Registration

Register the NITG volume pages for Chapter 87, the integrated Preamble, and each gazette as separate source records or revisions. The rule version should attach the Chapter 87 schedule pages, the Preamble, the luxury tax gazette (2421/41), the CID rate order, and the surcharge order.

Preserve publication date, retrieval date, verification date, final URL after redirects, and a bounded SHA-256 content hash. The effective date belongs to the rule version and is 2026-04-01 for the NITG 2026 schedule; the surcharge and CID rates are subject to gazetted change and must be re-verified for any later entry date.

## Verification Policy

- Only HTTPS pages controlled by Sri Lanka Customs or the official government gazette qualify as official publication sources.
- The runtime source-host allowlist is changed through code review; operators cannot make the checker request arbitrary hosts.
- A rule cannot publish until at least one attached official source has a successful current verification event.
- Link checks record HTTP status, redirects, validators, and a bounded SHA-256 content hash. A changed hash requires a new source revision and verification before subsequent publication.
- A rate row encoded from a PDF page must carry the page and row reference; changed PDF content requires re-extraction and re-verification.

## Review Gates

Before any vehicle import result is publicly published in production:

1. An independent customs/legal reviewer must confirm the tariff schedule, formula, effective date, scope, and rounding for every supported rule.
2. The reviewer must confirm the luxury tax thresholds and rates per vehicle type against the gazette order.
3. The reviewer must confirm the CID and surcharge rates for the target entry window.
4. Fixtures must cover at least one band transition per schedule and one luxury threshold crossing per vehicle type.
5. Browser/domain, API, draft-rule, and published-rule results must match for every fixture.
6. UI and API provenance must identify all sources needed to reproduce the selected result.

Implementation and internal testing may proceed against the approved candidate specification before this independent review. The rule lifecycle must remain draft or otherwise unavailable to public production traffic until every gate above is recorded.
