# Solar Assumption Rule Source Dossier

## Purpose

This dossier records the primary sources and candidate rule findings for the Stage 5 solar cost calculator (`solar-cost`). The candidate findings are sufficient to implement code and automated fixtures within the narrow documented scope. They are not approval for public production publication: published rules still require attached source revisions, passing fixtures, and independent review of the generation, cost, and tariff assumptions.

Research retrieved and link-verified: 2026-08-16.

## Status

| Rule area | Research status | Publication status |
|---|---|---|
| District typical solar yields | Range 3.9–5.2 kWh/kWp/day (Nuwara Eliya to Jaffna) cross-checked against the SEA solar resource atlas and the SEA-concurred rooftop solar calculator | Approved implementation candidate; blocked pending independent review |
| Turnkey grid-tied system cost | LKR 195k–600k per kW across installer price lists; LKR 250,000/kW used as the conservative mid-range default | Approved implementation candidate; blocked pending independent review |
| Retail and export tariff assumptions | Average residential retail near LKR 48/kWh; net accounting export credit LKR 22/kWh (PUCSL gazette) | Approved implementation candidate; blocked pending independent review |
| Self-consumption and degradation | 35% residential self-consumption (SEA daytime load profile reference); 0.5%/year panel degradation (mid-range Tier-1 warranty) | Approved implementation candidate; blocked pending independent review |

## Sources

Issuing authorities and data owners: Sri Lanka Sustainable Energy Authority (SEA), Ceylon Electricity Board (CEB), Public Utilities Commission of Sri Lanka (PUCSL), and the market of grid-tied rooftop installers.

### Official Sources

- [Sri Lanka Sustainable Energy Authority](https://www.energy.gov.lk/) publishes the national solar resource data used for district generation estimates.
- [rooftopsolar.lk — Rooftop Solar PV Calculator](https://www.rooftopsolar.lk/CAL/) is developed in consultation with the SEA and maps district and divisional-secretariat yields for rooftop PV viability.
- [CEB — electricity tariffs and allowed charges](https://www.ceb.lk/) publishes the retail block tariff, the net metering/accounting procedures, and connection charges.
- [PUCSL — Public Utilities Commission of Sri Lanka](https://www.pucsl.gov.lk/) gazettes the retail electricity tariff and the rooftop solar buy-back (feed-in/export) rates.
- [World Bank data catalog — Sri Lanka solar irradiation and PV power potential maps (Global Solar Atlas)](https://datacatalog.worldbank.org/search/dataset/0039358/sri-lanka-solar-irradiation-and-pv-power-potential-maps) provides the underlying irradiation and PVOUT layers.
- Market price lists (MySolar, Hayleys Solar, Dinapala, and comparable installers) provide turnkey grid-tied system prices per kWp for residential sizes.

### Extraction Method

The 2026-07-01 candidate payload was assembled from the sources above:

- District yields are the SEA-atlas daily yield per kWp for representative districts, covering the wet zone (Colombo, Galle), hill country (Kandy, Nuwara Eliya), intermediate zone (Kurunegala), and dry zone (Anuradhapura, Hambantota, Jaffna).
- The default turnkey cost of LKR 250,000 per kWp sits between the low-end mass-market price lists and the premium installer ranges; a user override is always available because quotes vary with brand, roof work, and installer.
- The default retail rate (LKR 48/kWh) is a representative average residential unit cost, and the default export credit (LKR 22/kWh) follows the PUCSL net-accounting buy-back figure.
- The 35% self-consumption ratio is the SEA reference for a residential daytime load profile; the 0.5% annual degradation is the mid-range warranty figure across major Tier-1 module manufacturers.

## Candidate Assumption Matrix (effective 2026-07-01)

| District | Key | Typical yield (kWh/kWp/day) |
|---|---|---|
| Colombo | `colombo` | 4.20 |
| Galle | `galle` | 4.20 |
| Kandy | `kandy` | 4.10 |
| Nuwara Eliya | `nuvara-eliya` | 3.90 |
| Kurunegala | `kurunegala` | 4.40 |
| Anuradhapura | `anuradhapura` | 4.70 |
| Hambantota | `hambantota` | 4.60 |
| Jaffna | `jaffna` | 5.20 |

| Parameter | Default | Basis |
|---|---|---|
| `defaultSystemCostPerKw` | LKR 250,000 | Market turnkey grid-tied range for residential sizes |
| `defaultSelfConsumptionPercent` | 35% | SEA residential daytime load profile reference |
| `defaultRetailRatePerKwh` | LKR 48.00 | Representative average residential unit cost |
| `defaultExportRatePerKwh` | LKR 22.00 | PUCSL net-accounting buy-back credit |
| `degradationPercentPerYear` | 0.5% | Mid-range Tier-1 module warranty figure |
| `systemLifeYears` | 20 | Typical rooftop PV design horizon |

Notes:

- Yields are for optimally tilted fixed panels; orientation, tilt, shading, and inverter performance reduce real output.
- The model covers net accounting only. Net metering banks surplus with no cash credit and net plus pays a pure feed-in tariff; both settle differently and are outside this rule.
- Tariff assumptions are effective-dated and revised by the regulator; later gazettes require a new rule version.

## Limitations

- District yields are representative, not site measurements; a professional site assessment is required before purchase.
- The default cost is a mid-range market observation, not a quote or a regulated price; actual quotes vary widely by panel and inverter brand, roof work, and installer.
- This dossier records the assumptions and their public basis; it does not independently verify SEA atlas quality, installer price lists, or the regulatory tariff gazette for the exact effective date.
- Assumptions were verified on 2026-08-16 against the 2026-07-01 payload. Later tariff or price revisions require a new rule version.
