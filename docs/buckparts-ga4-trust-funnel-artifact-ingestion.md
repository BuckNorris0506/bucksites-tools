# BuckParts GA4 Trust-Funnel Artifact Ingestion (Owner Reporting)

This is the durable stage-1 path for owner-dashboard trust-funnel aggregate reporting.

## Why artifact-based (not live API in request path)

- Owner dashboard requests must stay deterministic and resilient.
- GA4 API auth/network/quota failures should not block owner rendering.
- Scheduled artifact generation isolates external API risk from runtime UI.
- Owner dashboard reads durable artifact snapshots only.

## Scope (stage 1)

Stage 1 intentionally includes only event-name totals and derived rates.

- Supported totals:
  - `fridge_model_view`
  - `fridge_filter_chip_click`
  - `fridge_filter_detail_click_from_model`
  - `fridge_filter_view`
  - `fridge_help_opened`
- Supported rates:
  - `chip_clicks_per_model_view`
  - `filter_views_per_chip_click`
  - `help_opens_per_filter_view`
- Breakdown fields remain `UNKNOWN` in stage 1:
  - `top_model_slugs`
  - `top_filter_slugs`
  - `quarantined_vs_normal`

## Required environment variables

- `GA4_PROPERTY_ID` (numeric GA4 property id)
- OAuth refresh-token mode (preferred):
  - `GA4_OAUTH_CLIENT_ID`
  - `GA4_OAUTH_CLIENT_SECRET`
  - `GA4_OAUTH_REFRESH_TOKEN`

Optional parity mode:

- `GA4_SERVICE_ACCOUNT_JSON`, or
- `GA4_SERVICE_ACCOUNT_KEY_PATH`

GA4 read scope:

- `https://www.googleapis.com/auth/analytics.readonly`

## Fetch job and artifact path

- Command: `npm run buckparts:ga4:fetch`
- Script: `scripts/fetch-buckparts-ga4-trust-funnel-artifact.ts`
- Durable output: `public.owner_report_artifacts` key `ga4_trust_funnel`
- Local debug output: `data/reports/buckparts-ga4-trust-funnel.json`

## Owner dashboard fallback order (trust funnel lane)

1. Supabase durable artifact `ga4_trust_funnel`
2. local debug artifact `data/reports/buckparts-ga4-trust-funnel.json`
3. existing emitter-contract-only signal
4. DARK/UNKNOWN fallback

No live GA4 calls are made in owner-dashboard request handling.

## Supabase table constraint

Migration to allow GA4 artifact key:

- `supabase/migrations/20260508153000_owner_report_artifacts_allow_ga4_trust_funnel.sql`

Allowed keys become:

- `gsc_search_analytics`
- `ga4_trust_funnel`

## Custom dimensions warning

Slug/trust-state breakdowns cannot be BRIGHT until GA4 custom definitions are configured and queryable for event parameters like:

- `model_slug`
- `filter_slug`
- `trust_state`
- related context flags

Until then, stage-1 artifact keeps those breakdown fields explicitly `UNKNOWN`.

