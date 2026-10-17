-- ============================================================================
-- owner_report_artifacts: reassert full durable artifact key allowlist
-- ============================================================================
-- Purpose:
--   Ensure live databases that missed an earlier allowlist expansion accept the
--   repo-declared live-site smoke artifact key.
--
-- Scope:
--   Constraint-only owner_report_artifacts contract refresh.
--   No public route behavior, retailer links, /go gates, scorecards, or learning
--   outcomes are changed.
-- ============================================================================

alter table public.owner_report_artifacts
  drop constraint if exists owner_report_artifacts_gsc_key_only;

alter table public.owner_report_artifacts
  drop constraint if exists owner_report_artifacts_allowed_keys;

alter table public.owner_report_artifacts
  add constraint owner_report_artifacts_allowed_keys
  check (artifact_key in ('gsc_search_analytics', 'ga4_trust_funnel', 'live_site_smoke_v1'));

comment on column public.owner_report_artifacts.artifact_key is
  'Artifact identifier. Allowed values: gsc_search_analytics, ga4_trust_funnel, live_site_smoke_v1.';
