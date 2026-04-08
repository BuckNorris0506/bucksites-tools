-- Optional demo rows (edit before running). Requires schema.sql applied.

insert into public.brands (slug, name)
values ('acme-appliances', 'Acme Appliances')
on conflict (slug) do update set name = excluded.name;

insert into public.filters (brand_id, slug, oem_part_number, name, replacement_interval_months, notes)
select id, 'acme-filter-100', 'ACME-100', 'OEM inline filter', 6,
  'Twist-in refrigerator filter cartridge.'
from public.brands where slug = 'acme-appliances';

insert into public.fridge_models (brand_id, slug, model_number, replacement_interval_months, notes)
select id, 'acme-xf-9000', 'XF-9000', 6,
  'Dispenser on freezer door. Reset light after installs.'
from public.brands where slug = 'acme-appliances';

insert into public.compatibility_mappings (fridge_model_id, filter_id)
select fm.id, f.id
from public.fridge_models fm
join public.filters f on f.slug = 'acme-filter-100'
where fm.slug = 'acme-xf-9000';

insert into public.retailer_links (filter_id, retailer_name, affiliate_url, sort_order)
select f.id, 'Example Retailer', 'https://example.com/buy/acme-100', 0
from public.filters f where slug = 'acme-filter-100';

insert into public.reset_instructions (brand_id, title, body)
select id, 'Dispenser reset',
  E'1) Press and hold the WATER pad for 3 seconds.\n2) Release when the indicator turns blue.'
from public.brands where slug = 'acme-appliances';

insert into public.help_pages (slug, title, body, meta_description)
values (
  'how-often-replace',
  'How often should I replace my refrigerator water filter?',
  'Most manufacturers recommend every 6 months or when flow slows. Follow your model''s interval if it differs.',
  'General guidance on refrigerator filter replacement timing.'
)
on conflict (slug) do nothing;
