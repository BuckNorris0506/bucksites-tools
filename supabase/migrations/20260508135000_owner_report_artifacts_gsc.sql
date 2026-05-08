-- ============================================================================
-- owner_report_artifacts: durable owner-dashboard artifacts
-- ============================================================================
-- Purpose:
--   Store scheduled owner-report artifacts in shared durable storage, because
--   local runtime filesystem artifacts are not a proven durable path on Netlify.
--
-- Scope:
--   Add-only table for server-side artifact reads/writes.
--   No public route behavior or catalog tables are changed.
-- ============================================================================

create table if not exists public.owner_report_artifacts (
  artifact_key text primary key,
  status text not null,
  fetched_at timestamptz,
  payload jsonb not null,
  source text not null,
  updated_at timestamptz not null default now(),
  constraint owner_report_artifacts_gsc_key_only
    check (artifact_key in ('gsc_search_analytics'))
);

comment on table public.owner_report_artifacts is
  'Server-side durable store for owner dashboard reporting artifacts.';

comment on column public.owner_report_artifacts.artifact_key is
  'Artifact identifier. Currently limited to gsc_search_analytics.';

comment on column public.owner_report_artifacts.payload is
  'Normalized artifact JSON payload consumed by owner dashboard lanes.';

comment on column public.owner_report_artifacts.source is
  'Writer identifier for auditability (server-side scripts only).';
