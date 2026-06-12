# AP Supabase SQL dry-run result — Winix Filter H `116130` v1

## `winix-filter-h-116130`

**Report type:** dry-run reconciliation record (docs-only)  
**Recorded:** 2026-06-10  
**Repo checkpoint:** `da57cd1`  
**SQL plan executed:** `docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql`  
**Owner packet:** `docs/air-purifier/AP-SUPABASE-SQL-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`  
**Scope:** one slug only — **not** `winix-carbon-116131` demotion/repair

**Deploy note:** Deploy for `d58afca` was **cancelled** — repo CSV is truth; live public runtime is **UNKNOWN**.

**COMMIT result (subsequent):** `docs/air-purifier/AP-SUPABASE-SQL-COMMIT-RESULT-WINIX-FILTER-H-116130-v1.md` at checkpoint `67c724d` — **PROVEN** COMMIT + parity `ALREADY_APPLIED`.

---

## 1. Dry-run execution summary

| Fact | Result | Label |
|------|--------|-------|
| SQL dry-run executed with `ROLLBACK` | Yes | **PROVEN** (operator report) |
| Transaction ended `ROLLBACK` (not `COMMIT`) | Yes | **PROVEN** |
| No durable Supabase mutation persisted | Yes | **PROVEN** (`filter_exists_after_rollback = 0`) |

---

## 2. Verification counters (pasted Supabase output)

| Check | Count | Expected | Status |
|-------|-------|----------|--------|
| `brand_winix_exists` | **1** | 1 | **PROVEN** pass |
| `model_5500_2_exists` | **1** | 1 | **PROVEN** pass |
| `carbon_mapping_unchanged_baseline` | **1** | 1 | **PROVEN** pass |
| `filter_exists_after_rollback` | **0** | 0 | **PROVEN** pass |

### Interpretation

1. **Required dependencies exist** — `brands.slug = winix` and `air_purifier_models.slug = winix-5500-2` are present in Supabase (**PROVEN**).

2. **Carbon baseline intact** — `winix-5500-2 → winix-carbon-116131` mapping unchanged after dry-run (**PROVEN**).

3. **New filter did not persist** — `air_purifier_filters.slug = winix-filter-h-116130` absent after `ROLLBACK` (**PROVEN**).

4. **No Supabase mutation persisted** — dry-run inserts were undone (**PROVEN**).

**INFERRED:** In-transaction `INSERT … RETURNING` and §3 verification SELECTs showed expected row shape before `ROLLBACK` (operator did not paste full RETURNING output in reconciliation request).

---

## 3. Parity status (unchanged post-rollback)

**PROVEN:** Parity dry-run still expected `BLOCKED` — `air_purifier_filters.slug not found` until authorized `COMMIT`.

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json
```

**INFERRED after future COMMIT:** Parity may report `ALREADY_APPLIED` if committed rows match plan `after_row` including `browser_truth_*`.

---

## 4. COMMIT authorization status

**PROVEN:** `COMMIT` remains **NOT AUTHORIZED** unless owner separately approves per §5 below.

Dry-run success does **not** auto-authorize persistence.

---

## 5. COMMIT status — **COMPLETE** (PROVEN at `67c724d`)

Owner COMMIT executed. Full reconciliation:

`docs/air-purifier/AP-SUPABASE-SQL-COMMIT-RESULT-WINIX-FILTER-H-116130-v1.md`

| Post-COMMIT check | Result |
|-------------------|--------|
| `filter_exists_after_commit` | **1** |
| `retailer_link_exists_after_commit` | **1** |
| `alias_exists_after_commit` | **1** |
| `compat_mapping_exists_after_commit` | **1** |
| `carbon_mapping_unchanged_after_commit` | **1** |
| Parity dry-run `apply_status` | **`ALREADY_APPLIED`** |

**PROVEN:** No further Supabase parity `--apply` required for this slug.

---

## 6. Historical — COMMIT action (executed)

SQL plan committed via `docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql` with final `COMMIT;` (not `ROLLBACK`).

---

## 7. PROVEN / INFERRED / UNKNOWN

| Claim | Label |
|-------|-------|
| SQL dry-run executed with `ROLLBACK` | **PROVEN** |
| `brand_winix_exists = 1` | **PROVEN** |
| `model_5500_2_exists = 1` | **PROVEN** |
| `carbon_mapping_unchanged_baseline = 1` | **PROVEN** |
| `filter_exists_after_rollback = 0` | **PROVEN** |
| No Supabase mutation persisted | **PROVEN** |
| COMMIT not authorized by dry-run alone | **PROVEN** |
| In-transaction INSERT shape correct | **INFERRED** |
| Post-COMMIT parity status | **UNKNOWN** |
| Live public safe CTA | **UNKNOWN** (deploy cancelled) |

---

## 8. Related docs

- `docs/air-purifier/AP-SUPABASE-SQL-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`
- `docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql`
