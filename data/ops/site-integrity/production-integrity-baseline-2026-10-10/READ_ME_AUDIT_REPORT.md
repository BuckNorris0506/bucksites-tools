# BuckParts — Production Site Integrity Baseline
## Release decision: SITE_INTEGRITY_FIXES_REQUIRED

**Do not deliberately increase distribution yet.** The decision is supported by observed production failures, not merely by unavailable credentials. This is a read-only baseline and a proposed repair set—not an implementation, deployment, data correction, or approval to change links.

**Observation date:** October 10, 2026 UTC (began late October 9 in America/Chicago). Main crawl began approximately 04:28 UTC; browser checks approximately 04:28–04:40 UTC; supplemental checks and reconciliation followed. This is a dated snapshot, not continuous monitoring.

**Repository:** BuckNorris0506/bucksites-tools, pinned to `5f3a595eef81980b4f9f844d8dabad86af2bf537`. Working GitHub integration used for immutable source discovery and acquisition. **Deployed SHA remains UNKNOWN**: no deploy-commit marker was found in the fetched page responses. Source paths below identify proven source behavior and likely repair boundaries, not a proven deployed-code identity.

**Completion boundary:** The discovered production route census, HTTP/asset/link crawl, representative browser checks, source/template analysis, and deduplicated release decision are complete for the captured scope. Exhaustive independent truth verification, undiscovered DB-only orphan enumeration, and end-to-end commercial redirect certification are NOT complete. Unknown is not pass. Those gaps are explicitly represented in every applicable machine-readable record. No proof claim is manufactured to make the audit look finished.

## 1. Requested final results

| # | Requested result | Baseline result |
|---|---|---|
| 1 | SITE_INTEGRITY_GATE | **SITE_INTEGRITY_FIXES_REQUIRED** |
| 2 | Total public routes | **1,343 distinct discovered HTTP-200 content paths**; 3 additional search-query variants tested separately. DB-only undiscovered orphans remain unknown. |
| 3 | Routes by type | Full table below; all recorded in route_inventory.csv. |
| 4 | Technical failure count | **1,343 public pages** depend on missing assets; 40 distinct JS chunks and 1 CSS file return 404. Separately, 12 candidate 404s and 7 candidate 500s; these are not 19 broken public navigation links. |
| 5 | Truth/claim failure count | **127 distinct pages** with confirmed false identity/media/quantity wording or explicitly conflicting template copy. Separate: 21 unsupported current-proof statements and 712 confidence-template exposures—not 712 independently false fits. |
| 6 | Cross-section contradiction count | **7 distinct pages** in the conservative validated set: 2 GSWF-family, 4 pilot, 1 Winix identity contradiction. |
| 7 | Internal broken/misdirected links | **1 broken navigation edge**, plus **4 independently contradicted Winix model/filter fit edges**. All 23,649 ordinary internal anchor occurrences checked for target status; remaining entity semantics are not universally proven. |
| 8 | Total commercial links | **81 CTA occurrences**, **6 unique redirect IDs**, on **64 pages**. |
| 9 | Safe commercial links | **0 certified end-to-end by this audit**. This is not a finding that all 81 are wrong or malicious. |
| 10 | Blocked/unsafe commercial links | **81 evidence-insufficient occurrences / 6 IDs blocked from audit clearance**, not removed or changed in production. Proven wrong destination count is unknown. |
| 11 | Total Amazon links | **44 Amazon-intended CTA occurrences / 4 redirect IDs**; no raw Amazon anchor URL exposed in the crawled HTML. |
| 12 | Correctly tagged Amazon links | **Live count UNKNOWN**. Pinned redirect code uses buckparts20-20; five local pure-function cases pass. |
| 13 | Missing/wrong Amazon tags | **UNKNOWN**, not zero and not 44. Internal redirect URLs are not affiliate destination URLs. |
| 14 | Wrong-product retailer destinations | **UNKNOWN** for actual current redirects. Two known Amazon candidates currently contain the expected tokens but are aftermarket, not official. |
| 15 | Analytics state | **SYSTEMIC FAILURE in the sampled browser state**, tied to missing hydration. GA initialized/pageviews not demonstrated; property receipt unknown. Grow/Snowplow traffic does occur. |
| 16 | Ranked systemic roots | R01–R17 below. R02 includes consequences of R01, not a second independent deployment outage. |
| 17 | Page-specific defects | Winix, GE whole-house, 3M AP903/AP910R, Honeywell R; exact affected routes in page_specific_defects.csv. |
| 18 | Exact likely files | Per-root source paths below, with detailed line references in the source reports. |
| 19 | Must repair before distribution | Assets/search/measurement; exposed certainty and proven data defects; navigation; commercial proof gap; origin/sitemap and social image correctness. |
| 20 | Can wait | Cosmetic redesign, content expansion, unrelated architecture, and dormant vertical sorting changes while no corresponding detail pages are public. |
| 21 | Durable regression checks | Extend existing tests, live-site smoke, and deploy gate; detailed below. No new dashboard/scheduler/database/agent framework. |
| 22 | Recommended next action | Approve a narrowly scoped P0 asset/deploy repair first; then the listed truth/navigation fixes and current six-row commercial evidence reconciliation. Re-run before distribution. **No repair has been applied.** |

Counts overlap by design. One page can have asset, claim, and metadata defects; do not sum these into a page total.

## 2. Route census and coverage

The inventory is the union of a fresh production sitemap, repository route generators and complete checked-in principal catalogs, plus internal link discovery to closure. It is not a reused historical route count. The 1,365 requested URLs represent 1,362 distinct paths and three explicit query variants. All 1,138 sitemap URLs returned HTTP 200. There are 205 additional successful paths outside the sitemap; omission alone is not a defect because many are intentionally noindex or utility/trust pages.

| Page family/type | Successful distinct paths |
|---|---:|
| homepage | 1 |
| trust or other | 7 |
| air-purifier landing | 1 |
| air-purifier brand | 18 |
| air-purifier filter | 72 |
| air-purifier model | 572 |
| air-purifier search | 1 |
| appliance-air landing | 1 |
| appliance-air search | 1 |
| refrigerator brand | 5 |
| catalog | 1 |
| refrigerator filter | 57 |
| refrigerator model | 500 |
| help | 6 |
| humidifier landing | 1 |
| humidifier search | 1 |
| search | 1 |
| vacuum landing | 1 |
| vacuum search | 1 |
| whole-house-water landing | 1 |
| whole-house-water brand | 10 |
| whole-house-water filter | 62 |
| whole-house-water model | 21 |
| whole-house-water search | 1 |

