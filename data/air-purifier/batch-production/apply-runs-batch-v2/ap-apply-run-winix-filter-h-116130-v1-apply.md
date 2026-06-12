# Air Purifier Apply Run v1

Generated: 2026-06-12T19:06:58.068Z

## Status

| Field | Value |
|-------|-------|
| Mode | **apply** |
| Apply status | **APPLIED** |
| Data mutation | true |
| Planned | 1 |
| Applied | 1 |
| Source plan | `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-winix-filter-h-116130-v1.json` |

## Changed slugs

- winix-filter-h-116130

## Post-apply validation

- Changed rows: 1
- Only targets changed: true
- All direct_buyable: true
- No search URLs on targets: true
- AP safe_cta: 10 → 11 (Δ 1)

### Gate / link state

- **winix-filter-h-116130**: gate=null, state=LIVE_DIRECT_BUYABLE

## Rollback

1 rollback row(s) from plan — restore before_row snapshots if reverting.

## Notes

- Executor v1 mutates ONLY data/air-purifier/retailer_links.csv when --apply is set.
- planned_changes only — refused_changes and other review groups are never applied.
- Applied 1 row(s) to data/air-purifier/retailer_links.csv.

