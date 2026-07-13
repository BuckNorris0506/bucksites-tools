# Samsung PASS 5 — Supabase compatibility parity owner review v1

Generated: 2026-07-12T23:45:36.790Z

## Status

- contract: `samsung_pass_repair_supabase_compat_parity_owner_review_v1`
- read_only: **true**
- data_mutation: **false**
- supabase_mutation_authorized: **false**
- planned_slug_count: **5**
- target_filter_slug: `da97-17376b`
- csv_apply_commit: `89bed80`

## Classification counts

- **IN_SYNC**: 0
- **SUPABASE_STILL_HAS_OLD_ROWS**: 5
- **SUPABASE_MISSING_TARGET**: 0
- **CONFLICT**: 0
- **UNKNOWN_READ_FAILED**: 0

## Per-slug rows

### samsung-rf27t5201sr

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_intent: `da97-17376b`
- csv_current: `da97-17376b`
- csv_matches_intent: **true**
- csv_old_rows_still_present: `(none)`
- supabase: `da29-10105j`
- old_rows_still_in_supabase: `da29-10105j`
- missing_from_supabase: `da97-17376b`
- unexpected_in_supabase: `(none)`

### samsung-rf27t5501sr

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_intent: `da97-17376b`
- csv_current: `da97-17376b`
- csv_matches_intent: **true**
- csv_old_rows_still_present: `(none)`
- supabase: `da29-00012b|da29-00020b`
- old_rows_still_in_supabase: `da29-00012b|da29-00020b`
- missing_from_supabase: `da97-17376b`
- unexpected_in_supabase: `(none)`

### samsung-rf28r6301sr

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_intent: `da97-17376b`
- csv_current: `da97-17376b`
- csv_matches_intent: **true**
- csv_old_rows_still_present: `(none)`
- supabase: `da29-00019a`
- old_rows_still_in_supabase: `da29-00019a`
- missing_from_supabase: `da97-17376b`
- unexpected_in_supabase: `(none)`

### samsung-rf28t5101sr

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_intent: `da97-17376b`
- csv_current: `da97-17376b`
- csv_matches_intent: **true**
- csv_old_rows_still_present: `(none)`
- supabase: `da29-00019a`
- old_rows_still_in_supabase: `da29-00019a`
- missing_from_supabase: `da97-17376b`
- unexpected_in_supabase: `(none)`

### samsung-rs22t5201sg

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_intent: `da97-17376b`
- csv_current: `da97-17376b`
- csv_matches_intent: **true**
- csv_old_rows_still_present: `(none)`
- supabase: `da29-10105j`
- old_rows_still_in_supabase: `da29-10105j`
- missing_from_supabase: `da97-17376b`
- unexpected_in_supabase: `(none)`

## Proven facts

- PROVEN: read_only=true; data_mutation=false; supabase_mutation_authorized=false; csv_mutation_authorized=false.
- PROVEN: buy_cta_authorized=false; retailer_links_mutation_authorized=false.
- PROVEN: planned_slug_count=5; target_filter_slug=da97-17376b; csv_apply_commit=89bed80.
- PROVEN: classification_counts={"IN_SYNC":0,"SUPABASE_STILL_HAS_OLD_ROWS":5,"SUPABASE_MISSING_TARGET":0,"CONFLICT":0,"UNKNOWN_READ_FAILED":0}.
- PROVEN: CSV current mappings match intent da97-17376b-only and old da29-* removals are absent for all 5 slugs.

## Risk notes

- Live Supabase still has old da29-* rows on 5 slug(s).
- This packet does not mutate Supabase or CSV.
- Do not mutate retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this packet.
- Future Supabase apply requires a separate founder approval artifact + guarded executor.

