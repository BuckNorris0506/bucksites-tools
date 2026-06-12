# AP seed-import readiness owner review — Winix Filter H `116130` v1

## `winix-filter-h-116130`

**Report type:** read-only owner decision support — **seed/import readiness only**  
**Generated:** 2026-06-10  
**Repo checkpoint:** `bfffd54`  
**Scope:** **one** filter slug only — `winix-filter-h-116130` — **not** `winix-filter-s-1712-0096-00`, **not** `winix-carbon-116131` demotion/repair  
**Truth source:** committed CSV, `vertical-seed` / `import-air-purifier-seed` scripts, prior parity dry-run (not HQ handoff)

**Prior stages (local CSV — PROVEN complete):**

Catalog → Discovery → Validation → Evidence → Aggregator → Apply Plan → Executor Apply → `retailer_links.csv` `direct_buyable`

**Current Supabase gap (PROVEN):**

Parity dry-run `BLOCKED` — `winix-filter-h-116130: air_purifier_filters.slug not found`

---

## What this packet is — and is not

| This packet **is** | This packet **is not** |
|--------------------|------------------------|
| Owner readiness review for **AP vertical seed import** path | Authorization to run `npm run seed:import:air-purifier` (unless owner records Option A) |
| Analysis of whether seed can insert net-new `116130` identity | Authorization for parity `--apply`, deploy, or public UI mutation |
| Scope lock intent on **one slug** (with script-scope caveats in §4) | CSV mutation or `data/owner-decisions/` row creation |
| Docs-only until owner records decision in chat | A claim that seed alone completes Supabase `direct_buyable` parity |

**PROVEN:** This packet alone performs no Supabase writes, no seed execution, no deploy, no CSV edits.

---

## Owner decision box

Choose **exactly one** and record in chat.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION A — APPROVE SEED/IMPORT READINESS INSPECTION ONLY                   │
│                                                                             │
│  I authorize read-only seed/import readiness inspection for                 │
│  winix-filter-h-116130 per §8 (grep CSV, script review, parity dry-run).    │
│                                                                             │
│  I do NOT authorize running npm run seed:import:air-purifier,               │
│  parity --apply, deploy, CSV changes, or changes to other slugs.           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTION B — DO NOT APPROVE                                                  │
│                                                                             │
│  I do not approve seed/import readiness or mutation for                     │
│  winix-filter-h-116130 at this time.                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**NOT TO RUN YET** (requires separate owner authorization after readiness review):

```bash
npm run seed:import:air-purifier
```

---

## 1. Current local CSV rows (PROVEN at `bfffd54`)

### `data/air-purifier/filters.csv`

```csv
winix,winix-filter-h-116130,WINIX-116130,Winix Filter H (116130),12,Official Winix Filter H replacement set SKU 116130; net-new identity — do not alias to winix-carbon-116131
```

| Field | Value |
|-------|-------|
| `brand_slug` | `winix` |
| `slug` | `winix-filter-h-116130` |
| `oem_part_number` | `WINIX-116130` |
| `name` | `Winix Filter H (116130)` |
| `replacement_interval_months` | `12` |

**PROVEN:** `oem_part_number` differs from `winix-carbon-116131` (`WINIX-116131`) — no `oem_part_number` unique collision between these two slugs.

### `data/air-purifier/retailer_links.csv` (primary `oem-catalog`)

| Field | Value |
|-------|-------|
| `filter_slug` | `winix-filter-h-116130` |
| `destination_url` | `https://www.winixamerica.com/product/filter-h-116130/` |
| `affiliate_url` | `https://www.winixamerica.com/product/filter-h-116130/` |
| `is_primary` | `true` |
| `retailer_key` | `oem-catalog` |
| `browser_truth_classification` | `direct_buyable` |
| `browser_truth_notes` | Populated (live re-proof 2026-06-10) |
| `browser_truth_checked_at` | `2026-06-12T18:47:54.123Z` |

### `data/air-purifier/filter_aliases.csv`

```csv
winix-filter-h-116130,116130
```

### `data/air-purifier/compatibility_mappings.csv`

```csv
winix-5500-2,winix-filter-h-116130,true
```

**PROVEN:** `winix-5500-2 → winix-carbon-116131` row remains present (not demoted by this packet).

---

## 2. Seed/import scripts in repo

