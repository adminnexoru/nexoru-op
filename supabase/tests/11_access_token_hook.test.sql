-- T034: Custom Access Token Hook (research R5, R6), run as supabase_auth_admin with RLS active.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-000000000401', 'active.t034@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000402', 'gone.t034@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000403', 'noprofile.t034@example.test', 'authenticated', 'authenticated');
insert into public.profiles (id, email, full_name, role, status, deactivated_at) values
  ('00000000-0000-4000-8000-000000000401', 'active.t034@example.test', 'Activo', 'reader', 'active', null),
  ('00000000-0000-4000-8000-000000000402', 'gone.t034@example.test', 'Dado de baja', 'reader', 'deactivated', now());
insert into public.app_sessions (session_id, user_id, last_activity_at, created_at) values
  ('00000000-0000-4000-8000-0000000004a1', '00000000-0000-4000-8000-000000000401', now() - interval '5 minutes', now() - interval '1 hour'),
  ('00000000-0000-4000-8000-0000000004a2', '00000000-0000-4000-8000-000000000401', now() - interval '31 minutes', now() - interval '1 hour');

create function pg_temp.event(user_id uuid, session_id uuid) returns jsonb language sql as $$
  select jsonb_build_object('user_id', user_id, 'authentication_method', 'password',
    'claims', jsonb_build_object('sub', user_id, 'role', 'authenticated', 'aal', 'aal1', 'session_id', session_id)) $$;
create function pg_temp.hook(user_id uuid, session_id uuid) returns jsonb language sql as $$
  select public.custom_access_token_hook(pg_temp.event(user_id, session_id)) $$;
grant execute on all functions in schema pg_temp to supabase_auth_admin;

set local role supabase_auth_admin;

select is(pg_temp.hook('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-0000000004a1') -> 'claims' ->> 'user_role',
  'reader', 'an active user with a recent session gets a token with the user_role claim');
select is(pg_temp.hook('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-0000000004ff') -> 'claims' ->> 'user_role',
  'reader', 'no app session row yet (first token of a sign-in): the token is allowed');
select is((pg_temp.hook('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-0000000004a2') -> 'error' ->> 'http_code')::int,
  403, 'a session idle for more than 30 minutes is refused');
select is((pg_temp.hook('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-0000000004ff') -> 'error' ->> 'http_code')::int,
  403, 'a deactivated user is refused');
select is((pg_temp.hook('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-0000000004ff') -> 'error' ->> 'http_code')::int,
  403, 'a user without profile is refused');
select is(pg_temp.hook('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-0000000004a1') -> 'error',
  null, 'an allowed token carries no error');

reset role;
select * from finish();
rollback;
