-- Optional sample rows (edit before running). Requires schema.sql applied.

insert into public.brands (slug, name)
values ('northstar-cooling', 'Northstar Cooling')
on conflict (slug) do update set name = excluded.name;

insert into public.filters (brand_id, slug, oem_part_number, name, replacement_interval_months, notes)
select id, 'northstar-ns-1', 'NS1-FILTER', 'Northstar primary cartridge', 6,
  'Sample row for local SQL seed only.'
from public.brands where slug = 'northstar-cooling';

insert into public.fridge_models (brand_id, slug, model_number, replacement_interval_months, notes)
select id, 'northstar-rs-50', 'RS-50', 6,
  'Sample model for local SQL seed only.'
from public.brands where slug = 'northstar-cooling';

insert into public.compatibility_mappings (fridge_model_id, filter_id)
select fm.id, f.id
from public.fridge_models fm
join public.filters f on f.slug = 'northstar-ns-1'
where fm.slug = 'northstar-rs-50';

-- No sample retailer_links: launch inventory omits web-search placeholders; add real URLs separately.

insert into public.reset_instructions (brand_id, title, body)
select id, 'Dispenser reset',
  E'1) Press and hold the WATER pad for 3 seconds.\n2) Release when the indicator turns blue.'
from public.brands where slug = 'northstar-cooling';

insert into public.help_pages (slug, title, body, meta_description)
values (
  'how-often-replace',
  'How often should I replace my refrigerator water filter?',
  'Most manufacturers recommend every 6 months or when flow slows. Follow your model''s interval if it differs.',
  'General guidance on refrigerator filter replacement timing.'
)
on conflict (slug) do nothing;
