# AP Supabase SQL COMMIT + parity result — Winix Filter H `116130` v1

## `winix-filter-h-116130`

**Report type:** COMMIT + parity reconciliation record (docs-only)  
**Recorded:** 2026-06-10  
**Repo checkpoint:** `67c724d`  
**SQL plan committed:** `docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql`  
**Prior dry-run:** `docs/air-purifier/AP-SUPABASE-SQL-DRY-RUN-RESULT-WINIX-FILTER-H-116130-v1.md`  
**Owner packet:** `docs/air-purifier/AP-SUPABASE-SQL-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`  
**Parity plan:** `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json`  
**Scope:** one slug only — **not** `winix-carbon-116131` demotion/repair

**Deploy note:** Deploy for `d58afca` was **cancelled** — Supabase parity may be **PROVEN** while live public runtime exposure remains **UNKNOWN**.

**This docs step:** Records operator verification only. **Does not** authorize further Supabase, CSV, or deploy mutation.

---

## 1. SQL COMMIT summary

| Fact | Result | Label |
|------|--------|-------|
| SQL plan executed with `COMMIT` (not `ROLLBACK`) | Yes | **PROVEN** (operator report) |
| `winix-filter-h-116130` persisted in Supabase | Yes | **PROVEN** (`filter_exists_after_commit = 1`) |
| Four expected objects present | Yes | **PROVEN** (see §2) |
| `winix-carbon-116131` mapping unchanged | Yes | **PROVEN** (`carbon_mapping_unchanged_after_commit = 1`) |

---

## 2. Supabase COMMIT verification counters (pasted output)

| Check | Count | Expected | Status |
|-------|-------|----------|--------|
| `filter_exists_after_commit` | **1** | 1 | **PROVEN** pass |
| `retailer_link_exists_after_commit` | **1** | 1 | **PROVEN** pass |
| `alias_exists_after_commit` | **1** | 1 | **PROVEN** pass |
| `compat_mapping_exists_after_commit` | **1** | 1 | **PROVEN** pass |
| `carbon_mapping_unchanged_after_commit` | **1** | 1 | **PROVEN** pass |

### Expected objects (all **PROVEN** present)

| Table | Object |
|-------|--------|
| `air_purifier_filters` | `slug = winix-filter-h-116130` |
| `air_purifier_retailer_links` | Primary `oem-catalog` approved link with PDP + `browser_truth_*` |
| `air_purifier_filter_aliases` | Alias `116130` |
| `air_purifier_compatibility_mappings` | `winix-5500-2` → filter, `is_recommended = true` |

---

## 3. Parity dry-run result (pasted output)

**Command (read-only):**

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json
```

| Field | Value |
|-------|-------|
| `report_name` | `air_purifier_supabase_apply_parity_v1` |
| `mode` | `dry_run` |
| `data_mutation` | `false` |
| `apply_status` | **`ALREADY_APPLIED`** |
| `planned_change_count` | `1` |
| `applied_change_count` | `0` |
| `already_applied_count` | `1` |
| `blocked_reasons` | `[]` |
| `filter_slug` | `winix-filter-h-116130` |
| `match_mode` | `after_row` |
| `gate_after_projected` | `null` |
| `would_update` | `false` |
| `updated` | `false` |

### Interpretation

1. **Parity dry-run reports `ALREADY_APPLIED`** — Supabase row matches plan `after_row` (**PROVEN**).

2. **No additional Supabase update needed** — `would_update: false`, `updated: false`, `applied_change_count: 0` (**PROVEN**).

3. **Parity `--apply` is not required** for this slug at current state (**INFERRED** from `ALREADY_APPLIED` + zero blocked reasons).

4. **Gate clean** — `gate_after_projected: null` (**PROVEN**).

---

## 4. Factory stage status (winix-filter-h-116130)

| Stage | Status | Label |
|-------|--------|-------|
| Local CSV factory | Complete (`direct_buyable`) | **PROVEN** (repo) |
| Executor CSV apply | `APPLIED` | **PROVEN** (repo artifact) |
| Supabase filter + link + alias + compat | Present post-COMMIT | **PROVEN** (operator verification) |
| Supabase parity | `ALREADY_APPLIED` | **PROVEN** (parity dry-run) |
| Parity `--apply` | Not needed | **PROVEN** / **INFERRED** |
| Live public deploy / safe CTA on site | Not proven | **UNKNOWN** (deploy cancelled) |

---

## 5. Boundaries (this docs step)

- [ ] **No** Supabase mutation authorized by this record
- [ ] **No** parity `--apply` authorized (not needed per §3)
- [ ] **No** deploy / Netlify / public UI mutation
- [ ] **No** CSV edits
- [ ] **No** `data/owner-decisions/` rows
- [ ] **No** other slug changes
- [ ] **No** `winix-carbon-116131` demotion or mapping repair

---

## 6. PROVEN / INFERRED / UNKNOWN

| Claim | Label |
|-------|-------|
| SQL COMMIT succeeded for `winix-filter-h-116130` | **PROVEN** |
| Filter row exists after COMMIT | **PROVEN** |
| Retailer link exists after COMMIT | **PROVEN** |
| Alias exists after COMMIT | **PROVEN** |
| Compat mapping exists after COMMIT | **PROVEN** |
| Carbon mapping unchanged after COMMIT | **PROVEN** |
| Parity dry-run `ALREADY_APPLIED` | **PROVEN** |
| No additional Supabase update needed | **PROVEN** |
| Parity `--apply` not required | **INFERRED** |
| Local CSV still matches committed Supabase shape | **INFERRED** (not re-verified in this record) |
| Live public page shows safe CTA for slug | **UNKNOWN** |
| Production deploy reflects Supabase state | **UNKNOWN** |

---

## 7. Exact next step (after this repo record)

1. **Commit these docs** to repo at `67c724d` or later (operator/git — not authorized by this record alone).

2. **Separate owner authorization** if live public exposure is desired:
   - Deploy / production smoke for `/air-purifier/filter/winix-filter-h-116130`
   - Confirm runtime reads committed Supabase rows (not CSV-only dev path)

3. **Do not run** unless separately authorized:
   - `apply-air-purifier-supabase-parity-v1.ts --apply` (noop at `ALREADY_APPLIED`)
   - `npm run seed:import:air-purifier` (full vertical blast radius)
   - Executor CSV re-apply

4. **Optional read-only verification** (no mutation):

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json
```

Expect: `apply_status: ALREADY_APPLIED`.

---

## 8. Related docs

- `docs/air-purifier/AP-SUPABASE-SQL-DRY-RUN-RESULT-WINIX-FILTER-H-116130-v1.md`
- `docs/air-purifier/AP-SUPABASE-SQL-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`
- `docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql`
- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-winix-filter-h-116130-v1-apply.json`
