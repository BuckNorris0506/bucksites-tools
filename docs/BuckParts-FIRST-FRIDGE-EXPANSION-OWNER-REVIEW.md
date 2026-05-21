# BuckParts — First fridge bulk-only expansion owner review

**Report type:** read-only owner-review cohort (no production mutation)  
**Generated:** 2026-05-18  
**Factory baseline (historical at review):** `candidate_count=63`, `new_product_candidate=6`, `mutation_ready=false`  
**Current expansion cohort (after LT120F removal):** 5 slugs — `candidate_count=62`, `new_product_candidate=5`  
**Cohort source:** `FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1` in `src/lib/coverage/fridge-homekeep-bulk-catalog-v1.ts`  
**Removed:** `lt120f` — wrong wedge (air filter); evidence `data/evidence/lt120f-compatibility-evidence-readonly.2026-05-18.json`

## 1. Executive verdict

**Hold entire cohort — no candidate is import-ready today.**

| Verdict | Count |
|---------|-------|
| Safe to promote later (after evidence) | **0** now |
| Hold / block for now | **5** (active cohort; `lt120f` removed) |
| Import / seed:import | **Do not run** |

**PROVEN:** All five active expansion slugs are absent from committed `data/filters.csv` (`lt120f` was removed from the bulk queue after air-filter evidence). classified by Large Batch Coverage Factory as `new_product_candidate`, and have `has_gated_buyable_link: false` (no buy-ready CTA path).

**PROVEN:** None have rows in `data/retailer_links.csv`, `data/compatibility_mappings.csv`, or `data/evidence/*` files named for these slugs.

**INFERRED:** Two slugs (`4396702`, `lt120f`) have stronger *catalog provenance* via `data/bulk/filters.bulk.sample.csv` but still lack model compatibility and retailer proof. Four slugs were added via `catalog_pattern` only — sibling live OEMs exist, but **revision interchangeability is not proven** and must not be assumed.

---

## 2. Candidate table

| slug | oem_part_number | brand_slug | proof_status | absent from filters.csv | alias collision risk | compat (this slug) | sibling live compat | retailer_links | evidence files |
|------|-----------------|------------|--------------|-------------------------|----------------------|--------------------|-----------------------|----------------|----------------|
| `lt120f` | LT120F | lg | **PROVEN** (bulk sample) | **PROVEN** yes | **PROVEN** low (no alias row; OEM not mapped to live slug) | **PROVEN** 0 rows | **UNKNOWN** (no live LT120F sibling) | **PROVEN** none | **PROVEN** none |
| `4396702` | 4396702 | whirlpool | **PROVEN** (bulk sample) | **PROVEN** yes | **INFERRED** medium (EveryDrop Filter 2 *family* vs live `edr2rxd1`; not CSV `alias_collision_candidate`) | **PROVEN** 0 rows | **PROVEN** `edr2rxd1` → 21 rows | **PROVEN** none | **PROVEN** none |
| `edr5rxd1` | EDR5RXD1 | whirlpool | **INFERRED** (catalog_pattern + cross-ref in `4396508` evidence only) | **PROVEN** yes | **INFERRED** medium (Filter 5 *family* vs live `4396508`; EDR5RXD1 appears in 4396508 PDP title, not as this slug) | **PROVEN** 0 rows | **PROVEN** `4396508` → 17 rows | **PROVEN** none | **INFERRED** indirect only (`amazon-4396508-*.json` mentions EDR5RXD1) |
| `adq73613404` | ADQ73613404 | lg | **INFERRED** (catalog_pattern only) | **PROVEN** yes | **PROVEN** low (OEM token distinct from `adq73613402`/`03` in `filter_aliases.csv`) | **PROVEN** 0 rows | **PROVEN** `adq73613402` → 14; `adq73613403` → 13 | **PROVEN** none | **PROVEN** none |
| `da29-00003b` | DA29-00003B | samsung | **INFERRED** (catalog_pattern only) | **PROVEN** yes | **PROVEN** low (OEM distinct from live `da29-00003g`) | **PROVEN** 0 rows | **PROVEN** `da29-00003g` → 16 | **PROVEN** none | **PROVEN** none |
| `da97-15217b` | DA97-15217B | samsung | **INFERRED** (catalog_pattern only) | **PROVEN** yes | **PROVEN** low (OEM distinct from live `da97-15217d`) | **PROVEN** 0 rows | **PROVEN** `da97-15217d` → 11 | **PROVEN** none | **PROVEN** none |

