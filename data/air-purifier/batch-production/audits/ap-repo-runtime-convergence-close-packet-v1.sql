-- AP Repo-Runtime Convergence Close Packet v1.2 (Phase 3 Honeywell rewrite)
-- git HEAD: e2ba7b4765561218754066a4ed355168af04999e
-- READ-ONLY ARTIFACT — each phase defaults ROLLBACK; owner replaces ROLLBACK with COMMIT per phase ONLY after that phase's validation SELECT passes.
-- Scope: 6-slug gap closing repo_runtime_convergence_gate_v1 (34 CSV / 28 Supabase → target gap 0)
-- Do NOT run npm run seed:import or bulk vertical-seed — use phased guarded SQL only.
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- BLOCKING OWNER RULES (fail closed)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Do NOT run all phases blindly in one COMMIT. Each phase is a separate transaction.
-- 2. Do NOT COMMIT a phase unless that phase's validation SELECT matches expected row counts / values below.
-- 3. If any mutation returns unexpected row counts, ROLLBACK that phase and re-run ap-supabase-vs-csv-diff before retry.
-- 4. Do NOT remove ap-repo-runtime-convergence-acceptance-v1.json until:
--      npm run buckparts:repo-runtime-convergence:check -- --enforce
--    returns state=CONVERGED and gap_size=0.
-- 5. Export Section 2 backup JSON before the first COMMIT (rollback is manual restore from backup).
--
-- Apply order: Section 2 backup → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Section 8 npm validation.

-- =============================================================================
-- SECTION 2: PREFLIGHT BACKUP (read-only SELECT — run outside transaction, export JSON)
-- =============================================================================

-- 2a) Gap slugs: air_purifier_filters
SELECT f.*
FROM public.air_purifier_filters f
WHERE f.slug IN (
  'blueair-f4max-411max',
  'blueair-fmini-mini-max',
  'honeywell-hrf-r2',
  'honeywell-hrf-r3',
  'levoit-rf-rar029',
  'winix-carbon-116131'
)
ORDER BY f.slug;

-- 2b) Legacy Blueair collision slugs (Supabase-only; do not mutate in close packet)
SELECT f.*
FROM public.air_purifier_filters f
WHERE f.slug IN ('blueair-f4max-411', 'blueair-fmini')
ORDER BY f.slug;

-- 2c) Gap slugs: retailer_links (all statuses)
SELECT rl.*, f.slug AS filter_slug
FROM public.air_purifier_retailer_links rl
JOIN public.air_purifier_filters f ON f.id = rl.air_purifier_filter_id
WHERE f.slug IN (
  'blueair-f4max-411max',
  'blueair-fmini-mini-max',
  'honeywell-hrf-r2',
  'honeywell-hrf-r3',
  'levoit-rf-rar029',
  'winix-carbon-116131'
)
ORDER BY f.slug, rl.retailer_key, rl.status;

-- 2d) Legacy Blueair collision retailer_links
SELECT rl.*, f.slug AS filter_slug
FROM public.air_purifier_retailer_links rl
JOIN public.air_purifier_filters f ON f.id = rl.air_purifier_filter_id
WHERE f.slug IN ('blueair-f4max-411', 'blueair-fmini')
ORDER BY f.slug, rl.retailer_key;

-- 2e) Filter aliases for gap + legacy Blueair slugs
SELECT fa.*, f.slug AS filter_slug
FROM public.air_purifier_filter_aliases fa
JOIN public.air_purifier_filters f ON f.id = fa.air_purifier_filter_id
WHERE f.slug IN (
  'blueair-f4max-411max',
  'blueair-fmini-mini-max',
  'blueair-f4max-411',
  'blueair-fmini',
  'levoit-rf-rar029',
  'winix-carbon-116131'
)
ORDER BY f.slug, fa.alias;

-- 2f) Compatibility mappings touching gap Blueair slugs (expect 0 rows on net-new filter slugs pre-Phase-2)
SELECT cm.*, m.slug AS model_slug, f.slug AS filter_slug
FROM public.air_purifier_compatibility_mappings cm
JOIN public.air_purifier_models m ON m.id = cm.air_purifier_model_id
JOIN public.air_purifier_filters f ON f.id = cm.air_purifier_filter_id
WHERE f.slug IN ('blueair-f4max-411max', 'blueair-fmini-mini-max')
   OR m.slug IN ('blueair-411a-max', 'blueair-mini-max')
ORDER BY m.slug, f.slug;


-- =============================================================================
-- PHASE 1 PREFLIGHT ASSERTIONS (read-only — abort phase if expectations fail)
-- Expected: levoit/winix filter rows exist; OEM still legacy OR already aligned (re-run safe).
-- =============================================================================

-- P1-A) Levoit / Winix filter rows + OEM state
SELECT
  f.slug,
  f.oem_part_number,
  CASE
    WHEN f.slug = 'levoit-rf-rar029' AND f.oem_part_number IN ('LEVOIT-RF-RAR029', 'LEVOIT-CORE-300-P-RF') THEN 'PASS'
    WHEN f.slug = 'winix-carbon-116131' AND f.oem_part_number IN ('WINIX-116131', 'WINIX-FILTER-I-116131') THEN 'PASS'
    ELSE 'FAIL'
  END AS oem_assertion
FROM public.air_purifier_filters f
WHERE f.slug IN ('levoit-rf-rar029', 'winix-carbon-116131')
ORDER BY f.slug;
-- EXPECT: 2 rows; both oem_assertion = PASS

-- P1-B) Row count guard
SELECT COUNT(*) AS levoit_winix_filter_count
FROM public.air_purifier_filters f
WHERE f.slug IN ('levoit-rf-rar029', 'winix-carbon-116131');
-- EXPECT: levoit_winix_filter_count = 2


