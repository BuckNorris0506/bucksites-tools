# AP apply authorization owner review — Winix Filter H `116130` v1

## `winix-filter-h-116130`

**Report type:** read-only owner decision support — **apply plan write authorization only** (optional bounded executor dry-run)  
**Generated:** 2026-06-10  
**Repo checkpoint:** `d378be1` (HEAD); evidence row may be uncommitted in working tree  
**Scope:** **one** filter slug only — `winix-filter-h-116130` — **not** `winix-filter-s-1712-0096-00`, **not** `winix-carbon-116131` demotion/repair  
**Truth source:** committed CSV, batch-v2 evidence, aggregator, in-memory apply planner (not HQ handoff)

**Prior packets:**

- Catalog ingest: `docs/air-purifier/AP-NET-NEW-CATALOG-INGEST-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` (complete)
- Evidence write: `docs/air-purifier/AP-EVIDENCE-WRITE-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` (Option A executed — canonical evidence row present)

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner approval to **write** a slug-scoped or refreshed batch-v2 apply plan for `winix-filter-h-116130` | Authorization to run executor `--apply` (CSV mutation) |
| Owner approval for **optional** executor **dry-run review** only if owner explicitly adds §4b line | Authorization for live safe CTA, live coverage, `/go`, or public UI mutation |
| A scope lock on apply planning for **one slug** | Supabase seed/import, deploy, or `data/owner-decisions/` row creation |
| Docs-only until owner records Option A in chat | Permission to alter `winix-carbon-116131` compat mappings or other slugs |

**PROVEN:** No production, app, CSV, Supabase, evidence-file, executor-apply, or deploy mutation occurs from this document alone.

**PROVEN:** Option A does **not** set `csv_apply_authorized`, `batch_start_authorized`, `supabase_mutation_authorized`, `public_ui_mutation_authorized`, or `netlify_api_authorized`.

**PROVEN:** Option A authorizes **apply plan artifact write only** — not `retailer_links.csv` mutation until a **separate** executor-apply authorization.

---

## Owner decision box

Choose **exactly one** and record in chat. **Do not** create `data/owner-decisions/` registry rows from this packet unless separately requested.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE APPLY PLAN WRITE ONLY (winix-filter-h-116130)           │
│                                                                             │
│  I approve writing an apply plan artifact for winix-filter-h-116130 per §3. │
│                                                                             │
│  Preferred artifact (slug-scoped):                                          │
│    data/air-purifier/batch-production/apply-plans-batch-v2/                 │
│    ap-apply-plan-winix-filter-h-116130-v1.json                              │
│                                                                             │
│  Alternate (refresh default batch-v2 plan — now 1 planned_change only):     │
│    data/air-purifier/batch-production/apply-plans-batch-v2/                 │
│    ap-apply-plan-batch-v2.json                                              │
│                                                                             │
│  I do NOT approve: executor --apply, CSV mutation, Supabase, deploy,        │
│  safe CTA claim, gate weakening, or changes to other slugs.                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A + DRY-RUN (optional add-on — requires Option A first)           │
│                                                                             │
│  In addition to Option A, I authorize executor DRY-RUN ONLY against the     │
│  approved plan path from Option A:                                           │
│    node --import tsx scripts/report-air-purifier-apply-executor-v1.ts       │
│      --plan <approved-plan-json>                                            │
│  (no --apply flag)                                                          │
│                                                                             │
│  I still do NOT authorize executor --apply or retailer_links.csv mutation.  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — DO NOT APPROVE                                                  │
│                                                                             │
│  I do not approve apply planning for winix-filter-h-116130 at this time.    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Separate authorization required for CSV apply:** Executor `--apply` must be authorized in a **future** owner packet — not Option A, not Option A + dry-run.

---

## 1. Current state

### Evidence — valid (PROVEN)

| Check | Status |
|-------|--------|
| Row in `data/air-purifier/batch-production/agent-results-batch-v2/ap-oem-search-placeholder-v1.results.json` | **PROVEN** present |
| `decision` | `PASS_DIRECT_BUYABLE` |
| `browser_truth_classification` | `direct_buyable` |
| `buy_action_seen` | `true` |
| `exact_tokens_seen` | `["116130", "Filter H – 116130"]` |
| `wrong_family_tokens_seen` | `[]` |
| `owner_review_required` | `false` |
| `recommended_csv_mutation` | `null` (batch-v2 bridge synthesizes at plan time) |
| Aggregator `invalid_rows` for slug | **0** |

