-- Amazon LT1000PC retailer_links insert plan (read-only doc; dry-run transaction).
-- Prepared 2026-05-03.
-- Do not execute blindly. Default transaction ends with ROLLBACK.
--
-- =============================================================================
-- SECTION 0 — Proof summary (browser / operator evidence, not executed here)
-- =============================================================================
-- Token: LT1000PC
-- filter_id: 1e0fdf15-3698-498b-88ed-741b6ac76b59
-- filter_slug: lt1000pc
-- oem_part_number: LT1000PC
--
-- Amazon PDP (aftermarket / compatible — Waterdrop replacement, NOT LG OEM):
-- - Canonical /dp: https://www.amazon.com/dp/B07H9LHMR2
-- - Inspected proof PDP (SEO /dp path): https://www.amazon.com/Waterdrop-Refrigerator-Replacement-ADQ74793501-ADQ74793502/dp/B07H9LHMR2
-- - PDP title and bullets reference LT1000PC, LT1000P family, and ADQ747935 cross-references; Waterdrop independent brand / compatible spare part disclaimer — not LG OEM.
--
-- DB inventory (read-only confirmation before this plan; re-verify in section 3–5):
-- - Exactly one retailer_links row for this filter_id: oem-parts-catalog (RepairClinic search URL), is_primary true.
-- - No retailer_key = 'amazon' row for this filter_id.
-- - Blocked OEM-catalog row id (reference only; do NOT update this row in this plan):
--   -- 3f34023b-c7e2-447b-9c1f-6b61e162e43f
--
-- Planned new row (amazon slot):
-- - retailer_key / retailer_slug: amazon
-- - retailer_name: Amazon
-- - affiliate_url / destination_url: https://www.amazon.com/dp/B07H9LHMR2
-- - is_primary: false (do not steal primary from existing RepairClinic row in this plan)
-- - status: approved, source: manual
-- - browser_truth_classification: direct_buyable
-- - browser_truth_buyable_subtype: NULL
--
-- =============================================================================
-- SECTION 0 — Hard stops (abort or resolve before COMMIT)
-- =============================================================================
-- 1) Section 3 returns zero rows or more than one distinct filter — STOP.
-- 2) Section 4 row count is not exactly 1, or the sole row is not oem-parts-catalog — STOP and re-audit.
-- 3) Section 5 shows any existing row with retailer_key = 'amazon' for this filter_id — STOP (duplicate slot).
-- 4) Section 6 INSERT returns zero rows — STOP (duplicate raced in, or NOT EXISTS fired incorrectly).
-- 5) Section 6 INSERT returns more than one row — STOP (should be impossible with NOT EXISTS guard).
-- 6) Section 9–10: amazon row count must be exactly 1 — STOP if not 1.
-- 7) Do not UPDATE the existing oem-parts-catalog / RepairClinic row in this plan.
-- 8) If policy requires LG OEM PDP only, this aftermarket plan must not ship — STOP.

BEGIN;

-- ---------------------------------------------------------------------------
-- 3) Filter sanity — expect exactly one row
-- ---------------------------------------------------------------------------
SELECT
  id,
  slug,
  oem_part_number
FROM public.filters
WHERE id = '1e0fdf15-3698-498b-88ed-741b6ac76b59'::uuid
   OR lower(slug) = 'lt1000pc'
   OR upper(oem_part_number) = 'LT1000PC'
ORDER BY id;

-- ---------------------------------------------------------------------------
-- 4) Current retailer_links inventory for this filter (expect RepairClinic only)
-- ---------------------------------------------------------------------------
SELECT
  id,
  filter_id,
  retailer_key,
  retailer_name,
  retailer_slug,
  affiliate_url,
  destination_url,
  is_primary,
  status,
  source,
  browser_truth_classification,
  browser_truth_buyable_subtype,
  browser_truth_notes,
  browser_truth_checked_at
