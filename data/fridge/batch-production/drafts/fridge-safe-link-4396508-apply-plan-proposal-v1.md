# Fridge safe-link 4396508 apply-plan proposal (read-only)

Generated: 2026-06-03T23:34:21.555Z

## Authorization

All false: mutation_authorized, verified_link_authorized, csv_apply_authorized, supabase_mutation_authorized, evidence_write_authorized.

apply_plan_ready: **true** | apply_plan_applied: **false**

## Live state (no /go clicked)

- URL: https://buckparts.com/filter/4396508
- live_has_go_cta: **false** (fridge_safe_link_rescue_owner_review_v1)

## Current CSV

- 1 row(s), 0 safe gated, primary=oem-parts-catalog:search_placeholder
- affiliate_url: https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=4396508

## Evidence

- data/evidence/amazon-4396508-owner-review-pdp-evidence.2026-05-10.json
- data/evidence/amazon-4396508-unknown-outcome.2026-05-03.json

- Summary: verdict=EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT; asin=B00NXPKBQ2; product_attribution=aftermarket_compatible; mutation_ready=false; asin_collision=EXACT_PDP_PROVEN_NO_COLLISION

## Proposed retailer_links row (proposal only)

Action: `propose_replace_search_placeholder_with_verified_direct_buyable`

- **filter_slug** = "4396508" (PROVEN: data/filters.csv + evidence.filter_slug)
- **retailer_name** = "Amazon" (INFERRED: repo CSV convention for amazon.com /dp/ rows)
- **affiliate_url** = "https://www.amazon.com/dp/B00NXPKBQ2?tag=buckparts20-20" (PROVEN: data/evidence/amazon-4396508-owner-review-pdp-evidence.2026-05-10.json.affiliate_url_candidate)
- **is_primary** = true (PROVEN: data/retailer_links.csv current row)
- **sort_order** = 0 (PROVEN: data/retailer_links.csv current row)
- **retailer_key** = "amazon" (INFERRED: amazon.com /dp/ URL in evidence)
- **browser_truth_classification** = null (UNKNOWN: data/evidence/amazon-4396508-owner-review-pdp-evidence.2026-05-10.json unknowns: does not prove runtime browser_truth classification)
- **browser_truth_buyable_subtype** = null (UNKNOWN: not present in evidence; do not infer without owner classification review)
- **browser_truth_notes** = "Owner browser screenshot showed seller-controlled product title with literal 4396508 on canonical Amazon PDP https://www.amazon.com/dp/B00NXPKBQ2. Owner browser screenshot showed buy box, price, In Stock, Add to Cart, and Buy Now visible on the single-pack PDP. product_attribution=aftermarket_compatible evidence=data/evidence/amazon-4396508-owner-review-pdp-evidence.2026-05-10.json" (PROVEN: evidence exact_token_proof + buyability_proof + product_attribution)
- **browser_truth_checked_at** = "2026-05-10" (PROVEN: data/evidence/amazon-4396508-owner-review-pdp-evidence.2026-05-10.json.generated_at)

## Unknown fields

- browser_truth_classification
- browser_truth_buyable_subtype
- supabase.link_id
- supabase.status
- supabase.source
- supabase.destination_url
- production_go_first_hop_outcome

## Blockers before apply

- mutation_authorized=false
- verified_link_authorized=false
- csv_apply_authorized=false
- supabase_mutation_authorized=false
- owner_apply_plan_approval_not_recorded
- owner_batch_run_registry_for_safe_link_rescue_not_created
- production_go_first_hop=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH
- evidence.mutation_ready=false
- committed CSV still search-placeholder (oem-parts-catalog); zero safe gated rows
- runtime browser_truth_classification UNKNOWN until owner sets classification on apply
- 2-pack and 3-pack variants seen in evidence are not proven safe by primary evidence file

## Owner approval needed next

- Review proposed Amazon aftermarket-compatible single-pack PDP for exact token 4396508.
- Confirm browser_truth_classification and browser_truth_buyable_subtype before any guarded apply executor.
- Record explicit owner approval for a future single-slug CSV/Supabase apply plan — this proposal does not authorize apply.
- Require fresh read-only precheck immediately before any mutation: npm run buckparts:precheck:amazon-refrigerator-tokens -- --tokens 4396508
- Do not click production /go until a separate no-click or local validation policy exists.

## Rollback / revert plan

- If a future guarded apply writes CSV/Supabase and post-apply validation fails, revert committed data/retailer_links.csv row for filter_slug=4396508 to:
-   retailer_name="OEM parts catalog (keyword lookup)"
-   affiliate_url="https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=4396508"
-   retailer_key="oem-parts-catalog"
-   browser_truth_classification=""
- If Supabase row was inserted, delete or disable the inserted retailer_links row only after owner-confirmed rollback packet.
- Re-run read-only parity diff (fridge-supabase-vs-csv) and live HTML scan (no /go clicks) to confirm /go CTA state returns to pre-apply baseline.
- Do not delete evidence artifacts; rollback is data-path only.

## Recommended next action

Owner review this single-slug apply-plan proposal. If approved, record owner decision and create a separate guarded apply executor packet — do not mutate CSV, Supabase, evidence, or authorize Verified Links from this artifact alone.

