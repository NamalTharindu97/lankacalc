# VAT Liability Calculator Specification

## Identity

- Identifier: `vat-liability`
- Display name: VAT liability and registration check
- Owner: LankaCalc regulated business and tax calculation kernel
- Classification: regulated
- Calculation version: `1.0.0-candidate`
- Candidate rule version: `vat-liability-lk-2026-2024-01-01-candidate`

## Approval And Review

- Status: Approved candidate specification
- Implementation use: approved for implementation and automated fixture testing within this scope
- Production publication: blocked pending independent formula/accounting review
- Source research and link verification: 2026-08-16
- Source dossier: `docs/business-and-tax-product-spec.md`

Approval as an implementation candidate does not authorize a public production result. The rule must remain unpublished until an independent reviewer confirms the rates, taxable-period selection, registration thresholds, input-credit subtraction, rounding, effective dates, and scope.

## Inputs

| Field | Type | Unit | Required | Bounds and validation |
|---|---|---|---|---|
| `asOfDate` | string | calendar date | yes | Valid `YYYY-MM-DD`; must resolve to the rule effective from `2024-01-01` |
| `supplierCategory` | enum | — | yes | `goods-services`, `financial-services`, `importer-exporter`, or `digital-service` |
| `taxablePeriod` | enum | — | yes | `monthly` or `quarterly` |
| `periodEndDate` | string | calendar date | yes | Last day of a month; for quarterly periods the last day of March, June, September, or December |
| `taxableSuppliesAmount` | integer | LKR | for liability categories | `0` to `10,000,000,000`; whole rupees; rejected for `digital-service` |
| `inputTaxCreditAmount` | integer | LKR | for liability categories | `0` to `10,000,000,000`; whole rupees; rejected for `digital-service` |
| `rolling12MonthTurnover` | integer | LKR | no | `0` to `10,000,000,000`; whole rupees; used for the registration-threshold check |

`taxableSuppliesAmount` is the value of taxable supplies for the period excluding VAT. `inputTaxCreditAmount` is the VAT paid on creditable purchases in the period. The upper bounds are product safety bounds, not statutory thresholds. A non-resident digital service provider receives a registration check only: supplies and input credit must be left blank.

## Outputs

| Field | JSON type | Unit | Meaning |
|---|---|---|---|
| `supplierCategory` / `supplierCategoryLabel` | string | — | Selected category and display label |
| `taxablePeriod` | string | — | `monthly` or `quarterly` |
| `periodStartDate` / `periodEndDate` | string | calendar date | Taxable period covered by the estimate |
| `ratePercent` | string | percent | Rate selected by the period start date; `n/a` for a registration check |
| `rateEffectiveFrom` | string | date | Start of the rate entry that applied |
| `taxableSuppliesAmount` | string | LKR | Value of taxable supplies (`0` for a registration check) |
| `outputVat` | string | LKR | `taxableSuppliesAmount × rate` |
| `inputTaxCredit` | string | LKR | VAT on creditable purchases |
| `netVat` | string | LKR | `outputVat − inputTaxCredit` |
| `vatPayable` | string | LKR | `max(netVat, 0)` rounded to the nearest rupee |
| `excessCredit` | string | LKR | `max(−netVat, 0)` rounded to the nearest rupee |
| `registrationStatus` | string | — | `mandatory`, `required`, `not-required`, or `indeterminate` |
| `registrationReason` | string | — | Plain-language explanation of the registration test |

The breakdown presents the supplier type, period, rate, supplies, output VAT, input credit, net VAT, payable, excess credit, and registration conclusion. All LKR values are decimal strings.

## Formula And Rate Convention

Let `S = taxableSuppliesAmount`, `C = inputTaxCreditAmount`, and `r` the rate selected by the taxable period start date. Then:

- `outputVat = S × r`
- `netVat = outputVat − C`
- `vatPayable = roundToNearestRupee(max(netVat, 0))`
- `excessCredit = roundToNearestRupee(max(−netVat, 0))`

### Rates

