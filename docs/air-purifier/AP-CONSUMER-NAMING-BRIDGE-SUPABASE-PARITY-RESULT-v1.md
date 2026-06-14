# AP Consumer Naming Bridge — Supabase parity result v1

## Four-slug Levoit cohort

**Report type:** parity apply + post-apply reconciliation record (docs-only)  
**Recorded:** 2026-06-13  
**Repo checkpoint:** `31cbaf0` or newer  
**Owner packet:** `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-SUPABASE-PARITY-OWNER-REVIEW-v1.md`  
**Parity plan:** `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json`  
**CSV apply artifact:** `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1-apply.json`  
**Scope:** four filter slugs only — `levoit-rf-rar040`, `levoit-rf-rar060`, `levoit-rf-c131`, `levoit-rf-cr200`

**This docs step:** Records operator verification only. **Does not** authorize further Supabase, CSV, or deploy mutation.

---

## 1. Prior CSV factory (PROVEN — unchanged by parity)

| Fact | Result | Label |
|------|--------|-------|
| Executor CSV apply | `APPLIED` | **PROVEN** (`ap-apply-run-levoit-consumer-naming-bridge-cohort-v1-apply.json`) |
| Changed slugs | 4 (cohort only) | **PROVEN** |
| `ap_safe_cta_count` | 11 → 15 (+4) | **PROVEN** |
| Primary rows `direct_buyable` | All four | **PROVEN** (`retailer_links.csv` at `67c864c`+) |

Parity apply did **not** mutate CSV. Local CSV state remains authoritative for repo factory artifacts.

---

## 2. Supabase parity apply result (pasted output)

**Command (mutates Supabase — executed under owner Option A):**

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json \
  --apply
```

| Field | Value |
|-------|-------|
| `report_name` | `air_purifier_supabase_apply_parity_v1` |
| `mode` | `apply` |
| `data_mutation` | `true` |
| `apply_status` | **`APPLIED`** |
| `planned_change_count` | `4` |
| `applied_change_count` | **`4`** |
| `already_applied_count` | `0` |
| `blocked_reasons` | `[]` |
| `target_table` | `air_purifier_retailer_links` |

### Per-row apply (all four)

| Slug | `updated` | Label |
|------|-----------|-------|
| `levoit-rf-rar040` | `true` | **PROVEN** |
| `levoit-rf-rar060` | `true` | **PROVEN** |
| `levoit-rf-c131` | `true` | **PROVEN** |
| `levoit-rf-cr200` | `true` | **PROVEN** |

**PROVEN:** Four approved `oem-catalog` link rows patched from plan `before_row` (search placeholder) to plan `after_row` (official Levoit PDP + `direct_buyable` + `browser_truth_*`).

**PROVEN:** No seed import or SQL insert was used. Filters and links pre-existed in Supabase (prior dry-run resolved `filter_id` + `link_id` for all four).

---

## 3. Post-apply parity dry-run (pasted output)

**Command (read-only verification):**

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json
```

| Field | Value |
|-------|-------|
| `mode` | `dry_run` |
| `data_mutation` | `false` |
| `apply_status` | **`ALREADY_APPLIED`** |
| `planned_change_count` | `4` |
| `applied_change_count` | `0` |
| `already_applied_count` | **`4`** |
| `blocked_reasons` | `[]` |

### Per-row post-apply (all four)

| Slug | `match_mode` | `would_update` | Label |
|------|--------------|----------------|-------|
| `levoit-rf-rar040` | `after_row` | `false` | **PROVEN** |
| `levoit-rf-rar060` | `after_row` | `false` | **PROVEN** |
| `levoit-rf-c131` | `after_row` | `false` | **PROVEN** |
| `levoit-rf-cr200` | `after_row` | `false` | **PROVEN** |

### Interpretation

1. **Post-apply dry-run reports `ALREADY_APPLIED`** — all four Supabase rows match plan `after_row` (**PROVEN**).

2. **No additional Supabase update needed** — `would_update: false` on all four, `applied_change_count: 0` (**PROVEN**).

3. **Parity `--apply` re-run is not required** at current state (**INFERRED** from `ALREADY_APPLIED` + zero blocked reasons).

4. **CSV ↔ Supabase alignment** — local CSV `after_row` and Supabase `after_row` are now reconciled for all four cohort slugs (**PROVEN** via parity contract).

---