**Inventory exceptions and limits**
- `/catalog` → `/brand` is the sole observed ordinary internal navigation target returning 404.
- Two checked-in AP filter candidates are absent live: `/air-purifier/filter/shark-hepa-he1fkbas` and `/air-purifier/filter/vornado-md1-0022`.
- Nine vacuum/humidifier/appliance-air demo brand/model/filter paths return 404. They came from sample CSVs, are not public listings, and are not counted as nine production regressions.
- Seven checked-in `/help/<article>` candidates return 500 on repeat. None is linked from the current crawl or sitemap. Five brand reset routes and the help index return 200; the index is empty and exposes a Supabase implementation placeholder.
- Production contains **300 data-backed pages absent from the complete checked-in principal CSV entity sets**: 285 additional AP models and 15 additional AP filters. This is data divergence, not automatic proof that those pages are wrong. The 984 successful pages with matching repository entities still require current DB parity verification.
- Successful previews exist for vacuum, humidifier, and appliance-air, but no live detail routes were found. Do not manufacture detail-page coverage for those families.
- Actual current database tables could contain unlisted and unlinked routes that neither sitemap nor repo reveals. Supabase discovery failed before a project/database could be established. Absolute absence of further orphans is therefore UNKNOWN.

`page_audit.jsonl` contains a result for every one of the 1,362 distinct attempted paths, including every discovered successful page. `query_variant_results.json` contains the three extra query observations. A rule finding is not a universal certification of all prose on a page. Every data-backed page retains identity/compatibility/classification/provenance uncertainty where evidence does not settle it.

## 3. Production assets, rendering, and search

**The previously observed Next.js issue is currently reproducible, broad, and not resolved in this audit window.** It is not one-route-only: all 1,343 successful content pages reference failing assets; all 23 real-browser route samples exposed failed Next.js requests. Forty distinct Next.js script URLs and one stylesheet return 404, including repeat requests with `Cache-Control: no-cache`. The CSS response is HTML, not CSS. Browser screenshots show default-browser formatting and an oversized unstyled logo; server-rendered text existing is not proof of successful hydration.

A shared chunk also returns 404 on the Netlify alias. That rules out an exclusively `.com` route defect, but does not establish whether the cause is a missing artifact, wrong deployment/static mapping, stale HTML, or CDN/cache skew. **Exact infrastructure root cause remains unknown until deployment artifacts/configuration are inspected.** No-cache requests do not prove every cache layer was bypassed. The missing deployment marker prevents a truthful code-to-live SHA assertion.

Two font failures were observed in browser resource evidence, but no exhaustive per-page font count is claimed. Three icon resources passed. An additional definite defect affects **57 refrigerator filter pages**: their explicit `/opengraph-image` URL returns 404, while the actual static `.png` image URL returns 200.

Actual homepage search interaction from a UTM-tagged landing submitted to `/?q=DA29-00020B`, remained on the homepage, and dropped the UTM query parameters. The source form has no native `action` fallback. Directly navigating `/search?q=DA29-00020B` renders results. Fix the fallback and restore hydration; do not assume a successful HTTP response means search works. URL loss is proven; prior campaign capture loss is not separately proven.

Every successful page had a title, description and H1 in the HTTP scan. **231** lacked a canonical, of which **199** were noindex and **32** were not noindex. Missing canonicals are not proof of deindexing; the indexable set should receive an explicit canonical policy.

## 4. Truth and cross-section findings

### Confirmed facts, not just stylistic preferences
- **Winix 115115** is labeled `Winix Filter H (HEPA)` on **107 pages**, including 104 model pages plus the filter, brand, and AP landing. Manufacturer identifies 115115 as **Filter A**, and 116130 as **Filter H** for 5500-2 and AM80. Those two model pages choose 115115; four forward/reverse public fit links carry this known mismatch. Do not conclude all 104 model associations are wrong from these two checks. The wrong title and broad association expansion need separate repairs.
- **GE FXWPC / FXHTC:** media/interval defects affect **8 pages**. FXWPC is pleated sediment, not carbon. Two filter PDPs say six months versus the manufacturer's three-month guidance. FXHTC does also reduce sediment, so the word “sediment” alone is not classified as a false claim; its interval is the confirmed PDP defect. GXWH20S is assigned the wider FXHTC without support from the exact housing manual; hold that fit recommendation until reconciled.
- **3M AP903 / AP910R:** **4 pages** propagate the wrong carbon-cartridge description, including the AP903 page's dual-stage claim. Manufacturer specifies a single cartridge: AP902→AP910R, AP903→AP917HD, AP904→AP917HD-S. This does not independently disprove every possible physical interchange; it disproves the published standard-configuration/media story.
- **Honeywell R1/R2/R3:** **3 pages** call pack quantities sizes. The manufacturer-branded store describes the same Filter R in different quantities, with unit count depending on purifier model.

### Shared semantics
- `/filter/gswf` and `/filter/gswf2` show compatibility-review warnings yet tell listed-model owners they are “in the right place.” Mutual “Also printed as” aliases imply identity while GSWF2 explicitly says interchangeability/supersession is under review.
- Three pilot filter pages plus the Core400s model page say a checked product page opens even though they display no verified buying link. Their opening/invitation copy must follow final CTA state.
- An executed source probe demonstrates the pilot adapter also erases `browser_truth_checked_at`, causing otherwise valid links to fail the shared gate. Current pilot evidence in the pinned source is already stale, so that code defect is **not asserted to be the sole cause of today's no-link state**.
- **21** refrigerator model pages emit affirmative checked-store proof through a static allowlist without requiring matching current retailer evidence. A historical check may have occurred; the defect is presenting an unqualified proof assertion without an evidence dependency, and potentially applying one part's date to multiple parts.
- **712** live pages expose count-derived high-confidence/original-part patterns. The source builders hardcode OEM and infer confidence from counts; a pure-function probe returns original-part semantics for a compatible subtype. These are **712 template-risk exposures, not 712 independently proven incorrect products**. Neutral association-level wording is required until claim-specific proof is supplied.

