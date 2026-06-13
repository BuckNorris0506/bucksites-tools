# AP Consumer Naming Bridge — executor dry-run owner review v1

## Four-slug Levoit cohort

**Report type:** read-only owner decision support — **executor dry-run authorization only**  
**Generated:** 2026-06-12  
**Repo checkpoint:** `3321fe0`  
**Scope:** **four** filter slugs only — `levoit-rf-rar040`, `levoit-rf-rar060`, `levoit-rf-c131`, `levoit-rf-cr200`  
**Plan path:** `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json`  
**Truth source:** committed evidence, cohort apply plan, aggregator, `retailer_links.csv` (not HQ handoff)

**Prior packets:**

- Class policy: `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-OWNER-REVIEW-v1.md` (Option A approved)
- Evidence write: `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EVIDENCE-WRITE-OWNER-REVIEW-v1.md` (Option A executed)
- Apply plan write: `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-APPLY-PLAN-OWNER-REVIEW-v1.md` (Option A executed)

**Dry-run executed:** **Yes** — cohort artifact written at checkpoint `26ff94f` (see §10).

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner approval to run executor **dry-run** against the cohort apply plan | Authorization for `executor --apply` (CSV mutation) |
| Bounded authorization to write **apply-run** JSON + markdown artifacts (dry-run mode) | Live safe CTA, coverage, `/go`, or public UI claims |
| Owner inspection gate before a **future** executor-apply packet | Supabase seed/SQL, deploy, or `data/owner-decisions/` row creation |
| Docs-only until owner records Option A, B, or C in chat | Permission to extend to `levoit-vital200-rf` or non-Levoit slugs |

**PROVEN:** Dry-run mode sets `data_mutation: false` and `applied_change_count: 0` — no `retailer_links.csv` write.

**PROVEN:** Executor `--apply` is **not** authorized by any option in this packet.

---

## 1. Current state at commit `3321fe0`

| Fact | Status | Label |
|------|--------|-------|
| Four evidence rows `PASS_DIRECT_BUYABLE` | Yes | **PROVEN** |
| Aggregator `auto_apply_eligible` for all four | Yes | **PROVEN** |
| Cohort apply plan committed (`planned_change_count: 4`) | Yes | **PROVEN** |
| `apply_plan_ready` factory stage | `complete` (cohort plan path) | **PROVEN** |
| `retailer_links.csv` primaries still search placeholders | Yes | **PROVEN** |
| Safe CTA delta | **0** | **PROVEN** |
| Executor dry-run artifact for cohort | **Present** (`DRY_RUN_READY`) | **PROVEN** (at `26ff94f`) |
| Executor `--apply` run for cohort | **Absent** | **PROVEN** |

### Per-slug factory snapshot (read-only)

All four slugs share the same pattern at `3321fe0`:

| Stage | Status |
|-------|--------|
| `canonical_evidence_present` | **complete** |
| `aggregator_auto_apply_eligible` | **complete** |
| `apply_plan_ready` | **complete** (cohort plan) |
| `executor_dry_run_ready` | **unknown** (no dry-run artifact yet) |
| `csv_apply_complete` | **unknown** |
| `next_unresolved_stage_id` | **`catalog_present`** (missing `filter_aliases.csv` row — non-blocking for dry-run) |

### Committed `retailer_links.csv` (before apply — PROVEN)

| Slug | Primary `destination_url` | `browser_truth_classification` |
|------|---------------------------|--------------------------------|
| `levoit-rf-rar040` | `https://levoit.com/search?q=LEVOIT-RF-RAR040` | *(empty)* |
| `levoit-rf-rar060` | `https://levoit.com/search?q=LEVOIT-RF-RAR060` | *(empty)* |
| `levoit-rf-c131` | `https://levoit.com/search?q=LEVOIT-RF-C131` | *(empty)* |
| `levoit-rf-cr200` | `https://levoit.com/search?q=LEVOIT-RF-CR200` | *(empty)* |

---

## 2. Evidence-write proof summary

**Source:** `data/air-purifier/batch-production/agent-results/ap-levoit-oem-discovery-v1.results.json`  
**Packet:** `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EVIDENCE-WRITE-OWNER-REVIEW-v1.md`  
**Live re-proof:** 2026-06-12 (Consumer Naming Bridge Option A)