-- =============================================================================
-- PHASE 1 TRANSACTION: OEM pre-alignment
-- Targets: levoit-rf-rar029, winix-carbon-116131
-- Operational: clears filter_slug_oem_collision for seed-import hygiene.
-- =============================================================================

BEGIN;

-- levoit-rf-rar029 filter OEM alignment (guarded: only if legacy OEM still present)
WITH levoit_updated AS (
  UPDATE public.air_purifier_filters SET
    oem_part_number = 'LEVOIT-CORE-300-P-RF',
    name = 'Core 300 Series Original Filter (Core 300-P-RF)',
    notes = 'Official Levoit cartridge family; supersedes legacy internal RAR029 label. Aliases retain Core 300-RF legacy token. Shopify HEACAFLVNUS0012A; UPC 817915026880.'
  WHERE slug = 'levoit-rf-rar029'
    AND oem_part_number = 'LEVOIT-RF-RAR029'
  RETURNING slug
)
SELECT COUNT(*) AS levoit_oem_rows_updated FROM levoit_updated;
-- EXPECT: levoit_oem_rows_updated = 0 (already aligned) OR 1 (first apply)

INSERT INTO public.air_purifier_filter_aliases (air_purifier_filter_id, alias)
SELECT f.id, v.alias
FROM public.air_purifier_filters f
CROSS JOIN (
  VALUES
    ('Core 300-P-RF'),
    ('Core 300-RF'),
    ('Core 300-P 3-Stage Original Filter'),
    ('HEACAFLVNUS0012A')
) AS v(alias)
WHERE f.slug = 'levoit-rf-rar029'
ON CONFLICT (air_purifier_filter_id, alias) DO NOTHING;

-- winix-carbon-116131 filter OEM alignment (guarded: only if legacy OEM still present)
WITH winix_updated AS (
  UPDATE public.air_purifier_filters SET
    oem_part_number = 'WINIX-FILTER-I-116131',
    name = 'Winix Filter I (116131) annual replacement set',
    notes = 'Official Winix Filter I: True HEPA + washable AOC carbon annual set. Not Filter B / not carbon-only. C555 / C555B family only after compat repair. Supersedes legacy carbon-sheet mislabel.'
  WHERE slug = 'winix-carbon-116131'
    AND oem_part_number = 'WINIX-116131'
  RETURNING slug
)
SELECT COUNT(*) AS winix_oem_rows_updated FROM winix_updated;
-- EXPECT: winix_oem_rows_updated = 0 (already aligned) OR 1 (first apply)

INSERT INTO public.air_purifier_filter_aliases (air_purifier_filter_id, alias)
SELECT f.id, v.alias
FROM public.air_purifier_filters f
CROSS JOIN (
  VALUES
    ('Filter I'),
    ('Filter I – 116131'),
    ('116131 Replacement Filter I')
) AS v(alias)
WHERE f.slug = 'winix-carbon-116131'
ON CONFLICT (air_purifier_filter_id, alias) DO NOTHING;

-- PHASE 1 VALIDATION (required before COMMIT)
SELECT
  f.slug,
  f.oem_part_number,
  CASE
    WHEN f.slug = 'levoit-rf-rar029' AND f.oem_part_number = 'LEVOIT-CORE-300-P-RF' THEN 'PASS'
    WHEN f.slug = 'winix-carbon-116131' AND f.oem_part_number = 'WINIX-FILTER-I-116131' THEN 'PASS'
    ELSE 'FAIL'
  END AS phase1_oem_assertion
FROM public.air_purifier_filters f
WHERE f.slug IN ('levoit-rf-rar029', 'winix-carbon-116131')
ORDER BY f.slug;
-- EXPECT: 2 rows; both phase1_oem_assertion = PASS — else ROLLBACK

ROLLBACK;
-- Owner: replace ROLLBACK with COMMIT only if validation above passes.


-- =============================================================================
-- PHASE 2 PREFLIGHT ASSERTIONS (read-only — abort phase if expectations fail)
-- =============================================================================

-- P2-A) Blueair brand exists
SELECT COUNT(*) AS blueair_brand_count
FROM public.brands b
WHERE b.slug = 'blueair';
-- EXPECT: blueair_brand_count = 1 — if 0, STOP; Phase 2 filter INSERT will silently 0-row

-- P2-B) Target model slugs exist
SELECT m.slug, COUNT(*) AS model_count
FROM public.air_purifier_models m
WHERE m.slug IN ('blueair-411a-max', 'blueair-mini-max')
GROUP BY m.slug
ORDER BY m.slug;
-- EXPECT: 2 rows (blueair-411a-max, blueair-mini-max)

-- P2-C) Net-new filter slugs absent
SELECT COUNT(*) AS net_new_filter_slug_count
FROM public.air_purifier_filters f
WHERE f.slug IN ('blueair-f4max-411max', 'blueair-fmini-mini-max');
-- EXPECT: net_new_filter_slug_count = 0 (first apply) OR 2 (idempotent re-run after Phase 2 COMMIT)

-- P2-D) Conflicting OEM tokens absent on other slugs
SELECT f.slug, f.oem_part_number
FROM public.air_purifier_filters f
WHERE f.oem_part_number IN ('F4MAX', 'FMINI')
  AND f.slug NOT IN ('blueair-f4max-411max', 'blueair-fmini-mini-max');
-- EXPECT: 0 rows


-- =============================================================================
-- PHASE 2 TRANSACTION: Blueair net-new seed (never touch blueair-f4max-411, blueair-fmini)
-- =============================================================================

