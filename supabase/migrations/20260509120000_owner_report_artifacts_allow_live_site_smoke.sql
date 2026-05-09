-- ============================================================================
-- owner_report_artifacts: allow live-site smoke durable artifact key
-- ============================================================================

alter table public.owner_report_artifacts
  drop constraint if exists owner_report_artifacts_allowed_keys;

alter table public.owner_report_artifacts
  add constraint owner_report_artifacts_allowed_keys
  check (artifact_key in ('gsc_search_analytics', 'ga4_trust_funnel', 'live_site_smoke_v1'));

comment on column public.owner_report_artifacts.artifact_key is
  'Artifact identifier. Allowed values: gsc_search_analytics, ga4_trust_funnel, live_site_smoke_v1.';
