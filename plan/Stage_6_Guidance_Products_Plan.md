# Stage 6: Guidance Products — Implementation Plan

## Overview

Stage 6 delivers three interconnected products:

1. **GovGuide** — Government service guidance (NIC, passport, driving licence, etc.)
2. **LankaDeadline** — Renewal and deadline reminders connected to GovGuide actions
3. **ComplaintLK** — Complaint routing to the correct authority

All three share a common **versioned content and decision engine** that must be built first. The delivery order follows the backend plan:

1. Decision engine + content schema
2. GovGuide (NIC first, then incremental services)
3. LankaDeadline (connects to existing reminders + GovGuide)
4. ComplaintLK (reuses decision engine after authority content is verified)

## Architecture

### Shared Decision Engine

The decision engine is a directed graph evaluator that traverses nodes based on user answers and terminates at an outcome node. It is reused by GovGuide (route to the correct procedure), ComplaintLK (route to the correct authority), and potentially future products.

**Core concepts:**

- **Guide** — A versioned entity representing one government service or complaint route
- **Guide version** — An immutable snapshot of a guide's content at a point in time (draft → reviewed → published → retired)
- **Decision tree** — A directed graph attached to a guide version, containing nodes, edges, and outcomes
- **Decision node** — A question or condition step with a type (single-choice, multi-choice, text, date)
- **Decision edge** — A transition from one node to another, conditionally evaluated based on the user's answer
- **Decision outcome** — A terminal result containing documents, fees, steps, offices, links, and escalation info

**Lifecycle:** Mirrors the rule platform pattern — draft → reviewed → published. Published versions are immutable; corrections create new versions.

### Content Model

```
Guide
├── GuideVersion (published)
│   ├── DecisionTree
│   │   ├── DecisionNode[] (questions/conditions)
│   │   ├── DecisionEdge[] (branching transitions)
│   │   └── DecisionOutcome[] (terminal results)
│   ├── ContentSource[] (official references)
│   └── ContentTranslation[] (i18n)
```

## Database Schema

### 6.1 Guides

```sql
guides
  id               uuid PK
  key              text UNIQUE NOT NULL          -- e.g. "nic", "passport", "complaint-telecom"
  product          text NOT NULL                 -- "govguide" | "complaintlk"
  name             text NOT NULL
  description      text NOT NULL
  status           guide_status NOT NULL         -- draft | published | retired
  created_at       timestamptz NOT NULL
  updated_at       timestamptz NOT NULL
```

### 6.2 Guide Versions

```sql
guide_versions
  id               uuid PK
  guide_id         uuid FK guides NOT NULL
  version          text NOT NULL                 -- semver
  status           guide_version_status NOT NULL -- draft | reviewed | published | retired
  effective_from   date NOT NULL
  effective_to     date
  created_by       uuid FK users NOT NULL
  reviewed_by      uuid FK users
  published_by     uuid FK users
  created_at       timestamptz NOT NULL
  updated_at       timestamptz NOT NULL
  UNIQUE (guide_id, version)
```

### 6.3 Decision Trees

```sql
decision_trees
  id               uuid PK
  guide_version_id uuid FK guide_versions NOT NULL
  name             text NOT NULL
  created_at       timestamptz NOT NULL
```

### 6.4 Decision Nodes

```sql
decision_nodes
  id               uuid PK
  tree_id          uuid FK decision_trees NOT NULL
  key              text NOT NULL                 -- stable key for translations
  type             decision_node_type NOT NULL   -- single-choice | multi-choice | text | date
  question         text NOT NULL                 -- English source text
  sort_order       integer NOT NULL
  created_at       timestamptz NOT NULL
  UNIQUE (tree_id, key)
```

### 6.5 Decision Edges

```sql
decision_edges
  id               uuid PK
  tree_id          uuid FK decision_trees NOT NULL
  from_node_id     uuid FK decision_nodes
  to_node_id       uuid FK decision_nodes
  to_outcome_id    uuid FK decision_outcomes
  condition        jsonb NOT NULL               -- { "answer": "value" } or { "answers": ["a","b"] }
  sort_order       integer NOT NULL
  created_at       timestamptz NOT NULL
```

Each edge either leads to another node (question) or to an outcome (terminal). Exactly one of `to_node_id` and `to_outcome_id` must be set.

### 6.6 Decision Outcomes