BEGIN;

-- blueair-f4max-411max
WITH filter_inserted AS (
  INSERT INTO public.air_purifier_filters (brand_id, slug, oem_part_number, name, replacement_interval_months, notes)
  SELECT b.id,
    'blueair-f4max-411max',
    'F4MAX',
    'Blue Pure 411i Max / 411a Max Filter (Particle + Carbon)',
    6,
    'F4MAX / 110036 Max-series cartridge; 411i Max / 411a Max only; NOT legacy 411/411+/411 Auto.'
  FROM public.brands b
  WHERE b.slug = 'blueair'
    AND NOT EXISTS (SELECT 1 FROM public.air_purifier_filters f WHERE f.slug = 'blueair-f4max-411max')
    AND NOT EXISTS (SELECT 1 FROM public.air_purifier_filters f WHERE f.oem_part_number = 'F4MAX')
  RETURNING slug
)
SELECT COUNT(*) AS f4max_filter_rows_inserted FROM filter_inserted;

INSERT INTO public.air_purifier_filter_aliases (air_purifier_filter_id, alias)
SELECT f.id, v.alias
FROM public.air_purifier_filters f
CROSS JOIN (VALUES ('F4MAX'), ('110036')) AS v(alias)
WHERE f.slug = 'blueair-f4max-411max'
ON CONFLICT (air_purifier_filter_id, alias) DO NOTHING;

WITH compat_inserted AS (
  INSERT INTO public.air_purifier_compatibility_mappings (air_purifier_model_id, air_purifier_filter_id, is_recommended)
  SELECT m.id, f.id, true
  FROM public.air_purifier_models m
  JOIN public.air_purifier_filters f ON f.slug = 'blueair-f4max-411max'
  WHERE m.slug = 'blueair-411a-max'
  ON CONFLICT (air_purifier_model_id, air_purifier_filter_id) DO NOTHING
  RETURNING air_purifier_filter_id
)
SELECT COUNT(*) AS f4max_compat_rows_inserted FROM compat_inserted;
-- EXPECT: 1 on first apply; 0 on idempotent re-run

WITH link_inserted AS (
  INSERT INTO public.air_purifier_retailer_links (
    air_purifier_filter_id, retailer_name, affiliate_url, destination_url,
    retailer_slug, retailer_key, is_primary, status, source,
    browser_truth_classification, browser_truth_notes, browser_truth_checked_at
  )
  SELECT f.id,
    'OEM / manufacturer catalog (keyword lookup)',
    'https://www.blueair.com/products/f4max-replacement-pac-filter-for-411max-series-f4max',
    'https://www.blueair.com/products/f4max-replacement-pac-filter-for-411max-series-f4max',
    'oem-catalog', 'oem-catalog', true, 'approved', 'manual',
    'direct_buyable',
    $bt_notes$Live-browser model-first ap-model-first-blueair-particle-411-live-browser-v1 (2026-06-22): official F4MAX PDP; 411i Max / 411a Max only; F4MAX token in primary slice; Add to Cart per batch-v2 catalog identity + model-first wrong-family proof. NOT legacy 411/411+/411 Auto.$bt_notes$,
    '2026-06-22T16:20:00.000Z'::timestamptz
  FROM public.air_purifier_filters f
  WHERE f.slug = 'blueair-f4max-411max'
    AND NOT EXISTS (
      SELECT 1 FROM public.air_purifier_retailer_links rl
      WHERE rl.air_purifier_filter_id = f.id AND rl.retailer_key = 'oem-catalog' AND rl.status = 'approved'
    )
  RETURNING id
)
SELECT COUNT(*) AS f4max_link_rows_inserted FROM link_inserted;
-- EXPECT: 1 on first apply; 0 on idempotent re-run

-- blueair-fmini-mini-max
WITH filter_inserted AS (
  INSERT INTO public.air_purifier_filters (brand_id, slug, oem_part_number, name, replacement_interval_months, notes)
  SELECT b.id,
    'blueair-fmini-mini-max',
    'FMINI',
    'Blue Pure Mini Max Filter (Particle + Carbon)',
    6,
    'FMINI cartridge; Blue Pure Mini Max only; NOT legacy 411 series or F4MAX Max line.'
  FROM public.brands b
  WHERE b.slug = 'blueair'
    AND NOT EXISTS (SELECT 1 FROM public.air_purifier_filters f WHERE f.slug = 'blueair-fmini-mini-max')
    AND NOT EXISTS (SELECT 1 FROM public.air_purifier_filters f WHERE f.oem_part_number = 'FMINI')
  RETURNING slug
)
SELECT COUNT(*) AS fmini_filter_rows_inserted FROM filter_inserted;

INSERT INTO public.air_purifier_filter_aliases (air_purifier_filter_id, alias)
SELECT f.id, 'FMINI'
FROM public.air_purifier_filters f
WHERE f.slug = 'blueair-fmini-mini-max'
ON CONFLICT (air_purifier_filter_id, alias) DO NOTHING;

WITH compat_inserted AS (
  INSERT INTO public.air_purifier_compatibility_mappings (air_purifier_model_id, air_purifier_filter_id, is_recommended)
  SELECT m.id, f.id, true
  FROM public.air_purifier_models m
  JOIN public.air_purifier_filters f ON f.slug = 'blueair-fmini-mini-max'
  WHERE m.slug = 'blueair-mini-max'
  ON CONFLICT (air_purifier_model_id, air_purifier_filter_id) DO NOTHING
  RETURNING air_purifier_filter_id
)
SELECT COUNT(*) AS fmini_compat_rows_inserted FROM compat_inserted;

