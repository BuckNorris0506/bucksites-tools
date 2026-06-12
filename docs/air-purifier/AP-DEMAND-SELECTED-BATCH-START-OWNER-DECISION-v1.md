# AP demand-selected first slice — owner decision packet v1

**Report type:** read-only planning / owner decision support (no production mutation)  
**Generated:** 2026-06-12  
**Repo checkpoint:** `45d702c` ancestry (`b5b8000` — evidence-aware AP owner-review selector)  
**Command Center lane:** `.command_center_v2.air_purifier_demand_selected_batch_owner_review_v1`  
**Truth source:** `npm run buckparts:command-center` → `scripts/report-buckparts-command-center.ts` (not HQ handoff)

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner approval to allow **read-only external/browser discovery** on **two slugs only** (`holmes-hapf30`, `shark-hepa-hp100`) | A **batch run-registry** creation step |
| A decision-support doc for Jared | An authorization to write evidence files, CSV, Supabase, UI, or deploy |
| A scope lock on the **first slice only** | Approval of the full owner-review top 10 |

**PROVEN:** Signing this packet does **not** change `batch_start_authorized` in Command Center. That flag stays `false` until a **later repo-supported owner approval mechanism** explicitly authorizes batch start (if any exists at that time). This packet alone does **not** flip that flag.

**PROVEN:** This packet does **not** create `batch_run_registry` JSON on disk.

**PROVEN:** This packet does **not** set `evidence_write_authorized=true`.

---

## Owner decision box

Choose **exactly one** and record your choice in chat (no approval registry row is created by this packet):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE READ-ONLY DISCOVERY FOR FIRST SLICE ONLY                │
│                                                                             │
│  I approve read-only live-browser discovery for:                            │
│    • holmes-hapf30                                                          │
│    • shark-hepa-hp100                                                       │
│  Output in chat only. No repo file writes. No batch registry.               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — DO NOT APPROVE                                                  │
│                                                                             │
│  I do not approve read-only discovery for this slice at this time.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Current Command Center `next_best_action` (PROVEN)

```
DEMAND-TO-COVERAGE [START_NEW_DEMAND_SELECTED_BATCH]: refrigerator_water batch lifecycle is closed on disk (run-registry closeout_complete=true). Next read-only expansion work is demand-selected air_purifier buyer-path batch planning (candidate air_purifier_demand_selected_batch_candidate) via air_purifier_buyer_path_coverage. Mutation unauthorized. Stale refrigerator_water apply-plan approval/proposal/readiness steering is suppressed. all_product_safe_buyer_path_census_v1 / Amazon-first rescue queue remain backlog only — not the top active batch lifecycle action.
```

**`why_this_action` (PROVEN):** Start a demand-selected `air_purifier` buyer-path batch candidate only after owner approval; no open batch is proven by this report.

**INFERRED (operator diagnosis):** Coverage expansion is blocked primarily by **owner-approval throughput** — the lane is ready for review, but `batch_start_authorized=false` until a separate mechanism authorizes batch start.

---

## 2. AP owner-review authorization state (PROVEN)

| Field | Value |
|-------|-------|
| `contract` | `air_purifier_demand_selected_batch_owner_review_v1` |
| `read_only` | `true` |
| `data_mutation` | `false` |
| `owner_approval_required` | `true` |
| `batch_start_authorized` | **`false`** (unchanged by this packet alone) |
| `csv_apply_authorized` | **`false`** |
| `supabase_mutation_authorized` | **`false`** |
| `evidence_write_authorized` | **`false`** |
| `public_ui_mutation_authorized` | **`false`** |
| `netlify_api_authorized` | **`false`** |
| `candidate_rows_status` | `PROVEN` |
| `evidence_index_source_status` | `PROVEN` |

### Blockers (PROVEN — unchanged until later steps)

1. `open_batch_not_proven`
2. `owner_batch_start_approval_missing`
3. `batch_run_registry_not_created`
4. `evidence_collection_not_started`
5. `source_demand_to_coverage_blocker: open_batch_not_proven`

