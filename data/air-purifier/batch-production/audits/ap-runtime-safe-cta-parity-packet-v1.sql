-- AP Runtime Safe CTA Parity Packet v1 (repaired: UPDATE-in-place)
-- git HEAD: 655259d3e5e2bcddce086350c0da3a97efdb9cea
-- Strategy: UPDATE existing approved oem-catalog row (not INSERT) — unique index air_purifier_retailer_links_one_approved_per_slot on (air_purifier_filter_id, retailer_key) WHERE status='approved'
-- READ-ONLY ARTIFACT — default ROLLBACK; owner replaces ROLLBACK with COMMIT after verification
-- Scope: 9 stale-primary slugs

BEGIN;

-- -----------------------------------------------------------------------------
-- blueair-f2-211 (filter_id=c06ecca3-f7eb-4228-bd97-8c9c02b31f1e, oem-catalog row id=d034b55b-4931-4bb5-be4e-853e6db5494c)
-- -----------------------------------------------------------------------------
-- 1) Demote all approved rows for slug
UPDATE public.air_purifier_retailer_links SET is_primary = false WHERE air_purifier_filter_id = 'c06ecca3-f7eb-4228-bd97-8c9c02b31f1e' AND status = 'approved';
-- 2) UPDATE existing approved oem-catalog slot in place (CSV PDP + browser_truth)
UPDATE public.air_purifier_retailer_links SET
  retailer_name = 'OEM / manufacturer catalog (keyword lookup)',
  affiliate_url = 'https://www.blueair.com/products/blue-pure-211-plus-particle-carbon',
  destination_url = 'https://www.blueair.com/products/blue-pure-211-plus-particle-carbon',
  retailer_slug = 'oem-catalog',
  retailer_key = 'oem-catalog',
  is_primary = true,
  status = 'approved',
  browser_truth_classification = 'direct_buyable',
  browser_truth_notes = $bt_notes$Official Blueair 211+ Series Particle+Carbon PDP; in stock + Add to Cart; fits Blue Pure 211 / 211+ only; NOT 211+ Auto.$bt_notes$,
  browser_truth_checked_at = '2026-06-21T22:25:00.000Z'::timestamptz
WHERE id = 'd034b55b-4931-4bb5-be4e-853e6db5494c'
  AND air_purifier_filter_id = 'c06ecca3-f7eb-4228-bd97-8c9c02b31f1e'
  AND retailer_key = 'oem-catalog'
  AND status = 'approved';

-- -----------------------------------------------------------------------------
-- blueair-particle-411 (filter_id=b096c446-0a8e-4e30-8c04-fcf99f125866, oem-catalog row id=be0c22f0-fc61-4454-aa08-848ba42090f3)
-- -----------------------------------------------------------------------------
-- 1) Demote all approved rows for slug
UPDATE public.air_purifier_retailer_links SET is_primary = false WHERE air_purifier_filter_id = 'b096c446-0a8e-4e30-8c04-fcf99f125866' AND status = 'approved';
-- 2) UPDATE existing approved oem-catalog slot in place (CSV PDP + browser_truth)
UPDATE public.air_purifier_retailer_links SET
  retailer_name = 'OEM / manufacturer catalog (keyword lookup)',
  affiliate_url = 'https://www.blueair.com/products/blue-pure-411-particle-carbon',
  destination_url = 'https://www.blueair.com/products/blue-pure-411-particle-carbon',
  retailer_slug = 'oem-catalog',
  retailer_key = 'oem-catalog',
  is_primary = true,
  status = 'approved',
  browser_truth_classification = 'direct_buyable',
  browser_truth_notes = $bt_notes$Live-browser model-first ap-model-first-blueair-particle-411-live-browser-v1 (2026-06-22): official Blue Pure 411 Series Particle + Carbon Filter; $23.99 IN STOCK with Add to Cart; fits 411 / 411+ / 411 Auto only; NOT F4MAX Max-series; NOT Mini Max (FMINI). Supersedes BLUEAIR-PART411 search placeholder.$bt_notes$,
  browser_truth_checked_at = '2026-06-22T16:20:00.000Z'::timestamptz
