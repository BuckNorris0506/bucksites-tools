# BuckParts Command Center — Final System Blueprint (Phase 1 design)

**Status:** Design-only document. The Command Center is **not** finished; this describes the target system and current repo truth as of authoring from repository paths and scripts only. Anything not evidenced in-repo is marked **UNKNOWN**.

**Constraints honored:** No DB mutations, no runtime app behavior changes, no UI in this phase.

---

## Design principles

1. **Read-first:** Most value comes from autonomous, repeatable JSON reports and audits over Supabase + local data.
2. **Learning loops:** Evidence files (`data/evidence/*.json`), `public.learning_outcomes`, and command-surface snapshots should close the loop from action → outcome → next action.
3. **Trust before revenue:** CTA gating (`launch-buy-links`, `retailer-link-state`) and affiliate truth (`audit-buckparts-system-contracts`) are upstream of monetization metrics.
4. **Single digest:** `buckparts_command_center_v1` (`scripts/report-buckparts-command-center.ts`) is the nascent aggregation layer; it should grow, not splinter.

---

## Component specifications

Each block maps to the numbered goals in the Phase 1 request (see §Mapping at end).

### A) Money tracking (goal 1)

| Field | Content |
|--------|--------|
| **Purpose** | Decision-grade view of inventory, discoverability, buy-link quality, and click *density* per wedge—not necessarily bank revenue. |
| **Current repo truth** | **PARTIAL** — `scripts/report-homekeep-business-scorecard.ts` (wired `buckparts:report:business-scorecard`) states it is *not* a revenue report; uses catalog + `click_events` window + search-gap signals. **UNKNOWN** whether external payout/commission APIs exist in-repo. |
| **Required inputs** | Supabase: wedge tables (`filters`, `retailer_links`, AP/WH analogs), `click_events`, search-gap state; `src/lib/data/*-filter-usefulness`; `HOMEKEEP_WEDGE_CATALOG`. |
| **Output fields** | JSON scorecard per wedge (counts, ratios, backlog hints)—see script header and implementation. |
| **Why it matters** | Surfaces where demand exists without monetization so operators prioritize work that moves needles. |
| **Failure mode if missing** | Blind allocation: effort goes to low-demand or already-strong pages. |

### B) Click tracking (goal 2)

| Field | Content |
|--------|--------|
| **Purpose** | Attribute outbound affiliate clicks by wedge, retailer, and part for recency windows. |
| **Current repo truth** | **EXISTS** — `scripts/report-homekeep-affiliate-clicks.ts` (`buckparts:report:affiliate-clicks`); documents `click_events` schema differences (fridge composite vs AP/WH `*_retailer_link_id`). Migration evidence: `supabase/schema.sql`, vertical migrations touching `click_events`. |
| **Required inputs** | `click_events`, retailer link tables, filter/part metadata for joins. |
| **Output fields** | Enriched click rollups (see `EnrichedClick` types in script). |
| **Why it matters** | Connects surface area to engagement; prerequisite for any click→learning feedback. |
| **Failure mode if missing** | Cannot validate which CTAs actually fire in the wild. |

### C) Affiliate conversion ingestion (goal 3)

| Field | Content |
|--------|--------|
| **Purpose** | Ingest network-reported orders/commission into BuckParts for ROI and cohort learning. |
| **Current repo truth** | **MISSING** as an automated ingestion pipeline in scripts/package wiring surveyed. `public.learning_outcomes` includes `conversions` and `clicks` columns (`supabase/migrations/20260428200500_learning_outcomes.sql`) but **UNKNOWN** whether production writers populate them from affiliate APIs. `scripts/lib/learning-outcomes-writer.ts` validates inserts; no dedicated “Amazon Orders API → DB” script was found in manifest grep scope. |
| **Required inputs** | Network APIs or CSV exports, idempotent keys, part/slug mapping policy. |
| **Output fields** | Would be normalized conversion facts + linkage to `slug` / `retailer` / `filter_id` (target—not implemented). |
| **Why it matters** | Without conversions, money tracking stays proxy-only (clicks, coverage). |
| **Failure mode if missing** | Cannot prove ROI; affiliate approvals stay narrative. |