| Item | Value | Label |
|------|-------|-------|
| Package script | `npm run seed:import:air-purifier` | **PROVEN** (`package.json`) |
| Sample variant | `npm run seed:import:air-purifier:sample` (`--sample`) | **PROVEN** |
| Underlying script | `scripts/import-air-purifier-seed.ts` | **PROVEN** |
| Core library | `scripts/lib/vertical-seed.ts` → `runVerticalSeed(air_purifier)` | **PROVEN** |
| Retailer link bulk helper | `scripts/lib/bulk-retailer-links-import.ts` | **PROVEN** |
| Dry-run support | **None** — script always writes to Supabase when run | **PROVEN** |
| Single-slug scope | **None** — imports **entire** `data/air-purifier/*.csv` | **PROVEN** |

### Import order (single run)

1. `brands` (upsert `slug`)
2. `air_purifier_filters` (upsert `oem_part_number`)
3. `air_purifier_models` (upsert `model_number`)
4. `air_purifier_model_aliases` (upsert)
5. `air_purifier_filter_aliases` (upsert `air_purifier_filter_id,alias`)
6. `air_purifier_compatibility_mappings` (upsert model+filter PK)
7. `air_purifier_retailer_links` (insert or update by `filter_id` + `affiliate_url` match)

### Upsert / overwrite behavior

| Table | Mechanism | Overwrites existing? |
|-------|-----------|----------------------|
| `air_purifier_filters` | `upsert` on `oem_part_number`, `ignoreDuplicates: false` | **PROVEN** yes — updates row with same `oem_part_number` |
| `air_purifier_filter_aliases` | `upsert` on `(air_purifier_filter_id, alias)` | **PROVEN** yes |
| `air_purifier_compatibility_mappings` | `upsert` on `(model_id, filter_id)` | **PROVEN** yes |
| `air_purifier_retailer_links` | Match `(filter_id, affiliate_url)` → update by `id`, else insert | **PROVEN** yes for matched pairs; new URL → insert |

**PROVEN:** Seed `importRetailerLinks` does **not** read or write `browser_truth_classification`, `browser_truth_notes`, or `browser_truth_checked_at` from CSV (`vertical-seed.ts` `insertRow` / `updateRow` fields).

**PROVEN:** Parity script note: *"Do not use npm run seed:import:air-purifier for this parity apply"* — seed and parity are separate paths (`air-purifier-supabase-apply-parity-v1.ts`).

---

## 3. Expected Supabase rows after seed (for `winix-filter-h-116130`)

**INFERRED** from CSV + script mapping (not executed):

### `air_purifier_filters`

| Column | Expected value |
|--------|----------------|
| `slug` | `winix-filter-h-116130` (unique) |
| `oem_part_number` | `WINIX-116130` (unique) |
| `name` | `Winix Filter H (116130)` |
| `replacement_interval_months` | `12` |
| `notes` | Catalog notes string |
| `brand_id` | Resolved from `brands.slug = winix` |

### `air_purifier_retailer_links` (primary `oem-catalog`)

| Column | Expected from seed |
|--------|-------------------|
| `air_purifier_filter_id` | FK to filter row above |
| `affiliate_url` | `https://www.winixamerica.com/product/filter-h-116130/` |
| `destination_url` | Same PDP URL |
| `retailer_key` | `oem-catalog` |
| `retailer_slug` | `oem-catalog` |
| `is_primary` | `true` |
| `status` | `approved` |
| `source` | `manual` |
| `browser_truth_*` | **INFERRED null** — seed does not import these columns |

### `air_purifier_filter_aliases`

| Column | Expected |
|--------|----------|
| `air_purifier_filter_id` | FK to filter |
| `alias` | `116130` |

### `air_purifier_compatibility_mappings`

| Column | Expected |
|--------|----------|
| `air_purifier_model_id` | FK to `air_purifier_models.slug = winix-5500-2` |
| `air_purifier_filter_id` | FK to filter |
| `is_recommended` | `true` |

**INFERRED post-seed parity:** Slug-scoped apply plan `before_row` is still **search placeholder** while seed would write **PDP URLs**. Parity may remain **BLOCKED** (DB matches neither plan `before_row` nor full `after_row` snapshot) until a separate parity/apply strategy is resolved.

---

## 4. Risk table

| Risk | Assessment | Label |
|------|------------|-------|
| Seed may affect all AP CSV rows | **Yes** — full vertical import, not slug-scoped | **PROVEN** |
| Seed may overwrite existing Supabase rows | **Yes** — upsert/update semantics on filters, aliases, compat, links | **PROVEN** |
| Safe to run for one slug only | **No** — no `--slug` flag; entire `data/air-purifier/` processed | **PROVEN** |
| Rollback built into seed script | **No** automated rollback artifact | **PROVEN** |
| `winix-carbon-116131` mappings altered | Seed upserts **all** compat rows from CSV; `winix-5500-2 → winix-carbon-116131` row unchanged in CSV | **INFERRED** no demotion if CSV unchanged |
| `browser_truth` synced to Supabase by seed | **No** — parity or manual update needed | **PROVEN** |
| `oem_part_number` collision with `winix-carbon-116131` | **No** — `WINIX-116130` vs `WINIX-116131` | **PROVEN** |
| Duplicate approved link slot `(filter_id, retailer_key)` | Possible if old approved row exists with different URL | **UNKNOWN** until live DB inspected |
| Seed alone completes safe CTA on live site | **No** — deploy/runtime not included | **PROVEN** |

