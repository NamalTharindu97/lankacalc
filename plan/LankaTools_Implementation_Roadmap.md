# LankaTools Implementation Roadmap

## 1. Purpose

This roadmap closes the gap between the product opportunities in `docs/Sri_Lanka_Web_Application_Service_Research.md` and the current six-calculator foundation.

Use the repository documents in this order:

1. `docs/Sri_Lanka_Web_Application_Service_Research.md` defines product opportunities and constraints.
2. `plan/LankaTools_Backend_Plan.md` defines the target architecture and domain boundaries.
3. This document defines implementation order, dependencies, deliverables, and exit criteria.
4. Executable configuration and tests remain the source of truth for behavior already implemented.

This roadmap covers the full research catalog, but it does not authorize parallel development of every product. Each stage must pass its exit gate before the next major product track starts.

## 2. Current Baseline

### Implemented

- Next.js 16 App Router application on Node 22
- PostgreSQL 17 with Drizzle schema and explicit Docker migrations
- Dockerized production web application
- Framework-independent calculator registry
- Decimal.js arithmetic and Zod validation
- Anonymous web UI and `/api/v1` calculation endpoints
- Age calculator
- Percentage calculator
- Compound-interest calculator
- Area calculator
- Loan EMI calculator
- Fuel-consumption calculator
- Calculator/source metadata tables
- Unit and API contract tests
- CI for lint, typecheck, test, and build
- Optional accounts, profiles, and saved calculation snapshots with export and account deletion
- Net-to-gross, gratuity, and overtime employment calculators
- Job-offer comparison with annual financial improvement
- Expiring signed PDF reports from saved snapshots
- Timezone-aware obligation reminders with scheduled email delivery, retries, and unsubscribe

### Partially Implemented

| Capability | Current state | Required completion |
|---|---|---|
| Units | Labels and suffixes only | Typed units, conversion, normalized values |
| Provenance | Result fields and source table | Runtime sources, rule versions, verification history, UI display |
| Loan | Fixed-rate EMI only | Schedule, fees, configurations, affordability, lease behavior |
| Fuel | Consumption only | Dated prices, trip/monthly cost, user overrides |
| Construction | Generic area only | Material quantity calculators, estimates, prices, BOQ |
| Public API | Anonymous calculation routes | Rate limits, keys, scopes, quotas, version policy |
| Database registry | Tables exist | Synchronization with code registry and versioned rule ownership |
| Browser execution | Anonymous UI exists | Static calculations run locally with API parity |

### Stage 0 Resolution Checklist

These audited foundation defects are resolved by Stage 0:

1. [x] Strictly reject empty strings, booleans, arrays, and null for numeric API inputs.
2. [x] Prevent Decimal values from becoming unsafe JavaScript numbers or JSON `null` at numeric extremes.
3. [x] Define and test monetary serialization as decimal strings or safe minor units.
4. [x] Define Loan EMI rounding order so displayed installments reconcile with displayed totals.
5. [x] Document nominal/effective rate conventions for Loan EMI and compound interest.
6. [x] Align published field metadata with server validation, including required, minimum, maximum, and unit information.
7. [x] Add explicit area units and conversion.
8. [x] Add registry duplicate-key detection.
9. [x] Add public API rate limiting before external promotion.
10. [x] Avoid constructing PostgreSQL URLs from unescaped Docker password interpolation.
11. [x] Display normalized inputs, sources, versions, and verification information when present.
12. [x] Correct documentation that implies rule persistence already exists.

## 3. Delivery Rules

- Implement one vertical slice at a time from domain logic through UI, API, persistence, tests, and operations.
- Do not implement regulated formulas without approved official sources and golden fixtures.
- Do not store executable formulas in PostgreSQL.
- Keep formulas in versioned TypeScript and changing parameters in validated, effective-dated data.
- Keep general calculations anonymous; introduce accounts only for explicit saves, reminders, reports, or organization data.
- Do not collect anonymous financial inputs in logs or analytics.
- Use database migrations for all persistence changes and review generated SQL before applying it.
- Use the shared registry for pages and APIs; never duplicate formulas in route handlers or UI components.
- Make stale external data visible or suppress it according to a product-specific freshness policy.
- Keep paid promotion independent from organic rankings and calculated recommendations.
- Add infrastructure only when a selected product requires it.

## 4. Workstream Overview