The conservative **127-page claim/copy failure union** excludes the 712 broader exposures and the 21 unsupported current-proof statements. The **7-page contradiction subset** is exactly the two GSWF pages, four no-link pilots, and Winix115115's Filter-H title versus Filter-A notes. Other tensions are retained as risk rather than inflated contradiction counts.

## 5. Internal and external navigation

23,649 ordinary internal anchor occurrences were checked against the crawled target status. One exposed edge is broken (`/catalog`→`/brand`). Four known Winix fit edges are semantically wrong even though the destination loads. `internal_links.csv` preserves every occurrence, query parameters and these classifications. The observed internal URLs did not produce unrelated redirects; this does not certify every remaining model association.

All **22 unique direct external reference URLs (41 occurrences)** return HTTP 200. Two are semantically stale after redirect, affecting **4 source pages**:
1. A model-specific RF28NHEDBSR Samsung builder citation now ends at a generic builder page.
2. Samsung's filter-finder citation ends at a general refrigerator-shopping page.

Treat these as broken provenance, not verified wrong-product purchase links. HTTP 200 alone is insufficient for source validity. Other source links, including product pages used as evidence, are **INFORMATIONAL_ONLY** in their BuckParts context; they were not reclassified as commissioned links or tagged merely because the destination sells products.

## 6. Complete exposed-CTA accounting and Amazon audit

All **81 observed commercial CTA occurrences** are enumerated in `commercial_links.csv`, including page, CTA text, retailer, UUID, expected part token, classification and explicit unknown fields. There are only six underlying redirect IDs:

| Family / expected token | Retailer | CTA occurrences | Current destination evidence |
|---|---|---:|---|
| HE15FKPET | Amazon | 5 | Current Amazon UUID not found in inspected source evidence; official Shark source URL is NOT a substitute |
| HE3FKPET | Amazon | 5 | Same current-row gap |
| 4396508 | Amazon | 17 | CSV candidate B00NXPKBQ2 by slug; current UUID binding unproven |
| 4396710 | Amazon | 17 | Historical exact UUID evidence points to B087PDLZL9; current row still unverified |
| MWFP | GE Appliance Parts | 16 | Historical exact UUID evidence points to GE MWFP product page; current row unverified |
| XWFE | GE Appliance Parts | 21 | Historical exact UUID evidence points to GE XWFE product page; current row unverified |

**Why current destination fields remain unknown:** Successful `/go/` GETs write `click_events`. HEAD is not a safe substitute for a GET-based route without proving handler behavior. Neither was called. The connected Supabase discovery request failed with an OAuth `client_secret` error; no alternate database was substituted. No credential refresh was requested. This is a precise limitation, not a reason to pretend all current rows equal CSVs.

Additional direct candidate checks—without following BuckParts redirects—found:
- Amazon B00NXPKBQ2 returns 200 and explicitly identifies **EcoAqua compatible replacement**, literal 4396508, not Whirlpool manufacture.
- Amazon B087PDLZL9 returns 200 and identifies **Waterdrop compatible three-pack**, literal 4396710, not OEM. Historical evidence and later EDR3RXD1-specific HARD_DO_NOT_USE/OEM exclusions need scoped reconciliation; do not silently turn an OEM-only exclusion into a universal ban or revive old proof as current.
- GE MWFP/XWFE identity is readable from fresh external retrieval. Direct sandbox GETs encountered 403 challenge pages, not proven product removal. No current buyability claim is made from that challenge.

These candidate observations prove neither the actual current `/go` Location header nor model-level fit. Thus **0 links receive SAFE_DIRECT_BUY or SAFE_COMPATIBLE_BUY certification**; all 81 receive EVIDENCE_INSUFFICIENT and a release-clearance BLOCK. They are not all labeled WRONG_PRODUCT, and nothing was blocked in the running site.

**Amazon tags:** `src/lib/retailers/go-redirect-gate.ts:15,32–59,150–178` applies `buckparts20-20` only after the buying gate. It canonicalizes `/dp/ASIN` and uses `URLSearchParams.set` to replace/deduplicate tags. Five local source-function checks passed: missing tag, wrong+duplicate tag, already-correct tag, GE unchanged, non-US Amazon unchanged. They test the pinned code, not production deployment. All 44 Amazon-intended occurrences are affiliate-eligible in intent; live correctly-tagged, missing/wrong, redirect-stripped and wrong-destination counts remain UNKNOWN. Do not add tags to opaque internal URLs or informational references.

**Other merchants:** 37 occurrences / 2 GE IDs. No active commission program, tracking contract, or tracking parameter was independently established. Program validity is UNKNOWN, not invalid; official noncommissioned buying paths may be legitimate. No additional monetized merchant was observed in the captured public links.

## 7. Analytics / measurement

The browser sample covers home, catalog, search, refrigerator model/filter/brand, AP landing/search/generic/pilot/model/filter/brand, whole-house landing/model/filter, all three empty preview landings, about, help, and the broken-brand variant. See `runtime_results.json` for exact routes.

GA measurement ID `G-Z2TV02DKPZ` is preloaded, but `window.gtag` and `dataLayer` were absent at observed checkpoints. No executing GA loader or inline initializer was found on the tested homepage. Exposed resource timing did not show GA collect entries, but no full HAR or GA property receipt verification was available; do not claim universal zero events. Grow/Snowplow script and request activity was observed and is distinct from GA4.

The source loads GA with `afterInteractive`; shared missing Next chunks explain the observed initialization failure. Existing refrigerator funnel events include model view, filter view, filter-chip click, filter-detail click and help-open. Their implementation no-ops when gtag is absent. A source race also marks a once-only event consumed before checking whether GA accepted the call; test that after hydration is restored. Search/outbound events and GA pageview receipt have not been certified. No new analytics was built.

**Classification:** prior missing-GA observation is **currently systemic in the sampled broken runtime**, not resolved. Underlying deployment identity and full event delivery remain unknown. Measurement is not sufficient for a distribution release.

## 8. Robots, sitemap, redirects and indexing risk

