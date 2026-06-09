# Samsung PASS repair apply plan v1

Generated: 2026-06-09T16:51:48.553Z

## Status

- contract: `samsung_pass_repair_apply_plan_v1`
- read_only: **true**
- data_mutation: **false**
- mutation_authorized: **false**
- owner_approval_required: **true**
- apply_authorized: **false**

## Source

- owner review: `data/fridge/batch-production/drafts/refrigerator-truth-repair-owner-review-v1.json` (samsung_pass_ready, 5 slugs)
- validation: `data/fridge/batch-production/drafts/samsung-bad-mapping-batch-001-cursor-validation-v1.json` (samsung-bad-mapping-batch-001)
- target CSV: `data/compatibility_mappings.csv` (not modified)

## Rollup

| Metric | Value |
| --- | --- |
| planned slug count | 5 |
| removed filter slugs | `da29-00012b|da29-00019a|da29-00020b|da29-10105j` |
| added filter slugs | `da97-17376b` |
| compat row removals | 6 |
| compat row additions | 5 |

## Expected scoreboard delta (if owner-approved)

| Metric | Baseline | After apply | Reduction |
| --- | ---: | ---: | ---: |
| wrong_part_risk_count | 75 | 70 | 5 |
| multi_mapped_count | 212 | 211 | 1 |
| phantom_model_count | 15 | 13 | 2 |

## Risk notes

- owner_approval_required=true — this artifact is a read-only apply plan only; nothing has been applied.
- mutation_authorized=false on every planned row — separate owner-approved apply executor required for CSV/Supabase writes.
- Only 5 of 15 Samsung bad-mapping batch rows are VALIDATION_PASS — remaining 10 PARTIAL rows are excluded from this plan.
- Planned removals include repo-proven phantom filter slug(s): da29-10105j.
- Live Supabase compatibility_mappings may differ from committed CSV at apply time — re-validate before execution.
- No manual-evidence JSON commits, page updates, retailer-link changes, sitemap/robots edits, or HQ handoff in this plan.
- Target filter da97-17376b is HAF-QIN family — wrong-family DA29 co-maps are the intended removal set.

## Planned rows

### samsung-rf27t5201sr

- operation: `replace_mapping`
- before: `da29-10105j`
- after: `da97-17376b`
- remove: `da29-10105j`
- add: `da97-17376b`
- target: `da97-17376b`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**
- basis: Samsung Canada official HAF-QIN page lists RF27T5201SR/AA; token resolves to repo-proven samsung::HAFQIN family. Ready for owner-review compat correction packet — not auto-applied.

### samsung-rf27t5501sr

- operation: `split_mapping`
- before: `da29-00012b|da29-00020b`
- after: `da97-17376b`
- remove: `da29-00012b|da29-00020b`
- add: `da97-17376b`
- target: `da97-17376b`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**
- basis: Samsung Canada official page lists RF27T5501SR/AC; surgical HAF-CIN co-map removal candidate. Owner must approve da29-00012b|da29-00020b removal and da97-17376b addition.

### samsung-rf28r6301sr

- operation: `replace_mapping`
- before: `da29-00019a`
- after: `da97-17376b`
- remove: `da29-00019a`
- add: `da97-17376b`
- target: `da97-17376b`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**
- basis: Samsung US business spec PDF (image-us.samsung.com) lists RF28R6301SR with Accessories Water Filter: HAF-QIN.

### samsung-rf28t5101sr

- operation: `replace_mapping`
- before: `da29-00019a`
- after: `da97-17376b`
- remove: `da29-00019a`
- add: `da97-17376b`
- target: `da97-17376b`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**
- basis: Samsung Canada official spec sheet PDF (images.homedepot.ca) states Water Filter: HAF-QIN for RF28T5101SR.

### samsung-rs22t5201sg

- operation: `replace_mapping`
- before: `da29-10105j`
- after: `da97-17376b`
- remove: `da29-10105j`
- add: `da97-17376b`
- target: `da97-17376b`
- verdict: `VALIDATION_PASS_READY_FOR_OWNER_REVIEW`
- mutation_authorized: **false**
- basis: Samsung US official spec PDF lists RS22T5201SG with Accessories Water Filter: HAF-QIN — newer RS platform uses square HAF-QIN not legacy HAF-CIN.

