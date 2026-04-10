-- Parallel catalog verticals: air purifier, vacuum, and humidifier replacement filters.
-- Reuses public.brands. Does not modify fridge/water-filter tables.

-- ---------------------------------------------------------------------------
-- Air purifier
-- ---------------------------------------------------------------------------
create table if not exists public.air_purifier_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null unique,
  model_number text not null unique,
  title text not null,
  series text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.air_purifier_model_aliases (
  id uuid primary key default gen_random_uuid(),
  air_purifier_model_id uuid not null references public.air_purifier_models (id) on delete cascade,
  alias text not null
);

create unique index if not exists air_purifier_model_aliases_model_alias_unique
  on public.air_purifier_model_aliases (air_purifier_model_id, alias);

create index if not exists idx_air_purifier_model_aliases_model
  on public.air_purifier_model_aliases (air_purifier_model_id);
create index if not exists idx_air_purifier_model_aliases_alias
  on public.air_purifier_model_aliases (alias);

create table if not exists public.air_purifier_filters (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null unique,
  oem_part_number text not null unique,
  name text,
  replacement_interval_months integer,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_air_purifier_filters_brand on public.air_purifier_filters (brand_id);

create table if not exists public.air_purifier_filter_aliases (
  id uuid primary key default gen_random_uuid(),
  air_purifier_filter_id uuid not null references public.air_purifier_filters (id) on delete cascade,
  alias text not null
);

create unique index if not exists air_purifier_filter_aliases_filter_alias_unique
  on public.air_purifier_filter_aliases (air_purifier_filter_id, alias);

create index if not exists idx_air_purifier_filter_aliases_filter
  on public.air_purifier_filter_aliases (air_purifier_filter_id);
create index if not exists idx_air_purifier_filter_aliases_alias
  on public.air_purifier_filter_aliases (alias);

create table if not exists public.air_purifier_compatibility_mappings (
  air_purifier_model_id uuid not null references public.air_purifier_models (id) on delete cascade,
  air_purifier_filter_id uuid not null references public.air_purifier_filters (id) on delete cascade,
  primary key (air_purifier_model_id, air_purifier_filter_id)
);

create index if not exists idx_air_purifier_compat_filter
  on public.air_purifier_compatibility_mappings (air_purifier_filter_id);

create table if not exists public.air_purifier_retailer_links (
  id uuid primary key default gen_random_uuid(),
  air_purifier_filter_id uuid not null references public.air_purifier_filters (id) on delete cascade,
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
    where n.nspname = 'public' and t.relname = 'air_purifier_retailer_links'
      and c.conname = 'air_purifier_retailer_links_status_check'
  ) then
    alter table public.air_purifier_retailer_links
      add constraint air_purifier_retailer_links_status_check
      check (status in ('candidate', 'approved', 'rejected', 'archived'));
  end if;
end $$;

create unique index if not exists air_purifier_retailer_links_one_approved_per_slot
  on public.air_purifier_retailer_links (air_purifier_filter_id, retailer_key)
  where (status = 'approved');

create index if not exists idx_air_purifier_retailer_links_filter
  on public.air_purifier_retailer_links (air_purifier_filter_id);

-- ---------------------------------------------------------------------------
-- Vacuum
-- ---------------------------------------------------------------------------
create table if not exists public.vacuum_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null unique,
  model_number text not null unique,
  title text not null,
  series text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.vacuum_model_aliases (
  id uuid primary key default gen_random_uuid(),
  vacuum_model_id uuid not null references public.vacuum_models (id) on delete cascade,
  alias text not null
);

create unique index if not exists vacuum_model_aliases_model_alias_unique
  on public.vacuum_model_aliases (vacuum_model_id, alias);

create index if not exists idx_vacuum_model_aliases_model on public.vacuum_model_aliases (vacuum_model_id);
create index if not exists idx_vacuum_model_aliases_alias on public.vacuum_model_aliases (alias);

create table if not exists public.vacuum_filters (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null unique,
  oem_part_number text not null unique,
  name text,
  replacement_interval_months integer,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vacuum_filters_brand on public.vacuum_filters (brand_id);

create table if not exists public.vacuum_filter_aliases (
  id uuid primary key default gen_random_uuid(),
  vacuum_filter_id uuid not null references public.vacuum_filters (id) on delete cascade,
  alias text not null
);

create unique index if not exists vacuum_filter_aliases_filter_alias_unique
  on public.vacuum_filter_aliases (vacuum_filter_id, alias);

create index if not exists idx_vacuum_filter_aliases_filter on public.vacuum_filter_aliases (vacuum_filter_id);
create index if not exists idx_vacuum_filter_aliases_alias on public.vacuum_filter_aliases (alias);

create table if not exists public.vacuum_compatibility_mappings (
  vacuum_model_id uuid not null references public.vacuum_models (id) on delete cascade,
  vacuum_filter_id uuid not null references public.vacuum_filters (id) on delete cascade,
  primary key (vacuum_model_id, vacuum_filter_id)
);

create index if not exists idx_vacuum_compat_filter on public.vacuum_compatibility_mappings (vacuum_filter_id);

create table if not exists public.vacuum_retailer_links (
  id uuid primary key default gen_random_uuid(),
  vacuum_filter_id uuid not null references public.vacuum_filters (id) on delete cascade,
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
    where n.nspname = 'public' and t.relname = 'vacuum_retailer_links'
      and c.conname = 'vacuum_retailer_links_status_check'
  ) then
    alter table public.vacuum_retailer_links
      add constraint vacuum_retailer_links_status_check
      check (status in ('candidate', 'approved', 'rejected', 'archived'));
  end if;
end $$;

create unique index if not exists vacuum_retailer_links_one_approved_per_slot
  on public.vacuum_retailer_links (vacuum_filter_id, retailer_key)
  where (status = 'approved');

create index if not exists idx_vacuum_retailer_links_filter on public.vacuum_retailer_links (vacuum_filter_id);

-- ---------------------------------------------------------------------------
-- Humidifier
-- ---------------------------------------------------------------------------
create table if not exists public.humidifier_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null unique,
  model_number text not null unique,
  title text not null,
  series text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.humidifier_model_aliases (
  id uuid primary key default gen_random_uuid(),
  humidifier_model_id uuid not null references public.humidifier_models (id) on delete cascade,
  alias text not null
);

create unique index if not exists humidifier_model_aliases_model_alias_unique
  on public.humidifier_model_aliases (humidifier_model_id, alias);

create index if not exists idx_humidifier_model_aliases_model on public.humidifier_model_aliases (humidifier_model_id);
create index if not exists idx_humidifier_model_aliases_alias on public.humidifier_model_aliases (alias);

create table if not exists public.humidifier_filters (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null unique,
  oem_part_number text not null unique,
  name text,
  replacement_interval_months integer,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_humidifier_filters_brand on public.humidifier_filters (brand_id);

create table if not exists public.humidifier_filter_aliases (
  id uuid primary key default gen_random_uuid(),
  humidifier_filter_id uuid not null references public.humidifier_filters (id) on delete cascade,
  alias text not null
);

create unique index if not exists humidifier_filter_aliases_filter_alias_unique
  on public.humidifier_filter_aliases (humidifier_filter_id, alias);

create index if not exists idx_humidifier_filter_aliases_filter on public.humidifier_filter_aliases (humidifier_filter_id);
create index if not exists idx_humidifier_filter_aliases_alias on public.humidifier_filter_aliases (alias);

create table if not exists public.humidifier_compatibility_mappings (
  humidifier_model_id uuid not null references public.humidifier_models (id) on delete cascade,
  humidifier_filter_id uuid not null references public.humidifier_filters (id) on delete cascade,
  primary key (humidifier_model_id, humidifier_filter_id)
);

create index if not exists idx_humidifier_compat_filter on public.humidifier_compatibility_mappings (humidifier_filter_id);

create table if not exists public.humidifier_retailer_links (
  id uuid primary key default gen_random_uuid(),
  humidifier_filter_id uuid not null references public.humidifier_filters (id) on delete cascade,
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
    where n.nspname = 'public' and t.relname = 'humidifier_retailer_links'
      and c.conname = 'humidifier_retailer_links_status_check'
  ) then
    alter table public.humidifier_retailer_links
      add constraint humidifier_retailer_links_status_check
      check (status in ('candidate', 'approved', 'rejected', 'archived'));
  end if;
end $$;

create unique index if not exists humidifier_retailer_links_one_approved_per_slot
  on public.humidifier_retailer_links (humidifier_filter_id, retailer_key)
  where (status = 'approved');

create index if not exists idx_humidifier_retailer_links_filter on public.humidifier_retailer_links (humidifier_filter_id);

-- ---------------------------------------------------------------------------
-- Normalized search columns (reuse public.norm_compact)
-- ---------------------------------------------------------------------------
do $$ begin
  alter table public.air_purifier_models
    add column model_number_norm text generated always as (public.norm_compact(model_number)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.air_purifier_model_aliases
    add column alias_norm text generated always as (public.norm_compact(alias)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.air_purifier_filters
    add column oem_part_number_norm text generated always as (public.norm_compact(oem_part_number)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.air_purifier_filter_aliases
    add column alias_norm text generated always as (public.norm_compact(alias)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.vacuum_models
    add column model_number_norm text generated always as (public.norm_compact(model_number)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.vacuum_model_aliases
    add column alias_norm text generated always as (public.norm_compact(alias)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.vacuum_filters
    add column oem_part_number_norm text generated always as (public.norm_compact(oem_part_number)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.vacuum_filter_aliases
    add column alias_norm text generated always as (public.norm_compact(alias)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.humidifier_models
    add column model_number_norm text generated always as (public.norm_compact(model_number)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.humidifier_model_aliases
    add column alias_norm text generated always as (public.norm_compact(alias)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.humidifier_filters
    add column oem_part_number_norm text generated always as (public.norm_compact(oem_part_number)) stored;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.humidifier_filter_aliases
    add column alias_norm text generated always as (public.norm_compact(alias)) stored;
exception when duplicate_column then null; end $$;

create index if not exists idx_air_purifier_models_model_norm on public.air_purifier_models (model_number_norm);
create index if not exists idx_air_purifier_model_aliases_alias_norm on public.air_purifier_model_aliases (alias_norm);
create index if not exists idx_air_purifier_filters_oem_norm on public.air_purifier_filters (oem_part_number_norm);
create index if not exists idx_air_purifier_filter_aliases_alias_norm on public.air_purifier_filter_aliases (alias_norm);

create index if not exists idx_vacuum_models_model_norm on public.vacuum_models (model_number_norm);
create index if not exists idx_vacuum_model_aliases_alias_norm on public.vacuum_model_aliases (alias_norm);
create index if not exists idx_vacuum_filters_oem_norm on public.vacuum_filters (oem_part_number_norm);
create index if not exists idx_vacuum_filter_aliases_alias_norm on public.vacuum_filter_aliases (alias_norm);

create index if not exists idx_humidifier_models_model_norm on public.humidifier_models (model_number_norm);
create index if not exists idx_humidifier_model_aliases_alias_norm on public.humidifier_model_aliases (alias_norm);
create index if not exists idx_humidifier_filters_oem_norm on public.humidifier_filters (oem_part_number_norm);
create index if not exists idx_humidifier_filter_aliases_alias_norm on public.humidifier_filter_aliases (alias_norm);

-- ---------------------------------------------------------------------------
-- Search RPCs (parameter names q + limit_count for PostgREST / Supabase JS)
-- ---------------------------------------------------------------------------

-- Air purifier
create or replace function public.search_air_purifier_models_flexible(q text, limit_count int)
returns table (slug text, model_number text, brand_name text, brand_slug text)
language sql stable set search_path = public as $$
  select distinct on (fm.slug)
    fm.slug, fm.model_number, b.name, b.slug
  from public.air_purifier_models fm
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

create or replace function public.search_air_purifier_model_aliases_flexible(q text, limit_count int)
returns table (slug text, model_number text, brand_name text, brand_slug text, matched_alias text)
language sql stable set search_path = public as $$
  select distinct on (fm.slug)
    fm.slug, fm.model_number, b.name, b.slug, a.alias
  from public.air_purifier_model_aliases a
  inner join public.air_purifier_models fm on fm.id = a.air_purifier_model_id
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

create or replace function public.search_air_purifier_filters_flexible(q text, limit_count int)
returns table (slug text, oem_part_number text, filter_name text, brand_name text, brand_slug text)
language sql stable set search_path = public as $$
  select distinct on (f.slug)
    f.slug, f.oem_part_number, f.name, b.name, b.slug
  from public.air_purifier_filters f
  inner join public.brands b on b.id = f.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      f.oem_part_number ilike '%' || r.raw || '%'
      or f.oem_part_number_norm like '%' || c.n || '%'
      or (length(f.oem_part_number_norm) >= 2 and c.n like '%' || f.oem_part_number_norm || '%')
    )
  order by f.slug, f.oem_part_number
  limit limit_count;
$$;

create or replace function public.search_air_purifier_filter_aliases_flexible(q text, limit_count int)
returns table (slug text, oem_part_number text, filter_name text, brand_name text, brand_slug text, matched_alias text)
language sql stable set search_path = public as $$
  select distinct on (f.slug)
    f.slug, f.oem_part_number, f.name, b.name, b.slug, a.alias
  from public.air_purifier_filter_aliases a
  inner join public.air_purifier_filters f on f.id = a.air_purifier_filter_id
  inner join public.brands b on b.id = f.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      a.alias ilike '%' || r.raw || '%'
      or a.alias_norm like '%' || c.n || '%'
      or (length(a.alias_norm) >= 2 and c.n like '%' || a.alias_norm || '%')
    )
  order by f.slug, a.alias
  limit limit_count;
$$;

-- Vacuum
create or replace function public.search_vacuum_models_flexible(q text, limit_count int)
returns table (slug text, model_number text, brand_name text, brand_slug text)
language sql stable set search_path = public as $$
  select distinct on (fm.slug)
    fm.slug, fm.model_number, b.name, b.slug
  from public.vacuum_models fm
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

create or replace function public.search_vacuum_model_aliases_flexible(q text, limit_count int)
returns table (slug text, model_number text, brand_name text, brand_slug text, matched_alias text)
language sql stable set search_path = public as $$
  select distinct on (fm.slug)
    fm.slug, fm.model_number, b.name, b.slug, a.alias
  from public.vacuum_model_aliases a
  inner join public.vacuum_models fm on fm.id = a.vacuum_model_id
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

create or replace function public.search_vacuum_filters_flexible(q text, limit_count int)
returns table (slug text, oem_part_number text, filter_name text, brand_name text, brand_slug text)
language sql stable set search_path = public as $$
  select distinct on (f.slug)
    f.slug, f.oem_part_number, f.name, b.name, b.slug
  from public.vacuum_filters f
  inner join public.brands b on b.id = f.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      f.oem_part_number ilike '%' || r.raw || '%'
      or f.oem_part_number_norm like '%' || c.n || '%'
      or (length(f.oem_part_number_norm) >= 2 and c.n like '%' || f.oem_part_number_norm || '%')
    )
  order by f.slug, f.oem_part_number
  limit limit_count;
$$;

create or replace function public.search_vacuum_filter_aliases_flexible(q text, limit_count int)
returns table (slug text, oem_part_number text, filter_name text, brand_name text, brand_slug text, matched_alias text)
language sql stable set search_path = public as $$
  select distinct on (f.slug)
    f.slug, f.oem_part_number, f.name, b.name, b.slug, a.alias
  from public.vacuum_filter_aliases a
  inner join public.vacuum_filters f on f.id = a.vacuum_filter_id
  inner join public.brands b on b.id = f.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      a.alias ilike '%' || r.raw || '%'
      or a.alias_norm like '%' || c.n || '%'
      or (length(a.alias_norm) >= 2 and c.n like '%' || a.alias_norm || '%')
    )
  order by f.slug, a.alias
  limit limit_count;
$$;

-- Humidifier
create or replace function public.search_humidifier_models_flexible(q text, limit_count int)
returns table (slug text, model_number text, brand_name text, brand_slug text)
language sql stable set search_path = public as $$
  select distinct on (fm.slug)
    fm.slug, fm.model_number, b.name, b.slug
  from public.humidifier_models fm
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

create or replace function public.search_humidifier_model_aliases_flexible(q text, limit_count int)
returns table (slug text, model_number text, brand_name text, brand_slug text, matched_alias text)
language sql stable set search_path = public as $$
  select distinct on (fm.slug)
    fm.slug, fm.model_number, b.name, b.slug, a.alias
  from public.humidifier_model_aliases a
  inner join public.humidifier_models fm on fm.id = a.humidifier_model_id
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

create or replace function public.search_humidifier_filters_flexible(q text, limit_count int)
returns table (slug text, oem_part_number text, filter_name text, brand_name text, brand_slug text)
language sql stable set search_path = public as $$
  select distinct on (f.slug)
    f.slug, f.oem_part_number, f.name, b.name, b.slug
  from public.humidifier_filters f
  inner join public.brands b on b.id = f.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      f.oem_part_number ilike '%' || r.raw || '%'
      or f.oem_part_number_norm like '%' || c.n || '%'
      or (length(f.oem_part_number_norm) >= 2 and c.n like '%' || f.oem_part_number_norm || '%')
    )
  order by f.slug, f.oem_part_number
  limit limit_count;
$$;

create or replace function public.search_humidifier_filter_aliases_flexible(q text, limit_count int)
returns table (slug text, oem_part_number text, filter_name text, brand_name text, brand_slug text, matched_alias text)
language sql stable set search_path = public as $$
  select distinct on (f.slug)
    f.slug, f.oem_part_number, f.name, b.name, b.slug, a.alias
  from public.humidifier_filter_aliases a
  inner join public.humidifier_filters f on f.id = a.humidifier_filter_id
  inner join public.brands b on b.id = f.brand_id
  cross join lateral (select trim(q) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      a.alias ilike '%' || r.raw || '%'
      or a.alias_norm like '%' || c.n || '%'
      or (length(a.alias_norm) >= 2 and c.n like '%' || a.alias_norm || '%')
    )
  order by f.slug, a.alias
  limit limit_count;
$$;

grant execute on function public.search_air_purifier_models_flexible(text, int) to anon;
grant execute on function public.search_air_purifier_model_aliases_flexible(text, int) to anon;
grant execute on function public.search_air_purifier_filters_flexible(text, int) to anon;
grant execute on function public.search_air_purifier_filter_aliases_flexible(text, int) to anon;

grant execute on function public.search_vacuum_models_flexible(text, int) to anon;
grant execute on function public.search_vacuum_model_aliases_flexible(text, int) to anon;
grant execute on function public.search_vacuum_filters_flexible(text, int) to anon;
grant execute on function public.search_vacuum_filter_aliases_flexible(text, int) to anon;

grant execute on function public.search_humidifier_models_flexible(text, int) to anon;
grant execute on function public.search_humidifier_model_aliases_flexible(text, int) to anon;
grant execute on function public.search_humidifier_filters_flexible(text, int) to anon;
grant execute on function public.search_humidifier_filter_aliases_flexible(text, int) to anon;

-- ---------------------------------------------------------------------------
-- Click attribution (parallel outbound links)
-- ---------------------------------------------------------------------------
alter table public.click_events
  add column if not exists air_purifier_retailer_link_id uuid
    references public.air_purifier_retailer_links (id) on delete set null;

alter table public.click_events
  add column if not exists vacuum_retailer_link_id uuid
    references public.vacuum_retailer_links (id) on delete set null;

alter table public.click_events
  add column if not exists humidifier_retailer_link_id uuid
    references public.humidifier_retailer_links (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.air_purifier_models enable row level security;
alter table public.air_purifier_model_aliases enable row level security;
alter table public.air_purifier_filters enable row level security;
alter table public.air_purifier_filter_aliases enable row level security;
alter table public.air_purifier_compatibility_mappings enable row level security;
alter table public.air_purifier_retailer_links enable row level security;

alter table public.vacuum_models enable row level security;
alter table public.vacuum_model_aliases enable row level security;
alter table public.vacuum_filters enable row level security;
alter table public.vacuum_filter_aliases enable row level security;
alter table public.vacuum_compatibility_mappings enable row level security;
alter table public.vacuum_retailer_links enable row level security;

alter table public.humidifier_models enable row level security;
alter table public.humidifier_model_aliases enable row level security;
alter table public.humidifier_filters enable row level security;
alter table public.humidifier_filter_aliases enable row level security;
alter table public.humidifier_compatibility_mappings enable row level security;
alter table public.humidifier_retailer_links enable row level security;

create policy "Public read air_purifier_models"
  on public.air_purifier_models for select to anon using (true);
create policy "Public read air_purifier_model_aliases"
  on public.air_purifier_model_aliases for select to anon using (true);
create policy "Public read air_purifier_filters"
  on public.air_purifier_filters for select to anon using (true);
create policy "Public read air_purifier_filter_aliases"
  on public.air_purifier_filter_aliases for select to anon using (true);
create policy "Public read air_purifier_compatibility_mappings"
  on public.air_purifier_compatibility_mappings for select to anon using (true);
create policy "Public read air_purifier_retailer_links"
  on public.air_purifier_retailer_links for select to anon using (status = 'approved');

create policy "Public read vacuum_models"
  on public.vacuum_models for select to anon using (true);
create policy "Public read vacuum_model_aliases"
  on public.vacuum_model_aliases for select to anon using (true);
create policy "Public read vacuum_filters"
  on public.vacuum_filters for select to anon using (true);
create policy "Public read vacuum_filter_aliases"
  on public.vacuum_filter_aliases for select to anon using (true);
create policy "Public read vacuum_compatibility_mappings"
  on public.vacuum_compatibility_mappings for select to anon using (true);
create policy "Public read vacuum_retailer_links"
  on public.vacuum_retailer_links for select to anon using (status = 'approved');

create policy "Public read humidifier_models"
  on public.humidifier_models for select to anon using (true);
create policy "Public read humidifier_model_aliases"
  on public.humidifier_model_aliases for select to anon using (true);
create policy "Public read humidifier_filters"
  on public.humidifier_filters for select to anon using (true);
create policy "Public read humidifier_filter_aliases"
  on public.humidifier_filter_aliases for select to anon using (true);
create policy "Public read humidifier_compatibility_mappings"
  on public.humidifier_compatibility_mappings for select to anon using (true);
create policy "Public read humidifier_retailer_links"
  on public.humidifier_retailer_links for select to anon using (status = 'approved');
