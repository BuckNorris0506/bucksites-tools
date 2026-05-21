# BuckParts — LT120F evidence collection plan (read-only)

**Slug:** `lt120f`  
**OEM:** `LT120F`  
**Brand:** `lg`  
**Report type:** read-only evidence plan — no production mutation  
**Baseline:** `docs/BuckParts-FIRST-FRIDGE-EXPANSION-OWNER-REVIEW.md` (cohort hold); factory `new_product_candidate`; `mutation_ready=false`

**Evidence outcome (2026-05-18):** `data/evidence/lt120f-compatibility-evidence-readonly.2026-05-18.json` — LG official sources prove LT120F is a **refrigerator air filter**; `catalog_import_ready: false`; `recommended_outcome: block_for_now` for `data/filters.csv` water wedge.

---

## 1. LT120F current repo truth

### Where LT120F appears

| Location | Field values | Label |
|----------|--------------|-------|
| `src/lib/coverage/fridge-homekeep-bulk-catalog-v1.ts` | `FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1`: slug `lt120f`, oem `LT120F`, `expansion_source: bulk_sample_csv` | **PROVEN** |
| `data/bulk/filters.bulk.sample.csv` line 14 | `lg,lt120f,LT120F,LG LT120F refrigerator,6,` | **PROVEN** |
| `docs/BuckParts-FIRST-FRIDGE-EXPANSION-OWNER-REVIEW.md` | Cohort row; `needs_compatibility_evidence` | **PROVEN** |

### Where LT120F does not appear

| Asset | Label |
|-------|-------|
| `data/filters.csv` | **PROVEN** absent (57 live LG fridge slugs include `lt1000p`, `lt700p`, `lt800p`, `lt600p`, ADQ* — no `lt120f`) |
| `data/filter_aliases.csv` | **PROVEN** no row for slug `lt120f` or alias token `LT120F` |
| `data/compatibility_mappings.csv` | **PROVEN** zero `filter_slug=lt120f` rows (969 total mapping rows in file; none match) |
| `data/fridge_models.csv` | **PROVEN** no reference to `lt120f` or `LT120F` in file content |
| `data/retailer_links.csv` | **PROVEN** no row |
| `data/evidence/*.json` | **PROVEN** no filename or `filter_slug` field for `lt120f` / `LT120F` |
| `src/lib/owner-dashboard/batch-production-amazon-rescue-source-v1` cohort | **PROVEN** no `LT120F` / `lt120f` match in `src/lib/owner-dashboard/` |
| Supabase `public.filters` (via live CSV seed source) | **INFERRED** absent while absent from `data/filters.csv` — **UNKNOWN** live DB without query |

### Compatibility coverage

- **This slug:** **PROVEN** 0 `compatibility_mappings.csv` rows.
- **Sibling LG cartridge slugs (live):** **PROVEN** mappings exist for other slugs only, e.g. `lt1000p` / `lt700p` / `lt800p` appear in `data/compatibility_mappings.csv` (69 lines mention those tokens combined).
- **Model inventory:** **PROVEN** `data/fridge_models.csv` uses `brand_slug,slug,model_number` (e.g. `lg,lg-lfxs26973s,LFXS26973S`); compat joins via `fridge_slug` + `filter_slug`.
- **LT120F ↔ model fit:** **UNKNOWN** — no repo mapping.

### Alias coverage

- **PROVEN** `loadBuckpartsFridgeFilterIndexFromRepo` + `compactPartTokenKey('LT120F')` maps to **no** live slug OEM or alias.
- **PROVEN** live LG aliases include `LT1000P`, `LT700P`, `LT800P`, `LT600P`, `LT1000PC` — not `LT120F`.
- **Factory `alias_collision_candidate`:** **PROVEN** not applied to `lt120f` today (classifies as `new_product_candidate`).

### Retailer / evidence coverage

- **Retailer links:** **PROVEN** none.
- **Amazon rescue cohort / token controls:** **PROVEN** `LT120F` not referenced in `data/ops/amazon-rescue-token-controls.json` grep scope for this slug.
- **Evidence JSON:** **PROVEN** none.
- **Batch Amazon precheck** (`npm run buckparts:precheck:amazon-refrigerator-tokens`): **INFERRED** not applicable pre-import — script resolves tokens to **live** `public.filters` rows (`scripts/report-amazon-refrigerator-token-precheck.ts`); slug not in `data/filters.csv`.
- **Non-Amazon collector** (`scripts/collect-fridge-non-amazon-evidence.ts`): **INFERRED** not applicable pre-import — targets existing coverage slugs with links.

### Factory state (read-only proof)

