# AP OEM-primary - Supabase Amazon demotion SQL commit owner review v1

## Ten-slug orphan Amazon cleanup

**Report type:** docs-only owner decision support - **durable Supabase demotion authorization only**  
**Generated:** 2026-06-15  
**Repo checkpoint:** `eadf437` or newer  
**Prior owner packet:** `docs/air-purifier/AP-OEM-PRIMARY-SUPABASE-AMAZON-DEMOTION-OWNER-REVIEW-v1.md`  
**Dry-run packet:** `docs/air-purifier/AP-OEM-PRIMARY-SUPABASE-AMAZON-DEMOTION-SQL-DRYRUN-OWNER-REVIEW-v1.md`  
**Dry-run result:** `docs/air-purifier/AP-OEM-PRIMARY-SUPABASE-AMAZON-DEMOTION-SQL-DRYRUN-RESULT-v1.md`  
**Scope:** ten approved Amazon `air_purifier_retailer_links` rows only

This packet asks for one owner decision: whether to authorize durable Supabase demotion of the scoped Amazon rows that passed dry-run preview.

---

## 1. Dry-run proof

| Check | Result | Label |
|-------|--------|-------|
| `target_slug_count` | `10` | **PROVEN** |
| `filter_match_count` | `10` | **PROVEN** |
| `target_row_count` | `10` | **PROVEN** |
| `missing_filter_slugs` | `[]` | **PROVEN** |
| `missing_target_slugs` | `[]` | **PROVEN** |
| `all_retailer_key_amazon` | `true` | **PROVEN** |
| `all_status_approved` | `true` | **PROVEN** |
| `all_currently_direct_buyable` | `true` | **PROVEN** |
| `all_proposed_classification_null` | `true` | **PROVEN** |
| `oem-catalog` rows selected for demotion | `0` | **PROVEN** |
| Dry-run `data_mutation` | `false` | **PROVEN** |

---

## 2. Exact scoped targets

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

---

## 3. Exact intended mutation

Target table:

```text
public.air_purifier_retailer_links
```

Rows are eligible only when all of these are true:

- parent `public.air_purifier_filters.slug` is in the ten-slug list above
- `public.air_purifier_retailer_links.retailer_key = 'amazon'`
- `public.air_purifier_retailer_links.status = 'approved'`
- `public.air_purifier_retailer_links.browser_truth_classification = 'direct_buyable'`

Set exactly these fields:

```sql
browser_truth_classification = null,
browser_truth_notes = null,
browser_truth_checked_at = null
```

Do not change:

- `affiliate_url`
- `destination_url`
- `retailer_name`
- `retailer_key`
- `retailer_slug`
- `is_primary`
- `status`
- any `oem-catalog` or `oem-parts-catalog` row
- any row outside the ten scoped slugs

---

## 4. Owner decision requested

Choose exactly one option and record in chat. Do not create `data/owner-decisions/` rows from this packet.

```text
OPTION A - AUTHORIZE DURABLE SUPABASE DEMOTION OF ALL 10 SCOPED AMAZON ROWS

I authorize durable Supabase demotion for the ten approved Amazon
air_purifier_retailer_links rows scoped in
AP-OEM-PRIMARY-SUPABASE-AMAZON-DEMOTION-SQL-COMMIT-OWNER-REVIEW-v1.

For rows where:
  retailer_key = 'amazon'
  status = 'approved'
  parent filter slug is in the ten-slug list
  browser_truth_classification = 'direct_buyable'

Set:
  browser_truth_classification = null
  browser_truth_notes = null
  browser_truth_checked_at = null

I do NOT authorize: CSV edit, code change, deploy, owner-decision rows,
oem-catalog mutation, ranking-policy changes, or slugs outside the ten-slug list.
```

```text
OPTION B - AUTHORIZE NAMED SUBSET ONLY

I authorize durable Supabase demotion only for these named slugs:
  [owner lists slug(s)]

All unlisted slugs remain unchanged. The same row selector, field patch, and
non-authorization boundaries from Option A apply.
```

```text
OPTION C - HOLD

I do not authorize durable Supabase Amazon demotion at this time.
```

---

## 5. Explicit non-authorization

This packet does not authorize:

- running any mutation before owner records Option A or Option B
- editing `data/air-purifier/retailer_links.csv`
- editing `data/retailer_links.csv`
- code changes
- deploy
- creating `data/owner-decisions/` rows
- mutating `oem-catalog` or `oem-parts-catalog` rows
- mutating rows outside the ten scoped slugs
- ranking-policy changes

---

## 6. Required post-apply proof if authorized later

After a separately authorized apply, record a result document proving:

- applied row count
- affected slugs
- all updated rows had `retailer_key = amazon`
- all updated rows had `status = approved`
- all updated rows now have `browser_truth_classification = null`
- `oem-catalog` rows touched = `0`
- no CSV, code, deploy, or owner-decision mutation occurred