WHERE id = 'be0c22f0-fc61-4454-aa08-848ba42090f3'
  AND air_purifier_filter_id = 'b096c446-0a8e-4e30-8c04-fcf99f125866'
  AND retailer_key = 'oem-catalog'
  AND status = 'approved';

-- -----------------------------------------------------------------------------
-- coway-airmega250-rf (filter_id=09db87a2-057c-44ee-b2c9-7d50a86e0208, oem-catalog row id=11194b61-3866-464c-ad9d-ae144a60e19e)
-- -----------------------------------------------------------------------------
-- 1) Demote all approved rows for slug
UPDATE public.air_purifier_retailer_links SET is_primary = false WHERE air_purifier_filter_id = '09db87a2-057c-44ee-b2c9-7d50a86e0208' AND status = 'approved';
-- 2) UPDATE existing approved oem-catalog slot in place (CSV PDP + browser_truth)
UPDATE public.air_purifier_retailer_links SET
  retailer_name = 'OEM / manufacturer catalog (keyword lookup)',
  affiliate_url = 'https://www.cowaymega.com/products/airmega-250-max2-filter',
  destination_url = 'https://www.cowaymega.com/products/airmega-250-max2-filter',
  retailer_slug = 'oem-catalog',
  retailer_key = 'oem-catalog',
  is_primary = true,
  status = 'approved',
  browser_truth_classification = 'direct_buyable',
  browser_truth_notes = $bt_notes$Coway Airmega 250 identity correction; official cowaymega.com Airmega 250•250S•250ART Max2 Filter PDP; SKU 3109144 (AP-1720-FP); compatible 250/250S/250ART per product copy; in stock + Add to Cart verified 2026-06-19. Supersedes invalid COWAY-3712487 search placeholder.$bt_notes$,
  browser_truth_checked_at = '2026-06-19T00:00:00.000Z'::timestamptz
WHERE id = '11194b61-3866-464c-ad9d-ae144a60e19e'
  AND air_purifier_filter_id = '09db87a2-057c-44ee-b2c9-7d50a86e0208'
  AND retailer_key = 'oem-catalog'
  AND status = 'approved';
-- preserve alternate (no mutation): 1e8e8b90-0e2e-41e6-afbc-3e93f85e63b8 (coway-oem-dtc)

-- -----------------------------------------------------------------------------
-- coway-airmega400-rf (filter_id=13fc174a-aa3a-4dc3-af0d-a27e22d0b691, oem-catalog row id=c2f163de-34ea-427e-8db6-ed1e9ab46f96)
-- -----------------------------------------------------------------------------
-- 1) Demote all approved rows for slug
UPDATE public.air_purifier_retailer_links SET is_primary = false WHERE air_purifier_filter_id = '13fc174a-aa3a-4dc3-af0d-a27e22d0b691' AND status = 'approved';
-- 2) UPDATE existing approved oem-catalog slot in place (CSV PDP + browser_truth)
UPDATE public.air_purifier_retailer_links SET
  retailer_name = 'OEM / manufacturer catalog (keyword lookup)',
  affiliate_url = 'https://cowaymega.com/products/airmega-400-max2-filter-set',
  destination_url = 'https://cowaymega.com/products/airmega-400-max2-filter-set',
  retailer_slug = 'oem-catalog',
  retailer_key = 'oem-catalog',
  is_primary = true,
  status = 'approved',
  browser_truth_classification = 'direct_buyable',
  browser_truth_notes = $bt_notes$Official cowaymega Airmega 400/400S Max2 Filter Set SKU 3104756; $129.00; in stock + Add to Cart verified 2026-06-21; Airmega 400/400S only — NOT 300/300S; AP-3019F(P) held pending proof.$bt_notes$,
  browser_truth_checked_at = '2026-06-21T23:05:00.000Z'::timestamptz
