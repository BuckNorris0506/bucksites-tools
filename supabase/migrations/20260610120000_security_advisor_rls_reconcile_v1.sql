-- Security Advisor emergency reconcile v1
-- Resolves ERROR-level RLS-disabled public catalog/telemetry tables and WARN-level
-- mutable search_path on helper functions. Idempotent; safe to re-run.
--
-- Does NOT revoke anon/authenticated EXECUTE on upsert_search_gap (app uses anon server client).
-- Does NOT change /go redirect or buyer-path gate behavior.
--
-- Live Supabase (confirmed): public.retailer_links retains status column; anon policy uses
-- status = 'approved'. click_events/search_events table grants narrowed to INSERT only.

-- ---------------------------------------------------------------------------
-- 1) Enable RLS on fridge core catalog + telemetry tables
-- ---------------------------------------------------------------------------
alter table public.brands enable row level security;
alter table public.fridge_models enable row level security;
alter table public.filters enable row level security;
alter table public.fridge_model_aliases enable row level security;
alter table public.filter_aliases enable row level security;
alter table public.compatibility_mappings enable row level security;
alter table public.help_pages enable row level security;
alter table public.reset_instructions enable row level security;
alter table public.retailer_links enable row level security;
alter table public.click_events enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Anon SELECT-only policies (public catalog read)
-- ---------------------------------------------------------------------------
drop policy if exists "Public read brands" on public.brands;
create policy "Public read brands"
  on public.brands for select to anon using (true);

drop policy if exists "Public read fridge_models" on public.fridge_models;
create policy "Public read fridge_models"
  on public.fridge_models for select to anon using (true);

drop policy if exists "Public read filters" on public.filters;
create policy "Public read filters"
  on public.filters for select to anon using (true);

drop policy if exists "Public read fridge_model_aliases" on public.fridge_model_aliases;
create policy "Public read fridge_model_aliases"
  on public.fridge_model_aliases for select to anon using (true);

drop policy if exists "Public read filter_aliases" on public.filter_aliases;
create policy "Public read filter_aliases"
  on public.filter_aliases for select to anon using (true);

drop policy if exists "Public read compatibility_mappings" on public.compatibility_mappings;
create policy "Public read compatibility_mappings"
  on public.compatibility_mappings for select to anon using (true);

drop policy if exists "Public read help_pages" on public.help_pages;
create policy "Public read help_pages"
  on public.help_pages for select to anon using (true);

drop policy if exists "Public read reset_instructions" on public.reset_instructions;
create policy "Public read reset_instructions"
  on public.reset_instructions for select to anon using (true);

-- Live DB: retailer_links.status exists; anon reads approved rows only (see 20260408120000).
drop policy if exists "Public read retailer_links" on public.retailer_links;
create policy "Public read retailer_links"
  on public.retailer_links for select to anon using (status = 'approved');

-- ---------------------------------------------------------------------------
-- 3) click_events: anon INSERT only (no SELECT/UPDATE/DELETE/TRUNCATE)
-- ---------------------------------------------------------------------------
alter table public.click_events enable row level security;

revoke all on table public.click_events from anon, authenticated;
grant insert on table public.click_events to anon;

drop policy if exists "Public read click_events" on public.click_events;
drop policy if exists "Anon insert click_events" on public.click_events;
create policy "Anon insert click_events"
  on public.click_events for insert to anon with check (true);

-- ---------------------------------------------------------------------------
-- 4) search_events: INSERT-only grants + tightened INSERT policy (20260410170000)
-- ---------------------------------------------------------------------------
alter table public.search_events enable row level security;

revoke all on table public.search_events from anon, authenticated;
grant insert on table public.search_events to anon, authenticated;
grant usage, select on sequence public.search_events_id_seq to anon, authenticated;

