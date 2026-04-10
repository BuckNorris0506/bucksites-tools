-- Staging destinations for approved search-gap candidates.
-- These tables are internal-only and do not drive public site reads.

create table if not exists public.staged_alias_additions (
  id bigint generated always as identity primary key,
  search_gap_candidate_id bigint not null unique
    references public.search_gap_candidates(id) on delete cascade,
  catalog text not null,
  normalized_query text not null,
  target_kind text not null check (target_kind in ('model', 'filter_part')),
  target_table text not null,
  target_record_id text,
  proposed_alias text not null,
  payload_json jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'reviewing', 'ready', 'promoted', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.staged_model_additions (
  id bigint generated always as identity primary key,
  search_gap_candidate_id bigint not null unique
    references public.search_gap_candidates(id) on delete cascade,
  catalog text not null,
  normalized_query text not null,
  proposed_model_number text not null,
  proposed_brand_id uuid,
  proposed_brand_slug text,
  payload_json jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'reviewing', 'ready', 'promoted', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.staged_filter_part_additions (
  id bigint generated always as identity primary key,
  search_gap_candidate_id bigint not null unique
    references public.search_gap_candidates(id) on delete cascade,
  catalog text not null,
  normalized_query text not null,
  proposed_oem_part_number text,
  proposed_brand_id uuid,
  proposed_brand_slug text,
  target_part_id text,
  proposed_alias text,
  payload_json jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'reviewing', 'ready', 'promoted', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.staged_compatibility_mapping_additions (
  id bigint generated always as identity primary key,
  search_gap_candidate_id bigint not null unique
    references public.search_gap_candidates(id) on delete cascade,
  catalog text not null,
  normalized_query text not null,
  compat_table text not null,
  model_fk text not null,
  part_fk text not null,
  model_id text not null,
  part_id text not null,
  payload_json jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'reviewing', 'ready', 'promoted', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.staged_help_page_additions (
  id bigint generated always as identity primary key,
  search_gap_candidate_id bigint not null unique
    references public.search_gap_candidates(id) on delete cascade,
  catalog text not null,
  normalized_query text not null,
  suggested_slug text not null,
  suggested_title text not null,
  payload_json jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'reviewing', 'ready', 'promoted', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists staged_alias_additions_status_idx
  on public.staged_alias_additions (status, created_at desc);
create index if not exists staged_model_additions_status_idx
  on public.staged_model_additions (status, created_at desc);
create index if not exists staged_filter_part_additions_status_idx
  on public.staged_filter_part_additions (status, created_at desc);
create index if not exists staged_compat_mapping_additions_status_idx
  on public.staged_compatibility_mapping_additions (status, created_at desc);
create index if not exists staged_help_page_additions_status_idx
  on public.staged_help_page_additions (status, created_at desc);

alter table public.staged_alias_additions enable row level security;
alter table public.staged_model_additions enable row level security;
alter table public.staged_filter_part_additions enable row level security;
alter table public.staged_compatibility_mapping_additions enable row level security;
alter table public.staged_help_page_additions enable row level security;
