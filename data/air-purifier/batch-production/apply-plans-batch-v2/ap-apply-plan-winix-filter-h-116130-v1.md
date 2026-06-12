# Air Purifier Apply Plan — Batch v2 (Owner Approval)

Generated: 2026-06-12T18:47:54.121Z

**Source results:** `data/air-purifier/batch-production/agent-results-batch-v2`
**Synthesized mutations:** winix-hepa-115115, winix-filter-h-116130, gg-flt5000, coway-max2-hepa, rabbit-biogs-minusa2

**NO CSV CHANGED · Read-only plan · Apply not run**
## Status

| Field | Value |
|-------|-------|
| Plan status | **READY_FOR_OWNER_APPROVAL** |
| Planned changes | 1 |
| Refused (total) | 23 |
| Source review | `data/air-purifier/batch-production/agent-results-batch-v2` |

## Projected coverage delta (if approved + applied later)

- Direct-buy safe CTA **+1**
- Blocked rows reduced (approx) **−1**

## Planned changes

### winix-filter-h-116130 (oem-catalog)

- **Before URL:** https://www.winixamerica.com/search?q=WINIX-116130
- **After URL:** https://www.winixamerica.com/product/filter-h-116130/
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-06-12T18:47:54.123Z

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
- _…and 11 more in JSON_

## Rollback

1 before_row snapshot(s) captured in plan JSON `rollback_rows` for revert if needed.

## Validation checklist

- Confirm owner approval for each of the 4 batch-v2 direct-buy slugs before apply.
- Re-run buyLinkGateFailureKind on after_row payloads — expect null for direct_buyable.
- Verify /air-purifier/go remains safe-only after apply (future executor step).
- Keep rollback_rows to revert data/air-purifier/retailer_links.csv if needed.
- Do not edit data/retailer_links.csv (fridge batch).
- npm run lint && npm run build after apply executor (future task).

## Next action

Owner approve 1 batch-v2 planned change(s), then run apply executor with --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json (not run in this step).