### Demand proof snapshot (PROVEN)

| Signal | Value |
|--------|-------|
| `air_purifier_impressions` | 256 |
| `air_purifier_priority_score` | 236.6 |
| `safe_cta_count` | 10 |
| `blocked_link_count` | 54 |
| Top AP pages | `/air-purifier`, `/air-purifier/model/shark-hp150`, `/air-purifier/model/shark-hp300`, `/air-purifier/filter/blueair-f4max-411` |
| Top AP queries | generic replacement queries (no slug-level attribution in this lane) |

---

## 3. Candidate rows — owner-review top 10 (PROVEN)

**Scope note:** The table below is the **full ranked queue** for context. **Only ranks 2 and 3 are in scope for Option A.** All other rows remain **hold**, **defer**, or **excluded**.

| Rank | filter_slug | evidence_disposition | owner_review_required | **In first-slice approval?** |
|------|-------------|----------------------|----------------------|------------------------------|
| 1 | `blueair-particle-411` | `catalog_identity` | true | **NO — defer** (catalog before buyer-path) |
| 2 | `holmes-hapf30` | `promote_pass_reference` | false | **YES — approved slice** |
| 3 | `shark-hepa-hp100` | `promote_pass_reference` | false | **YES — approved slice** |
| 4 | `winix-carbon-116131` | `hold_needs_owner_review` | true | **NO — hold** |
| 5 | `blueair-f2-211` | `hold_needs_owner_review` | true | **NO — hold** |
| 6 | `blueair-pro-m-particle` | `hold_needs_owner_review` | true | **NO — hold** |
| 7 | `levoit-rf-rar040` | `hold_needs_owner_review` | true | **NO — hold** |
| 8 | `levoit-rf-rar060` | `hold_needs_owner_review` | true | **NO — hold** |
| 9 | `rabbit-carbon-minusa2` | `hold_needs_owner_review` | true | **NO — hold** |
| 10 | `coway-airmega250-rf` | `hold_needs_owner_review` | true | **NO — hold** |

**Prior evidence (PROVEN — approved slice only):**

- **`holmes-hapf30`** — `PASS_REFERENCE` + `recommended_csv_mutation` in `data/air-purifier/batch-production/agent-results/ap-oem-search-placeholder-v1.results.json`.
- **`shark-hepa-hp100`** — same file; HE1FKBAS PDP path documented; reference-only while OOS.

---

## 4. Excluded candidates (PROVEN — never in this slice)

| filter_slug | exclusion_reason |
|-------------|------------------|
| `shark-carbon-foam` | `NO_SAFE_PATH` + `MODEL_FILTER_MAPPING_REVIEW_REQUIRED` |
| `levoit-rf-meta-air` | `NO_SAFE_PATH` |

---

## 5. First slice — exact scope (Option A only)

**APPROVE read-only discovery for these two slugs only:**

1. `holmes-hapf30`
2. `shark-hepa-hp100`

**Everything else is out of scope for this decision:**

- Ranks 1, 4–10 → **hold / defer** (not approved)
- `shark-carbon-foam`, `levoit-rf-meta-air` → **excluded**

**Packet alignment (PROVEN):** Both slugs appear in `ap-oem-search-placeholder-v1` (`data/air-purifier/batch-production/agent-packets/ap-oem-search-placeholder-v1.json`).

---

## 6. HyperAgent — what Option A allows and forbids

### Allowed (read-only discovery, output-only)

- Live-browser visit to manufacturer storefront PDP/search URLs for **`holmes-hapf30`** and **`shark-hepa-hp100`** only.
- Return structured findings **in chat/output only**: final URL, exact tokens seen, stock/buy-button state, wrong-family tokens, reference-only vs buyable classification.
- Use discovery workflow statuses (`DISCOVERY_OPEN`, `DISCOVERY_COMPLETE`, `DISCOVERY_BLOCKED`) — not apply/truth-closure statuses.

### Forbidden — default answer **NO**

