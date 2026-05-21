# BuckParts Large Batch Coverage Factory v1

**Status:** **PROVEN** read-only report (`buckparts:large-batch-coverage-factory`). **NOT PROVEN** batch-lane wiring or any apply/mutation path.

## Command

```bash
npm run buckparts:large-batch-coverage-factory
npx tsx scripts/report-large-batch-coverage-factory.ts --limit 50
```

## Contract

| Field | Value |
|--------|--------|
| `report_name` | `buckparts_large_batch_coverage_factory_v1` |
| `read_only` | `true` |
| `data_mutation` | `false` |

## Factory states

| State | Meaning |
|--------|---------|
| `existing_live_product` | Slug in `data/filters.csv`; no stronger publish/monetization signal |
| `new_product_candidate` | In `fridge-homekeep-bulk-catalog-v1` but not in live `filters.csv` |
| `alias_collision_candidate` | Alias token maps to multiple slugs in `filter_aliases.csv` |
| `publishable_no_buy_page` | Live row; no gated `direct_buyable` link (info-only path) |
| `publishable_amazon_candidate` | Amazon live-outcome evidence and/or gated Amazon row |
| `publishable_waterdrop_candidate` | Waterdrop operator feed recommends owner browser proof |
| `evidence_needed` | Amazon-rescue cohort token without live-outcome evidence |
| `blocked_do_not_publish` | Frozen token, excluded Frigidaire routing, or placeholder-only with no catalog row |

## Inputs (v1)

- `data/filters.csv`, `data/filter_aliases.csv`, `data/retailer_links.csv`
- `src/lib/coverage/fridge-homekeep-bulk-catalog-v1.ts` (shared with `scripts/generate-fridge-homekeep-bulk-csv.ts`)
- `data/evidence/*.json` (filename signals only)
- `data/ops/amazon-rescue-token-controls.json`
- `data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json` when present (**UNKNOWN** if absent; sample JSON is not used by default)

## Bulk-only expansion rows (v1)

Net-new slugs live in `FRIDGE_HOMEKEEP_BULK_EXPANSION_ONLY_V1` inside `fridge-homekeep-bulk-catalog-v1.ts` (not in committed `data/filters.csv`). Factory classifies them as `new_product_candidate` until owner import/review. Do not run `seed:import` from this lane.

**Active queue (2026-05-21):** **PROVEN** empty — `bulk_catalog.row_count` equals `live_filters_csv.row_count` (57); `new_product_candidate=0`. Command Center `expansion_blocker_summary` cites first-fridge batch outcome and need for a stronger upstream expansion source before re-queuing bulk-only rows.

**Demoted registry (learning only):** `FRIDGE_HOMEKEEP_BULK_EXPANSION_DEMOTED_V1` — not included in `listFridgeHomekeepBulkFilterRowsV1()`; factory does not surface these slugs. See `docs/BuckParts-FIRST-FRIDGE-EXPANSION-EVIDENCE-TRIAGE.md` and per-slug `data/evidence/*-compatibility-evidence-readonly.2026-05-21.json`.

Rejected from the first slice (review notes): `hafcin` (HAF-CIN / `da29-00020b` alias-family risk), `fpuresource3` (OEM `WF3CB` duplicates live `wf3cb`), `fpuresourceultra` (OEM `EPTWFU01` duplicates live `eptwfu01` and matches `LARGE_BATCH_EXCLUDED_FRIGIDAIRE_TOKENS_V1`).

**Demoted (first fridge batch):** `lt120f` (wrong wedge — air filter), `4396702`, `edr5rxd1`, `adq73613404`, `da29-00003b`, `da97-15217b`.

## Non-goals

No Supabase writes, no `retailer_links` mutation, no UI/ranking/gate changes, no auto-publish.

Implementation: `src/lib/coverage/large-batch-coverage-factory-v1.ts`, `scripts/report-large-batch-coverage-factory.ts`.
