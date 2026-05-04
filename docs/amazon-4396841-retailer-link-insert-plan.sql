-- =============================================================================
-- INSERT PLAN ONLY — DO NOT RUN FROM AUTOMATION
-- Token: 4396841 | Filter ID: c3fcdb45-1a17-4927-8c52-93ce60383016
-- Evidence: data/evidence/amazon-4396841-live-outcome.2026-05-04.json
-- ASIN B087PDLZL9 (same listing as token 4396710 live row — different filter_id)
-- =============================================================================
-- Preconditions (re-run before execution; abort if any check fails):
--   - Zero approved amazon rows for this filter_id.
--   - Operator accepts intentional duplicate ASIN across 4396710 vs 4396841 filters.
--   - command_center_v2.amazon_rescue.do_not_touch still excludes 4396841.
-- This plan adds ONE approved amazon retailer_link; it does not modify oem-parts-catalog.
-- =============================================================================

-- Precheck A: list all retailer_links for filter
select id, retailer_key, status, is_primary, affiliate_url, browser_truth_classification
from public.retailer_links
where filter_id = 'c3fcdb45-1a17-4927-8c52-93ce60383016'
order by retailer_key;

-- Precheck B: must return 0
select count(*) as approved_amazon_count
from public.retailer_links
where filter_id = 'c3fcdb45-1a17-4927-8c52-93ce60383016'
  and retailer_key = 'amazon'
  and status = 'approved';

-- ---------------------------------------------------------------------------
-- Guarded INSERT (commented — operator uncomments after prechecks)
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
--   'c3fcdb45-1a17-4927-8c52-93ce60383016',
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
--   'Aftermarket Waterdrop compatible 3-pack for 4396841 / Filter 3 family (ASIN B087PDLZL9); PDP title includes 4396841; not OEM. Same ASIN as sibling token 4396710 listing. Evidence amazon-4396841-live-outcome.2026-05-04.json.',
--   now()
-- );
-- commit;

-- Postcheck
-- select id, retailer_key, status, affiliate_url, destination_url, browser_truth_classification, browser_truth_buyable_subtype
-- from public.retailer_links
-- where filter_id = 'c3fcdb45-1a17-4927-8c52-93ce60383016'
--   and retailer_key = 'amazon'
--   and status = 'approved';
