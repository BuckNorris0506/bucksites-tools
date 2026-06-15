# Air Purifier Apply Plan — Batch v2 (Owner Approval)

Generated: 2026-06-15T17:49:12.386Z

**Source results:** `data/air-purifier/batch-production/agent-results-batch-v2`
**Synthesized mutations:** medify-ma18-rf, medify-ma22-rf, medify-ma25-rf, medify-ma40-rf, medify-ma50-rf, medify-ma112-rf

**NO CSV CHANGED · Read-only plan · Apply not run**
## Status

| Field | Value |
|-------|-------|
| Plan status | **READY_FOR_OWNER_APPROVAL** |
| Planned changes | 6 |
| Refused (total) | 0 |
| Source review | `data/air-purifier/batch-production/agent-results-batch-v2` |

## Projected coverage delta (if approved + applied later)

- Direct-buy safe CTA **+6**
- Blocked rows reduced (approx) **−6**

## Planned changes

### medify-ma18-rf (oem-catalog)

- **Before URL:** https://medifyair.com/search?q=MEDIFY-MA-18-RF
- **After URL:** https://medifyair.com/products/ma-18-replacement-filter
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-06-15T17:49:12.389Z

### medify-ma22-rf (oem-catalog)

- **Before URL:** https://medifyair.com/search?q=MEDIFY-MA-22-RF
- **After URL:** https://medifyair.com/products/ma-22-replacement-filter
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-06-15T17:49:12.389Z

### medify-ma25-rf (oem-catalog)

- **Before URL:** https://medifyair.com/search?q=MEDIFY-MA-25-RF
- **After URL:** https://medifyair.com/products/ma-25-replacement-filter-set
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-06-15T17:49:12.389Z

### medify-ma40-rf (oem-catalog)

- **Before URL:** https://medifyair.com/search?q=MEDIFY-MA-40-RF
- **After URL:** https://medifyair.com/products/ma-40-replacement-filter-set
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-06-15T17:49:12.389Z

### medify-ma50-rf (oem-catalog)

- **Before URL:** https://medifyair.com/search?q=MEDIFY-MA-50-RF
- **After URL:** https://medifyair.com/products/ma-50-replacement-filter
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-06-15T17:49:12.389Z

### medify-ma112-rf (oem-catalog)

- **Before URL:** https://medifyair.com/search?q=MEDIFY-MA-112-RF
- **After URL:** https://medifyair.com/products/ma-112-filter-replacement-set
- **Classification:** (empty) → **direct_buyable**
- **Changed fields:** destination_url, affiliate_url, browser_truth_classification, browser_truth_notes, browser_truth_checked_at
- **Checked at:** 2026-06-15T17:49:12.389Z

## Refused changes (sample — not auto-eligible or failed validation)


## Rollback

6 before_row snapshot(s) captured in plan JSON `rollback_rows` for revert if needed.

## Validation checklist

- Confirm owner approval covers exactly the six Medify MA-series slugs in planned_changes before apply.
- Confirm medify-ma35-rf and archived Amazon-secondary rows are not planned targets.
- Re-run buyLinkGateFailureKind on after_row payloads — expect null for direct_buyable.
- Verify /air-purifier/go remains safe-only after apply (future executor step).
- Keep rollback_rows to revert data/air-purifier/retailer_links.csv if needed.
- Do not edit data/retailer_links.csv (fridge batch).
- npm run lint && npm run build after apply executor (future task).

## Next action

Owner approve 6 Medify MA-series planned change(s), then run apply executor with --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json in a future step (not run in this step).