| Workstream | Scope | First consumer |
|---|---|---|
| A. Calculation kernel | Strict inputs, decimals, units, metadata, result serialization | Existing six calculators |
| B. Rules and sources | Effective dates, publication, official sources, history | Salary/APIT/EPF/ETF |
| C. Identity and saves | Optional accounts, profiles, saved scenarios | WorkMoney |
| D. Notifications | Schedules, retries, preferences, unsubscribe | WorkMoney and LankaDeadline |
| E. Decision content | Versioned guides and decision trees | GovGuide |
| F. Catalog and ingestion | External records, normalization, observations, freshness | PriceLK |
| G. Organizations and documents | Tenancy, roles, secure files, audit | SME Compliance |
| H. Reporting | PDF/spreadsheet jobs and immutable snapshots | WorkMoney and FreelancerLK |
| I. Localization | English, Sinhala, Tamil content workflow | Regulated calculator explanations |
| J. Commercial | Plans, entitlements, leads, affiliates, sponsorships | Validated product track |
| K. Partner platform | API keys, quotas, widgets, domain restrictions | B2B calculator API |

## 5. Stage 0: Stabilize The Foundation

Status: complete. Stage 1 is the next active stage.

### 5.1 Strict Input Contracts

Deliverables:

- Replace unrestricted `z.coerce.number()` with a shared form-number parser.
- Accept finite numbers and intentional numeric strings only.
- Reject blank strings, booleans, arrays, objects, and null.
- Define field-level required metadata.
- Derive public input metadata from the same contract where practical.
- Add malformed JSON and unexpected-type API tests.

Exit criteria:

- Every calculator rejects missing and type-invalid required values with HTTP 422.
- UI and API metadata match validation boundaries.
- Boundary tests exist for every numeric field.

### 5.2 Decimal And Money Contract

Deliverables:

- Keep arbitrary-precision values as decimal strings across API boundaries.
- Use integer minor units only where a domain guarantees fixed currency precision.
- Add serialization guards that reject non-finite or out-of-contract outputs.
- Define per-output decimal precision and rounding mode.
- Add numeric-extreme tests.

Exit criteria:

- No successful API response can contain JSON `null` because of `Infinity` or `NaN`.
- Monetary values remain exact within documented limits.
- Display and persisted values use the same rounding policy.

### 5.3 Units

Deliverables:

- Add typed length, area, distance, and volume units required by the current calculators.
- Add mass, energy, and time units only when the first calculator requiring them enters development.
- Normalize values before calculation.
- Preserve original values and selected units in result metadata.
- Add metric and common imperial conversions needed by construction tools.
- Update area and fuel calculators first.

Exit criteria:

- Area accepts explicit units and returns the selected square unit.
- Conversion round trips pass tolerance tests.
- No calculator uses ambiguous `square units` output.

### 5.4 Formula Specifications

Create one specification file per calculator under a future `docs/calculators/` directory containing:

- Identifier and owner
- Classification
- Inputs and units
- Outputs and breakdown
- Formula
- Rate convention
- Rounding order
- Assumptions and exclusions
- Official sources where applicable
- Golden fixtures
- Boundary cases
- Localization strings
- Privacy behavior

Exit criteria:

- The six existing calculators have approved specifications.
- Loan EMI totals reconcile according to the documented payment policy.
- Percentage rounding is disclosed.
- Compound-interest compounding semantics are explicit.

### 5.5 Static Browser Execution

Deliverables:

- Execute static calculators in the browser from the shared domain registry.
- Retain server API execution for external clients and parity tests.
- Add parity tests comparing browser-domain and API results.
- Keep regulated and data-driven calculations server-authoritative.

Exit criteria:

- Existing static calculators work if the calculation API is unavailable.
- Browser and API results match for all fixtures.

### 5.6 API And Docker Hardening

Deliverables:

- Add request-size limits and low-cost anonymous rate limiting.
- Add request IDs and structured error logging without raw inputs.
- Add health and readiness endpoints.
- Configure Docker database connection parameters without unsafe URI interpolation.
- Add web-container health checks.
- Add CI migration generation/drift and disposable-PostgreSQL migration tests.

Exit criteria:

- Docker supports strong passwords containing URI delimiter characters.
- CI applies migrations to disposable PostgreSQL.
- API abuse receives stable 429 responses.
- Health checks distinguish application readiness from database readiness.

## 6. Stage 1: Rule And Source Platform

Status: complete. Stage 2 is the next active stage.

### 6.1 Source Registry

Required data:

```text
sources
source_revisions
verification_events
source_link_checks
```

Deliverables:

- Store issuing authority, title, official URL, publication date, retrieval date, and verification date.
- Preserve source revisions or archived metadata where legally permitted.
- Record who verified a source and why.
- Detect broken or changed official links.
- Display source citations and verification dates in calculator results.

### 6.2 Rule Registry

Required data:

