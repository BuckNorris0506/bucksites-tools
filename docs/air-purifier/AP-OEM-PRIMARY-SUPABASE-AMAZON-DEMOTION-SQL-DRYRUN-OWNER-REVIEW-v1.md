# AP OEM-primary - Supabase Amazon demotion SQL dry-run owner review v1

## Ten-slug orphan Amazon cleanup

**Report type:** docs-only owner decision support - **SQL dry-run preview only**  
**Generated:** 2026-06-15  
**Repo checkpoint:** `6b7a280` or newer  
**Prior packet:** `docs/air-purifier/AP-OEM-PRIMARY-SUPABASE-AMAZON-DEMOTION-OWNER-REVIEW-v1.md`  
**Scope:** ten approved Amazon `air_purifier_retailer_links` rows only

This packet exists because the repo does not currently have a scoped Supabase helper that previews clearing `browser_truth_*` fields on selected Amazon rows. Existing AP Supabase parity helpers update rows from apply-plan `after_row` values; they are not a demotion/clear-browser-truth helper.

---

## 1. Exact target slugs

| # | Slug |
|---|------|
| 1 | `medify-ma25-rf` |
| 2 | `medify-ma40-rf` |
| 3 | `levoit-rf-rar040` |
| 4 | `levoit-rf-rar060` |
| 5 | `levoit-rf-cr200` |
| 6 | `levoit-rf-c131` |
| 7 | `gg-flt5000` |
| 8 | `coway-max2-hepa` |
| 9 | `winix-hepa-115115` |
| 10 | `honeywell-hrf-r1` |

Expected target row count: **10**.

---

## 2. Dry-run SQL preview

Run in Supabase SQL editor or `psql` only as a preview. This transaction performs no mutation and ends with `ROLLBACK`.

```sql
begin;

with target_slugs(slug) as (
  values
    ('medify-ma25-rf'),
    ('medify-ma40-rf'),
    ('levoit-rf-rar040'),
    ('levoit-rf-rar060'),
    ('levoit-rf-cr200'),
    ('levoit-rf-c131'),
    ('gg-flt5000'),
    ('coway-max2-hepa'),
    ('winix-hepa-115115'),
    ('honeywell-hrf-r1')
),
target_rows as (
  select
    f.slug,
    l.id as link_id,
    l.air_purifier_filter_id,
    l.retailer_key,
    l.status,
    l.is_primary,
    l.affiliate_url,
    l.destination_url,
    l.browser_truth_classification as current_browser_truth_classification,
    l.browser_truth_notes as current_browser_truth_notes,
    l.browser_truth_checked_at as current_browser_truth_checked_at,
    null::text as proposed_browser_truth_classification,
    null::text as proposed_browser_truth_notes,
    null::text as proposed_browser_truth_checked_at
  from target_slugs ts
  join public.air_purifier_filters f
    on f.slug = ts.slug
  join public.air_purifier_retailer_links l
    on l.air_purifier_filter_id = f.id
   and l.retailer_key = 'amazon'
   and l.status = 'approved'
  where l.browser_truth_classification = 'direct_buyable'
)
select
  count(*) as target_row_count,
  bool_and(retailer_key = 'amazon') as all_retailer_key_amazon,
  bool_and(status = 'approved') as all_status_approved,
  bool_and(current_browser_truth_classification = 'direct_buyable') as all_currently_direct_buyable,
  bool_and(proposed_browser_truth_classification is null) as all_proposed_classification_null
from target_rows;

with target_slugs(slug) as (
  values
    ('medify-ma25-rf'),
    ('medify-ma40-rf'),
    ('levoit-rf-rar040'),
    ('levoit-rf-rar060'),
    ('levoit-rf-cr200'),
    ('levoit-rf-c131'),
    ('gg-flt5000'),
    ('coway-max2-hepa'),
    ('winix-hepa-115115'),
    ('honeywell-hrf-r1')
)
select
  f.slug,
  l.id as link_id,
  l.retailer_key,
  l.status,
  l.is_primary,
  l.affiliate_url,
  l.destination_url,
  l.browser_truth_classification as current_browser_truth_classification,
  l.browser_truth_notes as current_browser_truth_notes,
  l.browser_truth_checked_at as current_browser_truth_checked_at,
  null::text as proposed_browser_truth_classification,
  null::text as proposed_browser_truth_notes,
  null::text as proposed_browser_truth_checked_at
from target_slugs ts
join public.air_purifier_filters f
  on f.slug = ts.slug
join public.air_purifier_retailer_links l
  on l.air_purifier_filter_id = f.id
 and l.retailer_key = 'amazon'
 and l.status = 'approved'
where l.browser_truth_classification = 'direct_buyable'
order by f.slug;

rollback;
```

---

## 3. Expected dry-run proof

| Check | Expected |
|-------|----------|
| Target row count | `10` |
| `retailer_key` | `amazon` for every row |
| `status` | `approved` for every row |
| Current `browser_truth_classification` | `direct_buyable` for every row |
| Proposed `browser_truth_classification` | `null` for every row |
| Proposed `browser_truth_notes` | `null` for every row |
| Proposed `browser_truth_checked_at` | `null` for every row |
| `oem-catalog` rows touched | `0` |

If `target_row_count` is not exactly `10`, hold and inspect before any apply packet.

---

## 4. Future apply shape (not authorized here)

This packet does **not** authorize apply. A future apply packet, if owner-approved, should use the same slug selector and row constraints:

- `public.air_purifier_filters.slug` in the ten-slug list
- `public.air_purifier_retailer_links.retailer_key = 'amazon'`
- `public.air_purifier_retailer_links.status = 'approved'`
- current `browser_truth_classification = 'direct_buyable'`

The apply patch should clear only:

- `browser_truth_classification`
- `browser_truth_notes`
- `browser_truth_checked_at`

It must not change:

- `affiliate_url`
- `destination_url`
- `retailer_name`
- `retailer_key`
- `retailer_slug`
- `is_primary`
- `status`
- any `oem-catalog` row

---

## 5. Explicit non-authorization

This packet does not authorize:

- `COMMIT`
- Supabase mutation
- CSV edits
- code edits
- deploy
- owner-decision rows
- `oem-catalog` mutation
- rows outside the ten target slugs
- ranking-policy changes
