-- BuckSites Tools — Supabase schema + RLS for public read + click logging.
-- Run in Supabase SQL editor or via migration tooling.

create extension if not exists "pgcrypto";

-- Brands
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- Refrigerator models
create table if not exists public.fridge_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null unique,
  model_number text not null,
  replacement_interval_months integer,
  notes text
);

create index if not exists idx_fridge_models_brand on public.fridge_models (brand_id);
create index if not exists idx_fridge_models_model_number on public.fridge_models (model_number);

create table if not exists public.fridge_model_aliases (
  id uuid primary key default gen_random_uuid(),
  fridge_model_id uuid not null references public.fridge_models (id) on delete cascade,
  alias text not null
);

create index if not exists idx_fridge_model_aliases_fridge on public.fridge_model_aliases (fridge_model_id);
create index if not exists idx_fridge_model_aliases_alias on public.fridge_model_aliases (alias);

create unique index if not exists idx_fridge_model_aliases_fridge_alias_unique
  on public.fridge_model_aliases (fridge_model_id, alias);

-- Filters (OEM cartridges)
create table if not exists public.filters (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  slug text not null unique,
  oem_part_number text not null,
  name text,
  replacement_interval_months integer,
  notes text
);

create index if not exists idx_filters_brand on public.filters (brand_id);
create index if not exists idx_filters_oem on public.filters (oem_part_number);

create table if not exists public.filter_aliases (
  id uuid primary key default gen_random_uuid(),
  filter_id uuid not null references public.filters (id) on delete cascade,
  alias text not null
);

create index if not exists idx_filter_aliases_filter on public.filter_aliases (filter_id);
create index if not exists idx_filter_aliases_alias on public.filter_aliases (alias);

create unique index if not exists idx_filter_aliases_filter_alias_unique
  on public.filter_aliases (filter_id, alias);

-- Many-to-many compatibility
create table if not exists public.compatibility_mappings (
  fridge_model_id uuid not null references public.fridge_models (id) on delete cascade,
  filter_id uuid not null references public.filters (id) on delete cascade,
  primary key (fridge_model_id, filter_id)
);

create index if not exists idx_compat_filter on public.compatibility_mappings (filter_id);

-- Live affiliate links only (use /go/[id] in the app). Unapproved URLs: retailer_link_candidates.
create table if not exists public.retailer_links (
  id uuid primary key default gen_random_uuid(),
  filter_id uuid not null references public.filters (id) on delete cascade,
  retailer_name text,
  affiliate_url text not null,
  is_primary boolean default false,
  sort_order integer default 0,
  retailer_key text not null
);

create unique index if not exists retailer_links_filter_retailer_key_unique
  on public.retailer_links (filter_id, retailer_key);

create index if not exists idx_retailer_links_filter on public.retailer_links (filter_id);

-- Pre-approval / machine-sourced URLs (not readable by anon; promote into retailer_links).
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

create index if not exists idx_retailer_link_candidates_filter
  on public.retailer_link_candidates (filter_id);

create unique index if not exists retailer_link_candidates_one_pending_per_slot
  on public.retailer_link_candidates (filter_id, retailer_key)
  where (review_status = 'pending');

-- CMS-style help articles
create table if not exists public.help_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text,
  meta_description text
);

-- Brand-scoped reset copy (also surfaced at /help/reset-water-filter-light/[brandSlug])
create table if not exists public.reset_instructions (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  title text,
  body text not null
);

create index if not exists idx_reset_instructions_brand on public.reset_instructions (brand_id);

-- Outbound click analytics (insert-only from anon).
-- Production shape (after parallel vertical migrations) adds filter_id, retailer_slug, page_type,
-- page_slug, and wedge FKs such as air_purifier_retailer_link_id / whole_house_water_retailer_link_id.
-- Fridge /go logs the legacy columns; AP/WH /go/* log wedge FKs only (no retailer_link_id).
create table if not exists public.click_events (
  id uuid primary key default gen_random_uuid(),
  retailer_link_id uuid references public.retailer_links (id) on delete set null,
  target_url text not null,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists idx_click_events_created on public.click_events (created_at desc);

-- Row Level Security
alter table public.brands enable row level security;
alter table public.fridge_models enable row level security;
alter table public.fridge_model_aliases enable row level security;
alter table public.filters enable row level security;
alter table public.filter_aliases enable row level security;
alter table public.compatibility_mappings enable row level security;
alter table public.retailer_links enable row level security;
alter table public.retailer_link_candidates enable row level security;
alter table public.help_pages enable row level security;
alter table public.reset_instructions enable row level security;
alter table public.click_events enable row level security;

-- Public read (adjust if you introduce private drafts later)
create policy "Public read brands"
  on public.brands for select to anon using (true);

create policy "Public read fridge_models"
                      on public.fridge_models for select to anon using (true);
create policy "Public read fridge_model_aliases"
                      on public.fridge_model_aliases for select to anon using (true);
create policy "Public read filters"
                      on public.filters for select to anon using (true);
create policy "Public read filter_aliases"
                      on public.filter_aliases for select to anon using (true);
create policy "Public read compatibility_mappings"
                      on public.compatibility_mappings for select to anon using (true);
create policy "Public read retailer_links"
                      on public.retailer_links for select to anon using (true);
create policy "Public read help_pages"
                      on public.help_pages for select to anon using (true);
create policy "Public read reset_instructions"
                      on public.reset_instructions for select to anon using (true);

-- No public select on click_events
create policy "Anon insert click_events"
  on public.click_events for insert to anon with check (true);

-- Optional: faster ILIKE search (uncomment if extension available)
-- create extension if not exists pg_trgm;
-- create index if not exists idx_fridge_models_model_trgm on public.fridge_models using gin (model_number gin_trgm_ops);
-- create index if not exists idx_fridge_aliases_trgm on public.fridge_model_aliases using gin (alias gin_trgm_ops);
-- create index if not exists idx_filters_oem_trgm on public.filters using gin (oem_part_number gin_trgm_ops);
-- create index if not exists idx_filter_aliases_trgm on public.filter_aliases using gin (alias gin_trgm_ops);
