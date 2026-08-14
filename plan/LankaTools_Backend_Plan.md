# LankaTools Backend Platform Plan

## 1. Purpose

This plan translates `docs/Sri_Lanka_Web_Application_Service_Research.md` into a backend architecture and delivery strategy for the possible LankaTools ecosystem.

It covers every product and calculator named in the research while preserving its main execution constraint: launch and validate one narrow vertical before expanding. This is a platform blueprint, not approval to build every service at once.

Use `plan/LankaTools_Implementation_Roadmap.md` for current gaps, implementation order, deliverables, and exit criteria.

## 2. Current Decisions

- The first product direction is LankaCalc, with WorkMoney capabilities following from the same calculation and rule foundation.
- Every calculator named in the research remains long-term scope, delivered through the phases in this plan rather than one release.
- The initial implementation direction is Next.js, TypeScript, and PostgreSQL.
- The first backend must support versioned rules and sources, accounts and saved results, an admin workflow, a public calculator API, and reminders.
- Calculations launch anonymously; optional registration, profiles, and saved results follow after the anonymous foundation.
- Deployment targets Docker with self-hosted PostgreSQL and explicit migration operations.
- The system starts as a modular monolith rather than microservices.
- Simple static calculations should run in the browser where practical.
- The server is authoritative for regulated rules, changing external data, persistence, reports, reminders, and partner APIs.
- Redis, dedicated search infrastructure, and separate backend services are deferred until a measured operational need exists.

## 3. Product Principles

- Convert fragmented Sri Lankan information into direct, understandable decisions.
- Do not compete on calculator quantity alone.
- Prefer useful comparisons and explanations over isolated arithmetic results.
- Show official sources, rule versions, last-verified dates, assumptions, and calculation breakdowns.
- Keep the first release web-first, searchable, and usable without installing an application.
- Let users calculate anonymously; require accounts only for persistence or account-specific features.
- Clearly separate official information from platform guidance and estimates.
- Do not present GovGuide or any other product as an official government service.
- Keep paid promotion separate from organic rankings, comparisons, and calculated recommendations.
- Expand only after proving demand, discoverability, return usage, maintainability, and monetization.

## 4. System Context

```text
Web clients and embeddable widgets
                 |
                 v
Next.js application
  |- Product pages
  |- Server actions
  |- Versioned public API
  |- Protected administration
  |- Authentication and accounts
                 |
                 v
Domain modules
  |- Calculation engine
  |- Rule and source registry
  |- Decision trees and guides
  |- Catalog and observations
  |- Search and normalization
  |- Notifications and reminders
  |- Reports and exports
                 |
                 v
PostgreSQL
  |- Product data
  |- Version history
  |- Accounts and organizations
  |- Audit and delivery records
                 |
                 +--> Object storage
                 +--> Email provider
                 +--> Payment provider when required
```

## 5. Architecture Evolution

### Stage 1: Modular Monolith

- One Next.js application and one PostgreSQL database.
- Route handlers provide public and internal APIs.
- Server actions can serve protected administration where an external API is unnecessary.
- Calculation logic remains independent from HTTP, database, and UI code.
- Scheduled platform invocations handle low-volume reminders and maintenance jobs.

### Stage 2: Same-Codebase Worker

Add a separately deployed worker from the same repository when external-data imports, report generation, notifications, or retries no longer fit request handlers safely.

### Stage 3: Targeted Infrastructure

- Add Redis only for demonstrated queue, cache, or distributed rate-limit requirements.
- Start search with PostgreSQL full-text search and product-specific aliases.
- Introduce Meilisearch or Elasticsearch only when search quality or scale cannot be met by PostgreSQL.
- Extract a domain into a service only when independent scaling, security isolation, deployment cadence, or ownership justifies the operational cost.
- Do not introduce Go or Spring Boot solely because the research lists them as future options.

## 6. Shared Platform Modules

| Module | Responsibilities |
|---|---|
| Calculation engine | Input validation, decimal arithmetic, formulas, breakdowns, warnings |
| Rule registry | Effective-dated regulated parameters and immutable publication |
| Source registry | Official links, authorities, publication dates, and verification records |
| Content system | Government guidance, complaint routes, explanations, and FAQs |
| Decision engine | Questionnaires, branching rules, comparisons, and recommendations |
| Catalog | Products, medicines, materials, courses, crops, aliases, and units |
| Data ingestion | Imports, validation, normalization, deduplication, corrections, and replay |
| Observations | Timestamped prices, availability, exchange rates, and market values |
| Search | Product, guide, institution, medicine, material, and market retrieval |
| Identity | Users, sessions, organizations, memberships, and roles |
| Notifications | Reminders, alerts, retries, preferences, and unsubscribe handling |
| Documents | User uploads, invoices, reports, and compliance evidence |
| Reporting | PDF, spreadsheet, BOQ, comparison, payroll, and invoice generation |
| Commercial | Plans, entitlements, subscriptions, leads, affiliates, and sponsorships |
| Partner API | API keys, widgets, quotas, metering, and allowed domains |
| Localization | Versioned English, Sinhala, and Tamil content |
| Audit | Administrative changes, publication, access, and delivery history |

