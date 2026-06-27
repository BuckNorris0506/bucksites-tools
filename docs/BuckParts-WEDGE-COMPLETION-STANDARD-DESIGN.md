# BuckParts Wedge Completion Standard (Design)

**Status:** Design only — no implementation authorized by this document.  
**Governing:** `docs/BuckParts-CONSTITUTION.md`, `docs/ARCHITECTURE.md`, `docs/BuckParts-FOUNDATION-V2-COMPLETION.md`, `docs/BuckParts-TOP-OF-GAME-CHECKLIST.md`  
**Truth contract:** Repo truth over memory. Label claims **PROVEN**, **INFERRED**, or **UNKNOWN**.

---

## 1. Purpose

### 1.1 What this standard is

The **Wedge Completion Standard** defines **objective pass/fail criteria** a **Homekeep product wedge** must satisfy before BuckParts **expands operational priority or public discovery** to another wedge.

**Scope unit:** `HomekeepWedgeCatalog` wedges (`refrigerator_water`, `air_purifier`, `whole_house_water`, `vacuum`, `humidifier`, `appliance_air`) — the same unit used by census, demand-to-coverage, and wedge truth spine matrix.

**“Expand to another wedge” means any of:**

| Expansion action | PROVEN control surface |
|------------------|------------------------|
| Change `VERTICAL_LAUNCH_STATES` from `NOINDEX_UNPROVEN` → `LIVE` | `src/lib/catalog/vertical-launch-state.ts` |
| Add wedge to `CATALOG_HUB_LAUNCH_CATEGORIES` | `src/lib/catalog/catalog-availability.ts` |
| Promote wedge on homepage browse promo beyond fridge-first policy | `FRIDGE_FIRST_HOMEPAGE_BROWSE_PROMO_VERTICALS` in `owner-vertical-launch-policy.ts` |
| Shift primary production mission / coverage sprint focus per demand lane | `demand_to_coverage_next_lane_v1` + founder execution choice |

**PROVEN doctrine (HQ handoff):** *“No second wedge until BuckParts has stronger first-wedge proof.”* This standard **operationalizes “stronger proof”** for **catalog wedges** using existing Foundation v2 evidence — it does **not** authorize new product wedges (recall, warranty, etc.).

### 1.2 What this standard is not

- **Not** a new orchestration layer — evaluation uses existing read-only factories and Command Center lanes.
- **Not** a mutation authority — passing does not auto-change launch state or deploy.
- **Not** a revenue or traffic gate — GSC clicks and impressions inform measurement only (Constitution §6; Top-of-Game revenue truth = `DARK`).

### 1.3 Overall pass rule

A wedge is **WEDGE COMPLETE** when **all four dimensions pass** on the same evaluation run. Any single dimension **FAIL** blocks wedge expansion.

**INFERRED:** Store evaluation output as a read-only **`wedge_completion_audit_v1`** JSON bundle (stdout or `data/command-center/wedge-completion-audits/`) composed from existing report outputs — no new truth sources.

---

## 2. Evaluation harness (reuse only)

Run before any expansion decision. All commands are **PROVEN** in repo; composition into one audit script is **INFERRED**.

```bash
# Census + wedge inventory
node --import tsx scripts/report-all-product-safe-buyer-path-census-v1.ts

# Truth spine parity across wedges
node --import tsx scripts/report-wedge-truth-spine-coverage-matrix-v1.ts

# Public readiness + buyer-path truth
node --import tsx scripts/report-public-wedge-readiness-and-easiest-wins-v1.ts

# Executable batch / +10 proof
node --import tsx scripts/report-coverage-production-sprint-v2.ts

# Demand ↔ coverage (requires fresh GSC artifact when possible)
npm run buckparts:gsc:fetch   # when authorized
node --import tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts

# Referenceability gaps (proven slugs, scoped wedges)
npm run buckparts:referenceability:factory

# Operations metrics + history
npm run buckparts:operations-metrics
npm run buckparts:operations-metrics -- --record-snapshot   # when recording trend

# Production mission state
node --import tsx scripts/report-buckparts-command-center.ts 2>/dev/null | jq '.command_center_v2.production_mission_v1'

# Owner launch policy cross-check
node --import tsx scripts/report-buckparts-command-center.ts 2>/dev/null | jq '.command_center_v2.founder_decision_registry_summary_v1'

# Daily operator (GSC/GA4/route health — re-run before citing live)
npm run buckparts:daily
```

**Foundation v2 systems reused across all dimensions:**

