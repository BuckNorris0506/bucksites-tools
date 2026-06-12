# AP Supabase SQL owner review — Winix Filter H `116130` v1

## `winix-filter-h-116130`

**Report type:** read-only owner decision support — **one-slug Supabase SQL dry-run only**  
**Generated:** 2026-06-10  
**Repo checkpoint:** `d58afca`  
**Deploy note:** Deploy for `d58afca` was **cancelled** — treat **committed repo CSV/artifacts** as truth, **not** live deployed/public UI truth.  
**Scope:** **one** filter slug only — `winix-filter-h-116130` — **not** `winix-filter-s-1712-0096-00`, **not** `winix-carbon-116131` demotion/repair  
**SQL plan:** `docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql`

**Prior stages (local CSV — PROVEN complete):**

Catalog → Discovery → Evidence → Aggregator → Apply Plan → Executor Apply → `retailer_links.csv` `direct_buyable`

**Supabase gap (PROVEN):** Parity dry-run `BLOCKED` — `air_purifier_filters.slug not found`

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner authorization for **SQL dry-run** (`BEGIN` … `ROLLBACK`) | Authorization for `COMMIT` (separate future decision) |
| One-slug insert plan for net-new AP identity in Supabase | Full `npm run seed:import:air-purifier` |
| Copy of committed CSV `browser_truth_*` into SQL insert | Parity `--apply`, deploy, or public UI mutation |
| Docs-only until owner records Option A in chat | `data/owner-decisions/` row creation |

**PROVEN:** SQL file defaults to `ROLLBACK` — no durable Supabase mutation when executed as written.

**PROVEN:** `COMMIT` line is commented and **NOT AUTHORIZED** by this packet.

---

## Owner decision box

Choose **exactly one** and record in chat.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE SQL DRY-RUN TRANSACTION ONLY                            │
│                                                                             │
│  I authorize executing the SQL plan in dry-run mode only:                   │
│    docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql         │
│  The script must end with ROLLBACK (default).                               │
│                                                                             │
│  I do NOT authorize: COMMIT, seed import, parity --apply, deploy,           │
│  CSV changes, other slugs, or winix-carbon-116131 demotion.                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — DO NOT APPROVE                                                  │
│                                                                             │
│  I do not approve Supabase SQL dry-run or insert for                        │
│  winix-filter-h-116130 at this time.                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Future option only (not in this packet):**

```
COMMIT — after separate owner review of dry-run SELECT/RETURNING output
```

---

## 1. Current repo proof (PROVEN at `d58afca`)

### `data/air-purifier/filters.csv`

```csv
winix,winix-filter-h-116130,WINIX-116130,Winix Filter H (116130),12,Official Winix Filter H replacement set SKU 116130; net-new identity — do not alias to winix-carbon-116131
```

### `data/air-purifier/retailer_links.csv` (primary `oem-catalog`)

| Field | Value |
|-------|-------|
| `destination_url` / `affiliate_url` | `https://www.winixamerica.com/product/filter-h-116130/` |
| `browser_truth_classification` | `direct_buyable` |
| `browser_truth_checked_at` | `2026-06-12T18:47:54.123Z` |
| `browser_truth_notes` | Live re-proof 2026-06-10 evidence string (full text in SQL plan) |

### `data/air-purifier/filter_aliases.csv`

```csv
winix-filter-h-116130,116130
```

### `data/air-purifier/compatibility_mappings.csv`

```csv
winix-5500-2,winix-filter-h-116130,true
```

**PROVEN:** `winix-5500-2,winix-carbon-116131,true` row remains in CSV (baseline — not demoted).

### Executor apply-run (CSV `direct_buyable`)

**Path:** `data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-winix-filter-h-116130-v1-apply.json`

| Field | Value |
|-------|-------|
| `apply_status` | `APPLIED` |
| `changed_slugs` | `["winix-filter-h-116130"]` |
| `post_apply_validation.gate_by_slug.winix-filter-h-116130` | `LIVE_DIRECT_BUYABLE` |
| `ap_safe_cta_count_after` | `11` |

### Parity blocker (live dry-run — PROVEN prior)

```json
{
  "apply_status": "BLOCKED",
  "blocked_reasons": ["winix-filter-h-116130: air_purifier_filters.slug not found"]
}
```

**Command:** `npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json`

---

## 2. Required SQL preflight SELECTs (in plan §1)

| Check | SQL section | Expected |
|-------|-------------|----------|
| Brand `winix` exists | 1a | 1 row |
| Model `winix-5500-2` exists | 1b | 1 row |
| Filter `winix-filter-h-116130` absent | 1c | 0 rows |
| No `oem_part_number = WINIX-116130` collision | 1d | 0 rows |
| `winix-carbon-116131` filter + compat + links baseline | 1e | Snapshot rows (unchanged target) |
| No approved `oem-catalog` link for new slug yet | 1f | 0 rows |