| Slug | `decision` | `browser_truth_classification` | `buy_action_seen` | `wrong_family_tokens_seen` | `owner_review_required` | Aggregator |
|------|------------|-------------------------------|-------------------|---------------------------|-------------------------|------------|
| `levoit-rf-rar040` | `PASS_DIRECT_BUYABLE` | `direct_buyable` | `true` | `[]` | `false` | `auto_apply_eligible` |
| `levoit-rf-rar060` | `PASS_DIRECT_BUYABLE` | `direct_buyable` | `true` | `[]` | `false` | `auto_apply_eligible` |
| `levoit-rf-c131` | `PASS_DIRECT_BUYABLE` | `direct_buyable` | `true` | `[]` | `false` | `auto_apply_eligible` |
| `levoit-rf-cr200` | `PASS_DIRECT_BUYABLE` | `direct_buyable` | `true` | `[]` | `false` | `auto_apply_eligible` |

**PROVEN:** All four `evidence_notes` cite **Consumer Naming Bridge Option A**, consumer naming tokens, internal-token absence, Add to Cart / `available:true`, and cross-sell sibling check.

**PROVEN:** `recommended_csv_mutation: null` on all four rows (planner synthesizes CSV fields at plan time).

**PROVEN:** `levoit-vital200-rf` remains `NEEDS_OWNER_REVIEW` — **not** in cohort scope.

---

## 3. Apply-plan proof summary

**Path:** `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json`  
**Markdown:** `.../ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.md`

| Field | Value |
|-------|-------|
| `plan_status` | `READY_FOR_OWNER_APPROVAL` |
| `planned_change_count` | **4** |
| `planned_slugs` | `levoit-rf-rar040`, `levoit-rf-rar060`, `levoit-rf-c131`, `levoit-rf-cr200` **only** |
| `read_only` / `data_mutation` | `true` / `false` |
| `generated_at` | `2026-06-12T22:15:23.990Z` |
| `projected_coverage_delta.direct_buyable_plus` | **4** |
| `rollback_rows.length` | **4** |

### Planned URL transitions (summary)

| Slug | After `destination_url` / `affiliate_url` |
|------|---------------------------------------------|
| `levoit-rf-rar040` | `https://levoit.com/products/core-400s-p-3-stage-replacement-filter` |
| `levoit-rf-rar060` | `https://levoit.com/products/core-600s-p-original-replacement-filter` |
| `levoit-rf-c131` | `https://levoit.com/products/lv-pur131-air-purifier-replacement-filter` |
| `levoit-rf-cr200` | `https://levoit.com/products/core-200s-p-replacement-filter` |

**Changed fields per row:** `destination_url`, `affiliate_url`, `browser_truth_classification` → `direct_buyable`, `browser_truth_notes`, `browser_truth_checked_at`.

**PROVEN:** Twenty slugs in `refused_changes` — executor dry-run must **not** apply those rows.

**PROVEN:** Default batch-v2 apply-run path (`ap-apply-run-batch-v2.json`) must **not** be used for this cohort dry-run — use cohort-scoped `--out` paths in §4 to avoid overwriting unrelated batch run artifacts.

---

## 4. Exact dry-run command (Option A only — not authorized until owner approves)

**No `--apply` flag.**

```bash
npx tsx scripts/report-air-purifier-apply-executor-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json \
  --out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.json \
  --markdown-out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.md
```

**INFERRED:** Exit code `0` and `apply_status: DRY_RUN_READY` expected when preflight passes.

---

## 5. Expected dry-run artifacts

When Option A is approved and the command in §4 runs successfully:

| Artifact | Path |
|----------|------|
| Dry-run JSON | `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.json` |
| Dry-run markdown | `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.md` |

### Expected report fields (dry-run success)

| Field | Expected value |
|-------|----------------|
| `mode` | `dry_run` |
| `data_mutation` | `false` |
| `applied_change_count` | `0` |
| `changed_slugs` | `[]` |
| `apply_status` | `DRY_RUN_READY` |
| `blocked_reasons` | `[]` |
| `preflight.before_row_match_count` | **4** |
| `preflight.validation_errors` | `[]` |
| `rollback_rows.length` | **4** |
| `planned_change_count` | **4** |

**PROVEN:** Dry-run writes apply-run artifacts only — `retailer_links.csv` SHA/content unchanged.

**INFERRED:** Per-slug factory `executor_dry_run_ready` may still show `unknown` until slug-scoped `ap-apply-run-<slug>-v1.json` files exist; cohort batch dry-run artifact is the authorized proof for this packet.

---

## 6. Validation checklist (read-only — run before and after dry-run)

### Pre-dry-run (at `3321fe0`)

