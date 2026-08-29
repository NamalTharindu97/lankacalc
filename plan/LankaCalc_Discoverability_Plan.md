# LankaCalc GUI, SEO, and AI Search Implementation Plan

## 1. Purpose

This plan turns LankaCalc's public calculator launch into a useful, accessible, and citable product for human visitors, traditional search engines, and AI answer engines.

The first public scope remains the 13 calculators with `execution === "browser"`. Server-authoritative and regulated calculators remain excluded until their rules, sources, fixtures, and review requirements are complete.

## 2. Principles

- The calculator registry remains authoritative for calculator identity, fields, formulas, validation, execution mode, and units.
- Public content must explain executable behavior rather than duplicate or replace it.
- Important content must be server-rendered and understandable without operating the calculator.
- Structured data must describe visible page content.
- English, Sinhala, and Tamil pages must communicate the same facts.
- Anonymous financial inputs must not be logged or sent to analytics.
- Source quality, review dates, assumptions, and exclusions must remain visible.
- Thin keyword pages, hidden content, and speculative AI-search markup are out of scope.

## 3. Delivery Sequence

### Implementation Status (2026-08-29)

| Stage | Status | Evidence and remaining gate |
|---|---|---|
| 1. Shared public GUI | Engineering complete | Keyboard-visible skip navigation, mobile navigation, localized breadcrumbs, focus handling, related calculators, and responsive result presentation are implemented. A 12-route browser matrix across all locales and both themes has no serious or critical automated WCAG findings or 320 px overflow. |
| 2. Typed editorial content | Complete | `CalculatorContent` includes executable fixtures, contributors, review dates, and version-controlled calculation-specification sources. Tests reject unknown calculator references and fixture drift. |
| 3. Enrich 13 calculators | Engineering complete; indexing gate open | All 13 browser calculators have equivalent English, Sinhala, and Tamil content. Native-speaker approval of Sinhala and Tamil remains mandatory before indexing. |
| 4. Structured data and SEO | Pre-launch engineering complete | The sitemap contains 78 localized public routes. Canonical, reciprocal `hreflang`, social metadata, and schema parity are test-enforced. Mobile Lighthouse performance is 97-99 and desktop performance is 100; accessibility, best practices, and SEO are 100 in the expanded representative matrix. |
| 5. Authority and trust | Complete for launch scope | Eight localized trust pages are linked from the footer. Regulated provenance remains a publication gate because regulated calculators are not in public scope. |
| 6. AI answer readiness | Complete for launch scope | `llms.txt` is conservative. The launch verifier requires server-rendered answer, formula, example, limitation, contributor, source, and review sections on every calculator and exact representative answer text across all four categories. |
| 7. Public domain launch | Blocked | Requires the permanent hostname and canonical variant, Cloudflare and Caddy activation, native-language approval, search-platform setup, and the final indexed `test:launch` run. Production remains private and explicitly `noindex,nofollow`. |
| 8. Remaining calculators | Not approved for publication | Existing candidate specifications and tests are preparatory only. Each calculator must independently pass the source, formula, rule, fixture, translation, and review sequence below. |

Current repository evidence is `main` through PR #56 with 44 test files and 598 tests passing. PRs #40-#56 implement and harden Stages 1-6. The private production deployment remains at the previously verified pre-launch revision until these post-#51 changes are deliberately deployed; this does not change the public launch gate.

### Stage 1: Shared Public GUI Foundation

Deliverables:

- Remove developer-only navigation from the public header.
- Add a keyboard-visible skip link and stable `main` target.
- Add useful mobile navigation instead of hiding all primary navigation.
- Add localized breadcrumbs to category and calculator pages.
- Add clear focus states and anchor scroll offsets.
- Use balanced headings and tabular numerals for result values.
- Add localized related-calculator links.

Exit gate:

- Header, language switching, breadcrumbs, and calculator discovery work on desktop and mobile.
- Keyboard-only navigation reaches all public controls.
- English, Sinhala, and Tamil layouts do not overflow at 320 px width or 200% zoom.
- `npm run verify` passes.

### Stage 2: Typed Calculator Editorial Content

Deliverables:

- Add a version-controlled `CalculatorContent` contract.
- Model direct answers, instructions, formula explanations, worked examples, assumptions, exclusions, common mistakes, FAQs, related calculators, contributors, review dates, and sources.
- Validate calculator references and required content at test time.
- Keep executable formulas in existing calculator definitions.
- Implement Loan EMI as the reference content page.

Exit gate:

- Content cannot reference an unknown calculator.
- Worked examples have fixtures that agree with executable results.
- The Loan EMI page renders useful content in all three locales.
- No structured data exists without matching visible content.

### Stage 3: Enrich All 13 Launch Calculators

Implementation order:

1. Loan EMI
2. Loan affordability
3. Compound interest
4. Tile quantity
5. Paint quantity
6. Concrete quantity
7. Brick and block quantity
8. Steel quantity
9. Roof material quantity
10. Area
11. Fuel consumption
12. Percentage
13. Age

Each page must include:

- A concise direct answer
- What the calculator does
- How to use it
- Formula and variable definitions
- One verified worked example
- Assumptions and exclusions
- Common mistakes
- Genuine frequently asked questions
- Related calculators
- Review date and responsible contributor
- Primary sources when the subject requires them

Exit gate:

- All 13 English pages satisfy the content contract.
- Sinhala and Tamil content receives native-speaker review before indexing.
- Worked examples agree with executable formulas.
- No generic text is repeated as a substitute for calculator-specific guidance.

### Stage 4: Structured Data and Technical SEO

Deliverables:

- Preserve locale-specific canonicals and reciprocal `hreflang` links.
- Add `BreadcrumbList` to category and calculator pages.
- Add `WebPage` metadata with language and review date.
- Add `ItemList` to category pages.
- Add `FAQPage` only when visible FAQs are present.
- Add `HowTo` only where visible procedural steps justify it.
- Add organization/editorial identity and social preview images.
- Keep account, admin, API, reminder, saved, and unpublished calculator routes out of the sitemap.
- Add tests for canonical URLs, alternates, indexability, and structured-data parity.

Exit gate:

- Structured-data validation reports no critical errors.
- Every sitemap URL returns 200 after redirects.
- Canonical and `hreflang` graphs are reciprocal.
- Lighthouse targets are at least 90 performance, 95 accessibility, 95 SEO, and 95 best practices on representative pages.

### Stage 5: Authority and Trust Pages

Deliverables:

- About LankaCalc
- Calculation methodology
- Editorial and review policy
- Source policy
- Privacy policy
- Terms and disclaimers
- Contact and correction process
- Calculator update history

Exit gate:

- Trust pages are localized and linked from the footer.
- Review ownership and correction procedures are explicit.
- Regulated content links to rule provenance and effective dates.

### Stage 6: AI Answer-Engine Readiness

Deliverables:

- Put a direct factual answer near the top of every calculator page.
- Use stable semantic headings for formulas, examples, assumptions, and FAQs.
- Define every formula variable and unit.
- Keep facts, estimates, and limitations clearly separated.
- Ensure important explanatory content is present in initial HTML.
- Make primary citations visible and specific.
- Verify consistency between visible content, JSON-LD, and translations.
- Optionally test `llms.txt` after the core crawlable content is complete; do not treat it as a ranking mechanism.

Exit gate:

- Representative search and AI prompts can extract an accurate answer, formula, limitation, and source from the rendered page.
- No answer depends on hidden content or client-only state.
- Translated pages do not contradict the English source content.

### Stage 7: Public Domain Launch

Deliverables:

- Configure the permanent HTTPS hostname in `SITE_URL` and authentication settings.
- Configure Cloudflare DNS, proxying, certificate, caching, and security rules.
- Activate shared Caddy ingress without exposing the internal verification port.
- Verify canonical host redirects.
- Configure Google Search Console and Bing Webmaster Tools.
- Submit the sitemap only after translation review.
- Monitor indexing, Core Web Vitals, structured-data errors, server errors, and crawl failures.

Exit gate:

- Production health, readiness, edge, canonical, and sitemap checks pass.
- Search platforms accept the sitemap.
- No local or temporary origin appears in public metadata.

### Stage 8: Publish Remaining Calculators Safely

For each server-authoritative or regulated calculator:

1. Verify official sources.
2. Review formulas, effective dates, units, and rounding.
3. Publish versioned rules and provenance.
4. Add golden fixtures.
5. Complete the editorial content contract.
6. Complete and review all translations.
7. Add the page to navigation and sitemap only after approval.

Suggested publication order:

1. EPF and ETF
2. Salary and take-home pay
3. APIT
4. Electricity bills
5. Fuel cost
6. Loan schedule and lease
7. Gratuity and overtime
8. Business and tax calculators
9. Vehicle import duty
10. Solar cost

## 4. Verification Requirements

Every delivery slice must run:

```bash
npm run verify
docker compose up -d --build
```

Before production launch, also run:

```bash
npm run test:edge
```

Browser verification must cover:

- English, Sinhala, and Tamil homepages
- A category page in each locale
- Representative financial and construction calculators
- Mobile and desktop widths
- Keyboard navigation
- Light and dark themes
- Canonical, `hreflang`, JSON-LD, robots, and sitemap output

## 5. Pull Request Breakdown

Use one coherent PR per slice:

1. Public navigation, accessibility, and breadcrumbs
2. Calculator content contract and Loan EMI reference page
3. Financial calculator content
4. Construction calculator content
5. Everyday and travel calculator content
6. Related calculators and category enrichment
7. Structured data and metadata expansion
8. Authority and trust pages
9. Native-speaker translation corrections
10. Permanent-domain launch configuration

## 6. Current Work

Completed in the current discoverability sequence:

- Category-specific trilingual descriptions, use cases, limitations, and calculator-selection guidance
- Full public-scope editorial provenance with contributors and version-controlled specification sources
- Keyboard, 320 px reflow, light-theme contrast, dark-theme, locale, and representative automated accessibility checks
- Initial-HTML answer extraction checks in the fail-closed launch verifier
- Comprehensive structured-data parity and URL validation across every locale and public entity
- Expanded mobile and desktop Lighthouse checks for home, category, calculator, and trust routes

Remaining work that does not authorize indexing:

- Audit unpublished calculators against the Stage 8 readiness sequence without adding them to navigation or sitemap
- Improve repeatable private-production deployment, rollback, and verification tooling
- Deploy the completed pre-launch changes while preserving `PUBLIC_INDEXING_ENABLED=false`

External launch gates remain unchanged: obtain the permanent domain and canonical decision, configure Cloudflare and shared Caddy, complete Sinhala and Tamil native-speaker review, run the indexed launch contract, and only then submit the sitemap to search platforms.