WHERE id = 'c2f163de-34ea-427e-8db6-ed1e9ab46f96'
  AND air_purifier_filter_id = '13fc174a-aa3a-4dc3-af0d-a27e22d0b691'
  AND retailer_key = 'oem-catalog'
  AND status = 'approved';
-- preserve safe Amazon alternate (no mutation): 791c2fe9-ec2a-4db7-84bc-fb85a5f3e53a
-- preserve alternate (no mutation): 8d7e1d72-0691-4b0f-bc4e-1d5c2b9c4959 (coway-oem-dtc)

-- -----------------------------------------------------------------------------
-- gg-flt4100 (filter_id=8ceb861d-83f5-4aca-896d-3f3666e0dfaf, oem-catalog row id=4ffb81e3-6acd-4246-b3e9-317d7a12fc38)
-- -----------------------------------------------------------------------------
-- 1) Demote all approved rows for slug
UPDATE public.air_purifier_retailer_links SET is_primary = false WHERE air_purifier_filter_id = '8ceb861d-83f5-4aca-896d-3f3666e0dfaf' AND status = 'approved';
-- 2) UPDATE existing approved oem-catalog slot in place (CSV PDP + browser_truth)
UPDATE public.air_purifier_retailer_links SET
  retailer_name = 'OEM / manufacturer catalog (keyword lookup)',
  affiliate_url = 'https://guardiantechnologies.com/products/germguardian-flt4100-hepa-genuine-replacement-filter-e',
  destination_url = 'https://guardiantechnologies.com/products/germguardian-flt4100-hepa-genuine-replacement-filter-e',
  retailer_slug = 'oem-catalog',
  retailer_key = 'oem-catalog',
  is_primary = true,
  status = 'approved',
  browser_truth_classification = 'direct_buyable',
  browser_truth_notes = $bt_notes$Live-browser model-first 2026-06-21: official Guardian Technologies PDP GermGuardian FLT4100 HEPA PURE Filter E; SKU/token FLT4100 in primary slice; combination True HEPA + activated carbon; $14.99 IN STOCK with Add to Cart + Buy Now; compatible AC4100 / AC4150P / AC4150BL / AC4175W per manufacturer copy. Supersedes germguardian.com search placeholder. Compat trim removes AC4820 (Filter B / FLT4825 wrong-family) and phantom AC4225/AC4230.$bt_notes$,
  browser_truth_checked_at = '2026-06-21T05:10:00.000Z'::timestamptz
WHERE id = '4ffb81e3-6acd-4246-b3e9-317d7a12fc38'
  AND air_purifier_filter_id = '8ceb861d-83f5-4aca-896d-3f3666e0dfaf'
  AND retailer_key = 'oem-catalog'
  AND status = 'approved';
-- preserve safe Amazon alternate (no mutation): 01a3f725-276e-4e5b-a63f-10ce8bc2c6bf

