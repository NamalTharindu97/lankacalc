# Withholding Tax (AIT/WHT) Specification

## Identity

- Identifier: `withholding-tax`
- Display name: Withholding tax (AIT/WHT) on payments
- Owner: LankaCalc regulated business-tax calculation kernel
- Classification: regulated
- Execution: server
- Calculation version: `2.0.0-candidate`
- Rule dependency: `withholding-tax-lk-2026`, scope `lk`
- Initial effective date: `2025-04-01`

## Approval And Review

- Status: Draft candidate specification
- Implementation use: arithmetic testing within the narrow confirmed scenarios below
- Production publication: blocked
- Source research and link verification: 2026-08-30

Publication requires independent tax/accounting review of payer and recipient scope, source, exemptions, treaty effects, monthly aggregation, self-declaration validity, final-versus-creditable treatment, monetary precision, and every fixture. The version 2 candidate implementation follows this narrow specification, but no production rule may be published until that review is complete.

## Candidate Scope

This is a payer-side estimate of tax deducted from a Sri Lankan-source payment by a person who is legally a withholding agent. The caller must already have confirmed that the payment is not employment income, is not exempt, and is made in a business where the Act excludes private individual payments.

| Payment case | Rate | Gate | Candidate treatment |
|---|---:|---|---|
| Interest or discount to a resident recipient | 10% | A valid resident-individual self-declaration may stop deduction | Non-final; creditable |
| Dividend from a resident company | 15% | Supported only when no statutory exemption applies | Final |
| Rent to a resident person | 10% | Calendar-month aggregate must exceed LKR 100,000 | Non-final; creditable |
| Rent to a qualifying non-resident | 14% | No treaty reduction; not through a Sri Lankan permanent establishment | Final |
| Listed service fee to a resident individual who is not an employee | 5% | Calendar-month aggregate must exceed LKR 100,000 | Non-final; creditable |
| Service fee to a qualifying non-resident | 14% | No treaty reduction; not through a Sri Lankan permanent establishment | Final |
| Royalty to a resident person | 14% | No exemption | Non-final; creditable |
| Royalty to a qualifying non-resident | 14% | No treaty reduction; not through a Sri Lankan permanent establishment | Final |

The candidate uses separate resident/non-resident royalty categories and supports interest only for a resident individual. It does not infer recipient treatment from a generic interest or royalty label.

From `2026-06-03`, Inland Revenue (Amendment) Act No. 11 of 2026 expands the expressly listed resident-individual service professions. The 5% rate and LKR 100,000 monthly gate do not change. The candidate selects an effective-dated scope revision and requires the payer to confirm that the service is listed under that revision; it does not decide the profession from free text.

## Inputs

| Field | Type | Unit | Required | Meaning |
|---|---|---|---|---|
| `asOfDate` | string | payment date | yes | Selects the effective rule and profession scope |
| `paymentType` | enum | category | yes | One residence-specific supported payment case |
| `grossAmount` | integer | LKR | yes | Gross payment before withholding |
| `interestSelfDeclaration` | `yes` or `no` | confirmation | resident interest only | Confirms a valid declaration is on file; the calculator does not determine eligibility |
| `residentServiceScopeConfirmed` | `yes` | confirmation | resident service only | Confirms the service is listed under the scope revision effective on the payment date |
| `nonResidentConditionsConfirmed` | `yes` | confirmation | non-resident cases only | Confirms no treaty reduction/exemption applies and the payment is not attributable to a Sri Lankan permanent establishment |

For resident rent and service fees, `grossAmount` must be the aggregate paid to that recipient in the calendar month, not merely the current invoice. The law applies the rate to the full amount after the threshold is exceeded.

The candidate's explicit category and confirmations cover:

- recipient residence and supported recipient type through `paymentType`;
- non-resident permanent-establishment, treaty, and exemption exclusions through confirmation; and
- resident service inclusion under the effective-dated reviewed scope through confirmation.

Whether the payer is legally a withholding agent remains a caller prerequisite rather than a calculator determination.

## Rate Rules

The Y/A 2025/2026 candidate rates are:

```json
{
  "effectiveFrom": "2025-04-01",
  "rounding": "two-decimal",
  "monthlyThreshold": "100000",
  "residentServiceScopeRevisions": [
    { "effectiveFrom": "2025-04-01", "revision": "section-85-1c-2025" },
    { "effectiveFrom": "2026-06-03", "revision": "section-85-1c-2026" }
  ],
  "rates": {
    "interest": [{ "effectiveFrom": "2025-04-01", "ratePercent": "10" }],
    "dividend": [{ "effectiveFrom": "2025-04-01", "ratePercent": "15" }],
    "rentResident": [{ "effectiveFrom": "2025-04-01", "ratePercent": "10" }],
    "rentNonResident": [{ "effectiveFrom": "2025-04-01", "ratePercent": "14" }],
    "serviceFeeResident": [{ "effectiveFrom": "2025-04-01", "ratePercent": "5" }],
    "serviceFeeNonResident": [{ "effectiveFrom": "2025-04-01", "ratePercent": "14" }],
    "royalty": [{ "effectiveFrom": "2025-04-01", "ratePercent": "14" }]
  }
}
```

The payload schema is version `2`. Both rate and service-scope lookup fail when no entry is effective on the payment date.

## Threshold And Declaration Rules

For resident rent or a supported resident-individual service fee:

```text
if calendarMonthAggregate <= 100000:
  withholding = 0
else:
  withholding = calendarMonthAggregate * rate
```

The threshold is not deducted as an allowance. At LKR `100,001`, the rate applies to the full LKR `100,001`.