```text
rule_definitions
rule_versions
rule_version_sources
publication_events
rule_validation_fixtures
```

Required lifecycle:

```text
Draft -> Reviewed -> Scheduled/Published -> Retired
```

Deliverables:

- Effective-from and optional effective-to dates
- Immutable published versions
- Non-overlapping published ranges for the same rule scope
- Payload schema version and checksum
- Author, reviewer, and publication timestamps
- Future-effective scheduling
- Historical rule resolution by `asOfDate`
- Draft-versus-active result comparison
- Correction by new version rather than mutation

Exit criteria:

- A published version cannot be edited.
- Historical calculations resolve the expected rule version.
- Publishing fails without official sources and passing fixtures.
- Overlapping active periods are blocked transactionally.

### 6.3 Protected Administration

Deliverables:

- Temporary operator authentication suitable for the first administrators
- Admin and reviewer roles
- Draft rule editing with structured payloads
- Source attachment and verification
- Fixture execution and result diff
- Publication, scheduling, retirement, and audit history

Do not build a database formula language. Administration controls parameters and publication metadata for formulas implemented in code.

## 7. Stage 2: Regulated Employment Calculators

Status: complete. The narrow primary-monthly employment slice is implemented; production rule publication remains gated by independent source, formula, and rounding review. Stage 3 is the next active stage.

Implement these as one rule-backed employment family:

| Calculator | Required inputs | Required outputs | Dependencies |
|---|---|---|---|
| APIT | Tax period, taxable employment income, declarations/reliefs defined by source | Tax by bracket, total APIT | Rule/source platform |
| EPF | Eligible earnings and employee category | Employee and employer contribution breakdown | Rule/source platform |
| ETF | Eligible earnings and employer category | Employer contribution | Rule/source platform |
| Salary | Gross components, pay period, allowances, deductions | Gross, taxable income, deductions, contributions | APIT, EPF, ETF |
| Take-home | Salary inputs | Net pay with ordered breakdown | Salary family |

Source research must identify current official Sri Lankan authorities and publications before formulas are written.

Deliverables:

- Calculator specification for each regulated calculator
- Official source dossier
- Effective-dated rules
- Golden fixtures from official examples or independently reviewed calculations
- Historical `asOfDate` support
- Source and rule display in UI and API
- Clear estimate and scope warnings

Exit criteria:

- Every threshold and boundary has a fixture.
- Historical versions remain reproducible.
- No result is published with missing provenance.
- An independent review confirms formula and rounding behavior.

## 8. Stage 3: Optional Accounts And WorkMoney

Status: complete. Stage 4 is the next active stage.

### 8.1 Identity And Profiles

Calculations remain anonymous. Accounts are optional and introduced for saves and reminders.

Required data:

```text
users
auth_accounts
sessions
profiles
saved_calculations
calculation_snapshots
```

Deliverables:

- Select a self-host-compatible authentication method.
- Support registration/sign-in only when a user chooses to save.
- Store locale and timezone in the profile.
- Preserve input, output, engine version, rules, sources, and assumptions in saved snapshots.
- Support rename, delete, export, and account deletion.
- Never automatically persist anonymous calculations.

### 8.2 Remaining Employment Tools

| Tool | Required behavior |
|---|---|
| Net-to-gross | Solve gross pay for a target take-home; report convergence and ambiguous results |
| Gratuity | Effective-dated eligibility and service-period calculations |
| Overtime | Employee category, hourly-rate basis, multipliers, holidays, and exclusions |
| Salary increment | Gross and take-home impact comparison |
| Loan affordability | Income, debts, expenses, assumptions, stress cases, and estimate warning |
| Job-offer comparison | Compare salary, bonuses, allowances, travel, WFH, tax, contributions, and annual improvement |

Job-offer outputs must include:

- Estimated annual take-home
- Additional tax
- Travel-cost difference
- Yearly bonus difference
- Employer contributions
- Real annual financial improvement
- Visible financial and non-financial assumptions

### 8.3 Reports

Deliverables:

- Immutable report snapshot
- Asynchronous PDF generation
- Expiring private download URLs
- Report version and provenance
- Deletion and retention policy

Exit criteria:

- Anonymous calculations remain fully functional.
- Saved calculations are accessible only to their owner.
- Job comparisons reproduce the saved rules and assumptions.
- Account deletion removes personal records according to policy.

## 9. Stage 4: Notifications And Reminders

Status: complete. Stage 5 is the next active stage.

Required data:

```text
reminders
notification_preferences
scheduled_deliveries
delivery_attempts
unsubscribe_records
```

Deliverables:

- Timezone-aware date reminders
- Configurable offsets with 30, 7, and 1 day defaults
- Email delivery first
- Unique delivery claims for idempotency
- Bounded retries and permanent-failure state
- User preferences, quiet periods if needed, and unsubscribe
- Action URLs connecting reminders to relevant product guidance

Initial consumers:

- Saved WorkMoney actions
- Tax and compliance calendars
- LankaDeadline
- Price alerts later

Exit criteria:

- Duplicate scheduler runs do not duplicate notifications.
- Date-only obligations behave correctly in `Asia/Colombo`.
- Unsubscribed users receive no delivery.
- Delivery failure is visible to operators.

## 10. Stage 5: Remaining LankaCalc Families

Status: in progress. Construction quantity calculators (10.5) and the Business And Tax family (10.6) are code-complete. The lending family (10.1) is implemented including configurable rates, fees and insurance, early payment, and lease deposits/residuals/balloons; the electricity domestic standard tariff (10.2) is implemented with an approved candidate specification, fixtures, and a source dossier; fuel and solar (10.4) are implemented including the user price override and financing/payback. The remaining increments are data- and source-gated: platform-observed bank rates with source and date (10.1), full non-domestic customer categories and historical tariff versioning (10.2), and dated Customs exemptions (10.3). Production rule publication remains gated by independent source, formula, and rounding review.

### 10.1 Lending And Leasing

- Full loan amortization schedule
- Fixed and configurable rates
- Fees and insurance as explicit inputs
- Early-payment scenarios
- Lease deposits, residuals, balloons, and charges
- User-entered versus platform-observed bank rates
- Rate observation source and date

### 10.2 Electricity

- Customer category
- Consumption period
- Tariff blocks
- Fixed charges
- Taxes and adjustments
- Effective tariff dates
- Official tariff source
- Historical calculation

Status: the standard CEB domestic tariff (categories 0-60, 61-180, and above 180, with fixed charges and a 2.5% SSCL) is implemented as a regulated calculator with an approved candidate specification, golden fixtures, and `docs/electricity-rule-sources.md`, and the `electricity-domestic-standard` dev rule is provisioned and published in the local database. Non-domestic customer categories and effective-dated rule versioning remain.

### 10.3 Vehicle Import

- Vehicle category and classification
- Customs valuation inputs
- Exchange-rate source and date
- Layered duties and taxes
- Exemptions and effective dates
- Official Customs and gazette sources
- Warning for cases requiring professional confirmation

Status: the seven NITG 2026 Chapter 87 excise schedules and the standard CID/surcharge/VAT/SSCL stack are implemented, and the S.P.D. surcharge LC-establishment exemption (LC on or before 2026-05-15; shipped-on-board on or before 2026-11-15) is implemented as the first dated exemption. Broader concession schemes and the disabled-persons concession remain source- and review-gated.

### 10.4 Fuel And Solar

- Dated fuel prices by fuel type
- Trip and monthly fuel cost
- User price override
- Solar system size and location assumptions
- Generation estimate
- Equipment and installation cost
- Financing
- Grid tariff/export assumption
- Degradation and payback

Status: implemented. The fuel cost calculator (`fuel-cost`) supports dated official prices with a custom price override, and the solar cost calculator (`solar-cost`) supports location-based generation, system cost, net-accounting savings, simple payback, and optional financing.

### 10.5 Construction Quantity Calculators

Implement independently from live material prices:

- Tile quantity
- Paint
- Concrete
- Brick and block
- Steel quantity/weight without structural-design claims
- Roof material quantity without engineering claims

All construction tools require typed units, wastage assumptions, openings/exclusions, and safety disclaimers.

### 10.6 Business And Tax

Status: code-complete as a first slice. The product specification (`docs/business-and-tax-product-spec.md`) and five regulated calculators are implemented: `business-income-tax`, `vat-liability`, `withholding-tax`, `freelance-tax-estimate`, and `sscl-check`. All five dev rules, including `sscl-lk-2026`, are provisioned and published in the local database. Production publication of every regulated rule remains gated by independent source, formula, and rounding review.

Do not implement generic names without product specifications. First define:

- Intended taxpayer or business category
- Tax period
- Income and expense categories
- Regulatory scope
- Official sources
- Whether the tool is arithmetic, regulated, or workflow-based

Exit criteria for Stage 5:

- Every calculator has a specification and classification.
- Configurable defaults are dated and source-backed.
- Regulated families use rule versions.
- Static quantity calculations do not depend on live-price availability.

## 11. Stage 6: Guidance Products

### 11.1 Versioned Content And Decision Engine

Required data:

```text
guides
guide_versions
decision_trees
decision_nodes
decision_edges
decision_outcomes
content_sources
content_translations
```

