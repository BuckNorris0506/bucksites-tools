-- =============================================================================
-- INSERT PLAN ONLY — DO NOT RUN FROM AUTOMATION
-- Token: 8171413 | Filter ID: 5d281057-32b3-4f4d-aade-f0355d995389
-- Evidence (committed): data/evidence/amazon-8171413-live-outcome.2026-05-04.json
-- ASIN B01CA0V1VE (Waterdrop aftermarket listing; not OEM EveryDrop-only proof)
-- =============================================================================
-- Preconditions (re-run before execution; abort if any check fails):
--   - Zero approved amazon rows for this filter_id.
--   - Zero direct_buyable approved amazon rows for this filter_id.
--   - If re-running: expect LIVE_OUTCOME_RECORDED for 8171413 in amazon-rescue-token-controls.json (historical plan only).
--   - PDP title still includes exact token 8171413 and buy path remains defensible.
-- This plan adds ONE approved amazon retailer_link; it does not alter oem-parts-catalog.
-- =============================================================================

-- Precheck A: list all retailer_links for filter
select id, retailer_key, status, is_primary, affiliate_url, destination_url, browser_truth_classification
from public.retailer_links
where filter_id = '5d281057-32b3-4f4d-aade-f0355d995389'
order by retailer_key;

-- Precheck B: must return 0
select count(*) as approved_amazon_count
from public.retailer_links
where filter_id = '5d281057-32b3-4f4d-aade-f0355d995389'
  and retailer_key = 'amazon'
  and status = 'approved';

-- Precheck C: must return 0
select count(*) as live_direct_buyable_amazon_count
from public.retailer_links
where filter_id = '5d281057-32b3-4f4d-aade-f0355d995389'
  and retailer_key = 'amazon'
  and status = 'approved'
  and browser_truth_classification = 'direct_buyable';

-- Precheck D (informational): ASIN collisions across filters
select id, filter_id, retailer_key, status, affiliate_url, destination_url
from public.retailer_links
where affiliate_url ilike '%B01CA0V1VE%' or destination_url ilike '%B01CA0V1VE%'
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
--   '5d281057-32b3-4f4d-aade-f0355d995389',
--   'Amazon',
--   'amazon',
--   'amazon',
--   'https://www.amazon.com/dp/B01CA0V1VE',
--   'https://www.amazon.com/dp/B01CA0V1VE?tag=buckparts20-20',
--   false,
--   'approved',
--   'manual',
--   'direct_buyable',
--   'SINGLE_PACK_DIRECT_BUYABLE',
--   'Aftermarket Waterdrop listing for Whirlpool 8171413 family (ASIN B01CA0V1VE); seller title includes exact token 8171413; buyability visible in browser evidence. Not OEM identity proof. Evidence amazon-8171413-live-outcome.2026-05-04.json.',
--   now()
-- );
-- commit;

-- Postcheck
-- select id, retailer_key, status, affiliate_url, destination_url, browser_truth_classification, browser_truth_buyable_subtype
-- from public.retailer_links
-- where filter_id = '5d281057-32b3-4f4d-aade-f0355d995389'
--   and retailer_key = 'amazon'
--   and status = 'approved';
