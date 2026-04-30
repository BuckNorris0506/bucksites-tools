-- Add optional buyable subtype support across all live retailer-link tables.
-- Idempotent and non-destructive: only adds nullable column, no backfill.

ALTER TABLE public.retailer_links
ADD COLUMN IF NOT EXISTS browser_truth_buyable_subtype text;

ALTER TABLE public.air_purifier_retailer_links
ADD COLUMN IF NOT EXISTS browser_truth_buyable_subtype text;

ALTER TABLE public.whole_house_water_retailer_links
ADD COLUMN IF NOT EXISTS browser_truth_buyable_subtype text;

ALTER TABLE public.vacuum_retailer_links
ADD COLUMN IF NOT EXISTS browser_truth_buyable_subtype text;

ALTER TABLE public.humidifier_retailer_links
ADD COLUMN IF NOT EXISTS browser_truth_buyable_subtype text;

ALTER TABLE public.appliance_air_retailer_links
ADD COLUMN IF NOT EXISTS browser_truth_buyable_subtype text;