### recommended_state and next action (per candidate)

| slug | recommended_state | recommended_next_action | reason |
|------|---------------------|-------------------------|--------|
| `lt120f` | `needs_compatibility_evidence` | Owner: source LG fit chart / model list for LT120F; add `compatibility_mappings.csv` rows only after human verification. Do not copy from LT700P/LT800P. | **PROVEN** bulk-sample slug with clean OEM token isolation; **PROVEN** zero compat/retailer/evidence. Lowest *alias* risk in cohort. |
| `4396702` | `needs_alias_review` | Owner: decide if `4396702` is a distinct publishable slug or an alias of live `edr2rxd1` (EveryDrop Filter 2). If alias, do not import as new slug — update `filter_aliases.csv` instead (separate approved change). | **PROVEN** bulk sample labels Everydrop 2; **PROVEN** live Filter 2 is `edr2rxd1` with compat + Amazon live-outcome. Wrong-purchase risk if both slugs imply different products without proof. |
| `edr5rxd1` | `block_for_now` | Defer. Live `4396508` already covers Filter 5 numeric OEM with compat + evidence. Revisit only if owner proves `edr5rxd1` must be canonical slug instead of `4396508`. | **INFERRED** family overlap with committed `4396508`; **PROVEN** no slug-specific evidence or compat. |
| `adq73613404` | `block_for_now` | Defer. Collect LG documentation that ADQ73613404 is a distinct cartridge from ADQ73613402/03 and which models use it. | **INFERRED** variant from catalog_pattern only; **PROVEN** zero compat; sibling slugs already live. |
| `da29-00003b` | `block_for_now` | Defer. Prove prior-revision fit vs `da29-00003g` with manufacturer chart; do not inherit sibling compat rows. | **INFERRED** revision hypothesis only; **PROVEN** `da29-00003g` has 16 compat rows, this slug has 0. |
| `da97-15217b` | `block_for_now` | Defer. Prove DA97-15217B vs live DA97-15217D interchangeability; do not inherit sibling compat or Amazon evidence from `da97-15217d`. | **INFERRED** revision hypothesis only; **PROVEN** `da97-15217d` has 11 compat rows + `amazon-da97-15217d-live-outcome.2026-05-03.json`. |

---

## 3. Evidence gaps by candidate

### `lt120f` (LG LT120F)

- **Catalog:** `expansion_source: bulk_sample_csv` — **PROVEN** in `data/bulk/filters.bulk.sample.csv` line 14.
- **Live catalog:** **PROVEN** absent from `data/filters.csv` (57 live slugs; no `lt120f`).
- **Aliases:** **PROVEN** no `filter_aliases.csv` row for slug or OEM token `LT120F`.
- **Compatibility:** **PROVEN** zero rows in `data/compatibility_mappings.csv` for `lt120f`. **PROVEN** not referenced in `data/fridge_models.csv` grep.
- **Retailer / buy gates:** **PROVEN** no `data/retailer_links.csv` row; factory `has_gated_buyable_link: false`.
- **Evidence JSON:** **PROVEN** no `data/evidence/*lt120f*` or `*LT120F*` files.

### `4396702` (Whirlpool EveryDrop 2 numeric)