## 4. Factory stage status (four-slug cohort)

| Stage | Status | Label |
|-------|--------|-------|
| Local CSV factory | Complete (`direct_buyable`, +4 safe CTA) | **PROVEN** |
| Executor CSV apply | `APPLIED` (11 → 15 safe CTA) | **PROVEN** |
| Supabase filter + approved link rows | Pre-existed (no insert) | **PROVEN** (pre-apply dry-run) |
| Supabase parity apply | `APPLIED` (4/4 updated) | **PROVEN** (operator apply output) |
| Supabase parity verification | `ALREADY_APPLIED` (4/4 `after_row`) | **PROVEN** (post-apply dry-run) |
| Seed import | Not used | **PROVEN** (out of scope) |
| SQL insert | Not used | **PROVEN** (out of scope) |
| Deploy / live public safe CTA | Not proven | **UNKNOWN** |

---

## 5. Explicit non-actions (this cohort path)

| Path | Status |
|------|--------|
| `npm run seed:import:air-purifier` | **Not used** — not required |
| Slug-scoped SQL insert | **Not used** — not required |
| `filter_aliases.csv` edits | **Not performed** |
| `compatibility_mappings.csv` edits | **Not performed** |
| Deploy / Netlify / public UI | **Not performed** |
| CSV re-apply | **Not performed** |
| Non-cohort slugs | **Not touched** |

---

## 6. Boundaries (this docs step)

- [ ] **No** further Supabase mutation authorized by this record
- [ ] **No** parity `--apply` re-run authorized (not needed per §3)
- [ ] **No** deploy / Netlify / public UI mutation
- [ ] **No** CSV edits
- [ ] **No** apply plan changes
- [ ] **No** `data/owner-decisions/` rows
- [ ] **No** other slug changes

---

## 7. PROVEN / INFERRED / UNKNOWN

| Claim | Label |
|-------|-------|
| Local CSV safe CTA 11 → 15 (+4) | **PROVEN** |
| Parity apply `APPLIED`, `applied_change_count: 4` | **PROVEN** |
| All four rows `updated: true` on apply | **PROVEN** |
| Post-apply dry-run `ALREADY_APPLIED` | **PROVEN** |
| All four `match_mode: after_row`, `would_update: false` | **PROVEN** |
| No seed import or SQL insert used | **PROVEN** |
| Parity `--apply` re-run not required | **INFERRED** |
| `supabase_parity_applied` factory stage documentable from this record | **INFERRED** |
| Live public page shows safe CTA for four slugs | **UNKNOWN** |
| Production deploy reflects Supabase + CSV state | **UNKNOWN** |
| Runtime buyer path reads updated Supabase rows (not stale cache) | **UNKNOWN** |

---

## 8. Exact next step (informational — not authorized here)

1. **Commit this docs record** to repo at `31cbaf0` or later.

2. **Separate owner authorization** if live public exposure is desired:
   - Production smoke for `/air-purifier/filter/levoit-rf-rar040` (and siblings rar060, c131, cr200)
   - Confirm runtime reads committed Supabase rows

3. **Do not run** unless separately authorized:
   - `apply-air-purifier-supabase-parity-v1.ts --apply` (noop at `ALREADY_APPLIED`)
   - `npm run seed:import:air-purifier`
   - Executor CSV re-apply

4. **Optional read-only verification** (no mutation):

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json
```

Expect: `apply_status: ALREADY_APPLIED`, `already_applied_count: 4`.

---

## 9. Related docs

- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-SUPABASE-PARITY-OWNER-REVIEW-v1.md`
- `docs/air-purifier/AP-CONSUMER-NAMING-BRIDGE-EXECUTOR-APPLY-OWNER-REVIEW-v1.md`
- `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json`
- `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-levoit-consumer-naming-bridge-cohort-v1-apply.json`
- `scripts/lib/air-purifier-supabase-apply-parity-v1.ts`
- `docs/air-purifier/AP-SUPABASE-SQL-COMMIT-RESULT-WINIX-FILTER-H-116130-v1.md` (pattern only)

---

## 10. Disclaimer

Supabase parity for the four-slug Levoit Consumer Naming Bridge cohort is **PROVEN** at the database layer. Local CSV factory completion and Supabase parity are reconciled. This does **not** prove live public buyer-path exposure, production deploy currency, or runtime cache freshness — those remain **UNKNOWN** until a separate production smoke authorization.