Shared modules should be implemented when the first real product needs them, not in anticipation of every possible future product.

## 7. Calculator Classification

Every calculator or decision tool belongs to one or more classes:

| Class | Definition | Backend approach |
|---|---|---|
| Static | Fixed mathematical logic | Prefer browser execution; server mirrors it for APIs and saved results |
| Configurable | Uses editable prices, rates, costs, or assumptions | Version configuration and record the version used |
| Regulated | Depends on government, tax, employment, tariff, or Customs rules | Use effective-dated, source-backed, immutable rule versions |
| Data-driven | Depends on current external observations | Record source, observation time, freshness, and normalization |
| Workflow | Requires questions, accounts, reminders, reports, records, or routing | Persist explicit workflow state and audit important transitions |

## 8. Calculator Specification Contract

The research names many calculators but does not define their formal formulas. Every calculator requires an approved specification before implementation:

```text
Identifier and display name
Product ownership
Classification
Input fields, data types, units, ranges, and defaults
Output fields and calculation breakdown
Formula and parameter definitions
Rounding order and currency precision
Effective-date behavior
Official sources
Assumptions and exclusions
Warnings and disclaimers
Golden test examples
Boundary and invalid-input cases
Required localization content
Persistence and privacy behavior
```

Do not infer regulated formulas, brackets, exceptions, rounding, or effective dates from generic knowledge. Obtain and record official Sri Lankan sources.

## 9. Complete Calculator And Decision-Tool Catalog

### 9.1 General Mathematics

| Tool | Classification | Key specification work |
|---|---|---|
| Age calculator | Static | Date convention, leap-day behavior, output units |
| Percentage calculator | Static | Supported operations and rounding |
| Compound interest | Static/configurable | Compounding periods, contributions, rates, and rounding |
| Area calculator | Static | Supported shapes and unit conversion |

### 9.2 Lending And Leasing

| Tool | Classification | Key specification work |
|---|---|---|
| Loan EMI | Static/configurable | Principal, rate convention, term, frequency, fees, repayment type |
| Loan calculator | Static/configurable | Repayment schedule, total interest, fees, early payment assumptions |
| Lease calculator | Configurable | Deposit, rate, fees, residual, balloon payment, and term |
| Loan affordability | Configurable/workflow | Income, debt, expenses, affordability ratio, stress assumptions, disclaimer |

Bank rates may be represented as dated external observations, but users must also be able to enter their own rates. The platform must not represent affordability output as loan approval or financial advice.

### 9.3 Employment And Payroll

| Tool | Classification | Key specification work |
|---|---|---|
| Salary calculator | Regulated | Pay components, period, taxable income, deductions, contributions |
| Take-home calculator | Regulated | Exact take-home definition and deduction order |
| Net-to-gross calculator | Regulated | Inversion method, convergence, ambiguous outcomes |
| APIT | Regulated | Tables, reliefs, declarations, periods, rounding, official source |
| EPF | Regulated | Eligible earnings, employee and employer rates, exceptions |
| ETF | Regulated | Eligible earnings, employer rate, exceptions |
| Gratuity | Regulated | Eligibility, service periods, breaks, termination cases |
| Overtime | Regulated | Eligibility, hourly-rate derivation, multipliers, holidays |
| Salary increment | Static/regulated | Gross difference and optional take-home effect |
| Payroll | Regulated/workflow | Pay runs, components, approvals, contribution totals, records |
| Job-offer comparison | Regulated/configurable | Current and new jobs, bonuses, allowances, travel, WFH, contributions |

Job-offer comparison should produce annual take-home, additional tax, travel difference, bonus difference, employer contributions, and real annual financial improvement. It should preserve scenarios and explain each difference rather than outputting only one total.

### 9.4 Utilities, Fuel, And Solar

| Tool | Classification | Key specification work |
|---|---|---|
| Electricity bill | Regulated | Customer category, tariff blocks, fixed charges, taxes, effective dates |
| Fuel consumption | Static | Distance and efficiency units, trip and period calculations |
| Fuel cost | Configurable | Fuel type, dated price, user override, trip or monthly distance |
| Solar calculator | Configurable | System size, generation, costs, tariffs, financing, degradation, payback |

### 9.5 Vehicles

| Tool | Classification | Key specification work |
|---|---|---|
| Vehicle import | Regulated/data-driven | Vehicle class, valuation, exchange rate, Customs, duties, exemptions |
| Vehicle ownership cost | Configurable | Purchase, finance, fuel, insurance, maintenance, tyres, licence, other costs |
| Vehicle comparison | Configurable/workflow | Shared assumptions and one-, three-, and five-year horizons |