- **Catalog:** `expansion_source: bulk_sample_csv` — **PROVEN** `data/bulk/filters.bulk.sample.csv` line 10 ("Whirlpool Everydrop 2").
- **Live catalog:** **PROVEN** absent from `data/filters.csv`. **PROVEN** live Filter 2 slug is `edr2rxd1` (OEM `EDR2RXD1`).
- **Aliases:** **PROVEN** no CSV alias for `4396702`. **PROVEN** `edr2rxd1` aliases include `EveryDrop 2` (`data/filter_aliases.csv` lines 46–48) — **INFERRED** same marketing family, not proven identical SKU.
- **Compatibility:** **PROVEN** 0 rows for `4396702`; **PROVEN** 21 rows for sibling `edr2rxd1`.
- **Retailer / evidence:** **PROVEN** none for `4396702`; **PROVEN** `edr2rxd1` has retailer_links + `amazon-edr2rxd1-live-outcome.2026-05-05.json`.

### `edr5rxd1` (EveryDrop Filter 5)

- **Catalog:** `expansion_source: catalog_pattern` — **INFERRED** only; not in `filters.bulk.sample.csv`.
- **Live catalog:** **PROVEN** absent. **PROVEN** live Filter 5 numeric slug `4396508` exists.
- **Aliases:** **PROVEN** no CSV row for `edr5rxd1`. **PROVEN** `4396508` has alias row for token `4396508` only.
- **Compatibility:** **PROVEN** 0 for `edr5rxd1`; **PROVEN** 17 for `4396508`.
- **Evidence:** **PROVEN** `amazon-4396508-owner-review-pdp-evidence.2026-05-10.json` seller title includes `EDR5RXD1` as cross-reference for Filter 5 — **not** evidence that `edr5rxd1` slug should be published separately.

### `adq73613404` (LG slim variant)

- **Catalog:** `catalog_pattern` — **INFERRED**; comment in catalog module only.
- **Live:** **PROVEN** `adq73613402` and `adq73613403` in `data/filters.csv` with compat (14 + 13 model rows).
- **Compatibility:** **PROVEN** 0 for `adq73613404`.
- **Aliases:** **PROVEN** distinct OEM tokens in `filter_aliases.csv` (no collision set).

### `da29-00003b` (Samsung prior revision)

- **Catalog:** `catalog_pattern` — **INFERRED**; analogous naming to live `da29-00003g` only.
- **Live:** **PROVEN** `da29-00003g` live with 16 compat mappings and retailer search-placeholder link.
- **Compatibility:** **PROVEN** 0 for `da29-00003b`. **UNKNOWN** whether B revision fits same models as G.

### `da97-15217b` (Samsung variant)

- **Catalog:** `catalog_pattern` — **INFERRED**; catalog name cites "HAF-QIN family variant" — **not** fit proof.
- **Live:** **PROVEN** `da97-15217d` live with 11 compat rows + `amazon-da97-15217d-live-outcome.2026-05-03.json` + owner decision packet reference in `data/owner-decisions/batch-non-amazon-pdp-owner-approval.json`.
- **Compatibility:** **PROVEN** 0 for `da97-15217b`. **UNKNOWN** B vs D interchangeability.

---

## 4. Safe-to-promote-later candidates

**None today.**

Promotion criteria used (all must pass before `promote_candidate_after_review`):

1. **PROVEN** distinct OEM / slug vs live catalog (or approved alias strategy documented).
2. **PROVEN** `compatibility_mappings.csv` rows for target models (human-verified, not copied from sibling slug).
3. **PROVEN** retailer or evidence path plan (Amazon live-outcome or explicit no-buy info page strategy).
4. Owner sign-off recorded outside this doc before `seed:import`.

**First research priority (lowest alias risk, still blocked on compat):** `lt120f`  
**Highest wrong-purchase risk:** `4396702`, `edr5rxd1` (live slugs already cover same EveryDrop families)

---

## 5. Block / hold candidates