```sql
decision_outcomes
  id               uuid PK
  tree_id          uuid FK decision_trees NOT NULL
  key              text NOT NULL
  title            text NOT NULL
  documents        jsonb NOT NULL DEFAULT '[]'  -- [{ "name": "...", "required": true, "note": "..." }]
  fees             jsonb NOT NULL DEFAULT '[]'  -- [{ "name": "...", "amount": "..." }]
  steps            jsonb NOT NULL DEFAULT '[]'  -- [{ "order": 1, "text": "...", "url": "..." }]
  offices          jsonb NOT NULL DEFAULT '[]'  -- [{ "name": "...", "address": "...", "hours": "..." }]
  forms            jsonb NOT NULL DEFAULT '[]'  -- [{ "name": "...", "url": "..." }]
  links            jsonb NOT NULL DEFAULT '[]'  -- [{ "label": "...", "url": "..." }]
  escalation       jsonb                        -- ComplaintLK only: [{ "level": 1, "authority": "...", "procedure": "..." }]
  note             text
  created_at       timestamptz NOT NULL
  UNIQUE (tree_id, key)
```

### 6.7 Content Sources

```sql
content_sources
  id               uuid PK
  guide_version_id uuid FK guide_versions NOT NULL
  key              text NOT NULL
  authority        text NOT NULL
  title            text NOT NULL
  url              text NOT NULL
  published_on     date
  verified_at      timestamptz
  created_at       timestamptz NOT NULL
```

### 6.8 Content Translations

```sql
content_translations
  id               uuid PK
  entity_type      text NOT NULL                 -- "node" | "outcome"
  entity_id        uuid NOT NULL                 -- FK to decision_nodes or decision_outcomes
  locale           text NOT NULL                 -- "si" | "ta"
  field            text NOT NULL                 -- "question" | "title" | "note" | "text"
  value            text NOT NULL
  status           translation_status NOT NULL   -- draft | reviewed | published | stale
  created_at       timestamptz NOT NULL
  updated_at       timestamptz NOT NULL
  UNIQUE (entity_type, entity_id, locale, field)
```

### 6.9 Guide Validation Fixtures

```sql
guide_validation_fixtures
  id               uuid PK
  guide_version_id uuid FK guide_versions NOT NULL
  name             text NOT NULL
  answers          jsonb NOT NULL                -- { "node-key": "answer-value", ... }
  expected_outcome text NOT NULL                 -- expected outcome key
  created_at       timestamptz NOT NULL
  UNIQUE (guide_version_id, name)
```

## Service Layer

### Guide Service (`src/server/guides/service.ts`)

| Function | Purpose |
|---|---|
| `createGuide` | Register a new guide |
| `createDraft` | Create a new draft version from scratch or by cloning published |
| `attachTree` | Attach a decision tree to a draft version |
| `addNode` / `updateNode` / `removeNode` | CRUD on decision nodes |
| `addEdge` / `updateEdge` / `removeEdge` | CRUD on decision edges |
| `addOutcome` / `updateOutcome` | CRUD on decision outcomes |
| `attachSource` | Link an official source to a guide version |
| `validateTree` | Check for cycles, unreachable nodes, missing outcomes, orphan edges |
| `runFixtures` | Execute validation fixtures against a draft version |
| `review` | Mark draft as reviewed |
| `publish` | Publish reviewed version, retire previous |
| `getPublishedGuide` | Resolve the published version and its full decision tree |
| `evaluateTree` | Traverse a decision tree given user answers, return the outcome |

### Decision Engine (`src/server/guides/decision-engine.ts`)

The evaluator is a pure function:

```ts
function evaluateTree(
  tree: DecisionTree,
  answers: Record<string, string | string[]>,
): DecisionOutcome
```

Algorithm:
1. Start at the root node (the one with no incoming edges).
2. At each node, look up the user's answer for that node's key.
3. Find the matching edge (where the condition matches the answer).
4. Follow the edge to the next node or outcome.
5. If no matching edge, return an "unresolved" outcome that directs to official support.

### Graph Validator (`src/server/guides/validator.ts`)

Checks performed on every draft version before review:
- No cycles (topological sort succeeds)
- Every non-terminal node has at least one outgoing edge
- Every edge leads to either a valid node or a valid outcome
- Every node is reachable from the root
- Every outcome is reachable from the root
- Every edge's condition references a valid answer value
- Validation fixtures pass

