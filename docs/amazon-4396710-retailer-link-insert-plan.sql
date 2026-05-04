-- =============================================================================
-- INSERT PLAN ONLY — DO NOT RUN FROM AUTOMATION
-- Token: 4396710 | Filter ID: 9e71e36c-32b1-42ae-bae1-b5384aaf48b1
-- Evidence: data/evidence/amazon-4396710-live-outcome.2026-05-04.json
-- =============================================================================
-- Preconditions (re-run before execution; abort if any row returned):
--   - Zero approved amazon rows for this filter_id (see evidence mutation_ready_basis).
--   - Operator confirms command_center_v2.amazon_rescue.do_not_touch still excludes 4396710.
--   - Operator confirms Amazon Associates tag buckparts20-20 remains correct in production gate.
-- This plan adds ONE approved amazon retailer_link; it does not modify OEM rows.
-- =============================================================================

-- Precheck A: list all retailer_links for filter (expect oem-parts-catalog primary, no amazon)
select id, retailer_key, status, is_primary, affiliate_url, browser_truth_classification
from public.retailer_links
where filter_id = '9e71e36c-32b1-42ae-bae1-b5384aaf48b1'
order by retailer_key;

-- Precheck B: must return 0 rows
select count(*) as approved_amazon_count
from public.retailer_links
where filter_id = '9e71e36c-32b1-42ae-bae1-b5384aaf48b1'
  and retailer_key = 'amazon'
  and status = 'approved';

-- ---------------------------------------------------------------------------
-- Guarded INSERT (new link id; adjust browser_truth_checked_at to transaction time)
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
--   '9e71e36c-32b1-42ae-bae1-b5384aaf48b1',
--   'Amazon',
--   'amazon',
--   'amazon',
--   'https://www.amazon.com/dp/B087PDLZL9',
--   'https://www.amazon.com/dp/B087PDLZL9?tag=buckparts20-20',
--   false,
--   'approved',
--   'manual',
--   'direct_buyable',
--   'MULTIPACK_DIRECT_BUYABLE',
--   'Aftermarket Waterdrop compatible 3-pack for 4396710 / Filter 3 family (ASIN B087PDLZL9); PDP title includes 4396710; not OEM. Evidence amazon-4396710-live-outcome.2026-05-04.json.',
--   now()
-- );
-- commit;

-- Postcheck: exactly one approved amazon row for filter
-- select id, retailer_key, status, affiliate_url, browser_truth_classification, browser_truth_buyable_subtype
-- from public.retailer_links
-- where filter_id = '9e71e36c-32b1-42ae-bae1-b5384aaf48b1'
--   and retailer_key = 'amazon'
--   and status = 'approved';