Ownership results should include monthly cost, annual cost, cost per kilometre, and five-year cost. Depreciation, resale value, inflation, electric vehicles, commercial use, and financing structure must be explicit if included.

### 9.6 Construction

| Tool | Classification | Key specification work |
|---|---|---|
| Tile quantity | Static/configurable | Tile size, room area, openings, grout, wastage |
| Paint | Static/configurable | Surface area, coats, coverage, condition, wastage |
| Concrete | Static/configurable | Dimensions, mix, wastage, units |
| Brick and block | Static/configurable | Unit size, wall thickness, openings, mortar, wastage |
| Steel | Static/configurable | Bar size, weight tables, quantity assumptions, safety warning |
| Roof | Static/configurable | Geometry, pitch, overlap, material system, wastage |
| Project range | Configurable/data-driven | House size, floors, finish level, location, material and labor assumptions |
| BOQ report | Configurable/data-driven/workflow | Material schema, price version, revisions, report entitlement |

Quantity calculations must remain separate from live prices. Project results should use ranges rather than false precision. Steel and roof tools must not imply structural engineering approval.

### 9.7 Business, Freelancer, And Lifestyle

| Tool | Classification | Key specification work |
|---|---|---|
| Business expenses | Configurable | Business categories, periods, tax relevance, outputs |
| General tax | Regulated | Taxpayer type, tax period, income categories, official rules |
| USD/LKR conversion | Data-driven | Rate authority, observation time, rate type, user override |
| Freelancer tax estimate | Regulated/data-driven | Tax regime, foreign income, expenses, exchange-rate treatment |
| Cost of living | Configurable/data-driven | Rent, utilities, travel, food, household profile, location |
| Location comparison | Configurable/data-driven | Geographic scope, household assumptions, comparable periods |
| Required salary | Regulated/configurable | Lifestyle cost, target savings, gross-to-net rules |

### 9.8 Price And Market Intelligence

| Tool | Classification | Key specification work |
|---|---|---|
| Product price search | Data-driven | Canonical identity, pack size, branch, offer, availability, timestamp |
| Basket optimizer | Data-driven/workflow | Missing items, substitutions, split stores, delivery and travel costs |
| Price history | Data-driven | Historical low, 30-day average, 90-day average, outlier policy |
| Price-drop alert | Data-driven/workflow | Target price, observation scope, schedule, duplicate suppression |
| Agricultural trends | Data-driven | Crop, grade, unit, market, region, missing days, observation quality |
| Agricultural forecast | Data-driven | Model version, training data, confidence, backtesting, disclaimers |
| Market comparison | Data-driven | Unit, grade, date, region, and transaction-basis normalization |
| Selling-location suggestion | Data-driven/workflow | Transport, spoilage, volume, access, forecast uncertainty |

### 9.9 Search, Guidance, And Routing

| Tool | Classification | Key specification work |
|---|---|---|
| Medicine search | Safety-critical data-driven | Medicine identity, dosage, strength, pack, price, stock, location |
| Education comparison | Data-driven/workflow | Institution, course, duration, fees, requirements, mode, intake |
| Government assistant | Versioned content/workflow | Questions, checklist, fees, steps, offices, forms, official links |
| Complaint routing | Versioned content/workflow | Issue categories, authority, evidence, procedure, escalation |
| Deadline reminder | Workflow | Obligation, due date, offsets, channel, timezone, actions |

## 10. Calculation Engine Design

All calculators should implement a stable domain interface independent of transport and persistence:

```ts
type CalculationResult = {
  calculator: string
  calculationVersion: string
  asOfDate: string
  normalizedInputs: unknown
  result: unknown
  breakdown: BreakdownItem[]
  assumptions: string[]
  warnings: string[]
  ruleVersions: RuleReference[]
  sources: SourceReference[]
  verifiedAt: string | null
}
```

Requirements:

- Use decimal arithmetic or integer minor units for money.
- Use explicit units for distance, area, volume, weight, energy, and time.
- Keep functions deterministic and free from HTTP, database, or authentication concerns.
- Never execute arbitrary formulas stored in PostgreSQL.
- Implement formulas in versioned TypeScript code.
- Store changing brackets, rates, thresholds, tariffs, and assumptions as validated rule data.
- Separate calculation version, rule version, external-data version, and API version.
- Resolve regulated rules from an explicit `asOfDate`.
- Preserve inputs, output, rules, assumptions, and engine revision for saved results.
- Return intermediate values and plain-language explanations.
- Include warnings when data is stale, uncertain, incomplete, or based on user assumptions.

## 11. Rule And Source Lifecycle

```text
Draft -> Reviewed -> Scheduled/Published -> Retired
```

