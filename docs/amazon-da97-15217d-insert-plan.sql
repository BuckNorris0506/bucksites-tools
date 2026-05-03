-- Amazon insert plan — Samsung refrigerator water / ice path part DA97-15217D
-- Prepared 2026-05-03.
-- Do not execute blindly. Transaction defaults to ROLLBACK.
--
-- =============================================================================
-- SECTION 0 — Proof summary (operator) and HARD STOPS
-- =============================================================================
--
-- Proven target (read-only service-role inventory 2026-05-03):
--   filter_id:        5487ef82-2010-44d4-bb18-bf71e6ae35ba
--   filter_slug:      da97-15217d
--   oem_part_number:  DA97-15217D
--   Canonical Amazon: https://www.amazon.com/dp/B07BHZWSCQ
--
-- Existing retailer_links for this filter (do NOT mutate in this file):
--   - appliancepartspros: approved, direct_buyable (OEM PDP).
--   - oem-parts-catalog:  RepairClinic search URL; is_primary = true in DB snapshot.
--     Blocked OEM search row link_id (reference only, not updated here):
--     1d121cea-bf35-4544-805e-8e120b0ba5f9
--   - No retailer_key = 'amazon' row for this filter_id.
--
-- HARD STOPS — do not COMMIT if any fail:
--   H0) Section 3 returns other than exactly ONE filters row for this id/slug/oem.
--   H1) Section 4 inventory disagrees with expected two non-amazon rows OR shows any amazon row.
--   H2) Section 5 pre-check shows any row with retailer_key = 'amazon' for this filter_id.
--   H3) INSERT affects row count other than exactly 1 (0 ⇒ race/duplicate; >1 impossible for single INSERT).
--   H4) Section 8–9: post-insert amazon row count is not exactly 1 OR URLs/ASIN/truth fields wrong.
--   H5) PDP proof stale: re-verify exact token DA97-15217D on live Amazon PDP and buyability before COMMIT.
--   H6) Do NOT run UPDATE/DELETE against the RepairClinic oem-parts-catalog row in this plan unless Jared
--       authorizes a separate primary-slot / demotion doc.
--
-- Candidate row to INSERT:
--   retailer_key: amazon
--   retailer_slug / retailer_name: amazon / Amazon
--   affiliate_url / destination_url: https://www.amazon.com/dp/B07BHZWSCQ
--   browser_truth_classification: direct_buyable
--   browser_truth_buyable_subtype: NULL (single-SKU listing, not multipack)
--   is_primary: false
--   status: approved
--   source: manual
--
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 3) Filter sanity — expect exactly one row (H0).
-- ---------------------------------------------------------------------------
SELECT
  id,
  slug,
  oem_part_number
FROM public.filters
WHERE id = '5487ef82-2010-44d4-bb18-bf71e6ae35ba'::uuid
   OR lower(slug) = lower('da97-15217d')
   OR upper(oem_part_number) = upper('DA97-15217D')
ORDER BY id;

-- ---------------------------------------------------------------------------
-- 4) Current retailer row inventory for target filter (H1).
-- ---------------------------------------------------------------------------
SELECT
  id,
  filter_id,
  retailer_key,
  retailer_name,
  affiliate_url,
  destination_url,
  retailer_slug,
  status,
  source,
  browser_truth_classification,
  browser_truth_buyable_subtype,
  browser_truth_notes,
  browser_truth_checked_at,
  is_primary
FROM public.retailer_links
WHERE filter_id = '5487ef82-2010-44d4-bb18-bf71e6ae35ba'::uuid
ORDER BY retailer_key, id;

-- ---------------------------------------------------------------------------
-- 5) Pre-insert amazon-slot check (H2) — expect zero rows.
-- ---------------------------------------------------------------------------
SELECT
  id,
  filter_id,
  retailer_key,
  affiliate_url,
  destination_url
FROM public.retailer_links
WHERE filter_id = '5487ef82-2010-44d4-bb18-bf71e6ae35ba'::uuid
  AND retailer_key = 'amazon'
ORDER BY id;

SELECT count(*)::int AS amazon_row_count_before
FROM public.retailer_links
WHERE filter_id = '5487ef82-2010-44d4-bb18-bf71e6ae35ba'::uuid
  AND retailer_key = 'amazon';

-- Operator expectation before INSERT:
--   amazon_row_count_before = 0

-- ---------------------------------------------------------------------------
-- 6–7) Guarded INSERT — only when no amazon slot; RETURNING for audit (H3).
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
  '5487ef82-2010-44d4-bb18-bf71e6ae35ba'::uuid,
  'Amazon',
  'amazon',
  'https://www.amazon.com/dp/B07BHZWSCQ',
  'https://www.amazon.com/dp/B07BHZWSCQ',
  false,
  'amazon',
  'approved',
  'manual',
  'direct_buyable',
  NULL::text,
  'Manual exact-token Amazon PDP evidence 2026-05-03; ASIN B07BHZWSCQ; token DA97-15217D verified on PDP with buyability.',
  '2026-05-03T00:00:00+00'::timestamptz
WHERE NOT EXISTS (
  SELECT 1
  FROM public.retailer_links AS l
  WHERE l.filter_id = '5487ef82-2010-44d4-bb18-bf71e6ae35ba'::uuid
    AND l.retailer_key = 'amazon'
)
RETURNING
  id,
  filter_id,
  retailer_key,
  retailer_name,
  affiliate_url,
  destination_url,
  retailer_slug,
  status,
  source,
  browser_truth_classification,
  browser_truth_buyable_subtype,
  browser_truth_notes,
  browser_truth_checked_at,
  is_primary;

-- Operator expectation:
--   INSERT RETURNING must produce exactly one row.
--   If zero rows returned, NOT EXISTS was false — amazon already present (stop).

-- ---------------------------------------------------------------------------
-- 8) Post-insert verification SELECT (H4).
-- ---------------------------------------------------------------------------
SELECT
  id,
  filter_id,
  retailer_key,
  retailer_name,
  affiliate_url,
  destination_url,
  retailer_slug,
  status,
  source,
  browser_truth_classification,
  browser_truth_buyable_subtype,
  browser_truth_notes,
  browser_truth_checked_at,
  is_primary
FROM public.retailer_links
WHERE filter_id = '5487ef82-2010-44d4-bb18-bf71e6ae35ba'::uuid
  AND retailer_key = 'amazon'
ORDER BY id;

-- ---------------------------------------------------------------------------
-- 9) Post-insert amazon count — must be 1 (H4).
-- ---------------------------------------------------------------------------
SELECT count(*)::int AS amazon_row_count_after
FROM public.retailer_links
WHERE filter_id = '5487ef82-2010-44d4-bb18-bf71e6ae35ba'::uuid
  AND retailer_key = 'amazon';

-- Post-check expectations:
--   amazon_row_count_after = 1
--   affiliate_url = destination_url = https://www.amazon.com/dp/B07BHZWSCQ
--   browser_truth_classification = direct_buyable
--   browser_truth_buyable_subtype IS NULL
--   status = approved, source = manual, is_primary = false

-- Default safety: dry run only.
ROLLBACK;
-- COMMIT;
