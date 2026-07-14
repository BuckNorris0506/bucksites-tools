# BuckParts GE MWFP/XWFE retailer_links founder approval v1

Generated: 2026-07-14T19:17:54.728Z

## Status

- packet_contract: `buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_owner_approval_v1`
- decision_id: `decision-2026-07-14-ge-mwfp-xwfe-retailer-links-csv-update-approve`
- decision_status: **approved**
- allowed_next_scope: **owner_mutation_approved**
- apply_authorized: **false**
- mutation_authorized: **false**
- apply_not_executed: **true**
- pages_claimed_closed: **false**

## Allowed future mutations

- `retailer_links_csv_update_existing_primary_only` — exactly **2** UPDATE(s) of existing `data/retailer_links.csv` primaries
- filters: smartwater-mwfp, xwfe

| filter | URL | retailer_name | retailer_key | browser_truth |
|---|---|---|---|---|
| smartwater-mwfp | `https://www.geapplianceparts.com/store/parts/spec/MWFP` | GE Appliance Parts | oem-parts-catalog | direct_buyable |
| xwfe | `https://www.geapplianceparts.com/store/parts/spec/XWFE` | GE Appliance Parts | oem-parts-catalog | direct_buyable |

## Disallowed mutations

- Do not INSERT any retailer_links rows from this approval — UPDATE of existing smartwater-mwfp and xwfe primaries only.
- Do not DELETE any retailer_links rows from this approval.
- Do not promote filter_slug xwf or any XWF destination URL from this approval.
- Do not include ge-gne27jstss or ge-gse25hskss (XWF supersession-safe policy still required).
- Do not include ge-gte18gsnrss (remain no-buy).
- Do not mutate compatibility_mappings.csv or Supabase compatibility_mappings from this approval.
- Do not mutate Supabase retailer_links from this approval — CSV retailer_links update only via a separate guarded apply executor.
- Do not authorize buy CTA expansion beyond existing gated retailer_links truth after a future approved apply.
- Do not change public routes, sitemap, robots, or Product JSON-LD from this approval.
- Do not claim the 4 model PDPs are buyer-path closed from this approval alone.
- Do not run autonomous or scheduled apply — explicit founder-run of a separate guarded apply executor is still required.
- Approval alone does not mutate retailer_links.csv; separate guarded apply + session authorization still required.

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

- `data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review-v1.json` (apply_plan) sha256=`dc68c80f30053a3e5c2ddb2eacc81d88b55306b123fe5a633153e8dd95c7fec2`
- `data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1.json` (evidence) sha256=`080156e71d6c585911d16191956cd0155822ccf2b0a9126c4d8b7d760145a3dd`

## Owner note

Jared approves the founder-gated GE MWFP/XWFE retailer_links CSV primary UPDATE plan only: exactly 2 updates — smartwater-mwfp → https://www.geapplianceparts.com/store/parts/spec/MWFP and xwfe → https://www.geapplianceparts.com/store/parts/spec/XWFE — retailer_name=GE Appliance Parts, retailer_key=oem-parts-catalog, browser_truth_classification=direct_buyable. Bound to data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review-v1.json (sha256 dc68c80f30053a3e5c2ddb2eacc81d88b55306b123fe5a633153e8dd95c7fec2) and data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1.json (sha256 080156e71d6c585911d16191956cd0155822ccf2b0a9126c4d8b7d760145a3dd). Affected potentially closable model context: ge-gfe24jgkww, ge-gfe27jmkes, ge-gne25jmkww, ge-pvd28bymfs. Exclusions: xwf, ge-gne27jstss, ge-gse25hskss, ge-gte18gsnrss. This row records founder approval for a future retailer_links CSV update-only guarded apply — not autonomous apply, not inserts/deletes, not Supabase, not compatibility CSV/DB, not Product JSON-LD/sitemap/robots, not XWF promotion, and does not claim pages closed. apply_not_executed=true; mutation_authorized=false until an explicit founder-run guarded apply.

## Proven facts

- PROVEN: apply_authorized=false; mutation_authorized=false; apply_not_executed=true; autonomous_apply_authorized=false.
- PROVEN: exact 2 approved retailer_links CSV updates for smartwater-mwfp and xwfe only.
- PROVEN: xwf_promotion_authorized=false; exclusions include xwf and 3 GE model slugs.
- PROVEN: bound plan sha256=dc68c80f30053a3e5c2ddb2eacc81d88b55306b123fe5a633153e8dd95c7fec2.
- PROVEN: bound proof sha256=080156e71d6c585911d16191956cd0155822ccf2b0a9126c4d8b7d760145a3dd.
- PROVEN: pages_claimed_closed=false; conversion_claimed=false.

## Unknown facts

- UNKNOWN: future guarded apply executor outcome until explicitly founder-run.
- UNKNOWN: live Supabase retailer_links parity (not authorized by this approval).
- UNKNOWN: conversion/revenue impact.

## Risk notes

- Presence of this approval file does not authorize running --apply in this session.
- Do not expand beyond the 2 bound filter URLs or promote XWF.
- Separate guarded apply executor still required; Supabase remains a separate founder lane.