### D) Blocked-link reduction (goal 4)

| Field | Content |
|--------|--------|
| **Purpose** | Quantify and prioritize retailer links blocked from buy/redirect by gate + browser-truth policy. |
| **Current repo truth** | **EXISTS** — `scripts/report-buckparts-blocked-link-money-queue.ts` (`buckparts:blocked-link-queue`); OEM detail `scripts/report-buckparts-oem-catalog-blocked-details.ts`; RepairClinic slice reports (`buckparts:repairclinic-*-blocked-details`); command surface `blocked_retailer_link_remediation` (`scripts/report-buckparts-command-surface.ts`). |
| **Required inputs** | `retailer_links`, AP/WH `*_retailer_links` with `browser_truth_classification`, `retailer_key`, `affiliate_url`. |
| **Output fields** | Counts by `BLOCKED_*` state, top retailer keys, recommended first action strings. |
| **Why it matters** | Blocked rows are inventory that looks live but cannot earn; reduction directly unlocks trust and revenue. |
| **Failure mode if missing** | Silent CTA rot; operators chase wrong retailers. |

### E) Amazon-first rescue (goal 5)

| Field | Content |
|--------|--------|
| **Purpose** | Queue OEM/search-placeholder rows for Amazon PDP verification and slot insertion when Amazon Associates is ready. |
| **Current repo truth** | **PARTIAL** — `scripts/report-amazon-first-blocked-conversion-queue.ts` (`buckparts:amazon-first-blocked-queue`); WH rescue inventory `scripts/report-amazon-rescue-existing-whw-rows.ts`; staging/preflight scripts (`buckparts:stage:amazon-false-negative-rescue`, `preflight-*`). Command center v1 **does not** yet call the Amazon-first queue (aggregation gap). |
| **Required inputs** | Same as blocked-link + `filters.slug` / `oem_part_number`; `data/affiliate/affiliate-application-tracker.json` for Amazon readiness. |
| **Output fields** | Ranked candidates with `recommended_next_action` enum (`SEARCH_AMAZON_EXACT_TOKEN`, `NOOP_*`, `HOLD_*`, `UNKNOWN_*`). |
| **Why it matters** | Amazon is the approved, tag-verified lane in tracker evidence; OEM search rows are high-leverage fixes. |
| **Failure mode if missing** | Operators use ad-hoc lists; duplicates and no-op rescues waste time. |

### F) Non-Amazon affiliate readiness (goal 6)

| Field | Content |
|--------|--------|
| **Purpose** | Track application status and tag verification per network; gate RepairClinic and other lanes on approval truth. |
| **Current repo truth** | **EXISTS** — `data/affiliate/affiliate-application-tracker.json`; `scripts/report-buckparts-affiliate-tracker.ts`; `scripts/audit-buckparts-system-contracts.ts` (Amazon tag / approval alignment). FlexOffers *readiness* report code `scripts/report-flexoffers-readiness-fridge.ts` (stdout JSON). Command center reads **optional** frozen file `data/reports/flexoffers-readiness-refrigerator-water.json` — **PARTIAL** (no package script writes that path in-repo; often `known_unknowns` if missing). |
| **Required inputs** | Tracker JSON; optional precomputed readiness JSON. |
| **Output fields** | Status counts, pending lane strings, RepairClinic status string in command center. |
| **Why it matters** | Prevents promoting links that cannot legally monetize; RepairClinic guard is explicit in `report-buckparts-command-center.ts`. |
| **Failure mode if missing** | Evidence work on blocked retailers while programs are still `NOT_STARTED` / `REJECTED`. |

### G) Evidence / outcome learning memory (goal 7)

| Field | Content |
|--------|--------|
| **Purpose** | Durable, auditable records of operator runs (Amazon batches, Frigidaire routing, multipack outcomes). |
| **Current repo truth** | **PARTIAL** — `data/evidence/*.json` (multiple Amazon / Frigidaire artifacts); command center lists evidence files with **top-level keys only** (`listEvidenceSummaries` in `report-buckparts-command-center.ts`). `public.learning_outcomes` + `scripts/lib/learning-outcomes-writer.ts` for structured DB memory. **UNKNOWN** full production write path frequency. |
| **Required inputs** | Writer callers, evidence JSON conventions, DB connectivity. |
| **Output fields** | Evidence JSON shapes vary by run; DB rows per migration contract. |
| **Why it matters** | Regulators and future operators need provenance; reruns must not contradict past truth. |
| **Failure mode if missing** | Repeated work, contradictory mutations, audit failure. |

