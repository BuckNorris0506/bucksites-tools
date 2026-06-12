-- AP Winix Filter H 116130 — one-slug Supabase insert plan (dry-run default).
-- Prepared: 2026-06-10 · Repo checkpoint: d58afca
-- Scope: winix-filter-h-116130 ONLY — do not demote winix-carbon-116131
--
-- DEFAULT: transaction ends with ROLLBACK (no durable mutation).
-- COMMIT is NOT AUTHORIZED by the owner packet unless separately approved after dry-run review.
--
-- Execute in Supabase SQL editor or psql with service-role / migration privileges.
-- Do not run seed:import:air-purifier in the same session.

BEGIN;

-- =============================================================================
-- SECTION 1 — Preflight SELECTs (read-only within transaction)
-- =============================================================================

-- 1a) Brand winix must exist (expect exactly 1 row)
SELECT id, slug, name
FROM public.brands
WHERE lower(slug) = 'winix'
ORDER BY id;

-- 1b) Model winix-5500-2 must exist (expect exactly 1 row)
SELECT id, slug, model_number, title
FROM public.air_purifier_models
WHERE lower(slug) = 'winix-5500-2'
ORDER BY id;

-- 1c) Target filter must NOT exist yet (expect 0 rows)
SELECT id, slug, oem_part_number, name
FROM public.air_purifier_filters
WHERE lower(slug) = 'winix-filter-h-116130'
ORDER BY id;

-- 1d) oem_part_number collision check — expect 0 rows for WINIX-116130
SELECT id, slug, oem_part_number
FROM public.air_purifier_filters
WHERE upper(oem_part_number) = 'WINIX-116130'
ORDER BY id;

-- 1e) winix-carbon-116131 baseline (snapshot BEFORE insert — do not modify)
SELECT id, slug, oem_part_number, name
FROM public.air_purifier_filters
WHERE lower(slug) = 'winix-carbon-116131'
ORDER BY id;

SELECT m.slug AS model_slug, f.slug AS filter_slug, c.is_recommended
FROM public.air_purifier_compatibility_mappings c
JOIN public.air_purifier_models m ON m.id = c.air_purifier_model_id
JOIN public.air_purifier_filters f ON f.id = c.air_purifier_filter_id
WHERE lower(m.slug) = 'winix-5500-2'
  AND lower(f.slug) = 'winix-carbon-116131';

SELECT l.id, f.slug, l.retailer_key, l.affiliate_url, l.destination_url, l.is_primary, l.status
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'winix-carbon-116131'
  AND l.status = 'approved'
ORDER BY l.retailer_key;

-- 1f) Approved oem-catalog slot must be vacant for new filter (expect 0 — filter absent)
SELECT l.id, f.slug, l.retailer_key
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'winix-filter-h-116130'
  AND l.retailer_key = 'oem-catalog'
  AND l.status = 'approved';

-- =============================================================================
-- HARD STOPS — abort dry-run review if:
--   • brand or model preflight returns 0 rows
--   • 1c or 1d returns any row (slug or oem already present)
--   • 1e carbon baseline missing unexpectedly
-- =============================================================================

-- =============================================================================
-- SECTION 2 — Guarded INSERTs (rolled back unless owner separately authorizes COMMIT)
-- =============================================================================

-- 2a) air_purifier_filters
WITH brand AS (
  SELECT id FROM public.brands WHERE lower(slug) = 'winix' LIMIT 1
)
INSERT INTO public.air_purifier_filters (
  brand_id,
  slug,
  oem_part_number,
  name,
  replacement_interval_months,
  notes
)
SELECT
  brand.id,
  'winix-filter-h-116130',
  'WINIX-116130',
  'Winix Filter H (116130)',
  12,
  'Official Winix Filter H replacement set SKU 116130; net-new identity — do not alias to winix-carbon-116131'
FROM brand
WHERE NOT EXISTS (
  SELECT 1 FROM public.air_purifier_filters WHERE lower(slug) = 'winix-filter-h-116130'
)
AND NOT EXISTS (
  SELECT 1 FROM public.air_purifier_filters WHERE upper(oem_part_number) = 'WINIX-116130'
)
RETURNING id, slug, oem_part_number, name;

-- 2b) air_purifier_filter_aliases (alias 116130)
INSERT INTO public.air_purifier_filter_aliases (air_purifier_filter_id, alias)
SELECT f.id, '116130'
FROM public.air_purifier_filters f
WHERE lower(f.slug) = 'winix-filter-h-116130'
  AND NOT EXISTS (
    SELECT 1
    FROM public.air_purifier_filter_aliases a
    WHERE a.air_purifier_filter_id = f.id
      AND lower(a.alias) = '116130'
  )
RETURNING air_purifier_filter_id, alias;

