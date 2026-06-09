# Samsung PASS repair apply closeout v1

Generated: 2026-06-09T18:07:03.116Z

## Status

- contract: `samsung_pass_repair_apply_closeout_v1`
- read_only: **true**
- closeout_verification_passed: **true**
- apply_execution_status: **APPLIED**
- rerun_apply_should_block: **true**
- apply_plan_consumed: **true**

## Git

- HEAD: `c447b9e3adf697517905be9559130d4045bd32d3`
- apply commit: `89bed805e161a720662a1e40bb8f1352f92e49bd`
- apply commit message: Apply Samsung pass repair compatibility mappings

## Guarded apply report (on disk)

- path: `data/fridge/batch-production/apply-execution-plans/samsung-pass-repair-guarded-apply-v1.json`
- apply_status: **BLOCKED** (expected BLOCKED after apply — before_mappings stale)
- mode: **dry_run**

## CSV verification

- target: `data/compatibility_mappings.csv`
- intended da97-17376b mappings present: **true**
- removed mappings absent: **true**

## Scoreboard (after audit refresh)

| Metric | Value | Expected |
| --- | ---: | ---: |
| multi_mapped_count | 211 | 211 |
| phantom_model_count | 13 | 13 |
| wrong_part_risk_count | 75 | 75 |

## Owner approval

- path: `data/owner-decisions/samsung-pass-repair-owner-approval-v1.json`
- valid: **true**
- decision_id: `decision-2026-06-09-samsung-pass-repair-approve_apply_plan`

## Slug rollup

- `samsung-rf27t5201sr` → `da97-17376b`
- `samsung-rf27t5501sr` → `da97-17376b`
- `samsung-rf28r6301sr` → `da97-17376b`
- `samsung-rf28t5101sr` → `da97-17376b`
- `samsung-rs22t5201sg` → `da97-17376b`