-- -----------------------------------------------------------------------------
-- gg-flt4825 (filter_id=70be653e-74d0-4cf8-9902-c74dc44cabac, oem-catalog row id=0e82211e-a192-4928-a849-80f45a97738d)
-- -----------------------------------------------------------------------------
-- 1) Demote all approved rows for slug
UPDATE public.air_purifier_retailer_links SET is_primary = false WHERE air_purifier_filter_id = '70be653e-74d0-4cf8-9902-c74dc44cabac' AND status = 'approved';
-- 2) UPDATE existing approved oem-catalog slot in place (CSV PDP + browser_truth)
UPDATE public.air_purifier_retailer_links SET
  retailer_name = 'OEM / manufacturer catalog (keyword lookup)',
  affiliate_url = 'https://guardiantechnologies.com/products/germguardian-flt4825-true-hepa-genuine-replacement-filter-b',
  destination_url = 'https://guardiantechnologies.com/products/germguardian-flt4825-true-hepa-genuine-replacement-filter-b',
  retailer_slug = 'oem-catalog',
  retailer_key = 'oem-catalog',
  is_primary = true,
  status = 'approved',
  browser_truth_classification = 'direct_buyable',
  browser_truth_notes = $bt_notes$Live-browser model-first 2026-06-21: official Guardian Technologies PDP GermGuardian FLT4825 HEPA PURE Filter B; SKU/token FLT4825 in primary slice; Filter B HEPA + charcoal combo; $24.99 IN STOCK with Add to Cart; compatible AC4825 / AC4825DLX / AC4300 / AC4900 per manufacturer copy. Supersedes germguardian.com GUARDIAN-FLT4825 search placeholder.$bt_notes$,
  browser_truth_checked_at = '2026-06-21T23:45:00.000Z'::timestamptz
WHERE id = '0e82211e-a192-4928-a849-80f45a97738d'
  AND air_purifier_filter_id = '70be653e-74d0-4cf8-9902-c74dc44cabac'
  AND retailer_key = 'oem-catalog'
  AND status = 'approved';
-- preserve safe Amazon alternate (no mutation): 3b913cb0-b016-4869-84a2-ed6b1e4d4b9a

-- -----------------------------------------------------------------------------
-- hb-trueair-04384 (filter_id=4004a082-7889-49b2-9877-8a2aa4d1d59b, oem-catalog row id=6a557b20-f983-4d6f-907f-eed958c6e964)
-- -----------------------------------------------------------------------------
-- 1) Demote all approved rows for slug
UPDATE public.air_purifier_retailer_links SET is_primary = false WHERE air_purifier_filter_id = '4004a082-7889-49b2-9877-8a2aa4d1d59b' AND status = 'approved';
-- 2) UPDATE existing approved oem-catalog slot in place (CSV PDP + browser_truth)
UPDATE public.air_purifier_retailer_links SET
  retailer_name = 'OEM / manufacturer catalog (keyword lookup)',
  affiliate_url = 'https://hamiltonbeach.com/filter-permanent-04383-air-purifier-990051000',
  destination_url = 'https://hamiltonbeach.com/filter-permanent-04383-air-purifier-990051000',
  retailer_slug = 'oem-catalog',
  retailer_key = 'oem-catalog',
  is_primary = true,
  status = 'approved',
  browser_truth_classification = 'direct_buyable',
  browser_truth_notes = $bt_notes$Live-browser model-first ap-model-first-hb-trueair-04384-live-browser-v1 (2026-06-22): official Hamilton Beach Replacement Permanent Filter part 990051000; $19.99 IN STOCK with Add to Cart; fits TrueAir Compact 04383/04384/04385/04386; NOT 04162 UV/console line (04913). Supersedes HB-04384 search placeholder.$bt_notes$,
  browser_truth_checked_at = '2026-06-22T16:55:00.000Z'::timestamptz
WHERE id = '6a557b20-f983-4d6f-907f-eed958c6e964'
  AND air_purifier_filter_id = '4004a082-7889-49b2-9877-8a2aa4d1d59b'
  AND retailer_key = 'oem-catalog'
  AND status = 'approved';