| Question | Answer |
|----------|--------|
| May HyperAgent write files to the repo? | **NO** |
| May HyperAgent write `*.results.json` under `data/air-purifier/batch-production/`? | **NO** |
| May HyperAgent mutate CSV, Supabase, evidence dirs, or public UI? | **NO** |
| May HyperAgent create batch run-registry JSON? | **NO** |

HyperAgent output is **chat/output only** unless a **separate evidence-write authorization** is explicitly granted later. Cursor/repo must validate any findings before a future apply plan.

---

## 7. What success looks like tonight (Option A)

After read-only discovery completes, success means:

1. **Live browser findings returned in chat** for exactly **2 slugs** (`holmes-hapf30`, `shark-hepa-hp100`).
2. **Exact PDP/reference URL facts** — manufacturer URL reached, final URL recorded.
3. **Stock/buy state facts** — Add to Cart / Notify Me / Out of Stock / Where to Buy observed on primary product area.
4. **Wrong-family/conflict facts** — competing SKU tokens noted if present in primary slice.
5. **No repo/data mutation** — zero new or changed files under `data/`, `scripts/`, `src/`, or approval registries.

**UNKNOWN:** Whether live safe-CTA count changes tonight (baseline remains `safe_cta_count=10`, `blocked_link_count=54` until a separate apply step).

---

## 8. What still remains blocked after Option A approval

Even after Jared approves read-only discovery, **all of the following stay blocked** until later explicit authorization:

| Blocker / flag | Status after Option A |
|----------------|----------------------|
| `batch_run_registry_not_created` | **Still blocked** — no registry JSON created by this packet |
| `evidence_write_authorized` | **`false`** — no canonical evidence file writes |
| `csv_apply_authorized` | **`false`** — no `retailer_links.csv` changes |
| `supabase_mutation_authorized` | **`false`** |
| `public_ui_mutation_authorized` | **`false`** |
| `netlify_api_authorized` | **`false`** |
| `batch_start_authorized` | **`false`** — unchanged unless a later repo-supported mechanism explicitly sets it |
| Live safe buyer-path change | **Still blocked** — apply plan + validation + separate owner approval required |
| Owner-approval registry rows | **Not created** by this packet |

---

## 9. Expected coverage delta

**UNKNOWN** — read-only discovery alone does not prove `safe_cta_count` increase.

**INFERRED:** Findings may later inform a **reference activation** apply plan for the two slugs — only after repo validation and a **separate** apply authorization.

---

## 10. Exact HyperAgent prompt (after Option A — validation-ready chat JSON)

**Validation-ready contract:** `ap_hyperagent_chat_discovery_output_v1` — full field spec, checklist, and example in **`docs/air-purifier/AP-HYPERAGENT-DISCOVERY-VALIDATION-OUTPUT-v1.md`**.

**Current slice (repo truth after Cursor validation):** **`holmes-hapf30` only.** `shark-hepa-hp100` is held (`hold_needs_owner_review`) until live PDP re-proof of committed `HE1FKBAS` URL — do not include in next discovery prompt.

**Surface: HyperAgent** — copy prompt from §7 of `AP-HYPERAGENT-DISCOVERY-VALIDATION-OUTPUT-v1.md`.

**Surface: Terminal — re-verify Command Center flags unchanged (read-only):**

```bash
node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.air_purifier_demand_selected_batch_owner_review_v1 | {batch_start_authorized, evidence_write_authorized, csv_apply_authorized, blockers}'
```

---

## Appendix — lane `exact_owner_decision_needed_later` (PROVEN)

> Approve starting `air_purifier_demand_selected_batch_candidate` for read-only AP buyer-path evidence collection; this must not authorize CSV apply, Supabase mutation, evidence writes, public UI mutation, Netlify API calls, or deployment.

**Packet interpretation:** This appendix describes the **class** of decision Command Center expects. **This markdown packet narrows scope further** to read-only discovery on **two slugs only**, **output-only**, with **no** batch registry and **no** evidence writes.