Deliverables:

- Structured questions and branching conditions
- Versioned outcomes
- Source and last-verified metadata
- Draft/review/publish lifecycle
- Graph validation for loops, unreachable nodes, and missing outcomes
- Explicit unresolved-case fallback to official support

### 11.2 GovGuide

Implement services incrementally:

1. NIC
2. Passport
3. Driving licence
4. Revenue licence
5. Birth, marriage, and death certificates
6. Police clearance
7. TIN
8. Business registration
9. EPF and ETF procedures
10. Vehicle ownership procedures

Each guide can return required documents, fees, ordered steps, office or online channel, forms, official links, and last-verified date.

Every page must clearly state that LankaTools is an independent guidance layer, not a government website.

### 11.3 LankaDeadline

Support passports, licences, insurance, emission tests, vehicle service, certifications, domains, SSL certificates, rent agreements, and business obligations.

Connect each supported obligation to the relevant GovGuide or official action page where available.

### 11.4 ComplaintLK

Implement only after verified authority and escalation content exists for:

- Telecommunications
- Banking
- Consumer products and warranties
- Insurance
- Utilities
- Transport
- Public services

Outputs include responsible authority, procedure, evidence checklist, official links, and escalation sequence.

Exit criteria:

- Published outcomes have verified sources.
- Broken links and stale guides create operator alerts.
- The platform does not claim government or legal authority.
- Decision graphs pass structural and scenario tests.

## 12. Stage 7: Catalog, Ingestion, And Search

### 12.1 Shared Data Foundation

Required data:

```text
external_sources
ingestion_runs
external_records
catalog_entities
catalog_aliases
measurement_units
observations
observation_corrections
freshness_policies
```

Pipeline:

```text
Source -> Immutable import -> Validation -> Normalization -> Observation -> Projection/Search
```

Deliverables:

- Source-specific adapters
- Import replay and idempotency
- Canonical identity and aliases
- Unit, pack, grade, dosage, or strength normalization
- Conflict and duplicate handling
- Observation timestamps
- Corrections without silent history mutation
- Freshness labeling, downgrade, and suppression policies
- PostgreSQL full-text search first

Exit criteria:

- Replaying an import does not duplicate observations.
- Stale values cannot appear as current without a visible warning.
- Every displayed observation has a source and timestamp.

## 13. Stage 8: Consumer Price Track

### 13.1 PriceLK Product Search

Deliverables:

- Retailers and branches
- Canonical products and retailer listings
- Brand, name, pack size, and unit matching
- Regular and offer prices
- Offer conditions and validity
- Availability and observation timestamps
- Cheapest comparable retailer result

Start with a small retailer/category pilot only after lawful and maintainable data acquisition is confirmed.

### 13.2 PriceHistory

Deliverables:

- Immutable historical observations
- Current price
- Historical low
- 30-day average
- 90-day average
- Price movement
- Correction and outlier policy

### 13.3 Alerts

- User target price
- Product and retailer scope
- Fresh observation requirement
- Duplicate suppression
- Notification preferences and delivery history

### 13.4 Basket Optimizer

Inputs and constraints:

- Product and quantity list
- Exact products versus allowed substitutions
- Missing and unavailable items
- Branch scope
- Delivery fees and minimum order where available
- Optional travel cost

Outputs:

- Full basket total per retailer
- Cheapest complete basket
- Potential saving
- Cheapest split-store purchase
- Explicit missing/substituted items

Exit criteria:

- Sponsored offers cannot change optimizer ranking.
- Product identity quality is measured and reviewed.
- Stale or unavailable observations cannot win silently.

## 14. Stage 9: Business SaaS Track

### 14.1 Organization Foundation

Required data:

```text
organizations
organization_memberships
roles
audit_events
stored_documents
```

Requirements:

- Tenant-scoped queries
- Owner, member, payroll operator, and accountant roles
- Access auditing
- Secure document storage
- Retention and deletion policy
- Backup and restore procedure

### 14.2 SME Compliance

Deliverables:

- Employee records
- Payroll periods and calculations
- APIT, EPF, and ETF integration
- Compliance calendar
- Payment-evidence records
- Document storage
- Compliance history
- Multi-company accountant access

### 14.3 FreelancerLK

Deliverables:

- Client records
- Invoice numbering and PDF generation
- Income and expense tracking
- USD/LKR observations with exact source/date persistence
- Tax estimates and calendar
- Reports and spreadsheet exports
- Multiple-client and history entitlements

Exit criteria:

- Cross-organization access tests pass.
- Sensitive data is absent from logs.
- Reports preserve source, rule, and exchange-rate versions.
- Restore and deletion procedures are tested.

## 15. Stage 10: Construction And Vehicle Tracks

### 15.1 BuildPrice

Deliverables:

- Material catalog for cement, sand, steel, bricks, blocks, tiles, paint, roofing, electrical, and plumbing
- Brand, grade, unit, supplier, region, tax, and delivery normalization
- Supplier price observations
- Location and finish-level assumptions
- House-size and floor inputs
- Material-category and project-range estimates
- Versioned BOQ reports
- Consent-based supplier and contractor leads

Quotation marketplace work is last and requires supplier verification, quote validity, fraud handling, communication, and dispute operations.

### 15.2 VehicleCost

Inputs:

- Vehicle
- Purchase price
- Finance
- Fuel efficiency
- Monthly distance
- Insurance
- Maintenance
- Tyres
- Revenue licence
- Other recurring costs

Outputs:

- Monthly ownership cost
- Annual ownership cost
- Cost per kilometre
- Five-year ownership cost
- One-, three-, and five-year comparison

If depreciation, resale, inflation, or maintenance estimates are platform-provided, show their source, date, range, and uncertainty.

Exit criteria:

- Estimates distinguish user inputs from platform observations.
- Comparisons use consistent assumptions.
- No lead is delivered without explicit user consent.

## 16. Stage 11: Lifestyle And Education Tracks

### 16.1 CostOfLiving And RentWise

Cost components:

- Rent
- Electricity
- Water
- Internet
- Travel
- Fuel
- Parking
- Food
- Other regular expenses

Deliverables:

- Location taxonomy
- Household profiles
- Dated observations and ranges
- User overrides
- Monthly household estimate
- Location comparison
- Living-arrangement comparison
- WorkMoney integration for required gross and take-home salary

### 16.2 EduCompare

Categories:

- Degrees
- Diplomas
- IT certifications
- English courses
- MBA programs
- Master's degrees
- Professional qualifications

Comparison fields:

- Institution
- Course
- Duration
- Fees
- Entry requirements
- Online or physical delivery
- Part-time or full-time study
- Qualification
- Next intake

Organic ranking must be independent from featured or paid placement.

Exit criteria:

- Cost estimates display date, location, range, and sample/source basis.
- Course records identify update ownership and verification time.
- Paid institution placement is visibly labeled and cannot alter organic scoring.

## 17. Stage 12: High-Risk Data Products

### 17.1 AgroPrice

Implement only after reliable daily data is available.

Required dimensions:

- Crop
- Variety and grade
- Unit
- Market
- Region
- Observation date

Deliverables:

- Daily price
- Seven-day trend
- Thirty-day trend
- Seasonal trend
- Data-quality and anomaly checks
- Market comparison

Forecasts require model versions, training-data versions, backtesting, confidence intervals, and conspicuous uncertainty. Selling-location suggestions also require transport, spoilage, volume, and access inputs.

### 17.2 MedPrice

Implement only after pharmacy partnerships and medical review exist.

Required identity:

- Medicine and active ingredient
- Brand
- Dosage form
- Strength
- Pack
- Prescription status

Deliverables:

- Official-price records where available
- Pharmacy and branch prices
- Fresh inventory observations
- Nearby-stock search
- Strict prescription controls
- Medical disclaimers

The product must not diagnose, recommend treatment, or suggest unsafe substitutions.

Exit criteria:

- High-risk product approval is documented.
- Data freshness satisfies the defined service level.
- Safety review and incident process exist.
- Forecast or availability uncertainty is visible.

## 18. Localization Program

Introduce localization incrementally after the content model stabilizes.

Required languages:

- English
- Sinhala
- Tamil

Required localized content:

- Labels and controls
- Input guidance
- Explanations
- Calculation breakdowns
- Assumptions and warnings
- Examples
- Government guidance
- FAQs
- Errors
- Notifications
- Reports

Required workflow:

```text
Draft -> Reviewed -> Published -> Stale
```

Rules:

- Version translations with source content.
- Mark translations stale when rules or source content change.
- Fall back to reviewed English content.
- Preserve familiar acronyms such as APIT, EPF, ETF, VAT, TIN, and API where appropriate.

## 19. Commercial Program

Commercial work starts only after a product passes its validation gate.

### Advertising

- Placement inventory
- Consent and privacy handling
- Direct campaign controls if sold directly
- Separation from results and guidance

### Lead Generation

- Explicit user consent
- Partner identity and destination
- Minimal lead payload
- Attribution and delivery status
- Deduplication
- Retention and deletion
- Partner reporting

### Subscriptions