| System | Contract | Role in standard |
|--------|----------|------------------|
| Command Center | `command_center_v2` | Aggregates lanes; **does not** auto-expand |
| Runner | `buckparts_runner_v1` | Production mission proof runs |
| Production Mission | `production_mission_v1` | Coverage + lifecycle proof |
| Operations Metrics | `operations_metrics_v1` | Measurement completeness |
| Agent Contract | `agent_contract_v1` | External evidence/copy tasks |
| Owner Decision Queue | `owner_decision_queue_v1` | Approval halts on apply/deploy |
| Census | `all_product_safe_buyer_path_census_v1` | Coverage + classification truth |
| Coverage Sprint v2 | `coverage_production_sprint_v2_v1` | Batch executability / +10 proof |

---

## 3. Dimension 1 — Coverage completeness

**Question:** Can this wedge **reliably produce** additional `SAFE_BUYER_PATH_PROVEN` inventory through the **proven Foundation v2 operating loop**, with truth infrastructure that is not sample-only or spine-absent?

### Required evidence

| Evidence | Source | Status |
|----------|--------|--------|
| Wedge census row (`product_page_count`, classification counts) | `all_product_safe_buyer_path_census_v1` | **PROVEN** |
| CSV inventory source (`committed_csv` vs `sample_csv_only`) | Census wedge summary + `public_wedge_readiness_and_easiest_wins_v1` | **PROVEN** |
| Truth spine / lane coverage status | `wedge_truth_spine_coverage_matrix_v1` | **PROVEN** |
| Buyer-path truth on committed CSV | `buyer_path_truth_status` in public wedge readiness | **PROVEN** |
| Executable batch ranking and +10 impossibility proof | `coverage_production_sprint_v2_v1` | **PROVEN** |
| Production mission lifecycle with census delta | `data/command-center/production-missions/*.json` | **PROVEN** |
| Wedge capability lanes (model-first, buyer-path, apply, browser truth) | `WEDGE_CAPABILITY_PROBES` in wedge matrix | **PROVEN** |

### Required artifacts

| Artifact | Path / command |
|----------|----------------|
| Census JSON (wedge slice) | `report-all-product-safe-buyer-path-census-v1.ts` stdout |
| Wedge truth spine matrix row for wedge | `report-wedge-truth-spine-coverage-matrix-v1.ts` → `.wedges[]` |
| Public wedge readiness row | `report-public-wedge-readiness-and-easiest-wins-v1.ts` |
| Coverage sprint v2 report | `report-coverage-production-sprint-v2.ts` |
| ≥1 production mission lifecycle artifact with wedge primary slug | `data/command-center/production-missions/buckparts-production-mission-*.json` |
| Matching runner run artifact | `data/command-center/runner-runs/buckparts-runner-production_mission_v1-*.json` |
| Guarded apply closeout (when delta claimed) | e.g. `data/fridge/batch-production/closeout/manufacturer-rescue-guarded-apply-bridge-closeout-v1.json` |

### Objective pass/fail criteria

**PASS** iff **all** conditions hold:

| # | Criterion | Pass condition | Fail condition |
|---|-----------|----------------|----------------|
| C1 | **Committed catalog** | `csv_inventory_source === "committed_csv"` for wedge in census **and** public readiness | `sample_csv_only` or `missing` |
| C2 | **Truth infrastructure** | `truth_coverage_status === "FORMAL_SPINE"` **OR** (`truth_coverage_status === "PARTIAL_OPERATIONAL_PROOF"` **and** every non-null probe in `WEDGE_CAPABILITY_PROBES[wedge]` exists on disk per matrix row) | `SAMPLE_ONLY`, `PUBLIC_BUT_SPINE_GAP`, `PREVIEW_ONLY_UNPROVEN`, or `UNKNOWN` |
| C3 | **Proven buyer paths exist** | `safe_buyer_path_proven_count >= 1` **and** `buyer_path_truth_status === "PROVEN_SAFE_ROWS_EXIST"` | `ZERO_SAFE_ROWS` or proven count `0` |
| C4 | **Operating loop proven for wedge** | ≥1 lifecycle artifact where `lifecycle_complete === true`, `safe_buyer_path_proven.delta >= 1`, and `target.primary_apply_slug` (or batch `target_slugs`) belongs to wedge catalog CSV | No lifecycle complete artifact for wedge, or all `delta === 0` |
| C5 | **Batch throughput posture documented** | Either (a) coverage sprint reports ≥1 batch with `target_slugs` ⊆ wedge and `executability ∈ {EXECUTABLE_NOW, EXECUTABLE_AFTER_APPROVAL}` with `expected_safe_buyer_path_proven_delta >= 1`, **or** (b) `plus_ten_executable_possible === false` **and** `plus_ten_impossibility_proof[]` is non-empty **and** no remaining EXECUTABLE batches for wedge without documented blockers | Sprint report missing; executable batches exist but undocumented; impossibility unproven |
| C6 | **Suppressed trust explained** | Every `SAFE_BUYER_PATH_SUPPRESSED_TRUST` slug in wedge has `recommended_next_safe_action` ≠ empty in census row | **INFERRED** — census always emits actions; fail if any slug action is generic/empty **UNKNOWN** without manual audit |

