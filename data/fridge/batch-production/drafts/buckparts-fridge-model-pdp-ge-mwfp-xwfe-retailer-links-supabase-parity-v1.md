# GE MWFP/XWFE retailer_links Supabase/runtime parity proof

- contract: `buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_parity_v1`
- overall_sync_status: **DRIFTED**
- supabase_truth_status: `CHECKED`
- cta_go_failure_cause: `null`
- pages_claimed_closed: `false`
- conversion_claimed: `false`
- apply_lane_authorized: `false`
- exact_command: `npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts`

## Filter scope

- `smartwater-mwfp`
- `xwfe`

## Affected model slugs

- `ge-gfe24jgkww`
- `ge-gfe27jmkes`
- `ge-gne25jmkww`
- `ge-pvd28bymfs`

## Per-filter parity

### `smartwater-mwfp` — **DRIFTED**

- core_status: `CSV_HAS_WIN_SUPABASE_MISSING_OR_STALE`
- CSV url: `https://www.geapplianceparts.com/store/parts/spec/MWFP` (search_placeholder=false; direct_buyable=true)
- Supabase url: `https://www.geapplianceparts.com/store/parts/spec/MWFP` (search_placeholder=false; direct_buyable=true)
- retailer_key_match=true; retailer_name_match=true; checked_at_match_normalized=true
- mismatched_fields: `browser_truth_notes`

### `xwfe` — **DRIFTED**

- core_status: `CSV_HAS_WIN_SUPABASE_MISSING_OR_STALE`
- CSV url: `https://www.geapplianceparts.com/store/parts/spec/XWFE` (search_placeholder=false; direct_buyable=true)
- Supabase url: `https://www.geapplianceparts.com/store/parts/spec/XWFE` (search_placeholder=false; direct_buyable=true)
- retailer_key_match=true; retailer_name_match=true; checked_at_match_normalized=true
- mismatched_fields: `browser_truth_notes`

## CTA/go for affected models

- `ge-gfe24jgkww`: verdict=`SAFE_BUYER_PATH_PASS`; safe_cta=2; go=2; reasons=(none)
- `ge-gfe27jmkes`: verdict=`SAFE_BUYER_PATH_PASS`; safe_cta=1; go=1; reasons=(none)
- `ge-gne25jmkww`: verdict=`SAFE_BUYER_PATH_PASS`; safe_cta=1; go=1; reasons=(none)
- `ge-pvd28bymfs`: verdict=`SAFE_BUYER_PATH_PASS`; safe_cta=1; go=1; reasons=(none)

## Recommended next action

Run npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts (read-only owner-review drafts). Hard-stop before Supabase write / founder approval. Then re-run CTA/go proof. Do not claim 4 pages closed yet.

## Proven

- PROVEN: read_only=true; data_mutation=false; mutation_authorized=false; supabase_mutation_authorized=false; apply_lane_authorized=false.
- PROVEN: filter scope is exactly smartwater-mwfp + xwfe; xwf excluded.
- PROVEN: affected model context is exactly ge-gfe24jgkww, ge-gfe27jmkes, ge-gne25jmkww, ge-pvd28bymfs.
- PROVEN: live fridge/filter PDP retailer_links load from Supabase after buy-path gates — CSV alone does not update CTA/go.
- PROVEN: overall_sync_status=DRIFTED; in_sync=0; drifted=2; unknown=0.
- PROVEN: pages_claimed_closed=false; conversion_claimed=false; CTA/go pack summary PASS=27 FAIL=1.
- PROVEN: filter scope is exactly smartwater-mwfp + xwfe; xwf excluded.
- PROVEN: live /filter/[slug] reads Supabase public.retailer_links via getFilterBySlug.
- PROVEN: allowed Supabase table scope is exactly public.retailer_links.
- PROVEN: csv_sha256=8210d7260d6524e2a339f87f77a03da7b895c51ed91513a203931633a6405bcc
- PROVEN: row_count_planned=2 (max 2).
- PROVEN: founder decisions considered: decision-2026-07-14-ge-mwfp-xwfe-retailer-links-csv-update-approve.

## Unknown

- UNKNOWN: conversion/revenue impact of MWFP/XWFE retailer_links parity.
- UNKNOWN: whether the 4 GE model PDPs are buyer-path closed — this packet does not re-run CTA/go or claim closure.
- UNKNOWN: live PDP verified links until scoped Supabase write succeeds.

