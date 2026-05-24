# Air Purifier Apply Plan — Batch v2 (Owner Approval)

Generated: 2026-05-24T05:39:50.319Z

**Source results:** `data/air-purifier/batch-production/agent-results-batch-v2`
**Synthesized mutations:** winix-hepa-115115, gg-flt5000, coway-max2-hepa, rabbit-biogs-minusa2

**NO CSV CHANGED · Read-only plan · Apply not run**
## Status

| Field | Value |
|-------|-------|
| Plan status | **READY_FOR_OWNER_APPROVAL** |
| Planned changes | 4 |
| Refused (total) | 19 |
| Source review | `data/air-purifier/batch-production/agent-results-batch-v2` |

## Projected coverage delta (if approved + applied later)

- Direct-buy safe CTA **+4**
- Blocked rows reduced (approx) **−4**

## Planned changes

### winix-hepa-115115 (oem-catalog)

- **Before URL:** https://www.winixamerica.com/search?q=WINIX-115115
- **After URL:** https://www.winixamerica.com/product/filter-a-115115/
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-05-24T05:39:50.321Z

### gg-flt5000 (oem-catalog)

- **Before URL:** https://www.germguardian.com/search?q=GUARDIAN-FLT5000
- **After URL:** https://guardiantechnologies.com/products/germguardian-flt5000-hepa-genuine-replacement-filter-c
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-05-24T05:39:50.321Z

### coway-max2-hepa (oem-catalog)

- **Before URL:** https://coway.com/search?q=COWAY-3304899
- **After URL:** https://cowaymega.com/products/airmega-200m-ap-1512hh-filter-set
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-05-24T05:39:50.321Z

### rabbit-biogs-minusa2 (oem-catalog)

- **Before URL:** https://www.rabbitair.com/search?q=RABBIT-BIOGS-MA2
- **After URL:** https://www.rabbitair.com/products/minusa2-hepa-filter
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-05-24T05:39:50.321Z

## Refused changes (sample — not auto-eligible or failed validation)

- **holmes-hapf30** (reference_eligible): not_auto_apply_eligible: review_group=reference_eligible; passes_reference_validation
- **shark-hepa-hp100** (reference_eligible): not_auto_apply_eligible: review_group=reference_eligible; passes_reference_validation
- **medify-ma25-rf** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **medify-ma40-rf** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **medify-ma50-rf** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **blueair-f2-211** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **blueair-pro-m-particle** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; owner_review_required_flag
- **levoit-rf-rar040** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **levoit-rf-rar060** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **levoit-rf-c131** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **levoit-rf-cr200** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- **levoit-vital200-rf** (owner_review_required): not_auto_apply_eligible: review_group=owner_review_required; agent_needs_owner_review
- _…and 7 more in JSON_

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