**Note on C5 and +10 target:** `COVERAGE_PRODUCTION_SPRINT_V2_MIN_BATCH_TARGET_V1 = 10` is a **site-wide sprint ambition** (`coverage-production-sprint-v2.ts`). It is **not** a per-wedge completion floor. **PASS** requires **documented** executability or **documented** impossibility — not necessarily +10 in one wedge.

### Metrics

| Metric | Source field | Use |
|--------|--------------|-----|
| `safe_buyer_path_proven_count` | Census wedge summary | Primary coverage inventory |
| `safe_buyer_path_suppressed_trust_count` | Census wedge summary | Remaining trust debt |
| `product_page_count` | Census wedge summary | Denominator for **INFERRED** coverage ratio (not pass gate) |
| `largest_achievable_executable_delta` | Coverage sprint v2 | Throughput ceiling |
| `plus_ten_executable_possible` | Coverage sprint v2 | Site-wide batch ambition |
| `truth_coverage_status` | Wedge matrix row | Infrastructure maturity |
| `safe_buyer_path_proven.delta` | Production mission lifecycle | Loop proof |
| `has_formal_truth_spine` | Wedge matrix row | Spine presence |

### Owner approval requirements

| Action | Approval |
|--------|------------|
| Running read-only coverage evaluation | None |
| CSV / guarded apply to increase proven count | **Existing** founder registry + guarded apply executors + ODQ (Foundation v2) |
| Declaring wedge coverage dimension PASS | **Founder sign-off** on audit bundle — not automated |

### Foundation v2 / existing systems providing evidence

- **`all_product_safe_buyer_path_census_v1`** — classification counts per wedge  
- **`wedge_truth_spine_coverage_matrix_v1`** — spine and lane inventory  
- **`coverage_production_sprint_v2_v1`** — batch executability  
- **`production_mission_v1`** + lifecycle artifacts — end-to-end loop proof  
- **`buckparts_runner_v1`** — mission execution record  
- **`manufacturer_safe_link_rescue_*` / wedge apply lanes** — executability infrastructure (fridge)  
- **`air_purifier_batch_production_lane_v1`** — AP batch infrastructure  

### PROVEN / INFERRED / UNKNOWN

| Claim | Status |
|-------|--------|
| Census classifies every wedge slug | **PROVEN** |
| Production mission lifecycle requires delta ≥1 for `lifecycle_complete` | **PROVEN** (`buckparts-production-mission-v1.ts`) |
| +10 is sprint target, not wedge completion floor | **PROVEN** (`COVERAGE_PRODUCTION_SPRINT_V2_MIN_BATCH_TARGET_V1`) |
| Per-wedge production mission required | **INFERRED** from Fv2 proof model (one proven loop minimum) |
| Optimal proven-count threshold for “complete” | **UNKNOWN** — repo does not define a numeric floor beyond ≥1 loop proof |

---

## 4. Dimension 2 — Customer experience completeness

**Question:** For this wedge’s **public routes**, can a homeowner **safely understand fit, uncertainty, and buying options** using approved language — on pages where paths are proven?

### Required evidence

| Evidence | Source | Status |
|----------|--------|--------|
| Universal trust question coverage by page type | `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` | **PROVEN** |
| Page quality gate reports for proven cohort | `buckparts_page_quality_gate_v1` | **PROVEN** |
| Proven cohort page factory manifest | `proven_cohort_page_factory_manifest_v1` | **PROVEN** |
| Referenceability work items on proven slugs | `referenceability_factory_run_v1` | **PROVEN** |
| Live-site route health / banned phrases | `report-buckparts-daily-operator.ts`, `live-site-trust-page-content-contract-v1` | **PROVEN** |
| Safe CTA / buy-link gate behavior | `launch-buy-links.ts`, census `retailer_row_state` | **PROVEN** |

### Required artifacts

