-- Per-model-part compatibility: mark the editorial "best match" for UX ordering.
-- Default false: existing rows behave as before (tie-break on OEM part number).

alter table public.air_purifier_compatibility_mappings
  add column if not exists is_recommended boolean not null default false;

alter table public.vacuum_compatibility_mappings
  add column if not exists is_recommended boolean not null default false;

alter table public.humidifier_compatibility_mappings
  add column if not exists is_recommended boolean not null default false;

alter table public.appliance_air_compatibility_mappings
  add column if not exists is_recommended boolean not null default false;

alter table public.whole_house_water_compatibility_mappings
  add column if not exists is_recommended boolean not null default false;
