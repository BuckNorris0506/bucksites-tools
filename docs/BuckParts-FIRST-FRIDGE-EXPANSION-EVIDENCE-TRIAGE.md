# BuckParts — First fridge expansion evidence triage (read-only)

**Generated:** 2026-05-21  
**Factory baseline:** `candidate_count=62`, `new_product_candidate=5`, `mutation_ready=false`  
**Cohort:** `FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1` in `src/lib/coverage/fridge-homekeep-bulk-catalog-v1.ts` (5 slugs; `lt120f` removed — see `data/evidence/lt120f-compatibility-evidence-readonly.2026-05-18.json`)

## Executive verdict

**No candidate is `ready_for_catalog_import_plan`.**

| Outcome | Slugs |
|---------|-------|
| `alias_collision_hold` | `4396702`, `edr5rxd1` |
| `block_for_now` | `adq73613404`, `da29-00003b`, `da97-15217b` |
| `ready_for_catalog_import_plan` | **none** |

Do not run `seed:import`. Do not add `compatibility_mappings.csv` rows from sibling slugs.

---

## Triage table

| slug | OEM | Brand | evidence_status | Product type | Alias collision | Compat rows (slug) | Proven models | In fridge_models.csv | Live family collision | recommended_state |
|------|-----|-------|-----------------|--------------|-----------------|-------------------|---------------|----------------------|----------------------|-------------------|
| `4396702` | 4396702 | whirlpool | **INFERRED** + manufacturer partial | **PROVEN** fridge water | **INFERRED** hold (EveryDrop 2 vs `edr2rxd1`) | **PROVEN** 0 | **PROVEN** none | n/a | **PROVEN** `edr2rxd1` (21 compat, Amazon evidence) | `alias_collision_hold` |
| `edr5rxd1` | EDR5RXD1 | whirlpool | **PROVEN** repo + manufacturer partial | **PROVEN** fridge water | **PROVEN** hold vs `4396508` | **PROVEN** 0 | **PROVEN** none | n/a | **PROVEN** `4396508` (17 compat, Amazon evidence) | `alias_collision_hold` |
| `adq73613404` | ADQ73613404 | lg | **BLOCKED** | **PROVEN** fridge water | **PROVEN** pass (token distinct) | **PROVEN** 0 | **UNKNOWN** | **UNKNOWN** | **PROVEN** `adq73613402`/`03` (14+13 compat) | `block_for_now` |
| `da29-00003b` | DA29-00003B | samsung | **BLOCKED** | **PROVEN** fridge water | **PROVEN** pass | **PROVEN** 0 | **UNKNOWN** | **INFERRED** G-family models in repo, not B-proven | **PROVEN** `da29-00003g` (16 compat) | `block_for_now` |
| `da97-15217b` | DA97-15217B | samsung | **BLOCKED** | **PROVEN** fridge water | **PROVEN** pass | **PROVEN** 0 | **UNKNOWN** | **INFERRED** D-family models in repo, not B-proven | **PROVEN** `da97-15217d` (11 compat + evidence) | `block_for_now` |

---

## Per-candidate detail

### `4396702` (Whirlpool)

| Field | Value |
|-------|-------|
| **evidence_status** | **INFERRED** (family) + **PROVEN** (water filter type, bulk sample, Whirlpool Filter 2 PDP for EDR2RXD1) |
| **Product type** | **PROVEN** refrigerator water filter (`data/bulk/filters.bulk.sample.csv` line 10) |
| **Alias collision** | **INFERRED** medium — `filter_aliases.csv` maps `EveryDrop 2` to live `edr2rxd1`, not `4396702`; no CSV multi-slug collision |
| **Compat count** | **PROVEN** 0 for `4396702`; **PROVEN** 21 for live `edr2rxd1` |
| **Proven model numbers** | **PROVEN** none for `4396702` |
| **fridge_models.csv** | **UNKNOWN** (no models tied to this slug) |
| **Live slug collision** | **PROVEN** `edr2rxd1` covers EveryDrop Filter 2 with retailer + `data/evidence/amazon-edr2rxd1-live-outcome.2026-05-05.json` |
| **Sources checked** | `data/bulk/filters.bulk.sample.csv`; https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.everydrop-refrigerator-water-filter-2-edr2rxd1-pack-of-1.edr2rxd1.html; repo CSVs |
| **JSON** | `data/evidence/4396702-compatibility-evidence-readonly.2026-05-21.json` |
| **recommended_next_action** | Owner: alias `4396702` → `edr2rxd1` in approved `filter_aliases.csv` task, **or** prove distinct SKU with Whirlpool OEM docs — do not import new slug while hold stands |

### `edr5rxd1` (EveryDrop Filter 5)

| Field | Value |
|-------|-------|
| **evidence_status** | **PROVEN** (repo) + **PROVEN** cross-ref in `amazon-4396508-owner-review-pdp-evidence.2026-05-10.json` |
| **Product type** | **PROVEN** refrigerator water filter (catalog + Filter 5 family) |
| **Alias collision** | **PROVEN** hold — live canonical Filter 5 slug is `4396508`, not `edr5rxd1` |
| **Compat count** | **PROVEN** 0 / **PROVEN** 17 on `4396508` |
| **Proven model numbers** | **PROVEN** none for slug `edr5rxd1` |
| **Live slug collision** | **PROVEN** `4396508` has committed Amazon evidence; EDR5RXD1 only in aftermarket PDP title cross-ref |
| **Sources checked** | `data/filters.csv`; `data/evidence/amazon-4396508-*.json`; Whirlpool Filter 2 PDP (family reference); Filter 5 Whirlpool PDP fetch **UNKNOWN** (timeout) |
| **JSON** | `data/evidence/edr5rxd1-compatibility-evidence-readonly.2026-05-21.json` |
| **recommended_next_action** | Do not import `edr5rxd1`. Use live `4396508` lane; optional alias row on `4396508` if marketing token required |