-- 2c) air_purifier_compatibility_mappings (winix-5500-2 → winix-filter-h-116130)
INSERT INTO public.air_purifier_compatibility_mappings (
  air_purifier_model_id,
  air_purifier_filter_id,
  is_recommended
)
SELECT m.id, f.id, true
FROM public.air_purifier_models m
JOIN public.air_purifier_filters f ON lower(f.slug) = 'winix-filter-h-116130'
WHERE lower(m.slug) = 'winix-5500-2'
  AND NOT EXISTS (
    SELECT 1
    FROM public.air_purifier_compatibility_mappings c
    WHERE c.air_purifier_model_id = m.id
      AND c.air_purifier_filter_id = f.id
  )
RETURNING air_purifier_model_id, air_purifier_filter_id, is_recommended;

-- 2d) air_purifier_retailer_links — primary oem-catalog with browser_truth from committed CSV
INSERT INTO public.air_purifier_retailer_links (
  air_purifier_filter_id,
  retailer_name,
  affiliate_url,
  destination_url,
  retailer_slug,
  retailer_key,
  is_primary,
  status,
  source,
  browser_truth_classification,
  browser_truth_notes,
  browser_truth_checked_at
)
SELECT
  f.id,
  'OEM / manufacturer catalog (keyword lookup)',
  'https://www.winixamerica.com/product/filter-h-116130/',
  'https://www.winixamerica.com/product/filter-h-116130/',
  'oem-catalog',
  'oem-catalog',
  true,
  'approved',
  'manual',
  'direct_buyable',
  $bt_notes$PROVEN: Live re-proof 2026-06-10 (owner Option A AP-EVIDENCE-WRITE-OWNER-REVIEW-WINIX-FILTER-H-116130-v1): opened committed repo search placeholder https://www.winixamerica.com/search?q=WINIX-116130 — HTTP 404 Page not found. PROVEN: Alternate bare storefront search ?s=116130 returns Filter H result; navigated to official Filter H PDP. PROVEN: Primary H1/title Filter H – 116130; schema.org sku 116130; body cites Winix 116130 Replacement Filter H. PROVEN: In stock with Add to cart at $54.99. PROVEN: Compatible models 5500-2 and AM80 per product copy. INFERRED: Catalog internal token WINIX-116130 not printed on PDP (alias 116130 per filter_aliases.csv). PROVEN: Filter A – 115115 and Filter I – 116131 appear only in shopmulti cross-sell carousel below primary slice—not wrong-family in primary product area. UNKNOWN: Whether /search?q=WINIX-116130 path will be restored on Winix storefront.$bt_notes$,
  '2026-06-12T18:47:54.123Z'::timestamptz
FROM public.air_purifier_filters f
WHERE lower(f.slug) = 'winix-filter-h-116130'
  AND NOT EXISTS (
    SELECT 1
    FROM public.air_purifier_retailer_links l
    WHERE l.air_purifier_filter_id = f.id
      AND l.retailer_key = 'oem-catalog'
      AND l.status = 'approved'
  )
RETURNING
  id,
  air_purifier_filter_id,
  retailer_key,
  affiliate_url,
  destination_url,
  is_primary,
  browser_truth_classification,
  browser_truth_checked_at;

-- =============================================================================
-- SECTION 3 — Post-insert verification SELECTs (within same transaction)
-- =============================================================================

SELECT id, slug, oem_part_number, name, replacement_interval_months
FROM public.air_purifier_filters
WHERE lower(slug) = 'winix-filter-h-116130';

SELECT a.alias, f.slug
FROM public.air_purifier_filter_aliases a
JOIN public.air_purifier_filters f ON f.id = a.air_purifier_filter_id
WHERE lower(f.slug) = 'winix-filter-h-116130';

SELECT m.slug AS model_slug, f.slug AS filter_slug, c.is_recommended
FROM public.air_purifier_compatibility_mappings c
JOIN public.air_purifier_models m ON m.id = c.air_purifier_model_id
JOIN public.air_purifier_filters f ON f.id = c.air_purifier_filter_id
WHERE lower(f.slug) = 'winix-filter-h-116130';

SELECT
  f.slug,
  l.retailer_key,
  l.affiliate_url,
  l.destination_url,
  l.is_primary,
  l.browser_truth_classification,
  l.browser_truth_checked_at,
  left(l.browser_truth_notes, 80) AS browser_truth_notes_prefix
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'winix-filter-h-116130'
  AND l.status = 'approved'
ORDER BY l.retailer_key;

-- 3b) winix-carbon-116131 unchanged (compare to section 1e baseline)
SELECT id, slug, oem_part_number
FROM public.air_purifier_filters
WHERE lower(slug) = 'winix-carbon-116131';

SELECT m.slug AS model_slug, f.slug AS filter_slug, c.is_recommended
FROM public.air_purifier_compatibility_mappings c
JOIN public.air_purifier_models m ON m.id = c.air_purifier_model_id
JOIN public.air_purifier_filters f ON f.id = c.air_purifier_filter_id
WHERE lower(m.slug) = 'winix-5500-2'
  AND lower(f.slug) = 'winix-carbon-116131';

-- =============================================================================
-- DEFAULT — dry-run only (NOT AUTHORIZED: COMMIT)
-- =============================================================================
ROLLBACK;

-- To persist (SEPARATE owner authorization only — not enabled by default packet):
-- COMMIT;