- Plans and trials
- Entitlements
- Recurring billing
- Cancellation and grace periods
- Payment state and receipts
- Access enforcement

### Premium Reports And Alerts

- Entitlement checks
- Immutable report inputs and versions
- Secure downloads
- Alert schedules and delivery history

### Affiliate And Sponsorship

- Campaign and partner mapping
- Tagged outbound links
- Click attribution
- Sponsorship date ranges and approval
- Mandatory visible labels
- No effect on organic results

### B2B API And Widgets

- API clients
- Hashed keys with visible prefixes
- Scopes
- Rotation and revocation
- Quotas and rate limits
- Usage metering and billing
- Allowed widget domains
- Tenant branding
- Contract version and deprecation policy

## 20. Persistence Migration Sequence

Migration names remain generated by Drizzle; this table defines conceptual order.

| Sequence | Domain | Main additions |
|---|---|---|
| 1 | Foundation correction | Unit metadata, calculator metadata/version corrections |
| 2 | Rules and sources | Rule definitions/versions, source revisions, verification/publication events |
| 3 | Identity and saves | Users, sessions, profiles, saved calculations, snapshots |
| 4 | Notifications | Reminders, preferences, scheduled deliveries, attempts |
| 5 | Decision content | Guides, versions, decision graphs, translations |
| 6 | Catalog and ingestion | Sources, runs, entities, aliases, units, observations, corrections |
| 7 | Organizations | Organizations, memberships, roles, documents, audit events |
| 8 | Product SaaS | Employees, payroll, compliance, clients, invoices, transactions |
| 9 | Commercial | Plans, subscriptions, entitlements, leads, campaigns, API clients |

Every migration must include rollback/recovery consideration, constraint tests, and disposable-PostgreSQL verification in CI.

## 21. API Expansion Sequence

### Existing

```text
GET  /api/v1/calculators
GET  /api/v1/calculators/{calculator}
POST /api/v1/calculations/{calculator}
```

### Rules And Sources

```text
GET /api/v1/calculators/{calculator}/rules
GET /api/v1/calculators/{calculator}/sources
```

Admin publication should remain internal rather than becoming an unrestricted public API.

### Accounts And Saves

```text
GET    /api/v1/profile
PATCH  /api/v1/profile
GET    /api/v1/saved-calculations
POST   /api/v1/saved-calculations
GET    /api/v1/saved-calculations/{id}
DELETE /api/v1/saved-calculations/{id}
```

### Reminders

```text
GET    /api/v1/reminders
POST   /api/v1/reminders
PATCH  /api/v1/reminders/{id}
DELETE /api/v1/reminders/{id}
```

### Product Domains

Add bounded routes for guides, prices, catalogs, organizations, invoices, reports, and partner services. Do not create a universal endpoint that accepts arbitrary formulas or opaque domain payloads.

## 22. Verification Matrix

| Capability | Required verification |
|---|---|
| Static formulas | Unit, boundary, property, browser/API parity |
| Regulated formulas | Official golden fixtures, thresholds, historical dates, independent review |
| Rule publication | Transaction, immutability, overlap, authorization, audit |
| External ingestion | Contract, replay, deduplication, normalization, freshness |
| Decision trees | Loop, unreachable node, missing outcome, scenario fixtures |
| Accounts | Ownership, session security, deletion, export |
| Organizations | Tenant isolation, role changes, document access |
| Notifications | Idempotency, retries, timezone, unsubscribe |
| Reports | Snapshot reproducibility, authorization, expiration |
| Search | Relevance fixtures, aliases, typo behavior, paid-result separation |
| Forecasts | Backtesting, confidence, model/data versions |
| Commercial | Entitlements, billing state, consent, attribution |
| Localization | Fallback, stale detection, complete error/warning coverage |
| Docker | Build, health, migration, restart, backup and restore |

## 23. Definition Of Done For A Calculator

A calculator is complete only when:

1. Its specification is approved.
2. Inputs, units, bounds, defaults, and required fields are explicit.
3. Formula and rounding order are documented.
4. The implementation is framework-independent.
5. UI and API use the same registry definition.
6. Results include normalized inputs, breakdown, assumptions, and warnings.
7. Regulated/configurable/data-driven versions include sources and dates.
8. Unit, boundary, invalid-input, and regression tests pass.
9. Accessibility and mobile behavior are verified.
10. English explanation content is complete.
11. Privacy and persistence behavior are documented.
12. Operational monitoring is defined where the calculator depends on rules or data.

## 24. Definition Of Done For A Product

A product track is complete only when:

1. Its core decision outcome is useful without unrelated features.
2. Source/rule/data maintenance ownership is assigned.
3. Anonymous and authenticated boundaries are explicit.
4. Data retention and deletion are implemented.
5. Security and tenant-isolation tests pass where applicable.
6. Stale or uncertain data is visible.
7. Paid placement cannot alter organic results silently.
8. Backup, recovery, monitoring, and incident procedures exist.
9. Product analytics avoid sensitive raw inputs.
10. The expansion gate is measured before another major track starts.

## 25. Product Traceability

| Research product | Roadmap stage | Status |
|---|---|---|
| LankaCalc static foundation | Stage 0 | Complete |
| LankaCalc regulated employment | Stages 1-2 | Complete |
| WorkMoney | Stage 3 | Complete |
| LankaCalc remaining families | Stage 5 | In progress (10.6 business tax and 10.5 construction code-complete; 10.1 lending and 10.2 electricity domestic implemented; data- and source-gated increments remain) |
| GovGuide | Stage 6 | Planned |
| LankaDeadline | Stages 4 and 6 | Planned |
| ComplaintLK | Stage 6 | Planned |
| PriceLK | Stages 7-8 | Conditional |
| PriceHistory | Stage 8 | Conditional |
| SME Compliance | Stage 9 | Conditional |
| FreelancerLK | Stage 9 | Conditional |
| BuildPrice | Stage 10 | Conditional |
| VehicleCost | Stage 10 | Conditional |
| CostOfLiving/RentWise | Stage 11 | Conditional |
| EduCompare | Stage 11 | Conditional |
| AgroPrice | Stage 12 | Deferred/high risk |
| MedPrice | Stage 12 | Deferred/high risk |

## 26. Release Gates

Before starting another major product track, confirm:

1. Users need the active product.
2. Users can discover it.
3. Users return.
4. Rules and data can be maintained at the required cadence.
5. Source verification is sustainable.
6. Privacy and safety risks are controlled.
7. Operational incidents are manageable.
8. Monetization is plausible without compromising result integrity.
9. Shared modules are proven by real use rather than anticipated reuse.

## 27. Immediate Execution Order

The next implementation work should occur in this exact order:

1. [x] Fix strict input parsing and unsafe numeric serialization.
2. [x] Define money serialization and Loan EMI rounding.
3. [x] Align UI/API metadata and validation.
4. [x] Add typed units and area conversion.
5. [x] Add browser/API parity for static calculators.
6. [x] Add API and Docker hardening.
7. [x] Write specifications for existing calculators.
8. [x] Research official APIT, EPF, and ETF sources.
9. [x] Implement source revisions, verification events, and versioned rules.
10. [x] Build the protected rule administration workflow.
11. [x] Implement APIT, EPF, ETF, salary, and take-home calculators.
12. [x] Add optional accounts only when saved WorkMoney scenarios begin.
13. [x] Research and implement the Business And Tax regulated family (10.6): business income tax, VAT, withholding tax, freelance tax estimate, and SSCL check.
14. [x] Implement the electricity domestic standard tariff (10.2) as a regulated calculator with the candidate spec, golden fixtures, and `docs/electricity-rule-sources.md`; effective-dated rule versioning and non-domestic categories remain.
15. [x] Implement the lending and leasing feature increments (10.1): configurable rates, fees and insurance, early payment, and lease deposits/residuals/balloons; platform-observed bank rates with source and date remain.
16. [ ] Complete dated-exemption coverage for vehicle import (10.3); the fuel user price override and solar financing/payback are implemented.
17. [x] Provision the `sscl-lk-2026` dev rule; the independent review gate for regulated business tax publication remains.

No later product track should interrupt this sequence unless product research changes the selected first vertical.

## 28. Git Delivery Workflow

Every roadmap stage or coherent corrective change uses this delivery sequence:

1. Fast-forward local `main` from `origin/main`.
2. Create a topic branch such as `phase-0/stabilize-foundation`, `phase-1/rule-platform`, or `fix/strict-number-inputs`.
3. Implement only the branch's declared scope.
4. Run focused tests during development.
5. Run `npm run verify` before pushing.
6. Run migration generation, SQL review, disposable-PostgreSQL migration tests, and Docker checks when relevant.
7. Inspect `git status`, the complete diff, and recent commits.
8. Commit with a concise scope-based message and push the topic branch.
9. Open a PR into `main` with the implementation and verification summary.
10. Wait for required CI checks and resolve failures with new commits.
11. Squash-merge the approved PR and delete the remote branch.
12. Fast-forward local `main` before beginning the next roadmap stage.

Do not force-push, bypass failing checks, commit local secrets, or mix unrelated roadmap stages in one PR.