| Artifact | Path / command |
|----------|----------------|
| Universal Page Trust Contract audit matrix (wedge routes) | `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` |
| Page quality gate JSON for proven cohort slugs | `data/fridge/batch-production/page-factory/` artifacts |
| Referenceability factory run output | `npm run buckparts:referenceability:factory` |
| Daily operator report (route health, phrase findings) | `npm run buckparts:daily` |
| Census rows for wedge `SAFE_BUYER_PATH_PROVEN` slugs | Census stdout |

### Objective pass/fail criteria

**PASS** iff **all** conditions hold:

| # | Criterion | Pass condition | Fail condition |
|---|-----------|----------------|----------------|
| E1 | **Primary PDP trust status** | Wedge filter PDP route (`/filter/…` or `/<vertical>/filter/…`) marked **`READY`** in Universal Page Trust Contract **or** proven cohort quality gate **`PASS`** with no `internal_link_context` / trust blockers | `NEEDS_WORK`, `NEEDS_COPY_ALIGNMENT`, or gate `BLOCKED` on proven slug |
| E2 | **Model / fit pages** (when wedge has model routes) | Fridge-style model pages **`READY`** **or** wedge equivalent passes page quality gate `model_filter_correctness` scope | Flagship model route not READY for LIVE wedge |
| E3 | **Proven slug UX debt cleared** | For every census row in wedge with `page_classification === "SAFE_BUYER_PATH_PROVEN"`: referenceability factory has **no** work item with `permitted_action_class ∈ {OWNER_COPY_REVIEW, STRUCTURED_DATA_WIRE, INTERNAL_LINK_PLAN}` and `priority_score` above referenceability baseline **unless** item is `READ_ONLY_AUDIT` only | Any proven slug has blocking referenceability recommendation |
| E4 | **Banned phrase contract** | Daily operator / live-site smoke reports **no** universal banned phrases on wedge **LIVE** routes (if wedge is LIVE) | Banned phrases found on LIVE wedge routes |
| E5 | **Buying options policy** | All proven slugs: census `retailer_row_state` consistent with `SAFE_BUYER_PATH_PROVEN`; suppressed slugs explain hidden CTA per trust Q8 on PDP template | Proven slug shows buy path without census PROVEN alignment **UNKNOWN** without live audit |
| E6 | **Non-live wedge policy** (when `launch_state === NOINDEX_UNPROVEN`) | Layout `noindex,follow` expected per `owner-vertical-launch-policy.ts`; trust gaps documented but **do not block** completion if wedge is **not** requesting LIVE promotion | Requesting LIVE while trust contract marks wedge hubs `NOINDEX_UNPROVEN` copy gaps unaddressed |

**LIVE vs complete:** A **NOINDEX_UNPROVEN** wedge may pass E1–E3 on **proven slug subset** without passing E4 on full hub — but **cannot** authorize LIVE expansion without E4 on routes that would become indexable.

### Metrics

| Metric | Source | Use |
|--------|--------------|-----|
| Proven slug count | Census | Denominator for E3 |
| Referenceability `work_item_count` on proven slugs | Referenceability factory | UX debt |
| Page quality gate `BLOCKED` count | Quality gate reports | Objective blockers |
| `linked_filters_with_safe_gated_buy_path` | Public wedge readiness | Buyer-path UX coverage |
| `search_placeholder_count` | Public wedge readiness | Broken discovery UX |
| Trust contract page-type status | Universal trust doc | Qualitative READY/NEEDS_* |

### Owner approval requirements

| Action | Approval |
|--------|------------|
| Read-only UX / trust audit | None |
| Public copy or template changes | **Owner copy review** per Universal Page Trust Contract |
| Deploy of template changes | Deploy classifier + founder deploy decision |
| HyperAgent browser / homeowner audits | **Agent Contract** dispatch (Foundation v2) |

### Foundation v2 / existing systems providing evidence

- **`agent_contract_v1`** — external copy/homeowner-language audits  
- **`owner_decision_queue_v1`** — halts on deploy approval  
- **`referenceability_factory_run_v1`** — proven-slug gap inventory  
- **`buckparts_page_quality_gate_v1`** — objective gate bundle  
- **`production_mission_v1`** — agent dispatch for browser proof refresh (fridge pattern)  
- **Universal Page Trust Contract** — question coverage standard  

### PROVEN / INFERRED / UNKNOWN

