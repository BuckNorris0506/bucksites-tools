-- Remove demo placeholder brands from launch wedges (never shipped in data/air-purifier or
-- data/whole-house-water CSV packs). FK ON DELETE CASCADE cleans dependent rows:
-- air_purifier_models/filters/aliases/compatibility/retailer_links and whole_house_water_*.

delete from public.brands
where slug in ('purebrand', 'poewat');
