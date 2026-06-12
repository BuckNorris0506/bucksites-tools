# AP executor dry-run owner review — Winix Filter H `116130` v1

## `winix-filter-h-116130`

**Report type:** read-only owner decision support — **executor dry-run review** (optional `--apply` authorization separate)  
**Generated:** 2026-06-10  
**Repo checkpoint:** `4b8b52e`  
**Scope:** **one** filter slug only — `winix-filter-h-116130` — **not** `winix-filter-s-1712-0096-00`, **not** `winix-carbon-116131` demotion/repair  
**Truth source:** slug-scoped apply plan, executor dry-run artifact, committed CSV (not HQ handoff)

**Prior packets:**

- Apply plan write: `docs/air-purifier/AP-APPLY-AUTHORIZATION-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` (Option A executed)
- Evidence write: `docs/air-purifier/AP-EVIDENCE-WRITE-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` (complete)
- Catalog ingest: `docs/air-purifier/AP-NET-NEW-CATALOG-INGEST-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md` (complete)

**Dry-run executed:** Yes — slug-scoped artifact written at checkpoint `4b8b52e` (see §7).

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner review of executor **dry-run** output for `winix-filter-h-116130` | Authorization for `executor --apply` unless owner records Option A in §4 |
| Confirmation that dry-run would touch **only** one `retailer_links.csv` row | Supabase seed/import, deploy, or public UI mutation |
| Rollback proof and exact planned CSV diff for owner inspection | Permission to alter `winix-carbon-116131` compat mappings or other slugs |
| Docs-only until owner records decision in chat | `data/owner-decisions/` row creation (unless separately requested) |

**PROVEN:** Dry-run does **not** mutate `retailer_links.csv` (`data_mutation: false`, `applied_change_count: 0`).

**PROVEN:** Executor `--apply` is **not** authorized by this packet unless owner explicitly records Option A in §4.

---

## Owner decision box

Choose **exactly one** and record in chat.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE EXECUTOR --apply (winix-filter-h-116130 only)           │
│                                                                             │
│  I have reviewed dry-run output per §7 and approve CSV apply:               │
│    node --import tsx scripts/report-air-purifier-apply-executor-v1.ts       │
│      --plan data/air-purifier/batch-production/apply-plans-batch-v2/        │
│        ap-apply-plan-winix-filter-h-116130-v1.json                          │
│      --apply                                                                │
│                                                                             │
│  Scope: ONE row in data/air-purifier/retailer_links.csv only.               │
│  I do NOT approve: Supabase, deploy, public UI mutation, other slugs,       │
│  winix-carbon-116131 mapping changes, or gate weakening.                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — DO NOT APPROVE EXECUTOR --apply                                 │
│                                                                             │
│  I do not approve CSV apply for winix-filter-h-116130 at this time.          │
│  Dry-run artifacts may remain for reference.                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Note:** Dry-run was already executed (safe read-only path). This decision box governs **only** the next `--apply` step.

---

## 1. Required preflight checks (PROVEN at `4b8b52e`)

| # | Check | Result | Label |
|---|-------|--------|-------|
| 1 | Apply plan artifact exists | `ap-apply-plan-winix-filter-h-116130-v1.json` present | **PROVEN** |
| 2 | `planned_change_count = 1` | `1` | **PROVEN** |
| 3 | Planned slug exactly `winix-filter-h-116130` | `planned_slugs: ["winix-filter-h-116130"]` | **PROVEN** |
| 4 | `before_row` matches current `retailer_links.csv` | `before_row_match_count: 1`, `validation_errors: []` | **PROVEN** |
| 5 | `after_row` passes `direct_buyable` gate | Planner test pass; executor dry-run `DRY_RUN_READY` | **PROVEN** |
| 6 | `--apply` would change only `data/air-purifier/retailer_links.csv` row `winix-filter-h-116130` | Executor notes + 1 planned change + 0 duplicate targets | **PROVEN** |
| 7 | No Supabase / deploy / public UI in executor path | Executor mutates AP CSV only when `--apply` | **PROVEN** |
| 8 | Rollback row exists | `rollback_rows.length: 1` matching `before_row` | **PROVEN** |

---

## 2. Apply plan summary

**Path:** `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json`

| Field | Value |
|-------|-------|
| `plan_status` | `READY_FOR_OWNER_APPROVAL` |
| `planned_change_count` | `1` |
| `owner_approval_required` | `true` |
| `read_only` / `data_mutation` | `true` / `false` |

**Target file on `--apply`:** `data/air-purifier/retailer_links.csv` (**PROVEN** — executor default; plan has no alternate `target_csv_file`)

---

## 3. Exact planned CSV diff (not yet applied)

**File:** `data/air-purifier/retailer_links.csv`  
**Row:** `filter_slug=winix-filter-h-116130`, `retailer_key=oem-catalog`, `is_primary=true`

