-- Amazon multipack insert plan (single clear candidate: DA29-00019A)
-- Prepared 2026-04-30.
-- Do not execute blindly. Transaction defaults to ROLLBACK.
--
-- Candidate:
-- - token: DA29-00019A
-- - filter_id: 7f84c6ad-b8ba-4b7e-98b6-c4f5c1d6cd7d
-- - canonical_dp_url: https://www.amazon.com/dp/B019HPTP3G
-- - browser_truth_classification: direct_buyable
-- - browser_truth_buyable_subtype: MULTIPACK_DIRECT_BUYABLE

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Optional ID sanity check (wrong filter/part id stop condition)
--    Expect exactly one row with slug/oem token mapping to this filter_id.
-- ---------------------------------------------------------------------------
SELECT
  id,
  slug,
  oem_part_number
FROM public.filters
WHERE id = '7f84c6ad-b8ba-4b7e-98b6-c4f5c1d6cd7d'::uuid
   OR slug = 'da29-00019a'
   OR oem_part_number = 'DA29-00019A'
ORDER BY id;

-- ---------------------------------------------------------------------------
-- 1) Pre-insert duplicate select (hard stop if amazon slot already exists)
-- ---------------------------------------------------------------------------
SELECT
  id,
  filter_id,
  retailer_key,
  retailer_name,
  affiliate_url,
  destination_url,
  browser_truth_classification,
  browser_truth_buyable_subtype,
  browser_truth_notes,
  browser_truth_checked_at
FROM public.retailer_links
WHERE filter_id = '7f84c6ad-b8ba-4b7e-98b6-c4f5c1d6cd7d'::uuid
  AND retailer_key = 'amazon'
ORDER BY id;

-- Operator expectation before INSERT:
-- - row count = 0

-- ---------------------------------------------------------------------------
-- 2) Guarded INSERT (single row only, only when no amazon slot exists)
-- ---------------------------------------------------------------------------
INSERT INTO public.retailer_links (
  filter_id,
  retailer_name,
  retailer_slug,
  affiliate_url,
  destination_url,
  is_primary,
  retailer_key,
  browser_truth_classification,
  browser_truth_buyable_subtype,
  browser_truth_notes,
  browser_truth_checked_at
)
SELECT
  '7f84c6ad-b8ba-4b7e-98b6-c4f5c1d6cd7d'::uuid,
  'Amazon',
  'amazon',
  'https://www.amazon.com/dp/B019HPTP3G',
  'https://www.amazon.com/dp/B019HPTP3G',
  false,
  'amazon',
  'direct_buyable',
  'MULTIPACK_DIRECT_BUYABLE',
  'Manual exact-token multipack evidence 2026-04-30.',
  '2026-04-30T00:00:00+00'::timestamptz
WHERE NOT EXISTS (
  SELECT 1
  FROM public.retailer_links l
  WHERE l.filter_id = '7f84c6ad-b8ba-4b7e-98b6-c4f5c1d6cd7d'::uuid
    AND l.retailer_key = 'amazon'
);

-- Operator expectation:
-- - INSERT row count must be exactly 1.
-- - If row count is 0, duplicate exists (stop).
-- - If row count >1, stop.

-- ---------------------------------------------------------------------------
-- 3) Post-insert verification select
-- ---------------------------------------------------------------------------
SELECT
  id,
  filter_id,
  retailer_key,
  retailer_name,
  affiliate_url,
  destination_url,
  browser_truth_classification,
  browser_truth_buyable_subtype,
  browser_truth_notes,
  browser_truth_checked_at
FROM public.retailer_links
WHERE filter_id = '7f84c6ad-b8ba-4b7e-98b6-c4f5c1d6cd7d'::uuid
  AND retailer_key = 'amazon'
ORDER BY id;

-- Post-check expectations:
-- - row count = 1
-- - affiliate_url = destination_url = https://www.amazon.com/dp/B019HPTP3G
-- - browser_truth_classification = direct_buyable
-- - browser_truth_buyable_subtype = MULTIPACK_DIRECT_BUYABLE

-- Default safety: dry run only.
ROLLBACK;
-- COMMIT;
