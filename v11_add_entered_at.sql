-- Version 11 safe additive migration.
-- Existing purchase rows are not updated, deleted or replaced.
alter table public.store_entries add column if not exists entered_at timestamptz;
alter table public.store_entries alter column entered_at set default now();