| Column | Before (PROVEN committed) | After (PROVEN from plan) |
|--------|---------------------------|--------------------------|
| `destination_url` | `https://www.winixamerica.com/search?q=WINIX-116130` | `https://www.winixamerica.com/product/filter-h-116130/` |
| `affiliate_url` | `https://www.winixamerica.com/search?q=WINIX-116130` | `https://www.winixamerica.com/product/filter-h-116130/` |
| `browser_truth_classification` | *(empty)* | `direct_buyable` |
| `browser_truth_notes` | *(empty)* | Canonical evidence `evidence_notes` (live re-proof 2026-06-10) |
| `browser_truth_checked_at` | *(empty)* | `2026-06-12T18:47:54.123Z` |

**Unchanged columns:** `filter_slug`, `retailer_name`, `is_primary`, `retailer_key`, `retailer_slug`

**PROVEN:** No other rows in `planned_changes`. Refused slugs in plan artifact are **not** applied by executor.

---

## 4. Rollback proof

**Plan `rollback_rows[0]`** (matches live CSV + `before_row`):

```json
{
  "filter_slug": "winix-filter-h-116130",
  "destination_url": "https://www.winixamerica.com/search?q=WINIX-116130",
  "affiliate_url": "https://www.winixamerica.com/search?q=WINIX-116130",
  "browser_truth_classification": "",
  "browser_truth_notes": "",
  "browser_truth_checked_at": ""
}
```

**Dry-run `rollback_rows`:** Identical snapshot (**PROVEN** — copied from plan).

**Revert path:** Restore `before_row` fields on primary `oem-catalog` row for `winix-filter-h-116130`.

---

## 5. Safety gates (no weakening)

| Gate | Status |
|------|--------|
| Exact token `116130` proven | **PROVEN** (evidence row) |
| Add to Cart proven | **PROVEN** (`buy_action_seen: true`) |
| `wrong_family_tokens_seen: []` | **PROVEN** |
| Cross-sell not in primary slice | **PROVEN** (evidence_notes) |
| `owner_review_required: false` | **PROVEN** |
| Gate weakening | **PROVEN** none |

---

## 6. Boundaries (hard)

- [ ] No `winix-carbon-116131` compat mapping changes
- [ ] No `winix-filter-s-1712-0096-00`
- [ ] No other slug CSV changes
- [ ] No Supabase mutation from executor dry-run or `--apply` alone
- [ ] No deploy / Netlify API mutation from executor
- [ ] No public UI mutation until CSV apply + separate seed/deploy authorization
- [ ] No `data/owner-decisions/` row unless separately requested

---

## 7. Dry-run execution (completed)

**Command (no `--apply`):**

```bash
node --import tsx scripts/report-air-purifier-apply-executor-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json \
  --out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-winix-filter-h-116130-v1.json \
  --markdown-out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-winix-filter-h-116130-v1.md
```

**Dry-run status:** `DRY_RUN_READY` (**PROVEN**)

| Field | Value |
|-------|-------|
| `mode` | `dry_run` |
| `data_mutation` | `false` |
| `applied_change_count` | `0` |
| `changed_slugs` | `[]` |
| `blocked_reasons` | `[]` |
| `preflight.before_row_match_count` | `1` |
| `preflight.validation_errors` | `[]` |
| `rollback_rows.length` | `1` |

**Artifacts:**

- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-winix-filter-h-116130-v1.json`
- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-winix-filter-h-116130-v1.md`

**CSV integrity:** SHA-256 unchanged before/after dry-run (`1e5842c8be48e30473f628c17efbf145ad791bff844b12b9b4f647b9821d5f4c`) — **PROVEN**

---

## 8. Validation commands (read-only)

```bash
# Plan checks
node -e "
const p=require('./data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json');
console.log({count:p.planned_change_count,slugs:p.planned_changes.map(c=>c.filter_slug),rollback:p.rollback_rows.length});
"

# Planner gates (in-memory)
node --import tsx --test scripts/report-air-purifier-apply-planner-batch-v2-v1.test.ts \
  --test-name-pattern "before_row matches|after_row passes"

# Dry-run (repeat safe)
node --import tsx scripts/report-air-purifier-apply-executor-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json \
  --out data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-winix-filter-h-116130-v1.json

# Confirm CSV still placeholder
awk -F',' '$1==\"winix-filter-h-116130\" && $4==\"true\" {print $7, $8}' data/air-purifier/retailer_links.csv
```

---

## 9. Blockers before `executor --apply`

| Blocker | Label |
|---------|-------|
| Owner Option A not recorded in chat | **PROVEN** — required per §4 |
| `retailer_links.csv` still search placeholder | **PROVEN** — expected until `--apply` |
| Supabase parity not run | **PROVEN** — separate authorization |
| Deploy / public UI not authorized | **PROVEN** — separate authorization |
| Live coverage not claimed | **PROVEN** — no `direct_buyable` in CSV yet |

**INFERRED:** After `--apply`, run `npm run lint && npm run build` per plan `post_apply_checklist` (future task).

---

## 10. Related docs

- `docs/air-purifier/AP-APPLY-AUTHORIZATION-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`
- `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json`
- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-winix-filter-h-116130-v1.json`

---

## 11. Disclaimer

Dry-run confirms executor preflight only. It does **not** authorize CSV mutation, Supabase import, deploy, or live safe CTA claims. `--apply` requires explicit owner Option A in §4.
