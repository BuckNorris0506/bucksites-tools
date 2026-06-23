-- AP Holmes HAPF30 Amazon demotion packet v1
-- git HEAD hint: add5beb
-- Purpose: Demote Supabase-only Amazon direct_buyable row (ASIN B005BFSBVY) for holmes-hapf30
-- READ-ONLY ARTIFACT — default ROLLBACK; owner replaces ROLLBACK with COMMIT after backup + validation
-- Scope: ONE slug (holmes-hapf30), ONE retailer_key (amazon), OEM primary search row NOT modified
-- Authority: Production Truth ap-suppressed-holmes-hapf30 FAIL; model-first REJECT; CSV has no Amazon row

-- =============================================================================
-- 0) PRE-FLIGHT — run outside transaction; save output as backup JSON
-- =============================================================================
-- See backup_export_command in ap-holmes-hapf30-amazon-demotion-packet-v1.json

SELECT f.id AS filter_id, f.slug, f.oem_part_number
FROM public.air_purifier_filters f
WHERE lower(f.slug) = 'holmes-hapf30';

SELECT
  l.id,
  l.air_purifier_filter_id,
  f.slug AS filter_slug,
  l.retailer_key,
  l.retailer_name,
  l.affiliate_url,
  l.destination_url,
  l.is_primary,
  l.status,
  l.browser_truth_classification,
  l.browser_truth_buyable_subtype,
  l.browser_truth_notes,
  l.browser_truth_checked_at,
  l.created_at
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'holmes-hapf30'
  AND l.status = 'approved'
ORDER BY l.is_primary DESC, l.retailer_key;

-- Target row preview (expect exactly 1 row before apply)
SELECT
  l.id,
  f.slug,
  l.retailer_key,
  l.affiliate_url,
  l.browser_truth_classification
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'holmes-hapf30'
  AND l.retailer_key = 'amazon'
  AND l.status = 'approved'
  AND (
    l.affiliate_url ILIKE '%B005BFSBVY%'
    OR l.destination_url ILIKE '%B005BFSBVY%'
  );
-- expect 1 row with browser_truth_classification = 'direct_buyable'

-- =============================================================================
-- 1) DEMOTION — clear browser_truth on Amazon row only
-- =============================================================================

BEGIN;

WITH target_filter AS (
  SELECT id
  FROM public.air_purifier_filters
  WHERE lower(slug) = 'holmes-hapf30'
),
target_links AS (
  SELECT l.id
  FROM public.air_purifier_retailer_links l
  INNER JOIN target_filter tf ON tf.id = l.air_purifier_filter_id
  WHERE l.retailer_key = 'amazon'
    AND l.status = 'approved'
    AND (
      l.affiliate_url ILIKE '%B005BFSBVY%'
      OR l.destination_url ILIKE '%B005BFSBVY%'
    )
)
UPDATE public.air_purifier_retailer_links l
SET
  browser_truth_classification = NULL,
  browser_truth_notes = $bt_notes$Demoted: Production Truth ap-suppressed-holmes-hapf30 alarm; supabase_only vs CSV; model-first REJECT 2026-06-22 (ap-model-first-holmes-hapf30-live-browser-v1). Pending search_placeholder_rescue — do not restore direct_buyable without fresh owner browser evidence.$bt_notes$,
  browser_truth_checked_at = NULL,
  browser_truth_buyable_subtype = NULL
FROM target_links tl
WHERE l.id = tl.id;

-- =============================================================================
-- 2) POST-UPDATE VERIFICATION (inside transaction, before COMMIT)
-- =============================================================================

-- Amazon row demoted
SELECT
  l.id,
  f.slug,
  l.retailer_key,
  l.browser_truth_classification,
  l.browser_truth_checked_at
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'holmes-hapf30'
  AND l.retailer_key = 'amazon'
  AND l.status = 'approved';
-- expect browser_truth_classification IS NULL

-- No approved direct_buyable rows remain for slug (runtime gate proxy)
SELECT
  l.id,
  f.slug,
  l.retailer_key,
  l.browser_truth_classification,
  l.is_primary
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'holmes-hapf30'
  AND l.status = 'approved'
  AND l.browser_truth_classification = 'direct_buyable';
-- expect 0 rows

-- OEM primary unchanged (still search inventory row; gated off buy path)
SELECT
  l.id,
  l.retailer_key,
  l.is_primary,
  l.affiliate_url,
  l.browser_truth_classification
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'holmes-hapf30'
  AND l.retailer_key = 'oem-catalog'
  AND l.is_primary = true
  AND l.status = 'approved';
-- expect 1 row; affiliate_url still contains /search?

ROLLBACK;
-- COMMIT;
