# Air Purifier Apply Run v1

Generated: 2026-05-23T13:05:01.895Z

## Status

| Field | Value |
|-------|-------|
| Mode | **dry_run** |
| Apply status | **BLOCKED** |
| Data mutation | false |
| Planned | 3 |
| Applied | 0 |
| Source plan | `data/air-purifier/batch-production/apply-plans/ap-apply-plan-v1.json` |

## Blocked reasons

- levoit-rf-lv-h133: current CSV row does not match plan before_row
- levoit-rf-lv-h128: current CSV row does not match plan before_row
- levoit-vital100-rf: current CSV row does not match plan before_row

## Rollback

3 rollback row(s) from plan — restore before_row snapshots if reverting.

## Notes

- Executor v1 mutates ONLY data/air-purifier/retailer_links.csv when --apply is set.
- planned_changes only — refused_changes and other review groups are never applied.
- Dry-run only — no CSV written. Pass --apply to mutate after owner approval.

