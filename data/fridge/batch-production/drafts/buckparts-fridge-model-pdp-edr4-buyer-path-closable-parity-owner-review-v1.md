# EDR4 buyer-path closable parity owner-review v1

Generated: 2026-07-14T05:10:14.396Z

## Status

- contract: `buckparts_fridge_model_pdp_edr4_buyer_path_closable_parity_owner_review_v1`
- read_only: **true**
- apply_authorized: **false**
- founder_approval_created: **false**

## Scope

- models: whirlpool-wrf540cwhz, whirlpool-wrx735sdhz
- filter allowlist: edr4rxd1
- max planned retailer_links rows: 1

## Planned delta

- surface: `public.retailer_links`
- action: `insert_or_update_primary_from_csv`
- filter_slug: `edr4rxd1`
- desired URL: `https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html`
- classification: `direct_buyable`

## Gate conditions (future apply only)

- Dry-run parity report CHECKed with planned_action insert|update for edr4rxd1 only.
- BUCKPARTS_IO_CAPABILITY=MUTATION set for write session.
- New founder approval specifically authorizing THIS Supabase parity contract (not CSV manufacturer-rescue).
- Existing decision decision-2026-06-10-edr4rxd1-approve_csv_manufacturer_rescue_apply must NOT authorize --write.
- Explicit founder session authorize of apply for this exact lane after approval.
- Re-run CTA/go proof for whirlpool-wrf540cwhz + whirlpool-wrx735sdhz after apply.

## Blocked reuse

- CSV-only approval `decision-2026-06-10-edr4rxd1-approve_csv_manufacturer_rescue_apply` does **not** authorize this Supabase parity lane.

## Commands

- dry-run: `npm run buckparts:fridge-model-pdp-edr4-buyer-path-closable-parity -- --write-artifacts`
- write (later, only if newly approved): `BUCKPARTS_IO_CAPABILITY=MUTATION npm run buckparts:fridge-model-pdp-edr4-buyer-path-closable-parity -- --write`

## Proven facts

- PROVEN: read_only owner-review; apply_authorized=false; founder_approval_created=false.
- PROVEN: context models exactly whirlpool-wrf540cwhz + whirlpool-wrx735sdhz.
- PROVEN: mutation surface allowlist exactly filter slug edr4rxd1 (max 1 retailer_links primary).
- PROVEN: CSV primary is existing direct_buyable + go-resolvable Whirlpool OEM PDP evidence.
- PROVEN: retailer CSV path=data/retailer_links.csv.
- PROVEN: no invent_link / auto_promote authorization in this packet.

## Risk notes

- This packet does not authorize --write or create founder approval.
- Do not expand scope to XWFE/XWF/MWFP or ge-gte18gsnrss remain-no-buy.
- Do not invent new retailer destinations; sync CSV evidence only.