- Published versions are immutable.
- Corrections create a new version rather than rewriting history.
- Published effective-date ranges cannot overlap for the same rule type and scope.
- Future-effective versions can be scheduled.
- Every regulated version requires at least one official source.
- Each version records author, reviewer, effective dates, verification date, publication time, payload schema version, and checksum.
- Publishing runs schema validation, golden fixtures, threshold tests, and result comparisons against the active version.
- Historical calculations continue referencing the exact rule versions originally used.
- Source links should be checked for removal or unexpected changes.
- A solo operator can publish without mandatory two-person approval, but reviewer attribution and a future separation-of-duties path should exist.

Core data:

```text
rule_definitions
rule_versions
sources
rule_version_sources
verification_events
publication_events
calculation_snapshots
audit_events
```

## 12. Product Domains

### 12.1 LankaCalc

Scope includes salary, APIT, EPF/ETF, gratuity, OT, loan, lease, electricity, vehicle import, fuel, solar, construction, business, tax, age, percentage, compound interest, area, and material quantities.

Backend needs:

- Rule and source publication
- Configurable assumptions
- Saved calculations
- Premium reports
- Public calculator API
- Embeddable widgets
- Sponsored calculator labeling
- Consent-based loan, leasing, solar, and construction leads

Primary risk is incorrect or obsolete regulated logic. Trust metadata and breakdowns are mandatory for regulated results.

### 12.2 WorkMoney

Scope includes salary, take-home, net-to-gross, APIT, EPF, ETF, gratuity, OT, salary increment, job-offer comparison, and loan affordability.

Backend needs:

- Shared employment calculation engine
- Saved current-job and offer scenarios
- Annualized comparison reports
- Employer contribution handling
- Recruitment and financial-product lead consent
- Salary insight aggregation only when privacy-safe and explicitly approved

The product should answer decision questions such as real annual financial improvement rather than acting as another generic salary calculator.

### 12.3 PriceLK

Retailers named in the research include Cargills, Keells, Glomark, Arpico, SPAR, and Sathosa.

Backend needs:

- Retailer and branch records
- Canonical products and retailer listings
- Brand, size, measurement-unit, and package normalization
- Regular and offer prices
- Offer validity and conditions
- Availability and observation timestamps
- Product search
- Complete-basket and split-store optimization
- Premium alerts
- Affiliate and sponsored-offer attribution
- Privacy-safe brand analytics

The major blocker is data acquisition and maintenance, not calculation code. Paid placement must not alter the cheapest result.

### 12.4 PriceHistory

Domains include phones, laptops, TVs, groceries, cement, tyres, appliances, and other products.

Backend needs:

- Shared canonical catalog with PriceLK
- Immutable price observations
- Historical correction records
- Current price, historical low, averages, and movement
- Price alerts
- Affiliate attribution
- B2B price intelligence exports

Define how promotions, outliers, missing observations, branches, and unavailable products affect history before publishing statistics.

### 12.5 GovGuide

Initial service categories include NIC, passport, driving licence, revenue licence, birth, marriage, and death certificates, police clearance, TIN, business registration, EPF, ETF, and vehicle ownership procedures.

Backend needs:

- Versioned guidance content
- Decision-tree questions and conditions
- Personalized document checklists
- Fees, steps, offices, online services, and forms
- Official links and verification dates
- Translation workflow
- Link health monitoring

Every page must identify the product as an independent guidance layer that directs users to official services.

### 12.6 LankaDeadline

Obligations include passports, driving licences, revenue licences, insurance, emission tests, vehicle service, certifications, domains, SSL certificates, rent agreements, and business obligations.

Backend needs:

- User-entered expiry dates
- Default 30-, 7-, and 1-day reminder offsets
- Timezone-aware scheduling
- Action links to GovGuide
- Delivery attempts, retries, failures, and unsubscribe state
- Premium reminder entitlements later

Do not represent notifications as guaranteed legal or compliance coverage.

### 12.7 ComplaintLK

Categories include telecommunications, banking, consumer products, insurance, utilities, transport, and public services.

Backend needs:

- Versioned routing graphs
- Question and answer conditions
- Responsible authorities
- Procedures and evidence checklists
- Official links
- Escalation sequences
- Verification and review records

Complaint submission, evidence uploads, letter generation, and case tracking are separate future scopes and require privacy and legal review.

### 12.8 SME Compliance Assistant

Target users are Sri Lankan businesses with approximately one to twenty employees and limited HR or accounting staff.

Backend needs:

- Organization-based tenancy
- Owner, employee, payroll operator, and accountant roles
- Employee and payroll records
- APIT, EPF, ETF, and payroll calculations
- Compliance calendars and reminders
- Documents and proof-of-payment records
- Compliance history and audit events
- Free/trial, Starter, Business, and Accountant/Multi-company entitlements

This domain handles highly sensitive business and employee data. Tenant isolation, access auditing, retention, backups, and deletion behavior must be designed before storing production records.

### 12.9 FreelancerLK

