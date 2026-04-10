-- Appliance air filters (range/ fridge vent OEM parts) + whole-house water filter cartridges.
-- Parallel to air_purifier / vacuum / humidifier. SKU tables: *_parts (filters_or_parts).

-- ---------------------------------------------------------------------------
-- Appliance air
-- ---------------------------------------------------------------------------
create table if not exists public.appliance_air_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null unique,
  model_number text not null unique,
  title text not null,
  series text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.appliance_air_model_aliases (
  id uuid primary key default gen_random_uuid(),
  appliance_air_model_id uuid not null references public.appliance_air_models (id) on delete cascade,
  alias text not null
);

create unique index if not exists appliance_air_model_aliases_model_alias_unique
  on public.appliance_air_model_aliases (appliance_air_model_id, alias);

create index if not exists idx_appliance_air_model_aliases_model
  on public.appliance_air_model_aliases (appliance_air_model_id);
create index if not exists idx_appliance_air_model_aliases_alias
  on public.appliance_air_model_aliases (alias);

create table if not exists public.appliance_air_parts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null unique,
  oem_part_number text not null unique,
  name text,
  replacement_interval_months integer,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_appliance_air_parts_brand on public.appliance_air_parts (brand_id);

create table if not exists public.appliance_air_part_aliases (
  id uuid primary key default gen_random_uuid(),
  appliance_air_part_id uuid not null references public.appliance_air_parts (id) on delete cascade,
  alias text not null
);

create unique index if not exists appliance_air_part_aliases_part_alias_unique
  on public.appliance_air_part_aliases (appliance_air_part_id, alias);

create index if not exists idx_appliance_air_part_aliases_part
  on public.appliance_air_part_aliases (appliance_air_part_id);
create index if not exists idx_appliance_air_part_aliases_alias
  on public.appliance_air_part_aliases (alias);

create table if not exists public.appliance_air_compatibility_mappings (
  appliance_air_model_id uuid not null references public.appliance_air_models (id) on delete cascade,
  appliance_air_part_id uuid not null references public.appliance_air_parts (id) on delete cascade,
  primary key (appliance_air_model_id, appliance_air_part_id)
);

create index if not exists idx_appliance_air_compat_part
  on public.appliance_air_compatibility_mappings (appliance_air_part_id);

create table if not exists public.appliance_air_retailer_links (
  id uuid primary key default gen_random_uuid(),
  appliance_air_part_id uuid not null references public.appliance_air_parts (id) on delete cascade,
  retailer_name text,
  affiliate_url text not null,
  destination_url text not null,
  retailer_slug text not null,
  retailer_key text not null,
  is_primary boolean not null default false,
  status text not null default 'approved',
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public' and t.relname = 'appliance_air_retailer_links'
      and c.conname = 'appliance_air_retailer_links_status_check'
  ) then
    alter table public.appliance_air_retailer_links
      add constraint appliance_air_retailer_links_status_check
      check (status in ('candidate', 'approved', 'rejected', 'archived'));
  end if;
end $$;

create unique index if not exists appliance_air_retailer_links_one_approved_per_slot
  on public.appliance_air_retailer_links (appliance_air_part_id, retailer_key)
  where (status = 'approved');

create index if not exists idx_appliance_air_retailer_links_part
  on public.appliance_air_retailer_links (appliance_air_part_id);

-- ---------------------------------------------------------------------------
-- Whole-house water
-- ---------------------------------------------------------------------------
create table if not exists public.whole_house_water_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null unique,
  model_number text not null unique,
  title text not null,
  series text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.whole_house_water_model_aliases (
  id uuid primary key default gen_random_uuid(),
  whole_house_water_model_id uuid not null references public.whole_house_water_models (id) on delete cascade,
  alias text not null
);

create unique index if not exists whole_house_water_model_aliases_model_alias_unique
  on public.whole_house_water_model_aliases (whole_house_water_model_id, alias);

create index if not exists idx_whole_house_water_model_aliases_model
  on public.whole_house_water_model_aliases (whole_house_water_model_id);
create index if not exists idx_whole_house_water_model_aliases_alias
  on public.whole_house_water_model_aliases (alias);

create table if not exists public.whole_house_water_parts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null unique,
  oem_part_number text not null unique,
  name text,
  replacement_interval_months integer,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_whole_house_water_parts_brand on public.whole_house_water_parts (brand_id);