### `adq73613404` (LG)

| Field | Value |
|-------|-------|
| **evidence_status** | **BLOCKED** — insufficient LG US manufacturer evidence for `ADQ73613404` |
| **Product type** | **INFERRED** refrigerator water filter (catalog naming); **PROVEN** LG LT800P line is water filter on https://www.lg.com/us/appliances-accessories/lg-lt800p-refrigerator-water-filter with part **ADQ73613401** |
| **Alias collision** | **PROVEN** pass (distinct OEM from `adq73613402`/`03`) |
| **Compat count** | **PROVEN** 0 |
| **Proven model numbers** | **UNKNOWN** |
| **Live slug collision** | **PROVEN** siblings `adq73613402`/`03` in `data/filters.csv` with 14+13 compat rows |
| **Sources checked** | LG LT800P US PDP; repo CSVs; LG US search for ADQ73613404 **UNKNOWN** product page |
| **JSON** | `data/evidence/adq73613404-compatibility-evidence-readonly.2026-05-21.json` |
| **recommended_next_action** | `needs_more_compatibility_evidence` — LG Filter Finder / manual export for ADQ73613404 before revisit |

### `da29-00003b` (Samsung)

| Field | Value |
|-------|-------|
| **evidence_status** | **BLOCKED** — revision unproven |
| **Product type** | **PROVEN** refrigerator water filter (Samsung DA29-* family; live `da29-00003g`) |
| **Alias collision** | **PROVEN** pass (OEM token distinct from `da29-00003g`) |
| **Compat count** | **PROVEN** 0 for B; **PROVEN** 16 for live G |
| **Proven model numbers** | **UNKNOWN** for B |
| **fridge_models.csv** | **PROVEN** models exist for **G** mappings (e.g. `samsung-rf23j9011sg` / `RF23J9011SG` in `data/compatibility_mappings.csv`) — **not** proven for B |
| **Live slug collision** | **PROVEN** `da29-00003g` live with compat |
| **Sources checked** | Repo only for B-specific proof; Samsung US accessory fetch **UNKNOWN** useful PDP in triage |
| **JSON** | `data/evidence/da29-00003b-compatibility-evidence-readonly.2026-05-21.json` |
| **recommended_next_action** | Per-model Samsung docs must cite **DA29-00003B** explicitly |

### `da97-15217b` (Samsung)

| Field | Value |
|-------|-------|
| **evidence_status** | **BLOCKED** — revision unproven |
| **Product type** | **PROVEN** refrigerator water filter (live `da97-15217d`) |
| **Alias collision** | **PROVEN** pass |
| **Compat count** | **PROVEN** 0 for B; **PROVEN** 11 for live D |
| **Proven model numbers** | **UNKNOWN** for B |
| **Live slug collision** | **PROVEN** `da97-15217d` + `amazon-da97-15217d-live-outcome.2026-05-03.json` |
| **JSON** | `data/evidence/da97-15217b-compatibility-evidence-readonly.2026-05-21.json` |
| **recommended_next_action** | Same as `da29-00003b` — manufacturer chart required; do not inherit D compat |

---

## Import-plan candidates

**None.** Every slug lacks **PROVEN** per-slug model compatibility rows and/or fails alias/family hold.

## Hold / block summary

| Tier | Slugs |
|------|-------|
| **Alias / family hold** | `4396702`, `edr5rxd1` |
| **Block (compat / OEM unproven)** | `adq73613404`, `da29-00003b`, `da97-15217b` |

## Evidence artifacts

| Slug | File |
|------|------|
| `lt120f` (removed from queue) | `data/evidence/lt120f-compatibility-evidence-readonly.2026-05-18.json` |
| `4396702` | `data/evidence/4396702-compatibility-evidence-readonly.2026-05-21.json` |
| `edr5rxd1` | `data/evidence/edr5rxd1-compatibility-evidence-readonly.2026-05-21.json` |
| `adq73613404` | `data/evidence/adq73613404-compatibility-evidence-readonly.2026-05-21.json` |
| `da29-00003b` | `data/evidence/da29-00003b-compatibility-evidence-readonly.2026-05-21.json` |
| `da97-15217b` | `data/evidence/da97-15217b-compatibility-evidence-readonly.2026-05-21.json` |

## Non-mutation statement

**PROVEN:** This triage did not edit `data/filters.csv`, `data/compatibility_mappings.csv`, `data/retailer_links.csv`, Supabase, public pages, or CTAs.

## Validation commands

```bash
npx tsx scripts/report-large-batch-coverage-factory.ts | jq '{candidate_count,state_counts,bulk_catalog:.source_summary.bulk_catalog}'
node --import tsx --test scripts/lib/first-fridge-expansion-evidence-readonly.test.ts
```
