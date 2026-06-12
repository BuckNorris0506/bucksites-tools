# AP Consumer Naming Bridge — apply-plan owner review v1

## Four-slug Levoit cohort

**Report type:** read-only owner decision support — **apply plan artifact write authorization only**  
**Generated:** 2026-06-12  
**Repo checkpoint:** `0260719`  
**Scope:** **four** filter slugs only — `levoit-rf-rar040`, `levoit-rf-rar060`, `levoit-rf-c131`, `levoit-rf-cr200`  
**Truth source:** Consumer Naming Bridge policy packet, evidence-write packet (executed), canonical evidence JSON, aggregator, in-memory batch-v2 apply planner (read-only)

**Prior packets:**

- Class policy: `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-OWNER-REVIEW-v1.md` (Option A approved)
- Evidence write: `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EVIDENCE-WRITE-OWNER-REVIEW-v1.md` (Option A executed — four rows `PASS_DIRECT_BUYABLE`)

---

## Executive summary

| Fact | Status | Label |
|------|--------|-------|
| Consumer Naming Bridge class policy approved (four Levoit slugs) | Yes | **PROVEN** |
| Canonical evidence rows `PASS_DIRECT_BUYABLE` for all four | Yes | **PROVEN** |
| Aggregator `auto_apply_eligible` for all four | Yes | **PROVEN** (read at `0260719`) |
| In-memory apply planner `planned_change_count: 4` (cohort only) | Yes | **PROVEN** |
| `retailer_links.csv` still search-placeholder primaries | Yes | **PROVEN** |
| Safe CTA delta from evidence write alone | **0** | **PROVEN** |
| **INFERRED** safe CTA delta after future authorized CSV apply | **+4** | **INFERRED** |
| Any mutation from this document alone | **None** | **PROVEN** |

This packet authorizes **apply plan artifact write only** for the four-slug cohort. It does **not** authorize executor `--apply`, CSV mutation, Supabase, deploy, alias ingest, or extension to any fifth slug.

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner approval to **write** a cohort-scoped batch-v2 apply plan JSON + markdown for **four slugs** | Authorization to run executor `--apply` (CSV mutation) |
| Bounded authorization for apply-plan artifacts only | `retailer_links.csv` mutation or live safe CTA claim |
| Docs-only until owner records Option A, B, or C in chat | Supabase seed/SQL, deploy, or `data/owner-decisions/` row creation |
| Input for a **future** executor dry-run / apply authorization packet | Permission to extend to `levoit-vital200-rf`, Blueair, Rabbit, Coway, Holmes, Shark, or other brands |

**PROVEN:** Option A does **not** set `csv_apply_authorized`, `supabase_mutation_authorized`, `public_ui_mutation_authorized`, or `netlify_api_authorized`.

---

## 1. Current evidence / aggregator status per slug

Evidence source: `data/air-purifier/batch-production/agent-results/ap-levoit-oem-discovery-v1.results.json` (canonical; mirrored in `agent-results-batch-v2/ap-levoit-oem-discovery-v1.results.json`).

| Slug | `decision` | `browser_truth_classification` | `buy_action_seen` | `wrong_family_tokens_seen` | `owner_review_required` | Aggregator |
|------|------------|-------------------------------|-------------------|---------------------------|-------------------------|------------|
| `levoit-rf-rar040` | `PASS_DIRECT_BUYABLE` | `direct_buyable` | `true` | `[]` | `false` | `auto_apply_eligible` |
| `levoit-rf-rar060` | `PASS_DIRECT_BUYABLE` | `direct_buyable` | `true` | `[]` | `false` | `auto_apply_eligible` |
| `levoit-rf-c131` | `PASS_DIRECT_BUYABLE` | `direct_buyable` | `true` | `[]` | `false` | `auto_apply_eligible` |
| `levoit-rf-cr200` | `PASS_DIRECT_BUYABLE` | `direct_buyable` | `true` | `[]` | `false` | `auto_apply_eligible` |

All four rows cite **Consumer Naming Bridge Option A** and **live re-proof 2026-06-12** in `evidence_notes`. All four have `recommended_csv_mutation: null` (batch-v2 planner synthesizes CSV fields at plan time).

