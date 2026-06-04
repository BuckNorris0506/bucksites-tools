# Fridge safe-link GSWF apply-readiness (read-only)

Generated: 2026-06-04T01:09:31.789Z

**apply_readiness_verdict:** `READY_FOR_OWNER_BROWSER_PROOF`

Dated owner-browser evidence + fresh precheck OWNER_REVIEW_ELIGIBLE support fresh owner browser re-verification before any apply-plan draft; committed CSV has zero safe-gated rows and browser_truth fields are unset.

## Live / CSV

- URL: https://buckparts.com/filter/gswf
- live_has_go_cta: **false**
- CSV: 1 row(s), 0 safe gated
- primary: oem-parts-catalog → https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=GSWF
- browser_truth_classification: `(empty)`

## Evidence

- data/evidence/amazon-gswf-owner-review-pdp-evidence.2026-05-18.json
- verdict: EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT
- browser_verdict: PASS_OEM_DIRECT_BUYABLE
- asin: B0002GTTRC
- affiliate_url_candidate: https://www.amazon.com/dp/B0002GTTRC?tag=buckparts20-20

## Precheck

- command: `npm run buckparts:precheck:amazon-refrigerator-tokens -- --tokens GSWF`
- policy_status: OWNER_REVIEW_ELIGIBLE
- classification: EXACT_PDP_PROVEN_NO_COLLISION

## Blockers

- mutation_authorized=false
- verified_link_authorized=false
- csv_apply_authorized=false
- supabase_mutation_authorized=false
- evidence_write_authorized=false
- production_go_first_hop=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH
- committed CSV has zero launch-buy-links safe gated rows
- committed browser_truth_classification not direct_buyable
- evidence.mutation_ready=false
- gswf2_slug_exists_separate_exact_token_proof_required
- 4396508_lane_blocked_do_not_conflate
- evidence.screenshot_file_committed=false
- evidence.filter_id was null at evidence authoring — precheck now resolves filter_id

## Next

Owner fresh US-browser re-verification of single-pack https://www.amazon.com/dp/B0002GTTRC — confirm literal GSWF in seller-controlled title, buyability, and no GSWF2 conflation; then rerun npm run buckparts:precheck:amazon-refrigerator-tokens -- --tokens GSWF before any apply-plan draft. Do not mutate CSV/Supabase/evidence; do not click production /go.