Target users include remote software engineers, Upwork freelancers, designers, consultants, creators, and foreign-income earners.

Backend needs:

- Clients, invoices, income, and expenses
- USD/LKR exchange-rate observations and provenance
- Tax estimates and tax calendar
- Reports and PDF/spreadsheet exports
- Reminder delivery
- Free and Pro entitlements

Preserve the exact exchange rate and source used for each stored transaction. Invoice numbering must be unique within the account or organization.

### 12.10 BuildPrice

Material categories include cement, sand, steel, bricks, blocks, tiles, paint, roofing, electrical, and plumbing.

Backend needs:

- Material, grade, brand, unit, supplier, and region normalization
- Supplier price observations and validity dates
- Quantity calculators
- Location and finish-level assumptions
- Project-range estimates
- BOQ and project reports
- Supplier and contractor leads
- Sponsored supplier labeling
- Quotation requests and responses later

Quotation features require supplier onboarding, consent, fraud handling, quote validity, dispute processes, and marketplace operations. They should not launch with the static calculators.

### 12.11 VehicleCost

Inputs include vehicle, purchase price, finance, fuel efficiency, monthly distance, insurance, maintenance, tyres, revenue licence, and other recurring costs.

Outputs include monthly cost, annual cost, cost per kilometre, five-year cost, and one-, three-, or five-year comparisons.

Backend needs:

- Saved scenarios and comparisons
- Configurable assumptions and dates
- Versioned reports
- Consent-based leads for leasing, insurance, tyres, batteries, garages, inspections, and dealers

Any platform estimates for depreciation, resale, maintenance, or inflation must display their source, date, and uncertainty.

### 12.12 MedPrice

Backend needs:

- Canonical medicine, active ingredient, brand, dosage form, strength, and pack identity
- Official-price records
- Pharmacy prices and inventory observations
- Pharmacy and branch identity
- Nearby-stock geospatial search
- Strict freshness thresholds
- Prescription-product safeguards

The system must not suggest diagnoses, treatment, or unsafe substitutions. This product should remain deferred until pharmacy partnerships, medical review, and sufficiently reliable stock feeds exist.

### 12.13 CostOfLiving And RentWise

Cost categories include rent, electricity, water, internet, travel, fuel, parking, food, and other regular expenses.

Backend needs:

- Location taxonomy
- Household profiles
- Versioned cost observations and assumptions
- User-entered overrides
- Monthly cost estimation
- Location and living-arrangement comparison
- WorkMoney integration for required-salary calculations

Clearly distinguish user inputs from platform estimates and show data dates and ranges.

### 12.14 EduCompare

Categories include degrees, diplomas, IT certifications, English courses, MBA programs, master's degrees, and professional qualifications.

Comparison fields include institution, course, duration, fees, entry requirements, online or physical delivery, part-time or full-time study, qualification, and next intake.

Backend needs:

- Institution and course catalogs
- Versioned fees, requirements, delivery modes, and intakes
- Verification ownership
- Search and comparison
- Featured-institution labeling
- Qualified lead consent and attribution

Organic ranking must remain independent from paid promotion.

### 12.15 AgroPrice

Target users include farmers, wholesalers, traders, and agricultural businesses.

Backend needs:

- Crop, variety, grade, unit, market, and region normalization
- Daily price observations
- Seven-day, thirty-day, and seasonal trends
- Data quality checks and anomaly detection
- Weather integration later
- Versioned forecasting models and training datasets
- Confidence ranges and backtesting
- Market comparison and selling-location suggestions later

Forecasts and selling suggestions can materially affect livelihoods. They require visible uncertainty, historical accuracy, and inputs for transport, spoilage, volume, and market access.

## 13. Data Model Boundaries

Use product-specific tables rather than one universal entity or calculation table. Shared identifiers and services may be referenced across domains.

### Identity And Tenancy

```text
users
auth_accounts
sessions
organizations
organization_memberships
roles
api_clients
api_keys
```

### Calculations And Rules

```text
calculator_definitions
rule_definitions
rule_versions
sources
rule_version_sources
saved_calculations
calculation_snapshots
calculation_reports
```

### Content And Decisions

```text
guides
guide_versions
decision_trees
decision_nodes
decision_edges
decision_outcomes
content_translations
verification_events
```

### Catalog And Observations

```text
catalog_entities
catalog_aliases
measurement_units
external_sources
external_records
ingestion_runs
observations
observation_corrections
freshness_policies
```

Product domains should add typed tables for products and listings, medicines and inventory, materials and suppliers, institutions and courses, or crops and markets. Do not force unrelated domain data into opaque JSON records.

### Notifications

```text
reminders
notification_preferences
scheduled_deliveries
delivery_attempts
unsubscribe_records
```

### Commercial And Reporting

```text
plans
subscriptions
entitlements
payments
lead_partners
leads
lead_deliveries
affiliate_links
sponsorship_campaigns
report_jobs
stored_documents
```