```bash
npx tsx scripts/report-large-batch-coverage-factory.ts | jq '.top_candidates[] | select(.slug=="lt120f")'
```

**PROVEN** output shape:

| Field | Value |
|-------|-------|
| `factory_state` | `new_product_candidate` |
| `is_live_catalog_row` | `false` |
| `is_bulk_catalog_row` | `true` |
| `has_gated_buyable_link` | `false` |
| `has_amazon_live_evidence` | `false` |
| `sources` | `src/lib/coverage/fridge-homekeep-bulk-catalog-v1.ts` only |
| `rationale` | bulk catalog row not in `data/filters.csv` |

Command Center: **PROVEN** `mutation_ready: false`, `new_product_candidate: 6` (cohort includes `lt120f`).

---

## 2. Evidence needed before import

Minimum proof required before `lt120f` may enter an **approved** `data/filters.csv` / `seed:import` plan:

| Requirement | What “done” means | Current status |
|-------------|-------------------|----------------|
| **Part identity** | OEM marking on packaging/docs = `LT120F`; slug `lt120f` is intentional canonical URL key | **INFERRED** from bulk catalog + sample CSV; **UNKNOWN** packaging proof in repo |
| **Manufacturer / brand** | Brand = LG (`brand_slug: lg`) | **PROVEN** in bulk catalog + sample CSV |
| **Aliases** | List alternate markings (if any); add to `filter_aliases.csv` only if distinct tokens need mapping — **separate approved edit** | **PROVEN** none in repo; **UNKNOWN** physical aliases |
| **Model compatibility source** | Primary source URL or document ID (LG support / manual) listing models that use **LT120F** specifically | **UNKNOWN** |
| **Compatibility rows** | Each `fridge_slug` in `data/fridge_models.csv` that fits LT120F → planned `compatibility_mappings.csv` row — **human-verified**, not copied from `lt700p`/`lt800p`/`lt1000p` | **PROVEN** 0 rows |
| **Replacement category** | Refrigerator water filter; interval if used (sample CSV uses `6` months) | **INFERRED** from sample CSV column; **UNKNOWN** if 6 is correct for LT120F |
| **No collision proof** | Demonstrate `LT120F` ≠ `LT700P` / `LT800P` / `LT1000P` / ADQ* for target models (wrong-purchase gate) | **PROVEN** no CSV alias collision; **UNKNOWN** fit overlap |
| **Public page state** | No `/fridge/filter/lt120f` (or equivalent) until import approved | **PROVEN** not in live catalog |
| **Retailer evidence** | Only if monetization lane requested post-catalog | **PROVEN** not required for catalog-import plan; **UNKNOWN** Amazon/Waterdrop until owner scopes buy lane |

**Do not treat as proof:** sibling cartridge patterns, bulk sample row alone, or scraped third-party compatibility without manufacturer source citation.

---

## 3. Safe evidence collection plan

**Rules:** read-only in this phase; no `data/*` edits; no Supabase; no CTAs; scraped text is **lead** only until owner cites manufacturer source.

### Must-have proof

1. **Manufacturer compatibility source (owner browser)**
   - Open LG official filter compatibility for part **LT120F** (support site or manual PDF).
   - Capture: source URL, capture date, list of **model numbers** (not just marketing names).
   - **Blocker if missing:** cannot add `compatibility_mappings.csv` rows.

2. **Collision check vs live LG slugs (owner + repo)**
   - For each candidate model, confirm LG docs do **not** specify `LT700P`, `LT800P`, `LT1000P`, or ADQ* instead of LT120F.
   - Repo cross-check live mappings:
     ```bash
     grep -n 'lt120f' data/filters.csv data/filter_aliases.csv data/compatibility_mappings.csv
     npx tsx -e "
     import { loadBuckpartsFridgeFilterIndexFromRepo } from './src/lib/retailers/buckparts-fridge-filter-index-v1.ts';
     import { compactPartTokenKey } from './src/lib/retailers/waterdrop-linksynergy-parse-v1.ts';
     const i = loadBuckpartsFridgeFilterIndexFromRepo(process.cwd());
     const k = compactPartTokenKey('LT120F');
     console.log(i.filters.filter(f => compactPartTokenKey(f.oem_part_number)===k || f.aliases.some(a=>compactPartTokenKey(a)===k)).map(f=>f.slug));
     "
     ```
   - Expected: `[]`.

3. **Model slug mapping plan (read-only)**
   - Map each manufacturer model number → existing `data/fridge_models.csv` `slug` (e.g. `lg-lfxs26973s`) where possible.
   - **UNKNOWN** until owner supplies model list; new `fridge_models.csv` rows are a **separate** approved task.