**PROVEN:** Aggregator `invalid_rows` count for these four slugs is **0**.

---

## 2. Current `retailer_links.csv` state (PROVEN committed)

Primary `oem-catalog` rows — all four still search placeholders with empty browser-truth fields:

| Slug | `destination_url` / `affiliate_url` (before) | `browser_truth_classification` |
|------|-----------------------------------------------|--------------------------------|
| `levoit-rf-rar040` | `https://levoit.com/search?q=LEVOIT-RF-RAR040` | *(empty)* |
| `levoit-rf-rar060` | `https://levoit.com/search?q=LEVOIT-RF-RAR060` | *(empty)* |
| `levoit-rf-c131` | `https://levoit.com/search?q=LEVOIT-RF-C131` | *(empty)* |
| `levoit-rf-cr200` | `https://levoit.com/search?q=LEVOIT-RF-CR200` | *(empty)* |

**PROVEN:** No `direct_buyable` on committed CSV for this cohort. Weak buyer-path safe CTA count unchanged.

### Stale committed apply plan (PROVEN)

| Artifact | Status |
|----------|--------|
| `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json` | `generated_at: 2026-05-24`; lists four Levoit slugs under **refused** / `owner_review_required` — predates evidence write |
| `synthesized_mutation_slugs` in that artifact | `winix-hepa-115115`, `gg-flt5000`, `coway-max2-hepa`, `rabbit-biogs-minusa2` only |

**PROVEN:** Committed batch-v2 plan does not reflect post-evidence-write factory state.

### In-memory apply planner — cohort ready (PROVEN)

Read-only `buildAirPurifierApplyPlannerBatchV2V1Report({ rootDir })` at `0260719`:

| Field | Value |
|-------|-------|
| `plan_status` | `READY_FOR_OWNER_APPROVAL` |
| `planned_change_count` | **4** |
| Planned slugs | **`levoit-rf-rar040`, `levoit-rf-rar060`, `levoit-rf-c131`, `levoit-rf-cr200` only** |

Other `auto_apply_eligible` slugs (e.g. `winix-filter-h-116130`) refused with `before_row_not_search_placeholder` / `before_row_already_has_browser_truth` where already applied — **PROVEN**.

---

## 3. Planned CSV changes (if later authorized via executor `--apply`)

**Not applied by this packet.** Described from in-memory planner + evidence rows.

**File:** `data/air-purifier/retailer_links.csv`  
**Row key per slug:** `filter_slug=<slug>`, `retailer_key=oem-catalog`, `is_primary=true`

### Per-slug before → after

| Slug | `destination_url` / `affiliate_url` before | `destination_url` / `affiliate_url` after |
|------|---------------------------------------------|----------------------------------------|
| `levoit-rf-rar040` | `...search?q=LEVOIT-RF-RAR040` | `https://levoit.com/products/core-400s-p-3-stage-replacement-filter` |
| `levoit-rf-rar060` | `...search?q=LEVOIT-RF-RAR060` | `https://levoit.com/products/core-600s-p-original-replacement-filter` |
| `levoit-rf-c131` | `...search?q=LEVOIT-RF-C131` | `https://levoit.com/products/lv-pur131-air-purifier-replacement-filter` |
| `levoit-rf-cr200` | `...search?q=LEVOIT-RF-CR200` | `https://levoit.com/products/core-200s-p-replacement-filter` |

### Fields set on apply (all four rows)

| Field | After value |
|-------|-------------|
| `browser_truth_classification` | `direct_buyable` |
| `browser_truth_notes` | Full `evidence_notes` string from canonical evidence row (Consumer Naming Bridge Option A; 2026-06-12 live re-proof) |
| `browser_truth_checked_at` | Apply plan `generated_at` at plan-write time (**INFERRED** — ISO timestamp fixed when plan artifact is written) |

**Changed fields (planner):** `destination_url`, `affiliate_url`, `browser_truth_classification`, `browser_truth_notes`, `browser_truth_checked_at`

**PROVEN:** No other CSV columns mutated by standard batch-v2 OEM-primary apply path.

---

