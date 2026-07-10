# GSWF wrong-part repair guarded apply dry-run v1

Generated: 2026-07-10T14:56:01.334Z

## Status

- contract: `gswf_wrong_part_repair_guarded_apply_v1`
- mode: **dry_run**
- apply_status: **DRY_RUN_READY**
- data_mutation: **false**
- owner_approval_valid: **false**
- owner_approval_required_for_apply: **true**
- owner_approval_decision_id: `none`

## Sources

- apply_plan: `data/fridge/batch-production/drafts/gswf-wrong-part-repair-apply-plan-owner-review-v1.json`
- owner_approval: `data/owner-decisions/gswf-wrong-part-repair-owner-approval-v1.json`
- target_csv: `data/compatibility_mappings.csv` (not modified in dry-run)

## Planned changes

- planned_slug_count: 13
- planned_removals: 26
- planned_additions: 13
- csv_row_count_before: 922
- csv_row_count_after: 909
- untouched_slug_row_keys_count: 891
- excluded_slugs_untouched: `ge-gfe28hmkww|ge-gsc25frshss|ge-gse26gshess|ge-gte18gsnrss`

## Exact CSV row deltas

- **remove** `ge-cwe23sshww,gswf`
- **remove** `ge-cwe23sshww,gswf2`
- **add** `ge-cwe23sshww,rpwfe`
- **remove** `ge-gfe24jgkww,gswf`
- **remove** `ge-gfe24jgkww,gswf2`
- **add** `ge-gfe24jgkww,xwfe`
- **remove** `ge-gfe27jmkes,gswf`
- **remove** `ge-gfe27jmkes,gswf2`
- **add** `ge-gfe27jmkes,xwfe`
- **remove** `ge-gfe28gmkbb,gswf`
- **remove** `ge-gfe28gmkbb,gswf2`
- **add** `ge-gfe28gmkbb,rpwfe`
- **remove** `ge-gfe28gskes,gswf`
- **remove** `ge-gfe28gskes,gswf2`
- **add** `ge-gfe28gskes,rpwfe`
- **remove** `ge-gfe28hskss,gswf`
- **remove** `ge-gfe28hskss,gswf2`
- **add** `ge-gfe28hskss,rpwfe`
- **remove** `ge-gne25jmkww,gswf`
- **remove** `ge-gne25jmkww,gswf2`
- **add** `ge-gne25jmkww,xwfe`
- **remove** `ge-gne27jstss,gswf`
- **remove** `ge-gne27jstss,gswf2`
- **add** `ge-gne27jstss,xwfe`
- **remove** `ge-gse25hskss,gswf`
- **remove** `ge-gse25hskss,gswf2`
- **add** `ge-gse25hskss,xwfe`
- **remove** `ge-gye22gskww,gswf`
- **remove** `ge-gye22gskww,gswf2`
- **add** `ge-gye22gskww,rpwfe`
- **remove** `ge-pfe28kmkww,gswf`
- **remove** `ge-pfe28kmkww,gswf2`
- **add** `ge-pfe28kmkww,rpwfe`
- **remove** `ge-pfe28kynbb,gswf`
- **remove** `ge-pfe28kynbb,gswf2`
- **add** `ge-pfe28kynbb,rpwfe`
- **remove** `ge-pvd28bymfs,gswf`
- **remove** `ge-pvd28bymfs,gswf2`
- **add** `ge-pvd28bymfs,xwfe`

## Before / after diff

