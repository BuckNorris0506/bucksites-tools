-- AP Holmes HAPF30 Amazon demotion packet v2 (one-row, guarded)
-- git HEAD hint: add5beb
-- Purpose: Demote exactly ONE Supabase row — Amazon ASIN B005BFSBVY for holmes-hapf30
-- READ-ONLY ARTIFACT — default ROLLBACK; owner swaps ROLLBACK → COMMIT after backup + verification
-- Replaces v1 CTE UPDATE (Supabase SQL editor false-positive "missing WHERE" on UPDATE…FROM…WHERE alias join)
--
-- Target row (owner-verified):
--   id                  = da6d3777-c4de-40c0-9f86-abe025b1db32
--   filter slug         = holmes-hapf30
--   retailer_key        = amazon
--   ASIN                = B005BFSBVY (affiliate_url or destination_url)
--   status              = approved
--
-- Authority: Production Truth ap-suppressed-holmes-hapf30 FAIL; model-first REJECT; CSV has no Amazon row
-- Out of scope: holmes-hapf30-od, oem-catalog primary, retailer_links.csv, all other retailer_link ids

-- =============================================================================
-- 0) PRE-FLIGHT (read-only — run before BEGIN; save backup JSON per v1 packet)
-- =============================================================================
-- See backup_export_command in ap-holmes-hapf30-amazon-demotion-packet-v1.json

SELECT f.id AS filter_id, f.slug, f.oem_part_number
FROM public.air_purifier_filters f
WHERE lower(f.slug) = 'holmes-hapf30';

-- Expect exactly 1 row matching all target predicates (including fixed id)
SELECT
  l.id,
  l.air_purifier_filter_id,
  f.slug AS filter_slug,
  l.retailer_key,
  l.affiliate_url,
  l.destination_url,
  l.is_primary,
  l.status,
  l.browser_truth_classification,
  l.browser_truth_buyable_subtype,
  l.browser_truth_checked_at
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE l.id = 'da6d3777-c4de-40c0-9f86-abe025b1db32'::uuid
  AND lower(f.slug) = 'holmes-hapf30'
  AND l.retailer_key = 'amazon'
  AND l.status = 'approved'
  AND (
    l.affiliate_url ILIKE '%B005BFSBVY%'
    OR l.destination_url ILIKE '%B005BFSBVY%'
  );
-- expect 1 row; browser_truth_classification = 'direct_buyable' before apply

-- =============================================================================
-- 1) GUARDED DEMOTION — DO block aborts unless exactly one row matches and updates
-- =============================================================================
--
-- Why v1 triggered Supabase "UPDATE may lack WHERE clause":
--   UPDATE public.air_purifier_retailer_links l … FROM target_links tl WHERE l.id = tl.id
--   Static analyzers often do not trace CTE/FROM aliases back to a primary-key predicate on the
--   updated table, so they warn even though runtime scope is one slug + amazon + ASIN.
--
-- Why v2 is acceptable / avoids the warning:
--   UPDATE uses a literal primary-key predicate on air_purifier_retailer_links:
--     WHERE id = 'da6d3777-c4de-40c0-9f86-abe025b1db32'::uuid
--   plus redundant guards (status, retailer_key, ASIN) on the same table — no UPDATE…FROM join.
--   Pre-update SELECT COUNT(*) and post-update GET DIAGNOSTICS ROW_COUNT both must equal 1 or the
--   transaction aborts via RAISE EXCEPTION (no silent zero-row or multi-row apply).

BEGIN;

DO $$
DECLARE
  v_target_id       uuid := 'da6d3777-c4de-40c0-9f86-abe025b1db32';
  v_match_count     integer;
  v_updated_count   integer;
BEGIN
  -- Pre-flight: row must exist and match slug + retailer + ASIN + approved
  SELECT COUNT(*)::integer
  INTO v_match_count
  FROM public.air_purifier_retailer_links l
  INNER JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
  WHERE l.id = v_target_id
    AND lower(f.slug) = 'holmes-hapf30'
    AND l.retailer_key = 'amazon'
    AND l.status = 'approved'
    AND (
      l.affiliate_url ILIKE '%B005BFSBVY%'
      OR l.destination_url ILIKE '%B005BFSBVY%'
    );

  IF v_match_count IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION
      'Holmes HAPF30 demotion aborted: pre-flight expected exactly 1 matching row, found % (id=%)',
      v_match_count, v_target_id;
  END IF;

  -- Single-row UPDATE by primary key only (no UPDATE…FROM)
  UPDATE public.air_purifier_retailer_links
  SET
    browser_truth_classification = NULL,
    browser_truth_notes = $bt_notes$Demoted: Production Truth ap-suppressed-holmes-hapf30 alarm; supabase_only vs CSV; model-first REJECT 2026-06-22 (ap-model-first-holmes-hapf30-live-browser-v1). Pending search_placeholder_rescue — do not restore direct_buyable without fresh owner browser evidence.$bt_notes$,
    browser_truth_checked_at = NULL,
    browser_truth_buyable_subtype = NULL
  WHERE id = v_target_id
    AND status = 'approved'
    AND retailer_key = 'amazon'
    AND (
      affiliate_url ILIKE '%B005BFSBVY%'
      OR destination_url ILIKE '%B005BFSBVY%'
    );

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION
      'Holmes HAPF30 demotion aborted: UPDATE expected exactly 1 row, updated % (id=%)',
      v_updated_count, v_target_id;
  END IF;
END $$;

-- =============================================================================
-- 2) POST-UPDATE VERIFICATION (inside transaction, before COMMIT)
-- =============================================================================

-- 2a) Target row demoted (expect 1 row, classification NULL)
SELECT
  l.id,
  f.slug,
  l.retailer_key,
  l.affiliate_url,
  l.browser_truth_classification,
  l.browser_truth_buyable_subtype,
  l.browser_truth_checked_at,
  left(l.browser_truth_notes, 80) AS browser_truth_notes_prefix
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE l.id = 'da6d3777-c4de-40c0-9f86-abe025b1db32'::uuid;
-- expect: browser_truth_classification IS NULL; notes start with "Demoted:"

-- 2b) No approved direct_buyable rows remain for holmes-hapf30 (runtime gate proxy)
SELECT
  l.id,
  f.slug,
  l.retailer_key,
  l.browser_truth_classification,
  l.is_primary
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'holmes-hapf30'
  AND l.status = 'approved'
  AND l.browser_truth_classification = 'direct_buyable';
-- expect: 0 rows

-- 2c) OEM primary unchanged (not touched by this packet)
SELECT
  l.id,
  l.retailer_key,
  l.is_primary,
  l.affiliate_url,
  l.browser_truth_classification
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'holmes-hapf30'
  AND l.retailer_key = 'oem-catalog'
  AND l.is_primary = true
  AND l.status = 'approved';
-- expect: 1 row; affiliate_url still contains /search?

-- =============================================================================
-- 3) DRY-RUN vs COMMIT
-- =============================================================================
-- DRY-RUN (default): leave ROLLBACK — verifies demotion in-session; no durable change.
ROLLBACK;

-- COMMIT (owner only — after backup + pre-flight + dry-run verification pass):
-- 1. Re-run sections 0–2 in one editor session.
-- 2. Confirm 2a shows browser_truth_classification NULL on id da6d3777-…
-- 3. Confirm 2b returns 0 rows.
-- 4. Comment out ROLLBACK above; uncomment COMMIT below; execute once.
-- 5. Post-commit: npm run buckparts:production-truth:ap (expect safe_cta_absent PASS).
-- COMMIT;