For interest, `interestSelfDeclaration: yes` means only that the caller confirms a currently valid declaration is on file. The calculator must not claim that validity follows merely from assessable income being below personal relief. IRD Notice SEC/PN/IT/2026/02 describes the amended condition as the resident individual not deriving taxable income for the relevant year and warns of penalties for false or misleading declarations.

## Monetary Precision

The governing provisions and reviewed Tax Chart specify percentage rates but do not establish a nearest-rupee half-up convention. The candidate therefore:

- calculates with exact decimal arithmetic;
- does not round an intermediate amount; and
- preserves the result to two decimal places when the percentage of a whole-rupee input produces cents.

Net payment is gross payment less the exact withholding amount.

## Outputs

- Payment category, payment date, selected rate, and effective date.
- Gross payment, exact withholding amount, and net payment.
- Monthly-threshold applicability and whether it was exceeded.
- Whether a confirmed valid self-declaration stopped interest AIT.
- `final` or `creditable` treatment based on sufficient recipient facts.
- A reason explaining the gate, rate, treatment, and any assumption.
- Rule version, immutable source revisions, and verification timestamps.

## Golden Fixtures

These are candidate calculations derived from the Act and IRD Tax Chart, not official worked examples. Amounts are chosen to make the expected precision explicit.

| Case | Input | Expected withholding | Expected treatment | Purpose |
|---|---:|---:|---|---|
| Resident interest | `200,000` | `20,000.00` | creditable | 10% AIT |
| Resident interest with valid declaration | `200,000` | `0.00` | creditable | Declaration gate |
| Dividend | `500,000` | `75,000.00` | final | 15% final withholding |
| Resident rent below threshold | `99,999` | `0.00` | creditable | Below monthly gate |
| Resident rent at threshold | `100,000` | `0.00` | creditable | Inclusive no-deduction boundary |
| Resident rent above threshold | `100,001` | `10,000.10` | creditable | Full-payment rate and cents preservation |
| Resident service fee at threshold | `100,000` | `0.00` | creditable | Inclusive no-deduction boundary |
| Resident service fee above threshold | `100,001` | `5,000.05` | creditable | Full-payment rate and cents preservation |
| Non-resident service fee | `2,000,000` | `280,000.00` | final | 14% non-resident final payment |
| Non-resident rent | `200,000` | `28,000.00` | final | 14% non-resident final payment |
| Resident royalty | `300,000` | `42,000.00` | creditable | Resident treatment |
| Non-resident royalty | `300,000` | `42,000.00` | final | Recipient-dependent treatment |

Required rejection fixtures:

- A self-declaration on a non-interest payment.
- A non-resident path without confirmation that no treaty reduction applies and the payment is not through a Sri Lankan permanent establishment.
- A legacy generic interest or royalty category that does not identify supported recipient treatment.
- A resident service fee without confirmation against the effective-dated scope revision.
- A resident service payment before the earliest effective scope revision.
- A payment before the earliest applicable rate entry; rate selection must fail rather than use the first future schedule item.

## Sources

- [IRD Tax Chart Y/A 2025/2026](https://www.ird.gov.lk/en/publications/SitePages/tax_chart_2526.aspx?menuid=1404): rates, monthly gates, payment descriptions, and treaty warning.
- [Consolidated Inland Revenue Act incorporating changes through 31 March 2025](https://www.ird.gov.lk/en/publications/Acts_Income%20Tax_2017/IRA_Cons_Act_-_2025_Changes.pdf): sections 73, 75, 84A, 85, 88, and 89, plus First Schedule paragraph 10.
- [Inland Revenue (Amendment) Act, No. 2 of 2025](https://www.ird.gov.lk/en/publications/Acts_Income%20Tax_2017/IR_Act_No_02-2025_E.pdf): interest rate and relief changes effective `2025-04-01`.
- [IRD Notice SEC/PN/IT/2026/02](https://www.ird.gov.lk/en/Lists/Latest%20News%20%20Notices/Attachments/788/SEC_PN_IT_2026-02.pdf): self-declaration condition and resident service-profession expansion.

The rule version must also attach the applicable IRD withholding-agent circular and self-declaration form revision. A title-only citation without a verified direct URL and immutable revision is insufficient for publication.

## Assumptions And Exclusions

- APIT and employment payments are excluded.
- Transport/telecommunication payments, gem auctions, lottery/betting/gambling winnings, natural-resource payments, insurance premiums, and other unsupported section 84/85 cases are excluded.
- Statutory exemptions, BOI arrangements, Treasury instruments, and payment-specific certificates are excluded unless represented by a separately reviewed path.
- Treaty rates are excluded; domestic rates must not be presented as conclusive where a treaty may prevail.
- Monthly aggregation across multiple invoices is caller-provided.
- Remittance, statements, certificates, penalties, and recovery are compliance workflows, not calculation outputs.
- This is an estimate, not tax, legal, or accounting advice.

## Publication Blockers

1. Attach verified direct revisions of the governing circulars, section 85(1C) service lists, and self-declaration form.
2. Independently review whether the residence-specific categories and payer confirmations are sufficient for every supported recipient type and final-payment condition.
3. Independently approve the two-decimal monetary precision convention or replace it with an authoritative filing/certificate rule.
4. Obtain independent tax/accounting approval of every formula, effective date, threshold, treatment, and fixture.
5. Review English, Sinhala, and Tamil strings, or make an explicit English-only launch decision.

## Privacy

The calculator is anonymous. Inputs and results are not persisted by default, and raw payment values must not be captured in logs, analytics, source-verification records, or publication events.
