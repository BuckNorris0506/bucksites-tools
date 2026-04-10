-- Align refrigerator search RPC parameter names with PostgREST / supabase-js calls.
-- App uses { q, limit_count }; prior definitions used { p_query, p_limit }, which
-- PostgREST treats as missing -> NULL -> empty results with no error.
-- Function signatures remain (text, int); only argument names and body references change.

create or replace function public.search_fridge_models_flexible(q text, limit_count int)
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

create or replace function public.search_fridge_aliases_flexible(q text, limit_count int)
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

create or replace function public.search_filters_flexible(q text, limit_count int)
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

create or replace function public.search_filter_aliases_flexible(q text, limit_count int)
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

grant execute on function public.search_fridge_models_flexible(text, int) to anon;
grant execute on function public.search_fridge_aliases_flexible(text, int) to anon;
grant execute on function public.search_filters_flexible(text, int) to anon;
grant execute on function public.search_filter_aliases_flexible(text, int) to anon;