## API Routes

### Public API

```
GET    /api/v1/guides                        -- list published guides by product
GET    /api/v1/guides/{key}                  -- get published guide + decision tree
POST   /api/v1/guides/{key}/evaluate         -- submit answers, get outcome
```

### Admin API

```
GET    /api/admin/guides                     -- list all guides (all statuses)
POST   /api/admin/guides                     -- create guide
GET    /api/admin/guides/{key}               -- get guide with all versions
POST   /api/admin/guides/{key}/versions      -- create draft version
PATCH  /api/admin/guides/{key}/versions/{v}  -- update version metadata
POST   /api/admin/guides/{key}/versions/{v}/publish -- publish version
GET    /api/admin/guides/{key}/versions/{v}/validate -- run validation
```

Decision tree CRUD is nested under the draft version:

```
GET    /api/admin/guides/{key}/versions/{v}/tree
PUT    /api/admin/guides/{key}/versions/{v}/tree
GET    /api/admin/guides/{key}/versions/{v}/nodes
POST   /api/admin/guides/{key}/versions/{v}/nodes
PATCH  /api/admin/guides/{key}/versions/{v}/nodes/{node}
DELETE /api/admin/guides/{key}/versions/{v}/nodes/{node}
GET    /api/admin/guides/{key}/versions/{v}/edges
POST   /api/admin/guides/{key}/versions/{v}/edges
PATCH  /api/admin/guides/{key}/versions/{v}/edges/{edge}
DELETE /api/admin/guides/{key}/versions/{v}/edges/{edge}
GET    /api/admin/guides/{key}/versions/{v}/outcomes
POST   /api/admin/guides/{key}/versions/{v}/outcomes
PATCH  /api/admin/guides/{key}/versions/{v}/outcomes/{outcome}
```

## UI Pages

### GovGuide (`/guides`)

- **Guide index** — List of published guides by category (government services, complaint routing)
- **Guide wizard** — Step-by-step questionnaire with back/forward navigation
- **Outcome page** — Documents, fees, steps, offices, links, official disclaimer

### LankaDeadline (`/deadlines`)

- **Deadline dashboard** — List of obligation types (passport, licence, insurance, etc.)
- **Create deadline** — Select obligation type, enter expiry date
- **Connected actions** — Each deadline links to the relevant GovGuide guide
- Integrates with the existing `/reminders` infrastructure

### ComplaintLK (`/complaints`)

- **Category selection** — 7 complaint categories
- **Complaint wizard** — Decision tree that routes to the correct authority
- **Outcome page** — Authority, procedure, evidence checklist, official links, escalation sequence

### Admin (`/admin/guides`)

- Guide list with status badges (draft/reviewed/published/retired)
- Decision tree visual editor (node/edge/outcome CRUD)
- Validation results display
- Source attachment and link verification

## Milestones

### Milestone 1: Decision Engine Foundation (estimated 1 PR)

**Scope:** Database schema, guide service, decision engine, graph validator, API routes.

- [ ] Create database migration for 9 tables
- [ ] Implement guide service with full CRUD lifecycle
- [ ] Implement decision engine evaluator (pure function)
- [ ] Implement graph validator (cycle detection, reachability, fixture execution)
- [ ] Implement public API (`GET /guides`, `GET /guides/{key}`, `POST /guides/{key}/evaluate`)
- [ ] Implement admin API (guide/version CRUD, tree CRUD, validation, publish)
- [ ] Write unit tests for decision engine, graph validator, and service
- [ ] Write API contract tests for public and admin routes
- [ ] `npm run verify` passes

**Exit criteria:** Schema migrated, decision engine evaluates correctly, graph validator catches invalid structures, admin can create and publish a guide via API.

### Milestone 2: GovGuide — First Service (estimated 1-2 PRs)

**Scope:** Admin UI for guide authoring, public GovGuide wizard UI, first 3 services (NIC, passport, driving licence).

- [ ] Seed 3 GovGuide guides with decision trees (NIC, passport, driving licence)
- [ ] Build admin guide list page with status management
- [ ] Build admin decision tree editor (create/edit nodes, edges, outcomes)
- [ ] Build public guide index page (`/guides`)
- [ ] Build guide wizard component (step-by-step with back/forward)
- [ ] Build outcome page (documents, fees, steps, links)
- [ ] Add official "guidance layer" disclaimer on all public pages
- [ ] Add source verification and last-verified display
- [ ] Write fixture tests for each seeded guide
- [ ] `npm run verify` passes