**Note:** Evidence row may be **uncommitted** (`M` on results JSON at `d378be1`). **INFERRED:** Commit evidence before plan write for reproducible `source_aggregator_generated_at` timestamps.

### Aggregator — auto_apply_eligible (PROVEN)

`winix-filter-h-116130` appears in `review_groups.auto_apply_eligible` with `review_reasons: ["passes_auto_apply_validation"]`.

Four reference slugs also remain `auto_apply_eligible` but are **already applied** in CSV (`winix-hepa-115115`, `gg-flt5000`, `coway-max2-hepa`, `rabbit-biogs-minusa2`).

### In-memory apply planner — planned_change proven (PROVEN)

`buildAirPurifierApplyPlannerBatchV2V1Report({ rootDir })` (read-only, no file write):

| Field | Value |
|-------|-------|
| `plan_status` | `READY_FOR_OWNER_APPROVAL` |
| `planned_change_count` | **1** |
| Planned slug | **`winix-filter-h-116130` only** |

Reference slugs refused with `before_row_not_search_placeholder` + `before_row_already_has_browser_truth` (**PROVEN**).

### Committed apply plan — stale (PROVEN)

| Artifact | Status |
|----------|--------|
| `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json` | `generated_at: 2026-05-24`; `planned_change_count: 4`; **no** `winix-filter-h-116130` entry |
| `synthesized_mutation_slugs` | `winix-hepa-115115`, `gg-flt5000`, `coway-max2-hepa`, `rabbit-biogs-minusa2` only |

**PROVEN:** Committed plan predates Filter H evidence and does not reflect current factory state.

### retailer_links.csv — still search placeholder (PROVEN)

Primary `oem-catalog` row for `winix-filter-h-116130`:

| Field | Current value |
|-------|---------------|
| `destination_url` | `https://www.winixamerica.com/search?q=WINIX-116130` |
| `affiliate_url` | `https://www.winixamerica.com/search?q=WINIX-116130` |
| `browser_truth_classification` | *(empty)* |
| `browser_truth_notes` | *(empty)* |
| `browser_truth_checked_at` | *(empty)* |

### Live coverage — not claimed

**PROVEN:** No `direct_buyable` browser truth on committed `retailer_links.csv` for this slug.  
**PROVEN:** No executor `--apply` run for this slug.  
**UNKNOWN:** Current in-stock / price on Winix storefront at time of future apply.

---

## 2. Exact proposed CSV change (from in-memory planner — not yet applied)

**File:** `data/air-purifier/retailer_links.csv`  
**Row key:** `filter_slug=winix-filter-h-116130`, `retailer_key=oem-catalog`, `is_primary=true`

| Field | Before (PROVEN committed) | After (PROVEN in-memory planner) |
|-------|---------------------------|----------------------------------|
| `destination_url` | `https://www.winixamerica.com/search?q=WINIX-116130` | `https://www.winixamerica.com/product/filter-h-116130/` |
| `affiliate_url` | `https://www.winixamerica.com/search?q=WINIX-116130` | `https://www.winixamerica.com/product/filter-h-116130/` |
| `browser_truth_classification` | *(empty)* | `direct_buyable` |
| `browser_truth_notes` | *(empty)* | Evidence `evidence_notes` string (live re-proof 2026-06-10; see §3) |
| `browser_truth_checked_at` | *(empty)* | Planner `generated_at` at plan-write time (**INFERRED** — not fixed until plan artifact written) |

**Changed fields (planner):** `destination_url`, `affiliate_url`, `browser_truth_classification`, `browser_truth_notes`, `browser_truth_checked_at`

**PROVEN:** This change is **not** in committed CSV until a future executor `--apply` authorization.

---

## 3. Safety gates (no weakening)