## 4. Safety gates (no weakening)

| Gate | Cohort status |
|------|----------------|
| Official Levoit PDP (`final_url`) | **PROVEN** per slug in evidence |
| Consumer naming in `exact_tokens_seen` | **PROVEN** (`400S-P`, `600S-P`, `LV-PUR131`, `200S-P`, etc.) |
| Internal BuckParts token absent on PDP | **PROVEN** (`LEVOIT-RF-*` / `RAR*` / `C131` / `CR200` absent — evidence_notes) |
| Add to Cart + `available:true` | **PROVEN** (2026-06-12 live re-proof) |
| `wrong_family_tokens_seen` | `[]` — **PROVEN** |
| `owner_review_required` | `false` — **PROVEN** |
| Gate weakening / token exceptions | None proposed — **PROVEN** |

**UNKNOWN:** Levoit storefront stock/price at time of future executor `--apply`.

---

## 5. Owner decision options

Record **exactly one** option in chat. **Do not** create `data/owner-decisions/` rows unless separately requested.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE APPLY PLAN ARTIFACT WRITE (FOUR-SLUG COHORT)            │
│                                                                             │
│  I approve writing an apply plan artifact for:                              │
│    levoit-rf-rar040, levoit-rf-rar060, levoit-rf-c131, levoit-rf-cr200      │
│                                                                             │
│  Preferred artifact (cohort-scoped):                                        │
│    data/air-purifier/batch-production/apply-plans-batch-v2/                 │
│    ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json               │
│    ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.md                 │
│                                                                             │
│  planned_changes must include ONLY the four slugs above (no fifth slug).    │
│                                                                             │
│  I do NOT approve: executor --apply, CSV mutation, Supabase, deploy,        │
│  safe CTA claim, alias ingest, compat edits, or non-cohort slugs.           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — APPROVE SUBSET APPLY PLAN ARTIFACT WRITE ONLY                   │
│                                                                             │
│  I approve writing an apply plan artifact for this subset only:             │
│    [ owner lists slug(s) ]                                                  │
│                                                                             │
│  All unlisted cohort slugs remain without apply plan entries.               │
│  Same non-authorization list as Option A applies.                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION C — HOLD                                                            │
│                                                                             │
│  I do not approve apply plan artifact write for this cohort at this time.   │
│  Committed repo state unchanged; evidence rows remain canonical only.        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Separate authorization required for CSV apply:** Executor `--apply` must be authorized in a **future** owner packet — not Option A or B from this document.

### Factory sequence after Option A (informational)

1. **This packet** — owner Option A → apply plan artifact write
2. **Optional future packet** — executor dry-run against approved plan (no `--apply`)
3. **Separate future packet** — executor `--apply` authorization
4. `npx tsx scripts/report-air-purifier-apply-executor-v1.ts --plan <path> --apply` (not authorized here)
5. Post-apply validation, optional Supabase parity, production smoke (each separately authorized)

---

## 6. Explicit non-authorization

Regardless of option chosen, **this packet does not authorize:**

- Executor `--apply` or any `retailer_links.csv` mutation
- Live safe CTA, coverage, `/go`, or public UI claims
- Supabase seed, SQL commit, or parity apply
- Netlify deploy or API mutation
- `filter_aliases.csv` insertion or catalog ingest
- `compatibility_mappings.csv` changes
- `data/owner-decisions/` registry rows (unless separately requested)
- Gate weakening, family-token override, or token exceptions
- Evidence write for `levoit-vital200-rf` or any non-Levoit slug
- Refresh of `ap-apply-plan-batch-v2.json` that includes slugs outside owner-approved scope without explicit filter

---

## 7. Post-approval mechanical command (Option A only — not authorized until owner approves)

When Option A is recorded in chat, plan write should use cohort-scoped output paths and **filter** `planned_changes` to the four slugs only:

```bash
npx tsx scripts/report-air-purifier-apply-planner-batch-v2-v1.ts \
  --out data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json \
  --markdown-out data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.md
```

**INFERRED:** Default planner CLI may emit all in-memory `planned_changes` (currently **4** cohort slugs only at `0260719`). Re-verify `planned_change_count` and `planned_slugs` before write; reject if any non-cohort slug appears.