| Claim | Status |
|-------|--------|
| Fridge filter PDP and model pages marked READY in trust contract | **PROVEN** (doc matrix) |
| Non-live vertical hubs marked NOINDEX_UNPROVEN with copy gaps | **PROVEN** (trust contract § non-live verticals) |
| Referenceability scoped to AP + refrigerator_water proven slugs | **PROVEN** (`REFERENCEABILITY_FACTORY_SCOPED_WEDGES_V1`) |
| Automated trust-question detection on all routes | **UNKNOWN** — partially manual / HyperAgent |
| Full-site phrase guard test | **UNKNOWN** — proposed in trust contract, not proven deployed |

---

## 5. Dimension 3 — Distribution completeness

**Question:** Are **proven paths in this wedge discoverable** through on-site navigation, structured data, and demand-aligned surfaces — without treating demand as fit proof?

### Required evidence

| Evidence | Source | Status |
|----------|--------|--------|
| GSC demand by wedge / page | `demand_to_coverage_next_lane_v1`, GSC artifact | **PROVEN** |
| Demand work queue items | `buckparts_demand_work_queue_v1` | **PROVEN** |
| Internal link context gate | `buckparts_page_quality_gate_v1` | **PROVEN** |
| Product JSON-LD wiring | `src/lib/seo/structured-data.ts`, referenceability structured_data class | **PROVEN** |
| Marketing intelligence suggested links (secondary) | `marketing_intelligence_engine_v1` | **PROVEN** |
| Vertical launch / sitemap policy | `owner-vertical-launch-policy.ts`, `wedge-indexable-urls.ts` | **PROVEN** |
| Compatibility mappings for link graph | `compatibility_mappings.csv` (+ wedge CSVs) | **PROVEN** |

### Required artifacts

| Artifact | Path / command |
|----------|----------------|
| Demand-to-coverage report (wedge row) | `report-buckparts-demand-to-coverage-next-lane.ts` |
| GSC artifact | `data/reports/buckparts-gsc-search-analytics.json` or Supabase durable store |
| Referenceability factory (internal_linking + structured_data items) | `npm run buckparts:referenceability:factory` |
| Page quality gate `internal_link_context` | Quality gate JSON |
| SEO structured-data test output | `src/lib/seo/structured-data.test.ts` (CI) |
| Owner vertical launch policy report | Embedded in CC / `buildOwnerVerticalLaunchPolicyReport` |

### Objective pass/fail criteria

**PASS** iff **all** conditions hold:

| # | Criterion | Pass condition | Fail condition |
|---|-----------|----------------|----------------|
| D1 | **Demand signal freshness** | `demand_to_coverage_next_lane_v1.runtime_status !== "UNKNOWN"` **and** `source_status !== "UNKNOWN"` for evaluation run; if GSC stale, `blockers[]` documents refresh command | `UNKNOWN` runtime with no documented blocker path |
| D2 | **Proven slug internal links** | For every `SAFE_BUYER_PATH_PROVEN` slug in wedge with `compat_model_count > 0`: page quality gate `internal_link_context === PASS` **or** referenceability `INTERNAL_LINK_PLAN` work item executed and gate re-run **PASS** | Proven slug with compat mappings but gate BLOCKED |
| D3 | **Structured data on proven PDPs** | Filter template uses `buildRefrigeratorFilterProductJsonLd` (or wedge-equivalent) **and** referenceability has no open `STRUCTURED_DATA_WIRE` for proven slug **or** JSON-LD audit `READ_ONLY_AUDIT` PASS | Missing Product JSON-LD on proven LIVE PDP |
| D4 | **Search intent alignment** (demand capture) | `search_intent_factory_proof_experiment_v1` run for wedge shows ≥1 accepted work item class with `content_invention_required: false` **or** zero rejected items with reason `INSUFFICIENT_GSC_DATA` when GSC PROVEN | All work items rejected `CONTENT_INVENTION_REQUIRED` / `INSUFFICIENT_GSC_DATA` with no path forward |
| D5 | **Indexing policy alignment** (LIVE wedges only) | `owner-vertical-launch-policy` row: `sitemap_discovery_urls_expected === true` when `is_live === true`; `layout_noindex_follow_expected === false` | LIVE wedge with noindex layout or missing sitemap discovery |
| D6 | **Demand ≠ fit guard** | No distribution artifact claims fit authority from GSC queries alone; demand lane ranks **coverage work** before **copy expansion** on unproven slugs | Marketing/demand outputs prioritize unproven slugs without `NEEDS_COVERAGE_FIRST` tag **INFERRED** check |

**Note:** Foundation v3 proposed factories (`proven_compat_link_graph_v1`, etc.) are **not required** for this standard — **`referenceability_factory_run_v1` + page quality gate + demand-to-coverage** provide sufficient repo truth today.

### Metrics

