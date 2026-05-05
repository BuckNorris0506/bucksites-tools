-- =============================================================================
-- INSERT PLAN ONLY — DO NOT RUN FROM AUTOMATION
-- Token: EDR1RXD1 | Queue resolver: slug_lower → filter slug edr1rxd1
-- filter_id: 81d1c570-24cc-4008-80db-ce21d05a0607
-- Evidence (committed backlog): data/evidence/amazon-edr1rxd1-oem-pdp-evidence.2026-05-04.json
-- ASIN: B00UXG4WR8 | product_attribution: oem_official (browser evidence; not a live-outcome file)
-- Draft read-only checks (2026-05-05): buckparts:precheck:amazon-refrigerator-tokens → INSERT_PLAN_POSSIBLE;
--   live sample: 0 amazon retailer_links rows for this filter_id; ASIN collision across other filter_ids: 0.
-- =============================================================================
-- Operator rules: no UPDATE/DELETE in this doc. Re-run all prechecks before any COMMIT.
-- browser_truth_buyable_subtype: SINGLE_UNIT_DIRECT_BUYABLE (src/lib/retailers/launch-buy-links.ts BUYABLE_SUBTYPES).
-- =============================================================================

-- PRECHECK A — Target filter row (expect exactly one)
SELECT id, slug, oem_part_number, brand_id
FROM public.filters
WHERE id = '81d1c570-24cc-4008-80db-ce21d05a0607'::uuid
   OR lower(slug) = lower('edr1rxd1')
   OR upper(oem_part_number) = upper('EDR1RXD1')
ORDER BY id;

-- PRECHECK A (continued) — All retailer_links for this filter
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
WHERE filter_id = '81d1c570-24cc-4008-80db-ce21d05a0607'::uuid
ORDER BY retailer_key, id;

-- PRECHECK B — Approved amazon rows for this filter_id (must be 0 before insert)
SELECT count(*)::int AS approved_amazon_count_for_filter
FROM public.retailer_links
WHERE filter_id = '81d1c570-24cc-4008-80db-ce21d05a0607'::uuid
  AND retailer_key = 'amazon'
  AND status = 'approved';

-- PRECHECK C — Approved + direct_buyable amazon for this filter (must be 0)
SELECT count(*)::int AS approved_direct_buyable_amazon_count_for_filter
FROM public.retailer_links
WHERE filter_id = '81d1c570-24cc-4008-80db-ce21d05a0607'::uuid
  AND retailer_key = 'amazon'
  AND status = 'approved'
  AND browser_truth_classification = 'direct_buyable';

-- PRECHECK D — ASIN collision across retailer_links (any filter_id; informational + hard gate)
-- Expect 0 rows on OTHER filter_ids before first-time insert for this ASIN (re-verify after any peer insert).
SELECT id, filter_id, retailer_key, status, affiliate_url, destination_url
FROM public.retailer_links
WHERE (affiliate_url ilike '%/dp/B00UXG4WR8%' OR destination_url ilike '%/dp/B00UXG4WR8%')
  AND filter_id <> '81d1c570-24cc-4008-80db-ce21d05a0607'::uuid
ORDER BY filter_id, id;

SELECT count(*)::int AS asin_collision_other_filter_count
FROM public.retailer_links
WHERE (affiliate_url ilike '%/dp/B00UXG4WR8%' OR destination_url ilike '%/dp/B00UXG4WR8%')
  AND filter_id <> '81d1c570-24cc-4008-80db-ce21d05a0607'::uuid;

-- ---------------------------------------------------------------------------
-- Guarded INSERT (COMMENTED — operator uncomments only after all prechecks pass)
-- Canonical + affiliate URLs from evidence JSON (affiliate_url_candidate).
-- ---------------------------------------------------------------------------
-- begin;
-- insert into public.retailer_links (
--   filter_id,
--   retailer_name,
--   retailer_slug,
--   affiliate_url,
--   destination_url,
--   is_primary,
--   retailer_key,
--   status,
--   source,
--   browser_truth_classification,
--   browser_truth_buyable_subtype,
--   browser_truth_notes,
--   browser_truth_checked_at
-- ) values (
--   '81d1c570-24cc-4008-80db-ce21d05a0607'::uuid,
--   'Amazon',
--   'amazon',
--   'https://www.amazon.com/dp/B00UXG4WR8?tag=buckparts20-20',
--   'https://www.amazon.com/dp/B00UXG4WR8',
--   false,
--   'amazon',
--   'approved',
--   'manual',
--   'direct_buyable',
--   'SINGLE_UNIT_DIRECT_BUYABLE',
--   'OEM-style PDP evidence; ASIN B00UXG4WR8; token EDR1RXD1. Evidence file: data/evidence/amazon-edr1rxd1-oem-pdp-evidence.2026-05-04.json.',
--   now()
-- );
-- commit;

-- Postcheck (operator runs after insert)
-- select id, retailer_key, status, affiliate_url, destination_url, browser_truth_classification, browser_truth_buyable_subtype
-- from public.retailer_links
-- where filter_id = '81d1c570-24cc-4008-80db-ce21d05a0607'::uuid
--   and retailer_key = 'amazon';