Verified chain:
- `https://buckparts.com/robots.txt` → 200, Host/Sitemap name `buckparts.netlify.app`.
- The exact advertised Netlify sitemap → 200, no redirect, **the same 1,138-URL set**, all pointing to `buckparts.com`.
- Netlify home and catalog → 200, no redirect to `.com`; catalog canonical points `.com`, homepage has no canonical.
- `www.buckparts.com` homepage → observed 301 to `.com`.
- Seven safety-noindex refrigerator filter pages are nevertheless in the `.com` sitemap.

**Adjudication:** proven metadata/origin and alias-policy inconsistency; potential duplicate-discovery/mixed-signal risk. **Not a demonstrated crawl block**, because the advertised sitemap works and points to the intended host. **Not proven indexing loss**, because Search Console/indexing state was not checked. The Host field itself is not a Google-supported canonicalization instruction; it cannot override canonicals or redirect policy. Therefore neither “harmless, ignore all of it” nor “this is deindexing the site” is justified.

Pinned robots and sitemap both use `getRequiredSiteUrl()` / `NEXT_PUBLIC_SITE_URL`; sitemap is force-dynamic, robots is not. Build/runtime or cached-artifact skew is plausible, but stale configuration is **not proven**. Production robots also includes `/office` disallows absent from pinned source. Verify deployment identity and environment before selecting the smallest fix.

## 9. Ranked deduplicated repair records

Each record below contains its own exact affected-route list in `root_defects.json`. Shared defects are not multiplied into hundreds of independent root causes. Runtime analytics/render/search symptoms under R02 are explicitly linked to asset root R01.

### R01 — P0 — Referenced production assets missing: CSS and all Next JS chunks

- **Category:** SYSTEMIC_ROOT_DEFECT
- **Count/scope:** 1343 listed paths; status OBSERVED.
- **Evidence:** 40 unique JavaScript chunk URLs and 1 CSS URL return404; no-cache repeat also404. Every 200 public page references them. Browser23 routes verifies actual impact. Origin of deployment/HTML asset mismatch not identified.
- **Likely source boundary:** netlify.toml; next.config.mjs; deployment artifact/.next/static serving; scripts/live-site-smoke-check.ts
- **Smallest fix:** Repair deployment artifact/static serving identity; do not redesign pages. Confirm deployed SHA and HTML-to-assets correspondence before promotion.
- **Regression:** Extend live-site-smoke: enumerate every referenced JS/CSS/font per discovered page, require2xx and correct MIME; browser search/render smoke.
- **Examples:** `/`, `/about`, `/air-purifier`, `/air-purifier/brand/airdoctor`, `/air-purifier/brand/alen`

### R02 — P1 — Hydration-dependent GA and interactive search are not operational

- **Category:** MEASUREMENT_DEFECT
- **Count/scope:** 1343 listed paths; status SITEWIDE_DEPENDENCY_EXPOSURE; RUNTIME_CONFIRMED_ON23.
- **Evidence:** Sitewide missing chunks. Browser shows gtag undefined/dataLayer absent across23 sampled routes. Homepage submits to /?q instead of /search and loses UTMs. No GA receipt claim; Grow traffic exists.
- **Likely source boundary:** src/components/AnalyticsScripts.tsx; src/lib/analytics/fridge-trust-funnel.ts; src/components/analytics/FridgeTrustFunnelViewTracker.tsx; src/components/SearchForm.tsx:27
- **Smallest fix:** First restoreR01; give search correct native fallback, preserve intended attribution, then verify natural page_view/search/outbound/view events. Audit event-once initialization race before changing instrumentation.
- **Regression:** Browser smoke with natural navigation and GA requests; no manual injected events. Confirm existing events and UTM/campaign attribution, with deduplication.
- **Examples:** `/`, `/about`, `/air-purifier`, `/air-purifier/brand/airdoctor`, `/air-purifier/brand/alen`

### R06 — P1 — Mapping counts and constants generate unsupported fit/OEM confidence

- **Category:** SYSTEMIC_ROOT_DEFECT
- **Count/scope:** 712 listed paths; status PROVEN_CODE_AND_LIVE_EXPOSURE_NOT_ALL_ENTITY_FACTS_FALSE.
- **Evidence:** 712 pages expose these confidence patterns. Inspected builders hardcode OEM and infer high confidence from counts; pure function probe produces OEM even with compatible subtype. Exposure count is NOT712 independently false fits.
- **Likely source boundary:** src/lib/trust/part-trust.ts:84-106,139-173; src/components/vertical/VerticalFilterPageContent.tsx; src/components/vertical/VerticalModelPageContent.tsx
- **Smallest fix:** Make fit and manufacturer identity claim-specific; unknown/compatible remain visibly distinct. Neutral association copy where proof missing.
- **Regression:** Trust-builder tests: aftermarket never original; counts alone never proof; ambiguous multiple recommendations remain uncertain.
- **Examples:** `/air-purifier/filter/airdoctor-ad3000-cartridge`, `/air-purifier/filter/alen-b75-mp`, `/air-purifier/filter/alen-bf35`, `/air-purifier/filter/alen-fl40`, `/air-purifier/filter/austin-air-hm400-fr400`

### R07 — P1 — Winix115115 mislabeled FilterH and unsafe model associations propagated

- **Category:** PAGE-SPECIFIC_DATA_DEFECT
- **Count/scope:** 107 listed paths; status OBSERVED.
- **Evidence:** 107 pages display the wrong FilterH identity for115115. Manufacturer: FilterA=115115; FilterH=116130 for5500-2/AM80. Current pages choose115115 for both. Do not infer all104 associated models are wrong.
- **Likely source boundary:** data/air-purifier/filters.csv:12-14; compatibility_mappings.csv:40-48; models.csv:43; model_aliases.csv:6; src/app/air-purifier/model/[slug]/page.tsx
- **Smallest fix:** Correct identity and independently adjudicate5500-2/AM80 edges; remove5500-to5500-2 identity alias; recheck full expanded runtime association set before confident fit.
- **Regression:** Fixture WinixA/H distinct;5500 vs5500-2 distinct; exact manufacturer-supported model-to-filter references. Data import must carry reviewed evidence.
- **Examples:** `/air-purifier`, `/air-purifier/brand/winix`, `/air-purifier/filter/winix-hepa-115115`, `/air-purifier/model/winix-5000s`, `/air-purifier/model/winix-5300`

