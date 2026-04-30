# Amazon multipack subtype update — operator pack

**Scope:** Prepare and review a guarded subtype-only update for 3 existing refrigerator Amazon rows.

**Plan file:** `docs/amazon-multipack-subtype-update-plan.sql`

**Important constraints**

- Update only `browser_truth_buyable_subtype`.
- Set value to `MULTIPACK_DIRECT_BUYABLE`.
- Target only these existing `retailer_links.id` values:
  - `13db0ab4-7bee-4bfc-8194-7729f98d0893` (`ADQ36006101`)
  - `e27d19d0-d2d9-40ca-b584-f4b462700f69` (`DA29-00003G`)
  - `e2cb724e-e87f-4b0c-b6b9-defe74cf0312` (`DA29-00020A`)
- Do **not** insert rows.
- Do **not** change `affiliate_url` or `destination_url`.
- SQL defaults to `ROLLBACK`.

## Execution order

1. Run section `0) Target set` (pre-update read-only select).
2. Validate all stop-condition checks below.
3. Run section `1) Guarded update`.
4. Confirm update affected row count is exactly `3`.
5. Run section `2) Post-update verification`.
6. Keep `ROLLBACK` unless explicit approval is given to rerun with `COMMIT`.

## Hard stop conditions

- **Wrong IDs:** Any target `id` missing or replaced.
- **Row count mismatch:** Fewer or more than 3 target rows in pre/post checks, or update count not equal to 3.
- **Not Amazon:** Any target row has `retailer_key != 'amazon'`.
- **Not direct buyable:** Any target row has `browser_truth_classification != 'direct_buyable'`.
- **URL mismatch:** Any `affiliate_url` does not equal current diagnosed URL:
  - `13db0ab4-7bee-4bfc-8194-7729f98d0893` → `https://www.amazon.com/dp/B0042ACZU2`
  - `e27d19d0-d2d9-40ca-b584-f4b462700f69` → `https://www.amazon.com/dp/B004MU3EDE`
  - `e2cb724e-e87f-4b0c-b6b9-defe74cf0312` → `https://www.amazon.com/dp/B07FPQ2CLC`

If any stop condition is hit, do not continue and do not commit.

## Expected successful post-check state

- Exactly 3 rows returned for those IDs.
- All three rows remain Amazon + `direct_buyable`.
- All three rows have `browser_truth_buyable_subtype = 'MULTIPACK_DIRECT_BUYABLE'`.
- `affiliate_url` and `destination_url` remain unchanged.
