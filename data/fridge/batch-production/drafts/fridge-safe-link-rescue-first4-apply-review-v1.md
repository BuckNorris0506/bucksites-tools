# Fridge safe-link rescue — first 4 owner apply-review packet

Generated: 2026-06-03T23:22:54.399Z

## Authorization (all false)

- mutation_authorized
- verified_link_authorized
- csv_apply_authorized
- supabase_mutation_authorized
- evidence_write_authorized

## Cohort

Slugs: edr4rxd1, edr3rxd1, gswf, 4396508

Owner apply-review ready: **3 / 4**

Sufficient to draft future apply plan (not authorize): **3 / 4**

## edr4rxd1

- Live: https://buckparts.com/filter/edr4rxd1 — **live_has_go_cta=false** (fridge_safe_link_rescue_owner_review_v1)
- Models linked: 21
- CSV: 1 row(s), 0 safe gated, primary=oem-parts-catalog::none
- Evidence: data/evidence/amazon-edr4rxd1-oem-pdp-evidence.2026-05-04.json
- Verdict: UNKNOWN / PASS_OEM_DIRECT_BUYABLE
- Exact-token proof: **PROVEN**
- Attribution: **oem_official** (oem_official)
- ASIN: B00UB38V2A — policy: **SHARED_ASIN_REUSE_OWNER_APPROVED_INSERT_PLAN_ELIGIBLE**
- Sufficient to draft future apply plan: **true** (ELIGIBLE_WITH_SHARED_ASIN_OWNER_REVIEW)
- Owner apply-review ready: **true**
- Remaining blockers:
  - mutation_authorized=false
  - verified_link_authorized=false
  - owner_batch_apply_approval_not_recorded
  - production_go_first_hop=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH
  - committed CSV has zero launch-buy-links safe gated rows
  - shared_asin_reuse_owner_policy_review_required
  - evidence_artifact_filter_slug=UNKNOWN — repo filters.csv now has slug; rerun prechecks before apply planning

## edr3rxd1

- Live: https://buckparts.com/filter/edr3rxd1 — **live_has_go_cta=false** (fridge_safe_link_rescue_owner_review_v1)
- Models linked: 19
- CSV: 1 row(s), 0 safe gated, primary=oem-parts-catalog::none
- Evidence: data/evidence/amazon-edr3rxd1-aftermarket-pdp-evidence.2026-05-04.json
- Verdict: UNKNOWN / PASS_AS_AFTERMARKET_COMPATIBLE_DIRECT_BUYABLE
- Exact-token proof: **PROVEN**
- Attribution: **aftermarket_compatible** (aftermarket_compatible)
- ASIN: B087PDLZL9 — policy: **SHARED_ASIN_REUSE_OWNER_APPROVED_INSERT_PLAN_ELIGIBLE**
- Sufficient to draft future apply plan: **true** (ELIGIBLE_WITH_SHARED_ASIN_OWNER_REVIEW)
- Owner apply-review ready: **true**
- Remaining blockers:
  - mutation_authorized=false
  - verified_link_authorized=false
  - owner_batch_apply_approval_not_recorded
  - production_go_first_hop=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH
  - committed CSV has zero launch-buy-links safe gated rows
  - shared_asin_reuse_owner_policy_review_required
  - evidence_artifact_filter_slug=UNKNOWN — repo filters.csv now has slug; rerun prechecks before apply planning

## gswf

- Live: https://buckparts.com/filter/gswf — **live_has_go_cta=false** (fridge_safe_link_rescue_owner_review_v1)
- Models linked: 17
- CSV: 1 row(s), 0 safe gated, primary=oem-parts-catalog::none
- Evidence: data/evidence/amazon-gswf-owner-review-pdp-evidence.2026-05-18.json
- Verdict: EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT / PASS_OEM_DIRECT_BUYABLE
- Exact-token proof: **PROVEN**
- Attribution: **oem_official** (oem_official)
- ASIN: B0002GTTRC — policy: **HUMAN_BROWSER_VERIFICATION_REQUIRED**
- Sufficient to draft future apply plan: **false** (UNKNOWN)
- Owner apply-review ready: **false**
- Not apply-ready reason: ASIN reuse/collision or proof set incomplete — human browser verification or precheck rerun required.
- Remaining blockers:
  - mutation_authorized=false
  - verified_link_authorized=false
  - owner_batch_apply_approval_not_recorded
  - production_go_first_hop=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH
  - committed CSV has zero launch-buy-links safe gated rows
  - human_browser_verification_required
  - gswf2_slug_exists_separate_exact_token_proof_required

## 4396508

- Live: https://buckparts.com/filter/4396508 — **live_has_go_cta=false** (fridge_safe_link_rescue_owner_review_v1)
- Models linked: 16
- CSV: 1 row(s), 0 safe gated, primary=oem-parts-catalog::none
- Evidence: data/evidence/amazon-4396508-owner-review-pdp-evidence.2026-05-10.json, data/evidence/amazon-4396508-unknown-outcome.2026-05-03.json
- Verdict: EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT / UNKNOWN
- Exact-token proof: **PROVEN**
- Attribution: **aftermarket_compatible** (aftermarket_compatible)
- ASIN: B00NXPKBQ2 — policy: **EXACT_PDP_PROVEN_NO_COLLISION**
- Sufficient to draft future apply plan: **true** (ELIGIBLE_NO_ASIN_COLLISION)
- Owner apply-review ready: **true**
- Remaining blockers:
  - mutation_authorized=false
  - verified_link_authorized=false
  - owner_batch_apply_approval_not_recorded
  - production_go_first_hop=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH
  - committed CSV has zero launch-buy-links safe gated rows

## Recommended next action

Owner review these four rows only. For slugs marked sufficient_to_draft_future_apply_plan=true, a separate guarded apply-plan artifact may be drafted later — this packet does not authorize CSV apply, Supabase writes, evidence mutation, Verified Link authorization, or production /go clicks.

