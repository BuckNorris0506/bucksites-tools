# Amazon DA29-00019A multipack insert — operator pack

**Scope:** Prepare and review a single-row Amazon insert for the one clear multipack candidate (`DA29-00019A`) in refrigerator `public.retailer_links`.

**Plan file:** `docs/amazon-da29-00019a-multipack-insert-plan.sql`

## Candidate truth

- Token: `DA29-00019A`
- Filter ID: `7f84c6ad-b8ba-4b7e-98b6-c4f5c1d6cd7d`
- URL: `https://www.amazon.com/dp/B019HPTP3G`
- Classification: `direct_buyable`
- Buyable subtype: `MULTIPACK_DIRECT_BUYABLE`
- Preflight source truth: `duplicate_status=CLEAR`, `ready_for_sql_plan=true`

## Execution order

1. Run section `0) Optional ID sanity check`.
2. Run section `1) Pre-insert duplicate select`.
3. Verify hard-stop checks below.
4. Run section `2) Guarded INSERT`.
5. Confirm insert row count is exactly `1`.
6. Run section `3) Post-insert verification`.
7. Run full buy-link gate verification path for this row in application checks.
8. Keep `ROLLBACK` unless explicit approval exists to rerun with `COMMIT`.

## Hard stop conditions

- **Duplicate Amazon slot exists:** Pre-insert check returns any row for this `filter_id` + `retailer_key='amazon'`.
- **Wrong filter/part id:** Section `0` does not confirm the expected mapping for `DA29-00019A`/`7f84c6ad-b8ba-4b7e-98b6-c4f5c1d6cd7d`.
- **Inserted row count not 1:** Guarded insert affects `0` or `>1` rows.
- **Full gate fails after insert:** `buyLinkGateFailureKind`/live CTA gate does not treat inserted row as safe direct-buyable.

If any hard stop occurs: do not continue and do not commit.

## Successful post-check state

- Exactly one Amazon row exists in `public.retailer_links` for target filter slot.
- Row uses:
  - `affiliate_url = destination_url = https://www.amazon.com/dp/B019HPTP3G`
  - `browser_truth_classification = direct_buyable`
  - `browser_truth_buyable_subtype = MULTIPACK_DIRECT_BUYABLE`
  - notes indicating manual exact-token multipack evidence from `2026-04-30`.