### R16 — P1 — Exposed buying paths lack auditable current UUID-to-destination proof

- **Category:** UNKNOWN
- **Count/scope:** 64 listed paths; status AUDIT_VERIFICATION_BLOCK_NOT_PROVEN_ALL_LINKS_UNSAFE.
- **Evidence:** 81CTA occurrences/6IDs/64pages.4AmazonIDs44occurrences;2GEIDs37occurrences. No liveGOcalled because click_eventswrite. CurrentDBdiscoveryfailed. Candidate identity matches do not establish live redirect or model fit. Missing tags NOT inferred from opaquegoURLs.
- **Likely source boundary:** src/lib/retailers/go-redirect-gate.ts; src/lib/retailers/go-affiliate-route-handler.ts; retailer_links and air_purifier_retailer_links runtime rows
- **Smallest fix:** Obtain read-only six-row export and actual deployedSHA, reconcile exact part/brand/pack/source freshness; use pure redirect builder with those rows. Review current on-page compatible labeling. No blind tag or link repair.
- **Regression:** Existing go-redirect-gate and launch-buy-links tests using6current-row fixtures; correct single tag only after gate pass; mocked click writer, no live analytics contamination.
- **Examples:** `/air-purifier/filter/shark-hepa-he15fkp`, `/air-purifier/filter/shark-hepa-he3fkp`, `/air-purifier/model/shark-hp150`, `/air-purifier/model/shark-hp151`, `/air-purifier/model/shark-hp152`

### R05 — P1 — Static allowlist emits checked-store proof without requiring current evidence

- **Category:** SYSTEMIC_ROOT_DEFECT
- **Count/scope:** 21 listed paths; status OBSERVED.
- **Evidence:** 21 actual pages render affirmative proof text. Code execution proves it renders with no retailer evidence. This is unsupported-current-proof exposure, not proof no historical check occurred.
- **Likely source boundary:** src/lib/fridge/fridge-model-pdp-safe-buyer-path-visible-proof-v1.ts:85-116,151-185; src/components/fridge/FridgeModelPdpVisibleProofBlock.tsx:35-58
- **Smallest fix:** Derive proof statements per part/current evidence; keep allowlist only for scope. Display date/status independently for each checked part.
- **Regression:** Existing proof-block tests: zero proof, stale proof, one-of-many proof; never apply one date to all parts.
- **Examples:** `/fridge/frigidaire-ffhb2740ps`, `/fridge/frigidaire-fghb2868pf`, `/fridge/frigidaire-fgsc2335tf`, `/fridge/ge-cwe23sshww`, `/fridge/ge-gfe28gmkbb`

### R08 — P1 — GE cartridge media/intervals and housing-size mappings conflated

- **Category:** PAGE-SPECIFIC_DATA_DEFECT
- **Count/scope:** 8 listed paths; status OBSERVED.
- **Evidence:** FXWPC called carbon; manufacturer calls pleated sediment. FXHTC does reduce sediment, so that description alone is not judged false.2PDPs claim6months versus3months. GXWH20S primary is4.5-inch FXHTC although model manual lists2.5-inch cartridges. Other disputed edges require exact housing evidence.
- **Likely source boundary:** data/whole-house-water/filters.csv:43-47; models.csv:9-12; compatibility_mappings.csv:128-147
- **Smallest fix:** Correct media/life facts; hold cross-size model-fit recommendations until exact manuals pass. Do not label stages as equivalent alternatives.
- **Regression:** Exact GE cartridge media, width and life fixtures; GXWH20S review gate for4.5-inch mappings.
- **Examples:** `/whole-house-water`, `/whole-house-water/brand/ge`, `/whole-house-water/filter/ge-fxhtc`, `/whole-house-water/filter/ge-fxwpc`, `/whole-house-water/model/ge-whole-house-gxwh20s`

### R09 — P1 — AP903 configuration and AP910R media contradict manufacturer

- **Category:** PAGE-SPECIFIC_DATA_DEFECT
- **Count/scope:** 4 listed paths; status OBSERVED.
- **Evidence:** AP903 page says dual-stage AP917HD-S+AP910R. Manufacturer specifies single AP917HD forAP903, AP910R forAP902, AP917HD-S forAP904; AP910R is non-woven pleat not carbon. Physical interchangeability not adjudicated.
- **Likely source boundary:** data/whole-house-water/models.csv:20; filters.csv:61-62; compatibility_mappings.csv:187-188
- **Smallest fix:** Correct stock configuration/media; distinguish any reviewed compatible alternative from original configuration; hold unproved recommendations.
- **Regression:** AP902/AP903/AP904 exact standard-cartridge fixture and explicit relationship types.
- **Examples:** `/whole-house-water`, `/whole-house-water/brand/3m`, `/whole-house-water/filter/3m-ap910r`, `/whole-house-water/model/3m-aquapure-ap903`

### R04 — P1 — Compatibility-review warning contradicted by right-place and identity-equivalence copy

- **Category:** SYSTEMIC_ROOT_DEFECT
- **Count/scope:** 2 listed paths; status OBSERVED.
- **Evidence:** GSWF and GSWF2 show review warnings plus unconditional right-place copy; mutual Also printed as claims despite unverified supersession.
- **Likely source boundary:** src/app/filter/[slug]/page.tsx; src/components/trust/VisualReplacementMatchCard.tsx:259-265; src/components/fridge/FridgeModelFilterSection.tsx:144-149; data/filter_aliases.csv:76-82
- **Smallest fix:** Use current safety state in every section; unproved related search tokens must not be printed-identity/equivalence claims. Preserve lookup aliases, not fit authority.
- **Regression:** Render both GSWF/GSWF2 with uncertain relationship: no unconditional fits/right-place/printed-as; typed successor requires directional evidence.
- **Examples:** `/filter/gswf`, `/filter/gswf2`

### R03 — P1 — Catalog refrigerator entry links to absent /brand route

