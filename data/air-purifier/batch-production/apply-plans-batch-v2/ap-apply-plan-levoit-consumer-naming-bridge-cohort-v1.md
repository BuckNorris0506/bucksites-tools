# Air Purifier Apply Plan — Batch v2 (Owner Approval)

Generated: 2026-06-12T22:15:23.990Z

**Source results:** `data/air-purifier/batch-production/agent-results-batch-v2`
**Synthesized mutations:** levoit-rf-rar040, levoit-rf-rar060, levoit-rf-c131, levoit-rf-cr200, winix-hepa-115115, winix-filter-h-116130, gg-flt5000, coway-max2-hepa, rabbit-biogs-minusa2

**NO CSV CHANGED · Read-only plan · Apply not run**
## Status

| Field | Value |
|-------|-------|
| Plan status | **READY_FOR_OWNER_APPROVAL** |
| Planned changes | 4 |
| Refused (total) | 20 |
| Source review | `data/air-purifier/batch-production/agent-results-batch-v2` |

## Projected coverage delta (if approved + applied later)

- Direct-buy safe CTA **+4**
- Blocked rows reduced (approx) **−4**

## Planned changes

### levoit-rf-rar040 (oem-catalog)

- **Before URL:** https://levoit.com/search?q=LEVOIT-RF-RAR040
- **After URL:** https://levoit.com/products/core-400s-p-3-stage-replacement-filter
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-06-12T22:15:23.992Z

### levoit-rf-rar060 (oem-catalog)

- **Before URL:** https://levoit.com/search?q=LEVOIT-RF-RAR060
- **After URL:** https://levoit.com/products/core-600s-p-original-replacement-filter
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-06-12T22:15:23.992Z

### levoit-rf-c131 (oem-catalog)

- **Before URL:** https://levoit.com/search?q=LEVOIT-RF-C131
- **After URL:** https://levoit.com/products/lv-pur131-air-purifier-replacement-filter
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-06-12T22:15:23.992Z

### levoit-rf-cr200 (oem-catalog)

- **Before URL:** https://levoit.com/search?q=LEVOIT-RF-CR200
- **After URL:** https://levoit.com/products/core-200s-p-replacement-filter
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-06-12T22:15:23.992Z

## Refused changes (sample — not auto-eligible or failed validation)

- **holmes-hapf30** (reference_eligible): not_auto_apply_eligible: review_group=reference_eligible; passes_reference_validation
- **shark-hepa-hp100** (reference_eligible): not_auto_apply_eligible: review_group=reference_eligible; passes_reference_validation
- **medify-ma25-rf** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **medify-ma40-rf** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **medify-ma50-rf** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **blueair-f2-211** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **blueair-pro-m-particle** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; owner_review_required_flag
- **levoit-vital200-rf** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **winix-carbon-116131** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **rabbit-carbon-minusa2** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **coway-airmega250-rf** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **levoit-rf-rar029** (rejected): not_auto_apply_eligible: review_group=rejected; REJECT_WRONG_FAMILY
- _…and 8 more in JSON_

## Rollback

4 before_row snapshot(s) captured in plan JSON `rollback_rows` for revert if needed.

## Validation checklist

- Confirm owner approval for each of the 4 batch-v2 direct-buy slugs before apply.
- Re-run buyLinkGateFailureKind on after_row payloads — expect null for direct_buyable.
- Verify /air-purifier/go remains safe-only after apply (future executor step).
- Keep rollback_rows to revert data/air-purifier/retailer_links.csv if needed.
- Do not edit data/retailer_links.csv (fridge batch).
- npm run lint && npm run build after apply executor (future task).

## Next action

Owner approve 4 batch-v2 planned change(s), then run apply executor with --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json (not run in this step).