WITH link_inserted AS (
  INSERT INTO public.air_purifier_retailer_links (
    air_purifier_filter_id, retailer_name, affiliate_url, destination_url,
    retailer_slug, retailer_key, is_primary, status, source,
    browser_truth_classification, browser_truth_notes, browser_truth_checked_at
  )
  SELECT f.id,
    'OEM / manufacturer catalog (keyword lookup)',
    'https://www.blueair.com/products/replacement-filter-for-blue-pure-mini-max',
    'https://www.blueair.com/products/replacement-filter-for-blue-pure-mini-max',
    'oem-catalog', 'oem-catalog', true, 'approved', 'manual',
    'direct_buyable',
    $bt_notes$Live re-proof 2026-06-22T18:55:15.000Z + model-first ap-model-first-blueair-particle-411-live-browser-v1: official FMINI PDP; Blue Pure Mini Max only; FMINI token in primary slice; $21.99; Add to Cart active; Shopify available:true.$bt_notes$,
    '2026-06-22T18:55:15.000Z'::timestamptz
  FROM public.air_purifier_filters f
  WHERE f.slug = 'blueair-fmini-mini-max'
    AND NOT EXISTS (
      SELECT 1 FROM public.air_purifier_retailer_links rl
      WHERE rl.air_purifier_filter_id = f.id AND rl.retailer_key = 'oem-catalog' AND rl.status = 'approved'
    )
  RETURNING id
)
SELECT COUNT(*) AS fmini_link_rows_inserted FROM link_inserted;

-- PHASE 2 VALIDATION (required before COMMIT)
SELECT
  f.slug,
  COUNT(rl.id) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_count,
  MAX(rl.retailer_key) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_retailer_key,
  MAX(rl.browser_truth_classification) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_browser_truth,
  MAX(rl.affiliate_url) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_url,
  CASE
    WHEN COUNT(rl.id) FILTER (WHERE rl.status = 'approved' AND rl.is_primary AND rl.browser_truth_classification = 'direct_buyable') = 1
    THEN 'PASS'
    ELSE 'FAIL'
  END AS phase2_assertion
FROM public.air_purifier_filters f
LEFT JOIN public.air_purifier_retailer_links rl ON rl.air_purifier_filter_id = f.id
WHERE f.slug IN ('blueair-f4max-411max', 'blueair-fmini-mini-max')
GROUP BY f.slug
ORDER BY f.slug;
-- EXPECT: 2 rows; primary_count=1; primary_retailer_key=oem-catalog; primary_browser_truth=direct_buyable; phase2_assertion=PASS — else ROLLBACK

ROLLBACK;
-- Owner: replace ROLLBACK with COMMIT only if validation above passes.


-- =============================================================================
-- PHASE 3 PREFLIGHT ASSERTIONS (read-only — abort phase if expectations fail)
-- =============================================================================

-- P3-A) Honeywell oem-catalog approved promote targets exist (exactly one per slug)
SELECT
  f.slug,
  COUNT(rl.id) AS oem_catalog_approved_count,
  CASE WHEN COUNT(rl.id) = 1 THEN 'PASS' ELSE 'FAIL' END AS p3_target_assertion
FROM public.air_purifier_filters f
JOIN public.air_purifier_retailer_links rl ON rl.air_purifier_filter_id = f.id
WHERE f.slug IN ('honeywell-hrf-r2', 'honeywell-hrf-r3')
  AND rl.retailer_key = 'oem-catalog'
  AND rl.status = 'approved'
GROUP BY f.slug
ORDER BY f.slug;
-- EXPECT: 2 rows; oem_catalog_approved_count=1; p3_target_assertion=PASS each — else STOP (do not BEGIN Phase 3)

-- P3-B) Current primary state (dry-run baseline)
SELECT
  f.slug,
  MAX(rl.retailer_key) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS current_primary_retailer_key
FROM public.air_purifier_filters f
LEFT JOIN public.air_purifier_retailer_links rl ON rl.air_purifier_filter_id = f.id
WHERE f.slug IN ('honeywell-hrf-r2', 'honeywell-hrf-r3')
GROUP BY f.slug
ORDER BY f.slug;
-- EXPECT (repo truth): current_primary_retailer_key=amazon for both slugs pre-apply


-- =============================================================================
-- PHASE 3 TRANSACTION: Honeywell primary promotion (v1.2 — separate statements per slug)
-- Prior v1.1 chained demote+promote CTEs on air_purifier_retailer_links FAILED dry-run safety
-- review: demote-all-approved ran before promote; promote returned 0 rows for honeywell-hrf-r3
-- → primary_count=0. Rewritten: promote target FIRST, demote non-target primaries ONLY after
-- target is proven primary — cannot orphan slug with zero primaries.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- honeywell-hrf-r2
-- ─────────────────────────────────────────────────────────────────────────────

-- R2-1) Prove exactly one approved oem-catalog target
SELECT
  'honeywell-hrf-r2' AS filter_slug,
  COUNT(rl.id) AS oem_catalog_target_count,
  MAX(rl.id::text) AS oem_catalog_link_id,
  CASE WHEN COUNT(rl.id) = 1 THEN 'PASS' ELSE 'FAIL' END AS target_proof_assertion
FROM public.air_purifier_retailer_links rl
JOIN public.air_purifier_filters f ON f.id = rl.air_purifier_filter_id
WHERE f.slug = 'honeywell-hrf-r2'
  AND rl.retailer_key = 'oem-catalog'
  AND rl.status = 'approved';
-- DRY-RUN EXPECT: oem_catalog_target_count=1; target_proof_assertion=PASS — else ROLLBACK

