-- ============================================================================
-- owner_report_artifacts: reassert allowed keys including live_site_smoke_v1
-- ============================================================================
-- Purpose:
--   Idempotent refresh of `owner_report_artifacts_allowed_keys` so environments
--   that never applied `20260509120000_owner_report_artifacts_allow_live_site_smoke.sql`
--   (or drifted) still accept `live_site_smoke_v1` from `npm run buckparts:live-site-smoke`.
--   Same IN-list as 20260509120000; safe to run after that migration.
-- ============================================================================

alter table public.owner_report_artifacts
  drop constraint if exists owner_report_artifacts_allowed_keys;

alter table public.owner_report_artifacts
  add constraint owner_report_artifacts_allowed_keys
  check (artifact_key in ('gsc_search_analytics', 'ga4_trust_funnel', 'live_site_smoke_v1'));

comment on column public.owner_report_artifacts.artifact_key is
  'Artifact identifier. Allowed values: gsc_search_analytics, ga4_trust_funnel, live_site_smoke_v1.';
