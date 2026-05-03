-- Amazon MDJ64844601 retailer_links insert plan (read-only doc; dry-run transaction).
-- Prepared 2026-05-03.
-- Do not execute blindly. Default transaction ends with ROLLBACK.
--
-- =============================================================================
-- SECTION 0 — Proof summary (browser / operator evidence, not executed here)
-- =============================================================================
-- Token: MDJ64844601
-- filter_id: c6d36a37-f69a-486e-8c11-209a653a1b3b
-- filter_slug: mdj64844601
-- oem_part_number: MDJ64844601
--
-- Amazon PDP (aftermarket / compatible — PURELINE third-party listing, not LG OEM):
-- - Canonical /dp: https://www.amazon.com/dp/B08HDD1PK1
-- - Inspected proof PDP (SEO /dp path): https://www.amazon.com/Replacement-Compatible-MDJ64844601-LMXS28626S-LMXC23796S/dp/B08HDD1PK1
-- - PDP copy lists MDJ64844601 among replacement refrigerator model codes; Brand / store copy is PURELINE (third-party), not LG as seller/manufacturer of this SKU.
-- - Buyability on inspected extract: “Only 4 left in stock - order soon.”; priced buybox JSON present in captured PDP text — supplements token + aftermarket labeling; not sole proof.
-- - Note: Direct fetch of https://www.amazon.com/dp/B0D3LS6FNS (alternate hit mentioning MDJ64844601) hit a bot/interstitial in automation — not used as PDP proof.
-- - Proof PDP is ASIN B08HDD1PK1: full /dp page text proved MDJ64844601 token presence, aftermarket (PURELINE) labeling, and buyability (not an Amazon SERP).
--
-- browser_truth_buyable_subtype policy basis (repo, not memory):
-- - src/lib/retailers/launch-buy-links.ts — BUYABLE_SUBTYPES.COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE; PDP + operator classification: aftermarket PURELINE compatible replacement (not LG OEM).
-- - Subtype is explicit in this plan to match committed row (not NULL).
--
-- DB inventory (read-only confirmation before this plan; re-verify in section 3–5):
-- - Exactly one retailer_links row for this filter_id: oem-parts-catalog (RepairClinic search URL), is_primary true.
-- - No retailer_key = 'amazon' row for this filter_id.
-- - Blocked OEM-catalog row id (reference only; do NOT update this row in this plan):
--   -- f030e87f-ea27-48f6-836d-7e2f2bf74337
--
-- Planned new row (amazon slot):
-- - retailer_key / retailer_slug: amazon
-- - retailer_name: Amazon
-- - affiliate_url / destination_url: https://www.amazon.com/dp/B08HDD1PK1
-- - is_primary: false (do not steal primary from existing RepairClinic row in this plan)
-- - status: approved, source: manual
-- - browser_truth_classification: direct_buyable
-- - browser_truth_buyable_subtype: COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE
--
-- =============================================================================
-- SECTION 0 — Hard stops (abort or resolve before COMMIT)
-- =============================================================================
-- 1) Section 3 returns zero rows or more than one distinct filter — STOP.
-- 2) Section 4 row count is not exactly 1, or the sole row is not oem-parts-catalog — STOP and re-audit.
-- 3) Section 5 shows any existing row with retailer_key = 'amazon' for this filter_id — STOP (duplicate slot).
-- 4) Section 6 INSERT returns zero rows — STOP (duplicate raced in, or NOT EXISTS fired incorrectly).
-- 5) Section 6 INSERT returns more than one row — STOP (should be impossible with NOT EXISTS guard).
-- 6) Section 9–10: amazon row count must be exactly 1 — STOP if not 1.
-- 7) Do not UPDATE the existing oem-parts-catalog / RepairClinic row in this plan.
-- 8) If org policy requires only LG OEM PDPs (no aftermarket compatible listings) for this filter_slug, this plan must not ship — STOP.

BEGIN;

-- ---------------------------------------------------------------------------
-- 3) Filter sanity — expect exactly one row
-- ---------------------------------------------------------------------------
SELECT
  id,
  slug,
  oem_part_number
FROM public.filters
WHERE id = 'c6d36a37-f69a-486e-8c11-209a653a1b3b'::uuid
   OR lower(slug) = 'mdj64844601'
   OR upper(oem_part_number) = 'MDJ64844601'
ORDER BY id;

-- ---------------------------------------------------------------------------
-- 4) Current retailer_links inventory for this filter (expect RepairClinic only)
-- ---------------------------------------------------------------------------
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
WHERE filter_id = 'c6d36a37-f69a-486e-8c11-209a653a1b3b'::uuid
ORDER BY retailer_key, id;

-- ---------------------------------------------------------------------------
-- 5) Pre-insert amazon slot — expect zero rows; count must be 0
-- ---------------------------------------------------------------------------
SELECT
  id,
  filter_id,
  retailer_key,
  retailer_name,
  affiliate_url,
  destination_url,
  is_primary,
  status,
  source,
  browser_truth_classification,
  browser_truth_buyable_subtype
FROM public.retailer_links
WHERE filter_id = 'c6d36a37-f69a-486e-8c11-209a653a1b3b'::uuid
  AND retailer_key = 'amazon'
ORDER BY id;

SELECT count(*)::bigint AS amazon_row_count_before_insert
FROM public.retailer_links
WHERE filter_id = 'c6d36a37-f69a-486e-8c11-209a653a1b3b'::uuid
  AND retailer_key = 'amazon';

-- ---------------------------------------------------------------------------
-- 6) Guarded INSERT — only when no (filter_id, retailer_key='amazon') row exists
--    browser_truth_notes: aftermarket PURELINE compatible listing; not LG OEM.
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
  'c6d36a37-f69a-486e-8c11-209a653a1b3b'::uuid,
  'Amazon',
  'amazon',
  'https://www.amazon.com/dp/B08HDD1PK1',
  'https://www.amazon.com/dp/B08HDD1PK1',
  false,
  'amazon',
  'approved',
  'manual',
  'direct_buyable',
  'COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE',
  'Aftermarket PURELINE compatible refrigerator water filter listing (ASIN B08HDD1PK1); PDP lists MDJ64844601 among replacement targets. Not an LG OEM / genuine LG-sold-by-LG cartridge PDP.',
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.retailer_links l
  WHERE l.filter_id = 'c6d36a37-f69a-486e-8c11-209a653a1b3b'::uuid
    AND l.retailer_key = 'amazon'
)
RETURNING
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
  browser_truth_checked_at;

-- Operator: INSERT … RETURNING must return exactly one row.

-- ---------------------------------------------------------------------------
-- 9) Post-insert verification — amazon row shape
-- ---------------------------------------------------------------------------
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
WHERE filter_id = 'c6d36a37-f69a-486e-8c11-209a653a1b3b'::uuid
  AND retailer_key = 'amazon'
ORDER BY id;

-- ---------------------------------------------------------------------------
-- 10) Post-insert amazon count — must be 1
-- ---------------------------------------------------------------------------
SELECT count(*)::bigint AS amazon_row_count_after_insert
FROM public.retailer_links
WHERE filter_id = 'c6d36a37-f69a-486e-8c11-209a653a1b3b'::uuid
  AND retailer_key = 'amazon';

-- Default safety: dry run only. Uncomment COMMIT only after manual review in prod.
ROLLBACK;
-- COMMIT;
