-- =============================================================================
-- INSERT PLAN — MANUAL ONLY — DO NOT RUN FROM AUTOMATION
-- Token: LT800P | Slug: lt800p
-- Filter ID (PROVEN repo evidence 2026-05-18): 0b0c1bb2-ac28-4d8e-ac91-01b5a6be2539
-- Evidence: data/evidence/waterdrop-lt800p-owner-browser-proof.2026-05-18.json
-- Owner manual insert approved: 2026-05-21 (owner_manual_insert_approved true; mutation_ready false)
-- =============================================================================
-- *** EXECUTED MANUALLY 2026-05-21 — DO NOT RE-RUN INSERT UNLESS PRECHECKS SHOW ROW ABSENT ***
-- Inserted row id: 8fb8189c-6c29-46c9-ae95-d3e26be05add
-- Postcheck: production /filter/lt800p renders Waterdrop + /go/8fb8189c-6c29-46c9-ae95-d3e26be05add (HTTP/2 200).
-- Postcheck: /go/8fb8189c-6c29-46c9-ae95-d3e26be05add → HTTP/2 302 LinkSynergy LT800P affiliate URL.
-- Re-run Precheck D/E only; if waterdrop_row_count > 0, skip INSERT below (duplicate would violate unique index).
-- Does NOT expand WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 in repo; separate allowlist commit for ranking.
-- Does NOT modify amazon row 6bbf8586-a87e-46de-932c-2bc341587619 or oem-parts-catalog rows.
-- affiliate_url MUST be the LinkSynergy click URL (not the image pixel URL).
-- =============================================================================
-- Schema defaults (PROVEN read-only DA29 precheck 2026-05-20; apply to lt800p session):
--   id default gen_random_uuid(); created_at default now(); is_primary default false;
--   status default 'approved'; source default 'manual'; no updated_at column.
-- Unique index: retailer_links_filter_retailer_key_unique on (filter_id, retailer_key).
-- =============================================================================

-- Precheck A: filter row
select id, slug, oem_part_number, name
from public.filters
where slug = 'lt800p';
-- Expected: id = 0b0c1bb2-ac28-4d8e-ac91-01b5a6be2539

-- Precheck B: existing retailer_links for filter
select id, retailer_key, status, is_primary, destination_url, browser_truth_classification, browser_truth_buyable_subtype
from public.retailer_links
where filter_id = '0b0c1bb2-ac28-4d8e-ac91-01b5a6be2539'
order by retailer_key;

-- Precheck C: must return exactly 1 row
select id as filter_id, slug, oem_part_number
from public.filters
where slug = 'lt800p';

-- Precheck D: MUST return 0 — run immediately before INSERT in same session
select count(*) as approved_waterdrop_count
from public.retailer_links
where filter_id = '0b0c1bb2-ac28-4d8e-ac91-01b5a6be2539'
  and retailer_key = 'waterdrop'
  and status = 'approved';

-- Precheck E: MUST return 0 — run immediately before INSERT in same session
select count(*) as waterdrop_row_count
from public.retailer_links
where filter_id = '0b0c1bb2-ac28-4d8e-ac91-01b5a6be2539'
  and retailer_key = 'waterdrop';

-- ---------------------------------------------------------------------------
-- Guarded INSERT — one row (manual operator session only; EXECUTED 2026-05-21)
-- ---------------------------------------------------------------------------
begin;

insert into public.retailer_links (
  filter_id,
  retailer_name,
  retailer_slug,
  retailer_key,
  destination_url,
  affiliate_url,
  is_primary,
  status,
  source,
  browser_truth_classification,
  browser_truth_buyable_subtype,
  browser_truth_notes,
  browser_truth_checked_at
) values (
  '0b0c1bb2-ac28-4d8e-ac91-01b5a6be2539',
  'Waterdrop Filter',
  'waterdrop',
  'waterdrop',
  'https://www.waterdropfilter.com/products/lg-lt800p-water-filter-replacement-by-waterdrop?variant=39389060792402',
  'https://click.linksynergy.com/link?id=GTFBcFcCW48&offerid=1888875.539507420827021633352815&type=15&murl=https%3A%2F%2Fwww.waterdropfilter.com%2Fproducts%2Flg-lt800p-water-filter-replacement-by-waterdrop%3Fvariant%3D39389060792402',
  false,
  'approved',
  'manual',
  'direct_buyable',
  'COMPATIBLE_REPLACEMENT_DIRECT_BUYABLE',
  'Aftermarket Waterdrop compatible replacement for LG LT800P / ADQ73613401; not LG OEM. Evidence waterdrop-lt800p-owner-browser-proof.2026-05-18.json; owner-browser $11.99 Add to Cart and Buy Now.',
  '2026-05-18T12:00:00.000Z'
);

commit;
-- Note: omit id and created_at to use defaults gen_random_uuid() and now().

-- Postcheck: exactly one approved waterdrop row for filter
select id, retailer_key, status, is_primary, affiliate_url, browser_truth_classification, browser_truth_buyable_subtype, browser_truth_checked_at
from public.retailer_links
where filter_id = '0b0c1bb2-ac28-4d8e-ac91-01b5a6be2539'
  and retailer_key = 'waterdrop'
  and status = 'approved';