-- R2-2) Promote oem-catalog target (guarded: exactly one target)
WITH promoted AS (
  UPDATE public.air_purifier_retailer_links rl
  SET
    retailer_name = 'Honeywell Store — True HEPA Filter R 2-Pack (HRF-R2)',
    affiliate_url = 'https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-2-pack-hrf-r2.htm',
    destination_url = 'https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-2-pack-hrf-r2.htm',
    retailer_slug = 'oem-catalog',
    retailer_key = 'oem-catalog',
    is_primary = true,
    status = 'approved',
    browser_truth_classification = 'direct_buyable',
    browser_truth_notes = $bt_notes$Playwright Honeywell bite #2: PDP HRF-R2 2-pack; Add to Cart; not search/404; R1/R3 tokens not dominant$bt_notes$,
    browser_truth_checked_at = '2026-05-22T23:00:00.000Z'::timestamptz
  WHERE rl.id = (
    SELECT rl2.id
    FROM public.air_purifier_retailer_links rl2
    JOIN public.air_purifier_filters f2 ON f2.id = rl2.air_purifier_filter_id
    WHERE f2.slug = 'honeywell-hrf-r2'
      AND rl2.retailer_key = 'oem-catalog'
      AND rl2.status = 'approved'
    LIMIT 1
  )
  AND (
    SELECT COUNT(*)
    FROM public.air_purifier_retailer_links rl3
    JOIN public.air_purifier_filters f3 ON f3.id = rl3.air_purifier_filter_id
    WHERE f3.slug = 'honeywell-hrf-r2'
      AND rl3.retailer_key = 'oem-catalog'
      AND rl3.status = 'approved'
  ) = 1
  RETURNING rl.id
)
SELECT
  'honeywell-hrf-r2' AS filter_slug,
  COUNT(*) AS promoted_count,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS promote_assertion
FROM promoted;
-- DRY-RUN EXPECT: promoted_count=1; promote_assertion=PASS — else ROLLBACK (do not demote)

-- R2-3) Demote non-target approved primary rows ONLY after target is primary
WITH demoted AS (
  UPDATE public.air_purifier_retailer_links rl
  SET is_primary = false
  FROM public.air_purifier_filters f
  WHERE rl.air_purifier_filter_id = f.id
    AND f.slug = 'honeywell-hrf-r2'
    AND rl.status = 'approved'
    AND rl.is_primary = true
    AND rl.id <> (
      SELECT rl_tgt.id
      FROM public.air_purifier_retailer_links rl_tgt
      JOIN public.air_purifier_filters f_tgt ON f_tgt.id = rl_tgt.air_purifier_filter_id
      WHERE f_tgt.slug = 'honeywell-hrf-r2'
        AND rl_tgt.retailer_key = 'oem-catalog'
        AND rl_tgt.status = 'approved'
      LIMIT 1
    )
    AND EXISTS (
      SELECT 1
      FROM public.air_purifier_retailer_links rl_chk
      JOIN public.air_purifier_filters f_chk ON f_chk.id = rl_chk.air_purifier_filter_id
      WHERE f_chk.slug = 'honeywell-hrf-r2'
        AND rl_chk.retailer_key = 'oem-catalog'
        AND rl_chk.status = 'approved'
        AND rl_chk.is_primary = true
    )
  RETURNING rl.id
)
SELECT
  'honeywell-hrf-r2' AS filter_slug,
  COUNT(*) AS demoted_non_target_count
FROM demoted;
-- DRY-RUN EXPECT: demoted_non_target_count=1 (amazon demoted) when promote succeeded

-- R2-4) Per-slug validation
SELECT
  f.slug,
  COUNT(*) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_count,
  MAX(rl.retailer_key) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_retailer_key,
  MAX(rl.browser_truth_classification) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_browser_truth,
  CASE
    WHEN COUNT(*) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) = 1
     AND MAX(rl.retailer_key) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) = 'oem-catalog'
     AND MAX(rl.browser_truth_classification) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) = 'direct_buyable'
    THEN 'PASS'
    ELSE 'FAIL'
  END AS phase3_slug_assertion
FROM public.air_purifier_filters f
LEFT JOIN public.air_purifier_retailer_links rl ON rl.air_purifier_filter_id = f.id
WHERE f.slug = 'honeywell-hrf-r2'
GROUP BY f.slug;
-- DRY-RUN EXPECT: primary_count=1; primary_retailer_key=oem-catalog; primary_browser_truth=direct_buyable; phase3_slug_assertion=PASS


-- ─────────────────────────────────────────────────────────────────────────────
-- honeywell-hrf-r3
-- ─────────────────────────────────────────────────────────────────────────────

-- R3-1) Prove exactly one approved oem-catalog target
SELECT
  'honeywell-hrf-r3' AS filter_slug,
  COUNT(rl.id) AS oem_catalog_target_count,
  MAX(rl.id::text) AS oem_catalog_link_id,
  CASE WHEN COUNT(rl.id) = 1 THEN 'PASS' ELSE 'FAIL' END AS target_proof_assertion
FROM public.air_purifier_retailer_links rl
JOIN public.air_purifier_filters f ON f.id = rl.air_purifier_filter_id
WHERE f.slug = 'honeywell-hrf-r3'
  AND rl.retailer_key = 'oem-catalog'
  AND rl.status = 'approved';
-- DRY-RUN EXPECT: oem_catalog_target_count=1; target_proof_assertion=PASS — else ROLLBACK

