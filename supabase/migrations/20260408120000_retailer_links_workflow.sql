-- Retailer workflow for legacy DBs created before status/source/retailer_key existed.
-- New environments can rely on supabase/schema.sql alone; this migration is safe to run if columns already exist (IF NOT EXISTS / IF NOT EXISTS index).

alter table public.retailer_links
  add column if not exists status text not null default 'approved',
  add column if not exists source text not null default 'manual',
  add column if not exists retailer_key text;

comment on column public.retailer_links.status is 'candidate | approved | rejected | archived — app only surfaces approved';
comment on column public.retailer_links.source is 'manual | import | crawler | other';
comment on column public.retailer_links.retailer_key is 'One approved row per (filter_id, retailer_key)';

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'retailer_links'
      and c.conname = 'retailer_links_status_check'
  ) then
    alter table public.retailer_links
      add constraint retailer_links_status_check
      check (status in ('candidate', 'approved', 'rejected', 'archived'));
  end if;
end $$;

create unique index if not exists retailer_links_one_approved_per_retailer
  on public.retailer_links (filter_id, retailer_key)
  where (status = 'approved');

drop policy if exists "Public read retailer_links" on public.retailer_links;

create policy "Public read retailer_links"
  on public.retailer_links for select to anon using (status = 'approved');