| Gate | Evidence value | Status |
|------|----------------|--------|
| Exact token `116130` in primary slice | `exact_tokens_seen` includes `116130`, `Filter H – 116130` | **PROVEN** |
| Add to Cart | `buy_action_seen: true` | **PROVEN** (live re-proof 2026-06-10) |
| Wrong-family tokens | `wrong_family_tokens_seen: []` | **PROVEN** |
| Cross-sell not in primary area | Filter A `115115` / Filter I `116131` in shopmulti carousel only | **PROVEN** (evidence_notes) |
| `owner_review_required` | `false` | **PROVEN** |
| `decision` | `PASS_DIRECT_BUYABLE` | **PROVEN** |
| Gate weakening / token exceptions | None proposed | **PROVEN** |

**INFERRED:** Committed search URL `?q=WINIX-116130` returned HTTP 404 during live re-proof; buyer path used alternate search then PDP. Planner promotes **PDP** `final_url`, not the broken search URL.

---

## 4. Boundaries (hard)

- [ ] No `retailer_links.csv` mutation from this packet (executor `--apply` **not** authorized)
- [ ] No executor `--apply` from Option A or Option A + dry-run
- [ ] No live safe CTA or coverage claim
- [ ] No Supabase mutation (`import-air-purifier-seed` or other)
- [ ] No deploy / Netlify API mutation
- [ ] No gate weakening, family-token override, or token exceptions
- [ ] No `data/owner-decisions/` row unless separately requested
- [ ] No demotion of `winix-carbon-116131` compat mappings in this packet
- [ ] Do **not** include `winix-filter-s-1712-0096-00`
- [ ] Apply plan write must include **only** `winix-filter-h-116130` in `planned_changes` (filter full batch-v2 report if using default `--out`)

### Factory sequence after Option A (informational)

1. **This packet** — owner Option A → apply plan artifact write
2. **Optional** — owner Option A + dry-run → executor dry-run against approved plan (no `--apply`)
3. Owner review dry-run output
4. **Separate** owner packet → executor `--apply` authorization
5. `scripts/report-air-purifier-apply-executor-v1.ts --plan <path> --apply` (not authorized here)
6. **Separate** Supabase / deploy authorization (not in scope)

---

## 5. Authorized actions (Option A only — post owner chat approval)

### 5a. Apply plan write (authorized by Option A)

**Read planner in-memory first (no write):**

```bash
node --import tsx --test scripts/report-air-purifier-apply-planner-batch-v2-v1.test.ts \
  --test-name-pattern "before_row matches"
```

**Write slug-scoped plan (preferred — preserves stale 2026-05-24 batch plan as archive):**

```bash
# Agent step after Option A: build report in-memory, filter planned_changes to
# winix-filter-h-116130 only, write JSON + markdown under apply-plans-batch-v2/
node --import tsx scripts/report-air-purifier-apply-planner-batch-v2-v1.ts \
  --results-dir data/air-purifier/batch-production/agent-results-batch-v2 \
  --out data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json \
  --markdown-out data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.md
```

**INFERRED:** Default planner CLI emits **all** in-memory `planned_changes` (currently **1** slug). If batch-v2 evidence later adds new search-placeholder winners, re-filter to `winix-filter-h-116130` before write when using slug-scoped path.

**Alternate — refresh default batch-v2 plan:**

```bash
node --import tsx scripts/report-air-purifier-apply-planner-batch-v2-v1.ts \
  --results-dir data/air-purifier/batch-production/agent-results-batch-v2
```

Writes `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json` (overwrites stale 4-slug plan with current 1-slug plan).

### 5b. Executor dry-run (authorized only by Option A + dry-run add-on)

```bash
node --import tsx scripts/report-air-purifier-apply-executor-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json
```

**PROVEN:** Default executor mode is dry-run; **no** `--apply` flag.

**PROVEN:** Dry-run writes apply-run artifacts under `data/air-purifier/batch-production/apply-runs/` — does **not** mutate `retailer_links.csv`.

---

## 6. Validation (read-only commands)

Run from repo root at checkpoint `d378be1` or later (with evidence row present).

### Inspect this packet

```bash
grep -n 'winix-filter-h-116130' \
  docs/air-purifier/AP-APPLY-AUTHORIZATION-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md
test -f docs/air-purifier/AP-APPLY-AUTHORIZATION-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md && echo "packet: OK"
```

### Inspect evidence row

