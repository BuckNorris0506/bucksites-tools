# GSWF wrong-part repair — Supabase compatibility sync guarded dry-run v1

Generated: 2026-07-12T17:55:10.536Z

## Status

- contract: `gswf_wrong_part_repair_supabase_compat_sync_guarded_apply_v1`
- mode: **dry_run**
- apply_status: **DRY_RUN_READY**
- read_only: **true**
- data_mutation: **false**
- supabase_mutation_authorized: **false**
- mutation_flag_enabled: **false**
- owner_approval_present: **true**
- owner_approval_valid: **true**
- owner_approval_required_for_apply: **true**
- owner_approval_decision_id: `decision-2026-07-12-gswf-supabase-compat-sync-approve`

## Sources

- sync_plan: `data/fridge/batch-production/drafts/gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1.json`
- sync_plan_sha256: `b8080c0e70782fb4e292153fd9e1ae85f7c088b26ccfeb26907a8b7e8dbe3f67`
- owner_approval: `data/owner-decisions/gswf-wrong-part-repair-supabase-compat-sync-owner-approval-v1.json`
- csv_apply_commit: `8361fba`

## Planned Supabase changes

- planned_slug_count: 13
- planned_removals: 26
- planned_additions: 13
- excluded_slugs_untouched: `ge-gfe28hmkww|ge-gsc25frshss|ge-gse26gshess|ge-gte18gsnrss`

## Classification counts (from sync plan)

- **IN_SYNC**: 0
- **SUPABASE_HAS_REMOVED_WRONG_ROWS_PENDING**: 0
- **SUPABASE_MISSING_ADDED_ROWS_PENDING**: 0
- **CONFLICT_REQUIRES_REVIEW**: 13
- **UNKNOWN_READ_FAILED**: 0

## Exact Supabase row deltas

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

## Proven facts

- PROVEN: mode=dry_run; apply_status=DRY_RUN_READY; data_mutation=false; supabase_mutation_authorized=false; mutation_flag_enabled=false.
- PROVEN: sync_plan_rel_path=data/fridge/batch-production/drafts/gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1.json.
- PROVEN: planned_slug_count=13; planned_removals=26; planned_additions=13.
- PROVEN: owner_approval_present=true; owner_approval_valid=true; decision_id=decision-2026-07-12-gswf-supabase-compat-sync-approve.
- PROVEN: excluded_slugs_untouched=ge-gfe28hmkww|ge-gsc25frshss|ge-gse26gshess|ge-gte18gsnrss.
- PROVEN: csv_apply_commit=8361fba.
- PROVEN: sync plan shape verified (read_only=true; plan supabase_mutation_authorized=false; removals=26; additions=13; CONFLICT_REQUIRES_REVIEW=13).

## Unknown facts

- UNKNOWN: When founder will create gswf-wrong-part-repair-supabase-compat-sync-owner-approval-v1.json.
- UNKNOWN: Whether a future founder session will set BUCKPARTS_GSWF_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED=1 for an authorized apply.

## Risk notes

- Dry-run never mutates Supabase or CSV.
- Apply requires matching founder approval + BUCKPARTS_GSWF_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED=1 + exact 13/26/13 plan.
- Do not run retailer_links / buy CTA / sitemap / robots / Product JSON-LD changes from this executor.
- Do not include PARTIAL or no-filter excluded slugs in any Supabase sync apply.
- Do not mutate data/compatibility_mappings.csv from this executor.

