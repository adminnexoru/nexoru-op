-- T042: recovery codes, app sessions (idle/max age) and failed attempts per email + IP.

create table public.recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- crypt(code, gen_salt('bf')); the code itself is never stored.
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index recovery_codes_user on public.recovery_codes (user_id);

create table public.app_sessions (
  -- The session_id claim of the Supabase JWT (= auth.sessions.id).
  session_id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index app_sessions_user on public.app_sessions (user_id);

-- Failed attempts per email + IP (FR-005). No FK: unknown emails are counted too (FR-006).
create table public.auth_attempts (
  email extensions.citext not null,
  ip inet not null,
  failed_count smallint not null default 0 check (failed_count between 0 and 5),
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (email, ip)
);

alter table public.recovery_codes enable row level security;
alter table public.app_sessions enable row level security;
alter table public.auth_attempts enable row level security;

revoke all on public.recovery_codes from anon, authenticated;
revoke all on public.app_sessions from anon, authenticated;
revoke all on public.auth_attempts from anon;
revoke insert, update, delete, truncate on public.auth_attempts from authenticated;

create policy recovery_codes_require_aal2_active on public.recovery_codes
  as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2' and (select public.is_active_user()));

create policy app_sessions_require_aal2_active on public.app_sessions
  as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2' and (select public.is_active_user()));

create policy auth_attempts_require_aal2_active on public.auth_attempts
  as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2' and (select public.is_active_user()));

-- Active locks: the owner sees all; an admin only those of collaborators and readers
-- (contracts/permissions.md, same spirit as FR-029a).
create policy auth_attempts_select on public.auth_attempts
  for select
  to authenticated
  using (
    locked_until > now()
    and (
      (select public.current_user_role()) = 'owner'
      or (
        (select public.current_user_role()) = 'admin'
        and exists (
          select 1 from public.profiles p
          where p.email = auth_attempts.email and p.role in ('collaborator', 'reader')
        )
      )
    )
  );

-- The Custom Access Token Hook reads app sessions (research R6).
grant select on public.app_sessions to supabase_auth_admin;
create policy app_sessions_select_auth_hook on public.app_sessions
  for select to supabase_auth_admin using (true);

-- Daily cleanup. Sessions older than 24 h are beyond the 12 h time-box anyway.
select cron.schedule(
  'nexoru-op-auth-cleanup',
  '15 3 * * *',
  $$
    delete from public.app_sessions where created_at < now() - interval '24 hours';
    delete from public.auth_attempts
      where (locked_until is null or locked_until < now()) and updated_at < now() - interval '24 hours';
  $$
);
