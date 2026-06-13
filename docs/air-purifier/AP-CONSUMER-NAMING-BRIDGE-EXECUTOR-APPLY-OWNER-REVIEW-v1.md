# AP Consumer Naming Bridge — executor apply owner review v1

## Four-slug Levoit cohort

**Report type:** read-only owner decision support — **executor `--apply` authorization only**  
**Generated:** 2026-06-13  
**Repo checkpoint:** `26ff94f` or newer (`7392dcd` at packet write)  
**Scope:** **four** filter slugs only — `levoit-rf-rar040`, `levoit-rf-rar060`, `levoit-rf-c131`, `levoit-rf-cr200`  
**Truth source:** prior Consumer Naming Bridge packets, cohort apply plan, cohort dry-run artifact, committed CSV

**Prior packets (complete through dry-run):**

| Step | Packet / artifact | Status |
|------|-------------------|--------|
| Class policy | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-OWNER-REVIEW-v1.md` | Option A approved |
| Evidence write | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EVIDENCE-WRITE-OWNER-REVIEW-v1.md` | Option A executed |
| Apply plan write | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-APPLY-PLAN-OWNER-REVIEW-v1.md` | Option A executed |
| Executor dry-run | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EXECUTOR-DRYRUN-OWNER-REVIEW-v1.md` | Executed — `DRY_RUN_READY` |

**Executor `--apply` executed:** **No** — awaiting owner Option A below.

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner approval to run `executor --apply` against the cohort apply plan | Authorization for Supabase, deploy, or public UI mutation |
| Bounded authorization to mutate **four** primary rows in `data/air-purifier/retailer_links.csv` | Permission to alter `filter_aliases.csv`, `compatibility_mappings.csv`, or other slugs |
| Owner gate before safe CTA count may increase | `data/owner-decisions/` row creation (unless separately requested) |
| Docs-only until owner records Option A, B, or C in chat | Live production smoke or parity apply |

**PROVEN:** Dry-run completed successfully — no CSV mutation yet (`data_mutation: false`, `applied_change_count: 0`).

**INFERRED:** After authorized `--apply`, weak buyer-path audit `safe_direct_buyable_filter_count` increases by **+4** — subject to post-apply validation passing.

---

## Executive summary

| Fact | Status | Label |
|------|--------|-------|
| Dry-run `apply_status` | `DRY_RUN_READY` | **PROVEN** |
| `preflight.validation_errors` | `[]` | **PROVEN** |
| `blocked_reasons` | `[]` | **PROVEN** |
| `rollback_rows` | **4** | **PROVEN** |
| `before_row_match_count` | **4** | **PROVEN** |
| Cohort `planned_change_count` | **4** | **PROVEN** |
| CSV still search-placeholder primaries | Yes | **PROVEN** |
| Current safe CTA delta | **0** | **PROVEN** |
| Expected post-apply safe CTA delta | **+4** | **INFERRED** |

---

## 1. Dry-run success proof

**Dry-run artifact:** `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.json`  
**Generated:** `2026-06-13T00:08:59.971Z`

| Field | Value | Label |
|-------|-------|-------|
| `apply_status` | `DRY_RUN_READY` | **PROVEN** |
| `mode` | `dry_run` | **PROVEN** |
| `data_mutation` | `false` | **PROVEN** |
| `planned_change_count` | `4` | **PROVEN** |
| `applied_change_count` | `0` | **PROVEN** |
| `changed_slugs` | `[]` | **PROVEN** |
| `preflight.before_row_match_count` | `4` | **PROVEN** |
| `preflight.validation_errors` | `[]` | **PROVEN** |
| `blocked_reasons` | `[]` | **PROVEN** |
| `rollback_rows.length` | `4` | **PROVEN** |

**Plan path (dry-run source):** `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json`

---

## 2. Required preflight checks (PROVEN at dry-run)