create table if not exists public.whole_house_water_part_aliases (
  id uuid primary key default gen_random_uuid(),
  whole_house_water_part_id uuid not null references public.whole_house_water_parts (id) on delete cascade,
  alias text not null
);

create unique index if not exists whole_house_water_part_aliases_part_alias_unique
  on public.whole_house_water_part_aliases (whole_house_water_part_id, alias);

create index if not exists idx_whole_house_water_part_aliases_part
  on public.whole_house_water_part_aliases (whole_house_water_part_id);
create index if not exists idx_whole_house_water_part_aliases_alias
  on public.whole_house_water_part_aliases (alias);

create table if not exists public.whole_house_water_compatibility_mappings (
  whole_house_water_model_id uuid not null references public.whole_house_water_models (id) on delete cascade,
  whole_house_water_part_id uuid not null references public.whole_house_water_parts (id) on delete cascade,
  primary key (whole_house_water_model_id, whole_house_water_part_id)
);

create index if not exists idx_whole_house_water_compat_part
  on public.whole_house_water_compatibility_mappings (whole_house_water_part_id);

create table if not exists public.whole_house_water_retailer_links (
  id uuid primary key default gen_random_uuid(),
  whole_house_water_part_id uuid not null references public.whole_house_water_parts (id) on delete cascade,
  retailer_name text,
  affiliate_url text not null,
  destination_url text not null,
  retailer_slug text not null,
  retailer_key text not null,
  is_primary boolean not null default false,
  status text not null default 'approved',
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public' and t.relname = 'whole_house_water_retailer_links'
      and c.conname = 'whole_house_water_retailer_links_status_check'
  ) then
    alter table public.whole_house_water_retailer_links
      add constraint whole_house_water_retailer_links_status_check
      check (status in ('candidate', 'approved', 'rejected', 'archived'));
  end if;
end $$;

create unique index if not exists whole_house_water_retailer_links_one_approved_per_slot
  on public.whole_house_water_retailer_links (whole_house_water_part_id, retailer_key)
  where (status = 'approved');

create index if not exists idx_whole_house_water_retailer_links_part
  on public.whole_house_water_retailer_links (whole_house_water_part_id);