### Auditing

```text
audit_events
admin_actions
access_events
publication_events
```

Use relational columns for identity, ownership, statuses, dates, money, units, and references. JSONB is appropriate for calculator-specific validated payloads, snapshots, breakdowns, and source-specific raw data.

## 14. External Data Pipeline

PriceLK, PriceHistory, BuildPrice, MedPrice, EduCompare, AgroPrice, CostOfLiving, and Freelancer exchange rates require a shared ingestion pattern:

```text
External source
    |
    v
Immutable import record
    |
    v
Schema validation
    |
    v
Entity and unit normalization
    |
    v
Duplicate and conflict detection
    |
    v
Timestamped observation
    |
    v
Current projection and search index
```

Each observation should include:

- Source and external identifier
- Import and observation time
- Canonical entity and source-specific entity
- Location, retailer, supplier, institution, pharmacy, or market
- Unit, package size, grade, dosage, or strength
- Regular and promotional values
- Promotion validity
- Availability
- Validation status
- Freshness deadline
- Correction or superseding record

Never silently display stale external data. Product-specific policies should either label, downgrade, or suppress stale observations.

## 15. Authentication, Authorization, And Privacy

- Keep public calculations and searches anonymous where possible.
- Require authentication for saves, reminders, reports, subscriptions, API keys, and organization data.
- Do not persist anonymous calculator inputs by default.
- Start with a low-friction established authentication solution rather than building password and recovery flows.
- Use server-side ownership checks for every private record.
- Support user and administrator roles initially.
- Add reviewer, organization owner, organization member, payroll operator, and accountant roles when required.
- Require stronger authorization and re-authentication for rule publication, API-key management, and sensitive exports.
- Redact financial, employment, health, complaint, and document data from logs.
- Encrypt sensitive documents and credentials.
- Define retention and deletion for every sensitive domain.
- Account deletion should remove personal saves, reminders, sessions, API keys, and organization associations where allowed.
- Preserve non-personal rule and audit history while removing personal associations where appropriate.

## 16. Public API And Widgets

Initial API groups:

```text
GET    /api/v1/calculators
GET    /api/v1/calculators/{calculator}
POST   /api/v1/calculations/{calculator}

GET    /api/v1/saved-calculations
POST   /api/v1/saved-calculations
GET    /api/v1/saved-calculations/{id}
DELETE /api/v1/saved-calculations/{id}

GET    /api/v1/reminders
POST   /api/v1/reminders
PATCH  /api/v1/reminders/{id}
DELETE /api/v1/reminders/{id}
```

Future product APIs should be grouped by bounded domain rather than added to a generic data endpoint.

Requirements:

- Version the API contract separately from formulas and rules.
- Use calculator-specific request and response schemas.
- Use hashed API keys with visible prefixes, scopes, status, and rotation.
- Apply per-client quotas and rate limits.
- Meter B2B and widget usage.
- Restrict widgets by allowed domains.
- Return structured error codes.
- Log request metadata and versions without logging sensitive inputs.
- Do not expose endpoints that execute user-provided formulas.
- Define deprecation windows before changing a public contract.

## 17. Admin Application

The protected admin should support:

- Creating, cloning, validating, and publishing rule versions
- Attaching official sources and verification dates
- Comparing draft and active calculation results
- Scheduling future-effective rules
- Retiring versions
- Creating and versioning government and complaint guidance
- Maintaining translations and marking stale translations
- Reviewing import failures, entity matches, and stale observations
- Managing reminder failures
- Managing partner, API, widget, sponsorship, and lead configurations later
- Viewing immutable audit history

The admin must not become a general-purpose formula programming environment. It manages structured parameters and content for code-owned behavior.

## 18. Reminders And Alerts

Use PostgreSQL and scheduled platform invocations initially:

1. A protected scheduler endpoint finds due deliveries.
2. A unique database key claims each reminder, alert, channel, and scheduled time once.
3. The delivery attempt is recorded before contacting the provider.
4. Transient failures retry with bounded backoff.
5. Permanent failures are surfaced in administration.
6. Unsubscribe and disabled-account state are checked immediately before delivery.

Store the user's timezone, defaulting Sri Lankan users to `Asia/Colombo`. Represent obligations that are date-based as dates rather than arbitrary UTC timestamps.

The same delivery foundation can support:

- Deadline reminders
- Compliance reminders
- Tax-calendar reminders
- Price-drop alerts
- Medicine availability alerts if later approved
- Report completion messages

## 19. Search And Localization

### Search

```text
PostgreSQL full-text search
        |
        v
Product-specific aliases and normalization
        |
        v
Dedicated search only if PostgreSQL becomes insufficient
```

Search quality depends on domain identity and aliases more than infrastructure. Product, medicine, material, institution, crop, and government-service matching require separate normalization rules.

### Localization

