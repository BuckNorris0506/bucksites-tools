-- =============================================================================
-- INSERT PLAN ONLY — DO NOT RUN FROM AUTOMATION
-- Token: UKF8001 | Queue resolver: slug_lower → filter slug ukf8001
-- filter_id: 944b8b28-582c-4017-ac6c-ac0069315f55
-- Evidence (committed backlog): data/evidence/amazon-ukf8001-aftermarket-pdp-evidence.2026-05-04.json
-- ASIN: B07C8C2VBH | product_attribution: aftermarket_compatible (AmazonBasics listing in evidence)
-- Draft read-only checks (2026-05-05): buckparts:precheck:amazon-refrigerator-tokens → INSERT_PLAN_POSSIBLE;
--   live sample: 0 amazon rows for this filter_id; ASIN collision other filters: 0.
-- =============================================================================
-- Operator rules: no UPDATE/DELETE in this doc. Re-run all prechecks before any COMMIT.
-- browser_truth_buyable_subtype: COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE (aftermarket_compatible; see BUYABLE_SUBTYPES in src/lib/retailers/launch-buy-links.ts).
-- =============================================================================

-- PRECHECK A — Target filter row (expect exactly one)
SELECT id, slug, oem_part_number, brand_id
FROM public.filters
WHERE id = '944b8b28-582c-4017-ac6c-ac0069315f55'::uuid
   OR lower(slug) = lower('ukf8001')
   OR upper(oem_part_number) = upper('UKF8001')
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
WHERE filter_id = '944b8b28-582c-4017-ac6c-ac0069315f55'::uuid
ORDER BY retailer_key, id;

-- PRECHECK B — Approved amazon rows for this filter_id (must be 0)
SELECT count(*)::int AS approved_amazon_count_for_filter
FROM public.retailer_links
WHERE filter_id = '944b8b28-582c-4017-ac6c-ac0069315f55'::uuid
  AND retailer_key = 'amazon'
  AND status = 'approved';

-- PRECHECK C — Approved + direct_buyable amazon for this filter (must be 0)
SELECT count(*)::int AS approved_direct_buyable_amazon_count_for_filter
FROM public.retailer_links
WHERE filter_id = '944b8b28-582c-4017-ac6c-ac0069315f55'::uuid
  AND retailer_key = 'amazon'
  AND status = 'approved'
  AND browser_truth_classification = 'direct_buyable';

-- PRECHECK D — ASIN collision across retailer_links (other filter_ids)
SELECT id, filter_id, retailer_key, status, affiliate_url, destination_url
FROM public.retailer_links
WHERE (affiliate_url ilike '%/dp/B07C8C2VBH%' OR destination_url ilike '%/dp/B07C8C2VBH%')
  AND filter_id <> '944b8b28-582c-4017-ac6c-ac0069315f55'::uuid
ORDER BY filter_id, id;

SELECT count(*)::int AS asin_collision_other_filter_count
FROM public.retailer_links
WHERE (affiliate_url ilike '%/dp/B07C8C2VBH%' OR destination_url ilike '%/dp/B07C8C2VBH%')
  AND filter_id <> '944b8b28-582c-4017-ac6c-ac0069315f55'::uuid;

-- ---------------------------------------------------------------------------
-- Guarded INSERT (COMMENTED — operator uncomments only after all prechecks pass)
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
--   '944b8b28-582c-4017-ac6c-ac0069315f55'::uuid,
--   'Amazon',
--   'amazon',
--   'https://www.amazon.com/dp/B07C8C2VBH?tag=buckparts20-20',
--   'https://www.amazon.com/dp/B07C8C2VBH',
--   false,
--   'amazon',
--   'approved',
--   'manual',
--   'direct_buyable',
--   'COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE',
--   'Aftermarket-compatible PDP evidence; ASIN B07C8C2VBH; token UKF8001. Evidence file: data/evidence/amazon-ukf8001-aftermarket-pdp-evidence.2026-05-04.json.',
--   now()
-- );
-- commit;

-- Postcheck
-- select id, retailer_key, status, affiliate_url, destination_url, browser_truth_classification, browser_truth_buyable_subtype
-- from public.retailer_links
-- where filter_id = '944b8b28-582c-4017-ac6c-ac0069315f55'::uuid
--   and retailer_key = 'amazon';
