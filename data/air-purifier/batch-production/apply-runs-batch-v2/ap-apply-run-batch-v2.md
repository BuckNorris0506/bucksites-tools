# Air Purifier Apply Run v1

Generated: 2026-05-24T05:44:39.235Z

## Status

| Field | Value |
|-------|-------|
| Mode | **apply** |
| Apply status | **APPLIED** |
| Data mutation | true |
| Planned | 4 |
| Applied | 4 |
| Source plan | `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json` |

## Changed slugs

- winix-hepa-115115
- gg-flt5000
- coway-max2-hepa
- rabbit-biogs-minusa2

## Post-apply validation

- Changed rows: 4
- Only targets changed: true
- All direct_buyable: true
- No search URLs on targets: true
- AP safe_cta: 6 → 10 (Δ 4)

### Gate / link state

- **winix-hepa-115115**: gate=null, state=LIVE_DIRECT_BUYABLE
- **gg-flt5000**: gate=null, state=LIVE_DIRECT_BUYABLE
- **coway-max2-hepa**: gate=null, state=LIVE_DIRECT_BUYABLE
- **rabbit-biogs-minusa2**: gate=null, state=LIVE_DIRECT_BUYABLE

## Rollback

4 rollback row(s) from plan — restore before_row snapshots if reverting.

## Notes

- Executor v1 mutates ONLY data/air-purifier/retailer_links.csv when --apply is set.
- planned_changes only — refused_changes and other review groups are never applied.
- Applied 4 row(s) to data/air-purifier/retailer_links.csv.