- Support English, Sinhala, and Tamil content records.
- Version translations with source content.
- Track draft, reviewed, published, and stale translation states.
- Localize explanations, examples, guidance, FAQs, errors, warnings, and calculation descriptions.
- Preserve familiar terms such as EPF, ETF, APIT, VAT, TIN, and API where appropriate.
- Fall back to English when a reviewed translation is unavailable.
- Mark translations stale when the underlying rule, source, or content changes.

## 20. Monetization Capabilities

| Model | Applicable products | Required backend |
|---|---|---|
| Advertising | Calculators, guides, complaints, cost-of-living, price information | Placement controls, consent, and direct-campaign reporting if needed |
| Lead generation | Loans, leasing, insurance, solar, construction, education, vehicles, recruitment | Consent, partner routing, attribution, delivery logs, retention |
| Subscriptions | SME Compliance, FreelancerLK, premium reminders, advanced planning | Plans, trials, entitlements, billing, cancellation, grace periods |
| Premium reports | LankaCalc, WorkMoney, BuildPrice, VehicleCost | Payment entitlement, report jobs, immutable input versions, storage |
| Premium alerts | PriceLK, PriceHistory, LankaDeadline | Entitlements, schedules, preferences, delivery logs |
| Affiliates | PriceLK, PriceHistory, education and commercial products | Tagged links, campaigns, click attribution |
| Sponsorship | Calculators, offers, suppliers, institutions, retailers | Date ranges, approval, clear labels, separation from organic results |
| B2B APIs | Salary, tax, prices, government normalization, vehicles | Keys, quotas, metering, billing, deprecation policy |
| Widgets | Banks, HR, finance, construction, solar | Tenant settings, domains, branding, attribution, usage metering |
| B2B analytics | Price and market products | Customer access, aggregation, exports, dataset versions |
| Quotations | BuildPrice | Supplier onboarding, requests, offers, expiry, fraud, disputes |

Do not build the complete commercial layer before a product demonstrates real demand. Paid promotion must never silently alter calculated results, organic rankings, cheapest options, or guidance.

## 21. Safety And Trust Controls

### Regulatory Correctness

Highest-risk domains include APIT, EPF, ETF, gratuity, OT, payroll, electricity tariffs, Customs, vehicle duties, tax estimates, government procedures, and complaint routing.

Required controls:

- Effective-dated versions
- Official-source evidence
- Review and publication audit
- Golden and historical fixtures
- Visible provenance
- Correction without rewriting history

### Data Freshness

Highest freshness risk includes medicine stock, grocery offers, agricultural prices, construction prices, course intakes, exchange rates, government forms, and official links.

Every displayed value should have a source and observation or verification date. Stale-data behavior must be explicit per product.

### User Harm

- MedPrice must not provide diagnosis, treatment, or unsafe substitution advice.
- Agricultural forecasts must show uncertainty and historical accuracy.
- Construction and steel calculators must not imply engineering approval.
- Affordability and ownership-cost tools must be described as estimates.
- Government and complaint products must direct users to official authorities.
- Reminder products must not guarantee legal compliance or delivery.
- Sponsored results must remain distinct from organic recommendations.

## 22. Operations And Security

- Keep database, authentication, email, payment, scheduler, and partner secrets server-only.
- Validate environment configuration at application startup and deployment.
- Run database migrations as a controlled deployment step, not during request handling.
- Enable managed PostgreSQL backups and point-in-time recovery before storing user data.
- Add structured request IDs and domain-specific version metadata to logs.
- Do not include raw sensitive inputs in logs or error reports.
- Use database constraints for ownership, uniqueness, statuses, effective ranges, and delivery idempotency.
- Rate-limit anonymous calculations, searches, login attempts, and public APIs.
- Record security-sensitive administration and export operations.
- Monitor rule publication, ingestion failures, stale sources, delivery failures, API abuse, and report jobs.
- Define recovery procedures before introducing payroll, compliance, health, or document storage.

## 23. Verification Strategy

### Calculations

- Unit-test every formula with verified examples.
- Cover zero values, invalid ranges, thresholds, effective-date transitions, and rounding order.
- Preserve regression fixtures for every published regulated version.
- Property-test invariants such as non-negative deductions and consistent totals.
- Test net-to-gross convergence and ambiguous results.
- Test unit conversions independently.

### Rules And Content

- Integration-test publication transactions and effective-range overlap prevention.
- Verify that published records cannot be edited.
- Test source and verification requirements.
- Test decision graphs for loops, unreachable nodes, and missing outcomes.
- Check official links and stale translations.

### External Data

- Contract-test every source adapter.
- Test duplicate handling and replay safety.
- Test product, package, unit, medicine, material, course, crop, and market normalization.
- Test stale-data suppression and correction history.
- Test basket optimization with missing and unavailable items.
- Backtest forecasts before publication.

### Accounts And Operations

