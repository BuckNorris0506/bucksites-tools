# BuckParts fridge model PDP buyer-path gap plan v1

Generated: 2026-07-14T05:31:09.670Z

## Status

- contract: `buckparts_fridge_model_pdp_buyer_path_gap_plan_v1`
- read_only: **true**
- data_mutation: **false**
- auto_promote_authorized: **false**
- invent_link_authorized: **false**
- slug_count: **7**
- cta_go_proof: `data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1.json`

## Summary

- CLOSABLE_WITH_EXISTING_EVIDENCE: 0
- NEEDS_EXTERNAL_RESEARCH: 6
- REMAIN_NO_BUY: 1

## Rows

| slug | filters | action | failure_class | csv_could_close | research | remain_no_buy | next_step |
|---|---|---|---|---|---|---|---|
| ge-gfe24jgkww | smartwater-mwfp, xwfe | NEEDS_EXTERNAL_RESEARCH | missing_approved_safe_retailer_link | false | true | false | Owner/browser manufacturer-rescue: capture official PDP (not search placeholder), then founder-gated retailer_links review. Do not invent PDPs or auto-promote. |
| ge-gfe27jmkes | xwfe | NEEDS_EXTERNAL_RESEARCH | missing_approved_safe_retailer_link | false | true | false | Owner/browser manufacturer-rescue: capture official PDP (not search placeholder), then founder-gated retailer_links review. Do not invent PDPs or auto-promote. |
| ge-gne25jmkww | xwfe | NEEDS_EXTERNAL_RESEARCH | missing_approved_safe_retailer_link | false | true | false | Owner/browser manufacturer-rescue: capture official PDP (not search placeholder), then founder-gated retailer_links review. Do not invent PDPs or auto-promote. |
| ge-gne27jstss | xwf, xwfe | NEEDS_EXTERNAL_RESEARCH | missing_approved_safe_retailer_link | false | true | false | Owner/browser manufacturer-rescue: capture official PDP (not search placeholder), then founder-gated retailer_links review. Do not invent PDPs or auto-promote. |
| ge-gse25hskss | xwf, xwfe | NEEDS_EXTERNAL_RESEARCH | missing_approved_safe_retailer_link | false | true | false | Owner/browser manufacturer-rescue: capture official PDP (not search placeholder), then founder-gated retailer_links review. Do not invent PDPs or auto-promote. |
| ge-gte18gsnrss | (none) | REMAIN_NO_BUY | expected_no_filter_suppression | false | false | true | Keep no-buy / no filter CTA. Do not re-map GSWF or invent retailer links for this slug. |
| ge-pvd28bymfs | xwfe | NEEDS_EXTERNAL_RESEARCH | missing_approved_safe_retailer_link | false | true | false | Owner/browser manufacturer-rescue: capture official PDP (not search placeholder), then founder-gated retailer_links review. Do not invent PDPs or auto-promote. |

## Proven facts

- PROVEN: read_only=true; data_mutation=false; auto_promote_authorized=false; invent_link_authorized=false.
- PROVEN: exact open FAIL scope=7 SAFE_BUYER_PATH_FAIL slugs from CTA/go proof (post-EDR4 parity).
- PROVEN: closed_by_edr4_parity=whirlpool-wrf540cwhz,whirlpool-wrx735sdhz (no longer in open FAIL scope).
- PROVEN: summary={"CLOSABLE_WITH_EXISTING_EVIDENCE":0,"NEEDS_EXTERNAL_RESEARCH":6,"REMAIN_NO_BUY":1}.
- PROVEN: CLOSABLE_WITH_EXISTING_EVIDENCE requires CSV direct_buyable CTA + /go gate pass (no invented destinations).
- PROVEN: NEEDS_EXTERNAL_RESEARCH only when mapped filters lack a gate-passable approved CSV retailer_links row.
- PROVEN: REMAIN_NO_BUY for expected no-filter suppression (ge-gte18gsnrss).

## Unknown facts

- UNKNOWN: Live production HTML CTA for these open FAIL PDPs (no production fetch in this plan).
- UNKNOWN: Exact Supabase retailer_links primary row parity field-diff for research-needed filters unless a separate parity lane is run.

## Risk notes

- This plan does not authorize retailer_links mutation, buy CTA promotion, or Product JSON-LD invents.
- Do not treat any recommendation as apply permission — founder approval + guarded sync still required.
- Do not invent manufacturer PDPs for XWFE/XWF/MWFP search placeholders.
- Do not re-open whirlpool-wrf540cwhz / whirlpool-wrx735sdhz as CLOSABLE — they are SAFE_BUYER_PATH_PASS after EDR4 parity apply.