```bash
# Aggregator — four slugs auto_apply_eligible
npx tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts \
  | node -e "
const chunks=[];process.stdin.on('data',d=>chunks.push(d));
process.stdin.on('end',()=>{
  const r=JSON.parse(Buffer.concat(chunks).toString());
  for (const slug of ['levoit-rf-rar040','levoit-rf-rar060','levoit-rf-c131','levoit-rf-cr200']) {
    const auto=r.review_groups.auto_apply_eligible.find(x=>x.slug===slug);
    console.log(slug, auto?'OK':'BLOCKED');
  }
});"

# Plan scope lock
node -e "
const p=require('./data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json');
console.log({
  count:p.planned_change_count,
  slugs:p.planned_changes.map(c=>c.filter_slug),
  rollback:p.rollback_rows.length,
  status:p.plan_status
});"

# CSV still search placeholder
awk -F',' '$1 ~ /^levoit-rf-rar040|levoit-rf-rar060|levoit-rf-c131|levoit-rf-cr200/ && $4==\"true\" {
  print $1, $7, $8
}' data/air-purifier/retailer_links.csv

# Slug-status (one slug — pattern identical for all four)
npx tsx scripts/report-ap-slug-factory-status-v1.ts --slug levoit-rf-rar040
```

**Expected pre-dry-run:** all four `OK` in aggregator; `planned_change_count: 4`; four search URLs with empty `browser_truth_classification`; `apply_plan_ready: complete`.

### Post-dry-run (after Option A execution)

```bash
# Dry-run status
node -e "
const r=require('./data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.json');
console.log({
  mode:r.mode,
  apply_status:r.apply_status,
  data_mutation:r.data_mutation,
  applied_change_count:r.applied_change_count,
  before_row_match_count:r.preflight?.before_row_match_count,
  validation_errors:r.preflight?.validation_errors,
  blocked:r.blocked_reasons
});"

# CSV unchanged (still placeholder)
awk -F',' '$1 ~ /^levoit-rf-rar040|levoit-rf-rar060|levoit-rf-c131|levoit-rf-cr200/ && $4==\"true\" {
  print $1, $7, $8
}' data/air-purifier/retailer_links.csv
```

**Expected post-dry-run:** `DRY_RUN_READY`, `data_mutation: false`, `applied_change_count: 0`, `before_row_match_count: 4`; CSV rows unchanged.

---

## 7. Failure conditions

Dry-run must be treated as **failed** or **blocked** if any of the following occur:

| Condition | Action |
|-----------|--------|
| `apply_status` is `BLOCKED` | Do **not** proceed to executor-apply packet; fix preflight mismatch |
| `preflight.validation_errors` non-empty | Investigate `before_row` drift vs committed CSV |
| `preflight.before_row_match_count` ≠ **4** | CSV may have changed since plan `generated_at`; regenerate plan or halt |
| `planned_change_count` ≠ **4** in dry-run report | Scope violation — halt |
| Any slug outside cohort appears in executable changes | Scope violation — halt |
| `data_mutation: true` or `applied_change_count` > 0 in dry-run mode | **Critical** — treat as unauthorized CSV mutation |
| `retailer_links.csv` content changes after dry-run | **Critical** — revert and investigate |
| Evidence row reverted to `NEEDS_OWNER_REVIEW` | Re-run aggregator; do not dry-run |
| Plan file path differs from authorized cohort plan | Out of scope — halt |

**INFERRED:** Levoit storefront OOS at future `--apply` time is **not** detected by dry-run — live re-proof may be required before apply authorization.

---

## 8. Owner decision options

Record **exactly one** option in chat. **Do not** create `data/owner-decisions/` rows unless separately requested.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE EXECUTOR DRY-RUN (FOUR-SLUG COHORT)                     │
│                                                                             │
│  I authorize executor dry-run only for:                                     │
│    levoit-rf-rar040, levoit-rf-rar060, levoit-rf-c131, levoit-rf-cr200      │
│                                                                             │
│  Plan:                                                                      │
│    data/air-purifier/batch-production/apply-plans-batch-v2/                 │
│    ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json               │
│                                                                             │
│  Expected artifacts:                                                        │
│    ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.json              │
│    ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.md                  │
│                                                                             │
│  Command per §4 (no --apply).                                               │
│                                                                             │
│  I do NOT approve: executor --apply, CSV mutation, Supabase, deploy,        │
│  safe CTA claim, alias ingest, compat edits, or non-cohort slugs.           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — APPROVE DRY-RUN FOR SUBSET ONLY                                 │
│                                                                             │
│  I authorize executor dry-run for this subset only:                         │
│    [ owner lists slug(s) ]                                                  │
│                                                                             │
│  Operator must filter plan to subset before dry-run or use per-slug plans.  │
│  Unlisted cohort slugs remain without dry-run artifacts.                    │
│  Same non-authorization list as Option A applies.                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION C — HOLD                                                            │
│                                                                             │
│  I do not authorize executor dry-run for this cohort at this time.          │
│  Apply plan artifacts remain; no apply-run artifacts written.               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Separate authorization required for CSV apply:** A **future** `AP-CONSUMER-NAMING-BRIDGE-EXECUTOR-APPLY-OWNER-REVIEW-v1.md` (or equivalent) must authorize `executor --apply` — not Option A from this packet.

