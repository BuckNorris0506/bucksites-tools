# BuckParts GE MWFP/XWFE Supabase retailer_links sync founder approval v1

Generated: 2026-07-14T22:28:58.511Z

## Status

- packet_contract: `buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_owner_approval_v1`
- decision_id: `decision-2026-07-14-ge-mwfp-xwfe-retailer-links-supabase-sync-approve`
- decision_status: **approved**
- allowed_next_scope: **owner_mutation_approved**
- apply_authorized: **false**
- mutation_authorized: **false**
- apply_not_executed: **true**
- pages_claimed_closed: **false**
- conversion_claimed: **false**

## Allowed future mutations

- `supabase_retailer_links_update_existing_primary_only` — exactly **2** UPDATE(s) of existing `public.retailer_links` primaries
- filters: smartwater-mwfp, xwfe

| filter | supabase_link_id | URL | retailer_name | retailer_key | browser_truth | checked_at |
|---|---|---|---|---|---|---|
| smartwater-mwfp | `e3d9ca23-1be5-4fe7-b001-6dc4948331fe` | `https://www.geapplianceparts.com/store/parts/spec/MWFP` | GE Appliance Parts | oem-parts-catalog | direct_buyable | `2026-07-14T17:40:40.135Z` |
| xwfe | `e274568e-2998-4a93-8642-53862d2eb915` | `https://www.geapplianceparts.com/store/parts/spec/XWFE` | GE Appliance Parts | oem-parts-catalog | direct_buyable | `2026-07-14T17:40:40.135Z` |

## Disallowed mutations

- Do not INSERT any public.retailer_links rows from this approval — UPDATE of existing smartwater-mwfp and xwfe primaries only.
- Do not DELETE any public.retailer_links rows from this approval.
- Do not mutate filter_slug xwf or any XWF destination URL from this approval.
- Do not mutate data/retailer_links.csv from this approval — CSV already applied; this lane is Supabase sync only.
- Do not mutate compatibility_mappings.csv or Supabase compatibility_mappings from this approval.
- Do not authorize buy CTA expansion beyond existing gated retailer_links truth after a future approved sync.
- Do not change public routes, sitemap, robots, Product JSON-LD, or deploy config from this approval.
- Do not claim the 4 model PDPs are buyer-path closed from this approval alone.
- Do not claim conversion/revenue from this approval.
- Do not run autonomous or scheduled Supabase writes — explicit founder-run of a separate guarded Supabase apply executor is still required.
- Approval alone does not mutate Supabase; separate guarded apply + session authorization still required.
- Do not expand beyond the exact 2 approved supabase_link_id primary updates bound to this plan.

## Exclusions

- `xwf`
- `ge-gne27jstss`
- `ge-gse25hskss`
- `ge-gte18gsnrss`

## Affected potentially closable model slugs

- `ge-gfe24jgkww`
- `ge-gfe27jmkes`
- `ge-gne25jmkww`
- `ge-pvd28bymfs`

## Bound artifacts

- `data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review-v1.json` (apply_plan) sha256=`1e73dbe7774a043ae993cfe851a4c3e5b23db4e6d925f4f9b207c4fccc8d2aa2`
- `data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1.json` (evidence) sha256=`080156e71d6c585911d16191956cd0155822ccf2b0a9126c4d8b7d760145a3dd`
- `data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.json` (parity_proof) sha256=`98dfcccdede32e1e3e880404b05bb8cde8dc9c1ac64d3aae0a93751cdffddc98`

## Owner note

Jared approves the founder-gated GE MWFP/XWFE Supabase retailer_links primary UPDATE plan only: exactly 2 updates of existing public.retailer_links primaries — smartwater-mwfp → https://www.geapplianceparts.com/store/parts/spec/MWFP and xwfe → https://www.geapplianceparts.com/store/parts/spec/XWFE — retailer_name=GE Appliance Parts, retailer_key=oem-parts-catalog, browser_truth_classification=direct_buyable, browser_truth_checked_at=2026-07-14T17:40:40.135Z (matching approved CSV/owner-proof source). Bound to data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review-v1.json (sha256 1e73dbe7774a043ae993cfe851a4c3e5b23db4e6d925f4f9b207c4fccc8d2aa2), data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1.json (sha256 080156e71d6c585911d16191956cd0155822ccf2b0a9126c4d8b7d760145a3dd), and data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.json (sha256 98dfcccdede32e1e3e880404b05bb8cde8dc9c1ac64d3aae0a93751cdffddc98). Affected potentially closable model context: ge-gfe24jgkww, ge-gfe27jmkes, ge-gne25jmkww, ge-pvd28bymfs. Exclusions: xwf, ge-gne27jstss, ge-gse25hskss, ge-gte18gsnrss. This row records founder approval for a future Supabase update-only guarded apply — not autonomous write, not inserts/deletes, not CSV mutation, not compatibility CSV/DB, not Product JSON-LD/sitemap/robots/deploy, not XWF mutation, and does not claim pages closed or conversion/revenue. apply_not_executed=true; mutation_authorized=false until an explicit founder-run guarded Supabase apply.

## Proven facts

- PROVEN: apply_authorized=false; mutation_authorized=false; apply_not_executed=true; autonomous_apply_authorized=false.
- PROVEN: exact 2 approved public.retailer_links UPDATEs for smartwater-mwfp and xwfe existing primaries only.
- PROVEN: xwf_promotion_authorized=false; retailer_links_csv_mutation_authorized=false; deploy_mutation_authorized=false.
- PROVEN: bound owner-review sha256=1e73dbe7774a043ae993cfe851a4c3e5b23db4e6d925f4f9b207c4fccc8d2aa2.
- PROVEN: bound browser proof sha256=080156e71d6c585911d16191956cd0155822ccf2b0a9126c4d8b7d760145a3dd.
- PROVEN: bound parity sha256=98dfcccdede32e1e3e880404b05bb8cde8dc9c1ac64d3aae0a93751cdffddc98.
- PROVEN: pages_claimed_closed=false; conversion_claimed=false.

## Unknown facts

- UNKNOWN: future guarded Supabase apply executor outcome until explicitly founder-run.
- UNKNOWN: whether CTA/go FAIL 7 clears after a future authorized sync — must re-proof.
- UNKNOWN: conversion/revenue impact.

## Risk notes

- Presence of this approval file does not authorize running --apply or any Supabase write in this session.
- Do not expand beyond the 2 bound supabase_link_id filters or promote XWF.
- Separate guarded Supabase apply executor still required after this approval.