-- -----------------------------------------------------------------------------
-- rabbit-carbon-minusa2 (filter_id=98ccee9c-fe69-4359-bb21-80a6660ef4a9, oem-catalog row id=546a8e4e-44a0-4dc0-a4f0-4dee5e599d03)
-- -----------------------------------------------------------------------------
-- 1) Demote all approved rows for slug
UPDATE public.air_purifier_retailer_links SET is_primary = false WHERE air_purifier_filter_id = '98ccee9c-fe69-4359-bb21-80a6660ef4a9' AND status = 'approved';
-- 2) UPDATE existing approved oem-catalog slot in place (CSV PDP + browser_truth)
UPDATE public.air_purifier_retailer_links SET
  retailer_name = 'OEM / manufacturer catalog (keyword lookup)',
  affiliate_url = 'https://www.rabbitair.com/products/minusa2-charcoal-filter',
  destination_url = 'https://www.rabbitair.com/products/minusa2-charcoal-filter',
  retailer_slug = 'oem-catalog',
  retailer_key = 'oem-catalog',
  is_primary = true,
  status = 'approved',
  browser_truth_classification = 'direct_buyable',
  browser_truth_notes = $bt_notes$Official Rabbit Air MinusA2 Charcoal-Based Activated Carbon Filter, SKU A2-AC, in-stock + Add-to-Cart verified 2026-06-19, fits MinusA2 SPA-700A/780A/780N, NOT A3$bt_notes$,
  browser_truth_checked_at = '2026-06-19T00:00:00.000Z'::timestamptz
WHERE id = '546a8e4e-44a0-4dc0-a4f0-4dee5e599d03'
  AND air_purifier_filter_id = '98ccee9c-fe69-4359-bb21-80a6660ef4a9'
  AND retailer_key = 'oem-catalog'
  AND status = 'approved';

-- -----------------------------------------------------------------------------
-- vornado-carbon-pad (filter_id=fd365aff-3e34-4291-b738-3b7ee956750b, oem-catalog row id=1c96df93-676b-4ddc-a24c-3ad22f52a56d)
-- -----------------------------------------------------------------------------
-- 1) Demote all approved rows for slug
UPDATE public.air_purifier_retailer_links SET is_primary = false WHERE air_purifier_filter_id = 'fd365aff-3e34-4291-b738-3b7ee956750b' AND status = 'approved';
-- 2) UPDATE existing approved oem-catalog slot in place (CSV PDP + browser_truth)
UPDATE public.air_purifier_retailer_links SET
  retailer_name = 'OEM / manufacturer catalog (keyword lookup)',
  affiliate_url = 'https://vornado.com/products/md1-0023-activated-carbon-filter-2-pack-1',
  destination_url = 'https://vornado.com/products/md1-0023-activated-carbon-filter-2-pack-1',
  retailer_slug = 'oem-catalog',
  retailer_key = 'oem-catalog',
  is_primary = true,
  status = 'approved',
  browser_truth_classification = 'direct_buyable',
  browser_truth_notes = $bt_notes$Official Vornado MD1-0023 Activated Carbon Filter (2-Pack) $16.99; Add to Cart active 2026-06-21; AC300/AC350/AC500/AC550 only — NOT PCO MD1-0027; AC500B/AC550W unverified on official source.$bt_notes$,
  browser_truth_checked_at = '2026-06-21T22:40:00.000Z'::timestamptz
WHERE id = '1c96df93-676b-4ddc-a24c-3ad22f52a56d'
  AND air_purifier_filter_id = 'fd365aff-3e34-4291-b738-3b7ee956750b'
  AND retailer_key = 'oem-catalog'
  AND status = 'approved';

-- =============================================================================
-- POST-CHANGE VERIFICATION (review before COMMIT)
-- =============================================================================

-- Verify blueair-f2-211
SELECT f.slug, l.id, l.retailer_key, l.affiliate_url, l.is_primary, l.browser_truth_classification, l.browser_truth_checked_at, left(l.browser_truth_notes, 100) AS notes_prefix
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'blueair-f2-211' AND l.status = 'approved'
ORDER BY l.is_primary DESC, l.retailer_key;
SELECT f.slug,
       count(*) FILTER (WHERE l.retailer_key = 'oem-catalog') AS oem_catalog_approved_count,
       count(*) FILTER (WHERE l.is_primary) AS primary_count,
       count(*) FILTER (WHERE l.browser_truth_classification = 'direct_buyable') AS direct_buyable_count
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'blueair-f2-211' AND l.status = 'approved'
GROUP BY f.slug;