-- R3-2) Promote oem-catalog target (guarded: exactly one target)
WITH promoted AS (
  UPDATE public.air_purifier_retailer_links rl
  SET
    retailer_name = 'Honeywell Store — True HEPA Filter R 3-Pack (HRF-R3)',
    affiliate_url = 'https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-3-pack-hrf-r3.htm',
    destination_url = 'https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-3-pack-hrf-r3.htm',
    retailer_slug = 'oem-catalog',
    retailer_key = 'oem-catalog',
    is_primary = true,
    status = 'approved',
    browser_truth_classification = 'direct_buyable',
    browser_truth_notes = $bt_notes$Playwright pilot v1: PDP title/H1 HRF-R3; Add to Cart visible; not search/404; wrong-family R1/R2 not dominant$bt_notes$,
    browser_truth_checked_at = '2026-05-22T22:30:00.000Z'::timestamptz
  WHERE rl.id = (
    SELECT rl2.id
    FROM public.air_purifier_retailer_links rl2
    JOIN public.air_purifier_filters f2 ON f2.id = rl2.air_purifier_filter_id
    WHERE f2.slug = 'honeywell-hrf-r3'
      AND rl2.retailer_key = 'oem-catalog'
      AND rl2.status = 'approved'
    LIMIT 1
  )
  AND (
    SELECT COUNT(*)
    FROM public.air_purifier_retailer_links rl3
    JOIN public.air_purifier_filters f3 ON f3.id = rl3.air_purifier_filter_id
    WHERE f3.slug = 'honeywell-hrf-r3'
      AND rl3.retailer_key = 'oem-catalog'
      AND rl3.status = 'approved'
  ) = 1
  RETURNING rl.id
)
SELECT
  'honeywell-hrf-r3' AS filter_slug,
  COUNT(*) AS promoted_count,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS promote_assertion
FROM promoted;
-- DRY-RUN EXPECT: promoted_count=1; promote_assertion=PASS — else ROLLBACK (do not demote)

-- R3-3) Demote non-target approved primary rows ONLY after target is primary
WITH demoted AS (
  UPDATE public.air_purifier_retailer_links rl
  SET is_primary = false
  FROM public.air_purifier_filters f
  WHERE rl.air_purifier_filter_id = f.id
    AND f.slug = 'honeywell-hrf-r3'
    AND rl.status = 'approved'
    AND rl.is_primary = true
    AND rl.id <> (
      SELECT rl_tgt.id
      FROM public.air_purifier_retailer_links rl_tgt
      JOIN public.air_purifier_filters f_tgt ON f_tgt.id = rl_tgt.air_purifier_filter_id
      WHERE f_tgt.slug = 'honeywell-hrf-r3'
        AND rl_tgt.retailer_key = 'oem-catalog'
        AND rl_tgt.status = 'approved'
      LIMIT 1
    )
    AND EXISTS (
      SELECT 1
      FROM public.air_purifier_retailer_links rl_chk
      JOIN public.air_purifier_filters f_chk ON f_chk.id = rl_chk.air_purifier_filter_id
      WHERE f_chk.slug = 'honeywell-hrf-r3'
        AND rl_chk.retailer_key = 'oem-catalog'
        AND rl_chk.status = 'approved'
        AND rl_chk.is_primary = true
    )
  RETURNING rl.id
)
SELECT
  'honeywell-hrf-r3' AS filter_slug,
  COUNT(*) AS demoted_non_target_count
FROM demoted;
-- DRY-RUN EXPECT: demoted_non_target_count=1 (amazon demoted) when promote succeeded

-- R3-4) Per-slug validation
SELECT
  f.slug,
  COUNT(*) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_count,
  MAX(rl.retailer_key) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_retailer_key,
  MAX(rl.browser_truth_classification) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_browser_truth,
  CASE
    WHEN COUNT(*) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) = 1
     AND MAX(rl.retailer_key) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) = 'oem-catalog'
     AND MAX(rl.browser_truth_classification) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) = 'direct_buyable'
    THEN 'PASS'
    ELSE 'FAIL'
  END AS phase3_slug_assertion
FROM public.air_purifier_filters f
LEFT JOIN public.air_purifier_retailer_links rl ON rl.air_purifier_filter_id = f.id
WHERE f.slug = 'honeywell-hrf-r3'
GROUP BY f.slug;
-- DRY-RUN EXPECT: primary_count=1; primary_retailer_key=oem-catalog; primary_browser_truth=direct_buyable; phase3_slug_assertion=PASS


-- PHASE 3 FINAL VALIDATION (both slugs — required before COMMIT)
SELECT
  f.slug,
  COUNT(*) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_count,
  MAX(rl.retailer_key) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_retailer_key,
  MAX(rl.browser_truth_classification) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_browser_truth,
  CASE
    WHEN COUNT(*) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) = 1
     AND MAX(rl.retailer_key) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) = 'oem-catalog'
     AND MAX(rl.browser_truth_classification) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) = 'direct_buyable'
    THEN 'PASS'
    ELSE 'FAIL'
  END AS phase3_slug_assertion
FROM public.air_purifier_filters f
LEFT JOIN public.air_purifier_retailer_links rl ON rl.air_purifier_filter_id = f.id
WHERE f.slug IN ('honeywell-hrf-r2', 'honeywell-hrf-r3')
GROUP BY f.slug
ORDER BY f.slug;
-- BLOCKING RULE: Do NOT COMMIT unless BOTH rows show:
--   primary_count=1, primary_retailer_key=oem-catalog, primary_browser_truth=direct_buyable, phase3_slug_assertion=PASS
-- If honeywell-hrf-r3 (or r2) shows primary_count=0 or phase3_slug_assertion=FAIL → ROLLBACK and re-run diff.

ROLLBACK;
-- Owner: replace ROLLBACK with COMMIT only when Phase 3 final validation shows PASS for BOTH slugs.


