-- Version 16 safe additive Trash migration.
-- Existing purchase rows remain active and unchanged.
alter table public.store_entries add column if not exists deleted_at timestamptz;