### Factory sequence (informational)

1. **This packet** — owner Option A → executor dry-run (§4)
2. Owner reviews dry-run output (§6 post-checklist)
3. **Future packet** — executor `--apply` authorization
4. `npx tsx scripts/report-air-purifier-apply-executor-v1.ts --apply --plan <cohort-plan>` (not authorized here)
5. Post-apply validation, optional Supabase parity, production smoke (each separately authorized)

---

## 9. Explicit non-authorization

Regardless of option chosen, **this packet does not authorize:**

- Executor `--apply` or any `retailer_links.csv` mutation
- Live safe CTA, coverage, `/go`, or public UI claims
- Supabase seed, SQL commit, or parity apply
- Netlify deploy or API mutation
- `filter_aliases.csv` insertion or catalog ingest
- `compatibility_mappings.csv` changes
- `data/owner-decisions/` registry rows (unless separately requested)
- Gate weakening, family-token override, or token exceptions
- Dry-run or apply for `levoit-vital200-rf` or any non-Levoit slug
- Overwriting `ap-apply-run-batch-v2.json` without explicit owner approval

---

## 10. Dry-run execution (completed at `26ff94f`)

**Command (no `--apply`):**

```bash
npx tsx scripts/report-air-purifier-apply-executor-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json \
  --out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.json \
  --markdown-out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.md
```

**Dry-run status:** `DRY_RUN_READY` (**PROVEN**)

| Field | Value |
|-------|-------|
| `mode` | `dry_run` |
| `data_mutation` | `false` |
| `planned_change_count` | `4` |
| `applied_change_count` | `0` |
| `changed_slugs` | `[]` |
| `blocked_reasons` | `[]` |
| `preflight.before_row_match_count` | `4` |
| `preflight.validation_errors` | `[]` |
| `rollback_rows.length` | `4` |
| `generated_at` | `2026-06-13T00:08:59.971Z` |

**Artifacts:**

- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.json`
- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.md`

**CSV integrity:** All four cohort primaries remain search placeholders with empty `browser_truth_*` — **PROVEN** (no `--apply`).

**Next owner gate:** Separate executor `--apply` authorization packet — not authorized by this dry-run.

---

## Appendix — repo pointers

| Artifact | Path |
|----------|------|
| Class policy | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-OWNER-REVIEW-v1.md` |
| Evidence-write packet | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EVIDENCE-WRITE-OWNER-REVIEW-v1.md` |
| Apply-plan packet | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-APPLY-PLAN-OWNER-REVIEW-v1.md` |
| Cohort apply plan | `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json` |
| Canonical evidence | `data/air-purifier/batch-production/agent-results/ap-levoit-oem-discovery-v1.results.json` |
| Cohort dry-run result | `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.json` |
| Winix dry-run precedent | `docs/air-purifier/AP-EXECUTOR-DRY-RUN-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` |

---

## PROVEN / INFERRED / UNKNOWN

| Topic | Label |
|-------|-------|
| Four slugs `PASS_DIRECT_BUYABLE` + `auto_apply_eligible` | **PROVEN** |
| Cohort apply plan `planned_change_count: 4` | **PROVEN** |
| CSV still search placeholder; safe CTA delta 0 | **PROVEN** |
| Dry-run `DRY_RUN_READY`; `before_row_match_count: 4` at `26ff94f` | **PROVEN** |
| Executor `--apply` not run | **PROVEN** |
| Levoit stock/price at future apply time | **UNKNOWN** |

---

This packet is owner decision support only. Option A authorizes **executor dry-run** for the four-slug Levoit Consumer Naming Bridge cohort. It does **not** authorize CSV apply, safe CTA claims, Supabase mutation, or deploy.
