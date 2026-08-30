# Employment Rule Source Dossier

## Purpose

This dossier records the primary sources and candidate rule findings for the Stage 2 APIT, EPF, and ETF calculators. The candidate findings are sufficient to implement code and automated fixtures within the narrow documented scope. They are not approval for public production publication: published rules still require attached source revisions, passing fixtures, and independent formula/accounting review of legal scope, formula, and rounding.

Research retrieved and link-verified: 2026-08-30.

## Status

| Rule area | Research status | Publication status |
|---|---|---|
| APIT regular primary monthly rule from 2025-04-01 through 2026-03-31 | Official index, instructions, full lookup, formula, whole-rupee input, and final ceiling identified | Approved implementation candidate; blocked pending independent formula/accounting review; later dates fail closed pending a separately reviewed table |
| EPF standard contributions from 1981-01-01 | Rate, formula, statutory rounding, and current earnings definition identified | Approved implementation candidate; blocked pending independent formula/accounting review |
| EPF before 1981-01-01 | The prior 6%/9% rates are visible in the consolidated Act, but covered-employment commencement instruments have not been catalogued | Out of initial historical scope |
| ETF standard contributions | Rate, earnings definition, and staged coverage identified; whole-rupee MVP inputs always produce exact cents | Approved implementation candidate for whole-rupee inputs; blocked pending independent review |
| ETF inputs below one rupee precision | No authoritative fractional-cent rule identified | Out of initial scope; blocked pending an approved policy |

## APIT

Issuing authority: Inland Revenue Department, Sri Lanka.

### Official Sources

