# Frigidaire Dead OEM Supabase Operator Pack

Use this pack to manually review and run the prepared SQL plan in Supabase.

Source SQL: `docs/frigidaire-dead-oem-mutation-plan.sql`

## Exact Target IDs

- `cd49afff-32cd-4c64-97df-57335d1b23da` (`242017801`)
- `49dc9fc1-4f94-499b-8932-b33580b0af11` (`242086201`)
- `2b446a6f-d4be-4848-abd5-98043e5920a5` (`242294502`)
- `96dd791c-4a8f-42f4-9b4d-cb424ea5e879` (`EPTWFU01`)
- `fe139d6a-4d8c-472f-8f3a-0aeb83870557` (`FPPWFU01`)

## Exact Manual Procedure

1. Open Supabase SQL Editor.
2. Paste the SQL from `docs/frigidaire-dead-oem-mutation-plan.sql`.
3. Run it exactly as-is with `ROLLBACK;` at the end.
4. Verify pre/post `SELECT` output.
5. Only replace `ROLLBACK` with `COMMIT` if exactly 5 rows are updated and IDs match.

## Required Verification Checks Before Commit

- `UPDATE` reports exactly **5 rows** affected.
- Pre and post `SELECT` output contains exactly the 5 expected IDs listed above.
- Every returned row has `retailer_key = 'oem-parts-catalog'`.
- Post `SELECT` shows:
  - `browser_truth_classification = 'likely_not_found'`
  - `browser_truth_notes = 'Manual browser evidence 2026-04-29: Frigidaire search URL returned Requested page is not available; no direct PDP discovered.'`
  - `browser_truth_checked_at = '2026-04-29T00:00:00.000Z'`

## Stop Conditions (Do Not Commit)

Stop immediately and keep `ROLLBACK` if any of the following occurs:

- fewer or more than 5 rows updated
- any row has wrong `retailer_key`
- any expected ID is missing
- any unexpected `browser_truth_classification` appears in post-check output

## Post-Run Validation Commands

Run these locally after manual SQL execution:

```bash
npm test
npm run buckparts:audit
npm run build
npm run buckparts:oem-blocked-details
npm run buckparts:command-surface
```

