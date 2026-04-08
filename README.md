# BuckSites Tools — Refrigerator water filter finder

Production-oriented Next.js 14 (App Router) app backed by Supabase. Users search by fridge model or filter part number, open SEO-friendly detail pages, and leave through tracked affiliate links.

## Stack

- Next.js 14, TypeScript, Tailwind CSS
- Supabase (Postgres + Row Level Security)
- Netlify (`@netlify/plugin-nextjs`)

## Local setup

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
   | `NEXT_PUBLIC_SITE_URL` | Canonical origin, e.g. `https://your-site.netlify.app` (no trailing slash) |
   | `SUPABASE_SERVICE_ROLE_KEY` | **Scripts only** — CSV import (`npm run seed:import`). Never use in the Next.js app or client |

4. **Dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## CSV seed import

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

## Deploying on Netlify

1. Connect the repo and set the same environment variables in **Site settings → Environment variables**.
2. Build command: `npm run build` (default from `netlify.toml`).
3. The Next.js runtime plugin handles SSR and routing.

## Project layout

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

Affiliate links in the UI point at `/go/{retailer_link.id}` so each outbound click records a row in `click_events` before redirecting.

## Security notes

- Use the **anon** key only; RLS allows `SELECT` on catalog tables and `INSERT` on `click_events`.
- Do **not** expose the service role key in this app.