-- Verify blueair-particle-411
SELECT f.slug, l.id, l.retailer_key, l.affiliate_url, l.is_primary, l.browser_truth_classification, l.browser_truth_checked_at, left(l.browser_truth_notes, 100) AS notes_prefix
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'blueair-particle-411' AND l.status = 'approved'
ORDER BY l.is_primary DESC, l.retailer_key;
SELECT f.slug,
       count(*) FILTER (WHERE l.retailer_key = 'oem-catalog') AS oem_catalog_approved_count,
       count(*) FILTER (WHERE l.is_primary) AS primary_count,
       count(*) FILTER (WHERE l.browser_truth_classification = 'direct_buyable') AS direct_buyable_count
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'blueair-particle-411' AND l.status = 'approved'
GROUP BY f.slug;

-- Verify coway-airmega250-rf
SELECT f.slug, l.id, l.retailer_key, l.affiliate_url, l.is_primary, l.browser_truth_classification, l.browser_truth_checked_at, left(l.browser_truth_notes, 100) AS notes_prefix
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'coway-airmega250-rf' AND l.status = 'approved'
ORDER BY l.is_primary DESC, l.retailer_key;
SELECT f.slug,
       count(*) FILTER (WHERE l.retailer_key = 'oem-catalog') AS oem_catalog_approved_count,
       count(*) FILTER (WHERE l.is_primary) AS primary_count,
       count(*) FILTER (WHERE l.browser_truth_classification = 'direct_buyable') AS direct_buyable_count
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'coway-airmega250-rf' AND l.status = 'approved'
GROUP BY f.slug;

-- Verify coway-airmega400-rf
SELECT f.slug, l.id, l.retailer_key, l.affiliate_url, l.is_primary, l.browser_truth_classification, l.browser_truth_checked_at, left(l.browser_truth_notes, 100) AS notes_prefix
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'coway-airmega400-rf' AND l.status = 'approved'
ORDER BY l.is_primary DESC, l.retailer_key;
SELECT f.slug,
       count(*) FILTER (WHERE l.retailer_key = 'oem-catalog') AS oem_catalog_approved_count,
       count(*) FILTER (WHERE l.is_primary) AS primary_count,
       count(*) FILTER (WHERE l.browser_truth_classification = 'direct_buyable') AS direct_buyable_count
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'coway-airmega400-rf' AND l.status = 'approved'
GROUP BY f.slug;

-- Verify gg-flt4100
SELECT f.slug, l.id, l.retailer_key, l.affiliate_url, l.is_primary, l.browser_truth_classification, l.browser_truth_checked_at, left(l.browser_truth_notes, 100) AS notes_prefix
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'gg-flt4100' AND l.status = 'approved'
ORDER BY l.is_primary DESC, l.retailer_key;
SELECT f.slug,
       count(*) FILTER (WHERE l.retailer_key = 'oem-catalog') AS oem_catalog_approved_count,
       count(*) FILTER (WHERE l.is_primary) AS primary_count,
       count(*) FILTER (WHERE l.browser_truth_classification = 'direct_buyable') AS direct_buyable_count
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'gg-flt4100' AND l.status = 'approved'
GROUP BY f.slug;

-- Verify gg-flt4825
SELECT f.slug, l.id, l.retailer_key, l.affiliate_url, l.is_primary, l.browser_truth_classification, l.browser_truth_checked_at, left(l.browser_truth_notes, 100) AS notes_prefix
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'gg-flt4825' AND l.status = 'approved'
ORDER BY l.is_primary DESC, l.retailer_key;
SELECT f.slug,
       count(*) FILTER (WHERE l.retailer_key = 'oem-catalog') AS oem_catalog_approved_count,
       count(*) FILTER (WHERE l.is_primary) AS primary_count,
       count(*) FILTER (WHERE l.browser_truth_classification = 'direct_buyable') AS direct_buyable_count
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'gg-flt4825' AND l.status = 'approved'
GROUP BY f.slug;