**Exit criteria:** A user can visit `/guides`, select "NIC", answer questions, and receive a personalized document checklist with fees, steps, and official links. Admin can author guides through the UI.

### Milestone 3: GovGuide — Remaining Services (estimated 1-2 PRs)

**Scope:** Add remaining 7 services (revenue licence, birth/marriage/death certificates, police clearance, TIN, business registration, EPF/ETF procedures, vehicle ownership).

- [ ] Seed 7 additional guides with decision trees
- [ ] Add guide category grouping (identity, finance, vehicles, etc.)
- [ ] Add guide search/filter by category
- [ ] Validate all guides with fixtures
- [ ] `npm run verify` passes

**Exit criteria:** All 13 GovGuide services are published and searchable. Each has passing fixtures.

### Milestone 4: LankaDeadline (estimated 1 PR)

**Scope:** Obligation catalog, deadline management, GovGuide integration.

- [ ] Define obligation type catalog (passport, licence, insurance, emission, service, certification, domain, SSL, rent, business)
- [ ] Extend reminders system with guide-aware action URLs
- [ ] Build deadline management UI (create deadline → select obligation → enter date)
- [ ] Connect each obligation type to its GovGuide action page
- [ ] Add 30/7/1 day default offset configuration
- [ ] Ensure reminder emails include GovGuide link
- [ ] Write tests for deadline-to-guide linking
- [ ] `npm run verify` passes

**Exit criteria:** A user can create a passport expiry deadline, receive reminders at 30/7/1 days, and click through to the GovGuide passport renewal guide.

### Milestone 5: ComplaintLK (estimated 1-2 PRs)

**Scope:** Complaint routing decision trees for all 7 categories.

- [ ] Seed 7 complaint routing guides with verified authority and escalation content
- [ ] Build complaint category index page (`/complaints`)
- [ ] Build complaint wizard (reuse guide wizard component)
- [ ] Build complaint outcome page (authority, procedure, evidence, links, escalation)
- [ ] Add escalation sequence display
- [ ] Write fixture tests for each complaint guide
- [ ] `npm run verify` passes

**Exit criteria:** A user can visit `/complaints`, select "Telecommunications", answer questions, and receive the responsible authority, complaint procedure, evidence checklist, and escalation sequence.

## Execution Order

| Order | Milestone | Branch pattern | Dependencies |
|---|---|---|---|
| 1 | Decision engine foundation | `stage-6/decision-engine` | None |
| 2 | GovGuide first services | `stage-6/govguide-first-services` | Milestone 1 |
| 3 | GovGuide remaining services | `stage-6/govguide-remaining` | Milestone 2 |
| 4 | LankaDeadline | `stage-6/lankadeadline` | Milestone 2 |
| 5 | ComplaintLK | `stage-6/complaintlk` | Milestone 1 (can parallel with 3-4) |

Milestones 3 and 4 can proceed in parallel after Milestone 2 completes. Milestone 5 depends only on Milestone 1 and can begin after Milestone 2 if capacity allows.

## Exit Criteria (Stage 6)

- [ ] All 13 GovGuide services published with passing fixtures
- [ ] LankaDeadline connects reminders to GovGuide action pages
- [ ] All 7 ComplaintLK categories published with verified authority content
- [ ] Broken links and stale guides create operator alerts
- [ ] The platform does not claim government or legal authority
- [ ] Decision graphs pass structural and scenario tests
- [ ] English, Sinhala, and Tamil translation keys are defined (translations can be incremental)
- [ ] `npm run verify` passes at each milestone

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Content accuracy — guidance must match current official procedures | Seed only verified content; link to official sources; display last-verified date; stale content alerts |
| Legal claims — platform must not present as government | Prominent disclaimer on every guide page, in email templates, and in the admin interface |
| Graph complexity — decision trees may become large | Graph validator catches structural issues; validation fixtures test end-to-end scenarios; visual admin editor |
| Content authoring bottleneck — 13 services + 7 complaint routes require significant research | Start with the most-requested services (NIC, passport, licence); add incrementally; each service is an independent guide |
| Translation scope — 3 languages × all guide content | Define translation keys first; translate incrementally; fall back to English when translation unavailable |
