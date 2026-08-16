# Withholding tax (AIT/WHT) on payments

Identity and behavior for the regulated `withholding-tax` calculator.

| | |
|---|---|
| Calculator key | `withholding-tax` |
| Classification | regulated |
| Rule dependency | `withholding-tax-lk-2026`, scope `lk` |
| Version | 1.0.0 |
| Category | Business & Tax |
| Accent | rose |

## Scope

Estimates the withholding tax (WHT) or advance income tax (AIT) to deduct from interest, dividends, rent, service fees, and royalties, by payment date. This is a payer-side estimate: the amount a withholding agent deducts at source and remits to the Inland Revenue Department (IRD).

Supported payment types and their rates from the IRD tax chart for year of assessment 2025/26, effective 1 April 2025:

| Payment type | Rate | Threshold gate | Treatment |
|---|---|---|---|
| Interest or discount | 10% | Self-declaration relief for a resident individual | Creditable |
| Dividend | 15% | — | Final tax |
| Rent to a resident person | 10% | Calendar-month aggregate above LKR 100,000 | Creditable |
| Rent to a non-resident person | 14% | — | Creditable |
| Service fee to a resident individual | 5% | Calendar-month aggregate above LKR 100,000 | Creditable |
| Service fee to a non-resident person | 14% | — | Creditable |
| Royalty | 14% | — | Creditable |

The interest self-declaration applies to a resident individual whose total assessable income does not exceed the personal relief of LKR 1,800,000 and who has a declaration on file with the payer; it stops the deduction.

## Inputs

- `asOfDate` — the payment date. The applicable rate is selected by this date.
- `paymentType` — one of the payment types in the table above.
- `grossAmount` — the gross payment amount in whole rupees. For rent or a resident service fee this is the calendar-month aggregate to the recipient, because the threshold test compares against the monthly aggregate.
- `interestSelfDeclaration` (optional, shown only for `interest`) — `yes` when a valid self-declaration is on file.

The engine rejects a self-declaration supplied for any payment type other than `interest`.

## Calculation

1. Select the rate schedule entry whose `effectiveFrom` is the latest on or before the payment date.
2. Apply the threshold gate for `rent-resident` and `service-fee-resident`: when the gross amount does not exceed the calendar-month threshold, the rate is zero.
3. Apply the interest self-declaration when the recipient is a resident individual with a declaration on file: the rate becomes zero.
4. WHT/AIT = gross × rate, rounded once to the nearest rupee (half-up).
5. Net payment = gross − WHT/AIT.

## Outputs

- `paymentType`, `paymentTypeLabel`, `paymentDate`.
- `ratePercent`, `rateEffectiveFrom`, `rateLabel` — the applicable rate line and when it took effect.
- `grossAmount`, `wthAmount`, `netPayment`.
- `thresholdApplied`, `thresholdExceeded` — whether the calendar-month gate applies to the payment type and whether the aggregate exceeded it.
- `selfDeclarationApplied` — whether the interest self-declaration stopped the deduction.
- `treatment` — `final` (dividend) or `creditable` (all other types).
- `reason` — a plain-language note explaining the rate or why no tax was deducted.

The result contract exposes sources, rule versions, and last-verified dates; a calculation fails closed when provenance is missing or unresolved.

## Assumptions and exclusions

- The gross amount entered for resident rent or a resident service fee is treated as the calendar-month aggregate to that recipient; other payments to the same recipient in the month may change the outcome.
- Treaty-reduced rates for non-residents require a tax-residence certificate and are not modelled.
- WHT on land/sea/air transport and telecommunication payments (2%), gems at NGJA auctions (2.5%), lottery/betting/gambling winnings (14%), natural resource payments (14%), and exempt categories (for example interest on Treasury bonds/bills, interest to financial institutions on ordinary loans, dividends from certain BOI-approved businesses) are not modelled.
- The deduction is rounded to the nearest rupee; no other rounding applies.
- This is an estimate for payer guidance, not tax, legal, or accounting advice, and is subject to independent formula and accounting review before production use.

## Sources

- IRD Tax Chart Y/A 2025/26, Withholding Tax (WHT)/Advance Income Tax (AIT), effective 1 April 2025.
- IRD Circular SEC/2025/E/02 and Public Notice PN/IT/2025-01 (interest AIT and self-declaration).
- IRD Circular SEC/2026/E/04 (guidelines to withholding agents).

## Localization

Labels, guidance, category names, assumptions, exclusions, source titles, warnings, and errors are localization targets for English, Sinhala, and Tamil. Preserve statute citations, field identifiers, LKR, percentages, dates, and `WHT`/`AIT`/`APIT`/`TIN` abbreviations in their familiar forms.

## Privacy

The calculator is anonymous. Inputs and results are not persisted by default and raw values must not be captured in logs, analytics, source-verification records, or rule-publication events.