-- Norm columns
do $$ begin
  alter table public.appliance_air_models
    add column model_number_norm text generated always as (public.norm_compact(model_number)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.appliance_air_model_aliases
    add column alias_norm text generated always as (public.norm_compact(alias)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.appliance_air_parts
    add column oem_part_number_norm text generated always as (public.norm_compact(oem_part_number)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.appliance_air_part_aliases
    add column alias_norm text generated always as (public.norm_compact(alias)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.whole_house_water_models
    add column model_number_norm text generated always as (public.norm_compact(model_number)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.whole_house_water_model_aliases
    add column alias_norm text generated always as (public.norm_compact(alias)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.whole_house_water_parts
    add column oem_part_number_norm text generated always as (public.norm_compact(oem_part_number)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.whole_house_water_part_aliases
    add column alias_norm text generated always as (public.norm_compact(alias)) stored;
exception when duplicate_column then null; end $$;

create index if not exists idx_appliance_air_models_model_norm on public.appliance_air_models (model_number_norm);
create index if not exists idx_appliance_air_model_aliases_alias_norm on public.appliance_air_model_aliases (alias_norm);
create index if not exists idx_appliance_air_parts_oem_norm on public.appliance_air_parts (oem_part_number_norm);
create index if not exists idx_appliance_air_part_aliases_alias_norm on public.appliance_air_part_aliases (alias_norm);

create index if not exists idx_whole_house_water_models_model_norm on public.whole_house_water_models (model_number_norm);
create index if not exists idx_whole_house_water_model_aliases_alias_norm on public.whole_house_water_model_aliases (alias_norm);
create index if not exists idx_whole_house_water_parts_oem_norm on public.whole_house_water_parts (oem_part_number_norm);
create index if not exists idx_whole_house_water_part_aliases_alias_norm on public.whole_house_water_part_aliases (alias_norm);

-- Search RPCs
create or replace function public.search_appliance_air_models_flexible(q text, limit_count int)
returns table (slug text, model_number text, brand_name text, brand_slug text)
language sql stable set search_path = public as $$
  select distinct on (fm.slug)
    fm.slug, fm.model_number, b.name, b.slug
  from public.appliance_air_models fm
  inner join public.brands b on b.id = fm.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      fm.model_number ilike '%' || r.raw || '%'
      or fm.model_number_norm like '%' || c.n || '%'
      or (length(fm.model_number_norm) >= 3 and c.n like '%' || fm.model_number_norm || '%')
    )
  order by fm.slug, fm.model_number
  limit limit_count;
$$;

create or replace function public.search_appliance_air_model_aliases_flexible(q text, limit_count int)
returns table (slug text, model_number text, brand_name text, brand_slug text, matched_alias text)
language sql stable set search_path = public as $$
  select distinct on (fm.slug)
    fm.slug, fm.model_number, b.name, b.slug, a.alias
  from public.appliance_air_model_aliases a
  inner join public.appliance_air_models fm on fm.id = a.appliance_air_model_id
  inner join public.brands b on b.id = fm.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      a.alias ilike '%' || r.raw || '%'
      or a.alias_norm like '%' || c.n || '%'
      or (length(a.alias_norm) >= 2 and c.n like '%' || a.alias_norm || '%')
    )
  order by fm.slug, a.alias
  limit limit_count;
$$;

create or replace function public.search_appliance_air_parts_flexible(q text, limit_count int)
returns table (slug text, oem_part_number text, filter_name text, brand_name text, brand_slug text)
language sql stable set search_path = public as $$
  select distinct on (p.slug)
    p.slug, p.oem_part_number, p.name, b.name, b.slug
  from public.appliance_air_parts p
  inner join public.brands b on b.id = p.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      p.oem_part_number ilike '%' || r.raw || '%'
      or p.oem_part_number_norm like '%' || c.n || '%'
      or (length(p.oem_part_number_norm) >= 2 and c.n like '%' || p.oem_part_number_norm || '%')
    )
  order by p.slug, p.oem_part_number
  limit limit_count;
$$;

create or replace function public.search_appliance_air_part_aliases_flexible(q text, limit_count int)
returns table (slug text, oem_part_number text, filter_name text, brand_name text, brand_slug text, matched_alias text)
language sql stable set search_path = public as $$
  select distinct on (p.slug)
    p.slug, p.oem_part_number, p.name, b.name, b.slug, a.alias
  from public.appliance_air_part_aliases a
  inner join public.appliance_air_parts p on p.id = a.appliance_air_part_id
  inner join public.brands b on b.id = p.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      a.alias ilike '%' || r.raw || '%'
      or a.alias_norm like '%' || c.n || '%'
      or (length(a.alias_norm) >= 2 and c.n like '%' || a.alias_norm || '%')
    )
  order by p.slug, a.alias
  limit limit_count;
$$;

create or replace function public.search_whole_house_water_models_flexible(q text, limit_count int)
returns table (slug text, model_number text, brand_name text, brand_slug text)
language sql stable set search_path = public as $$
  select distinct on (fm.slug)
    fm.slug, fm.model_number, b.name, b.slug
  from public.whole_house_water_models fm
  inner join public.brands b on b.id = fm.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      fm.model_number ilike '%' || r.raw || '%'
      or fm.model_number_norm like '%' || c.n || '%'
      or (length(fm.model_number_norm) >= 3 and c.n like '%' || fm.model_number_norm || '%')
    )
  order by fm.slug, fm.model_number
  limit limit_count;
$$;

create or replace function public.search_whole_house_water_model_aliases_flexible(q text, limit_count int)
returns table (slug text, model_number text, brand_name text, brand_slug text, matched_alias text)
language sql stable set search_path = public as $$
  select distinct on (fm.slug)
    fm.slug, fm.model_number, b.name, b.slug, a.alias
  from public.whole_house_water_model_aliases a
  inner join public.whole_house_water_models fm on fm.id = a.whole_house_water_model_id
  inner join public.brands b on b.id = fm.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      a.alias ilike '%' || r.raw || '%'
      or a.alias_norm like '%' || c.n || '%'
      or (length(a.alias_norm) >= 2 and c.n like '%' || a.alias_norm || '%')
    )
  order by fm.slug, a.alias
  limit limit_count;
$$;

create or replace function public.search_whole_house_water_parts_flexible(q text, limit_count int)
returns table (slug text, oem_part_number text, filter_name text, brand_name text, brand_slug text)
language sql stable set search_path = public as $$
  select distinct on (p.slug)
    p.slug, p.oem_part_number, p.name, b.name, b.slug
  from public.whole_house_water_parts p
  inner join public.brands b on b.id = p.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      p.oem_part_number ilike '%' || r.raw || '%'
      or p.oem_part_number_norm like '%' || c.n || '%'
      or (length(p.oem_part_number_norm) >= 2 and c.n like '%' || p.oem_part_number_norm || '%')
    )
  order by p.slug, p.oem_part_number
  limit limit_count;
