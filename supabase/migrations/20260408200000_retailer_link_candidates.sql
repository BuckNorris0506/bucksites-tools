-- Split workflow: machine-sourced / unapproved URLs live in retailer_link_candidates.
-- retailer_links rows are live, affiliate-ready links only (anon-readable).

create table if not exists public.retailer_link_candidates (
  id uuid primary key default gen_random_uuid(),
  filter_id uuid not null references public.filters (id) on delete cascade,
  retailer_key text not null,
  candidate_url text not null,
  retailer_name text,
  source text not null default 'unknown',
  review_status text not null default 'pending'
    check (review_status in ('pending', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.retailer_link_candidates is 'Pre-approval affiliate URLs; not exposed to anon. Promote by inserting into retailer_links and deleting or rejecting here.';
comment on column public.retailer_link_candidates.retailer_key is 'Stable retailer slot (e.g. amazon); max one pending row per (filter_id, retailer_key)';

create index if not exists idx_retailer_link_candidates_filter
  on public.retailer_link_candidates (filter_id);

create unique index if not exists retailer_link_candidates_one_pending_per_slot
  on public.retailer_link_candidates (filter_id, retailer_key)
  where (review_status = 'pending');

alter table public.retailer_link_candidates enable row level security;
-- Intentionally no SELECT policy for anon — service role / future automation only.

-- Move non-live rows out of retailer_links (when status column exists from prior migration).
drop index if exists public.retailer_links_one_approved_per_retailer;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'retailer_links'
      and column_name = 'status'
  ) then
    insert into public.retailer_link_candidates (
      filter_id,
      retailer_key,
      candidate_url,
      retailer_name,
      source,
      review_status,
      notes,
      created_at
    )
    select
      rl.filter_id,
      coalesce(nullif(trim(rl.retailer_key), ''), 'unknown'),
      rl.affiliate_url,
      rl.retailer_name,
      coalesce(nullif(trim(rl.source), ''), 'unknown'),
      case
        when rl.status = 'rejected' then 'rejected'
        else 'pending'
      end,
      'migrated from retailer_links (status=' || rl.status || ')',
      now()
    from public.retailer_links rl
    where rl.status in ('candidate', 'rejected', 'archived');

    delete from public.retailer_links rl
    where rl.status <> 'approved';
  end if;
end $$;

alter table public.retailer_links drop constraint if exists retailer_links_status_check;
alter table public.retailer_links drop column if exists source;
alter table public.retailer_links drop column if exists status;

-- Ensure retailer_key exists and is populated (legacy / partial deploys).
alter table public.retailer_links add column if not exists retailer_key text;

update public.retailer_links
set retailer_key = lower(
  regexp_replace(
    trim(coalesce(nullif(retailer_name, ''), 'store')),
    '[^a-zA-Z0-9]+',
    '-',
    'g'
  )
)
where retailer_key is null or btrim(retailer_key) = '';

update public.retailer_links
set retailer_key = 'store'
where retailer_key is null or btrim(retailer_key) = '';

alter table public.retailer_links
  alter column retailer_key set not null;

create unique index if not exists retailer_links_filter_retailer_key_unique
  on public.retailer_links (filter_id, retailer_key);

drop policy if exists "Public read retailer_links" on public.retailer_links;

create policy "Public read retailer_links"
  on public.retailer_links for select to anon using (true);
