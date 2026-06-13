# Air Purifier Apply Run v1

Generated: 2026-06-13T00:08:59.971Z

## Status

| Field | Value |
|-------|-------|
| Mode | **dry_run** |
| Apply status | **DRY_RUN_READY** |
| Data mutation | false |
| Planned | 4 |
| Applied | 0 |
| Source plan | `data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-levoit-consumer-naming-bridge-cohort-v1.json` |

## Rollback

4 rollback row(s) from plan — restore before_row snapshots if reverting.

## Notes

- Executor v1 mutates ONLY data/air-purifier/retailer_links.csv when --apply is set.
- planned_changes only — refused_changes and other review groups are never applied.
- Dry-run only — no CSV written. Pass --apply to mutate after owner approval.

