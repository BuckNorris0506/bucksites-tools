# Fridge safe-link ukf8001 apply-plan proposal (read-only)

Generated: 2026-06-27T04:28:07.375Z

## Authorization

All false: mutation_authorized, verified_link_authorized, csv_apply_authorized, supabase_mutation_authorized.

apply_plan_ready: **true** | apply_plan_applied: **false**

## Scope

- target_slug: **ukf8001**
- excluded_slugs: da29-00020b, 4396710, 4396841
- excluded_asins: B087PDLZL9

## Current CSV

- 1 row(s), 0 safe gated, primary=oem-parts-catalog:search_placeholder
- affiliate_url: https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=UKF8001

## Supabase parity

- B_EVIDENCE_APPLIED_SUPABASE_ONLY — CSV primary still oem-parts-catalog search placeholder
- link_id: b1cc3087-935a-4890-8dfe-af6586c65997

## Evidence

- data/evidence/amazon-ukf8001-live-outcome.2026-05-05.json

- Summary: verdict=LIVE_OUTCOME_RECORDED; asin=B07C8C2VBH; product_attribution=aftermarket_compatible; mutation_ready=false; asin_collision=EXACT_PDP_PROVEN_NO_COLLISION; supabase_link_id=b1cc3087-935a-4890-8dfe-af6586c65997

## Proposed retailer_links row (proposal only)

Action: `propose_replace_search_placeholder_with_verified_direct_buyable`

- **filter_slug** = "ukf8001" (PROVEN: data/filters.csv + evidence.filter_slug)
- **retailer_name** = "Amazon" (PROVEN: data/evidence/amazon-ukf8001-live-outcome.2026-05-05.json.committed_live_row.retailer_name)
- **affiliate_url** = "https://www.amazon.com/dp/B07C8C2VBH?tag=buckparts20-20" (PROVEN: data/evidence/amazon-ukf8001-live-outcome.2026-05-05.json.committed_live_row.affiliate_url)
- **is_primary** = true (PROVEN: CSV primary row promotion; Supabase row is_primary=false)
- **sort_order** = 0 (PROVEN: data/retailer_links.csv current row)
- **retailer_key** = "amazon" (PROVEN: data/evidence/amazon-ukf8001-live-outcome.2026-05-05.json.committed_live_row.retailer_key)
- **browser_truth_classification** = "direct_buyable" (PROVEN: data/evidence/amazon-ukf8001-live-outcome.2026-05-05.json.committed_live_row.browser_truth_classification)
- **browser_truth_buyable_subtype** = "COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE" (PROVEN: data/evidence/amazon-ukf8001-live-outcome.2026-05-05.json.committed_live_row.browser_truth_buyable_subtype)
- **browser_truth_notes** = "Amazon Basics compatible replacement for UKF8001 (ASIN B07C8C2VBH); PDP title includes UKF8001; aftermarket compatible, not OEM. Evidence amazon-ukf8001-aftermarket-pdp-evidence.2026-05-04.json (superseded). Live outcome: amazon-ukf8001-live-outcome.2026-05-05.json." (PROVEN: data/evidence/amazon-ukf8001-live-outcome.2026-05-05.json.committed_live_row.browser_truth_notes)
- **browser_truth_checked_at** = "2026-05-05" (PROVEN: data/evidence/amazon-ukf8001-live-outcome.2026-05-05.json.committed_live_row.browser_truth_checked_at)

## Expected census delta

- SAFE_BUYER_PATH_SUPPRESSED_TRUST → SAFE_BUYER_PATH_PROVEN (+1)

## Post-apply validation checklist

- **census_rerun**: `npm run buckparts:all-product-safe-buyer-path-census` — Confirm ukf8001 moves from SAFE_BUYER_PATH_SUPPRESSED_TRUST to SAFE_BUYER_PATH_PROVEN (+1 delta).
- **go_route_parity**: `Read-only: verify /go for filter ukf8001 resolves to ASIN B07C8C2VBH affiliate URL — no automated click.` — Parity with committed_live_row in live-outcome evidence; do not click production /go without policy.
- **model_filter_correctness_audit**: `npm run buckparts:model-filter-correctness-audit` — Confirm ukf8001 filter/model mappings unchanged; no wrong-family regression.
- **deploy_classifier**: `npm run buckparts:deploy-classifier` — Classify deploy requirement after data/retailer_links.csv mutation.

## Blockers before apply

- mutation_authorized=false
- verified_link_authorized=false
- csv_apply_authorized=false
- supabase_mutation_authorized=false
- owner_apply_plan_approval_not_recorded
- committed CSV still search-placeholder (oem-parts-catalog); zero safe gated rows
- evidence.mutation_ready=false (live-outcome records manual Supabase insert; CSV parity pending)

## Owner approval needed next

- Review proposed Amazon Basics compatible replacement (ASIN B07C8C2VBH) for exact token UKF8001.
- Confirm aftermarket_compatible attribution is acceptable for buyer path.
- Fill and commit founder decision from data/fridge/batch-production/drafts/fridge-safe-link-ukf8001-founder-decision-template-v1.json with allowed_next_scope=owner_mutation_approved.
- Run guarded dry-run: npm run buckparts:fridge-safe-link-ukf8001-guarded-apply
- Only after founder approval: npm run buckparts:fridge-safe-link-ukf8001-guarded-apply -- --write-csv
- Do not batch with da29-00020b, 4396710, 4396841, or Waterdrop HARD_DO_NOT_USE ASIN B087PDLZL9.

## Rollback / revert plan

- If guarded apply writes CSV and post-apply validation fails, revert data/retailer_links.csv row for filter_slug=ukf8001 to:
-   retailer_name="OEM parts catalog (keyword lookup)"
-   affiliate_url="https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=UKF8001"
-   retailer_key="oem-parts-catalog"
-   browser_truth_classification=""
- Supabase row b1cc3087-935a-4890-8dfe-af6586c65997 already exists — CSV rollback does not delete Supabase.
- Re-run census and model-filter audit after rollback.

## Recommended next action

Owner review apply-plan proposal and founder decision template. Run guarded dry-run. Record founder approval before --write-csv.