| Category | Rate schedule |
|---|---|
| `goods-services`, `importer-exporter` | Standard rate `18%` for taxable periods commencing on or after `2024-01-01` |
| `financial-services` | `18%` from `2022-01-01`; `20.5%` for taxable periods commencing on or after `2026-07-01` |
| `digital-service` | No liability; registration check only |

The applicable rate is the last schedule entry whose `effectiveFrom` is on or before the period start date. For a quarterly period ending `2026-06-30` the period starts `2026-04-01` and the `18%` rate applies; for a period ending `2026-09-30` the period starts `2026-07-01` and the `20.5%` rate applies.

### Registration thresholds

| Category | Quarter | 12 months | Trigger |
|---|---|---|---|
| `goods-services` | LKR 15,000,000 | LKR 60,000,000 | Exceeding either triggers registration |
| `financial-services` | LKR 3,000,000 | LKR 12,000,000 | Exceeding either triggers registration |
| `importer-exporter` | n/a | n/a | Registration is mandatory regardless of turnover |
| `digital-service` | n/a | LKR 60,000,000 | Registration required when 12-month digital services exceed the threshold |

## Rounding Order

1. Validate all LKR inputs as whole rupees; do not round an input into the contract.
2. Select the rate by the taxable period start date.
3. Compute `outputVat = S × r` and `netVat = outputVat − C` with exact decimal arithmetic.
4. Round `max(netVat, 0)` once to the nearest rupee (half up) for `vatPayable`, and `max(−netVat, 0)` likewise for `excessCredit`.
5. Serialize LKR values as fixed two-decimal strings.

For example, `S = 1,000,003` at `18%` gives `outputVat = 180,000.54`; with `C = 100,000` the payable is `80,001.00`.

## Assumptions And Exclusions

- Amounts are the value of taxable supplies excluding VAT and the input VAT on creditable purchases; the calculator does not decide whether a supply is taxable or a purchase is creditable.
- The rate is selected by the taxable period start date, matching the Act's "for any taxable period commencing on or after" rule.
- Exempt and zero-rated supplies, partial input-credit apportionment, import VAT timing, withholding on imported services, the abolished SVAT and the current risk-based refund mechanism, penalties, and interest are not modelled.
- The VAT registration threshold reduction to LKR 36,000,000 proposed in 2026 was not enacted; the `60,000,000`/`15,000,000` figures remain in force.
- A registration decision must be confirmed with the Inland Revenue Department before acting on it.
- The result is an estimate for self-assessment, not tax, legal, or accounting advice.

## Boundary Cases

- A negative `netVat` produces zero payable and carries the excess credit forward.
- A quarterly period ending on a non-quarter month is rejected.
- A period end date that is not the last day of its month is rejected.
- A digital service provider entering supplies or input credit is rejected.
- `rolling12MonthTurnover` is required to resolve the annual threshold; without it and without a quarterly trigger, the status is `indeterminate`.
- If `asOfDate` cannot resolve to a reviewed active rule version, calculation fails rather than silently using this candidate.

## Official Sources