| Metric | Source | Use |
|--------|--------------|-----|
| `impressions` / `clicks` per wedge row | Demand-to-coverage | Demand volume |
| `priority_score` | Demand-to-coverage wedge rows | Relative demand |
| `recommendation_count` (referenceability) | Referenceability factory | Distribution debt |
| `internal_link_context` status | Page quality gate | Link graph readiness |
| GSC `top_pages` / `top_queries` | Demand-to-coverage | Intent mapping |
| `sitemap_discovery_urls_expected` | Owner launch policy | LIVE discoverability |

### Owner approval requirements

| Action | Approval |
|--------|------------|
| Read-only distribution audit | None |
| GSC fetch | **Founder / operator** credentials (`npm run buckparts:gsc:fetch`) |
| Applying internal link or JSON-LD template changes | Owner copy review + deploy approval |
| Changing LIVE / NOINDEX launch state | **Founder code change** to `vertical-launch-state.ts` + deploy |
| Publishing marketing drafts | **NEVER** auto — `marketing_intelligence_engine_v1` is draft-only |

### Foundation v2 / existing systems providing evidence

- **`demand_to_coverage_next_lane_v1`** — demand ↔ coverage join  
- **`referenceability_factory_run_v1`** — link + schema gaps on proven slugs  
- **`marketing_intelligence_engine_v1`** — demand-ranked opportunities (draft)  
- **`buckparts_demand_work_queue_v1`** — operational demand items  
- **`operations_metrics_v1`** — not primary for D1–D5 but records mission cadence  
- **`distribution_opportunity_registry_v1`** — manual channel plans (optional index)  
- **SEO Phase 1 JSON-LD** — structured data bounds  

### PROVEN / INFERRED / UNKNOWN

| Claim | Status |
|-------|--------|
| GSC ingest and demand-to-coverage join exist | **PROVEN** |
| Internal link gate uses compat CSV | **PROVEN** |
| Product JSON-LD forbidden commerce keys | **PROVEN** |
| Search intent proof experiment is read-only | **PROVEN** |
| Search intent alignment module on disk | **UNKNOWN** — imported by proof experiment but file absent at design time |
| Organic traffic lift from distribution PASS | **UNKNOWN** |

---

## 6. Dimension 4 — Measurement completeness

**Question:** Can BuckParts **prove whether operating this wedge** improves proven-path inventory, discovery signals, and customer completion proxies — without guessing?

### Required evidence

| Evidence | Source | Status |
|----------|--------|--------|
| Operations metrics aggregates + history | `operations_metrics_v1` | **PROVEN** |
| Production mission metrics append | Lifecycle + `history-v1.jsonl` | **PROVEN** |
| Census time series | Repeated census runs / ops metrics snapshots | **PROVEN** |
| GSC / GA4 in daily operator | `report-buckparts-daily-operator.ts` | **PROVEN** |
| Customer authority / closure proxies | `customer_authority_score_v1`, `customer_closure_report_v1` | **PROVEN** |
| Customer reality scoreboard | `customer_reality_scoreboard_v1` | **PROVEN** |

### Required artifacts

| Artifact | Path / command |
|----------|----------------|
| Operations metrics history | `data/command-center/operations-metrics/history-v1.jsonl` |
| Production mission lifecycle (metrics section) | `operations_metrics.snapshot_recorded`, aggregate rates |
| ≥2 metrics snapshots spanning wedge work | History JSONL lines with distinct `generated_at` |
| Daily operator output | `npm run buckparts:daily` |
| Customer authority score lane | CC `.customer_authority_score_v1` |
| Census before/after production mission | Lifecycle `safe_buyer_path_proven.baseline/at_run/delta` |

### Objective pass/fail criteria

**PASS** iff **all** conditions hold:

| # | Criterion | Pass condition | Fail condition |
|---|-----------|----------------|----------------|
| M1 | **Operations metrics history** | ≥2 lines in `history-v1.jsonl` with `aggregate.safe_buyer_path_proven_count` or equivalent census field recorded **and** timestamps separated by ≥24h | 0–1 snapshots |
| M2 | **Wedge production mission measured** | ≥1 production mission lifecycle for wedge with `operations_metrics.snapshot_recorded === true` | Mission ran without metrics append |
| M3 | **Census reproducibility** | Census command succeeds; wedge summary matches lifecycle baseline within same run window | Census failure or drift unexplained |
| M4 | **Demand measurement** | Daily operator or demand-to-coverage reports GSC wedge metrics as **PROVEN** or **PARTIAL** with explicit `unknown_facts` — not silent omission | GSC entirely UNKNOWN without blocker documentation |
| M5 | **Throughput interpretation discipline** | No claim of “improvement” in audit unless ops metrics doc rule satisfied (≥2 snapshots over real operating time) | Improvement claimed from single snapshot |
| M6 | **Closure proxy tracked** | `customer_visible_closures_count` present and ≠ `"UNKNOWN"` in customer authority / closure lane **or** documented as UNKNOWN with reason in audit | Closure permanently unmeasured without acknowledgment |