-- =============================================================================
-- PHASE 4 PREFLIGHT ASSERTIONS (read-only — abort phase if expectations fail)
-- SQL-executable without Phase 1; operationally run Phase 1 first for OEM collision hygiene.
-- =============================================================================

-- P4-A) Phase 1 OEM alignment state (operational hygiene — not a SQL FK dependency)
SELECT
  f.slug,
  f.oem_part_number,
  CASE
    WHEN f.slug = 'levoit-rf-rar029' AND f.oem_part_number = 'LEVOIT-CORE-300-P-RF' THEN 'PASS'
    WHEN f.slug = 'winix-carbon-116131' AND f.oem_part_number = 'WINIX-FILTER-I-116131' THEN 'PASS'
    ELSE 'FAIL_PHASE1_NOT_COMMITTED'
  END AS phase1_oem_hygiene
FROM public.air_purifier_filters f
WHERE f.slug IN ('levoit-rf-rar029', 'winix-carbon-116131')
ORDER BY f.slug;
-- EXPECT: both PASS before Phase 4 COMMIT (re-run Phase 1 if FAIL_PHASE1_NOT_COMMITTED)

-- P4-B) Search-placeholder primary rows exist OR already at official PDP (re-run detection)
SELECT
  f.slug,
  rl.affiliate_url,
  rl.browser_truth_classification,
  CASE
    WHEN f.slug = 'levoit-rf-rar029'
     AND rl.retailer_key = 'oem-catalog' AND rl.status = 'approved'
     AND rl.affiliate_url = 'https://levoit.com/search?q=LEVOIT-RF-RAR029'
    THEN 'READY_FOR_UPDATE'
    WHEN f.slug = 'levoit-rf-rar029'
     AND rl.retailer_key = 'oem-catalog' AND rl.status = 'approved'
     AND rl.affiliate_url = 'https://levoit.com/products/core300-p-air-purifier-replacement-filter'
     AND rl.browser_truth_classification = 'direct_buyable'
    THEN 'ALREADY_ALIGNED'
    WHEN f.slug = 'winix-carbon-116131'
     AND rl.retailer_key = 'oem-catalog' AND rl.status = 'approved'
     AND rl.affiliate_url = 'https://www.winixamerica.com/search?q=WINIX-116131'
    THEN 'READY_FOR_UPDATE'
    WHEN f.slug = 'winix-carbon-116131'
     AND rl.retailer_key = 'oem-catalog' AND rl.status = 'approved'
     AND rl.affiliate_url = 'https://www.winixamerica.com/product/filter-i-116131/'
     AND rl.browser_truth_classification = 'direct_buyable'
    THEN 'ALREADY_ALIGNED'
    ELSE 'UNEXPECTED_STATE'
  END AS phase4_preflight_state
FROM public.air_purifier_filters f
JOIN public.air_purifier_retailer_links rl ON rl.air_purifier_filter_id = f.id
WHERE f.slug IN ('levoit-rf-rar029', 'winix-carbon-116131')
  AND rl.retailer_key = 'oem-catalog'
  AND rl.status = 'approved'
  AND rl.is_primary = true
ORDER BY f.slug;
-- EXPECT: READY_FOR_UPDATE or ALREADY_ALIGNED per slug — if UNEXPECTED_STATE, STOP and re-run diff


-- =============================================================================
-- PHASE 4 TRANSACTION: Levoit/Winix retailer_links parity
-- =============================================================================

BEGIN;

-- levoit-rf-rar029: search placeholder → official PDP
WITH updated AS (
  UPDATE public.air_purifier_retailer_links rl
  SET
    retailer_name = 'OEM / manufacturer catalog (keyword lookup)',
    affiliate_url = 'https://levoit.com/products/core300-p-air-purifier-replacement-filter',
    destination_url = 'https://levoit.com/products/core300-p-air-purifier-replacement-filter',
    retailer_slug = 'oem-catalog',
    retailer_key = 'oem-catalog',
    is_primary = true,
    status = 'approved',
    browser_truth_classification = 'direct_buyable',
    browser_truth_notes = $bt_notes$Core 300 identity correction + Consumer Naming Bridge Option A; live browser proof ap-model-first-levoit-rf-rar029-live-browser-v1 (2026-05-30): official PDP Core 300 Series Original Filter; consumer tokens Core 300-P-RF / Core 300-P 3-Stage Original Filter in primary slice; Shopify SKU HEACAFLVNUS0012A; UPC 817915026880; Add to cart $29.99 available:true. PROVEN: internal tokens RAR029 / RF-RAR029 / LEVOIT-RF-RAR029 absent from primary. Legacy core300-air-purifier-replacement-filter (Core 300-RF) sold out — reference only. wrong_family_tokens_seen [] in primary; Pet 300-RF-PA variants not in primary slice.$bt_notes$,
    browser_truth_checked_at = '2026-05-30T06:00:00.000Z'::timestamptz
  FROM public.air_purifier_filters f
  WHERE rl.air_purifier_filter_id = f.id
    AND f.slug = 'levoit-rf-rar029'
    AND rl.retailer_key = 'oem-catalog'
    AND rl.status = 'approved'
    AND rl.affiliate_url = 'https://levoit.com/search?q=LEVOIT-RF-RAR029'
  RETURNING rl.id
)
SELECT
  'levoit-rf-rar029' AS filter_slug,
  COUNT(*) AS rows_updated,
  CASE
    WHEN COUNT(*) = 1 THEN 'PASS'
    WHEN COUNT(*) = 0 THEN 'FAIL_ZERO_ROWS'
    ELSE 'FAIL_UNEXPECTED'
  END AS mutation_assertion