**Hard stop:** If 1a/1b return 0 rows, or 1c/1d return rows, **do not proceed** to §2 INSERTs.

---

## 3. SQL insert plan (§2 — guarded, default `ROLLBACK`)

**File:** `docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql`

| Step | Table | Action |
|------|-------|--------|
| 2a | `air_purifier_filters` | Insert net-new filter (guarded `NOT EXISTS` on slug + oem) |
| 2b | `air_purifier_filter_aliases` | Insert alias `116130` |
| 2c | `air_purifier_compatibility_mappings` | Insert `winix-5500-2` → filter, `is_recommended=true` |
| 2d | `air_purifier_retailer_links` | Insert primary `oem-catalog` PDP + full `browser_truth_*` from CSV |

**§3 post-insert verification** re-selects new rows and re-checks `winix-carbon-116131` baseline.

**Default ending:** `ROLLBACK;` — **COMMIT NOT AUTHORIZED**

---

## 4. Why SQL instead of full seed (summary)

| Path | Issue | Label |
|------|-------|-------|
| `npm run seed:import:air-purifier` | Full AP blast radius | **PROVEN** |
| Same | No dry-run | **PROVEN** |
| Same | Omits `browser_truth_*` on retailer links | **PROVEN** |
| Parity `--apply` | Update-only; filter missing | **PROVEN** |
| One-slug SQL plan | Scoped inserts + `ROLLBACK` default + truth fields | **INFERRED** smallest safe move |

---

## 5. Hard boundaries

- [ ] No `COMMIT` from this packet alone
- [ ] No `npm run seed:import:air-purifier`
- [ ] No `apply-air-purifier-supabase-parity-v1.ts --apply` (re-evaluate after insert)
- [ ] No deploy / Netlify / public UI mutation
- [ ] No CSV edits
- [ ] No other slug inserts/updates
- [ ] No `winix-carbon-116131` compat demotion or row deletion
- [ ] No `data/owner-decisions/` rows unless separately requested
- [ ] No live coverage claim (deploy cancelled at `d58afca`)

---

## 6. Exact next action — dry-run only

### Safest first action (read-only repo — no Supabase)

```bash
grep 'winix-filter-h-116130' \
  data/air-purifier/filters.csv \
  data/air-purifier/retailer_links.csv \
  data/air-purifier/filter_aliases.csv \
  data/air-purifier/compatibility_mappings.csv
```

### Dry-run SQL (after owner Option A in chat)

**Supabase SQL Editor or `psql`:** Open and execute the **entire** file:

`docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql`

**PROVEN behavior:** File ends with `ROLLBACK;` — inserts are visible in-session via `RETURNING` / §3 SELECTs, then undone.

**NOT AUTHORIZED:**

```sql
COMMIT;
```

### Optional post-rollback parity check (read-only — still blocked until real COMMIT)

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json
```

**Expected after ROLLBACK:** Still `BLOCKED` — filter slug not found (**PROVEN**).

**INFERRED after future authorized COMMIT:** Parity may report `ALREADY_APPLIED` if DB matches plan `after_row` including `browser_truth_*`.

---

## 7. PROVEN / INFERRED / UNKNOWN summary

| Claim | Label |
|-------|-------|
| Four CSV rows committed for `116130` | **PROVEN** |
| CSV executor apply `APPLIED` / `LIVE_DIRECT_BUYABLE` | **PROVEN** |
| Parity blocked — filter slug missing in Supabase | **PROVEN** |
| SQL plan defaults to `ROLLBACK` | **PROVEN** |
| SQL includes `browser_truth_*` from CSV | **PROVEN** |
| Full seed unsafe for this step | **PROVEN** |
| `winix` brand + `winix-5500-2` model exist in Supabase | **INFERRED** |
| Dry-run INSERT RETURNING shows expected shape | **UNKNOWN** until executed |
| Post-COMMIT live public safe CTA | **UNKNOWN** (deploy cancelled) |
| Parity status after COMMIT | **INFERRED** likely `ALREADY_APPLIED` if snapshots match |

---

## 8. Related docs

- `docs/air-purifier/AP-SEED-IMPORT-READINESS-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`
- `docs/air-purifier/AP-SUPABASE-PARITY-READINESS-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`
- `docs/air-purifier/AP-EXECUTOR-DRY-RUN-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`
- `docs/air-purifier/winix-filter-h-116130-supabase-insert-plan.sql`

---

## 9. Disclaimer

This packet authorizes **SQL dry-run inspection only**. Executing the plan as written performs transient inserts then `ROLLBACK`. It does **not** authorize `COMMIT`, deploy, seed import, parity apply, or live public coverage claims. Deploy for `d58afca` was cancelled — repo CSV truth does not imply production runtime truth.
