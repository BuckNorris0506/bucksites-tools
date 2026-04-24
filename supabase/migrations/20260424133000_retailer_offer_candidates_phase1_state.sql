-- Phase 1: Amazon candidate queue state fields on public.retailer_offer_candidates.
-- Extend in place; do not create a parallel queue table.

alter table public.retailer_offer_candidates
  add column if not exists candidate_state text,
  add column if not exists canonical_url text,
  add column if not exists asin text,
  add column if not exists token_required text[],
  add column if not exists token_evidence_ok boolean,
  add column if not exists token_evidence_notes text,
  add column if not exists browser_truth_classification text,
  add column if not exists browser_truth_notes text,
  add column if not exists browser_truth_checked_at timestamptz,
  add column if not exists retry_after timestamptz,
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_error text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'retailer_offer_candidates'
      and column_name = 'review_status'
  ) then
    update public.retailer_offer_candidates
    set candidate_state = coalesce(
      candidate_state,
      case
        when review_status = 'rejected' then 'rejected'
        else 'candidate_found'
      end
    );
  else
    update public.retailer_offer_candidates
    set candidate_state = coalesce(candidate_state, 'candidate_found');
  end if;
end $$;

alter table public.retailer_offer_candidates
  alter column candidate_state set default 'candidate_found';

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'retailer_offer_candidates'
      and c.conname = 'retailer_offer_candidates_candidate_state_check'
  ) then
    alter table public.retailer_offer_candidates
      add constraint retailer_offer_candidates_candidate_state_check
      check (
        candidate_state in (
          'candidate_found',
          'token_verified',
          'browser_truth_checked',
          'direct_buyable',
          'likely_valid',
          'rejected'
        )
      );
  end if;
end $$;

create index if not exists idx_retailer_offer_candidates_state_retry
  on public.retailer_offer_candidates (candidate_state, retry_after);