### H) Customer / search usage learning (goal 8)

| Field | Content |
|--------|--------|
| **Purpose** | Capture on-site search behavior and gap classification to steer catalog and CTA priorities. |
| **Current repo truth** | **PARTIAL** — `src/lib/search/telemetry.ts`; migrations `supabase/migrations/20260410170000_search_intelligence.sql`, search-gap candidates (`20260410180000_search_gap_candidates.sql`); scripts `scripts/search-gaps-*.ts`, `buckparts:search-gap:status:*` (writes—operator-guarded per `docs/buckparts-script-classification-manifest.md`). Command surface does not deeply surface search intelligence metrics in the excerpted JSON contract (verify before claiming full coverage) — **UNKNOWN** for full cross-wedge reporting in command center. |
| **Required inputs** | Search RPC/tables as deployed; gap classification libs. |
| **Output fields** | Gap reports, status applications, model-priority reports where wired. |
| **Why it matters** | Aligns SKUs to real demand; reduces zero-result frustration. |
| **Failure mode if missing** | Catalog grows without demand signal; SEO/search diverge. |

### I) False-negative tracking (goal 9)

| Field | Content |
|--------|--------|
| **Purpose** | Find parts where Amazon or buyable evidence exists in DB but gating still suppresses CTAs (rescue candidates). |
| **Current repo truth** | **EXISTS** — `scripts/audit-amazon-false-negative-rescue.ts` (`buckparts:audit:amazon-false-negatives`); related stage/preflight scripts. |
| **Required inputs** | Retailer link rows across wedges, Amazon URL canon rules (`discovery-candidate-enrichment`). |
| **Output fields** | Audit JSON with false-negative typing (`EXACT_URL_PRESENT`, etc.—see script types). |
| **Why it matters** | Recovers revenue left on table without weakening trust rules. |
| **Failure mode if missing** | Over-blocking persists despite proof in DB. |

### J) Page-level monetization priority (goal 10)

| Field | Content |
|--------|--------|
| **Purpose** | Rank filters/pages for coverage, tier, and primary-Amazon presence. |
| **Current repo truth** | **EXISTS** — `scripts/prioritize-coverage-next-batch.ts` (`buckparts:prioritize:coverage`); tier logic in-file; uses compatibility + retailer link signals. Scorecard (`report-homekeep-business-scorecard.ts`) adds wedge-level priority signals. |
| **Required inputs** | Filter tables, `compatibility_mappings` (or wedge equivalents), retailer links. |
| **Output fields** | Tier per filter, sorted lists. |
| **Why it matters** | Converts “infinite backlog” into ordered work. |
| **Failure mode if missing** | Random walk through SKUs; high-demand gaps persist. |

### K) Operator-away mode (goal 11)

| Field | Content |
|--------|--------|
| **Purpose** | Signal when autonomous read-only monitoring + scripted queues suffice vs when human approval is mandatory. |
| **Current repo truth** | **PARTIAL** — `operator_can_be_away_status` in `CommandCenterReport` (`report-buckparts-command-center.ts`): only `NOT_READY` (empty next action) or `READY_FOR_AUTONOMOUS_READ_ONLY` is assigned. Type allows `READY_FOR_ASYNC_REVIEW` but **UNKNOWN** whether any code path sets it (appears unused in current implementation). |
| **Required inputs** | Same as command center build. |
| **Output fields** | Single enum + narrative queues. |
| **Why it matters** | Prevents false confidence when approvals or DB health are bad. |
| **Failure mode if missing** | On-call burnout or silent drift when “away” is overstated. |

### L) Next-best-action engine (goal 12)

