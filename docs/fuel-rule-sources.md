# Fuel Pump Price Rule Source Dossier

## Purpose

This dossier records the primary sources and candidate rule findings for the Stage 5 fuel cost calculator (`fuel-cost`). The candidate findings are sufficient to implement code and automated fixtures within the narrow documented scope. They are not approval for public production publication: published rules still require attached source revisions, passing fixtures, and independent review of price setting authority and coverage.

Research retrieved and link-verified: 2026-08-16.

## Status

| Rule area | Research status | Publication status |
|---|---|---|
| Ceypetco retail pump prices from 2026-06-30 | Four main fuel prices verified against Ceypetco's official historical price table | Approved implementation candidate; blocked pending independent review |
| Coverage and station brand variance | Official price list governs listed brands; unbranded retail outlets can price at market | Out of scope for the official default; the calculator allows a custom price override |

## Sources

Issuing authorities: Ceylon Petroleum Corporation (Ceypetco) and the Ministry of Power & Energy of Sri Lanka.

### Official Sources

- [Ceylon Petroleum Corporation - historical fuel prices](https://ceypetco.gov.lk/historical-prices/) records dated retail prices for LP 92, LP 95, Lanka Auto Diesel (LAD), and Lanka Super Diesel (LSD).
- [Ceylon Petroleum Corporation - machine-readable historical-price page record](https://ceypetco.gov.lk/wp-json/wp/v2/pages/3085) exposes the same table through the authority's WordPress API. The record was modified on 2026-06-30 and its first row is dated `30.06.2026`.
- [Ceylon Petroleum Storage Terminals (CPC) — official website](https://ceylonpetroleum.com/) publishes the fuel product portfolio (Petrol 92, Petrol 95 Euro 4, Auto Diesel, Super Diesel 4 Star Euro 4).
- [Ministry of Power & Energy — Sri Lanka](https://powerenergy.gov.lk/) issues retail fuel price revisions and the fuel pricing formula under the Ministry of Finance gazette orders.
- [Sri Lanka Government Gazette](https://www.documents.gov.lk/) publishes the gazette orders that revise regulated retail fuel prices.
- Sri Lankan national media (Daily FT, Adaderana, EconomyNext, NewsWire) report each Ceypetco price revision announcement with the effective date and the four headline pump prices.

### Extraction Method

The `30.06.2026` row was read directly from Ceypetco's historical-price table and cross-checked against the identical table returned by its WordPress API. The table headings map `LP 92`, `LP 95`, `LAD`, and `LSD` to the calculator's four supported products. Each value is recorded as a per-litre retail pump price in Sri Lankan rupees at two decimal places.

## Candidate Price Matrix (Ceypetco retail, effective 2026-06-30)

| Fuel | Retail price (LKR/litre) |
|---|---:|
| Lanka Petrol 92 Octane | 414.00 |
| Lanka Petrol 95 Octane Euro 4 | 495.00 |
| Lanka Auto Diesel | 382.00 |
| Lanka Super Diesel 4 Star Euro 4 | 478.00 |

Notes:

- Prices are per litre at the retail pump, rounded to the nearest cent (LKR 0.01).
- The four products above are the regulated headline products. Other products (including kerosene and furnace oil) are outside the calculator scope.
- Ceypetco-branded retail stations sell at the announced price; unbranded and non-Ceypetco retail outlets may price at market and are excluded from the official default. The calculator's custom price override covers those cases.

## Limitations

- Fuel prices change on short notice via gazette orders; the rule version must carry an explicit effective date and the calculation must resolve the applicable version by date.
- This dossier records the prices and their public announcement; it does not independently verify the cost-plus pricing formula, refinery economics, or the stock coverage of each fuel.
- Prices were verified on 2026-08-16 against Ceypetco's `30.06.2026` historical-price row. Later revisions require a new rule version.
