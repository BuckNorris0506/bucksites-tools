# BuckParts

BuckParts helps homeowners identify replacement filters and parts for supported appliances using evidence rather than plausible matching.

## The problem

Finding a part listing is easy; proving that it belongs to an exact appliance model is harder. Similar model numbers, unproven family relationships, and retailer cross-references can produce convincing but incorrect matches. Coverage is useful only if adding more models preserves the evidence standard.

## How BuckParts decides what it can say

The evidence and admission pipeline separates discovering a candidate from admitting a relationship. Manufacturer evidence must support the exact model or a documented model family; a similar name or sibling model does not establish fit. Retailer results can help discovery, but cannot independently establish model-to-part compatibility.

Manufacturer-specified relationships and compatible replacements are separate truth classes. Fit evidence, retailer listing evidence, and product quality or warranty claims are separate questions. A valid listing does not prove fit.

Conflicts remain visible in safety decisions and can quarantine a refrigerator buying path. The shared buying-link decision checks verification timestamps and trust status: expired, degraded, or unknown trust fails closed. Re-verification must restore the required evidence before those buying paths become eligible again; the redirect also applies the gate when a link is clicked.

## What BuckParts refuses to do

The evidence contracts reject guessed compatibility, unsupported model-family extrapolation, and retailer-only fit proof. Compatible products must not be presented as manufacturer-specified parts. A detected part-family conflict can suppress commerce instead of being silently resolved.

Buying paths governed by the trust gate are blocked when required verification is missing, expired, or degraded. **Uncertainty removes commerce instead of creating a guess.** This describes the evidence standard and implemented gates, not a claim that every catalog row is verified. BuckParts does not guarantee fit: homeowners should compare their exact model label, manual, and existing part before buying.

## Current state

This repository contains a working Next.js application with model/part search, detail pages, a Supabase catalog, evidence and admission tooling, and gated outbound affiliate links. The documented product address is [buckparts.com](https://buckparts.com); checkout happens at the retailer.

Coverage is early and incomplete. The repository includes refrigerator water-filter and other appliance-filter routes. It does not establish universal catalog verification, continuous rechecking of every page, or the exact commit currently deployed in production.

## Technical architecture

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (Postgres + Row Level Security)
- Netlify (`@netlify/plugin-nextjs`)

| Path | Role |
|------|------|
| `src/lib/supabase/server-client.ts` | Server Supabase client |
| `src/lib/types/database.ts` | Table-aligned TypeScript types |
| `src/lib/data/*` | Queries (brands, fridges, filters, help, search, retailers) |
| `src/app/go/[linkId]/route.ts` | Click logging + redirect |
| `src/app/api/search/route.ts` | JSON search API |
| `supabase/schema.sql` | DDL + RLS policies |
| `data/*.sample.csv` | CSV templates for seed import |
| `scripts/import-seed.ts` | CSV → Supabase importer |

Affiliate links in the UI point at `/go/{retailer_link.id}` where the redirect gate checks eligibility before logging an allowed outbound click in `click_events`. Invalid or blocked links redirect to `/go-unavailable`.

## Local development

1. **Dependencies**

   ```bash
   npm install
   ```

2. **Supabase**

   - Create a project at [supabase.com](https://supabase.com).
   - In the SQL editor, run `supabase/schema.sql`.
   - Optionally run `supabase/seed.sample.sql` for demo data (update URLs/slugs as needed).

3. **Environment**

   Copy `.env.example` to `.env.local` and fill in:

   | Variable | Purpose |
   |----------|---------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL (Settings → API) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key (safe in the browser with RLS) |
   | `NEXT_PUBLIC_SITE_URL` | Canonical origin for app metadata (no trailing slash). Legacy fallback for smoke checks. |
   | `LIVE_SITE_SMOKE_TARGET_URL` | Read-only Daily Operator / live-site smoke target. Use `https://buckparts.com` for production custom-domain route health. |
   | `BUCKPARTS_PUBLIC_SITE_URL` | Optional business-domain alias for smoke checks; `LIVE_SITE_SMOKE_TARGET_URL` wins when both are set. |
   | `SUPABASE_SERVICE_ROLE_KEY` | **Scripts only** — CSV import (`npm run seed:import`). Never use in the Next.js app or client |

4. **Dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Data / admission / safety

Importing a row is not proof of compatibility. Review evidence and admission requirements in [the BuckParts constitution](docs/BuckParts-CONSTITUTION.md) before changing public mappings or buying paths. Discovery output is a candidate, not publication authority.

The refrigerator mapping report is available with `npm run buckparts:guardrails:refrigerator`. Run repository tests with `npm test`. The shared buying-path decision lives in `src/lib/retailers/live-buyer-path-go-decision-v1.ts`; refrigerator conflict handling lives in `src/lib/fridge/fridge-model-pdp-customer-safety-v1.ts`.

### CSV seed import

Bulk-load catalog data from `./data/*.csv` using the [service role](https://supabase.com/docs/guides/api/api-keys) key (bypasses RLS). Do not ship this key to Netlify or the browser.

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (see `.env.example`).
2. Copy the sample templates or author your own files; required columns are documented in **`data/EXPECTED_HEADERS.txt`**.
3. Either name files `brands.csv`, `filters.csv`, etc., or run with bundled samples:

   ```bash
   npm run seed:import:sample
   ```

   For production CSV names (default):

   ```bash
   npm run seed:import
   ```

Import order is fixed: **brands → filters → fridge_models → compatibility_mappings → retailer_links**. Slugs in later files must match rows imported earlier (or already in the database).

| Script | Command |
|--------|---------|
| Orchestrator | `scripts/import-seed.ts` |
| CSV helpers | `scripts/lib/csv.ts`, `scripts/lib/supabase-admin.ts` |

### Security notes

- Use the **anon** key in the app; RLS allows catalog reads and event inserts under the applicable policies (see `supabase/migrations/20260610120000_security_advisor_rls_reconcile_v1.sql`).
- Do **not** expose the service role key in the app, browser, or Netlify deployment environment. It is for controlled import scripts only.

## Deployment

1. Connect the repo to Netlify and set the public application environment variables described above. Keep the scripts-only service role key out of the deployed app.
2. The build command in `netlify.toml` is `npm run buckparts:deploy:preflight && npm run build`.
3. The Next.js runtime plugin handles SSR and routing.

The deploy preflight runs the Supabase exposure audit, enforced repository/runtime convergence check, and enforced ship guard. A successful build alone does not establish evidence readiness.

### Branch and deployment verification

The documented canonical and production deploy branch is `main`. Earlier recorded post-switch checks passed for the homepage, `/filter/mwf`, `/air-purifier/filter/honeywell-hrf-r1`, and valid and invalid `/go/{linkId}` redirects. These are historical checks, not fresh live verification by this README edit. The exact live Netlify production deploy SHA remains unproven here.

Live-site smoke checks select `LIVE_SITE_SMOKE_TARGET_URL`, then `BUCKPARTS_PUBLIC_SITE_URL`, then legacy `NEXT_PUBLIC_SITE_URL`. Route health does not prove that the deployed commit matches the repository.
