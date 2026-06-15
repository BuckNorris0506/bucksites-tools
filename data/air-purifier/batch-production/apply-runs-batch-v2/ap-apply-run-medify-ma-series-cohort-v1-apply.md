# Air Purifier Apply Run v1

Generated: 2026-06-15T18:15:02.520Z

## Status

| Field | Value |
|-------|-------|
| Mode | **apply** |
| Apply status | **APPLIED** |
| Data mutation | true |
| Planned | 6 |
| Applied | 6 |
| Source plan | `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-medify-ma-series-cohort-v1.json` |

## Changed slugs

- medify-ma18-rf
- medify-ma22-rf
- medify-ma25-rf
- medify-ma40-rf
- medify-ma50-rf
- medify-ma112-rf

## Post-apply validation

- Changed rows: 6
- Only targets changed: true
- All direct_buyable: true
- No search URLs on targets: true
- AP safe_cta: 15 → 21 (Δ 6)

### Gate / link state

- **medify-ma18-rf**: gate=null, state=LIVE_DIRECT_BUYABLE
- **medify-ma22-rf**: gate=null, state=LIVE_DIRECT_BUYABLE
- **medify-ma25-rf**: gate=null, state=LIVE_DIRECT_BUYABLE
- **medify-ma40-rf**: gate=null, state=LIVE_DIRECT_BUYABLE
- **medify-ma50-rf**: gate=null, state=LIVE_DIRECT_BUYABLE
- **medify-ma112-rf**: gate=null, state=LIVE_DIRECT_BUYABLE

## Rollback

6 rollback row(s) from plan — restore before_row snapshots if reverting.

## Notes

- Executor v1 mutates ONLY data/air-purifier/retailer_links.csv when --apply is set.
- planned_changes only — refused_changes and other review groups are never applied.
- Applied 6 row(s) to data/air-purifier/retailer_links.csv.