- **Category:** BROKEN_LINK
- **Count/scope:** 1 listed paths; status OBSERVED.
- **Evidence:** Single exposed internal edge returns404 on repeat.
- **Likely source boundary:** src/lib/catalog/public-category-hub.ts:26-30; src/app/catalog/page.tsx:51-55
- **Smallest fix:** Point refrigerator category to owner-chosen existing canonical browse route; no new category architecture needed.
- **Regression:** Extend public-category-hub.test.ts to resolve every generated card href.
- **Examples:** `/catalog`

### R17 — P2 — Explicit social image URL points to nonexistent extensionless endpoint

- **Category:** SYSTEMIC_ROOT_DEFECT
- **Count/scope:** 57 listed paths; status OBSERVED.
- **Evidence:** 57 refrigerator filter pages emit /opengraph-image returning404; actual /opengraph-image.png?0948f9173b151ab7 returns200. All three favicon/icon resources checked return200.
- **Likely source boundary:** src/lib/site-social-metadata.ts:12; src/lib/site-social-metadata.test.ts; src/app/opengraph-image.png
- **Smallest fix:** Point the metadata helper at the existing served static image route; do not create new artwork.
- **Regression:** Fetch rendered og:image and require image MIME and2xx, not merely source file existence.
- **Examples:** `/filter/4396395`, `/filter/4396508`, `/filter/4396710`, `/filter/4396841`, `/filter/4396842`

### R12 — P2 — Sitemap emits seven safety-noindex filter pages

- **Category:** SYSTEMIC_ROOT_DEFECT
- **Count/scope:** 7 listed paths; status OBSERVED.
- **Evidence:** All7haveHTTP200 andnoindex,follow and are in live sitemap.
- **Likely source boundary:** src/lib/sitemap/wedge-indexable-urls.ts:249-267,327-333; src/lib/fridge/fridge-filter-pdp-customer-safety-v1.ts:127-146; src/app/filter/[slug]/page.tsx:53-92
- **Smallest fix:** Use same existing filter safety/indexability predicate for metadata and sitemap.
- **Regression:** Extend wedge-indexable-urls.test.ts with all-quarantined fixture already in safety tests.
- **Examples:** `/filter/adq36006101`, `/filter/adq74793502`, `/filter/da29-00012b`, `/filter/da97-06317a`, `/filter/lt1000p`

### R14 — P2 — Seven repo help candidates throw500; public help index empty

- **Category:** SYSTEMIC_ROOT_DEFECT
- **Count/scope:** 7 listed paths; status REPO_CANDIDATE_ERRORS_NOT_CONFIRMED_PUBLISHED_ARTICLES.
- **Evidence:** 7repo-known article paths500 on repeat; none linked in current public graph/sitemap.5reset brand routes200. Help index exposes database implementation placeholder. Do not count500 candidates as7proven public navigation failures.
- **Likely source boundary:** src/app/help/[slug]/page.tsx; src/lib/data/help.ts; src/app/help/page.tsx
- **Smallest fix:** Fail missing article cleanly with404 or render existing approved content if current runtime row exists; remove implementation wording. Do not expand content.
- **Regression:** Missing/nonexistent help slug returns404; valid existing help renders; empty-state user-safe.
- **Examples:** `/help/how-often-to-replace-refrigerator-water-filter`, `/help/how-to-find-refrigerator-model-number`, `/help/reset-water-filter-light-frigidaire`, `/help/reset-water-filter-light-ge`, `/help/reset-water-filter-light-lg`

### R11 — P2 — Pilot no-link state still promises opening checked product page

- **Category:** SYSTEMIC_ROOT_DEFECT
- **Count/scope:** 4 listed paths; status OBSERVED.
- **Evidence:** 4live pages;3filter pilots andCore400s model. Separate proven latent defect: pilot adapter nulls browser_truth_checked_at, killing otherwise eligible CTAs. Current source pilot evidence is already>90days, so timestamp-null is not proven sole cause of current no-link state.
- **Likely source boundary:** src/lib/air-purifier/ap-homeowner-framework-v1.ts:92-100; src/components/air-purifier/homeowner/ApHomeownerFilterPage.tsx:55-65,121-132; Core400sFlagshipPage
- **Smallest fix:** Condition invitation/opening copy on final rendered CTA state; preserve proof timestamp in data, control duplicate presentation with a prop.
- **Regression:** Pilot render tests for fresh, stale, absent and blocked proof; badge/text and CTA eligibility must agree.
- **Examples:** `/air-purifier/filter/coway-max2-hepa`, `/air-purifier/filter/levoit-rf-rar040`, `/air-purifier/filter/medify-ma50-rf`, `/air-purifier/model/levoit-core-400s`

### R15 — P2 — Two provenance links resolve to generic destinations

- **Category:** BROKEN_LINK
- **Count/scope:** 4 listed paths; status OBSERVED.
- **Evidence:** HTTP200 hides source loss: RF28NHEDBSR builder source resolves generic builder page; find-your-water-filter resolves refrigerator shopping page. Existing source labels imply model-specific proof.
- **Likely source boundary:** data/manual-evidence/refrigerator/samsung-rf28nhedbsr.json; data/manual-evidence/refrigerator/samsung-rf28r7201sr.json; rendered source component
- **Smallest fix:** Revalidate these exact citations; retain other valid sources but remove unsupported model-specific descriptions from generic destination.
- **Regression:** Source checker verifies expected model/part in primary page after redirect, not justHTTP200.
- **Examples:** `/fridge/samsung-rf28nhedbsr`, `/fridge/samsung-rf28r7201sr`, `/fridge/samsung-rf28r7351sg`, `/fridge/samsung-rf28r7351sr`

### R10 — P2 — Honeywell R pack quantities labeled sizes

- **Category:** PAGE-SPECIFIC_DATA_DEFECT
- **Count/scope:** 3 listed paths; status OBSERVED.
- **Evidence:** Three PDPs label1/2/3-pack as physical size. Manufacturer-branded store identifies same FilterR cartridges in different quantities.
- **Likely source boundary:** src/components/air-purifier/HoneywellHrfFamilyRail.tsx; data/air-purifier/filters.csv:15-17
- **Smallest fix:** Use pack quantity and model-specific units required, not cartridge sizes.
- **Regression:** Assert R1/R2/R3 pack count separate from filter geometry.
- **Examples:** `/air-purifier/filter/honeywell-hrf-r1`, `/air-purifier/filter/honeywell-hrf-r2`, `/air-purifier/filter/honeywell-hrf-r3`