| fridge_slug | before | after | remove | add | preserved |
| --- | --- | --- | --- | --- | --- |
| `ge-cwe23sshww` | `gswf|gswf2` | `rpwfe` | `gswf|gswf2` | `rpwfe` | `none` |
| `ge-gfe24jgkww` | `gswf|gswf2|smartwater-mwfp` | `smartwater-mwfp|xwfe` | `gswf|gswf2` | `xwfe` | `smartwater-mwfp` |
| `ge-gfe27jmkes` | `gswf|gswf2` | `xwfe` | `gswf|gswf2` | `xwfe` | `none` |
| `ge-gfe28gmkbb` | `gswf|gswf2` | `rpwfe` | `gswf|gswf2` | `rpwfe` | `none` |
| `ge-gfe28gskes` | `gswf|gswf2` | `rpwfe` | `gswf|gswf2` | `rpwfe` | `none` |
| `ge-gfe28hskss` | `gswf|gswf2|smartwater-mwfp` | `rpwfe|smartwater-mwfp` | `gswf|gswf2` | `rpwfe` | `smartwater-mwfp` |
| `ge-gne25jmkww` | `gswf|gswf2` | `xwfe` | `gswf|gswf2` | `xwfe` | `none` |
| `ge-gne27jstss` | `gswf|gswf2|xwf` | `xwf|xwfe` | `gswf|gswf2` | `xwfe` | `xwf` |
| `ge-gse25hskss` | `gswf|gswf2|xwf` | `xwf|xwfe` | `gswf|gswf2` | `xwfe` | `xwf` |
| `ge-gye22gskww` | `gswf|gswf2` | `rpwfe` | `gswf|gswf2` | `rpwfe` | `none` |
| `ge-pfe28kmkww` | `gswf|gswf2|xwf` | `rpwfe|xwf` | `gswf|gswf2` | `rpwfe` | `xwf` |
| `ge-pfe28kynbb` | `gswf|gswf2` | `rpwfe` | `gswf|gswf2` | `rpwfe` | `none` |
| `ge-pvd28bymfs` | `gswf|gswf2` | `xwfe` | `gswf|gswf2` | `xwfe` | `none` |

## Row results

- `ge-cwe23sshww,gswf` — remove — planned
- `ge-cwe23sshww,gswf2` — remove — planned
- `ge-gfe24jgkww,gswf` — remove — planned
- `ge-gfe24jgkww,gswf2` — remove — planned
- `ge-gfe27jmkes,gswf` — remove — planned
- `ge-gfe27jmkes,gswf2` — remove — planned
- `ge-gfe28gmkbb,gswf` — remove — planned
- `ge-gfe28gmkbb,gswf2` — remove — planned
- `ge-gfe28gskes,gswf` — remove — planned
- `ge-gfe28gskes,gswf2` — remove — planned
- `ge-gfe28hskss,gswf` — remove — planned
- `ge-gfe28hskss,gswf2` — remove — planned
- `ge-gne25jmkww,gswf` — remove — planned
- `ge-gne25jmkww,gswf2` — remove — planned
- `ge-gne27jstss,gswf` — remove — planned
- `ge-gne27jstss,gswf2` — remove — planned
- `ge-gse25hskss,gswf` — remove — planned
- `ge-gse25hskss,gswf2` — remove — planned
- `ge-gye22gskww,gswf` — remove — planned
- `ge-gye22gskww,gswf2` — remove — planned
- `ge-pfe28kmkww,gswf` — remove — planned
- `ge-pfe28kmkww,gswf2` — remove — planned
- `ge-pfe28kynbb,gswf` — remove — planned
- `ge-pfe28kynbb,gswf2` — remove — planned
- `ge-pvd28bymfs,gswf` — remove — planned
- `ge-pvd28bymfs,gswf2` — remove — planned
- `ge-cwe23sshww,rpwfe` — add — planned
- `ge-gfe24jgkww,xwfe` — add — planned
- `ge-gfe27jmkes,xwfe` — add — planned
- `ge-gfe28gmkbb,rpwfe` — add — planned
- `ge-gfe28gskes,rpwfe` — add — planned
- `ge-gfe28hskss,rpwfe` — add — planned
- `ge-gne25jmkww,xwfe` — add — planned
- `ge-gne27jstss,xwfe` — add — planned
- `ge-gse25hskss,xwfe` — add — planned
- `ge-gye22gskww,rpwfe` — add — planned
- `ge-pfe28kmkww,rpwfe` — add — planned
- `ge-pfe28kynbb,rpwfe` — add — planned
- `ge-pvd28bymfs,xwfe` — add — planned