| Field | Content |
|--------|--------|
| **Purpose** | Deterministic ordering of monetization lanes with explicit guardrails (e.g., suppress RepairClinic when not approval-ready). |
| **Current repo truth** | **PARTIAL** — Implemented inside `buildBuckpartsCommandCenterReport`: affiliate pending → narrative NBA; else OEM cohort → Frigidaire next → FlexOffers readiness; RepairClinic regex safeguard. Narrow compared to full target system. |
| **Required inputs** | Sub-reports listed in command center imports. |
| **Output fields** | `next_best_action`, `why_this_action`, `top_money_queue[]`. |
| **Why it matters** | Single answer reduces decision fatigue; must stay truthful to inputs. |
| **Failure mode if missing** | Competing scripts each claim “do this next”; operators disagree. |

### M) Command center health / status rules (goal 13)

| Field | Content |
|--------|--------|
| **Purpose** | Roll up CRITICAL/WARNING/OK from contracts, DB reachability, affiliate health, CTA coverage, and trend deltas. |
| **Current repo truth** | **EXISTS** — `computeSystemHealth` in `scripts/report-buckparts-command-surface.ts` (affiliate `ACTION_REQUIRED`, learning outcomes UNKNOWN, CTA UNKNOWN, blocked vs live counts, GSC export booleans, trend). Command center re-exports `system_health_summary` from command surface. |
| **Required inputs** | Command surface dataset (Supabase + local files + optional snapshot). |
| **Output fields** | `status`, `reasons[]`, `recommended_next_step`. |
| **Why it matters** | Fail-safe: do not treat monetization signals as valid when upstream health is CRITICAL. |
| **Failure mode if missing** | Operating on stale or broken DB views; false PASS culture. |

### N) Minimum daily / weekly operator workflow (goal 14)

| Field | Content |
|--------|--------|
| **Purpose** | Repeatable ritual that keeps health green and queues non-stale. |
| **Current repo truth** | **PARTIAL** — inferred only from **wired** npm scripts (not a single doc that mandates cadence): e.g. `npm run buckparts:audit`, `buckparts:command-center`, `buckparts:command-surface` (optional `--write-snapshot` for trend), `buckparts:report:business-scorecard`, `buckparts:report:affiliate-clicks`, wedge `buckparts:guardrails:*` / `buckparts:runbook:*`. **UNKNOWN** org-specific SLOs or on-call rotation. |
| **Suggested minimum (design)** | **Daily:** `buckparts:audit` + `buckparts:command-center` JSON archived. **Weekly:** command-surface snapshot for trend + scorecard + affiliate clicks + one blocked-queue/OEM cohort deep dive. **As needed:** mutating scripts per manifest risk section with explicit preflight. |
| **Why it matters** | Small consistent inputs beat rare heroic audits. |
| **Failure mode if missing** | Drift between tracker JSON and DB; trend fields useless. |

---

## 15) Exact data sources already present (repo-evidenced)

| Source | Role |
|--------|------|
| `public.retailer_links`, `public.filters`, `public.fridge_models`, `public.compatibility_mappings` | Refrigerator wedge catalog + links (numerous scripts). |
| AP/WH tables per `report-homekeep-business-scorecard.ts` `WEDGE_CFG` | Parallel wedges. |
| `public.click_events` | Click telemetry (schema in `supabase/schema.sql`; readers in scorecard + affiliate-clicks). |
| `public.learning_outcomes` | Outcome memory table + metrics in command surface. |
| Search intelligence / gap migrations | `supabase/migrations/20260410170000_search_intelligence.sql`, `20260410180000_search_gap_candidates.sql`, related fridge RPC migrations. |
| `data/affiliate/affiliate-application-tracker.json` | Human-maintained affiliate state; command center + audits consume it. |
| `data/evidence/*.json` | Run artifacts for Amazon/Frigidaire/multipack workstreams. |
| `src/lib/retailers/launch-buy-links.ts`, `src/lib/retailers/retailer-link-state.ts` | Gate and state truth. |
| `docs/buckparts-script-classification-manifest.md` | Which scripts are read-only vs mutating. |
| Optional local GSC exports | Command surface checks `gsc_exports_present` paths (boolean flags from disk). |

---

## 16) Exact data sources still missing or not proven in-repo