drop policy if exists search_events_insert on public.search_events;
create policy search_events_insert
  on public.search_events
  for insert
  to anon, authenticated
  with check (
    char_length(btrim(raw_query)) between 2 and 500
    and char_length(btrim(normalized_query)) between 1 and 200
    and results_count >= 0
    and catalog in (
      'refrigerator_water',
      'air_purifier',
      'vacuum',
      'humidifier',
      'appliance_air',
      'whole_house_water',
      'all_catalogs'
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Functions: fixed search_path (Security Advisor WARN)
-- ---------------------------------------------------------------------------
create or replace function public.norm_compact(t text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(regexp_replace(coalesce(t, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

create or replace function public.set_updated_at_search_gaps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_updated_at_learning_outcomes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.upsert_search_gap(
  p_catalog text,
  p_raw_query text,
  p_normalized_query text,
  p_results_count integer,
  p_likely_entity_type text default 'unknown'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_type text := coalesce(nullif(trim(p_likely_entity_type), ''), 'unknown');
begin
  if p_results_count <> 0 then
    return;
  end if;

  if v_entity_type not in ('alias', 'model', 'filter_part', 'compatibility_mapping', 'help_page', 'unknown') then
    v_entity_type := 'unknown';
  end if;

  insert into public.search_gaps (
    catalog,
    normalized_query,
    sample_raw_query,
    search_count,
    zero_result_count,
    last_seen_at,
    status,
    likely_entity_type
  )
  values (
    p_catalog,
    p_normalized_query,
    p_raw_query,
    1,
    1,
    now(),
    'open',
    v_entity_type
  )
  on conflict (catalog, normalized_query)
  do update
  set
    sample_raw_query = excluded.sample_raw_query,
    search_count = public.search_gaps.search_count + 1,
    zero_result_count = public.search_gaps.zero_result_count + 1,
    last_seen_at = now(),
    likely_entity_type = case
      when public.search_gaps.likely_entity_type = 'unknown' and excluded.likely_entity_type <> 'unknown'
        then excluded.likely_entity_type
      else public.search_gaps.likely_entity_type
    end;
end;
$$;

-- Keep anon/authenticated EXECUTE (required by src/lib/search/telemetry.ts via anon server client).
grant execute on function public.upsert_search_gap(text, text, text, integer, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Post-apply validation (run in Supabase SQL Editor after migration)
-- ---------------------------------------------------------------------------
-- -- 1) RLS enabled
-- select c.relname as table_name, c.relrowsecurity as rls_enabled
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and c.relkind = 'r'
--   and c.relname in (
--     'brands','fridge_models','filters','fridge_model_aliases','filter_aliases',
--     'compatibility_mappings','help_pages','reset_instructions',
--     'retailer_links','click_events','search_events'
--   )
-- order by 1;
--
-- -- 2) Policies (retailer_links status-approved; click_events INSERT-only)
-- select schemaname, tablename, policyname, roles, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('retailer_links', 'click_events', 'search_events')
-- order by tablename, policyname;
-- -- Expect retailer_links: SELECT anon, qual (status = 'approved'::text)
-- -- Expect click_events: INSERT anon only (no SELECT policies)
-- -- Expect search_events: INSERT anon+authenticated with catalog/length with_check
--
-- select schemaname, tablename, policyname, roles, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in (
--     'brands','fridge_models','filters','fridge_model_aliases','filter_aliases',
--     'compatibility_mappings','help_pages','reset_instructions'
--   )
-- order by tablename, policyname;
--
-- -- 3) Table grants (INSERT only on telemetry tables)
-- select table_name, grantee, privilege_type
-- from information_schema.table_privileges
-- where table_schema = 'public'
--   and table_name in ('click_events', 'search_events')
--   and grantee in ('anon', 'authenticated')
-- order by table_name, grantee, privilege_type;
-- -- Expect click_events: anon INSERT only
-- -- Expect search_events: anon+authenticated INSERT only (no SELECT/UPDATE/DELETE/TRUNCATE)
--
-- -- 4) Function search_path
-- select p.proname,
--        pg_get_function_identity_arguments(p.oid) as args,
--        (
--          select option_value
--          from pg_options_to_table(p.prooptions)
--          where option_name = 'search_path'
--        ) as search_path
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in (
--     'norm_compact',
--     'set_updated_at_search_gaps',
--     'set_updated_at_learning_outcomes',
--     'upsert_search_gap'
--   );
--
-- -- 5) upsert_search_gap grants
-- select grantee, privilege_type
-- from information_schema.role_routine_grants
-- where routine_schema = 'public'
--   and routine_name = 'upsert_search_gap';