- [IRD VAT overview and registration thresholds](https://www.ird.gov.lk/en/type%20of%20taxes/sitepages/value%20added%20tax%20(vat).aspx): rates, taxable periods, registration thresholds, and payment due dates.
- [Value Added Tax Act No. 14 of 2002 (consolidated 2014)](https://www.ird.gov.lk/en/publications/Value%20Added%20Tax_Acts/VAT_Act_No_14%5BE%5D_2002_(Consolidation_2014).pdf): charge of tax, rates, and Chapters IIIA-IIIB for financial services.
- [IRD VAT web notice PN/VAT/2025-01](https://www.ird.gov.lk/en/Lists/Latest%20News%20%20Notices/Attachments/677/PN_VAT_2025-01_11042025_E.pdf): mandatory registration for commercial importers and exporters.
- [IRD web notice SEC/PN/VAT/2026-03](https://assets.kpmg.com/content/dam/kpmgsites/lk/pdf/kpmg-tax-news/2026/july/Notice_on_Amendments_to_the_VAT_Act.pdf): Value Added Tax (Amendment) Act No. 14 of 2026 changes.
- [Value Added Tax (Amendment) Act No. 14 of 2026](https://www.parliament.lk/uploads/acts/gbills/english/6427.pdf): financial services rate and digital service provider registration.

## Golden Fixtures

All fixtures use `asOfDate: "2026-08-16"` and are candidate fixtures transcribed from the formula above; they require the review gate before production publication.

| Category | Period end | Supplies | Input credit | 12-month turnover | Rate | Output VAT | VAT payable | Registration |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| goods-services (quarterly) | 2026-06-30 | 20000000 | 2000000 | — | 18% | `"3600000.00"` | `"1600000.00"` | required (quarterly trigger) |
| goods-services (monthly) | 2026-08-31 | 5000000 | 1000000 | — | 18% | `"900000.00"` | `"0.00"` | indeterminate (excess `"100000.00"`) |
| goods-services (monthly) | 2026-08-31 | 5000000 | 900000 | 55000000 | 18% | `"900000.00"` | `"0.00"` | not-required |
| financial-services (quarterly) | 2026-06-30 | 10000000 | 300000 | — | 18% | `"1800000.00"` | `"1500000.00"` | required |
| financial-services (quarterly) | 2026-09-30 | 10000000 | 500000 | — | 20.5% | `"2050000.00"` | `"1550000.00"` | required (20.5% boundary) |
| importer-exporter (quarterly) | 2026-06-30 | 5000000 | 2000000 | — | 18% | `"900000.00"` | `"0.00"` | mandatory |
| digital-service | 2026-09-30 | — | — | 70000000 | n/a | `"0.00"` | `"0.00"` | required |
| digital-service | 2026-09-30 | — | — | 40000000 | n/a | `"0.00"` | `"0.00"` | not-required |
| goods-services (monthly) | 2026-08-31 | 1000003 | 100000 | — | 18% | `"180000.54"` | `"80001.00"` | rounding observable |

## Provenance

Every result must include the resolved calculation version, rule version, effective date, all attached IRD source references, and the latest successful source verification time. The source-link verification date is `2026-08-16`; it is not a substitute for independent content review. Regulated execution is server-authoritative. Missing, draft-only, stale-without-policy, or unresolved rule/source provenance must fail closed rather than return an unversioned result.

## Localization Strings

| Key | English source string |
|---|---|
| `calculator.vat-liability.name` | VAT liability and registration check |
| `calculator.vat-liability.summary` | Estimate VAT payable for a taxable period and check VAT registration thresholds. |
| `calculator.vat-liability.input.asOfDate` | Calculation date |
| `calculator.vat-liability.input.supplierCategory` | Supplier type |
| `calculator.vat-liability.input.taxablePeriod` | Taxable period |
| `calculator.vat-liability.input.periodEndDate` | Period end date |
| `calculator.vat-liability.input.taxableSuppliesAmount` | Taxable supplies |
| `calculator.vat-liability.input.inputTaxCreditAmount` | Input tax credit |
| `calculator.vat-liability.input.rolling12MonthTurnover` | Rolling 12-month turnover (optional) |
| `calculator.vat-liability.output.vatPayable` | VAT payable |
| `calculator.vat-liability.breakdown.outputVat` | Output VAT |
| `calculator.vat-liability.breakdown.registration` | Registration status |
| `calculator.vat-liability.assumption.rate` | VAT is charged at the rate for the taxable period start date. |
| `calculator.vat-liability.warning.estimate` | This candidate estimate still requires independent formula and accounting review before production publication. |
| `calculator.vat-liability.error.periodEnd` | The period end date must be the last day of its month (and of March, June, September, or December for quarterly periods). |
| `calculator.vat-liability.error.ruleUnavailable` | No reviewed VAT liability rule is available for this date. |

Translate the complete labels, guidance, formula explanation, breakdown, assumptions, exclusions, source titles, warnings, errors, and examples into reviewed English, Sinhala, and Tamil. Preserve LKR, field identifiers, dates, percentages, and threshold semantics.

## Privacy

The calculator is anonymous. Turnover, supplies, and results are not persisted by default and raw values must not be captured in logs, analytics, source-verification records, or rule-publication events. A calculation request sends only the required date, category, period, and amounts. Saved scenarios are separate future scope and require an explicit retention and deletion policy.