| Gap | Repo truth |
|-----|------------|
| **Affiliate network conversion feed** | No evidenced ingestion script → **MISSING / UNKNOWN**. |
| **Unified evidence schema** | Evidence JSONs vary by task; no single JSON schema enforced in command center beyond key listing → **PARTIAL**. |
| **FlexOfferrs readiness snapshot on disk** | Command center expects `data/reports/flexoffers-readiness-refrigerator-water.json`; generator prints stdout → **MISSING** wiring unless operator redirects manually. |
| **Command center ingestion of Amazon-first queue** | Script exists; not imported in `report-buckparts-command-center.ts` → **MISSING** integration. |
| **READY_FOR_ASYNC_REVIEW semantics** | Enum present, logic not evidenced → **UNKNOWN** implementation. |
| **Production learning_outcomes write volume** | Writer exists; full producers **UNKNOWN** from this document’s file survey. |

---

## 17) Phases to build in order (recommended)

1. **Snapshot + digest hardening** — Require `buckparts:command-surface:snapshot` on a schedule; archive `buckparts:command-center` JSON; fix FlexOffers file path or add a small wrapper script that writes `data/reports/flexoffers-readiness-refrigerator-water.json` (read-only generation).
2. **Integrate highest-leverage queues into command center JSON** — Amazon-first blocked queue, false-negative audit summary counts, blocked-link top states (dedupe narratives).
3. **Evidence registry contract** — Minimal JSON schema (version, run_id, wedge, action_type, outcome) + command center section that validates presence, not just keys.
4. **Search intelligence → command surface** — Surface top search-gap metrics per wedge when `UNKNOWN_NOT_QUERIED` is eliminated.
5. **Conversion ingestion spec** — Choose one network first; schema mapping; idempotency; optional new table vs `learning_outcomes` columns.
6. **Operator-away v2** — Separate “read-only monitoring OK” from “mutations allowed without human” using explicit checks (DB health, pending affiliate, unresolved Frigidaire link IDs).
7. **NBA v2** — Weighted scoring: demand × unblockable revenue × affiliate readiness × false-negative flag; still deterministic.
8. **UI layer** — Read-only dashboard consuming frozen JSON artifacts (last; not started per Phase 1).

---

## Smallest buildable Command Center v2 slice

**Scope:** One PR-sized increment, no UI, no runtime change.

1. Add `buildAmazonFirstBlockedConversionQueueReport()` (or parsed stdout contract) as a **dependency** inside `buildBuckpartsCommandCenterReport`, exposing `amazon_first_blocked_queue: { top_n_summary, needs_search_count, noop_count }` in the JSON.
2. Add a `package.json` script `buckparts:flexoffers-readiness:write` **or** document plus implement a tiny shell-safe redirect target so `data/reports/flexoffers-readiness-refrigerator-water.json` exists for CI/local without manual copypasta.
3. Extend `known_unknowns` when that file is missing with a **single** actionable line (already partially present—make generation foolproof).

This slice improves **goals 4–6 and 12–13** without touching DB schema or Next.js routes.

---

## Mapping: blueprint sections → original goal list

| Goal # | Covered by |
|--------|------------|
| 1 | §A Money tracking |
| 2 | §B Click tracking |
| 3 | §C Affiliate conversion ingestion |
| 4 | §D Blocked-link reduction |
| 5 | §E Amazon-first rescue |
| 6 | §F Non-Amazon affiliate readiness |
| 7 | §G Evidence / learning memory |
| 8 | §H Customer / search learning |
| 9 | §I False-negative tracking |
| 10 | §J Page-level monetization priority |
| 11 | §K Operator-away mode |
| 12 | §L Next-best-action engine |
| 13 | §M Health / status rules |
| 14 | §N Operator workflow |
| 15 | §15 Data sources present |
| 16 | §16 Data sources missing |
| 17 | §17 Build phases |

---

## Explicit non-claims

- The Command Center is **not** complete; v1 is a **partial** aggregator.
- No statement of production cron, hosting, or secrets management—**UNKNOWN** outside repo.
- Revenue dollars are **not** currently modeled in evidenced read-only reports.
