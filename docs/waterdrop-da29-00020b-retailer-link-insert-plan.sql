-- =============================================================================
-- INSERT PLAN — MANUAL ONLY — DO NOT RUN FROM AUTOMATION
-- Token: DA29-00020B | Slug: da29-00020b
-- Filter ID (PROVEN read-only precheck 2026-05-20): f58a2c03-0f51-4b61-953a-5daf0abf2874
-- Evidence: data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json
-- Owner manual insert approved: 2026-05-20 (owner_manual_insert_approved true; mutation_ready false)
-- =============================================================================
-- *** EXECUTED MANUALLY 2026-05-20 — DO NOT RE-RUN INSERT UNLESS PRECHECKS SHOW ROW ABSENT ***
-- Inserted row id: d4cbad0c-4bab-4854-89bf-59e6d6492c6b
-- Postcheck: production /filter/da29-00020b renders Waterdrop + /go/d4cbad0c-4bab-4854-89bf-59e6d6492c6b (HTTP 200).
-- Postcheck: /go/d4cbad0c-4bab-4854-89bf-59e6d6492c6b → HTTP 302 LinkSynergy; GET reached Waterdrop PDP (DA29-00020B, WDP-F27, Add to Cart, Buy Now).
-- Re-run Precheck D/E only; if waterdrop_row_count > 0, skip INSERT below (duplicate would violate unique index).
-- =============================================================================
-- MANUAL EXECUTION ONLY (historical). Operator ran Precheck D and E before INSERT.
-- Abort if approved_waterdrop_count != 0 or waterdrop_row_count != 0.
-- Adds ONE approved waterdrop retailer_link; does not modify oem-parts-catalog or amazon rows.
-- affiliate_url MUST be the LinkSynergy click URL (not the image pixel URL).
-- =============================================================================
-- Schema defaults (PROVEN read-only 2026-05-20):
--   id default gen_random_uuid(); created_at default now(); is_primary default false;
--   status default 'approved'; source default 'manual'; no updated_at column.
-- Unique index: retailer_links_filter_retailer_key_unique on (filter_id, retailer_key).
-- =============================================================================

-- Precheck A: filter row
select id, slug, oem_part_number, name
from public.filters
where slug = 'da29-00020b';
-- Expected: id = f58a2c03-0f51-4b61-953a-5daf0abf2874

-- Precheck B: existing retailer_links for filter
select id, retailer_key, status, is_primary, destination_url, browser_truth_classification, browser_truth_buyable_subtype
from public.retailer_links
where filter_id = 'f58a2c03-0f51-4b61-953a-5daf0abf2874'
order by retailer_key;

-- Precheck C: must return exactly 1 row
select id as filter_id, slug, oem_part_number
from public.filters
where slug = 'da29-00020b';

-- Precheck D: MUST return 0 — run immediately before INSERT in same session
select count(*) as approved_waterdrop_count
from public.retailer_links
where filter_id = 'f58a2c03-0f51-4b61-953a-5daf0abf2874'
  and retailer_key = 'waterdrop'
  and status = 'approved';

-- Precheck E: MUST return 0 — run immediately before INSERT in same session
select count(*) as waterdrop_row_count
from public.retailer_links
where filter_id = 'f58a2c03-0f51-4b61-953a-5daf0abf2874'
  and retailer_key = 'waterdrop';

-- ---------------------------------------------------------------------------
-- Guarded INSERT — one row (manual operator session only)
-- ---------------------------------------------------------------------------
begin;

insert into public.retailer_links (
  filter_id,
  retailer_name,
  retailer_slug,
  retailer_key,
  destination_url,
  affiliate_url,
  is_primary,
  status,
  source,
  browser_truth_classification,
  browser_truth_buyable_subtype,
  browser_truth_notes,
  browser_truth_checked_at
) values (
  'f58a2c03-0f51-4b61-953a-5daf0abf2874',
  'Waterdrop Filter',
  'waterdrop',
  'waterdrop',
  'https://www.waterdropfilter.com/products/waterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter?variant=33108474495058',
  'https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539508551730292149506115&type=2&murl=https%3a%2f%2fwww.waterdropfilter.com%2fproducts%2fwaterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter%3fvariant%3d33108474495058',
  false,
  'approved',
  'manual',
  'direct_buyable',
  'COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE',
  'Aftermarket Waterdrop WDP-F27 compatible replacement for Samsung DA29-00020B; not OEM. Evidence waterdrop-da29-00020b-live-outcome.2026-05-20.json; owner manual insert approved 2026-05-20.',
  '2026-05-20T20:00:00.000Z'
);

commit;
-- Note: omit id and created_at to use defaults gen_random_uuid() and now().

-- Postcheck: exactly one approved waterdrop row for filter
select id, retailer_key, status, is_primary, affiliate_url, browser_truth_classification, browser_truth_buyable_subtype, browser_truth_checked_at
from public.retailer_links
where filter_id = 'f58a2c03-0f51-4b61-953a-5daf0abf2874'
  and retailer_key = 'waterdrop'
  and status = 'approved';
