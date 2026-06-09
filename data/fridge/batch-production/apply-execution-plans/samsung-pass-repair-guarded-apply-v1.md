# Samsung PASS repair guarded apply v1

Generated: 2026-06-09T17:12:20.110Z

## Status

- contract: `samsung_pass_repair_guarded_apply_v1`
- mode: **dry_run**
- apply_status: **DRY_RUN_READY**
- data_mutation: **false**
- owner_approval_valid: **true**
- owner_approval_decision_id: `decision-2026-06-09-samsung-pass-repair-approve_apply_plan`

## Sources

- apply_plan: `data/fridge/batch-production/drafts/samsung-pass-repair-apply-plan-v1.json`
- owner_approval: `data/owner-decisions/samsung-pass-repair-owner-approval-v1.json`
- target_csv: `data/compatibility_mappings.csv`

## Planned changes

- planned_slug_count: 5
- planned_removals: 6
- planned_additions: 5
- csv_row_count_before: 923
- csv_row_count_after: 922
- untouched_slug_row_keys_count: 917

## Before / after diff

| fridge_slug | before | after | remove | add |
| --- | --- | --- | --- | --- |
| `samsung-rf27t5201sr` | `da29-10105j` | `da97-17376b` | `da29-10105j` | `da97-17376b` |
| `samsung-rf27t5501sr` | `da29-00012b|da29-00020b` | `da97-17376b` | `da29-00012b|da29-00020b` | `da97-17376b` |
| `samsung-rf28r6301sr` | `da29-00019a` | `da97-17376b` | `da29-00019a` | `da97-17376b` |
| `samsung-rf28t5101sr` | `da29-00019a` | `da97-17376b` | `da29-00019a` | `da97-17376b` |
| `samsung-rs22t5201sg` | `da29-10105j` | `da97-17376b` | `da29-10105j` | `da97-17376b` |

## Row results

- `samsung-rf27t5201sr,da29-10105j` — remove — planned
- `samsung-rf27t5501sr,da29-00012b` — remove — planned
- `samsung-rf27t5501sr,da29-00020b` — remove — planned
- `samsung-rf28r6301sr,da29-00019a` — remove — planned
- `samsung-rf28t5101sr,da29-00019a` — remove — planned
- `samsung-rs22t5201sg,da29-10105j` — remove — planned
- `samsung-rf27t5201sr,da97-17376b` — add — planned
- `samsung-rf27t5501sr,da97-17376b` — add — planned
- `samsung-rf28r6301sr,da97-17376b` — add — planned
- `samsung-rf28t5101sr,da97-17376b` — add — planned
- `samsung-rs22t5201sg,da97-17376b` — add — planned

## Rollback instructions

- To rollback this Samsung PASS guarded apply, reverse the CSV row edits on data/compatibility_mappings.csv only:
- REMOVE rollback row: samsung-rf27t5201sr,da97-17376b (undo planned addition)
- REMOVE rollback row: samsung-rf27t5501sr,da97-17376b (undo planned addition)
- REMOVE rollback row: samsung-rf28r6301sr,da97-17376b (undo planned addition)
- REMOVE rollback row: samsung-rf28t5101sr,da97-17376b (undo planned addition)
- REMOVE rollback row: samsung-rs22t5201sg,da97-17376b (undo planned addition)
- ADD rollback row: samsung-rf27t5201sr,da29-10105j (restore planned removal)
- ADD rollback row: samsung-rf27t5501sr,da29-00012b (restore planned removal)
- ADD rollback row: samsung-rf27t5501sr,da29-00020b (restore planned removal)
- ADD rollback row: samsung-rf28r6301sr,da29-00019a (restore planned removal)
- ADD rollback row: samsung-rf28t5101sr,da29-00019a (restore planned removal)
- ADD rollback row: samsung-rs22t5201sg,da29-10105j (restore planned removal)
- Re-run dry-run after rollback to confirm before_mappings match the apply plan again.
- Rollback does not mutate Supabase, filters.csv, fridge_models.csv, manual evidence, pages, retailer links, sitemap/robots, or HQ handoff.