**PROVEN:** Running the command above **without** prior Option A approval would be out of scope for this chat turn.

---

## 8. Validation commands (read-only)

### Aggregator — four slugs auto_apply_eligible

```bash
npx tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts \
  | node -e "
const chunks=[];process.stdin.on('data',d=>chunks.push(d));
process.stdin.on('end',()=>{
  const r=JSON.parse(Buffer.concat(chunks).toString());
  for (const slug of ['levoit-rf-rar040','levoit-rf-rar060','levoit-rf-c131','levoit-rf-cr200']) {
    const auto=r.review_groups.auto_apply_eligible.find(x=>x.slug===slug);
    console.log(slug, auto?'auto_apply_eligible':'BLOCKED', auto?.review_reasons||[]);
  }
});"
```

**Expected at `0260719`:** all four → `auto_apply_eligible` / `passes_auto_apply_validation`.

### Slug-status — per slug

```bash
npm run buckparts:ap:slug-status -- --slug levoit-rf-rar040
npm run buckparts:ap:slug-status -- --slug levoit-rf-rar060
npm run buckparts:ap:slug-status -- --slug levoit-rf-c131
npm run buckparts:ap:slug-status -- --slug levoit-rf-cr200
```

**Expected:** `canonical_evidence_present: complete`, `aggregator_auto_apply_eligible: complete`, `next_unresolved_stage_id: catalog_present` (alias gap) or `apply_plan_ready` after plan write.

### Grep — current search placeholders

```bash
awk -F',' '$1 ~ /^levoit-rf-rar040|levoit-rf-rar060|levoit-rf-c131|levoit-rf-cr200/ && $4=="true" {
  print $1, $7, $8
}' data/air-purifier/retailer_links.csv
```

**Expected:** four rows with `levoit.com/search?q=LEVOIT-RF-*` and empty `browser_truth_classification`.

### In-memory planner — cohort planned_change count

```bash
npx tsx -e "
import { buildAirPurifierApplyPlannerBatchV2V1Report } from './scripts/lib/air-purifier-apply-planner-batch-v2-v1.ts';
const r = buildAirPurifierApplyPlannerBatchV2V1Report({ rootDir: process.cwd() });
console.log('planned_change_count', r.planned_change_count);
console.log('planned_slugs', r.planned_changes.map(c=>c.filter_slug));
"
```

**Expected at `0260719`:** `planned_change_count: 4`, slugs = four-slug cohort only.

---

## Appendix — repo pointers

| Artifact | Path |
|----------|------|
| Class policy | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-OWNER-REVIEW-v1.md` |
| Evidence-write packet | `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EVIDENCE-WRITE-OWNER-REVIEW-v1.md` |
| Canonical evidence | `data/air-purifier/batch-production/agent-results/ap-levoit-oem-discovery-v1.results.json` |
| Batch-v2 evidence mirror | `data/air-purifier/batch-production/agent-results-batch-v2/ap-levoit-oem-discovery-v1.results.json` |
| Search placeholders | `data/air-purifier/retailer_links.csv` |
| Stale batch plan | `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json` |
| Winix apply-plan precedent | `docs/air-purifier/AP-APPLY-AUTHORIZATION-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` |

---

## PROVEN / INFERRED / UNKNOWN

| Topic | Label |
|-------|-------|
| Four evidence rows `PASS_DIRECT_BUYABLE`; aggregator auto_apply_eligible | **PROVEN** |
| CSV still search placeholder; safe CTA delta 0 | **PROVEN** |
| In-memory planner ready with 4 planned changes (cohort only) | **PROVEN** |
| No mutation from this document | **PROVEN** |
| +4 safe CTAs after future authorized CSV apply | **INFERRED** |
| `browser_truth_checked_at` at plan-write time | **INFERRED** |
| Levoit stock/price at future apply time | **UNKNOWN** |

---

This packet is owner decision support only. Option A authorizes **apply plan artifact write** for the four-slug Levoit Consumer Naming Bridge cohort. It does **not** authorize CSV apply, safe CTA claims, Supabase mutation, or deploy.
