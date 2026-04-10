-- Staging-only candidate generation from queued search gaps.

create table if not exists public.search_gap_candidates (
  id bigint generated always as identity primary key,
  search_gap_id bigint not null references public.search_gaps(id) on delete cascade,
  catalog text not null,
  normalized_query text not null,
  candidate_type text not null
    check (
      candidate_type in (
        'alias',
        'model',
        'filter_part',
        'compatibility_mapping',
        'help_page'
      )
    ),
  candidate_payload_json jsonb not null,
  payload_hash text generated always as (md5(candidate_payload_json::text)) stored,
  confidence_score numeric(4, 3) not null
    check (confidence_score >= 0 and confidence_score <= 1),
  status text not null default 'proposed'
    check (status in ('proposed', 'reviewing', 'approved', 'rejected', 'applied')),
  created_at timestamptz not null default now()
);

create index if not exists search_gap_candidates_gap_idx
  on public.search_gap_candidates (search_gap_id, created_at desc);

create index if not exists search_gap_candidates_status_idx
  on public.search_gap_candidates (status, confidence_score desc, created_at desc);

create unique index if not exists search_gap_candidates_dedupe_idx
  on public.search_gap_candidates (
    search_gap_id,
    candidate_type,
    payload_hash
  );

alter table public.search_gap_candidates enable row level security;

-- Keep this table internal by default; scripts use service role.
