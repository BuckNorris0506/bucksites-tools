-- Amazon multipack subtype update plan (refrigerator retailer_links)
-- Prepared 2026-04-30 for ADQ36006101, DA29-00003G, DA29-00020A.
-- Do not execute blindly. This plan is transaction-scoped and defaults to ROLLBACK.
--
-- Intent:
-- - Update ONLY browser_truth_buyable_subtype to MULTIPACK_DIRECT_BUYABLE
-- - Update ONLY the exact existing Amazon link IDs diagnosed in preflight
-- - Do NOT insert rows
-- - Do NOT change affiliate_url or destination_url

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Target set from duplicate diagnosis (exact IDs + expected current URLs)
-- ---------------------------------------------------------------------------
WITH targets AS (
  SELECT *
  FROM (
    VALUES
      (
        '13db0ab4-7bee-4bfc-8194-7729f98d0893'::uuid, -- ADQ36006101
        'https://www.amazon.com/dp/B0042ACZU2'::text,
        'ADQ36006101'::text
      ),
      (
        'e27d19d0-d2d9-40ca-b584-f4b462700f69'::uuid, -- DA29-00003G
        'https://www.amazon.com/dp/B004MU3EDE'::text,
        'DA29-00003G'::text
      ),
      (
        'e2cb724e-e87f-4b0c-b6b9-defe74cf0312'::uuid, -- DA29-00020A
        'https://www.amazon.com/dp/B07FPQ2CLC'::text,
        'DA29-00020A'::text
      )
  ) AS t(link_id, expected_affiliate_url, token)
)
SELECT
  l.id,
  t.token,
  l.filter_id,
  f.slug AS filter_slug,
  l.retailer_key,
  l.browser_truth_classification,
  l.browser_truth_buyable_subtype,
  l.affiliate_url,
  l.destination_url,
  l.is_primary,
  l.status
FROM targets t
LEFT JOIN public.retailer_links l
  ON l.id = t.link_id
LEFT JOIN public.filters f
  ON f.id = l.filter_id
ORDER BY t.token;

-- Operator expectation before UPDATE:
-- - Exactly 3 rows present (all target ids found)
-- - retailer_key = 'amazon' for all
-- - browser_truth_classification = 'direct_buyable' for all
-- - affiliate_url matches expected_affiliate_url for all

-- ---------------------------------------------------------------------------
-- 1) Guarded update: only set subtype on exact valid rows
-- ---------------------------------------------------------------------------
WITH targets AS (
  SELECT *
  FROM (
    VALUES
      ('13db0ab4-7bee-4bfc-8194-7729f98d0893'::uuid, 'https://www.amazon.com/dp/B0042ACZU2'::text),
      ('e27d19d0-d2d9-40ca-b584-f4b462700f69'::uuid, 'https://www.amazon.com/dp/B004MU3EDE'::text),
      ('e2cb724e-e87f-4b0c-b6b9-defe74cf0312'::uuid, 'https://www.amazon.com/dp/B07FPQ2CLC'::text)
  ) AS t(link_id, expected_affiliate_url)
)
UPDATE public.retailer_links l
SET browser_truth_buyable_subtype = 'MULTIPACK_DIRECT_BUYABLE'
FROM targets t
WHERE l.id = t.link_id
  AND l.retailer_key = 'amazon'
  AND l.browser_truth_classification = 'direct_buyable'
  AND l.affiliate_url = t.expected_affiliate_url;

-- Operator expectation:
-- - UPDATE row count must be exactly 3.
-- - If row count is <3 or >3, STOP and keep rollback.

-- ---------------------------------------------------------------------------
-- 2) Post-update verification
-- ---------------------------------------------------------------------------
WITH targets AS (
  SELECT *
  FROM (
    VALUES
      ('13db0ab4-7bee-4bfc-8194-7729f98d0893'::uuid, 'https://www.amazon.com/dp/B0042ACZU2'::text, 'ADQ36006101'::text),
      ('e27d19d0-d2d9-40ca-b584-f4b462700f69'::uuid, 'https://www.amazon.com/dp/B004MU3EDE'::text, 'DA29-00003G'::text),
      ('e2cb724e-e87f-4b0c-b6b9-defe74cf0312'::uuid, 'https://www.amazon.com/dp/B07FPQ2CLC'::text, 'DA29-00020A'::text)
  ) AS t(link_id, expected_affiliate_url, token)
)
SELECT
  l.id,
  t.token,
  l.retailer_key,
  l.browser_truth_classification,
  l.browser_truth_buyable_subtype,
  l.affiliate_url,
  l.destination_url,
  l.status
FROM targets t
JOIN public.retailer_links l
  ON l.id = t.link_id
ORDER BY t.token;

-- Post-check expectations:
-- - Exactly 3 rows
-- - retailer_key = 'amazon' on all
-- - browser_truth_classification = 'direct_buyable' on all
-- - browser_truth_buyable_subtype = 'MULTIPACK_DIRECT_BUYABLE' on all
-- - affiliate_url unchanged and equals expected value on all
-- - destination_url unchanged

-- Default safety: dry run only.
ROLLBACK;
-- COMMIT;
