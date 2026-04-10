-- Flexible catalog search: normalize compact alphanumeric forms + bidirectional substring on norms.
-- Requires Postgres: generated columns + immutable functions.

create or replace function public.norm_compact(t text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(t, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

do $$
begin
  alter table public.fridge_models
    add column model_number_norm text
      generated always as (public.norm_compact(model_number)) stored;
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.fridge_model_aliases
    add column alias_norm text
      generated always as (public.norm_compact(alias)) stored;
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.filters
    add column oem_part_number_norm text
      generated always as (public.norm_compact(oem_part_number)) stored;
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.filter_aliases
    add column alias_norm text
      generated always as (public.norm_compact(alias)) stored;
exception
  when duplicate_column then null;
end $$;

create index if not exists idx_fridge_models_model_number_norm on public.fridge_models (model_number_norm);
create index if not exists idx_fridge_model_aliases_alias_norm on public.fridge_model_aliases (alias_norm);
create index if not exists idx_filters_oem_part_number_norm on public.filters (oem_part_number_norm);
create index if not exists idx_filter_aliases_alias_norm on public.filter_aliases (alias_norm);

-- Fridge by model number (literal ilike + norm substring both ways)
create or replace function public.search_fridge_models_flexible(p_query text, p_limit int)
returns table (slug text, model_number text, brand_name text, brand_slug text)
language sql
stable
set search_path = public
as $$
  select distinct on (fm.slug)
    fm.slug,
    fm.model_number,
    b.name,
    b.slug
  from public.fridge_models fm
  inner join public.brands b on b.id = fm.brand_id
  cross join lateral (select trim(p_query) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      fm.model_number ilike '%' || r.raw || '%'
      or fm.model_number_norm like '%' || c.n || '%'
      or (length(fm.model_number_norm) >= 3 and c.n like '%' || fm.model_number_norm || '%')
    )
  order by fm.slug, fm.model_number
  limit p_limit;
$$;

create or replace function public.search_fridge_aliases_flexible(p_query text, p_limit int)
returns table (slug text, model_number text, brand_name text, brand_slug text, matched_alias text)
language sql
stable
set search_path = public
as $$
  select distinct on (fm.slug)
    fm.slug,
    fm.model_number,
    b.name,
    b.slug,
    a.alias
  from public.fridge_model_aliases a
  inner join public.fridge_models fm on fm.id = a.fridge_model_id
  inner join public.brands b on b.id = fm.brand_id
  cross join lateral (select trim(p_query) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      a.alias ilike '%' || r.raw || '%'
      or a.alias_norm like '%' || c.n || '%'
      or (length(a.alias_norm) >= 2 and c.n like '%' || a.alias_norm || '%')
    )
  order by fm.slug, a.alias
  limit p_limit;
$$;

create or replace function public.search_filters_flexible(p_query text, p_limit int)
returns table (slug text, oem_part_number text, filter_name text, brand_name text, brand_slug text)
language sql
stable
set search_path = public
as $$
  select distinct on (f.slug)
    f.slug,
    f.oem_part_number,
    f.name,
    b.name,
    b.slug
  from public.filters f
  inner join public.brands b on b.id = f.brand_id
  cross join lateral (select trim(p_query) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      f.oem_part_number ilike '%' || r.raw || '%'
      or f.oem_part_number_norm like '%' || c.n || '%'
      or (length(f.oem_part_number_norm) >= 2 and c.n like '%' || f.oem_part_number_norm || '%')
    )
  order by f.slug, f.oem_part_number
  limit p_limit;
$$;

create or replace function public.search_filter_aliases_flexible(p_query text, p_limit int)
returns table (slug text, oem_part_number text, filter_name text, brand_name text, brand_slug text, matched_alias text)
language sql
stable
set search_path = public
as $$
  select distinct on (f.slug)
    f.slug,
    f.oem_part_number,
    f.name,
    b.name,
    b.slug,
    a.alias
  from public.filter_aliases a
  inner join public.filters f on f.id = a.filter_id
  inner join public.brands b on b.id = f.brand_id
  cross join lateral (select trim(p_query) as raw) r
  cross join lateral (select public.norm_compact(r.raw) as n) c
  where length(r.raw) >= 2
    and (
      a.alias ilike '%' || r.raw || '%'
      or a.alias_norm like '%' || c.n || '%'
      or (length(a.alias_norm) >= 2 and c.n like '%' || a.alias_norm || '%')
    )
  order by f.slug, a.alias
  limit p_limit;
$$;

grant execute on function public.search_fridge_models_flexible(text, int) to anon;
grant execute on function public.search_fridge_aliases_flexible(text, int) to anon;
grant execute on function public.search_filters_flexible(text, int) to anon;
grant execute on function public.search_filter_aliases_flexible(text, int) to anon;
