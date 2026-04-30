-- Amazon false-negative rescue — INSERT plan (RFC-BBSA, AP810)
-- Prepared 2026-04-29. DO NOT run blindly: verify pre-checks, then change ROLLBACK to COMMIT if appropriate.
--
-- Provenance: `public.whole_house_water_retailer_links` is the live table for whole-house-water
-- buy links (FK `whole_house_water_part_id` → `whole_house_water_parts.id`). Preflight UUIDs are
-- part row IDs keyed by filter_slug in staging evidence — NOT a column named `filter_id` on this table.
--
-- Default: transaction ends in ROLLBACK so no data is committed from a dry run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Optional: confirm these UUIDs are real `whole_house_water_parts` rows
--    (expect 2 rows; if not, stop — wrong IDs or wrong table).
-- ---------------------------------------------------------------------------
-- SELECT id, slug, oem_part_number
-- FROM public.whole_house_water_parts
-- WHERE id IN (
--   '3d4bfaa9-e47e-4d0f-8a70-30167f6b33da'::uuid,
--   'f6c835ee-8ac4-4a06-a0b3-efa03e4f0667'::uuid
-- );

-- ---------------------------------------------------------------------------
-- 1) Pre-insert duplicate check — approved Amazon slot per part is unique
--    (`whole_house_water_retailer_links_one_approved_per_slot` partial unique index).
--    Proceed with INSERTs only if this returns zero rows.
-- ---------------------------------------------------------------------------
SELECT
  id,
  whole_house_water_part_id,
  retailer_key,
  status,
  affiliate_url,
  is_primary
FROM public.whole_house_water_retailer_links
WHERE whole_house_water_part_id IN (
  '3d4bfaa9-e47e-4d0f-8a70-30167f6b33da'::uuid,
  'f6c835ee-8ac4-4a06-a0b3-efa03e4f0667'::uuid
)
  AND retailer_key = 'amazon'
  AND status = 'approved';

-- If the SELECT above returns any rows: STOP (duplicate exists). Do not INSERT.

-- ---------------------------------------------------------------------------
-- 2) INSERT both rows (only when duplicate check is clear — zero rows above).
--    is_primary: repo bulk ingest uses false for new links; multiple is_primary=true
--    per part is guarded in reports. Use false unless you have verified exactly one
--    primary policy for that part after insert.
-- ---------------------------------------------------------------------------
INSERT INTO public.whole_house_water_retailer_links (
  whole_house_water_part_id,
  retailer_name,
  affiliate_url,
  destination_url,
  retailer_slug,
  retailer_key,
  is_primary,
  status,
  source,
  browser_truth_classification,
  browser_truth_notes,
  browser_truth_checked_at
) VALUES
  (
    '3d4bfaa9-e47e-4d0f-8a70-30167f6b33da'::uuid,
    'Amazon',
    'https://www.amazon.com/dp/B000BQN6MM',
    'https://www.amazon.com/dp/B000BQN6MM',
    'amazon',
    'amazon',
    false,
    'approved',
    'manual',
    'direct_buyable',
    'Manual user-provided Amazon exact-token PDP evidence 2026-04-29; staged through Amazon false-negative rescue preflight.',
    '2026-04-29T00:00:00+00'::timestamptz
  ),
  (
    'f6c835ee-8ac4-4a06-a0b3-efa03e4f0667'::uuid,
    'Amazon',
    'https://www.amazon.com/dp/B000W0TTJQ',
    'https://www.amazon.com/dp/B000W0TTJQ',
    'amazon',
    'amazon',
    false,
    'approved',
    'manual',
    'direct_buyable',
    'Manual user-provided Amazon exact-token PDP evidence 2026-04-29; staged through Amazon false-negative rescue preflight.',
    '2026-04-29T00:00:00+00'::timestamptz
  );

-- ---------------------------------------------------------------------------
-- 3) Post-insert verification (expect 2 rows; match ASINs in affiliate_url).
-- ---------------------------------------------------------------------------
SELECT
  id,
  whole_house_water_part_id,
  retailer_key,
  retailer_name,
  is_primary,
  status,
  affiliate_url,
  browser_truth_classification,
  browser_truth_checked_at
FROM public.whole_house_water_retailer_links
WHERE whole_house_water_part_id IN (
  '3d4bfaa9-e47e-4d0f-8a70-30167f6b33da'::uuid,
  'f6c835ee-8ac4-4a06-a0b3-efa03e4f0667'::uuid
)
  AND retailer_key = 'amazon'
  AND status = 'approved'
ORDER BY whole_house_water_part_id;

-- Expect row count = 2 in this transaction (before rollback). If not, investigate.

-- Default: discard transaction. Replace with COMMIT only after human sign-off.
ROLLBACK;
-- COMMIT;
