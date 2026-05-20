-- =============================================================================
-- INSERT PLAN ONLY — BLOCKED — DO NOT RUN FROM AUTOMATION
-- Token: DA29-00020B | Slug: da29-00020b
-- Filter ID (PROVEN read-only precheck 2026-05-20): f58a2c03-0f51-4b61-953a-5daf0abf2874
-- Evidence: data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json
-- =============================================================================
-- BLOCKED until ALL are true (abort if any fails):
--   1. [SATISFIED in evidence] Owner-browser PDP proof: DA29-00020B title + Add to Cart/Buy Now on variant 33108474495058.
--   2. [SATISFIED in tracker] rakuten-waterdrop-filter tagVerified = true; LinkSynergy click test notes in-repo.
--   3. [SATISFIED read-only precheck] filter_id f58a2c03-0f51-4b61-953a-5daf0abf2874; approved_waterdrop_count = 0.
--   4. evidence JSON mutation_ready_basis.insert_plan_status is owner-unblocked (still BLOCKED).
--   5. Operator re-runs Precheck D immediately before manual INSERT (counts must still be zero).
-- This plan adds ONE approved waterdrop retailer_link; it does not modify OEM or amazon rows.
-- affiliate_url MUST be the LinkSynergy click URL (not the image pixel URL).
-- =============================================================================
-- Schema defaults (PROVEN read-only 2026-05-20):
--   id default gen_random_uuid(); created_at default now(); is_primary default false;
--   status default 'approved'; source default 'manual'; no updated_at column.
-- Unique index: retailer_links_filter_retailer_key_unique on (filter_id, retailer_key).
-- =============================================================================

-- Precheck A: filter row (PROVEN 2026-05-20: filter_count = 1)
select id, slug, oem_part_number, name
from public.filters
where slug = 'da29-00020b';
-- Expected: id = f58a2c03-0f51-4b61-953a-5daf0abf2874

-- Precheck B: existing retailer_links for filter (PROVEN 2026-05-20: total_count = 2, no waterdrop)
select id, retailer_key, status, is_primary, destination_url, browser_truth_classification, browser_truth_buyable_subtype
from public.retailer_links
where filter_id = 'f58a2c03-0f51-4b61-953a-5daf0abf2874'
order by retailer_key;
-- Expected rows (summary only — re-run for live ids before insert):
--   oem-parts-catalog | approved | RepairClinic search | browser_truth_classification null
--   amazon            | approved | https://www.amazon.com/dp/B004UB1NRY | direct_buyable

-- Precheck C: must return exactly 1 row (same as Precheck A)
select id as filter_id, slug, oem_part_number
from public.filters
where slug = 'da29-00020b';

-- Precheck D: must return 0 rows (PROVEN 2026-05-20: approved_waterdrop_count = 0)
select count(*) as approved_waterdrop_count
from public.retailer_links
where filter_id = 'f58a2c03-0f51-4b61-953a-5daf0abf2874'
  and retailer_key = 'waterdrop'
  and status = 'approved';

-- Precheck E: waterdrop row count any status (PROVEN 2026-05-20: waterdrop_row_count = 0)
select count(*) as waterdrop_row_count
from public.retailer_links
where filter_id = 'f58a2c03-0f51-4b61-953a-5daf0abf2874'
  and retailer_key = 'waterdrop';

-- ---------------------------------------------------------------------------
-- Guarded INSERT — REMAINS COMMENTED UNTIL OWNER UNBLOCKS (manual only)
-- ---------------------------------------------------------------------------
-- begin;
-- insert into public.retailer_links (
--   filter_id,
--   retailer_name,
--   retailer_slug,
--   retailer_key,
--   destination_url,
--   affiliate_url,
--   is_primary,
--   status,
--   source,
--   browser_truth_classification,
--   browser_truth_buyable_subtype,
--   browser_truth_notes,
--   browser_truth_checked_at
-- ) values (
--   'f58a2c03-0f51-4b61-953a-5daf0abf2874',
--   'Waterdrop Filter',
--   'waterdrop',
--   'waterdrop',
--   'https://www.waterdropfilter.com/products/waterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter?variant=33108474495058',
--   'https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539508551730292149506115&type=2&murl=https%3a%2f%2fwww.waterdropfilter.com%2fproducts%2fwaterdrop-replacement-for-samsung-da29-00020b-fridge-water-filter%3fvariant%3d33108474495058',
--   false,
--   'approved',
--   'manual',
--   'direct_buyable',
--   'COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE',
--   'Aftermarket Waterdrop WDP-F27 compatible replacement for Samsung DA29-00020B; not OEM. Evidence waterdrop-da29-00020b-live-outcome.2026-05-20.json; Supabase precheck 2026-05-20.',
--   now()
-- );
-- commit;
-- Note: omit id and created_at to use defaults gen_random_uuid() and now().

-- Postcheck: exactly one approved waterdrop row for filter
-- select id, retailer_key, status, affiliate_url, browser_truth_classification, browser_truth_buyable_subtype
-- from public.retailer_links
-- where filter_id = 'f58a2c03-0f51-4b61-953a-5daf0abf2874'
--   and retailer_key = 'waterdrop'
--   and status = 'approved';