4. **Re-verify factory hold (agent, read-only)**
   ```bash
   npx tsx scripts/report-large-batch-coverage-factory.ts | jq '.top_candidates[] | select(.slug=="lt120f")'
   npx tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.large_batch_coverage_factory_summary_v1 | {candidate_count,state_counts,mutation_ready}'
   ```

### Nice-to-have proof

- Photo of filter label showing `LT120F` (owner archive; not committed without separate evidence policy).
- LG replacement interval (months) from manual.
- List of alternate marketing strings for future `filter_aliases.csv` (approved edit later).
- After catalog import only: `npm run buckparts:precheck:amazon-refrigerator-tokens -- --tokens LT120F` for Amazon lane planning.

### Blockers (stop import planning)

| Blocker | Condition |
|---------|-----------|
| **No manufacturer compat source** | Cannot name primary LG document/URL |
| **Model overlap without distinction** | LG docs show LT120F models already covered by live `lt1000p` / `lt700p` / `lt800p` mappings |
| **Alias collision discovered** | `LT120F` token maps to multiple live slugs in `filter_aliases.csv` policy |
| **Wrong-purchase ambiguity** | Same fridge model listed as using two different filter OEMs without resolution |
| **Factory / CC mutation** | `mutation_ready` still `false` and owner has not approved import task |

### Existing batch scripts (scope note)

| Script | LT120F applicability |
|--------|----------------------|
| `npx tsx scripts/report-batch-evidence-collection-plan.ts --source amazon-rescue-default` | **PROVEN** not for LT120F — amazon-rescue default cohort only |
| `npx tsx scripts/report-batch-agent-evidence-capture-packet.ts` | **INFERRED** same — tied to batch production review sources |
| `scripts/collect-fridge-non-amazon-evidence.ts` | **INFERRED** post-import only (live slug + links) |

---

## 4. Candidate outcome states

| State | When it applies to LT120F |
|-------|----------------------------|
| `needs_more_compatibility_evidence` | Partial LG per-model specs captured (4 models); full Filter Finder list still **UNKNOWN** |
| `block_for_now` | **Current for fridge water import** — LG proves air-filter category; wrong wedge vs `data/filters.csv` |
| `alias_collision_hold` | `LT120F` maps to multiple slugs or duplicates live OEM in `filter_aliases.csv` |
| `block_for_now` | LG docs show LT120F is obsolete alias of an existing live slug; or owner defers |
| `ready_for_catalog_import_plan` | Manufacturer compat captured; model list mapped to `fridge_models.csv` slugs; collision checks passed; owner approves separate import task (still **not** auto-import) |

**Not a outcome:** `publishable_amazon_candidate` / buy CTA — requires live catalog + evidence lane; out of scope until import plan approved.

---

## 5. Recommended next action

**Owner (browser):**

1. Find LG official compatibility for part **LT120F** and export a model-number list with source URL and date.
2. For **three** sample models from that list, confirm on LG docs which cartridge OEM is required (prove not LT700P/LT800P/LT1000P).
3. Record findings in founder notes (outside repo) or approved decision artifact — **not** hand-edited production JSON in this task.

**Agent (read-only):**

1. Run factory + Command Center jq commands (section 1) after any repo pull; confirm `lt120f` still `new_product_candidate` and `mutation_ready: false`.
2. When owner supplies model numbers, map each to `data/fridge_models.csv` `slug` via read-only lookup:
   ```bash
   grep -i 'MODELNUMBER' data/fridge_models.csv
   ```
   (replace `MODELNUMBER` with each LG model from owner list).
3. Produce a **compat row draft table** (markdown or stdout) as `fridge_slug,filter_slug` candidates for owner approval — **do not write** `data/compatibility_mappings.csv` in this lane.
4. Open separate approved task for: `filters.csv` row + compat rows + optional retailer/evidence — only when state = `ready_for_catalog_import_plan`.

**Do not:** run `seed:import`, edit `data/filters.csv`, add `retailer_links`, or create Amazon evidence JSON without explicit owner approval.

---

## Non-mutation statement

**PROVEN:** This plan does not import products, add CTAs, change public pages, or mutate Supabase.

---

## References

- `docs/BuckParts-FIRST-FRIDGE-EXPANSION-OWNER-REVIEW.md`
- `docs/BuckParts-LARGE-BATCH-COVERAGE-FACTORY-V1.md`
- `docs/BuckParts-BATCH-PRODUCTION-LANE-V1.md`
- `src/lib/coverage/fridge-homekeep-bulk-catalog-v1.ts`
- `scripts/report-large-batch-coverage-factory.ts`
- `scripts/report-buckparts-command-center.ts`
