# BuckParts fridge model PDP owner browser proof result packet v1

Generated: 2026-07-14T17:40:40.135Z

## Status

- contract: `buckparts_fridge_model_pdp_owner_browser_proof_result_packet_v1`
- read_only: **true**
- apply_authorized: **false**
- invent_link_authorized: **false**
- link_promotion_authorized: **false**
- xwf_direct_buy_promotion_authorized: **false**
- slug_count: **6**
- filter_count: **3**

## Summary

- OWNER_BROWSER_PASS: 2
- SUPERSEDED_TO_XWFE_PROVEN: 1
- clean_direct_buy_pass_filters: 2
- potentially_closable_slugs: 4
- blocked_by_xwf_supersession_slugs: 2

## Per-filter classification

### `smartwater-mwfp` (MWFP)

- classification: **OWNER_BROWSER_PASS**
- url_shown: `https://www.geapplianceparts.com/store/parts/spec/MWFP`
- product_title_shown: GE MWF Refrigerator Water Filter
- part_shown: **MWFP**
- add_to_cart_visible: **true**
- clean_direct_buy_pass: **true**
- superseded_to_xwfe_proven: **false**
- supersession_safe_apply_lane_required: **false**
- link_promotion_authorized: **false**
- mapped model slugs: ge-gfe24jgkww
- Owner screenshot: official GE Appliance Parts spec PDP for MWFP with Add to Cart.
- Title shows GE MWF Refrigerator Water Filter; part identity shown as MWFP.

### `xwf` (XWF)

- classification: **SUPERSEDED_TO_XWFE_PROVEN**
- url_shown: `https://www.geapplianceparts.com/store/parts/spec/XWF`
- product_title_shown: GE XWFE Refrigerator Water Filter
- part_shown: **XWFE**
- add_to_cart_visible: **true**
- clean_direct_buy_pass: **false**
- superseded_to_xwfe_proven: **true**
- supersession message: Part XWF has been superseded to Part XWFE
- supersession_safe_apply_lane_required: **true**
- link_promotion_authorized: **false**
- mapped model slugs: ge-gne27jstss, ge-gse25hskss
- Owner screenshot: /store/parts/spec/XWF page shows supersession of XWF → XWFE.
- Product title and Add to Cart are for XWFE, not a clean direct XWF buy PASS.
- Do not promote XWF as a direct XWF buy link.
- Requires a separate supersession-safe approval/apply lane before any public buyer-path promotion involving XWF.

### `xwfe` (XWFE)

- classification: **OWNER_BROWSER_PASS**
- url_shown: `https://www.geapplianceparts.com/store/parts/spec/XWFE`
- product_title_shown: GE XWFE Refrigerator Water Filter
- part_shown: **XWFE**
- add_to_cart_visible: **true**
- clean_direct_buy_pass: **true**
- superseded_to_xwfe_proven: **false**
- supersession_safe_apply_lane_required: **false**
- link_promotion_authorized: **false**
- mapped model slugs: ge-gfe24jgkww, ge-gfe27jmkes, ge-gne25jmkww, ge-gne27jstss, ge-gse25hskss, ge-pvd28bymfs
- Owner screenshot: official GE Appliance Parts spec PDP for XWFE with Add to Cart.
- Exact XWFE identity proven on official manufacturer path.

## Slug closure (fail-closed)

### Potentially closable via MWFP/XWFE proof (4)

- `ge-gfe24jgkww`
- `ge-gfe27jmkes`
- `ge-gne25jmkww`
- `ge-pvd28bymfs`

### Still blocked by XWF supersession policy (2)

- `ge-gne27jstss`
- `ge-gse25hskss`

| slug | mapped filters | closure_status |
|---|---|---|
| ge-gfe24jgkww | smartwater-mwfp, xwfe | POTENTIALLY_CLOSABLE_VIA_MWFP_XWFE_PROOF |
| ge-gfe27jmkes | xwfe | POTENTIALLY_CLOSABLE_VIA_MWFP_XWFE_PROOF |
| ge-gne25jmkww | xwfe | POTENTIALLY_CLOSABLE_VIA_MWFP_XWFE_PROOF |
| ge-gne27jstss | xwf, xwfe | BLOCKED_BY_XWF_SUPERSESSION_POLICY |
| ge-gse25hskss | xwf, xwfe | BLOCKED_BY_XWF_SUPERSESSION_POLICY |
| ge-pvd28bymfs | xwfe | POTENTIALLY_CLOSABLE_VIA_MWFP_XWFE_PROOF |

## Proven facts

- PROVEN: read_only=true; apply_authorized=false; invent_link_authorized=false; link_promotion_authorized=false; xwf_direct_buy_promotion_authorized=false.
- PROVEN: smartwater-mwfp classification=OWNER_BROWSER_PASS (official GE /store/parts/spec/MWFP; Add to Cart visible).
- PROVEN: xwfe classification=OWNER_BROWSER_PASS (official GE /store/parts/spec/XWFE; Add to Cart visible).
- PROVEN: xwf classification=SUPERSEDED_TO_XWFE_PROVEN (not clean direct XWF buy PASS).
- PROVEN: potentially_closable_slugs=["ge-gfe24jgkww","ge-gfe27jmkes","ge-gne25jmkww","ge-pvd28bymfs"].
- PROVEN: blocked_by_xwf_supersession_slugs=["ge-gne27jstss","ge-gse25hskss"].
- PROVEN: summary={"OWNER_BROWSER_PASS":2,"SUPERSEDED_TO_XWFE_PROVEN":1,"clean_direct_buy_pass_filters":2,"potentially_closable_slugs":4,"blocked_by_xwf_supersession_slugs":2}.

## Unknown facts

- UNKNOWN: future founder approval / apply outcomes for MWFP and XWFE retailer_links.
- UNKNOWN: supersession-safe XWF→XWFE public promotion policy until a separate lane exists.
- UNKNOWN: conversion/revenue impact (not claimed).

## Risk notes

- This packet records owner browser proof only — does not mutate Supabase, CSV, retailer_links, buy CTA, sitemap, robots, Product JSON-LD, owner decisions, or deploy config.
- Do not promote XWF as a direct XWF buy link.
- XWF requires a separate supersession-safe approval/apply lane before any public buyer-path promotion.
- ge-gte18gsnrss remains out of scope (remain-no-buy).

