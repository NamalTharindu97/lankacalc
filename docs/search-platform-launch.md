# Search Platform Launch Checklist

This checklist controls the one-time transition from a private production deployment to public indexing and the subsequent Google Search Console and Bing Webmaster Tools setup. It does not authorize launch by itself.

Keep `PUBLIC_INDEXING_ENABLED=false` until every pre-launch gate is evidenced. The sitemap contains only the approved public catalog, but it is reachable while private; page-level `noindex,nofollow` is the pre-launch indexing guard.

## Ownership

Record the following in the restricted operator system:

| Item | Required value |
|---|---|
| Launch owner | Person authorized to enable indexing |
| Technical operator | Person executing DNS and deployment changes |
| Content approver | Native-language approval or explicit English-only decision owner |
| Canonical origin | Exact HTTPS origin, including apex versus `www` decision |
| Redirect origin | Secondary hostname redirected to canonical origin |
| Google property | Domain property and verified owner account |
| Bing site | Verified site and owner account |
| Launch window | UTC start, observation period, and rollback decision time |
| Release revision | Reviewed Git commit deployed at launch |
| Evidence location | Restricted screenshots, reports, and timestamps |

Use organization-controlled accounts with at least two owners and protected recovery methods. Do not rely on a contractor's personal account as the only verified owner.

## Pre-Launch Gates

- [ ] Permanent domain and canonical apex/`www` choice approved.
- [ ] `SITE_URL` and `BETTER_AUTH_URL` equal the canonical HTTPS origin.
- [ ] Cloudflare proxied DNS, Full (strict) TLS, origin certificate, and Caddy route are active.
- [ ] Secondary hostname redirects directly to the canonical origin without a chain.
- [ ] `/api/*`, authentication, saved calculations, reports, reminders, and admin responses are excluded from edge caching.
- [ ] Only SSH, HTTP, and HTTPS are publicly reachable; PostgreSQL, Next.js, and the private verification port are not publicly exposed.
- [ ] English content is approved, and Sinhala/Tamil native-speaker approval is recorded or an explicit English-only launch decision has changed the public locale scope.
- [ ] The public sitemap catalog has been reviewed; no unpublished, regulated, account, admin, saved, reminder, or API route is present.
- [ ] Every regulated calculator remains fail-closed unless its independently reviewed production rule and sources are published.
- [ ] Production monitoring has named operators, active external/host alerts, and tested alert delivery.
- [ ] Encrypted off-server backups are current and a restore exercise is recorded.
- [ ] A pre-launch database backup and application recovery decision are available.
- [ ] Google and Bing ownership verification records can be added without exposing secrets.

Do not use `npm run db:seed:dev-rules` in production. Search launch does not change calculator publication status.

## Rehearsal While Private

With `PUBLIC_INDEXING_ENABLED=false`, deploy the reviewed revision through the guarded private-release procedure and run:

```sh
APP_BASE_URL=http://127.0.0.1:3100 npm run test:private
APP_BASE_URL=https://example.lk npm run test:edge
```

Confirm manually from the public origin:

- HTTPS certificate and canonical hostname;
- `/api/health` and `/api/ready` return successful sanitized responses;
- locale root redirects to `/en`;
- representative English, Sinhala, and Tamil pages return `200`;
- public pages contain `noindex,nofollow` while private;
- `robots.txt` names the canonical host and sitemap;
- `sitemap.xml` contains only approved localized public URLs;
- admin, saved, reminder, and API routes remain excluded from search discovery; and
- Cloudflare does not serve stale metadata from cache.

The public launch contract is expected to fail its indexability assertion while the deployment remains private. The insecure launch-check override is only for loopback rehearsal and is never launch evidence.

## Verify Search Ownership

Complete ownership before enabling indexing so verification is not on the critical launch path.

### Google Search Console

1. Create a Domain property for the registrable domain so all protocols and subdomains are covered.
2. Add Google's DNS TXT verification record in Cloudflare exactly as issued.
3. Keep the TXT record after verification to avoid losing ownership.
4. Add a second organization-controlled owner.
5. Do not submit the sitemap yet.

### Bing Webmaster Tools

1. Import the verified Google Search Console site when appropriate, or add the canonical site directly.
2. If verifying directly, use the issued DNS record rather than a public HTML file containing a reusable token.
3. Add a second organization-controlled administrator.
4. Do not submit the sitemap yet.

Record successful verification, owner accounts, and UTC timestamps. DNS verification records are identifiers rather than application secrets, but changes still require normal DNS review.

## Enable Public Indexing

Public activation is an explicit mode of the guarded release script, not an ordinary private release.

1. Confirm the production checkout is clean and at the recorded reviewed revision.
2. Confirm a current pre-change backup, external probes, and rollback decision owner.
3. Change only `PUBLIC_INDEXING_ENABLED=false` to `PUBLIC_INDEXING_ENABLED=true` in `/etc/lankacalc/production.env`.
4. Run the guarded public release with the reviewed revision and canonical origins; do not seed rules.

```sh
sudo EXPECTED_SITE_URL=https://example.lk \
  REDIRECT_FROM_URL=https://www.example.lk \
  PREVIOUS_DEPLOYMENT_VISIBILITY=private \
  ./scripts/deploy-production.sh "$(git rev-parse HEAD)" public
```