| # | Check | Result |
|---|-------|--------|
| 1 | Apply plan artifact exists | **PROVEN** |
| 2 | `planned_change_count = 4` | **PROVEN** |
| 3 | Planned slugs = cohort four only | **PROVEN** |
| 4 | `before_row` matches committed CSV for all four | `before_row_match_count: 4` — **PROVEN** |
| 5 | `after_row` classification `direct_buyable` per slug | **PROVEN** (plan) |
| 6 | Dry-run `DRY_RUN_READY` | **PROVEN** |
| 7 | Executor mutates only `data/air-purifier/retailer_links.csv` on `--apply` | **PROVEN** (executor notes) |
| 8 | Rollback rows match live CSV `before_row` | **4** rows — **PROVEN** |

---

## 3. Exact CSV rows expected to change (on `--apply`)

**File:** `data/air-purifier/retailer_links.csv`  
**Row key:** `filter_slug=<slug>`, `retailer_key=oem-catalog`, `is_primary=true`  
**Count:** **4 rows only**

| Slug | `destination_url` / `affiliate_url` before | After |
|------|---------------------------------------------|-------|
| `levoit-rf-rar040` | `https://levoit.com/search?q=LEVOIT-RF-RAR040` | `https://levoit.com/products/core-400s-p-3-stage-replacement-filter` |
| `levoit-rf-rar060` | `https://levoit.com/search?q=LEVOIT-RF-RAR060` | `https://levoit.com/products/core-600s-p-original-replacement-filter` |
| `levoit-rf-c131` | `https://levoit.com/search?q=LEVOIT-RF-C131` | `https://levoit.com/products/lv-pur131-air-purifier-replacement-filter` |
| `levoit-rf-cr200` | `https://levoit.com/search?q=LEVOIT-RF-CR200` | `https://levoit.com/products/core-200s-p-replacement-filter` |

### Per-row field changes (all four)

| Column | Before | After |
|--------|--------|-------|
| `browser_truth_classification` | *(empty)* | `direct_buyable` |
| `browser_truth_notes` | *(empty)* | Consumer Naming Bridge `evidence_notes` (2026-06-12 live re-proof) |
| `browser_truth_checked_at` | *(empty)* | Plan `generated_at` (`2026-06-12T22:15:23.992Z`) |

**Unchanged columns:** `filter_slug`, `retailer_name`, `is_primary`, `retailer_key`, `retailer_slug`

**PROVEN:** Twenty slugs in plan `refused_changes` are **not** applied by executor.

---

## 4. Expected safe CTA delta

| Metric | Before apply | After apply (if validation passes) | Label |
|--------|--------------|-------------------------------------|-------|
| Cohort primaries with `direct_buyable` | **0** | **4** | **INFERRED** |
| Weak audit `safe_direct_buyable_filter_count` lift | — | **+4** | **INFERRED** |
| Plan `projected_coverage_delta.direct_buyable_plus` | — | **4** | **PROVEN** (plan artifact) |

**PROVEN:** Safe CTA does **not** increase until `--apply` completes and post-apply validation passes.

**UNKNOWN:** Whether production `/go` primary CTA changes for every model page (batch-v2 lesson: OEM apply may coexist with existing Amazon safe paths).

---

## 5. Rollback path

**Source:** `rollback_rows` in dry-run artifact (identical to plan `rollback_rows`).

Restore primary `oem-catalog` row per slug to:

| Slug | Rollback `destination_url` / `affiliate_url` | Clear fields |
|------|-----------------------------------------------|--------------|
| `levoit-rf-rar040` | `https://levoit.com/search?q=LEVOIT-RF-RAR040` | `browser_truth_classification`, `browser_truth_notes`, `browser_truth_checked_at` → empty |
| `levoit-rf-rar060` | `https://levoit.com/search?q=LEVOIT-RF-RAR060` | same |
| `levoit-rf-c131` | `https://levoit.com/search?q=LEVOIT-RF-C131` | same |
| `levoit-rf-cr200` | `https://levoit.com/search?q=LEVOIT-RF-CR200` | same |

