-- ============================================================================
-- click_events: align live schema with repo + Next.js /go insert payload
-- ============================================================================
-- Why target_url is required:
--   `buildGoClickEventInsertRow` (src/lib/retailers/go-affiliate-route-handler.ts)
--   always sets `target_url` to the canonical outbound URL (same string as the
--   redirect `Location`). PostgREST rejects inserts when the column is missing
--   ("Could not find the 'target_url' column ... in the schema cache"), so /go
--   redirects succeeded but click_events rows were never written.
--
-- Scope: schema alignment only — no retailer_links rows are inserted, updated,
-- or deleted by this migration.
--
-- Nullability: `target_url` is added as NULLABLE so existing rows are not
-- forced to pick a synthetic URL. Repo `supabase/schema.sql` documents
-- `target_url text not null` for greenfield installs; production may stay
-- nullable until a separate operator backfill + NOT NULL migration is chosen.
-- ============================================================================

alter table public.click_events
  add column if not exists target_url text;

comment on column public.click_events.target_url is
  'Canonical outbound URL for /go logging (matches redirect Location). Required by buildGoClickEventInsertRow; add-only migration restores PostgREST compatibility.';

-- Repo baseline (supabase/schema.sql) includes retailer_link_id; add only if missing.
alter table public.click_events
  add column if not exists retailer_link_id uuid references public.retailer_links (id) on delete set null;
