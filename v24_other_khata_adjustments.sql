-- Version 24: Other Khata settlement transactions.
-- Run after v23_other_khata.sql.
alter table public.other_khata_entries drop constraint if exists other_khata_entries_entry_type_check;
alter table public.other_khata_entries add constraint other_khata_entries_entry_type_check
  check (entry_type in ('receivable', 'payable', 'receivable_settlement', 'payable_settlement'));