**Manual revert:** Copy `rollback_rows` from dry-run JSON into the four CSV rows, or re-run a future rollback apply plan if authored.

**Expected post-apply artifact (after Option A execution):**

- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1-apply.json`
- `.../ap-apply-run-levoit-consumer-naming-bridge-cohort-v1-apply.md`

---

## 6. Safety gates (no weakening)

| Gate | Cohort status |
|------|----------------|
| Consumer Naming Bridge Option A in `evidence_notes` | **PROVEN** (all four) |
| `decision: PASS_DIRECT_BUYABLE` | **PROVEN** |
| `buy_action_seen: true` (2026-06-12 re-proof) | **PROVEN** |
| `wrong_family_tokens_seen: []` | **PROVEN** |
| `owner_review_required: false` | **PROVEN** |
| Internal token absent; consumer naming on PDP | **PROVEN** |
| Gate weakening / token exceptions | **PROVEN** none |

---

## 7. Owner decision options

Record **exactly one** option in chat. **Do not** create `data/owner-decisions/` rows unless separately requested.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE EXECUTOR --apply (FOUR-SLUG COHORT)                     │
│                                                                             │
│  I have reviewed dry-run output and approve CSV apply for:                  │
│    levoit-rf-rar040, levoit-rf-rar060, levoit-rf-c131, levoit-rf-cr200      │
│                                                                             │
│  Command per §8.                                                            │
│                                                                             │
│  Scope: FOUR primary rows in data/air-purifier/retailer_links.csv only.     │
│                                                                             │
│  I do NOT approve: Supabase, deploy, public UI mutation, alias ingest,     │
│  compat edits, levoit-vital200-rf, non-Levoit slugs, or gate weakening.     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — APPROVE EXECUTOR --apply FOR SUBSET ONLY                        │
│                                                                             │
│  I approve CSV apply for this subset only:                                  │
│    [ owner lists slug(s) ]                                                  │
│                                                                             │
│  Operator must filter plan to subset before --apply or run per-slug plans.    │
│  Unlisted cohort slugs remain search-placeholder.                             │
│  Same non-authorization list as Option A applies.                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION C — HOLD                                                            │
│                                                                             │
│  I do not approve executor --apply for this cohort at this time.            │
│  Dry-run artifacts remain; CSV unchanged.                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Exact executor apply command (Option A only — not authorized until owner approves)

```bash
npx tsx scripts/report-air-purifier-apply-executor-v1.ts \
  --apply \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json \
  --out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1-apply.json \
  --markdown-out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1-apply.md
```

**INFERRED success signals:**

| Field | Expected |
|-------|----------|
| `apply_status` | `APPLIED` |
| `mode` | `apply` |
| `data_mutation` | `true` |
| `applied_change_count` | `4` |
| `changed_slugs` | four cohort slugs |
| `post_apply_validation.all_direct_buyable` | `true` |
| `post_apply_validation.only_target_slugs_changed` | `true` |

---

## 9. Validation commands

### Pre-apply (read-only — at `26ff94f` or newer)

```bash
# Dry-run artifact checks
node -e "
const r=require('./data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.json');
console.log({
  apply_status:r.apply_status,
  before_row_match_count:r.preflight?.before_row_match_count,
  validation_errors:r.preflight?.validation_errors,
  blocked:r.blocked_reasons,
  rollback:r.rollback_rows?.length
});"

# Plan scope lock
node -e "
const p=require('./data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json');
console.log({
  count:p.planned_change_count,
  slugs:p.planned_changes.map(c=>c.filter_slug)
});"

# CSV still placeholder (four rows)
awk -F',' '$1 ~ /^levoit-rf-rar040|levoit-rf-rar060|levoit-rf-c131|levoit-rf-cr200/ && $4==\"true\" {
  print $1, $7, $8
}' data/air-purifier/retailer_links.csv