FROM public.retailer_links
WHERE filter_id = '1e0fdf15-3698-498b-88ed-741b6ac76b59'::uuid
ORDER BY retailer_key, id;

-- ---------------------------------------------------------------------------
-- 5) Pre-insert amazon slot — expect zero rows; count must be 0
-- ---------------------------------------------------------------------------
SELECT
  id,
  filter_id,
  retailer_key,
  retailer_name,
  affiliate_url,
  destination_url,
  is_primary,
  status,
  source,
  browser_truth_classification,
  browser_truth_buyable_subtype
FROM public.retailer_links
WHERE filter_id = '1e0fdf15-3698-498b-88ed-741b6ac76b59'::uuid
  AND retailer_key = 'amazon'
ORDER BY id;

SELECT count(*)::bigint AS amazon_row_count_before_insert
FROM public.retailer_links
WHERE filter_id = '1e0fdf15-3698-498b-88ed-741b6ac76b59'::uuid
  AND retailer_key = 'amazon';

-- ---------------------------------------------------------------------------
-- 6) Guarded INSERT — only when no (filter_id, retailer_key='amazon') row exists
--    browser_truth_notes: aftermarket Waterdrop compatible replacement for LT1000PC, NOT LG OEM.
-- ---------------------------------------------------------------------------
INSERT INTO public.retailer_links (
  filter_id,
  retailer_name,
  retailer_slug,
  affiliate_url,
  destination_url,
  is_primary,
  retailer_key,
  status,
  source,
  browser_truth_classification,
  browser_truth_buyable_subtype,
  browser_truth_notes,
  browser_truth_checked_at
)
SELECT
  '1e0fdf15-3698-498b-88ed-741b6ac76b59'::uuid,
  'Amazon',
  'amazon',
  'https://www.amazon.com/dp/B07H9LHMR2',
  'https://www.amazon.com/dp/B07H9LHMR2',
  false,
  'amazon',
  'approved',
  'manual',
  'direct_buyable',
  NULL,
  'Aftermarket Waterdrop compatible replacement for LT1000PC (ASIN B07H9LHMR2); PDP cross-refs LT1000PC/LT1000P/ADQ747935 family. Not LG OEM.',
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.retailer_links l
  WHERE l.filter_id = '1e0fdf15-3698-498b-88ed-741b6ac76b59'::uuid
    AND l.retailer_key = 'amazon'
)
RETURNING
  id,
  filter_id,
  retailer_key,
  retailer_name,
  retailer_slug,
  affiliate_url,
  destination_url,
  is_primary,
  status,
  source,
  browser_truth_classification,
  browser_truth_buyable_subtype,
  browser_truth_notes,
  browser_truth_checked_at;

-- Operator: INSERT … RETURNING must return exactly one row.

-- ---------------------------------------------------------------------------
-- 9) Post-insert verification — amazon row shape
-- ---------------------------------------------------------------------------
SELECT
  id,
  filter_id,
  retailer_key,
  retailer_name,
  retailer_slug,
  affiliate_url,
  destination_url,
  is_primary,
  status,
  source,
  browser_truth_classification,
  browser_truth_buyable_subtype,
  browser_truth_notes,
  browser_truth_checked_at
FROM public.retailer_links
WHERE filter_id = '1e0fdf15-3698-498b-88ed-741b6ac76b59'::uuid
  AND retailer_key = 'amazon'
ORDER BY id;

-- ---------------------------------------------------------------------------
-- 10) Post-insert amazon count — must be 1
-- ---------------------------------------------------------------------------
SELECT count(*)::bigint AS amazon_row_count_after_insert
FROM public.retailer_links
WHERE filter_id = '1e0fdf15-3698-498b-88ed-741b6ac76b59'::uuid
  AND retailer_key = 'amazon';

-- Default safety: dry run only. Uncomment COMMIT only after manual review in prod.
ROLLBACK;
-- COMMIT;