**Revenue / conversion:** Explicitly **excluded** from pass criteria — Top-of-Game marks revenue truth **`DARK`**.

### Metrics

| Metric | Source | Use |
|--------|--------------|-----|
| `safe_buyer_path_proven_count` (series) | Ops metrics history / census | Inventory trend |
| `safe_buyer_path_proven_delta` | Lifecycle / ops metrics | Loop output |
| `agent_success_rate` | Ops metrics | Dispatch quality |
| `validation_pass_rate` | Ops metrics | Repo health during missions |
| `owner_decision_count` / wait time | Ops metrics | Founder load |
| `customer_visible_closures_count` | Customer authority | Completion proxy |
| `all_wedge_coverage_percent` | Customer authority | Cross-wedge coverage |
| GSC impressions/clicks (wedge) | Daily operator / demand lane | Discovery **signal** only |

### Owner approval requirements

| Action | Approval |
|--------|------------|
| Recording metrics snapshot | None (`npm run buckparts:operations-metrics -- --record-snapshot`) |
| Interpreting metrics as authorization to expand wedge | **Founder decision** — metrics inform, do not authorize |
| Connecting revenue feeds | Out of scope — requires separate founder activation |

### Foundation v2 / existing systems providing evidence

- **`operations_metrics_v1`** — primary measurement contract  
- **`production_mission_v1`** — auto-append on mission finalize  
- **`buckparts_runner_v1`** — mission duration and validation steps  
- **`all_product_safe_buyer_path_census_v1`** — inventory ground truth  
- **`customer_authority_score_v1`** — aggregated customer-facing KPIs  
- **`report-buckparts-daily-operator.ts`** — GSC/GA4 freshness  

### PROVEN / INFERRED / UNKNOWN

| Claim | Status |
|-------|--------|
| Ops metrics requires ≥2 snapshots before throughput conclusion | **PROVEN** (`docs/BuckParts-OPERATIONS-METRICS-V1.md`) |
| Production mission appends metrics automatically | **PROVEN** (`docs/BuckParts-PRODUCTION-MISSION-V1.md`) |
| Customer visible closures field exists | **PROVEN** |
| Closures correlate with homeowner completion | **UNKNOWN** |
| Distribution-specific metrics extension (Fv3 design) | **INFERRED** — not required for this standard |

---

## 7. Wedge completion audit bundle (INFERRED)

**Purpose:** Single read-only JSON record per evaluation — **composition of existing reports**, not a new truth engine.

**Proposed contract:** `wedge_completion_audit_v1`

| Field | Content |
|-------|---------|
| `wedge` | `HomekeepWedgeCatalog` |
| `evaluated_at` | ISO timestamp |
| `dimensions` | `{ coverage, customer_experience, distribution, measurement }` each `{ status: PASS\|FAIL, criteria: [{ id, pass, evidence_paths[] }] }` |
| `overall_status` | `WEDGE_COMPLETE` iff all PASS |
| `blocking_dimensions` | Failed dimension ids |
| `recommended_next_action` | Highest-priority failing criterion fix command |
| `mutation_authorized` | `false` always |

**Owner approval to treat as binding:** Founder records **`founder_decision_registry_v1`** row referencing audit artifact path with `decision_status: APPROVED` and scope **`wedge_expansion_authorized`** — **INFERRED** scope string; registry patterns **PROVEN**, this scope name **INFERRED**.

---

## 8. Expansion gate (what happens after PASS)

**PASS on all four dimensions does not auto-expand.** Required sequence:

1. **Re-run evaluation** — commands in §2; cite fresh stdout paths.  
2. **Founder Decision Registry** — explicit approve/defer row for target wedge expansion.  
3. **Code change** (if LIVE promotion) — `vertical-launch-state.ts`, optionally `catalog-availability.ts`, homepage promo constants.  
4. **Deploy** — deploy classifier + normal deploy path.  
5. **Post-expansion measurement** — append ops metrics snapshot; re-run census and demand-to-coverage within 7d — **INFERRED** cadence.

