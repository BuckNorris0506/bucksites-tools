# AP Medify MA-series - Supabase parity result v1

## Six-slug OEM Medify cohort

**Report type:** parity apply + post-apply reconciliation record (docs-only)  
**Recorded:** 2026-06-15  
**Repo checkpoint:** `7d292c4711c1f4410e3be446facee555dee3cf60` or newer  
**Owner packet:** `docs/air-purifier/AP-MEDIFY-MA-SERIES-SUPABASE-PARITY-OWNER-REVIEW-v1.md`  
**Parity plan:** `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json`  
**CSV apply artifact:** `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1-apply.json`  
**Scope:** six filter slugs only - `medify-ma18-rf`, `medify-ma22-rf`, `medify-ma25-rf`, `medify-ma40-rf`, `medify-ma50-rf`, `medify-ma112-rf`

**This docs step:** Records operator verification only. It does not authorize further Supabase, CSV, deploy, evidence, apply-plan, or owner-decision mutation.

---

## 1. Prior CSV factory proof

| Fact | Result | Label |
|------|--------|-------|
| Executor CSV apply | `APPLIED` | **PROVEN** |
| `planned_change_count` | `6` | **PROVEN** |
| `applied_change_count` | `6` | **PROVEN** |
| Changed slugs | six Medify scoped slugs only | **PROVEN** |
| `blocked_reasons` | `[]` | **PROVEN** |
| AP safe CTA count | `15` -> `21` (`+6`) | **PROVEN** |

Scoped CSV apply slugs:

| Slug | CSV apply status |
|------|------------------|
| `medify-ma18-rf` | Applied |
| `medify-ma22-rf` | Applied |
| `medify-ma25-rf` | Applied |
| `medify-ma40-rf` | Applied |
| `medify-ma50-rf` | Applied |
| `medify-ma112-rf` | Applied |

Parity apply did not mutate CSV. Local CSV state remains authoritative for repo factory artifacts.

---

## 2. Supabase parity apply proof

**Command class:** Supabase parity `--apply`, executed after owner authorization.

| Field | Value |
|-------|-------|
| `apply_status` | **`APPLIED`** |
| `applied_change_count` | **`6`** |
| `blocked_reasons` | `[]` |

**PROVEN:** Supabase parity applied the six scoped Medify rows.

**PROVEN:** No seed import or SQL insert was needed for this cohort. The parity path reconciled existing Supabase filter/link rows to the committed Medify apply-plan `after_row` values.

---

## 3. Post-apply parity dry-run proof

**Command class:** Supabase parity dry-run, executed after parity apply.

| Field | Value |
|-------|-------|
| `apply_status` | **`ALREADY_APPLIED`** |
| `already_applied_count` | **`6`** |
| Per-row `match_mode` | `after_row` for all six |

Post-apply row state:

| Slug | `match_mode` | Label |
|------|--------------|-------|
| `medify-ma18-rf` | `after_row` | **PROVEN** |
| `medify-ma22-rf` | `after_row` | **PROVEN** |
| `medify-ma25-rf` | `after_row` | **PROVEN** |
| `medify-ma40-rf` | `after_row` | **PROVEN** |
| `medify-ma50-rf` | `after_row` | **PROVEN** |
| `medify-ma112-rf` | `after_row` | **PROVEN** |

### Interpretation

1. **Post-apply dry-run reports `ALREADY_APPLIED`** - all six Supabase rows match plan `after_row` (**PROVEN**).

2. **No additional Supabase update is required at current state** - parity dry-run sees all six rows as already applied (**INFERRED** from `ALREADY_APPLIED` + `already_applied_count: 6`).

3. **CSV to Supabase parity is reconciled for the Medify MA-series cohort** - local CSV factory completion and Supabase rows now agree for the six scoped rows (**PROVEN** by parity apply + post-apply dry-run contract).

---

## 4. No seed import / no SQL needed

| Path | Status |
|------|--------|
| `npm run seed:import:air-purifier` | **Not used** |
| Slug-scoped SQL insert | **Not used** |
| Net-new Supabase filter insert | **Not required** |
| Net-new Supabase retailer link insert | **Not required** |

**PROVEN:** This cohort followed the parity update path, not the seed or SQL insert path.

---

## 5. Factory stage status

| Stage | Status | Label |
|-------|--------|-------|
| Local CSV factory | Complete (`direct_buyable`, +6 safe CTA) | **PROVEN** |
| Executor CSV apply | `APPLIED` (15 -> 21 safe CTA) | **PROVEN** |
| Supabase parity apply | `APPLIED` (6 updated) | **PROVEN** |
| Supabase parity verification | `ALREADY_APPLIED` (6 `after_row`) | **PROVEN** |
| Seed import | Not used | **PROVEN** |
| SQL insert | Not used | **PROVEN** |
| Deploy | Not performed by this record | **UNKNOWN** |
| Production smoke | Not performed by this record | **UNKNOWN** |

---

## 6. Explicit non-actions

| Path | Status |
|------|--------|
| CSV edit in this docs step | **Not performed** |
| Supabase mutation in this docs step | **Not performed** |
| Deploy / Netlify / public UI mutation | **Not performed** |
| Apply-plan edit | **Not performed** |
| Evidence edit | **Not performed** |
| `data/owner-decisions/` row | **Not created** |
| Non-Medify slugs | **Not touched** |
| `medify-ma35-rf` | **Not touched** |

---

## 7. PROVEN / INFERRED / UNKNOWN

| Claim | Label |
|-------|-------|
| Local CSV safe CTA 15 -> 21 (+6) | **PROVEN** |
| CSV apply `APPLIED`, `applied_change_count: 6` | **PROVEN** |
| Supabase parity `APPLIED`, `applied_change_count: 6` | **PROVEN** |
| Supabase post-apply dry-run `ALREADY_APPLIED` | **PROVEN** |
| All six post-apply parity rows `match_mode: after_row` | **PROVEN** |
| No seed import or SQL insert needed | **PROVEN** |
| Parity `--apply` re-run not required at current state | **INFERRED** |
| Live public page shows safe CTA for six Medify slugs | **UNKNOWN** |
| Production deploy reflects Supabase + CSV state | **UNKNOWN** |
| Runtime buyer path reads updated Supabase rows without stale cache | **UNKNOWN** |

---

## 8. Remaining owner lane

Separate owner authorization is still required for deploy or production smoke. This result document does not authorize:

- Supabase parity `--apply` re-run
- CSV re-apply
- deploy
- production smoke
- owner-decision row creation
- any non-Medify slug work

---

## 9. Related artifacts

- `docs/air-purifier/AP-MEDIFY-MA-SERIES-SUPABASE-PARITY-OWNER-REVIEW-v1.md`
- `docs/air-purifier/AP-MEDIFY-MA-SERIES-EXECUTOR-APPLY-OWNER-REVIEW-v1.md`
- `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json`
- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-medify-ma-series-cohort-v1-apply.json`
- `scripts/lib/air-purifier-supabase-apply-parity-v1.ts`
