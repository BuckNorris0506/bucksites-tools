# GSWF wrong-part repair — Supabase compatibility sync guarded dry-run v1

Generated: 2026-07-12T18:13:25.684Z

## Status

- contract: `gswf_wrong_part_repair_supabase_compat_sync_guarded_apply_v1`
- mode: **dry_run**
- apply_status: **ALREADY_IN_SYNC**
- read_only: **true**
- data_mutation: **false**
- supabase_mutation_authorized: **false**
- mutation_flag_enabled: **false**
- plan_sync_state: **already_in_sync**
- owner_approval_present: **true**
- owner_approval_valid: **false**
- owner_approval_required_for_apply: **true**
- owner_approval_decision_id: `none`

## Sources

- sync_plan: `data/fridge/batch-production/drafts/gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1.json`
- sync_plan_sha256: `563302e8ec87d11b3ff179d223509380b5c79c17de4f4d734adca3657b6e3378`
- owner_approval: `data/owner-decisions/gswf-wrong-part-repair-supabase-compat-sync-owner-approval-v1.json`
- csv_apply_commit: `8361fba`

## Planned Supabase changes

- planned_slug_count: 13
- planned_removals: 0
- planned_additions: 0
- excluded_slugs_untouched: `ge-gfe28hmkww|ge-gsc25frshss|ge-gse26gshess|ge-gte18gsnrss`

## Classification counts (from sync plan)

- **IN_SYNC**: 13
- **SUPABASE_HAS_REMOVED_WRONG_ROWS_PENDING**: 0
- **SUPABASE_MISSING_ADDED_ROWS_PENDING**: 0
- **CONFLICT_REQUIRES_REVIEW**: 0
- **UNKNOWN_READ_FAILED**: 0

## Exact Supabase row deltas


## Proven facts

- PROVEN: mode=dry_run; apply_status=ALREADY_IN_SYNC; data_mutation=false; supabase_mutation_authorized=false; mutation_flag_enabled=false.
- PROVEN: sync_plan_rel_path=data/fridge/batch-production/drafts/gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1.json.
- PROVEN: plan_sync_state=already_in_sync; IN_SYNC=13; CONFLICT_REQUIRES_REVIEW=0; planned_removals=0; planned_additions=0.
- PROVEN: owner_approval_present=true; owner_approval_valid=false; decision_id=none.
- PROVEN: excluded_slugs_untouched=ge-gfe28hmkww|ge-gsc25frshss|ge-gse26gshess|ge-gte18gsnrss.
- PROVEN: csv_apply_commit=8361fba.
- PROVEN: no Supabase writes attempted — plan already in sync.

## Unknown facts

- UNKNOWN: Whether future drift will reopen CONFLICT_REQUIRES_REVIEW for these 13 slugs.

## Risk notes

- Plan is already IN_SYNC — executor will not re-apply historical 26/13 deltas.
- Do not mutate retailer_links / buy CTA / sitemap / robots / Product JSON-LD / CSV from this executor.

