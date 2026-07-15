# BuckParts fridge model PDP CTA / go-link proof pack v1

Generated: 2026-07-15T02:58:34.089Z

## Status

- contract: `buckparts_fridge_model_pdp_cta_go_link_proof_pack_v1`
- read_only: **true**
- data_mutation: **false**
- buy_cta_authorized: **false**
- slug_count: **28**
- rendered_truth_pack: `data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1.json`

## Summary

- SAFE_BUYER_PATH_PASS: 27
- SAFE_BUYER_PATH_FAIL: 1
- SAFE_BUYER_PATH_UNKNOWN: 0
- product_json_ld_proven_suppressed_count: 28

## Rows

| slug | cohort | verdict | safe_cta | go_ok | json_ld | missing |
|---|---|---|---:|---:|---|---|
| frigidaire-ffhb2740ps | qa_20 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| frigidaire-fghb2868pf | qa_20 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| frigidaire-fgsc2335tf | qa_20 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-cwe23sshww | gswf_13 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-gfe24jgkww | gswf_13 | SAFE_BUYER_PATH_PASS | 2 | 2 | PROVEN_SUPPRESSED | (none) |
| ge-gfe27jmkes | gswf_13 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-gfe28gmkbb | gswf_13 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-gfe28gmkes | qa_20 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-gfe28gskes | gswf_13 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-gfe28gskss | qa_20 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-gfe28gynfs | qa_20 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-gfe28hskss | gswf_13 | SAFE_BUYER_PATH_PASS | 2 | 2 | PROVEN_SUPPRESSED | (none) |
| ge-gne25jmkww | gswf_13 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-gne27jstss | gswf_13 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-gse25hskss | gswf_13 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-gte18gsnrss | gte18 | SAFE_BUYER_PATH_FAIL | 0 | 0 | PROVEN_SUPPRESSED | no_go_resolvable_safe_retailer_link; no_mapped_filters_on_pdp_loader; no_safe_direct_buyable_cta_after_gate; trust_buyer_path_unavailable |
| ge-gye22gskww | gswf_13 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-pfe28kmkww | gswf_13 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-pfe28kynbb | gswf_13 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| ge-pvd28bymfs | gswf_13 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| samsung-rf263beaesr | qa_20 | SAFE_BUYER_PATH_PASS | 2 | 2 | PROVEN_SUPPRESSED | (none) |
| samsung-rf28nhedbsr | qa_20 | SAFE_BUYER_PATH_PASS | 2 | 2 | PROVEN_SUPPRESSED | (none) |
| samsung-rf28r7201sr | qa_20 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| samsung-rf28r7351sg | qa_20 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| whirlpool-wrf540cwhz | qa_20 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| whirlpool-wrs325sdhz | qa_20 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| whirlpool-wrx735sdhz | qa_20 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |
| whirlpool-wrx986sihz | qa_20 | SAFE_BUYER_PATH_PASS | 1 | 1 | PROVEN_SUPPRESSED | (none) |

## Proven facts

- PROVEN: read_only=true; data_mutation=false; buy_cta_authorized=false; retailer_links_mutation_authorized=false.
- PROVEN: exact scope=28 MATCH+promoted slugs from rendered-truth pack.
- PROVEN: excluded QUARANTINED_SUPPRESSED=11; PARTIAL=3.
- PROVEN: summary={"SAFE_BUYER_PATH_PASS":27,"SAFE_BUYER_PATH_FAIL":1,"SAFE_BUYER_PATH_UNKNOWN":0,"product_json_ld_proven_suppressed_count":28}.
- PROVEN: SAFE_BUYER_PATH_PASS requires mapped filters + gated safe CTA + go-resolvable URL + non-quarantine + JSON-LD suppressed.

## Unknown facts

- UNKNOWN: Live production HTML CTA rendering for these 28 PDPs (no production fetch).
- UNKNOWN: Click analytics / real customer conversion on proven go links.

## Risk notes

- This pack does not authorize buy CTA promotion, retailer_links mutation, or Product JSON-LD invents.
- Mapping-layer frontend_safe ≠ monetizable SAFE_BUYER_PATH_PASS.
- Do not include quarantined or PARTIAL slugs in buyer-path PASS claims.
