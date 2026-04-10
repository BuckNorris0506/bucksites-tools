-- Deduplicate alias rows per parent; enables upsert from CSV import.
create unique index if not exists idx_fridge_model_aliases_fridge_alias_unique
  on public.fridge_model_aliases (fridge_model_id, alias);

create unique index if not exists idx_filter_aliases_filter_alias_unique
  on public.filter_aliases (filter_id, alias);
