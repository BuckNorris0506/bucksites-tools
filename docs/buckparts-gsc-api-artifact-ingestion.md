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
- Durable output: Supabase table `public.owner_report_artifacts`, key `gsc_search_analytics`
- Local debug output: `data/reports/buckparts-gsc-search-analytics.json`

The scheduled fetch writes both outputs:

1. Supabase durable artifact row (shared across runtimes)
2. Local JSON artifact file (debug/local fallback)

The artifact includes:

- `status`, `fetched_at`, `property`, `date_range`
- totals (`total_clicks`, `total_impressions`, `average_ctr`, `average_position`)
- top queries/pages by clicks/impressions
- high-impression low-click opportunities
- `proven_facts`, `unknown_facts`
- `provenance` (source/scope/writer)

## Owner dashboard fallback order

`gsc_external_demand` reads in this order:

1. `public.owner_report_artifacts` key `gsc_search_analytics` (durable scheduled artifact)
2. `data/reports/buckparts-gsc-search-analytics.json` (local scheduled artifact fallback)
3. `data/gsc/*Performance-on-Search*.csv|zip` manual export parser
4. `DARK`/`UNKNOWN` honest fallback when no source is usable

Owner dashboard never calls Search Console API directly at request time.

## Required Supabase artifact table

Apply migration:

- `supabase/migrations/20260508135000_owner_report_artifacts_gsc.sql`

Table:

- `artifact_key text primary key` (narrowed to `gsc_search_analytics`)
- `status text not null`
- `fetched_at timestamptz`
- `payload jsonb not null`
- `source text not null`
- `updated_at timestamptz default now()`

Access model:

- Service-role/server-only access (owner dashboard and scripts).
- No public route usage.

## Why filesystem is not trusted for production durability

- Production runs on Netlify.
- Runtime filesystem persistence/shareability across instances is not proven.
- Durable reporting artifacts must live in shared persistent storage.
- Supabase is already the existing BuckParts backend and is the durable source of truth for lane 16.

## Scheduler runbook

1. Configure production env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GSC_PROPERTY_SITE_URL`
   - Either OAuth refresh-token vars or service-account vars
2. Run schedule command:
   - `npm run buckparts:gsc:fetch`
3. Verify durable row exists:
   - `select artifact_key, status, fetched_at, updated_at from public.owner_report_artifacts where artifact_key = 'gsc_search_analytics';`
4. Verify owner dashboard lane 16:
   - `artifact_source=SUPABASE`
   - `status`, `fetched_at`, totals/top lists populated or explicitly `UNKNOWN`

## Failure states

- Missing Supabase config: durable write/read returns UNKNOWN-safe details, lane falls back to local/manual sources.
- Durable row missing: lane falls back to local artifact, then manual export.
- Durable payload malformed: lane marks UNKNOWN for durable source and falls back.
- GSC auth/API failure in scheduler: artifact status becomes `UNKNOWN_CONFIG` or `UNKNOWN_API_ERROR`; lane surfaces status honestly.
- `UNKNOWN_API_ERROR` artifacts may include **sanitized** HTTP/Google diagnostics in `unknown_facts` (for example `http_status`, `google_status`, `google_reason`, truncated `google_message`). These lines never include tokens, secrets, Authorization headers, or full raw API bodies. Command Center still treats `UNKNOWN_API_ERROR` artifacts as **not usable** for measurement.

## Security notes

- Do not commit service-account JSON files.
- Do not print raw credential strings in logs.
- Do not commit OAuth client secrets or refresh tokens.
- Failures should return `UNKNOWN_CONFIG` or `UNKNOWN_API_ERROR` style statuses with log-safe detail only.
