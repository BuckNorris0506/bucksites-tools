# Air Purifier Apply Plan v1 — Owner Approval

Generated: 2026-05-23T05:26:02.269Z

**NO CSV CHANGED · Read-only plan · Apply executor not available**

## Status

| Field | Value |
|-------|-------|
| Plan status | **READY_FOR_OWNER_APPROVAL** |
| Planned changes | 3 |
| Refused (total) | 16 |
| Source review | `data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.json` |

## Projected coverage delta (if approved + applied later)

- Direct-buy safe CTA **+3**
- Blocked rows reduced (approx) **−3**

## Planned changes

### levoit-rf-lv-h133 (oem-catalog)

- **Before URL:** https://levoit.com/search?q=LEVOIT-RF-LV-H133
- **After URL:** https://levoit.com/products/lv-h133-air-purifier-tower-replacement-filter
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-05-23T05:11:38.529Z

### levoit-rf-lv-h128 (oem-catalog)

- **Before URL:** https://levoit.com/search?q=LEVOIT-RF-LV-H128
- **After URL:** https://levoit.com/products/lv-h128-replacement-filter
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-05-23T05:11:38.529Z

### levoit-vital100-rf (oem-catalog)

- **Before URL:** https://levoit.com/search?q=LEVOIT-VITAL100-RF
- **After URL:** https://levoit.com/products/vital100-air-purifier-replacement-filter
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-05-23T05:11:38.529Z

## Refused changes (sample — not auto-eligible or failed validation)

- **medify-ma25-rf** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; validation:pass_direct_buyable_with_wrong_family_tokens
- **medify-ma40-rf** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; validation:pass_direct_buyable_with_wrong_family_tokens
- **medify-ma50-rf** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; validation:pass_direct_buyable_with_wrong_family_tokens
- **levoit-rf-rar040** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **levoit-rf-rar060** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **levoit-rf-c131** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **levoit-rf-cr200** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **holmes-hapf30** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; reference_retailer_not_on_allowlist
- **winix-carbon-116131** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **winix-hepa-115115** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; validation:pass_direct_buyable_with_wrong_family_tokens
- **gg-flt5000** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; validation:pass_direct_buyable_with_wrong_family_tokens
- **coway-max2-hepa** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; validation:pass_direct_buyable_with_wrong_family_tokens
- _…and 4 more in JSON_

## Rollback

3 before_row snapshot(s) captured in plan JSON `rollback_rows` for revert if needed.

## Validation checklist

- Confirm owner approval for each planned slug before any apply executor runs.
- Re-run buyLinkGateFailureKind on after_row payloads — expect null for direct_buyable.
- Verify /air-purifier/go remains safe-only after apply (future executor step).
- Keep rollback_rows to revert data/air-purifier/retailer_links.csv if needed.
- npm run lint && npm run build after apply executor (future task).
- node --import tsx --test scripts/report-air-purifier-batch-production-lane-v1.test.ts
- npx tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts

## Next action

Owner approve 3 planned change(s), then run a future apply executor (not implemented). Do not edit CSV manually without this plan.

