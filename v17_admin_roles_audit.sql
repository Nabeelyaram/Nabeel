-- Version 17: separate Simple User and Admin authentication, authorization and audit log.
-- Additive migration: existing purchases, items and ledger rows are not deleted or replaced.

alter table public.store_users add column if not exists role text not null default 'admin';
update public.store_users set role = 'admin' where role is null or role not in ('admin', 'user');
alter table public.store_entries add column if not exists modified_by text;

insert into public.store_users(display_name, password_hash, role)
select 'Simple User', extensions.crypt('1234', extensions.gen_salt('bf')), 'user'
where not exists (select 1 from public.store_users where role = 'user');

create table if not exists public.store_audit (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
alter table public.store_audit enable row level security;

create or replace function public.store_session_role()
returns text language sql stable security definer
set search_path = private, public, pg_temp
as $$
  select coalesce((
    select u.role from private.store_sessions s
    join public.store_users u on u.id = s.user_id
    where s.token_hash = encode(extensions.digest(public.store_request_token(), 'sha256'), 'hex')
      and s.expires_at > now() and u.active
    limit 1
  ), '');
$$;

create or replace function public.store_session_admin()
returns boolean language sql stable security definer
set search_path = private, public, pg_temp
as $$ select public.store_session_role() = 'admin'; $$;

create or replace function public.store_login_role(input_password text, input_role text)
returns jsonb language plpgsql security definer
set search_path = private, public, extensions, pg_temp
as $$
declare selected_user public.store_users%rowtype; raw_token text;
begin
  if input_role not in ('admin', 'user') then return jsonb_build_object('authenticated', false); end if;
  select * into selected_user from public.store_users where active and role = input_role order by created_at limit 1;
  if selected_user.id is null or selected_user.password_hash <> extensions.crypt(input_password, selected_user.password_hash) then
    return jsonb_build_object('authenticated', false);
  end if;
  delete from private.store_sessions where expires_at <= now();
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into private.store_sessions(token_hash, user_id, expires_at)
  values (encode(extensions.digest(raw_token, 'sha256'), 'hex'), selected_user.id, now() + interval '7 days');
  return jsonb_build_object('authenticated', true, 'session_token', raw_token, 'role', selected_user.role, 'expires_in_seconds', 604800);
end;
$$;

create or replace function public.store_restore_session_role(expected_role text)
returns jsonb language sql stable security definer
set search_path = private, public, pg_temp
as $$
  select jsonb_build_object('authenticated', public.store_session_valid() and public.store_session_role() = expected_role, 'role', public.store_session_role());
$$;

drop policy if exists store_entries_session_all on public.store_entries;
drop policy if exists store_entries_select on public.store_entries;
drop policy if exists store_entries_insert on public.store_entries;
drop policy if exists store_entries_update on public.store_entries;
drop policy if exists store_entries_delete on public.store_entries;
create policy store_entries_select on public.store_entries for select to anon, authenticated
using ((select public.store_session_valid()) and (deleted_at is null or (select public.store_session_admin())));
create policy store_entries_insert on public.store_entries for insert to anon, authenticated
with check ((select public.store_session_valid()));
create policy store_entries_update on public.store_entries for update to anon, authenticated
using ((select public.store_session_admin()) or ((select public.store_session_valid()) and deleted_at is null))
with check ((select public.store_session_valid()));
create policy store_entries_delete on public.store_entries for delete to anon, authenticated
using ((select public.store_session_admin()));

drop policy if exists store_ledger_session_all on public.store_ledger;
drop policy if exists store_ledger_admin_all on public.store_ledger;
create policy store_ledger_admin_all on public.store_ledger for all to anon, authenticated
using ((select public.store_session_admin())) with check ((select public.store_session_admin()));

drop policy if exists store_audit_insert on public.store_audit;
drop policy if exists store_audit_admin_select on public.store_audit;
create policy store_audit_insert on public.store_audit for insert to anon, authenticated
with check ((select public.store_session_valid()));
create policy store_audit_admin_select on public.store_audit for select to anon, authenticated
using ((select public.store_session_admin()));

revoke all on public.store_audit from public, anon, authenticated;
grant select, insert on public.store_audit to anon, authenticated;
grant execute on function public.store_login_role(text, text), public.store_restore_session_role(text), public.store_session_role(), public.store_session_admin() to anon, authenticated;
