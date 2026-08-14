# Employment Rule Source Dossier

## Purpose

This dossier identifies the official source owners and publication locations required before APIT, EPF, and ETF formulas are specified. It does not approve a formula or copy changing parameters into code. Stage 2 must review the exact effective-dated documents, derive fixtures from official examples, and obtain independent formula and rounding review.

Research retrieved and link-verified: 2026-08-14.

## APIT

Issuing authority: Inland Revenue Department, Sri Lanka.

- [Advance Personal Income Tax Tables](https://www.ird.gov.lk/en/publications/sitepages/apit_tax_tables.aspx?menuid=1502) is the canonical index. It currently preserves tables for 2020-2021 through 2025-2026.
- The 2025-2026 section links the index, monthly deductions from regular primary-employment profits, lump-sum and terminal-benefit instructions, non-resident employment, cumulative employment profits, tax-on-tax, secondary employment, foreign-employer income, the APIT guideline, and non-cash benefits.
- [Forms and Returns](https://www.ird.gov.lk/en/downloads/sitepages/forms.aspx?menuid=1603) provides primary/secondary employment declarations, deduction certificates, and annual employer statement guidance.

Maintenance notes:

- Treat each assessment-period document as a separate source revision or source record where its legal identity differs.
- Do not infer one table's rates or scope from another table.
- Record the PDF content hash because the IRD index can retain a URL while replacing an amended document.
- Preserve prior official documents and their effective periods for historical calculations.

## EPF

Issuing authorities: Commissioner of Labour for administration and the Employees' Provident Fund Department of the Central Bank of Sri Lanka for fund management and contribution operations.

- [What is EPF](https://epf.lk/?page_id=2) identifies the institutional responsibilities and states the minimum employee and employer contribution rates.
- [Remitting Contributions](https://epf.lk/?p=171) describes contribution rates, included earnings, remittance timing, electronic returns, and surcharges.
- [EPF Act and Amendments](https://epf.lk/?page_id=246) links Act No. 15 of 1958 and amendments/special provisions through 2012.

Maintenance notes:

- The calculator specification must distinguish minimum contribution rates from employer-specific higher rates.
- Eligible earnings and employee coverage require legal review against the Act and amendments, not only the operational web page.
- Store operational guidance and the governing Act as separate sources attached to the same rule version.

## ETF

Issuing authority: Employees' Trust Fund Board, operating under the Ministry of Finance, Planning and Economic Development.

- [Employer Details](https://etfb.lk/employer-details/) describes coverage, included earnings, exceptions, and the employer-only contribution rate.
- [Payment of Contributions](https://etfb.lk/payment-of-contributions/) describes remittance timing, electronic-payment rules, surcharges, and employer obligations.
- [Downloads](https://etfb.lk/downloads/) links ETF Act No. 46 of 1980, amendments, and relevant Gazette publications including Gazette No. 2311/39 dated 2022-12-22.

Maintenance notes:

- Coverage and earnings definitions must be checked against the Act, amendments, and Gazette before implementation.
- ETF is employer-funded; UI and explanations must not present it as an employee deduction.
- Keep payment-process changes separate from calculation-rule changes unless they alter calculator output.

## Verification Policy

- Only HTTPS pages controlled by the issuing authority qualify as official publication sources.
- The runtime source-host allowlist is changed through code review; operators cannot make the checker request arbitrary hosts.
- A rule cannot publish until at least one attached official source has a successful current verification event.
- Link checks record HTTP status, redirects, validators, and a bounded SHA-256 content hash. A changed hash requires a new source revision and verification before subsequent publication.
- Source metadata records retrieval and verification separately. A successful link check is not a legal/content review.
- Archived copies may be referenced only where redistribution and retention are legally permitted.