## Rollback instructions

- To rollback a future GSWF wrong-part guarded apply, reverse the CSV row edits on data/compatibility_mappings.csv only:
- REMOVE rollback row: ge-cwe23sshww,rpwfe (undo planned addition)
- REMOVE rollback row: ge-gfe24jgkww,xwfe (undo planned addition)
- REMOVE rollback row: ge-gfe27jmkes,xwfe (undo planned addition)
- REMOVE rollback row: ge-gfe28gmkbb,rpwfe (undo planned addition)
- REMOVE rollback row: ge-gfe28gskes,rpwfe (undo planned addition)
- REMOVE rollback row: ge-gfe28hskss,rpwfe (undo planned addition)
- REMOVE rollback row: ge-gne25jmkww,xwfe (undo planned addition)
- REMOVE rollback row: ge-gne27jstss,xwfe (undo planned addition)
- REMOVE rollback row: ge-gse25hskss,xwfe (undo planned addition)
- REMOVE rollback row: ge-gye22gskww,rpwfe (undo planned addition)
- REMOVE rollback row: ge-pfe28kmkww,rpwfe (undo planned addition)
- REMOVE rollback row: ge-pfe28kynbb,rpwfe (undo planned addition)
- REMOVE rollback row: ge-pvd28bymfs,xwfe (undo planned addition)
- ADD rollback row: ge-cwe23sshww,gswf (restore planned removal)
- ADD rollback row: ge-cwe23sshww,gswf2 (restore planned removal)
- ADD rollback row: ge-gfe24jgkww,gswf (restore planned removal)
- ADD rollback row: ge-gfe24jgkww,gswf2 (restore planned removal)
- ADD rollback row: ge-gfe27jmkes,gswf (restore planned removal)
- ADD rollback row: ge-gfe27jmkes,gswf2 (restore planned removal)
- ADD rollback row: ge-gfe28gmkbb,gswf (restore planned removal)
- ADD rollback row: ge-gfe28gmkbb,gswf2 (restore planned removal)
- ADD rollback row: ge-gfe28gskes,gswf (restore planned removal)
- ADD rollback row: ge-gfe28gskes,gswf2 (restore planned removal)
- ADD rollback row: ge-gfe28hskss,gswf (restore planned removal)
- ADD rollback row: ge-gfe28hskss,gswf2 (restore planned removal)
- ADD rollback row: ge-gne25jmkww,gswf (restore planned removal)
- ADD rollback row: ge-gne25jmkww,gswf2 (restore planned removal)
- ADD rollback row: ge-gne27jstss,gswf (restore planned removal)
- ADD rollback row: ge-gne27jstss,gswf2 (restore planned removal)
- ADD rollback row: ge-gse25hskss,gswf (restore planned removal)
- ADD rollback row: ge-gse25hskss,gswf2 (restore planned removal)
- ADD rollback row: ge-gye22gskww,gswf (restore planned removal)
- ADD rollback row: ge-gye22gskww,gswf2 (restore planned removal)
- ADD rollback row: ge-pfe28kmkww,gswf (restore planned removal)
- ADD rollback row: ge-pfe28kmkww,gswf2 (restore planned removal)
- ADD rollback row: ge-pfe28kynbb,gswf (restore planned removal)
- ADD rollback row: ge-pfe28kynbb,gswf2 (restore planned removal)
- ADD rollback row: ge-pvd28bymfs,gswf (restore planned removal)
- ADD rollback row: ge-pvd28bymfs,gswf2 (restore planned removal)
- Re-run dry-run after rollback to confirm before_mappings match the apply plan again.
- Rollback does not mutate Supabase, filters.csv, fridge_models.csv, manual evidence, pages, retailer links, sitemap/robots, buy CTA, or HQ handoff.

