-- Version 23: Other Khata for money receivable from / payable to other people.
-- Additive migration: it does not change existing purchases, Aapi Khata, or ledger data.

create table if not exists public.other_khata_entries (
  id uuid primary key default gen_random_uuid(),
  person_name text not null check (char_length(trim(person_name)) > 0),
  entry_type text not null check (entry_type in ('receivable', 'payable')),
  amount numeric(14,2) not null check (amount > 0),
  note text not null default '',
  entry_at timestamptz not null default now(),
  created_by text not null default 'Admin',
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists other_khata_entries_entry_at_idx on public.other_khata_entries(entry_at desc);
create index if not exists other_khata_entries_person_name_idx on public.other_khata_entries(person_name);

alter table public.other_khata_entries enable row level security;

drop policy if exists other_khata_read_session on public.other_khata_entries;
drop policy if exists other_khata_admin_write on public.other_khata_entries;
create policy other_khata_read_session on public.other_khata_entries
  for select to anon, authenticated
  using ((select public.store_session_valid()));
create policy other_khata_admin_write on public.other_khata_entries
  for all to anon, authenticated
  using ((select public.store_session_admin()))
  with check ((select public.store_session_admin()));

revoke all on public.other_khata_entries from public, anon, authenticated;
grant select, insert, update, delete on public.other_khata_entries to anon, authenticated;