**PROVEN:** Command Center **`next_best_action`** may recommend demand-selected wedge work — it **does not** replace founder launch policy (`docs/ARCHITECTURE.md` — CC not orchestrator).

---

## 9. Current wedge posture (illustrative — re-run before citing)

Evaluation against repo truth at Foundation v2 completion (**not** a certified audit):

| Wedge | Launch | Coverage (informal) | Likely blocking dimensions |
|-------|--------|---------------------|----------------------------|
| `refrigerator_water` | LIVE (`refrigerator_routes_live`) | Formal spine; 49 site-wide proven (not all fridge); 1 Fv2 lifecycle proof (`edr4rxd1`) | C5 (+10 not executable); E3/E4 referenceability + copy; M1 (≥2 snapshots rule); D4 search intent module gap |
| `air_purifier` | LIVE | Formal spine; proven rows exist; Fv2 lifecycle not primary for AP slug in cited proof | C4 (Fv2 loop proof for AP slug **UNKNOWN** without re-run); E/D/M partial per trust contract on non-flagship pages |
| `whole_house_water` | NOINDEX_UNPROVEN | PARTIAL_OPERATIONAL_PROOF; no formal spine | C2 (no formal spine); C4; LIVE dimensions N/A until promotion requested |
| `vacuum`, `humidifier`, `appliance_air` | NOINDEX_UNPROVEN | Minimal lane probes empty | C2 FAIL (no lanes); not expansion candidates |

**Classification:** **INFERRED** snapshot for planning — **not** a PASS/FAIL certificate.

---

## 10. Relationship to other standards

| Document | Relationship |
|----------|--------------|
| `docs/BuckParts-TOP-OF-GAME-CHECKLIST.md` | Top-of-Game is **site-wide** maturity; Wedge Completion is **per-wedge expansion gate** |
| `docs/BuckParts-FOUNDATION-V2-COMPLETION.md` | Fv2 proves **one** production loop; Wedge Completion requires **wedge-scoped** loop proof + UX + distribution + measurement |
| `docs/BuckParts-FOUNDATION-V3-DISTRIBUTION-DEMAND-CAPTURE-DESIGN.md` | Fv3 factories **tighten** Dimension 3 when built; **not required** for standard definition |
| `docs/BuckParts-HQ-HANDOFF.md` | “No second wedge” doctrine — this standard implements **when** next **catalog** wedge may open |

---

## 11. Explicit non-goals

- New Runner mission type solely for audits (optional **INFERRED** `wedge_completion_audit_v1` report script — reuses existing factories)  
- Auto-update of `VERTICAL_LAUNCH_STATES`  
- Revenue or affiliate conversion gates  
- Numeric “80% proven coverage” threshold — **not in repo**  
- Recall / medical / legal product wedges (HQ: **NOT APPROVED FOR BUILD**)

---

## 12. Repo-truth citations

| Source | Use |
|--------|-----|
| `src/lib/catalog/vertical-launch-state.ts` | LIVE vs NOINDEX_UNPROVEN |
| `src/lib/catalog/identity.ts` | Wedge catalog |
| `scripts/lib/all-product-safe-buyer-path-census-v1.ts` | Coverage classifications |
| `scripts/lib/wedge-truth-spine-coverage-matrix-v1.ts` | Spine + lane matrix |
| `scripts/lib/public-wedge-readiness-and-easiest-wins-v1.ts` | Buyer-path + CSV source |
| `scripts/lib/coverage-production-sprint-v2.ts` | +10 / executability |
| `data/command-center/production-missions/*.json` | Fv2 lifecycle proof |
| `docs/BuckParts-UNIVERSAL-PAGE-TRUST-CONTRACT.md` | Customer experience |
| `scripts/lib/referenceability-factory-run-v1.ts` | Distribution gaps |
| `scripts/lib/demand-to-coverage-next-lane-v1.ts` | Demand signals |
| `docs/BuckParts-OPERATIONS-METRICS-V1.md` | Measurement rules |
| `docs/BuckParts-PRODUCTION-MISSION-V1.md` | Loop + metrics append |
| `docs/ARCHITECTURE.md` | Layer boundaries + invariants |
| `docs/BuckParts-HQ-HANDOFF.md` | Second-wedge doctrine |
| `src/lib/owner-dashboard/owner-vertical-launch-policy.ts` | Launch policy derivation |

---

## 13. Design metadata

| Field | Value |
|-------|-------|
| **Document type** | Design only — no code |
| **Deploy impact** | `NO_DEPLOY_NEEDED` |
| **SAFE_TO_COMMIT** | **SAFE_TO_COMMIT** — docs-only |
