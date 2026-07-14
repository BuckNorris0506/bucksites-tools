# GE MWFP/XWFE Supabase retailer_links sync owner-review

- contract: `buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_owner_review_v1`
- overall_sync_status_observed: **DRIFTED**
- exact_command: `npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts`
- apply_authorized: `false`
- supabase_mutation_authorized: `false`
- founder_approval_required_before_write: `true`
- pages_claimed_closed: `false`

## Planned updates (2)

### `smartwater-mwfp`

- before: `https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=MWFP`
- after: `https://www.geapplianceparts.com/store/parts/spec/MWFP`
- retailer_name: `GE Appliance Parts`
- classification: `direct_buyable`
- supabase_was_search_placeholder: `true`

### `xwfe`

- before: `https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWFE`
- after: `https://www.geapplianceparts.com/store/parts/spec/XWFE`
- retailer_name: `GE Appliance Parts`
- classification: `direct_buyable`
- supabase_was_search_placeholder: `true`

## Hard stop

HARD STOP: founder must review this plan, then create a separate Supabase sync founder-approval packet. Do not run Supabase write from this stage. Do not claim 4 GE pages closed.

## Gate conditions for future apply

- Separate founder approval packet required for Supabase retailer_links UPDATE of existing smartwater-mwfp + xwfe primaries only.
- CSV retailer_links must remain the approved GE PDP URLs (already applied).
- Explicit founder-run of a future guarded Supabase apply executor with MUTATION capability — not this packet.
- Do not INSERT/DELETE rows; do not mutate xwf; do not mutate compatibility; do not expand buy CTA.
- Re-run CTA/go proof after apply; do not claim 4 pages closed from this owner-review alone.

