# GSWF ge-gte18gsnrss no-filter Supabase compat parity owner review v1

Generated: 2026-07-12T22:42:28.917Z

## Status

- contract: `gswf_gte18gsnrss_no_filter_supabase_compat_parity_owner_review_v1`
- read_only: **true**
- data_mutation: **false**
- supabase_mutation_authorized: **false**
- classification: **SUPABASE_STILL_HAS_GSWF_FAMILY**
- supabase_status: **CHECKED**

## Scope

- target_fridge_slug: `ge-gte18gsnrss`
- csv_intent_mappings: `(none)`
- csv_current_mappings: `(none)`
- supabase_mappings: `gswf|gswf2`
- gswf_family_still_in_supabase: `gswf|gswf2`
- unexpected_in_supabase: `(none)`

## Proven facts

- PROVEN: read_only=true; data_mutation=false; supabase_mutation_authorized=false; csv_mutation_authorized=false.
- PROVEN: buy_cta_authorized=false; retailer_links_mutation_authorized=false.
- PROVEN: target_fridge_slug=ge-gte18gsnrss; csv_intent_mappings=(none).
- PROVEN: csv_current_mappings=(none).
- PROVEN: classification=SUPABASE_STILL_HAS_GSWF_FAMILY; supabase_status=CHECKED.
- PROVEN: supabase_mappings=gswf|gswf2.

## Risk notes

- Live Supabase still maps gswf/gswf2 for ge-gte18gsnrss: gswf|gswf2.
- This packet does not mutate Supabase or CSV.
- Do not mutate retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this packet.
- Future Supabase apply requires a separate founder approval artifact + guarded executor.