```bash
node -e "
const fs=require('fs');
const row=JSON.parse(fs.readFileSync(
  'data/air-purifier/batch-production/agent-results-batch-v2/ap-oem-search-placeholder-v1.results.json','utf8'
)).rows.find(r=>r.slug==='winix-filter-h-116130');
console.log(JSON.stringify({
  slug: row.slug,
  decision: row.decision,
  final_url: row.final_url,
  buy_action_seen: row.buy_action_seen,
  exact_tokens_seen: row.exact_tokens_seen,
  wrong_family_tokens_seen: row.wrong_family_tokens_seen,
  owner_review_required: row.owner_review_required
}, null, 2));
"
```

**Expected:** `PASS_DIRECT_BUYABLE`, `buy_action_seen: true`, `wrong_family_tokens_seen: []`.

### Run aggregator (read-only)

```bash
node --import tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts \
  --results-dir data/air-purifier/batch-production/agent-results-batch-v2 \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const j=JSON.parse(d);
    const rows=j.review_groups.auto_apply_eligible.filter(r=>r.slug==='winix-filter-h-116130');
    console.log(JSON.stringify({
      invalid_row_count: j.invalid_row_count,
      auto_apply_winix_h: rows,
      owner_review_summary: j.owner_review_summary
    }, null, 2));
  });"
```

**Expected:** `invalid_row_count: 0`; slug in `auto_apply_eligible`.

### Run apply planner in-memory (read-only — no plan file write)

```bash
node --import tsx --test scripts/report-air-purifier-apply-planner-batch-v2-v1.test.ts \
  --test-name-pattern "before_row matches|after_row passes|does not mutate"
```

**Expected:** All tests pass; in-memory `planned_changes` includes only slugs still on search placeholder (`winix-filter-h-116130` at current checkpoint).

### Confirm committed plan stale + retailer_links unchanged

```bash
rg -c 'winix-filter-h-116130' \
  data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json \
  || echo "STALE_PLAN: slug absent (expected)"

awk -F',' '$1=="winix-filter-h-116130" && $4=="true" {
  print "destination_url:", $7
  print "browser_truth_classification:", $8
}' data/air-purifier/retailer_links.csv
```

**Expected:** slug absent from committed plan; `destination_url` still search placeholder; empty `browser_truth_classification`.

---

## 7. Validation output (2026-06-10 audit run)

### Evidence row

```json
{
  "slug": "winix-filter-h-116130",
  "decision": "PASS_DIRECT_BUYABLE",
  "final_url": "https://www.winixamerica.com/product/filter-h-116130/",
  "buy_action_seen": true,
  "exact_tokens_seen": ["116130", "Filter H – 116130"],
  "wrong_family_tokens_seen": [],
  "owner_review_required": false
}
```

### Aggregator

- `invalid_row_count`: **0**
- `winix-filter-h-116130`: `auto_apply_eligible`, `passes_auto_apply_validation`
- `owner_review_summary` includes: `5 slug(s) pass strict auto-apply validation: winix-hepa-115115, winix-filter-h-116130, gg-flt5000, coway-max2-hepa, rabbit-biogs-minusa2`

### In-memory apply planner

```json
{
  "plan_status": "READY_FOR_OWNER_APPROVAL",
  "planned_change_count": 1,
  "planned_slugs": ["winix-filter-h-116130"],
  "after_row": {
    "destination_url": "https://www.winixamerica.com/product/filter-h-116130/",
    "browser_truth_classification": "direct_buyable"
  }
}
```

### retailer_links.csv (unchanged)

```
destination_url: https://www.winixamerica.com/search?q=WINIX-116130
browser_truth_classification: 
```

### Committed apply plan

```
STALE_PLAN: slug absent from committed apply plan
```

---

## 8. Related docs

- `docs/air-purifier/AP-EVIDENCE-WRITE-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` — prior evidence-write authorization (complete)
- `docs/air-purifier/AP-NET-NEW-CATALOG-INGEST-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` — catalog ingest (complete)
- `data/air-purifier/batch-production/agent-results-batch-v2/ap-oem-search-placeholder-v1.results.json` — canonical evidence
- `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json` — stale committed plan (2026-05-24)

---

## 9. Disclaimer

This packet is owner decision support only. Option A authorizes **apply plan artifact write** for `winix-filter-h-116130`. It does **not** authorize CSV apply (`executor --apply`), safe CTA, live coverage claims, Supabase mutation, or deploy. Executor dry-run requires explicit Option A + dry-run add-on. CSV mutation requires a **separate** executor-apply authorization packet.
