# Samsung PASS repair — Supabase compatibility sync plan (owner review)

- contract: `samsung_pass_repair_supabase_compat_sync_plan_owner_review_v1`
- generated_at: `2026-07-13T00:22:28.484Z`
- csv_apply_commit: `89bed80`
- read_only: **true**
- data_mutation: **false**
- supabase_mutation_authorized: **false**
- apply_authorized: **false**
- plan_sync_state: **pending_sync**
- planned_slug_count: **5**
- target_filter_slug: `da97-17376b`

## Classification counts

- **IN_SYNC**: 0
- **SUPABASE_STILL_HAS_OLD_ROWS**: 5
- **SUPABASE_MISSING_TARGET**: 0
- **CONFLICT**: 0
- **UNKNOWN_READ_FAILED**: 0

## Planned Supabase changes (NOT applied)

- removals: **6**
- additions: **5**

### Removals

- `samsung-rf27t5201sr,da29-10105j`
- `samsung-rf27t5501sr,da29-00012b`
- `samsung-rf27t5501sr,da29-00020b`
- `samsung-rf28r6301sr,da29-00019a`
- `samsung-rf28t5101sr,da29-00019a`
- `samsung-rs22t5201sg,da29-10105j`

### Additions

- `samsung-rf27t5201sr,da97-17376b`
- `samsung-rf27t5501sr,da97-17376b`
- `samsung-rf28r6301sr,da97-17376b`
- `samsung-rf28t5101sr,da97-17376b`
- `samsung-rs22t5201sg,da97-17376b`

## Per-slug rows

### samsung-rf27t5201sr

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `da97-17376b`
- supabase: `da29-10105j`
- old_rows_still_in_supabase: `da29-10105j`
- missing_from_supabase: `da97-17376b`

### samsung-rf27t5501sr

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `da97-17376b`
- supabase: `da29-00012b|da29-00020b`
- old_rows_still_in_supabase: `da29-00012b|da29-00020b`
- missing_from_supabase: `da97-17376b`

### samsung-rf28r6301sr

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `da97-17376b`
- supabase: `da29-00019a`
- old_rows_still_in_supabase: `da29-00019a`
- missing_from_supabase: `da97-17376b`

### samsung-rf28t5101sr

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `da97-17376b`
- supabase: `da29-00019a`
- old_rows_still_in_supabase: `da29-00019a`
- missing_from_supabase: `da97-17376b`

### samsung-rs22t5201sg

- classification: **SUPABASE_STILL_HAS_OLD_ROWS**
- csv_current: `da97-17376b`
- supabase: `da29-10105j`
- old_rows_still_in_supabase: `da29-10105j`
- missing_from_supabase: `da97-17376b`

## Proven facts

- PROVEN: read_only=true; data_mutation=false; supabase_mutation_authorized=false; csv_mutation_authorized=false.
- PROVEN: buy_cta_authorized=false; retailer_links_mutation_authorized=false.
- PROVEN: planned_slug_count=5; target_filter_slug=da97-17376b; csv_apply_commit=89bed80.
- PROVEN: csv_intent_mappings=da97-17376b.
- PROVEN: classification_counts={"IN_SYNC":0,"SUPABASE_STILL_HAS_OLD_ROWS":5,"SUPABASE_MISSING_TARGET":0,"CONFLICT":0,"UNKNOWN_READ_FAILED":0}; plan_sync_state=pending_sync.
- PROVEN: planned_removals=6; planned_additions=5 (plan only — not applied).
- PROVEN: allowed_removal_row_keys=samsung-rf27t5201sr,da29-10105j | samsung-rf27t5501sr,da29-00012b | samsung-rf27t5501sr,da29-00020b | samsung-rf28r6301sr,da29-00019a | samsung-rf28t5101sr,da29-00019a | samsung-rs22t5201sg,da29-10105j.
- PROVEN: non-PASS / GTE18 / GSWF slugs are out of scope for this plan.

## Unknown facts

- UNKNOWN: Whether founder will create a matching samsung-pass supabase-compat-sync owner-approval artifact.
- UNKNOWN: Whether live public pages currently resolve filters from CSV, Supabase, or both after deploy.

## Risk notes

- Pending exact sync: remove 6 old da29-* rows and add 5 da97-17376b rows.
- This packet does not mutate Supabase or CSV.
- Do not mutate retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this packet.
- Future Supabase apply requires a separate founder approval artifact + guarded executor + env flag.
- Removals are limited to the proven old da29-* allowlist; additions are da97-17376b only.

