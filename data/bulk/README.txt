Bulk refrigerator water filter seed pack
=========================================

Large curated pack (BuckParts fridge wedge): run `npm run seed:generate:fridge-bulk` to write
`data/brands.csv` … `data/retailer_links.csv` (57 filters, 500 models, ~967 compatibility rows,
one OEM/parts-catalog keyword row per filter, aliases). Then import:

  npm run seed:import
  # If the DB still has stale fridge_models / filters from an older pack, align it to the CSV:
  npm run seed:import:fridge:prune

Generator: `scripts/generate-fridge-homekeep-bulk-csv.ts`.

Goal: scale the same CSV pipeline to 100+ fridge rows, 15–25+ filter SKUs, aliases, and mappings.

Import order (enforced by scripts/import-seed.ts):
  1) brands
  2) filters
  3) fridge_models
  4) fridge_model_aliases  (optional; needs slugs from step 3)
  5) filter_aliases        (optional; needs slugs from step 2)
  6) compatibility_mappings
  7) retailer_links

How to load this pack into Supabase
------------------------------------
From repo root, back up ./data/*.csv if needed, then either:

  A) Copy these files into ./data/ with standard names and run import WITHOUT --sample:
       cp data/bulk/brands.bulk.sample.csv data/brands.csv
       cp data/bulk/filters.bulk.sample.csv data/filters.csv
       cp data/bulk/fridge_models.bulk.sample.csv data/fridge_models.csv
       cp data/bulk/fridge_model_aliases.bulk.sample.csv data/fridge_model_aliases.csv
       cp data/bulk/filter_aliases.bulk.sample.csv data/filter_aliases.csv
       cp data/bulk/compatibility_mappings.bulk.sample.csv data/compatibility_mappings.csv
       cp data/bulk/retailer_links.bulk.sample.csv data/retailer_links.csv
       npm run seed:import

  B) Keep demo samples: use only the small ./data/*.sample.csv for --sample runs; use bulk when building a real catalog.

Apply migration supabase/migrations/20260409110000_alias_unique_for_import.sql before importing aliases (upsert needs unique (parent, alias)).

Air purifier filters (next category)
------------------------------------
Mirror this layout under new tables and routes later, e.g. air_purifier_models.csv,
air_purifier_filters.csv, mappings, aliases, retailer links — reuse import-seed patterns
and search RPC + catalog id without changing existing /fridge and /filter URLs.