For the first public launch, `PREVIOUS_DEPLOYMENT_VISIBILITY=private` ensures rollback verifies the preceding private image under `PUBLIC_INDEXING_ENABLED=false`. Use `public` for later public-to-public releases. The script checks the clean revision and public environment gate, rebuilds with indexing enabled, creates a pre-migration backup, records the previous image and rollback visibility, runs migrations, and executes internal edge plus public launch contracts. Preserve its release record and successful output.

5. Purge only affected HTML/metadata cache entries at Cloudflare if caching configuration requires it, then rerun the launch contract if a stale cached response caused the first public check to fail.

Do not set `ALLOW_INSECURE_LAUNCH_CHECK=true`. Preserve the successful output, sitemap URL count, revision, release record, and UTC timestamp.

## Manual Launch Verification

After the automated contract passes, inspect representative rendered pages and response headers from a clean browser/network:

- canonical URL matches the address and selected host;
- `robots` metadata is `index,follow`, not `noindex`;
- English, Sinhala, Tamil, and `x-default` alternates are reciprocal and correct;
- social image uses the canonical origin and loads as PNG;
- structured data parses and matches visible content;
- source and review information is visible in initial HTML;
- no localhost, loopback, temporary hostname, private IP, or staging origin appears in HTML, headers, sitemap, `robots.txt`, or `llms.txt`;
- authenticated/private pages remain `noindex` and absent from the sitemap; and
- all sitemap URLs return `200` without redirecting.

The launch owner must stop before sitemap submission if any check fails.

## Submit To Search Platforms

Submit only the canonical absolute sitemap URL:

```text
https://example.lk/sitemap.xml
```

### Google Search Console

1. Submit the sitemap under the verified Domain property.
2. Confirm Google can fetch it and reports the expected discovery state.
3. Inspect one English, Sinhala, and Tamil canonical URL with URL Inspection.
4. Request indexing only for a small representative set; discovery should normally proceed through the sitemap and internal links.
5. Record the submission timestamp and reported URL count.

### Bing Webmaster Tools

1. Submit the same canonical sitemap URL.
2. Confirm successful retrieval and record the reported URL count.
3. Inspect representative localized URLs.
4. Do not enable automated submission mechanisms unless separately reviewed and rate-controlled.

Do not submit secondary-host, locale-specific duplicate, staging, API, or private-route sitemaps.

## Observation Schedule

| Time | Required checks |
|---|---|
| First hour | External health/readiness, 5xx, latency, TLS, canonical redirects, indexability metadata, sitemap fetch |
| 24 hours | Google/Bing sitemap status, crawl errors, excluded/private URLs, server errors, security alerts |
| 72 hours | Indexed canonical samples, duplicate/alternate selection, structured-data reports, Core Web Vitals collection status |
| 7 days | Coverage trends, crawl statistics, mobile usability, localized search appearance, unexpected indexed URLs |
| Weekly for first month | Indexing, Core Web Vitals, structured data, crawl failures, 404/redirect anomalies, manual actions, security issues |
| Monthly thereafter | Ownership, sitemap status, indexing deltas, performance trends, stale/removed URLs, and access review |

Normal discovery can take time. Do not change canonicals, generate duplicate pages, or repeatedly resubmit solely because indexing is not immediate.

## Stop And Roll Back Indexability

Stop launch for any of these conditions:

- launch contract failure;
- wrong canonical origin or redirect;
- hidden/private/unreviewed calculator in sitemap or navigation;
- missing native-language approval without an explicit approved scope change;
- sensitive route or user content indexable;
- incorrect regulated result or production rule publication;
- widespread 5xx/readiness failure; or
- monitoring or backup gate found inactive.

To contain indexing:

1. Set `PUBLIC_INDEXING_ENABLED=false` in the production environment.
2. Run `sudo ./scripts/deploy-production.sh "$(git rev-parse HEAD)"` to rebuild and verify the current revision in private mode. Do not rely on recreating the public image because indexing configuration is also present during the Next.js build.
3. Purge affected Cloudflare HTML/metadata cache entries.
4. Run `APP_BASE_URL=https://example.lk npm run test:private` and confirm public pages emit `noindex,nofollow`.
5. Remove the sitemap submission from Google/Bing only when the incident owner determines that continued crawling is harmful; removal is not a substitute for `noindex` or access control.
6. For exposed private URLs, secure/remove the content first, then use platform removal tools for temporary suppression where necessary.
7. Declare and handle calculator correctness, sensitive-data exposure, or prolonged outage under the production incident runbook.

Do not use `robots.txt` disallow as the sole emergency de-indexing control because a blocked crawler may be unable to observe `noindex`.

## Completion Evidence

- [ ] Pre-launch gates approved with named owners.
- [ ] Google Domain property verified with two organization-controlled owners.
- [ ] Bing site verified with two organization-controlled administrators.
- [ ] Reviewed revision activated through guarded public release mode.
- [ ] Public launch contract passed without insecure override.
- [ ] Manual canonical, locale, metadata, structured-data, and privacy checks passed.
- [ ] Canonical sitemap accepted by Google and Bing with expected URL counts.
- [ ] Representative localized URLs inspected.
- [ ] First-hour and 24-hour observations completed without a stop condition.
- [ ] Evidence timestamps and next review owner recorded.

Public search launch is complete only after these items are evidenced. Ownership setup and checklist preparation alone do not authorize indexing.