- Test ownership and organization isolation.
- Test role changes and administrative permissions.
- Test reminder idempotency, retries, timezones, and unsubscribe behavior.
- Test API-key rotation, revocation, scopes, quotas, and domain restrictions.
- Test account deletion and retention behavior.
- End-to-end test anonymous calculation, account saves, administration, API use, and reminders.

## 24. Delivery Roadmap

### Phase 0: Product And Rule Specifications

1. Define the exact LankaCalc launch calculators.
2. Complete the calculator specification contract for each selected calculator.
3. Identify official authorities and source documents.
4. Define rounding, dates, assumptions, warnings, and golden fixtures.
5. Define privacy, retention, notification, and administrative responsibilities.

### Phase 1: Technical Foundation

1. Scaffold Next.js, TypeScript, PostgreSQL, migrations, environment validation, and CI.
2. Implement the framework-independent calculation domain.
3. Add decimal and unit handling.
4. Add result provenance and source metadata.
5. Implement age, percentage, compound interest, area, Loan EMI, and fuel-consumption calculators.
6. Keep static calculations anonymous and browser-first.

### Phase 2: Regulated LankaCalc

1. Implement the rule and source registry.
2. Build the protected administration and publication lifecycle.
3. Implement APIT, EPF, ETF, salary, and take-home calculators.
4. Add effective-date resolution and historical calculations.
5. Add the public calculation API.
6. Verify every regulated result against official fixtures.

### Phase 3: Accounts And WorkMoney

1. Add authentication and explicitly saved calculation snapshots.
2. Add net-to-gross, gratuity, OT, salary increment, and loan affordability after their specifications are approved.
3. Implement current-job and new-job scenarios.
4. Implement job-offer comparison and annual financial improvement.
5. Add reports and reminders.
6. Validate traffic, trust, retention, maintenance cost, and monetization.

### Phase 4: Remaining LankaCalc Families

1. Add detailed loan and lease scenarios.
2. Add electricity tariffs.
3. Add Customs and vehicle-import duties.
4. Add fuel-price and solar assumptions.
5. Add construction quantity calculators.
6. Define business and general tax scope before implementing them.

### Phase 5: Lowest-Operational-Risk Expansion

1. Build GovGuide's versioned content and decision trees.
2. Add government services incrementally based on verified content capacity.
3. Build LankaDeadline and connect reminders to GovGuide actions.
4. Add ComplaintLK only after authority and escalation content is verified.

### Phase 6: Commercial Expansion Tracks

Choose one track based on validated demand rather than starting all tracks together.

| Track | Sequence |
|---|---|
| Consumer prices | PriceLK product search -> PriceHistory -> alerts -> basket optimizer |
| Business SaaS | SME Compliance -> FreelancerLK |
| Construction | Quantity calculators -> prices -> project estimates -> reports -> quotations |
| Vehicle | Ownership calculator -> comparisons -> reports -> partner leads |
| Lifestyle | CostOfLiving -> location comparison -> required-salary integration |
| Education | Course catalog -> comparison -> independent lead routing |

### Phase 7: High-Risk Data Products

1. Add AgroPrice only after reliable daily regional data exists.
2. Add forecasts only after model versioning, backtesting, and confidence reporting exist.
3. Add MedPrice only after pharmacy partnerships, reliable inventory feeds, identity controls, medical review, and safety processes exist.

## 25. Expansion Gates

Do not begin another major product until the active vertical demonstrates:

1. Users need it.
2. Users can discover it.
3. Users return.
4. Rules and external data can be maintained.
5. Monetization is plausible.
6. Source verification is sustainable.
7. Operational incidents are manageable.
8. The next product can reuse proven capabilities without coupling unrelated domains.

## 26. Explicit Non-Goals For The First Release

- Building every product in the research
- Microservices
- A database-driven formula programming language
- Redis without a measured need
- Dedicated search infrastructure
- Native mobile applications
- Marketplace or quotation operations
- Payments and full subscription billing
- Medical or agricultural predictions
- Full multilingual content before an editorial workflow exists
- Automatic financial, legal, medical, or engineering advice

## 27. Unresolved Decisions

The following must be answered through product and source research before the related implementation begins:

- Exact launch calculators and their official formulas
- Rounding and effective-date rules
- Source authorities and verification cadence
- Data-provider agreements and scraping permissions
- Freshness thresholds for each external dataset
- Notification channels and delivery expectations
- Authentication provider and account-recovery policy
- Organization and accountant access rules
- Document encryption and retention requirements
- Payment provider, plans, currency, taxes, cancellations, and refunds
- Lead fields, consent text, routing contracts, and retention
- Sponsorship and ranking policies
- Translation ownership and review workflow
- Legal, medical, financial, and engineering disclaimer review
- Availability, latency, recovery, and data-residency requirements

These uncertainties should be resolved per product. They do not justify building a generic platform in advance.