### R13 — P2 — Canonical-origin metadata disagrees and Netlify alias remains separately reachable

- **Category:** SYSTEMIC_ROOT_DEFECT
- **Count/scope:** 2 listed paths; status 2_ALIAS_PAGES_SAMPLED_AND_SITEWIDE_METADATA_POLICY.
- **Evidence:** robots advertises.netlify.app; advertised sitemap200 with.com URL set; alias homepage/catalog200no redirect. Homepage lacks canonical; alias catalog canonical.com. No observed search-engine loss. Exact stale/config/deploy cause unknown.
- **Likely source boundary:** src/app/robots.ts; src/app/sitemap.ts; src/lib/site-url/get-required-site-url.ts; src/app/layout.tsx; src/app/page.tsx; Netlify origin settings
- **Smallest fix:** Reconcile actual build/runtime origin and deployed identity; emit.com robots/sitemap and establish canonical alias policy; add homepage canonical. No claim Host line alone blocks Google.
- **Regression:** Host matrix test for.com,www,Netlify; compare robots->sitemap->canonical; validate origin without hardcoded catalog counts.
- **Examples:** `/`, `/catalog`

## 10. Source risks not promoted to current live-page failures

`latent_source_risks.json` and `truth_repo_report.md` preserve these separately:
- Missing per-model safety guard entry fails open; current mapping changes do not automatically invalidate a slug-only guard. Current affected live rows UNKNOWN.
- Vacuum/humidifier/appliance-air loaders discard the sorted result and bypass the model-trust path. **Zero successful current detail routes discovered**, so do not claim a public multi-part wrong-order incident.
- Official-reference lane accepts arbitrary host/invalid date/hard-deny notes in a synthetic probe. No actual bad-host production row observed.
- Future browser-proof timestamps pass the 90-day age check. No future-dated production row observed.
- Old committed registry text says freshness is unenforced; that is stale. **The pinned live buy gate does enforce missing/older-than-90-day proof.** Do not reopen a fixed defect from a stale report.

These are testable guard weaknesses, not a justification for broad new architecture.

## 11. Exact smallest durable preservation checks

Use existing test → crawler extension → existing CI/deploy gate, in this order:

1. **Asset and route contract:** extend `scripts/live-site-smoke-check.ts`, `scripts/lib/live-site-smoke.ts`, and `scripts/live-site-smoke-check.test.ts`. Recompute live sitemap plus canonical route sources; crawl graph; validate JS/CSS/image status and MIME, main body, canonical/noindex policy, redirects, and deploy marker. Save per-route output. Do not fix the route count at 1,343; compare a dated manifest and explain changes.
2. **Native and hydrated search + GA:** exercise homepage and each distinct search template; require correct destination/results. Observe natural pageview and existing view/search/outbound events under a test fixture with mocked click logging or a dedicated non-mutating test environment. Do not generate real affiliate click records just to smoke-test production.
3. **Shared truth-state rendering:** extend existing part-trust, fridge-safety, visible-proof, pilot and vertical component tests with no-proof/stale/uncertain/compatible/multi-part fixtures. Assert absence of contradictory stronger copy in every section, not only presence of a caution banner.
4. **Exact entity cases:** preserve GSWF/GSWF2 distinction, Winix A/H and 5500/5500-2, GE media/life/size, AP903 standard configuration, Honeywell pack quantities as data validation fixtures grounded in cited sources. No indiscriminate widening of fit relationships.
5. **One indexability predicate:** extend `src/lib/sitemap/wedge-indexable-urls.test.ts` with the already-existing all-quarantined filter fixture. Compare generated sitemap with page robots. Keep the homepage-only fallback from being labeled healthy.
6. **Commercial gate/redirect fixtures:** use the six current live rows when acquired. Extend `go-redirect-gate` and `launch-buy-links` tests for correct single Amazon tag, blocked search/discovery, compatible versus official, stale/future/missing proof, exact-token or explicitly evidenced successor rules, and CTA/redirect parity. Include unit validation of official-reference host/date/deny handling.
7. **Origin and social metadata:** extend `src/app/robots.test.ts`, site-url tests and `site-social-metadata.test.ts`. Validate served URLs, not simply that the image file exists. Require expected `.com` origin contract and explicit alias policy.
8. **Wire into existing gates:** `buckparts:deploy:preflight` already chains exposure audit, repo-runtime-convergence check and ship guard. Existing tests run through `scripts/npm-test-v1.sh`. Integrate bounded checks there and post-deploy smoke rather than introduce a new scheduler/control plane.

**Important:** `buckparts:live-site-smoke` is not purely observational: it writes an owner artifact to Supabase. The inspected `buckparts:live-site-smoke:check` is the non-artifact alternative. Neither mutating command was executed in this audit. No full project test-suite pass is claimed; only the documented isolated source probes ran.

## 12. Repair sequencing, deferral and next action

### Must happen before broad distribution
1. **P0 deployment/static assets**, then native/hydrated search and natural GA/event verification. Until this passes, distribution traffic cannot be served or measured reliably.
2. **P1 truth semantics and proven identity/media/fit defects**: shared gates/copy first, then narrowly approved data corrections. Preserve uncertainty and avoid wholesale mapping replacement.
3. **Six-row current commercial reconciliation**: read-only export must contain UUID, filter/model context, destination URL, retailer key/name, classification/subtype, checked_at, notes/source/evidence and approval state. Establish deployed SHA. Run pure gate and redirect tests; verify direct destinations/identity and applicable tags without recording live click events. Explicitly resolve aftermarket labels and scoped exclusion conflicts.
4. **Navigation, origin/indexability, source redirects, and 57 broken social images**. These are small bounded fixes, not a redesign.
5. **Re-run the same baseline** and clear all material blockers. Only then consider SITE_INTEGRITY_BASELINE_PASS; low-risk remaining issues must be enumerated, not hidden.

### Can wait / do not do
- Cosmetic polish, new layouts, content or category expansion, new dashboards, agents, schedulers, databases, or frameworks.
- Dormant secondary-vertical recommendation changes can wait while their detail pages remain unpublished; add regression coverage before activating them.
- Unlinked help-content growth can wait; the missing-slug 500 should still become correct error behavior. Do not invent articles to satisfy the inventory.
- Broader historical-report cleanup after current release blockers, while clearly marking stale evidence now.