$$;

create or replace function public.search_whole_house_water_part_aliases_flexible(q text, limit_count int)
returns table (slug text, oem_part_number text, filter_name text, brand_name text, brand_slug text, matched_alias text)
language sql stable set search_path = public as $$
  select distinct on (p.slug)
    p.slug, p.oem_part_number, p.name, b.name, b.slug, a.alias
  from public.whole_house_water_part_aliases a
  inner join public.whole_house_water_parts p on p.id = a.whole_house_water_part_id
  inner join public.brands b on b.id = p.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      a.alias ilike '%' || r.raw || '%'
      or a.alias_norm like '%' || c.n || '%'
      or (length(a.alias_norm) >= 2 and c.n like '%' || a.alias_norm || '%')
    )
  order by p.slug, a.alias
  limit limit_count;
$$;

grant execute on function public.search_appliance_air_models_flexible(text, int) to anon;
grant execute on function public.search_appliance_air_model_aliases_flexible(text, int) to anon;
grant execute on function public.search_appliance_air_parts_flexible(text, int) to anon;
grant execute on function public.search_appliance_air_part_aliases_flexible(text, int) to anon;

grant execute on function public.search_whole_house_water_models_flexible(text, int) to anon;
grant execute on function public.search_whole_house_water_model_aliases_flexible(text, int) to anon;
grant execute on function public.search_whole_house_water_parts_flexible(text, int) to anon;
grant execute on function public.search_whole_house_water_part_aliases_flexible(text, int) to anon;

alter table public.click_events
  add column if not exists appliance_air_retailer_link_id uuid
    references public.appliance_air_retailer_links (id) on delete set null;

alter table public.click_events
  add column if not exists whole_house_water_retailer_link_id uuid
    references public.whole_house_water_retailer_links (id) on delete set null;

-- RLS
alter table public.appliance_air_models enable row level security;
alter table public.appliance_air_model_aliases enable row level security;
alter table public.appliance_air_parts enable row level security;
alter table public.appliance_air_part_aliases enable row level security;
alter table public.appliance_air_compatibility_mappings enable row level security;
alter table public.appliance_air_retailer_links enable row level security;

alter table public.whole_house_water_models enable row level security;
alter table public.whole_house_water_model_aliases enable row level security;
alter table public.whole_house_water_parts enable row level security;
alter table public.whole_house_water_part_aliases enable row level security;
alter table public.whole_house_water_compatibility_mappings enable row level security;
alter table public.whole_house_water_retailer_links enable row level security;

create policy "Public read appliance_air_models"
  on public.appliance_air_models for select to anon using (true);
create policy "Public read appliance_air_model_aliases"
  on public.appliance_air_model_aliases for select to anon using (true);
create policy "Public read appliance_air_parts"
  on public.appliance_air_parts for select to anon using (true);
create policy "Public read appliance_air_part_aliases"
  on public.appliance_air_part_aliases for select to anon using (true);
create policy "Public read appliance_air_compatibility_mappings"
  on public.appliance_air_compatibility_mappings for select to anon using (true);
create policy "Public read appliance_air_retailer_links"
  on public.appliance_air_retailer_links for select to anon using (status = 'approved');

create policy "Public read whole_house_water_models"
  on public.whole_house_water_models for select to anon using (true);
create policy "Public read whole_house_water_model_aliases"
  on public.whole_house_water_model_aliases for select to anon using (true);
create policy "Public read whole_house_water_parts"
  on public.whole_house_water_parts for select to anon using (true);
create policy "Public read whole_house_water_part_aliases"
  on public.whole_house_water_part_aliases for select to anon using (true);
create policy "Public read whole_house_water_compatibility_mappings"
  on public.whole_house_water_compatibility_mappings for select to anon using (true);
create policy "Public read whole_house_water_retailer_links"
  on public.whole_house_water_retailer_links for select to anon using (status = 'approved');
