-- Version 19: server-side OneDrive cloud backup. Existing purchase data is untouched.
create table if not exists public.onedrive_backup_connection (
  id boolean primary key default true check (id),
  refresh_token text not null,
  connected_at timestamptz not null default now(),
  last_backup_at timestamptz,
  last_error text
);
alter table public.onedrive_backup_connection enable row level security;
revoke all on public.onedrive_backup_connection from public, anon, authenticated;

create table if not exists public.onedrive_oauth_states (
  state uuid primary key,
  expires_at timestamptz not null
);
alter table public.onedrive_oauth_states enable row level security;
revoke all on public.onedrive_oauth_states from public, anon, authenticated;
