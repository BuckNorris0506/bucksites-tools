-- Search intelligence staging: event logging + aggregated demand gaps.

create table if not exists public.search_events (
  id bigint generated always as identity primary key,
  raw_query text not null,
  normalized_query text not null,
  results_count integer not null check (results_count >= 0),
  catalog text not null,
  created_at timestamptz not null default now()
);

create index if not exists search_events_created_at_idx
  on public.search_events (created_at desc);

create index if not exists search_events_catalog_norm_idx
  on public.search_events (catalog, normalized_query, created_at desc);

create table if not exists public.search_gaps (
  id bigint generated always as identity primary key,
  catalog text not null,
  normalized_query text not null,
  sample_raw_query text not null,
  search_count integer not null default 1 check (search_count >= 0),
  zero_result_count integer not null default 1 check (zero_result_count >= 0),
  last_seen_at timestamptz not null default now(),
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'queued', 'resolved', 'ignored')),
  likely_entity_type text not null default 'unknown'
    check (
      likely_entity_type in (
        'alias',
        'model',
        'filter_part',
        'compatibility_mapping',
        'help_page',
        'unknown'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog, normalized_query)
);

create index if not exists search_gaps_priority_idx
  on public.search_gaps (status, zero_result_count desc, search_count desc, last_seen_at desc);

create or replace function public.set_updated_at_search_gaps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_search_gaps_set_updated_at on public.search_gaps;
create trigger trg_search_gaps_set_updated_at
before update on public.search_gaps
for each row
execute function public.set_updated_at_search_gaps();

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

alter table public.search_events enable row level security;
alter table public.search_gaps enable row level security;

drop policy if exists search_events_insert on public.search_events;
create policy search_events_insert
on public.search_events
for insert
to anon, authenticated
with check (true);

grant insert on table public.search_events to anon, authenticated;
grant usage, select on sequence public.search_events_id_seq to anon, authenticated;
grant execute on function public.upsert_search_gap(text, text, text, integer, text) to anon, authenticated;
