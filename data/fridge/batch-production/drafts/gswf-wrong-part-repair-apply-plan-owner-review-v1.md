# GSWF wrong-part repair apply-plan owner review v1

Generated: 2026-07-10T01:51:50.360Z

## Status

- contract: `gswf_wrong_part_repair_apply_plan_owner_review_v1`
- family_key: `filter::ge::gswf`
- read_only: **true**
- mutation_authorized: **false**
- apply_authorized: **false**
- apply_plan_authorized: **false**
- buy_cta_authorized: **false**
- retailer_links_mutation_authorized: **false**
- owner_approval_required: **true**

## Source

- owner review: `data/fridge/batch-production/drafts/gswf-family-reconciliation-owner-review-v1.json` (proven_wrong_part_repair, 13 slugs)
- target CSV: `data/compatibility_mappings.csv` (not modified)

## Excluded from plan

- PARTIAL browser-proof slugs: `ge-gfe28hmkww|ge-gsc25frshss|ge-gse26gshess`
- no-filter suppression slugs: `ge-gte18gsnrss`
- reason: PARTIAL rows require owner-browser Tier-1 proof; no-filter row requires separate suppression lane — neither is authorized in this compat-only apply-plan design.

## Rollup

| Metric | Value |
| --- | --- |
| planned slug count | 13 |
| wrong-part family removals | `gswf|gswf2` |
| proposed remap additions | `rpwfe|xwfe` |
| compat row removals | 26 |
| compat row additions | 13 |

## Owner approval requirements

- Owner must explicitly approve filter::ge::gswf wrong-part repair apply plan before any CSV or Supabase compat mutation.
- Owner must confirm each of the 13 planned rows after reviewing before/after mapping intent in this packet.
- Owner must complete browser-proof Tier-1 capture for 3 PARTIAL slugs before including them in any apply executor.
- Owner must approve no-filter suppression for ge-gte18gsnrss in a separate lane — not included in this plan.
- No GSWF buy CTA, retailer_links.csv edit, or Verified Link promotion is authorized by approving this compat-only design.
- Re-validate committed compatibility_mappings.csv and live Supabase state immediately before any future guarded apply.
- BP-000003 caution behavior must remain until post-apply re-audit proves safe customer-facing posture.

## Risk notes

- owner_approval_required=true — this artifact designs a future CSV repair only; nothing has been applied.
- mutation_authorized=false, csv_apply_authorized=false, buy_cta_authorized=false on packet and every planned row.
- Only 13 of 17 GSWF mission slugs are included — 3 PARTIAL browser-proof rows and 1 no-filter row are explicitly excluded.
- Surgical removals are limited to wrong-part family slugs: gswf|gswf2.
- Planned compat row removals=26; additions=13.
- Proposed remap targets come only from gswf-family-reconciliation-owner-review-v1 proposed_remap_target_filter_slug fields.
- Unrelated valid mappings (e.g. smartwater-mwfp, xwf) are preserved where present in committed CSV.
- No retailer_links.csv changes, public buy CTA changes, manual-evidence commits, or page updates in this plan.
- Live Supabase compatibility_mappings may differ from committed CSV at apply time — re-validate before execution.

## Planned rows

### ge-cwe23sshww

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2`
- after: `rpwfe`
- wrong_part_removals: `gswf|gswf2`
- preserved: `none`
- add: `rpwfe`
- remap target: `rpwfe`
- hyperagent_actual_filter: `RPWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

### ge-gfe24jgkww

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2|smartwater-mwfp`
- after: `smartwater-mwfp|xwfe`
- wrong_part_removals: `gswf|gswf2`
- preserved: `smartwater-mwfp`
- add: `xwfe`
- remap target: `xwfe`
- hyperagent_actual_filter: `XWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

### ge-gfe27jmkes

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2`
- after: `xwfe`
- wrong_part_removals: `gswf|gswf2`
- preserved: `none`
- add: `xwfe`
- remap target: `xwfe`
- hyperagent_actual_filter: `XWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

### ge-gfe28gmkbb

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2`
- after: `rpwfe`
- wrong_part_removals: `gswf|gswf2`
- preserved: `none`
- add: `rpwfe`
- remap target: `rpwfe`
- hyperagent_actual_filter: `RPWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

### ge-gfe28gskes

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2`
- after: `rpwfe`
- wrong_part_removals: `gswf|gswf2`
- preserved: `none`
- add: `rpwfe`
- remap target: `rpwfe`
- hyperagent_actual_filter: `RPWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

### ge-gfe28hskss

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2|smartwater-mwfp`
- after: `rpwfe|smartwater-mwfp`
- wrong_part_removals: `gswf|gswf2`
- preserved: `smartwater-mwfp`
- add: `rpwfe`
- remap target: `rpwfe`
- hyperagent_actual_filter: `RPWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

### ge-gne25jmkww

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2`
- after: `xwfe`
- wrong_part_removals: `gswf|gswf2`
- preserved: `none`
- add: `xwfe`
- remap target: `xwfe`
- hyperagent_actual_filter: `MWF/XWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

### ge-gne27jstss

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2|xwf`
- after: `xwf|xwfe`
- wrong_part_removals: `gswf|gswf2`
- preserved: `xwf`
- add: `xwfe`
- remap target: `xwfe`
- hyperagent_actual_filter: `MWF/XWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

### ge-gse25hskss

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2|xwf`
- after: `xwf|xwfe`
- wrong_part_removals: `gswf|gswf2`
- preserved: `xwf`
- add: `xwfe`
- remap target: `xwfe`
- hyperagent_actual_filter: `MWF/XWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

### ge-gye22gskww

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2`
- after: `rpwfe`
- wrong_part_removals: `gswf|gswf2`
- preserved: `none`
- add: `rpwfe`
- remap target: `rpwfe`
- hyperagent_actual_filter: `RPWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

### ge-pfe28kmkww

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2|xwf`
- after: `rpwfe|xwf`
- wrong_part_removals: `gswf|gswf2`
- preserved: `xwf`
- add: `rpwfe`
- remap target: `rpwfe`
- hyperagent_actual_filter: `RPWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

### ge-pfe28kynbb

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2`
- after: `rpwfe`
- wrong_part_removals: `gswf|gswf2`
- preserved: `none`
- add: `rpwfe`
- remap target: `rpwfe`
- hyperagent_actual_filter: `RPWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

### ge-pvd28bymfs

- operation: `surgical_remove_gswf_family_mappings`
- before: `gswf|gswf2`
- after: `xwfe`
- wrong_part_removals: `gswf|gswf2`
- preserved: `none`
- add: `xwfe`
- remap target: `xwfe`
- hyperagent_actual_filter: `XWFE`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**

