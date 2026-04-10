-- Fix refrigerator model search dropping exact matches under LIMIT.
--
-- Root cause: search_fridge_models_flexible used DISTINCT ON (fm.slug) and
-- ORDER BY fm.slug, fm.model_number then LIMIT. The WHERE clause includes
--   c.n like '%' || fm.model_number_norm || '%'
-- which matches many rows whose model_number_norm is any substring of the query norm
-- (e.g. "rf30" inside "rf30bb6600ql"). Results were sorted alphabetically by slug,
-- so an exact Samsung model could fall outside the first 25 rows.
--
-- fridge_models.slug is UNIQUE, so DISTINCT ON is unnecessary. Order by relevance
-- (exact norm, exact ilike, then length closeness) before slug.

create or replace function public.search_fridge_models_flexible(q text, limit_count int)
returns table (slug text, model_number text, brand_name text, brand_slug text)
language sql
stable
set search_path = public
as $$
  select
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
  order by
    (fm.model_number_norm is not null and fm.model_number_norm = c.n) desc,
    (fm.model_number ilike r.raw) desc,
    (fm.model_number ilike r.raw || '%') desc,
    abs(coalesce(length(fm.model_number_norm), 0) - length(c.n)),
    fm.slug
  limit limit_count;
$$;

-- Aliases: multiple rows per model — keep one row per model, prefer best alias match.
create or replace function public.search_fridge_aliases_flexible(q text, limit_count int)
returns table (slug text, model_number text, brand_name text, brand_slug text, matched_alias text)
language sql
stable
set search_path = public
as $$
  select distinct on (fm.id)
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
  order by
    fm.id,
    (a.alias_norm is not null and a.alias_norm = c.n) desc,
    (a.alias ilike r.raw) desc,
    abs(coalesce(length(a.alias_norm), 0) - length(c.n)),
    fm.slug,
    a.alias
  limit limit_count;
$$;

grant execute on function public.search_fridge_models_flexible(text, int) to anon;
grant execute on function public.search_fridge_aliases_flexible(text, int) to anon;
