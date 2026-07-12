# GSWF ge-gte18gsnrss no-filter Supabase removal apply-plan owner review v1

Generated: 2026-07-12T22:56:03.473Z

## Status

- contract: `gswf_gte18gsnrss_no_filter_supabase_removal_apply_plan_owner_review_v1`
- read_only: **true**
- data_mutation: **false**
- supabase_mutation_authorized: **false**
- plan_sync_state: **pending_removal**
- classification: **SUPABASE_STILL_HAS_GSWF_FAMILY**

## Scope

- target_fridge_slug: `ge-gte18gsnrss`
- planned_removals: **2**
- planned_additions: **0**
- csv_current_mappings: `(none)`
- supabase_mappings: `gswf|gswf2`

### Planned Supabase removal keys

- `ge-gte18gsnrss,gswf`
- `ge-gte18gsnrss,gswf2`

## Risk notes

- Pending exact removals ge-gte18gsnrss,gswf + ge-gte18gsnrss,gswf2 from live Supabase only.
- This packet does not mutate Supabase or CSV.
- Do not mutate retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this packet.
- Do not include PARTIAL or GSWF-13 repaired slugs.
- Future Supabase apply requires a separate founder approval artifact + guarded executor + env flag.

