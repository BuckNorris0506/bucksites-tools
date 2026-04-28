-- Add browser-truth columns to all proven live retailer-link tables.
-- Idempotent and safe for repeated execution.

ALTER TABLE public.retailer_links
ADD COLUMN IF NOT EXISTS browser_truth_classification text,
ADD COLUMN IF NOT EXISTS browser_truth_notes text,
ADD COLUMN IF NOT EXISTS browser_truth_checked_at timestamptz;

ALTER TABLE public.air_purifier_retailer_links
ADD COLUMN IF NOT EXISTS browser_truth_classification text,
ADD COLUMN IF NOT EXISTS browser_truth_notes text,
ADD COLUMN IF NOT EXISTS browser_truth_checked_at timestamptz;

ALTER TABLE public.whole_house_water_retailer_links
ADD COLUMN IF NOT EXISTS browser_truth_classification text,
ADD COLUMN IF NOT EXISTS browser_truth_notes text,
ADD COLUMN IF NOT EXISTS browser_truth_checked_at timestamptz;

ALTER TABLE public.vacuum_retailer_links
ADD COLUMN IF NOT EXISTS browser_truth_classification text,
ADD COLUMN IF NOT EXISTS browser_truth_notes text,
ADD COLUMN IF NOT EXISTS browser_truth_checked_at timestamptz;

ALTER TABLE public.humidifier_retailer_links
ADD COLUMN IF NOT EXISTS browser_truth_classification text,
ADD COLUMN IF NOT EXISTS browser_truth_notes text,
ADD COLUMN IF NOT EXISTS browser_truth_checked_at timestamptz;

ALTER TABLE public.appliance_air_retailer_links
ADD COLUMN IF NOT EXISTS browser_truth_classification text,
ADD COLUMN IF NOT EXISTS browser_truth_notes text,
ADD COLUMN IF NOT EXISTS browser_truth_checked_at timestamptz;
