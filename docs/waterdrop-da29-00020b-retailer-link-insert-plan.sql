-- =============================================================================
-- INSERT PLAN ONLY — BLOCKED — DO NOT RUN FROM AUTOMATION
-- Token: DA29-00020B | Slug: da29-00020b
-- Evidence: data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json
-- =============================================================================
-- BLOCKED until ALL are true (abort if any fails):
--   1. [SATISFIED in evidence] Owner-browser PDP proof: DA29-00020B title + Add to Cart/Buy Now on variant 33108474495058.
--   2. [SATISFIED in tracker] rakuten-waterdrop-filter tagVerified = true; LinkSynergy click test notes in-repo.
--   3. evidence JSON mutation_ready_basis.insert_plan_status is owner-unblocked (still BLOCKED).
--   4. filter_id resolved from slug (Precheck C) and copied into evidence before INSERT.
--   5. Precheck D returns 0 approved waterdrop rows for that filter_id.
-- This plan adds ONE approved waterdrop retailer_link; it does not modify OEM rows.
-- affiliate_url MUST be the LinkSynergy click URL (not the image pixel URL).
-- =============================================================================

-- Precheck A: resolve filter_id (copy into evidence + uncomment INSERT filter_id)
select id, slug, oem_part_number
from public.filters
where slug = 'da29-00020b';

-- Precheck B: list all retailer_links for filter (expect oem-parts-catalog search placeholder, no waterdrop)
-- Replace :filter_id after Precheck A:
-- select id, retailer_key, status, is_primary, affiliate_url, browser_truth_classification, browser_truth_buyable_subtype
-- from public.retailer_links
-- where filter_id = :filter_id
-- order by retailer_key;

-- Precheck C: must return exactly 1 row
select id as filter_id, slug, oem_part_number
from public.filters
where slug = 'da29-00020b';

-- Precheck D: must return 0 rows (replace :filter_id)
-- select count(*) as approved_waterdrop_count
-- from public.retailer_links
-- where filter_id = :filter_id
--   and retailer_key = 'waterdrop'
--   and status = 'approved';

-- ---------------------------------------------------------------------------
-- Guarded INSERT — REMAINS COMMENTED UNTIL BLOCKERS CLEARED
-- ---------------------------------------------------------------------------
-- begin;
-- insert into public.retailer_links (
--   id,
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
--   gen_random_uuid(),
--   :filter_id,
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
--   'Aftermarket Waterdrop WDP-F27 compatible replacement for Samsung DA29-00020B; not OEM. Evidence waterdrop-da29-00020b-live-outcome.2026-05-20.json (owner PDP browser proof required before uncomment).',
--   now()
-- );
-- commit;

-- Postcheck: exactly one approved waterdrop row for filter (replace :filter_id)
-- select id, retailer_key, status, affiliate_url, browser_truth_classification, browser_truth_buyable_subtype
-- from public.retailer_links
-- where filter_id = :filter_id
--   and retailer_key = 'waterdrop'
--   and status = 'approved';
