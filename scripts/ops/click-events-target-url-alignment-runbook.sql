-- BuckParts ops runbook: click_events target_url alignment (manual Supabase SQL)
-- Apply the same DDL as supabase/migrations/20260502120000_click_events_add_target_url_alignment.sql
-- after review. Do not run against production until Jared confirms.

-- ---------------------------------------------------------------------------
-- 1) Precheck: current click_events columns
-- ---------------------------------------------------------------------------
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'click_events'
order by ordinal_position;

-- ---------------------------------------------------------------------------
-- 2) Migration DDL (idempotent)
-- ---------------------------------------------------------------------------
alter table public.click_events
  add column if not exists target_url text;

comment on column public.click_events.target_url is
  'Canonical outbound URL for /go logging (matches redirect Location). Required by buildGoClickEventInsertRow; add-only migration restores PostgREST compatibility.';

alter table public.click_events
  add column if not exists retailer_link_id uuid references public.retailer_links (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3) Postcheck: target_url exists
-- ---------------------------------------------------------------------------
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'click_events'
  and column_name in ('target_url', 'retailer_link_id')
order by column_name;

-- ---------------------------------------------------------------------------
-- 4) Optional: DIAGNOSTIC insert test (rolled back — no durable analytics row)
--     Only run if you want to prove PostgREST accepts the same shape as /go.
--     Replace filter_id with a real uuid from public.filters if FK requires it.
-- ---------------------------------------------------------------------------
-- begin;
-- insert into public.click_events (
--   filter_id,
--   retailer_slug,
--   page_type,
--   page_slug,
--   target_url,
--   user_agent,
--   referrer
-- ) values (
--   (select id from public.filters limit 1),
--   'diagnostic-slot',
--   'refrigerator_filter',
--   'diagnostic',
--   'https://example.com/diagnostic-buckparts-click-events',
--   'BuckPartsDiagnostic/1.0',
--   null
-- ) returning id, created_at, target_url;
-- rollback;