# Aggregator
npx tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts \
  | node -e "
const chunks=[];process.stdin.on('data',d=>chunks.push(d));
process.stdin.on('end',()=>{
  const r=JSON.parse(Buffer.concat(chunks).toString());
  for (const slug of ['levoit-rf-rar040','levoit-rf-rar060','levoit-rf-c131','levoit-rf-cr200']) {
    const ok=r.review_groups.auto_apply_eligible.some(x=>x.slug===slug);
    console.log(slug, ok?'auto_apply_eligible':'BLOCKED');
  }
});"
```

**Expected pre-apply:** `DRY_RUN_READY`, `before_row_match_count: 4`, four search URLs, all `auto_apply_eligible`.

### Post-apply (after Option A execution only)

```bash
# Apply-run artifact
node -e "
const r=require('./data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1-apply.json');
console.log({
  apply_status:r.apply_status,
  applied:r.applied_change_count,
  changed:r.changed_slugs,
  post:r.post_apply_validation
});"

# CSV direct_buyable on four primaries
awk -F',' '$1 ~ /^levoit-rf-rar040|levoit-rf-rar060|levoit-rf-c131|levoit-rf-cr200/ && $4==\"true\" {
  print $1, $7, $8
}' data/air-purifier/retailer_links.csv

# Weak-path audit delta (read-only)
npx tsx scripts/report-air-purifier-weak-buyer-path-audit-v1.ts
```

**Expected post-apply:** four rows show official Levoit PDP URLs and `direct_buyable`; **INFERRED** +4 safe CTAs.

---

## 10. Explicit non-authorization

Regardless of option chosen, **this packet does not authorize:**

- Executor `--apply` unless owner records Option A or B in chat
- Supabase seed, SQL commit, or parity apply
- Netlify deploy or public UI mutation
- `filter_aliases.csv` insertion or catalog ingest
- `compatibility_mappings.csv` changes
- `data/owner-decisions/` registry rows (unless separately requested)
- Apply for `levoit-vital200-rf` or any non-Levoit slug
- Gate weakening or family-token override
- Overwriting `ap-apply-run-batch-v2.json` without explicit approval

**PROVEN:** No mutation occurs from this document alone.

---

## 11. Factory sequence after Option A (informational)

1. **This packet** — owner Option A → executor `--apply` (§8)
2. Verify post-apply artifact + CSV (§9 post-checklist)
3. **Separate packets** — Supabase parity, production smoke, deploy (each independently authorized)

---

## Appendix — repo pointers

| Artifact | Path |
|----------|------|
| Class policy | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-OWNER-REVIEW-v1.md` |
| Evidence-write | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EVIDENCE-WRITE-OWNER-REVIEW-v1.md` |
| Apply-plan | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-APPLY-PLAN-OWNER-REVIEW-v1.md` |
| Dry-run | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EXECUTOR-DRYRUN-OWNER-REVIEW-v1.md` |
| Cohort apply plan | `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json` |
| Cohort dry-run | `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1.json` |
| Winix apply precedent | `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-winix-filter-h-116130-v1-apply.json` |

---

## PROVEN / INFERRED / UNKNOWN

| Topic | Label |
|-------|-------|
| Dry-run `DRY_RUN_READY`; `validation_errors=[]`; `blocked_reasons=[]`; `rollback_rows=4` | **PROVEN** |
| Four CSV rows unchanged (search placeholder) | **PROVEN** |
| Safe CTA delta 0 until `--apply` | **PROVEN** |
| +4 safe CTAs after successful `--apply` | **INFERRED** |
| Levoit storefront stock at apply time | **UNKNOWN** |
| Production primary CTA vs Amazon coexistence | **UNKNOWN** |
| No mutation from this document | **PROVEN** |

---

This packet is owner decision support only. Option A authorizes **executor `--apply`** for the four-slug Levoit Consumer Naming Bridge cohort. It does **not** authorize Supabase mutation, deploy, or live production claims without further packets.
