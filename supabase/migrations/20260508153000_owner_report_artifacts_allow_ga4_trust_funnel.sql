-- ============================================================================
-- owner_report_artifacts: allow GA4 trust-funnel durable artifact key
-- ============================================================================
-- Scope:
--   Expand allowed artifact_key values for owner reporting artifacts.
--   No public exposure changes.
-- ============================================================================

alter table public.owner_report_artifacts
  drop constraint if exists owner_report_artifacts_gsc_key_only;

alter table public.owner_report_artifacts
  add constraint owner_report_artifacts_allowed_keys
  check (artifact_key in ('gsc_search_analytics', 'ga4_trust_funnel'));

comment on column public.owner_report_artifacts.artifact_key is
  'Artifact identifier. Allowed values: gsc_search_analytics, ga4_trust_funnel.';
