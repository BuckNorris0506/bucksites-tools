create table if not exists public.learning_outcomes (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  part_number text,
  model_number text,
  candidate_url text,
  retailer text,
  outcome text not null,
  reason text not null,
  reason_detail text,
  evidence jsonb,
  confidence text,
  cta_status text,
  index_status text,
  clicks integer default 0,
  conversions integer default 0,
  date_checked timestamptz default now(),
  next_action text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint learning_outcomes_outcome_check
    check (outcome in ('pass', 'fail', 'blocked', 'unknown')),
  constraint learning_outcomes_confidence_check
    check (confidence is null or confidence in ('exact', 'likely', 'uncertain')),
  constraint learning_outcomes_cta_status_check
    check (cta_status is null or cta_status in ('live', 'not_live', 'blocked'))
);

create index if not exists idx_learning_outcomes_slug
  on public.learning_outcomes (slug);

create index if not exists idx_learning_outcomes_part_number
  on public.learning_outcomes (part_number);

create index if not exists idx_learning_outcomes_outcome
  on public.learning_outcomes (outcome);

create index if not exists idx_learning_outcomes_retailer
  on public.learning_outcomes (retailer);

create index if not exists idx_learning_outcomes_date_checked
  on public.learning_outcomes (date_checked);

create or replace function public.set_updated_at_learning_outcomes()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_learning_outcomes_set_updated_at on public.learning_outcomes;
create trigger trg_learning_outcomes_set_updated_at
before update on public.learning_outcomes
for each row
execute function public.set_updated_at_learning_outcomes();