-- Verify hb-trueair-04384
SELECT f.slug, l.id, l.retailer_key, l.affiliate_url, l.is_primary, l.browser_truth_classification, l.browser_truth_checked_at, left(l.browser_truth_notes, 100) AS notes_prefix
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'hb-trueair-04384' AND l.status = 'approved'
ORDER BY l.is_primary DESC, l.retailer_key;
SELECT f.slug,
       count(*) FILTER (WHERE l.retailer_key = 'oem-catalog') AS oem_catalog_approved_count,
       count(*) FILTER (WHERE l.is_primary) AS primary_count,
       count(*) FILTER (WHERE l.browser_truth_classification = 'direct_buyable') AS direct_buyable_count
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'hb-trueair-04384' AND l.status = 'approved'
GROUP BY f.slug;

-- Verify rabbit-carbon-minusa2
SELECT f.slug, l.id, l.retailer_key, l.affiliate_url, l.is_primary, l.browser_truth_classification, l.browser_truth_checked_at, left(l.browser_truth_notes, 100) AS notes_prefix
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'rabbit-carbon-minusa2' AND l.status = 'approved'
ORDER BY l.is_primary DESC, l.retailer_key;
SELECT f.slug,
       count(*) FILTER (WHERE l.retailer_key = 'oem-catalog') AS oem_catalog_approved_count,
       count(*) FILTER (WHERE l.is_primary) AS primary_count,
       count(*) FILTER (WHERE l.browser_truth_classification = 'direct_buyable') AS direct_buyable_count
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'rabbit-carbon-minusa2' AND l.status = 'approved'
GROUP BY f.slug;

-- Verify vornado-carbon-pad
SELECT f.slug, l.id, l.retailer_key, l.affiliate_url, l.is_primary, l.browser_truth_classification, l.browser_truth_checked_at, left(l.browser_truth_notes, 100) AS notes_prefix
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'vornado-carbon-pad' AND l.status = 'approved'
ORDER BY l.is_primary DESC, l.retailer_key;
SELECT f.slug,
       count(*) FILTER (WHERE l.retailer_key = 'oem-catalog') AS oem_catalog_approved_count,
       count(*) FILTER (WHERE l.is_primary) AS primary_count,
       count(*) FILTER (WHERE l.browser_truth_classification = 'direct_buyable') AS direct_buyable_count
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE lower(f.slug) = 'vornado-carbon-pad' AND l.status = 'approved'
GROUP BY f.slug;

-- Global: no duplicate approved (filter_id, retailer_key) slots across packet scope
SELECT l.air_purifier_filter_id, f.slug, l.retailer_key, count(*) AS approved_slot_count
FROM public.air_purifier_retailer_links l
JOIN public.air_purifier_filters f ON f.id = l.air_purifier_filter_id
WHERE l.air_purifier_filter_id IN (
  'c06ecca3-f7eb-4228-bd97-8c9c02b31f1e',
  'b096c446-0a8e-4e30-8c04-fcf99f125866',
  '09db87a2-057c-44ee-b2c9-7d50a86e0208',
  '13fc174a-aa3a-4dc3-af0d-a27e22d0b691',
  '8ceb861d-83f5-4aca-896d-3f3666e0dfaf',
  '70be653e-74d0-4cf8-9902-c74dc44cabac',
  '4004a082-7889-49b2-9877-8a2aa4d1d59b',
  '98ccee9c-fe69-4359-bb21-80a6660ef4a9',
  'fd365aff-3e34-4291-b738-3b7ee956750b'
)
  AND l.status = 'approved'
GROUP BY l.air_purifier_filter_id, f.slug, l.retailer_key
HAVING count(*) > 1;
-- expect 0 rows

ROLLBACK;
-- COMMIT;
