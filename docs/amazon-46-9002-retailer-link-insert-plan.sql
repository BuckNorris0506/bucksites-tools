-- =============================================================================
-- INSERT PLAN ONLY — DO NOT RUN FROM AUTOMATION
-- Token: 46-9002 | Filter ID: afb33b4e-ff01-44b1-823c-fa6052d9c3c2
-- Evidence (committed): data/evidence/amazon-46-9002-live-outcome.2026-05-04.json
-- ASIN B01IDH3IPU (Waterdrop aftermarket multipack; not OEM)
-- =============================================================================
-- Preconditions (re-run before execution; abort if any check fails):
--   - Zero approved amazon rows for this filter_id.
--   - No conflicting live/direct_buyable amazon row for this filter_id (slot is retailer_key=amazon).
--   - If re-running: expect LIVE_OUTCOME_RECORDED for 46-9002 in amazon-rescue-token-controls.json (historical plan only).
--   - Operator accepts aftermarket compatible listing (title proves 46-9002 among cross-refs).
-- This plan adds ONE approved amazon retailer_link; it does not modify the existing oem-parts-catalog row.
-- =============================================================================

-- Precheck A: list all retailer_links for filter
select id, retailer_key, status, is_primary, affiliate_url, browser_truth_classification
from public.retailer_links
where filter_id = 'afb33b4e-ff01-44b1-823c-fa6052d9c3c2'
order by retailer_key;

-- Precheck B: must return 0
select count(*) as approved_amazon_count
from public.retailer_links
where filter_id = 'afb33b4e-ff01-44b1-823c-fa6052d9c3c2'
  and retailer_key = 'amazon'
  and status = 'approved';

-- Precheck C (optional): ASIN not already on another filter (informational)
select id, filter_id, status, retailer_key, affiliate_url
from public.retailer_links
where affiliate_url ilike '%B01IDH3IPU%'
limit 20;

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
--   'afb33b4e-ff01-44b1-823c-fa6052d9c3c2',
--   'Amazon',
--   'amazon',
--   'amazon',
--   'https://www.amazon.com/dp/B01IDH3IPU',
--   'https://www.amazon.com/dp/B01IDH3IPU?tag=buckparts20-20',
--   false,
--   'approved',
--   'manual',
--   'direct_buyable',
--   'MULTIPACK_DIRECT_BUYABLE',
--   'Aftermarket Waterdrop compatible 3-pack; PDP title includes Kenmore 46-9002 (among 8171413 / EDR8D1 cross-refs); ASIN B01IDH3IPU; not OEM. Evidence amazon-46-9002-aftermarket-pdp-evidence.2026-05-01.json.',
--   now()
-- );
-- commit;

-- Postcheck
-- select id, retailer_key, status, affiliate_url, destination_url, browser_truth_classification, browser_truth_buyable_subtype
-- from public.retailer_links
-- where filter_id = 'afb33b4e-ff01-44b1-823c-fa6052d9c3c2'
--   and retailer_key = 'amazon'
--   and status = 'approved';
