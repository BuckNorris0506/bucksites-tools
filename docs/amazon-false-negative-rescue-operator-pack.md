# Amazon false-negative rescue — operator pack

**Scope:** Diagnose existing Amazon rows first, then apply duplicate-safe UPDATE/INSERT logic for two whole-house-water slots (RFC-BBSA / AP810) using `amazon-false-negative-rescue-insert-plan.sql`.

**Current incident note:** Prior plain-INSERT planning correctly stopped on:
`whole_house_water_retailer_links_one_approved_per_slot`
for `(3d4bfaa9-e47e-4d0f-8a70-30167f6b33da, amazon)`.
No `COMMIT` should be run from the old plain-insert path.

**Candidates**

| Label    | filter_slug      | whole_house_water_part_id        | ASIN         |
| -------- | ---------------- | -------------------------------- | ------------ |
| RFC-BBSA | culligan-rfc-bbsa | `3d4bfaa9-e47e-4d0f-8a70-30167f6b33da` | B000BQN6MM |
| AP810    | 3m-ap810         | `f6c835ee-8ac4-4a06-a0b3-efa03e4f0667` | B000W0TTJQ |

## Preconditions

1. Read `docs/amazon-false-negative-rescue-insert-plan.sql` end to end.
2. Run against the intended database only (staging vs production per your change policy).
3. The plan uses `BEGIN` … `ROLLBACK` by default; no commit until you deliberately swap to `COMMIT`.

## Execution order (read-only first)

1. Run `npm run buckparts:amazon-rescue-existing-whw-rows` (read-only report).
2. Run SQL section **1) Read-only diagnosis query** and confirm slot state by part ID.
3. Run SQL section **2) UPDATE existing rows** (safe refresh of stale URL/evidence).
4. Run SQL section **3) INSERT missing slots only** (`NOT EXISTS` guarded).
5. Run SQL section **4) Post-mutation verification** and confirm exactly two approved Amazon rows across target slots.
6. If and only if verification is correct, rerun in a new transaction ending with `COMMIT`.

## Hard stop conditions

| Condition | Action |
| --------- | ------ |
| **Duplicate exists** | This is expected for existing approved slot rows. Do **not** use plain insert. Use UPDATE for existing slot and INSERT only for missing slot. |
| **Wrong table** | If `whole_house_water_parts` lookup in **0** does not return two rows for those UUIDs, IDs are wrong or not whole-house-water — **STOP**; do not insert into an unproven table. |
| **Insert / verify count ≠ 2** | Post-check **4** must show two Amazon approved rows for the two part IDs. Anything else: **STOP** and roll back (default `ROLLBACK` handles dry run). |
| **Full gate fails after insert** | If live PDPs still fail product buy-path gates (e.g. `filterRealBuyRetailerLinks` / `buyLinkGateFailureKind` in app), **STOP** promotion; investigate classification, URL, or data refresh before relying on links. |

## Soft note (not a hard stop by default)

- **Amazon affiliate tag unverified:** Note for compliance/monetization follow-up. Not a hard stop for “row exists and buy gate passes” unless your current release policy explicitly requires verified tag before merge — the codebase gate described in `launch-buy-links` is driven by placeholder URL shapes and `browser_truth_classification`, not tag verification.

## `is_primary`

The SQL plan sets **`is_primary = false`** on insert and does not force-change it on update, consistent with bulk ingest defaults and to avoid duplicate-primary conflicts. UI ordering still surfaces Amazon when classification is `direct_buyable`. Change to `true` only if you have explicitly verified primary-link policy for that part.

## References

- Table: `supabase/migrations/20260410140000_appliance_air_whole_house_water_verticals.sql` (`whole_house_water_retailer_links`).
- Browser truth columns: `supabase/migrations/20260428235000_live_retailer_links_browser_truth_columns.sql`.
- Buy-path gate: `src/lib/retailers/launch-buy-links.ts`.