---

## 5. Preconditions before any seed mutation

| # | Precondition | Status |
|---|--------------|--------|
| 1 | Local CSV factory complete for slug | **PROVEN** |
| 2 | `SUPABASE_URL` + service role in `.env.local` | **PROVEN** (prior parity dry-run connected) |
| 3 | Owner authorization for **full** AP seed scope | **PROVEN pending** |
| 4 | Owner accepts whole-vertical upsert blast radius | **PROVEN pending** |
| 5 | Post-seed parity strategy for `browser_truth` + plan `before_row` drift | **INFERRED gap** — needs separate decision |
| 6 | No deploy bundled with seed | **PROVEN** — out of scope |

---

## 6. Hard boundaries

- [ ] No `npm run seed:import:air-purifier` from this packet alone
- [ ] No parity `--apply`
- [ ] No deploy / Netlify API mutation
- [ ] No public UI code mutation
- [ ] No CSV mutation
- [ ] No `data/owner-decisions/` rows unless separately requested
- [ ] No intentional `winix-carbon-116131` compat demotion (CSV must remain unchanged)
- [ ] No `winix-filter-s-1712-0096-00`

**Scope caveat:** If owner later approves seed, script processes **all** AP CSV rows unless codebase gains slug-scoped import (**PROVEN** not available today).

---

## 7. Validation commands (read-only)

### Safest first — inspect local CSV rows (no Supabase)

```bash
grep 'winix-filter-h-116130' \
  data/air-purifier/filters.csv \
  data/air-purifier/retailer_links.csv \
  data/air-purifier/filter_aliases.csv \
  data/air-purifier/compatibility_mappings.csv
```

### Confirm seed script has no dry-run / no slug flag

```bash
rg -n 'dry_run|--slug|argv' scripts/import-air-purifier-seed.ts scripts/lib/vertical-seed.ts
```

### Confirm parity still blocked pre-seed (read-only Supabase)

```bash
npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts \
  --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json
```

**Expected at `bfffd54`:** `BLOCKED` — `air_purifier_filters.slug not found`

### Confirm retailer_links seed omits browser_truth

```bash
rg -n 'browser_truth' scripts/lib/vertical-seed.ts
```

**Expected:** no matches (**PROVEN**)

---

## 8. PROVEN / INFERRED / UNKNOWN summary

| Claim | Label |
|-------|-------|
| Local CSV rows for `116130` committed across four files | **PROVEN** |
| `retailer_links.csv` is `direct_buyable` PDP | **PROVEN** |
| Parity blocked — filter slug missing in Supabase | **PROVEN** |
| `npm run seed:import:air-purifier` exists | **PROVEN** |
| Seed has no dry-run | **PROVEN** |
| Seed cannot scope to one slug | **PROVEN** |
| Seed upserts filters, aliases, compat, retailer_links | **PROVEN** |
| Seed does not import `browser_truth_*` | **PROVEN** |
| Full vertical import affects all AP CSV rows | **PROVEN** |
| No automated seed rollback | **PROVEN** |
| `oem_part_number` unique safe vs `winix-carbon-116131` | **PROVEN** |
| Post-seed parity may still block on plan/URL/browser_truth drift | **INFERRED** |
| Whether live DB has orphan rows for this slug under other keys | **UNKNOWN** |
| Whether seed insert succeeds without manual SQL | **UNKNOWN** until run |
| Live public safe CTA after seed | **UNKNOWN** |

---

## 9. Related docs

- `docs/air-purifier/AP-SUPABASE-PARITY-READINESS-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`
- `docs/air-purifier/AP-EXECUTOR-DRY-RUN-OWNER-REVIEW-WINIX-FILTER-H-116130-v1.md`
- `scripts/import-air-purifier-seed.ts`
- `scripts/lib/vertical-seed.ts`

---

## 10. Disclaimer

Seed import is a **whole-vertical** Supabase mutation with **no dry-run** and **no slug scope**. It can insert/upsert `winix-filter-h-116130` and related rows, but does **not** copy `browser_truth_*` from CSV. Parity update remains a **separate** step with its own owner authorization. This packet does not authorize seed execution, deploy, or live coverage claims.