FROM updated;
-- EXPECT: rows_updated=1 OR (preflight ALREADY_ALIGNED and skip mutation) — if FAIL_ZERO_ROWS and not ALREADY_ALIGNED, ROLLBACK

SELECT
  f.slug,
  MAX(rl.affiliate_url) FILTER (WHERE rl.is_primary AND rl.status = 'approved') AS primary_url,
  MAX(rl.browser_truth_classification) FILTER (WHERE rl.is_primary AND rl.status = 'approved') AS primary_browser_truth,
  CASE
    WHEN MAX(rl.affiliate_url) FILTER (WHERE rl.is_primary AND rl.status = 'approved')
       = 'https://levoit.com/products/core300-p-air-purifier-replacement-filter'
     AND MAX(rl.browser_truth_classification) FILTER (WHERE rl.is_primary AND rl.status = 'approved') = 'direct_buyable'
    THEN 'PASS'
    ELSE 'FAIL'
  END AS phase4_slug_assertion
FROM public.air_purifier_filters f
JOIN public.air_purifier_retailer_links rl ON rl.air_purifier_filter_id = f.id
WHERE f.slug = 'levoit-rf-rar029'
GROUP BY f.slug;

-- winix-carbon-116131: search placeholder → official Filter I PDP
WITH updated AS (
  UPDATE public.air_purifier_retailer_links rl
  SET
    retailer_name = 'OEM / manufacturer catalog (keyword lookup)',
    affiliate_url = 'https://www.winixamerica.com/product/filter-i-116131/',
    destination_url = 'https://www.winixamerica.com/product/filter-i-116131/',
    retailer_slug = 'oem-catalog',
    retailer_key = 'oem-catalog',
    is_primary = true,
    status = 'approved',
    browser_truth_classification = 'direct_buyable',
    browser_truth_notes = $bt_notes$Filter I identity correction; batch-v2 + model-first + live PDP 2026-06-18: official Filter I – 116131 PDP; True HEPA + washable AOC carbon annual set; compatible C555 per manufacturer copy; in stock; Add to cart. PROVEN: not Filter B / not carbon-only. PROVEN: internal WINIX-116131 search placeholder abandoned. wrong_family_tokens_seen [] in primary slice; Filter A 115115 / Filter H 116130 in cross-sell only.$bt_notes$,
    browser_truth_checked_at = '2026-06-18T14:00:00.000Z'::timestamptz
  FROM public.air_purifier_filters f
  WHERE rl.air_purifier_filter_id = f.id
    AND f.slug = 'winix-carbon-116131'
    AND rl.retailer_key = 'oem-catalog'
    AND rl.status = 'approved'
    AND rl.affiliate_url = 'https://www.winixamerica.com/search?q=WINIX-116131'
  RETURNING rl.id
)
SELECT
  'winix-carbon-116131' AS filter_slug,
  COUNT(*) AS rows_updated,
  CASE
    WHEN COUNT(*) = 1 THEN 'PASS'
    WHEN COUNT(*) = 0 THEN 'FAIL_ZERO_ROWS'
    ELSE 'FAIL_UNEXPECTED'
  END AS mutation_assertion
FROM updated;

SELECT
  f.slug,
  MAX(rl.affiliate_url) FILTER (WHERE rl.is_primary AND rl.status = 'approved') AS primary_url,
  MAX(rl.browser_truth_classification) FILTER (WHERE rl.is_primary AND rl.status = 'approved') AS primary_browser_truth,
  CASE
    WHEN MAX(rl.affiliate_url) FILTER (WHERE rl.is_primary AND rl.status = 'approved')
       = 'https://www.winixamerica.com/product/filter-i-116131/'
     AND MAX(rl.browser_truth_classification) FILTER (WHERE rl.is_primary AND rl.status = 'approved') = 'direct_buyable'
    THEN 'PASS'
    ELSE 'FAIL'
  END AS phase4_slug_assertion
FROM public.air_purifier_filters f
JOIN public.air_purifier_retailer_links rl ON rl.air_purifier_filter_id = f.id
WHERE f.slug = 'winix-carbon-116131'
GROUP BY f.slug;

ROLLBACK;
-- Owner: replace ROLLBACK with COMMIT only if phase4_slug_assertion=PASS for both slugs.
-- If rows_updated=0 and mutation_assertion=FAIL_ZERO_ROWS, ROLLBACK and re-run diff — do NOT COMMIT.


-- =============================================================================
-- FINAL GATE VERIFICATION (read-only — run after all phases COMMITted)
-- =============================================================================

SELECT f.slug,
  COUNT(*) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_count,
  MAX(rl.retailer_key) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_retailer_key,
  MAX(rl.browser_truth_classification) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_browser_truth,
  MAX(rl.affiliate_url) FILTER (WHERE rl.status = 'approved' AND rl.is_primary) AS primary_url,
  CASE
    WHEN COUNT(*) FILTER (WHERE rl.status = 'approved' AND rl.is_primary AND rl.browser_truth_classification = 'direct_buyable') = 1
    THEN 'PASS'
    ELSE 'FAIL'
  END AS final_slug_assertion
FROM public.air_purifier_filters f
LEFT JOIN public.air_purifier_retailer_links rl ON rl.air_purifier_filter_id = f.id
WHERE f.slug IN (
  'blueair-f4max-411max',
  'blueair-fmini-mini-max',
  'honeywell-hrf-r2',
  'honeywell-hrf-r3',
  'levoit-rf-rar029',
  'winix-carbon-116131'
)
GROUP BY f.slug
ORDER BY f.slug;
-- EXPECT: 6 rows; all final_slug_assertion=PASS — then run npm enforce gate before removing acceptance artifact
