# AP OEM-primary - Supabase Amazon demotion SQL commit result v1

## Ten-slug orphan Amazon cleanup

**Report type:** durable Supabase demotion result (docs-only)  
**Recorded:** 2026-06-15  
**Repo checkpoint:** `6b81ed7` or newer  
**Owner packet:** `docs/air-purifier/AP-OEM-PRIMARY-SUPABASE-AMAZON-DEMOTION-SQL-COMMIT-OWNER-REVIEW-v1.md`  
**Dry-run result:** `docs/air-purifier/AP-OEM-PRIMARY-SUPABASE-AMAZON-DEMOTION-SQL-DRYRUN-RESULT-v1.md`  
**Scope:** ten approved Amazon `air_purifier_retailer_links` rows only

This result records the authorized durable Supabase demotion. It does not record any CSV edit, code change, deploy, or owner-decision row creation.

---

## 1. Mutation result

| Field | Result | Label |
|-------|--------|-------|
| Mode | `apply` | **PROVEN** |
| Data mutation | `true` | **PROVEN** |
| `target_slug_count` | `10` | **PROVEN** |
| `filter_match_count` | `10` | **PROVEN** |
| `target_row_count_before` | `10` | **PROVEN** |
| `applied_change_count` | `10` | **PROVEN** |
| All changed rows `retailer_key = amazon` | `true` | **PROVEN** |
| All changed rows `status = approved` | `true` | **PROVEN** |
| All changed rows `browser_truth_classification = null` | `true` | **PROVEN** |
| All changed rows `browser_truth_notes = null` | `true` | **PROVEN** |
| All changed rows `browser_truth_checked_at = null` | `true` | **PROVEN** |
| `oem_catalog_rows_touched` | `0` | **PROVEN** |

---

## 2. Changed Amazon rows

| Slug | Link ID | Update count |
|------|---------|-------------:|
| `medify-ma25-rf` | `f7dabc20-074e-4720-b7d7-3fee5da9681d` | 1 |
| `medify-ma40-rf` | `242216a0-910d-45dd-8136-1d9873b81e4c` | 1 |
| `levoit-rf-rar040` | `3d6e5426-a1ac-43b9-ba14-62400eae56ff` | 1 |
| `levoit-rf-rar060` | `30632792-47f5-4f05-8d82-aa3e85e8319e` | 1 |
| `levoit-rf-cr200` | `644e779d-ab7d-4de0-9014-46893d16eb20` | 1 |
| `levoit-rf-c131` | `9099e927-aae6-42e4-8f09-064073fa90b9` | 1 |
| `gg-flt5000` | `fe83f216-cdef-44db-9d81-d0f64fa3d3e7` | 1 |
| `coway-max2-hepa` | `0e19ea40-298d-41f2-b408-4afbf6fb8450` | 1 |
| `winix-hepa-115115` | `bcf48678-b7c1-4228-9089-7e51eab6f8c7` | 1 |
| `honeywell-hrf-r1` | `3a3da8bf-e4bc-41ac-8424-489fcca3deab` | 1 |

Each row was updated with:

```sql
browser_truth_classification = null,
browser_truth_notes = null,
browser_truth_checked_at = null
```

No URL, retailer identity, primary flag, status, or OEM row was changed.

---

## 3. Post-apply Amazon verification

| Check | Result | Label |
|-------|--------|-------|
| In-scope approved Amazon rows still exist | `10` | **PROVEN** |
| In-scope approved Amazon rows with `direct_buyable` | `0` | **PROVEN** |
| In-scope Amazon `browser_truth_classification` | `null` for all ten | **PROVEN** |
| In-scope Amazon `browser_truth_notes` | `null` for all ten | **PROVEN** |
| In-scope Amazon `browser_truth_checked_at` | `null` for all ten | **PROVEN** |

Post-apply in-scope Amazon rows:

| Slug | Link ID | Classification after apply |
|------|---------|----------------------------|
| `medify-ma25-rf` | `f7dabc20-074e-4720-b7d7-3fee5da9681d` | `null` |
| `medify-ma40-rf` | `242216a0-910d-45dd-8136-1d9873b81e4c` | `null` |
| `levoit-rf-rar040` | `3d6e5426-a1ac-43b9-ba14-62400eae56ff` | `null` |
| `levoit-rf-rar060` | `30632792-47f5-4f05-8d82-aa3e85e8319e` | `null` |
| `levoit-rf-cr200` | `644e779d-ab7d-4de0-9014-46893d16eb20` | `null` |
| `levoit-rf-c131` | `9099e927-aae6-42e4-8f09-064073fa90b9` | `null` |
| `gg-flt5000` | `fe83f216-cdef-44db-9d81-d0f64fa3d3e7` | `null` |
| `coway-max2-hepa` | `0e19ea40-298d-41f2-b408-4afbf6fb8450` | `null` |
| `winix-hepa-115115` | `bcf48678-b7c1-4228-9089-7e51eab6f8c7` | `null` |
| `honeywell-hrf-r1` | `3a3da8bf-e4bc-41ac-8424-489fcca3deab` | `null` |

---

## 4. OEM untouched proof

| Check | Result | Label |
|-------|--------|-------|
| Approved OEM row count for scoped filters | `10` | **PROVEN** |
| Scoped OEM rows still `direct_buyable` | `10` | **PROVEN** |
| All scoped OEM rows remain `direct_buyable` | `true` | **PROVEN** |
| OEM rows touched by mutation | `0` | **PROVEN** |

Scoped OEM rows verified after apply:

| Slug | Link ID | Retailer key | Classification |
|------|---------|--------------|----------------|
| `medify-ma25-rf` | `4f04ae5b-332b-4d2d-97a2-77eef603b034` | `oem-catalog` | `direct_buyable` |
| `medify-ma40-rf` | `d48041b8-250f-4505-bf21-a67d65e979ab` | `oem-catalog` | `direct_buyable` |
| `levoit-rf-rar040` | `46127e68-4cb9-4156-be42-8ff041a5a349` | `oem-catalog` | `direct_buyable` |
| `levoit-rf-rar060` | `bd21d26b-a6e8-4d77-a9cb-98a5358c754a` | `oem-catalog` | `direct_buyable` |
| `levoit-rf-cr200` | `c5a818b9-02c9-4349-8bae-af9c50cfd15f` | `oem-catalog` | `direct_buyable` |
| `levoit-rf-c131` | `b11d77cb-ce83-427f-88cf-2d370e51ddc5` | `oem-catalog` | `direct_buyable` |
| `gg-flt5000` | `988418bc-078e-4b18-8a7b-50da09c6c557` | `oem-catalog` | `direct_buyable` |
| `coway-max2-hepa` | `cd2fbb38-3da0-4e5e-8782-52002be836f0` | `oem-catalog` | `direct_buyable` |
| `winix-hepa-115115` | `4a82e2aa-5311-4254-8b54-b9fcf6cf6027` | `oem-catalog` | `direct_buyable` |
| `honeywell-hrf-r1` | `04b71ae5-aa96-4981-bf98-204a7c3320e0` | `oem-catalog` | `direct_buyable` |

---

## 5. Non-target proof

| Check | Result | Label |
|-------|--------|-------|
| Non-target approved Amazon `direct_buyable` count before | `6` | **PROVEN** |
| Non-target approved Amazon `direct_buyable` count after | `6` | **PROVEN** |
| Non-target approved Amazon `direct_buyable` IDs unchanged | `true` | **PROVEN** |

This proves the executed update did not demote non-target approved Amazon `direct_buyable` rows.

---

## 6. Explicit non-actions

| Path | Status |
|------|--------|
| CSV edit | **Not performed** |
| Code change | **Not performed** |
| Deploy | **Not performed** |
| Owner-decision row creation | **Not performed** |
| OEM row mutation | **Not performed** |
| Non-target Amazon demotion | **Not performed** |

---

## 7. Remaining lane

Separate owner authorization is still required for any deploy or production smoke. This result does not authorize a ranking-policy change or any future Amazon/OEM data mutation.
