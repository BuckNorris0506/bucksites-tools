# AP OEM-primary - Supabase Amazon demotion SQL dry-run result v1

## Ten-slug orphan Amazon cleanup

**Report type:** Supabase Amazon demotion dry-run result (docs-only)  
**Recorded:** 2026-06-15  
**Repo checkpoint:** `6b7a280` or newer  
**Owner packet:** `docs/air-purifier/AP-OEM-PRIMARY-SUPABASE-AMAZON-DEMOTION-OWNER-REVIEW-v1.md`  
**Dry-run packet:** `docs/air-purifier/AP-OEM-PRIMARY-SUPABASE-AMAZON-DEMOTION-SQL-DRYRUN-OWNER-REVIEW-v1.md`  
**Scope:** ten approved Amazon `air_purifier_retailer_links` rows only

This result records a read-only Supabase preview of the same target selector from the SQL dry-run packet. No update, commit, CSV edit, code edit, deploy, or owner-decision row was executed.

**Execution note:** The local shell did not expose `psql` or a direct Postgres connection string, so the target selector was executed through the repo's Supabase service-role read path as `select` queries only. No `.update()` call was invoked. Durable mutation outcome is equivalent to the SQL packet's `ROLLBACK`: no Supabase row was changed.

---

## 1. Dry-run summary

| Check | Result | Label |
|-------|--------|-------|
| Mode | `dry_run_select_preview` | **PROVEN** |
| Data mutation | `false` | **PROVEN** |
| SQL `COMMIT` executed | `false` | **PROVEN** |
| Transaction outcome | `ROLLBACK_EQUIVALENT_NO_UPDATE_EXECUTED` | **PROVEN** |
| Target slug count | `10` | **PROVEN** |
| Filter match count | `10` | **PROVEN** |
| Target row count | `10` | **PROVEN** |
| Missing filter slugs | `[]` | **PROVEN** |
| Missing target slugs | `[]` | **PROVEN** |
| All selected rows `retailer_key = amazon` | `true` | **PROVEN** |
| All selected rows `status = approved` | `true` | **PROVEN** |
| All selected rows currently `direct_buyable` | `true` | **PROVEN** |
| Proposed `browser_truth_classification` | `null` for all ten | **PROVEN** |
| `oem-catalog` rows selected for demotion | `0` | **PROVEN** |
| Approved OEM rows present in scope | `10` | **PROVEN** |

---

## 2. Target rows previewed

| Slug | Link ID | Retailer | Status | Current classification | Proposed classification |
|------|---------|----------|--------|------------------------|-------------------------|
| `medify-ma25-rf` | `f7dabc20-074e-4720-b7d7-3fee5da9681d` | `amazon` | `approved` | `direct_buyable` | `null` |
| `medify-ma40-rf` | `242216a0-910d-45dd-8136-1d9873b81e4c` | `amazon` | `approved` | `direct_buyable` | `null` |
| `levoit-rf-rar040` | `3d6e5426-a1ac-43b9-ba14-62400eae56ff` | `amazon` | `approved` | `direct_buyable` | `null` |
| `levoit-rf-rar060` | `30632792-47f5-4f05-8d82-aa3e85e8319e` | `amazon` | `approved` | `direct_buyable` | `null` |
| `levoit-rf-cr200` | `644e779d-ab7d-4de0-9014-46893d16eb20` | `amazon` | `approved` | `direct_buyable` | `null` |
| `levoit-rf-c131` | `9099e927-aae6-42e4-8f09-064073fa90b9` | `amazon` | `approved` | `direct_buyable` | `null` |
| `gg-flt5000` | `fe83f216-cdef-44db-9d81-d0f64fa3d3e7` | `amazon` | `approved` | `direct_buyable` | `null` |
| `coway-max2-hepa` | `0e19ea40-298d-41f2-b408-4afbf6fb8450` | `amazon` | `approved` | `direct_buyable` | `null` |
| `winix-hepa-115115` | `bcf48678-b7c1-4228-9089-7e51eab6f8c7` | `amazon` | `approved` | `direct_buyable` | `null` |
| `honeywell-hrf-r1` | `3a3da8bf-e4bc-41ac-8424-489fcca3deab` | `amazon` | `approved` | `direct_buyable` | `null` |

---

## 3. OEM untouched proof

| Check | Result | Label |
|-------|--------|-------|
| Demotion selector used `retailer_key = amazon` | Yes | **PROVEN** |
| `oem-catalog` / `oem-parts-catalog` rows selected for demotion | `0` | **PROVEN** |
| Approved OEM rows present for the scoped filters | `10` | **PROVEN** |
| Any OEM row mutation attempted | No | **PROVEN** |

The dry-run preview selected Amazon rows only. OEM rows were read only for count/proof and were not included in the proposed demotion target set.

---

## 4. Exact read-only command shape

The executed proof used the repo's Supabase service-role read path and performed only:

- `select id, slug from air_purifier_filters where slug in (...)`
- `select ... from air_purifier_retailer_links where air_purifier_filter_id in (...) and retailer_key = 'amazon' and status = 'approved' and browser_truth_classification = 'direct_buyable'`
- `select ... from air_purifier_retailer_links where air_purifier_filter_id in (...) and retailer_key in ('oem-catalog', 'oem-parts-catalog') and status = 'approved'`

No `.update()`, `.upsert()`, `.insert()`, `.delete()`, SQL `COMMIT`, deploy, or CSV write path was invoked.

---

## 5. Result

The dry-run preview is clean for a future owner-approved apply packet:

- target row count is exactly `10`
- every target row is approved Amazon
- every target row currently has `browser_truth_classification = direct_buyable`
- proposed browser-truth fields are `null`
- no OEM row is selected for demotion

This document does not authorize the apply. A separate owner packet is still required before any Supabase mutation.
