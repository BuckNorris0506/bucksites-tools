# BuckParts GSC API Artifact Ingestion (Owner Reporting)

This is the durable path for owner-dashboard GSC external demand reporting.

## Why artifact-based (not live API in request path)

- Owner dashboard requests must stay fast and deterministic.
- Search Console API failures or quota issues should not block owner page rendering.
- Scheduled artifact generation isolates external API auth/network risk from runtime UI.
- Manual export parsing remains available as fallback when API artifact is missing or invalid.

## Required environment variables

- `GSC_PROPERTY_SITE_URL`: Search Console property URL (for example `sc-domain:buckparts.com`).
- Supported auth modes:
  - **OAuth refresh-token mode (recommended when service-account key creation is blocked)**
    - `GSC_OAUTH_CLIENT_ID`
    - `GSC_OAUTH_CLIENT_SECRET`
    - `GSC_OAUTH_REFRESH_TOKEN`
  - **Service-account mode (supported when key creation is allowed)**
    - `GSC_SERVICE_ACCOUNT_JSON` (single-line JSON string), or
    - `GSC_SERVICE_ACCOUNT_KEY_PATH` (server-only absolute path to service-account JSON file).

Auth mode resolution in code:

1. If all OAuth vars are present, OAuth refresh-token mode is used.
2. Else service-account JSON/key-path mode is used when configured.
3. Else fetch returns `UNKNOWN_CONFIG` with log-safe guidance.

Credential scope is fixed to:

- `https://www.googleapis.com/auth/webmasters.readonly`

## Google Cloud + Search Console setup

1. Create/select a Google Cloud project.
2. Enable the Search Console API.
3. Create a service account key (JSON) for server-side use.
4. Add the service-account principal as an owner/user on the Search Console property.
5. Set env vars in runtime/CI/scheduler environment (never commit key JSON).
6. Run `npm run buckparts:gsc:fetch` from repo root.

If service-account key creation is blocked by policy, configure OAuth refresh-token mode instead of forcing key-policy exceptions.

## Fetch job and artifact path

- Command: `npm run buckparts:gsc:fetch`
- Script: `scripts/fetch-buckparts-gsc-artifact.ts`
- Output artifact: `data/reports/buckparts-gsc-search-analytics.json`

The artifact includes:

- `status`, `fetched_at`, `property`, `date_range`
- totals (`total_clicks`, `total_impressions`, `average_ctr`, `average_position`)
- top queries/pages by clicks/impressions
- high-impression low-click opportunities
- `proven_facts`, `unknown_facts`
- `provenance` (source/scope/writer)

## Owner dashboard fallback order

`gsc_external_demand` reads in this order:

1. `data/reports/buckparts-gsc-search-analytics.json` (scheduled API artifact)
2. `data/gsc/*Performance-on-Search*.csv|zip` manual export parser
3. `DARK`/`UNKNOWN` honest fallback when neither source is usable

Owner dashboard continues to read generated artifact files only. It does not call Search Console API directly at request time.

## Security notes

- Do not commit service-account JSON files.
- Do not print raw credential strings in logs.
- Do not commit OAuth client secrets or refresh tokens.
- Failures should return `UNKNOWN_CONFIG` or `UNKNOWN_API_ERROR` style statuses with log-safe detail only.
