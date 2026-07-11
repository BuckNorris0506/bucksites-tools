# GSWF wrong-part repair — Supabase compatibility sync plan (owner review)

- contract: `gswf_wrong_part_repair_supabase_compat_sync_plan_owner_review_v1`
- generated_at: `2026-07-11T22:16:07.391Z`
- csv_apply_commit: `8361fba`
- read_only: **true**
- data_mutation: **false**
- supabase_mutation_authorized: **false**
- apply_authorized: **false**
- planned_slug_count: **13**
- excluded_slugs_untouched: `ge-gfe28hmkww|ge-gsc25frshss|ge-gse26gshess|ge-gte18gsnrss`

## Classification counts

- **IN_SYNC**: 0
- **SUPABASE_HAS_REMOVED_WRONG_ROWS_PENDING**: 0
- **SUPABASE_MISSING_ADDED_ROWS_PENDING**: 0
- **CONFLICT_REQUIRES_REVIEW**: 13
- **UNKNOWN_READ_FAILED**: 0

## Proposed Supabase changes (NOT applied)

- removals: **26**
- additions: **13**
- note: Future founder-gated apply plan only — this report does not mutate Supabase.

## Per-slug rows

### ge-cwe23sshww

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `rpwfe`
- csv_current: `rpwfe`
- supabase: `gswf|gswf2`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `rpwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

### ge-gfe24jgkww

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `smartwater-mwfp|xwfe`
- csv_current: `smartwater-mwfp|xwfe`
- supabase: `gswf|gswf2|smartwater-mwfp`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `xwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

### ge-gfe27jmkes

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `xwfe`
- csv_current: `xwfe`
- supabase: `gswf|gswf2`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `xwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

### ge-gfe28gmkbb

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `rpwfe`
- csv_current: `rpwfe`
- supabase: `gswf|gswf2`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `rpwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

### ge-gfe28gskes

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `rpwfe`
- csv_current: `rpwfe`
- supabase: `gswf|gswf2`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `rpwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

### ge-gfe28hskss

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `rpwfe|smartwater-mwfp`
- csv_current: `rpwfe|smartwater-mwfp`
- supabase: `gswf|gswf2|smartwater-mwfp`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `rpwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

### ge-gne25jmkww

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `xwfe`
- csv_current: `xwfe`
- supabase: `gswf|gswf2`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `xwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

### ge-gne27jstss

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `xwf|xwfe`
- csv_current: `xwf|xwfe`
- supabase: `gswf|gswf2|xwf`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `xwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

### ge-gse25hskss

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `xwf|xwfe`
- csv_current: `xwf|xwfe`
- supabase: `gswf|gswf2|xwf`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `xwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

### ge-gye22gskww

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `rpwfe`
- csv_current: `rpwfe`
- supabase: `gswf|gswf2`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `rpwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

### ge-pfe28kmkww

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `rpwfe|xwf`
- csv_current: `rpwfe|xwf`
- supabase: `gswf|gswf2|xwf`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `rpwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

### ge-pfe28kynbb

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `rpwfe`
- csv_current: `rpwfe`
- supabase: `gswf|gswf2`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `rpwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

### ge-pvd28bymfs

- classification: **CONFLICT_REQUIRES_REVIEW**
- csv_intent: `xwfe`
- csv_current: `xwfe`
- supabase: `gswf|gswf2`
- wrong_family_still_in_supabase: `gswf|gswf2`
- missing_from_supabase: `xwfe`
- unexpected_in_supabase: `none`
- supabase_mutation_authorized: **false**

## Proven facts

- PROVEN: read_only=true; data_mutation=false; supabase_mutation_authorized=false.
- PROVEN: planned_slug_count=13; csv_apply_commit=8361fba.
- PROVEN: excluded_slugs_untouched=ge-gfe28hmkww|ge-gsc25frshss|ge-gse26gshess|ge-gte18gsnrss.
- PROVEN: classification_counts={"IN_SYNC":0,"SUPABASE_HAS_REMOVED_WRONG_ROWS_PENDING":0,"SUPABASE_MISSING_ADDED_ROWS_PENDING":0,"CONFLICT_REQUIRES_REVIEW":13,"UNKNOWN_READ_FAILED":0}.
- PROVEN: proposed_supabase_removals=26; proposed_supabase_additions=13 (plan only — not applied).
- PROVEN: committed CSV current mappings match apply-plan after_mappings for all 13 repaired slugs.

## Unknown facts

- UNKNOWN: Whether founder will authorize a future guarded Supabase compatibility sync apply.
- UNKNOWN: Whether live public pages currently resolve filters from CSV, Supabase, or both after deploy.

## Risk notes

- This packet does not mutate Supabase or CSV.
- Do not run retailer_links / buy CTA / sitemap / robots changes from this packet.
- Do not include PARTIAL or no-filter excluded slugs in any future Supabase sync apply.
- Future Supabase apply requires a separate founder approval artifact + guarded executor.

