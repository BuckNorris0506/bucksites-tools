# Air Purifier Apply Run v1

Generated: 2026-06-13T00:40:11.324Z

## Status

| Field | Value |
|-------|-------|
| Mode | **apply** |
| Apply status | **APPLIED** |
| Data mutation | true |
| Planned | 4 |
| Applied | 4 |
| Source plan | `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json` |

## Changed slugs

- levoit-rf-rar040
- levoit-rf-rar060
- levoit-rf-c131
- levoit-rf-cr200

## Post-apply validation

- Changed rows: 4
- Only targets changed: true
- All direct_buyable: true
- No search URLs on targets: true
- AP safe_cta: 11 → 15 (Δ 4)

### Gate / link state

- **levoit-rf-rar040**: gate=null, state=LIVE_DIRECT_BUYABLE
- **levoit-rf-rar060**: gate=null, state=LIVE_DIRECT_BUYABLE
- **levoit-rf-c131**: gate=null, state=LIVE_DIRECT_BUYABLE
- **levoit-rf-cr200**: gate=null, state=LIVE_DIRECT_BUYABLE

## Rollback

4 rollback row(s) from plan — restore before_row snapshots if reverting.

## Notes

- Executor v1 mutates ONLY data/air-purifier/retailer_links.csv when --apply is set.
- planned_changes only — refused_changes and other review groups are never applied.
- Applied 4 row(s) to data/air-purifier/retailer_links.csv.

