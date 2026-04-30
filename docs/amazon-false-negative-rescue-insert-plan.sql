-- Amazon false-negative rescue — duplicate-safe UPDATE/INSERT plan (RFC-BBSA, AP810)
-- Prepared 2026-04-29. Revised after duplicate-constraint stop on existing amazon slot.
-- DO NOT run blindly: verify diagnosis first, then change ROLLBACK to COMMIT if appropriate.
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
-- 1) Read-only diagnosis query for existing amazon rows in target slots.
--    This is the first step; do not mutate until this output is reviewed.
-- ---------------------------------------------------------------------------
SELECT
  id,
  whole_house_water_part_id,
  retailer_key,
  destination_url,
  affiliate_url,
  status,
  browser_truth_classification,
  browser_truth_notes,
  browser_truth_checked_at,
  is_primary
FROM public.whole_house_water_retailer_links
WHERE whole_house_water_part_id IN (
  '3d4bfaa9-e47e-4d0f-8a70-30167f6b33da'::uuid,
  'f6c835ee-8ac4-4a06-a0b3-efa03e4f0667'::uuid
)
  AND retailer_key = 'amazon'
ORDER BY whole_house_water_part_id, created_at;

-- Interpretation:
-- - If a slot already has an approved amazon row, plain INSERT collides with unique index.
-- - Use UPDATE for existing row(s) that are stale/wrong.
-- - Use INSERT only when no amazon row exists for that part slot.

-- ---------------------------------------------------------------------------
-- 2) UPDATE existing rows (no-op when URL/evidence already current).
--    Keep status approved and do not force is_primary true.
-- ---------------------------------------------------------------------------
UPDATE public.whole_house_water_retailer_links AS l
SET
  retailer_name = 'Amazon',
  affiliate_url = c.canonical_dp_url,
  destination_url = c.canonical_dp_url,
  retailer_slug = 'amazon',
  retailer_key = 'amazon',
  status = 'approved',
  source = 'manual',
  browser_truth_classification = 'direct_buyable',
  browser_truth_notes = 'Manual user-provided Amazon exact-token PDP evidence 2026-04-29; staged through Amazon false-negative rescue preflight.',
  browser_truth_checked_at = '2026-04-29T00:00:00+00'::timestamptz
FROM (
  VALUES
    ('3d4bfaa9-e47e-4d0f-8a70-30167f6b33da'::uuid, 'https://www.amazon.com/dp/B000BQN6MM'::text),
    ('f6c835ee-8ac4-4a06-a0b3-efa03e4f0667'::uuid, 'https://www.amazon.com/dp/B000W0TTJQ'::text)
) AS c(whole_house_water_part_id, canonical_dp_url)
WHERE l.whole_house_water_part_id = c.whole_house_water_part_id
  AND l.retailer_key = 'amazon';

-- ---------------------------------------------------------------------------
-- 3) INSERT missing amazon slots only.
--    Guarded by NOT EXISTS to avoid unique-index collision.
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
)
SELECT
  c.whole_house_water_part_id,
  'Amazon',
  c.canonical_dp_url,
  c.canonical_dp_url,
  'amazon',
  'amazon',
  false,
  'approved',
  'manual',
  'direct_buyable',
  'Manual user-provided Amazon exact-token PDP evidence 2026-04-29; staged through Amazon false-negative rescue preflight.',
  '2026-04-29T00:00:00+00'::timestamptz
FROM (
  VALUES
    ('3d4bfaa9-e47e-4d0f-8a70-30167f6b33da'::uuid, 'https://www.amazon.com/dp/B000BQN6MM'::text),
    ('f6c835ee-8ac4-4a06-a0b3-efa03e4f0667'::uuid, 'https://www.amazon.com/dp/B000W0TTJQ'::text)
) AS c(whole_house_water_part_id, canonical_dp_url)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.whole_house_water_retailer_links AS l
  WHERE l.whole_house_water_part_id = c.whole_house_water_part_id
    AND l.retailer_key = 'amazon'
    AND l.status = 'approved'
);

-- ---------------------------------------------------------------------------
-- 4) Post-mutation verification (expect exactly 2 approved amazon rows across the slots).
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

-- Expect row count = 2 in this transaction (before rollback). If not, investigate and do not commit.

-- Default: discard transaction. Replace with COMMIT only after human sign-off.
ROLLBACK;
-- COMMIT;
