# AP Supabase SQL dry-run result — Winix Filter H `116130` v1

## `winix-filter-h-116130`

**Report type:** dry-run reconciliation record (docs-only)  
**Recorded:** 2026-06-10  
**Repo checkpoint:** `da57cd1`  
**SQL plan executed:** `docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql`  
**Owner packet:** `docs/air-purifier/AP-SUPABASE-SQL-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`  
**Scope:** one slug only — **not** `winix-carbon-116131` demotion/repair

**Deploy note:** Deploy for `d58afca` was **cancelled** — repo CSV is truth; live public runtime is **UNKNOWN**.

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

## 5. Next owner decision (post dry-run)

Choose **exactly one** and record in chat.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE COMMIT (winix-filter-h-116130 SQL plan only)            │
│                                                                             │
│  Dry-run verification passed per AP-SUPABASE-SQL-DRY-RUN-RESULT-            │
│  WINIX-FILTER-H-116130-v1.md.                                               │
│                                                                             │
│  I authorize executing the same SQL plan with COMMIT instead of ROLLBACK:   │
│    docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql         │
│                                                                             │
│  I do NOT authorize: seed import, parity --apply, deploy, CSV changes,      │
│  other slugs, or winix-carbon-116131 demotion.                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — DO NOT APPROVE COMMIT                                           │
│                                                                             │
│  I do not authorize Supabase COMMIT for winix-filter-h-116130.              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Exact next SQL action if owner approves COMMIT

**NOT RUN YET** — requires explicit Option A above.

1. Open `docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql`
2. Execute preflight §1 and guarded INSERTs §2 unchanged
3. Verify §3 post-insert SELECTs
4. Replace final `ROLLBACK;` with:

```sql
COMMIT;
```

**Do not** run `npm run seed:import:air-purifier` in the same session.

### Post-COMMIT verification (read-only)

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json
```

Re-check carbon baseline:

```sql
SELECT m.slug AS model_slug, f.slug AS filter_slug, c.is_recommended
FROM public.air_purifier_compatibility_mappings c
JOIN public.air_purifier_models m ON m.id = c.air_purifier_model_id
JOIN public.air_purifier_filters f ON f.id = c.air_purifier_filter_id
WHERE lower(m.slug) = 'winix-5500-2'
  AND lower(f.slug) = 'winix-carbon-116131';
```

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