- [IRD Acts](https://www.ird.gov.lk/en/publications/sitepages/Acts.aspx?menuid=1601) publishes the [Inland Revenue (Amendment) Act, No. 2 of 2025](https://www.ird.gov.lk/en/publications/Acts_Income%20Tax_2017/IR_Act_No_02-2025_E.pdf), certified 2025-03-20, and the consolidated Act incorporating changes through 2025-03-31.
- [Advance Personal Income Tax Tables](https://www.ird.gov.lk/en/publications/sitepages/apit_tax_tables.aspx?menuid=1502) is the canonical IRD index. It currently preserves assessment-period collections from 2020-2021 through 2025-2026.
- [2025-2026 APIT Index](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Index/01.%20APIT_2526_Index.pdf) identifies Table 01 as the table for monthly tax deductions from regular profits from primary employment and distinguishes the other APIT cases.
- [How to apply Table 01](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Table%20-%201/02.%20APIT_2526_Table_01_Text.pdf) publishes the current monthly bands, percentages, and deductions effective from 2025-04-01.
- [Table 01 full lookup](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Table%20-%201/02.%20APIT_2526_Table_01.pdf) publishes the whole-rupee income lookup and corresponding whole-rupee deductions used to confirm the final ceiling behavior.
- [2025-2026 APIT Guideline](https://www.ird.gov.lk/en/publications/APIT_Tax_Tables/2025-2026/Guide/APIT_2526_Guideline.pdf) supplies the wider APIT context. It does not widen the initial calculator beyond Table 01.
- [Forms and Returns](https://www.ird.gov.lk/en/downloads/sitepages/forms.aspx?menuid=1603) provides primary/secondary employment declarations, deduction certificates, and annual employer statement guidance.

The other documents linked by the 2025-2026 index cover lump-sum and terminal-benefit payments, non-resident non-citizens, cumulative employment profits, tax-on-tax, secondary employment, foreign-employer income, and non-cash benefits. Those are separate rules and are not inputs to the Table 01 candidate.

### Candidate Current Regular-Monthly Rule

Scope: one calendar month of regular profits from primary employment under the 2025/2026 Table 01, effective from 2025-04-01 through 2026-03-31. Let `M` be the supported monthly APIT earnings amount, entered as a nonnegative whole number of LKR.

| Monthly APIT earnings `M` | Unrounded formula |
|---:|---:|
| `M <= 150000` | `0` |
| `150000 < M <= 233333` | `M * 0.06 - 9000` |
| `233333 < M <= 275000` | `M * 0.18 - 37000` |
| `275000 < M <= 316667` | `M * 0.24 - 53500` |
| `316667 < M <= 358333` | `M * 0.30 - 72500` |
| `M > 358333` | `M * 0.36 - 94000` |

The final APIT deduction is:

```text
apit = ceilToWholeRupee(unrounded formula selected above)
```

Use exact decimal arithmetic and apply no intermediate rounding. The ceiling is not a generic nearest-rupee convention inferred from the formula sheet. It is the behavior derived by comparing the formula with the IRD's full Table 01 lookup: a positive fractional-rupee result is taken to the next whole rupee. For example, `150001 * 0.06 - 9000 = 0.06` produces APIT of LKR 1, and `316667 * 0.24 - 53500 = 22500.08` produces APIT of LKR 22,501.

The whole-rupee earnings contract is part of the candidate rule. Decimal earnings are rejected rather than rounded into a lookup row. The resulting whole-rupee APIT may be serialized as a fixed two-decimal LKR string for the shared API contract, but its cents are always `.00`.

### APIT Scope Boundary

The initial candidate excludes bonuses and other lump sums, arrears, non-cash benefits, secondary or multiple employment, non-resident employees who are non-citizens, employer-paid tax and tax-on-tax, mid-year cumulative cases, and every case requiring a table other than Table 01. It does not infer reliefs, declarations, residence, or employment status from user data.

The salary-family candidate treats `basicPay + additionalFundEarnings + apitOnlyEarnings` as the already-classified Table 01 amount. That product convention does not establish the legal tax treatment of an arbitrary payroll label.

### Historical-Source Notes

- The canonical IRD page preserves separate assessment-period collections. Each collection, instruction PDF, and lookup PDF must be registered and effective-dated independently.
- The 2025-2026 formula must not be applied outside 2025-04-01 through 2026-03-31. Other APIT collections require separate specifications and fixtures before calculation support is enabled.
- An assessment-period directory name or a continued link on the current index does not by itself prove that a rule applies to an earlier or later date. Runtime resolution must use an independently reviewed effective range.
- The full lookup is important evidence for the 2025-2026 whole-rupee ceiling; do not assume that the same input precision or rounding applies to an older table without reviewing that table.

Maintenance requirements:

- Treat each assessment-period document as a separate source revision or source record where its legal identity differs.
- Do not infer one table's rates or scope from another table.
- Record the PDF content hash because the IRD index can retain a URL while replacing an amended document.
- Preserve prior official documents and their effective periods for historical calculations.

## Current Shared Earnings Base

EPF Act section 47, as replaced by Employees' Provident Fund (Amendment) Act No. 1 of 1985 section 9, and ETF Act section 44, as replaced by Employees' Trust Fund (Amendment) Act No. 47 of 1988 section 16 and again by Act No. 18 of 1993 section 5, identify the following earnings categories:

- wages, salary, or fees;
- cost-of-living allowance, special living allowance, and other similar allowances;
- payments in respect of holidays;
- the value of cooked or uncooked food supplied in employments provided for by EPF regulations, subject to the statutory assessment and appeal mechanism;
- meal allowances; and
- other remuneration prescribed under the EPF Act.

These are the post-amendment definitions used for the current rule. They must not be applied retrospectively to periods before their respective amendments without a separately effective-dated earnings specification.

Current EPF operational guidance also expressly includes commission, piece-rate, and contract-basis payments. Its employer FAQ expressly excludes overtime, reimbursable travelling expenses, and incentive or bonus payments.

The ETF employer page lists the same positive categories and includes commission, piece-rate, and contract-basis payments, but the page is visibly truncated and does not publish a corresponding exclusion list. The product must therefore accept an already-determined `eligibleEarnings` amount for the initial calculators. It must not classify arbitrary payroll component names or imply that the EPF FAQ's operational exclusions were independently stated by ETF.

## EPF

Issuing authorities: Commissioner of Labour for administration and the Employees' Provident Fund Department of the Central Bank of Sri Lanka for fund management and contribution operations.

### Official Sources

- [EPF Act and Amendments](https://epf.lk/?page_id=246) publishes Act No. 15 of 1958, the 1975 special provisions, and amendments from 1981, 1985, 1988, 1992, and 2012.
- [What is EPF](https://epf.lk/?page_id=2) identifies the institutional responsibilities and current minimum rates.
- [Remitting Contributions](https://epf.lk/?p=171) states the current rates, included earnings, remittance deadline, electronic-return requirements, and surcharges.
- [Employer FAQ](https://epf.lk/?page_id=811) states included and excluded earnings, current rates, coverage exceptions, and the remittance deadline.
- [Becoming a Member](https://epf.lk/?p=203) describes current operational coverage for permanent, temporary, apprentice, casual, shift, piece-rate, contract, commission, short-duration, local foreign-worker, and other listed employee categories.
- [Registering for EPF](https://epf.lk/?p=163) describes current employer registration and operational exceptions.

### Candidate Standard Rule

Employees' Provident Fund (Amendment) Act No. 26 of 1981 sections 2 and 4 replace the section 10 rates and deem that amendment effective from 1981-01-01.

| Parameter | Value | Authority |
|---|---:|---|
| Effective from | 1981-01-01 | Act No. 26 of 1981 section 4 |
| Employee rate | 8% | EPF Act section 10(1), as amended by Act No. 26 of 1981 section 2 |
| Employer rate | 12% | EPF Act section 10(2), as amended by Act No. 26 of 1981 section 2 |
| Nominal combined rate | 20% | Sum of the two statutory contributions |
| Calculation period | Month | EPF Act section 10 |

For eligible monthly earnings `E`:

```text
employeeContribution = roundEpfContribution(E * 0.08)
employerContribution = roundEpfContribution(E * 0.12)
totalContribution = employeeContribution + employerContribution
```

Do not calculate `totalContribution` independently as `round(E * 0.20)`. Section 13 applies to the amount of a contribution, and the employee and employer liabilities are separate contributions under section 10. Their rounded sum can differ from a separately rounded 20% calculation.

### EPF Rounding

EPF Act section 13 supplies an explicit nearest-cent, half-up rule:

- discard a fraction below one-half cent; and
- reckon a fraction equal to or above one-half cent as one cent.

Apply that rule independently to the employee and employer contributions. Use decimal arithmetic, not binary floating-point arithmetic, and serialize each amount as a fixed two-decimal LKR string.

### EPF Coverage Boundary

The Act applies through covered-employment regulations and contains special treatment for approved provident funds and approved contributory pension schemes. Current EPF guidance says an employer with one employee is generally bound to contribute and lists broad employee categories, but also identifies exceptions for household employees, specified social-service training establishments, and charities with fewer than ten employees.

The initial calculator may calculate only after the user confirms that the employment is covered and that the standard EPF rates apply. It must not decide coverage from a job title or employer name.

EPF Act section 11 also permits an employee and employer to make an irrevocable election for higher percentages. Employer-specific elections are not equivalent to a changing national minimum rate and must not be represented by the standard rule payload.

### EPF Remittance Metadata

The current operational deadline is on or before the last working day of the following month. This deadline, submission modes, and surcharge bands are compliance information, not contribution-formula parameters. They must be separately sourced and must not affect calculator output unless a future late-payment calculator is explicitly specified.

### EPF Candidate Fixtures

These are independently calculated candidates, not official worked examples. They require independent review before publication.

| Eligible monthly earnings | Employee 8% | Employer 12% | Total | Purpose |
|---:|---:|---:|---:|---|
| 100000.00 | 8000.00 | 12000.00 | 20000.00 | Standard whole-cent result |
| 12345.67 | 987.65 | 1481.48 | 2469.13 | Both contributions round down below half-cent |
| 100.05 | 8.00 | 12.01 | 20.01 | Employee rounds down and employer rounds up |
| 100.04 | 8.00 | 12.00 | 20.00 | Separately rounded sum differs from rounding 20% directly |

## ETF

Issuing authority: Employees' Trust Fund Board, operating under the Ministry of Finance, Planning and Economic Development.

### Official Sources

- [Downloads](https://etfb.lk/downloads/) publishes ETF Act No. 46 of 1980, Acts No. 3 of 1982, No. 47 of 1988, No. 18 of 1993, and No. 19 of 1993, the operative Gazettes reviewed below, remittance forms, and return instructions.
- [Employer Details](https://etfb.lk/employer-details/) describes current coverage, exceptions, earnings, and the employer-only 3% rate.
- [Payment of Contributions](https://etfb.lk/payment-of-contributions/) describes the remittance deadline, submission categories, electronic-payment requirements, surcharges, and employer obligations.
- [Employer FAQ index](https://etfb.lk/employer-faq/) is the canonical FAQ entry point. Its employer link currently points to the non-canonical `/employers-faq` path.

### Candidate Standard Rule

ETF Act No. 46 of 1980 section 16 requires the employer to contribute 3% of each employee's total earnings for the month. Sections 29 and 30 prohibit reducing employee earnings or deducting the employer's ETF liability from the employee.

| Parameter | Value | Authority |
|---|---:|---|
| Employer rate | 3% | ETF Act section 16(1) |
| Employee rate | 0% | ETF Act sections 16, 29, and 30 |
| Calculation period | Month | ETF Act section 16(1) |

For eligible monthly earnings `E`, the unrounded calculation is:

```text
employerContribution = E * 0.03
```

The UI and API must never present ETF as an employee deduction.

### ETF Coverage Timeline

ETF Act sections 2 and 16 require Ministerial Orders to establish application and the start of liability. Gazette No. 121 specifies every State undertaking and private-sector undertaking for section 2; the section 16 Orders then establish this staged liability history:

| Effective date | Employer category | Authority |
|---|---|---|
| 1981-03-01 | State undertakings and private-sector undertakings with at least 150 employees | Gazette No. 127/3 fixes 1981-02-28; liability starts the following day under section 16(2) |
| 1981-09-01 | Private-sector undertakings with 50 to 149 employees | Gazette No. 154/8 fixes 1981-08-31; liability starts the following day |
| 1982-01-01 | Private-sector undertakings with fewer than 50 employees, except the categories listed in that Order | Gazette No. 171/2 fixes 1981-12-31; liability starts the following day |
| 1992-01-01 | Religious-worship, social-service, or charitable institutions with at least ten employees | Gazette No. 688/30 fixes 1991-12-31; liability starts the following day |
| 1981-03-01, confirmed retrospectively in 1993 | University Grants Commission and Higher Educational Institutions | ETF (Special Provisions) Act No. 19 of 1993 section 3 |

Gazette No. 171/2 excludes domestic service in a household, listed religious/social-service/charitable institutions, listed industrial-training establishments for specified disadvantaged groups, and undertakings employing only members of the operator's family. Gazette No. 688/30 narrows the charitable-institution exclusion by bringing institutions with at least ten employees into liability.

Current ETF guidance summarizes coverage as non-pensionable public-sector employment and private-sector employment irrespective of employee count, subject to listed exceptions. It also states that approved provident-fund arrangements do not by themselves remove ETF liability.

Gazette No. 979/2 is an assignment-of-ministerial-responsibility instrument, not a rate or coverage change. Gazette No. 2311/39 introduces mandatory electronic contributions and monthly electronic returns from 2023-02-01 for employers with at least 15 employees; it does not change the 3% formula.

### Higher EPF Elections

ETF Act section 17 has special coordination rules for an employer that elected higher EPF percentages under EPF Act section 11. This is a distinct employer-specific case and is excluded from the standard EPF/ETF calculator. It requires a separately reviewed specification before support.

### ETF Precision Boundary

No provision equivalent to EPF Act section 13 was found in ETF Act No. 46 of 1980, the reviewed amendments, the 1981 Regulations published in Gazette No. 125, or the published R1/R4 material. The Act specifies 3%, and historical and current forms contain rupee-and-cent fields, but a two-decimal form does not establish how a fractional cent must be rounded.

The initial calculator accepts only whole-rupee eligible earnings. Multiplication of a whole number of rupees by 3% always produces an exact number of cents, so this input contract needs no fractional-cent rounding policy and may implement the candidate rule. This does not resolve the policy for a future input contract that accepts cents or smaller units.

Consequences:

- Do not copy EPF's half-up rule into ETF without authority or an explicitly approved product policy.
- Reject ETF earnings containing cents in the initial calculator; do not silently round them to whole rupees.
- Do not widen the input contract while an input can produce a fractional-cent result and the output contract requires cents.
- Obtain written ETF Board clarification or independent legal/accounting approval of a disclosed estimator rounding policy, then attach that evidence to the rule version.

### ETF Remittance Metadata

The current operational deadline is on or before the last working day of the following month. Employers with at least 15 employees must use electronic contribution and return submission from 2023-02-01. Deadlines, submission modes, and surcharges remain separate from the contribution formula.

### ETF Candidate Fixtures

The accepted MVP fixtures all use whole-rupee earnings and therefore produce exact cents. The decimal-earnings row documents the rejected expansion case.

| Eligible monthly earnings | Unrounded employer 3% | Expected behavior | Purpose |
|---:|---:|---:|---|
| 100000.00 | 3000.00 | 3000.00 | Standard exact-cent result |
| 12345.00 | 370.35 | 370.35 | Whole-rupee earnings with a cents result |
| 12345.67 | 370.3701 | Reject input | Fractional-cent case outside the MVP contract |

## Initial Product Boundary

The development seed provisions local `1.0.0` rule packages for all three definitions with the governing primary sources and every accepted golden fixture above. It completes the review and publication workflow only in the local development database so calculators can be exercised end to end. This is not production approval, and the seed must never be run in production.

The narrow first implementation should:

- accept an `asOfDate` and monthly earnings already classified by the caller; APIT, ETF, salary, and take-home amounts are whole LKR, while standalone EPF may accept cents under its statutory rounding rule;
- use `basicPay`, `additionalFundEarnings`, and `apitOnlyEarnings` for salary and take-home, with all three in the APIT base and only the first two in the EPF/ETF base;
- expose employee EPF, employer EPF, total EPF, and employer-only ETF as separate outputs;
- calculate take-home as gross pay less APIT and employee EPF only;
- resolve effective-dated rate and coverage metadata rather than hard-code only today's labels;
- display the official sources, rule version, effective date, and last-verified date; and
- warn that the result is an estimate and does not determine legal coverage or classify payroll components.

The first implementation should exclude:

- automatic classification of salary components or legal determination of covered employment;
- bonuses and other lump sums, arrears, non-cash benefits, secondary or multiple employment, non-resident non-citizens, employer-paid tax and tax-on-tax, and mid-year cumulative APIT cases;
- EPF calculations before 1981-01-01;
- ETF calculations before the category's staged commencement date;
- employer-specific higher EPF elections and their ETF coordination;
- approved provident funds, approved contributory pension schemes, pensionable public employment, self-employed ETF membership, migrant-worker membership, and retrospective institutional reconciliations;
- remittance generation, registration, returns, surcharges, interest, benefits, refunds, and enforcement; and
- decimal-rupee ETF earnings until a fractional-cent policy is approved.

## Source Registration

Register legal instruments and operational pages as separate source records or revisions. At minimum, the APIT rule version should attach the 2025-2026 index, Table 01 instructions, and full Table 01 lookup. The EPF rule version should attach the 1958 Act, Act No. 26 of 1981, Act No. 1 of 1985, and current EPF operational guidance. The ETF rule version should attach Act No. 46 of 1980, applicable amendments, every Gazette needed for the supported category and date, and current ETF operational guidance.

Preserve publication date, retrieval date, verification date, final URL after redirects, and a bounded SHA-256 content hash. The effective date belongs to the rule version and must be derived from the legal instrument; it must not be inferred from the website upload path or retrieval date.

## Verification Policy

- Only HTTPS pages controlled by the issuing authority qualify as official publication sources.
- The runtime source-host allowlist is changed through code review; operators cannot make the checker request arbitrary hosts.
- A rule cannot publish until at least one attached official source has a successful current verification event.
- Link checks record HTTP status, redirects, validators, and a bounded SHA-256 content hash. A changed hash requires a new source revision and verification before subsequent publication.
- Source metadata records retrieval and verification separately. A successful link check is not a legal/content review.
- Archived copies may be referenced only where redistribution and retention are legally permitted.

## Review Gates

Before any APIT, EPF, ETF, salary, or take-home result is publicly published in production:

1. An independent formula/accounting reviewer must confirm the legal text, formula, effective date, scope, and rounding for every supported rule.
2. The reviewer must confirm the APIT whole-rupee input and final-ceiling interpretation against both the instructions and full lookup.
3. The reviewer must confirm the earnings-base boundary and user-facing exclusions.
4. APIT fixtures must cover immediately below, at, and above every threshold.
5. EPF fixtures must prove independent per-contribution rounding, including the `100.04` divergence case; salary and take-home use whole-rupee fund bases, but standalone EPF accepts cents.
6. ETF may publish only with whole-rupee earnings; any future decimal-earnings contract needs an approved, cited fractional-cent policy and boundary fixtures.
7. Browser/domain, API, draft-rule, and published-rule results must match for every fixture.
8. UI and API provenance must identify all sources needed to reproduce the selected result.

Implementation and internal testing may proceed against the approved candidate specifications before this independent review. The rule lifecycle must remain draft or otherwise unavailable to public production traffic until every gate above is recorded.
