# Amazon false-negative rescue — operator pack

**Scope:** Insert two preflight-approved Amazon PDP rows for whole-house-water parts (RFC-BBSA / AP810) using the SQL plan in `amazon-false-negative-rescue-insert-plan.sql`.

**Candidates**

| Label    | filter_slug      | whole_house_water_part_id        | ASIN         |
| -------- | ---------------- | -------------------------------- | ------------ |
| RFC-BBSA | culligan-rfc-bbsa | `3d4bfaa9-e47e-4d0f-8a70-30167f6b33da` | B000BQN6MM |
| AP810    | 3m-ap810         | `f6c835ee-8ac4-4a06-a0b3-efa03e4f0667` | B000W0TTJQ |

## Preconditions

1. Read `docs/amazon-false-negative-rescue-insert-plan.sql` end to end.
2. Run against the intended database only (staging vs production per your change policy).
3. The plan uses `BEGIN` … `ROLLBACK` by default; no commit until you deliberately swap to `COMMIT`.

## Execution order

1. Uncomment section **0** in the SQL file if you need to prove the two UUIDs exist on `whole_house_water_parts`.
2. Run **1) Pre-insert duplicate SELECT**. If it returns **any** rows: **STOP** — duplicate Amazon approved row already exists for that part.
3. If **1** is empty: run **2) INSERT** and **3) Post-insert verification**.
4. Confirm verification returns **exactly two** rows with correct `affiliate_url` / ASIN and `browser_truth_classification = direct_buyable`.
5. If satisfied, re-run the same statements in a new transaction ending in **`COMMIT`** (or edit the file to `COMMIT` once).

## Hard stop conditions

| Condition | Action |
| --------- | ------ |
| **Duplicate exists** | Pre-check **1** returns rows. Do not insert; resolve existing row (update vs skip) out of band. |
| **Wrong table** | If `whole_house_water_parts` lookup in **0** does not return two rows for those UUIDs, IDs are wrong or not whole-house-water — **STOP**; do not insert into an unproven table. |
| **Insert / verify count ≠ 2** | Post-insert **3** must show two Amazon approved rows for the two part IDs. Anything else: **STOP** and roll back (default `ROLLBACK` handles dry run). |
| **Full gate fails after insert** | If live PDPs still fail product buy-path gates (e.g. `filterRealBuyRetailerLinks` / `buyLinkGateFailureKind` in app), **STOP** promotion; investigate classification, URL, or data refresh before relying on links. |

## Soft note (not a hard stop by default)

- **Amazon affiliate tag unverified:** Note for compliance/monetization follow-up. Not a hard stop for “row exists and buy gate passes” unless your current release policy explicitly requires verified tag before merge — the codebase gate described in `launch-buy-links` is driven by placeholder URL shapes and `browser_truth_classification`, not tag verification.

## `is_primary`

The SQL plan sets **`is_primary = false`**, consistent with bulk ingest in this repo and to avoid multiple `is_primary = true` rows per part. UI ordering still surfaces Amazon when classification is `direct_buyable`. Change to `true` only if you have explicitly verified primary-link policy for that part and no duplicate-primary conflict.

## References

- Table: `supabase/migrations/20260410140000_appliance_air_whole_house_water_verticals.sql` (`whole_house_water_retailer_links`).
- Browser truth columns: `supabase/migrations/20260428235000_live_retailer_links_browser_truth_columns.sql`.
- Buy-path gate: `src/lib/retailers/launch-buy-links.ts`.