### Required verification gaps, not requests to refresh the old credential
The failed bulk-snapshot credential is `TOOL_PATH_DEFECT = PROVEN`, not a repo blocker. Keep using connected GitHub. A separate connected Supabase discovery failure prevented fresh runtime-row verification. Resolve that specific read path or provide a read-only current export; do not assume an unrelated database or historical snapshot is current. If deployment management access is unavailable, supply the current deployment SHA and artifact manifest. Full current fit proof for all 1,284 live data-backed pages cannot be asserted from the 13 limited independently checked entities and legacy CSV mappings.

**Recommended next action:** approve the narrow P0 asset/deployment repair investigation first, using this evidence bundle and its exact acceptance checks. Then apply the deduplicated repair set only with authorization. This audit did not implement anything.

## 13. Evidence index and sources

### Deliverable files
- `summary.json`: requested metrics, definitions and null/unknown values.
- `route_inventory.csv`, `page_audit.jsonl`: all 1,362 distinct attempted paths; no silent template-based passes.
- `query_variant_results.json`: three additional search URLs.
- `root_defects.json`: 17 grouped records, exact affected lists, files and smallest regression boundaries; not 17 independent deployment causes.
- `page_specific_defects.csv`: observed propagated data-copy defects.
- `commercial_links.csv/json`: all 81 commercial occurrences; current and candidate destinations deliberately separate.
- `candidate_destination_probes.json`, `affiliate_pure_test_results.json`: direct candidate observations and five passing local code cases.
- `internal_links.csv`: all 23,649 ordinary internal occurrences and four known semantic fit mismatches.
- `inventory_exceptions.json`, `runtime_repo_association_differences.json`: missing/demo/unlisted routes and runtime-versus-CSV association differences, not automatic wrong-fit adjudications.
- `latent_source_risks.json`: source findings without asserted live failure count.
- Supporting reports and `audit/`: raw page HTML, timestamped JSONL, all assets, repeats, source redirects and sitemap/robots evidence.
- `manifest_sha256.json`: file-integrity manifest for the bundle.

### Primary source references
- [Production sitemap](https://buckparts.com/sitemap.xml), [robots](https://buckparts.com/robots.txt), [advertised sitemap](https://buckparts.netlify.app/sitemap.xml), [catalog](https://buckparts.com/catalog).
- [GSWF2 live uncertainty/alias example](https://buckparts.com/filter/gswf2); [Winix115115 live title](https://buckparts.com/air-purifier/filter/winix-hepa-115115); [Levoit no-link pilot](https://buckparts.com/air-purifier/filter/levoit-rf-rar040).
- [Winix Filter A115115](https://www.winixamerica.com/product/filter-a-115115/); [Filter H116130](https://www.winixamerica.com/product/filter-h-116130/).
- [GE GXWH20S manual](https://products-salsify.geappliances.com/image/upload/s--qbgnU6AN--/395dbdf31f13a3e741e7f42c124dcab31a741592.pdf); [FXWPC](https://www.geapplianceparts.com/store/parts/spec/FXWPC); [FXHTC](https://www.geapplianceparts.com/store/parts/spec/FXHTC).
- [Manufacturer AP902/AP903/AP904 specification](https://www.solventum.com/content/dam/public/language-masters/en/pfb/document/2012/Aqua-Pure-AP902_AP903_AP904-Series.pdf.coredownload.inline.pdf).
- [Honeywell R three-pack and model quantities](https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-3-pack-hrf-r3.htm).
- [Google robots interpretation](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt); [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). Guidance is not evidence of this site's indexing outcome.

Exact immutable GitHub source links can be formed from the pinned commit and paths recorded for each root; the main source files are linked below.
- [src/lib/retailers/go-redirect-gate.ts](https://github.com/BuckNorris0506/bucksites-tools/blob/5f3a595eef81980b4f9f844d8dabad86af2bf537/src/lib/retailers/go-redirect-gate.ts)
- [src/app/go/[linkId]/route.ts](https://github.com/BuckNorris0506/bucksites-tools/blob/5f3a595eef81980b4f9f844d8dabad86af2bf537/src/app/go/%5BlinkId%5D/route.ts)
- [src/lib/trust/part-trust.ts](https://github.com/BuckNorris0506/bucksites-tools/blob/5f3a595eef81980b4f9f844d8dabad86af2bf537/src/lib/trust/part-trust.ts)
- [src/lib/fridge/fridge-model-pdp-safe-buyer-path-visible-proof-v1.ts](https://github.com/BuckNorris0506/bucksites-tools/blob/5f3a595eef81980b4f9f844d8dabad86af2bf537/src/lib/fridge/fridge-model-pdp-safe-buyer-path-visible-proof-v1.ts)
- [src/lib/air-purifier/ap-homeowner-framework-v1.ts](https://github.com/BuckNorris0506/bucksites-tools/blob/5f3a595eef81980b4f9f844d8dabad86af2bf537/src/lib/air-purifier/ap-homeowner-framework-v1.ts)
- [src/components/SearchForm.tsx](https://github.com/BuckNorris0506/bucksites-tools/blob/5f3a595eef81980b4f9f844d8dabad86af2bf537/src/components/SearchForm.tsx)
- [src/lib/catalog/public-category-hub.ts](https://github.com/BuckNorris0506/bucksites-tools/blob/5f3a595eef81980b4f9f844d8dabad86af2bf537/src/lib/catalog/public-category-hub.ts)
- [src/lib/site-social-metadata.ts](https://github.com/BuckNorris0506/bucksites-tools/blob/5f3a595eef81980b4f9f844d8dabad86af2bf537/src/lib/site-social-metadata.ts)
- [src/app/robots.ts](https://github.com/BuckNorris0506/bucksites-tools/blob/5f3a595eef81980b4f9f844d8dabad86af2bf537/src/app/robots.ts)
- [src/lib/sitemap/wedge-indexable-urls.ts](https://github.com/BuckNorris0506/bucksites-tools/blob/5f3a595eef81980b4f9f844d8dabad86af2bf537/src/lib/sitemap/wedge-indexable-urls.ts)