| slug | hold level | primary blocker |
|------|------------|-----------------|
| `edr5rxd1` | **block_for_now** | Live `4396508` + evidence already cover Filter 5 family |
| `adq73613404` | **block_for_now** | No compat; variant unproven vs ADQ73613402/03 |
| `da29-00003b` | **block_for_now** | No compat; revision unproven vs `da29-00003g` |
| `da97-15217b` | **block_for_now** | No compat; variant unproven vs `da97-15217d` |
| `4396702` | **needs_alias_review** (hold import) | EveryDrop 2 family overlap with `edr2rxd1` |
| `lt120f` | **needs_compatibility_evidence** (hold import) | No compat / model / retailer proof |

---

## 6. Exact next evidence collection steps

Run from repo root. All steps are **read-only / planning** unless a separate owner-approved mutation task exists.

1. **Reconfirm factory cohort (no mutation):**
   ```bash
   npx tsx scripts/report-large-batch-coverage-factory.ts | jq '[.top_candidates[] | select(.factory_state=="new_product_candidate")]'
   npx tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.large_batch_coverage_factory_summary_v1'
   ```

2. **`lt120f` — compatibility:**
   - Owner browser: LG service docs for LT120F → list model numbers.
   - Add rows to `data/compatibility_mappings.csv` only in an **approved** import task (not this review).
   - Verify slug not in live CSV: `rg -n '^[^,]*,lt120f,' data/filters.csv` (expect no match).

3. **`4396702` — alias / family review:**
   - Compare Whirlpool EveryDrop 2 marking (4396702) vs EDR2RXD1 on OEM packaging.
   - If same product: plan alias on `edr2rxd1`, **do not** import `4396702` as new slug.
   - If distinct: document proof, then compat collection (separate from `edr2rxd1` rows).

4. **`edr5rxd1` — defer unless slug canonicalization required:**
   - Review `data/evidence/amazon-4396508-owner-review-pdp-evidence.2026-05-10.json` for cross-ref only.
   - Default: keep `4396508` as live canonical Filter 5 slug.

5. **`adq73613404`, `da29-00003b`, `da97-15217b` — revision proof:**
   - Manufacturer fit charts for exact OEM suffix (B/D/04 vs live sibling).
   - **Do not** copy sibling `compatibility_mappings.csv` rows without chart proof.
   - After compat proof: Amazon token precheck in separate lane (`npm run buckparts:precheck:amazon-refrigerator-tokens -- --tokens <OEM>`) — only when owner approves mutation work.

6. **Before any import:**
   - Factory must still show `mutation_ready: false` in Command Center until explicit owner approval task changes production gates.
   - Re-run: `node --import tsx --test scripts/lib/large-batch-coverage-factory-v1.test.ts`

---

## 7. Explicit non-mutation statement

**PROVEN for this review artifact:**

- No products were imported into `data/filters.csv`.
- No changes to `data/compatibility_mappings.csv`, `data/retailer_links.csv`, or Supabase.
- No CTAs, buy links, or public pages were added or changed.
- No `seed:import`, deploy, or redesign mockup edits were performed.

This document is planning-only. Import or publish actions require a separate, owner-approved mutation task.

---

## References (repo paths)

| Asset | Path |
|-------|------|
| Bulk expansion catalog | `src/lib/coverage/fridge-homekeep-bulk-catalog-v1.ts` |
| Factory classifier | `src/lib/coverage/large-batch-coverage-factory-v1.ts` |
| Factory doc | `docs/BuckParts-LARGE-BATCH-COVERAGE-FACTORY-V1.md` |
| Live filters | `data/filters.csv` |
| Aliases | `data/filter_aliases.csv` |
| Compatibility | `data/compatibility_mappings.csv` |
| Models | `data/fridge_models.csv` |
| Retailer links | `data/retailer_links.csv` |
| Bulk sample | `data/bulk/filters.bulk.sample.csv` |
| Factory tests | `scripts/lib/large-batch-coverage-factory-v1.test.ts` |
