-- Amazon LT600P retailer_links insert plan (read-only doc; dry-run transaction).
-- Prepared 2026-05-03.
-- Do not execute blindly. Default transaction ends with ROLLBACK.
--
-- =============================================================================
-- SECTION 0 — Proof summary (browser / operator evidence, not executed here)
-- =============================================================================
-- Token: LT600P
-- filter_id: f6ba1f25-c983-4ff5-b47b-7334845b0d92
-- filter_slug: lt600p
-- oem_part_number: LT600P
--
-- Amazon PDP (aftermarket / compatible — PUREPLUS replacement, NOT LG OEM):
-- - Canonical /dp: https://www.amazon.com/dp/B07VGD8Z5Z
-- - Inspected proof PDP (SEO /dp path): https://www.amazon.com/PUREPLUS-5231JA2006A-Refrigerator-5231JA2006B-5231JA2006E/dp/B07VGD8Z5Z
-- - PDP title: Replacement for LG LT600P … 3Pack; bullets list LT600P / 5231JA2006* cross-refs; table Set Name | 3 Pack.
-- - Compatible spare part disclaimer (manufacturers' names for reference only); Manufacturer PUREPLUS — not LG OEM.
--
-- browser_truth_buyable_subtype policy basis (repo, not memory):
-- - src/lib/retailers/launch-buy-links.ts — BUYABLE_SUBTYPES.MULTIPACK_DIRECT_BUYABLE is a first-class normalized subtype for gates/copy.
-- - Prior shipped evidence pattern: data/evidence/amazon-da29-00019a-live-outcome.2026-04-30.json uses MULTIPACK_DIRECT_BUYABLE on a live Amazon row.
-- - PDP is explicit 3-pack / per-count pricing on inspected listing — aligns with MULTIPACK_DIRECT_BUYABLE.
--
-- DB inventory (read-only confirmation before this plan; re-verify in section 3–5):
-- - Exactly one retailer_links row for this filter_id: oem-parts-catalog (RepairClinic search URL), is_primary true.
-- - No retailer_key = 'amazon' row for this filter_id.
-- - Blocked OEM-catalog row id (reference only; do NOT update this row in this plan):
--   -- 4d411c64-d4cc-4706-a77c-845c043ac458
--
-- Planned new row (amazon slot):
-- - retailer_key / retailer_slug: amazon
-- - retailer_name: Amazon
-- - affiliate_url / destination_url: https://www.amazon.com/dp/B07VGD8Z5Z
-- - is_primary: false (do not steal primary from existing RepairClinic row in this plan)
-- - status: approved, source: manual
-- - browser_truth_classification: direct_buyable
-- - browser_truth_buyable_subtype: MULTIPACK_DIRECT_BUYABLE
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
WHERE id = 'f6ba1f25-c983-4ff5-b47b-7334845b0d92'::uuid
   OR lower(slug) = 'lt600p'
   OR upper(oem_part_number) = 'LT600P'
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
WHERE filter_id = 'f6ba1f25-c983-4ff5-b47b-7334845b0d92'::uuid
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
WHERE filter_id = 'f6ba1f25-c983-4ff5-b47b-7334845b0d92'::uuid
  AND retailer_key = 'amazon'
ORDER BY id;

SELECT count(*)::bigint AS amazon_row_count_before_insert
FROM public.retailer_links
WHERE filter_id = 'f6ba1f25-c983-4ff5-b47b-7334845b0d92'::uuid
  AND retailer_key = 'amazon';

-- ---------------------------------------------------------------------------
-- 6) Guarded INSERT — only when no (filter_id, retailer_key='amazon') row exists
--    browser_truth_notes: aftermarket PUREPLUS compatible 3-pack replacement for LT600P, NOT LG OEM.
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
  'f6ba1f25-c983-4ff5-b47b-7334845b0d92'::uuid,
  'Amazon',
  'amazon',
  'https://www.amazon.com/dp/B07VGD8Z5Z',
  'https://www.amazon.com/dp/B07VGD8Z5Z',
  false,
  'amazon',
  'approved',
  'manual',
  'direct_buyable',
  'MULTIPACK_DIRECT_BUYABLE',
  'Aftermarket PUREPLUS compatible 3-pack replacement for LT600P (ASIN B07VGD8Z5Z); PDP cross-refs LT600P/5231JA2006 family. Not LG OEM.',
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.retailer_links l
  WHERE l.filter_id = 'f6ba1f25-c983-4ff5-b47b-7334845b0d92'::uuid
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
WHERE filter_id = 'f6ba1f25-c983-4ff5-b47b-7334845b0d92'::uuid
  AND retailer_key = 'amazon'
ORDER BY id;

-- ---------------------------------------------------------------------------
-- 10) Post-insert amazon count — must be 1
-- ---------------------------------------------------------------------------
SELECT count(*)::bigint AS amazon_row_count_after_insert
FROM public.retailer_links
WHERE filter_id = 'f6ba1f25-c983-4ff5-b47b-7334845b0d92'::uuid
  AND retailer_key = 'amazon';

-- Default safety: dry run only. Uncomment COMMIT only after manual review in prod.
ROLLBACK;
-- COMMIT;
