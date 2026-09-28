-- T033 (moved from T016): who sees lockouts in auth_attempts (FR-018, FR-029a, contracts/permissions.md).
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-000000000701', 'owner.t014@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000702', 'admin.t014@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000703', 'admin2.t014@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000704', 'reader.t014@example.test', 'authenticated', 'authenticated');
insert into public.profiles (id, email, full_name, role) values
  ('00000000-0000-4000-8000-000000000701', 'owner.t014@example.test', 'Dueño', 'owner'),
  ('00000000-0000-4000-8000-000000000702', 'admin.t014@example.test', 'Admin', 'admin'),
  ('00000000-0000-4000-8000-000000000703', 'admin2.t014@example.test', 'Admin 2', 'admin'),
  ('00000000-0000-4000-8000-000000000704', 'reader.t014@example.test', 'Lector', 'reader');
insert into public.auth_attempts (email, ip, failed_count, locked_until) values
  ('owner.t014@example.test', '192.0.2.20', 5, now() + interval '10 minutes'),
  ('admin2.t014@example.test', '192.0.2.21', 5, now() + interval '10 minutes'),
  ('reader.t014@example.test', '192.0.2.22', 5, now() + interval '10 minutes'),
  ('nobody.t014@example.test', '192.0.2.23', 5, now() + interval '10 minutes'),
  ('reader.t014@example.test', '192.0.2.24', 2, null);

create schema if not exists tests;
create function tests.visible_locks_t014() returns text[] language sql as $$
  select coalesce(array_agg(email::text order by email), '{}') from public.auth_attempts where email like '%.t014@example.test' $$;
grant usage on schema tests to authenticated;
grant execute on function tests.visible_locks_t014() to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000701","role":"authenticated","aal":"aal2"}', true);
select is(tests.visible_locks_t014(),
  array['admin2.t014@example.test', 'nobody.t014@example.test', 'owner.t014@example.test', 'reader.t014@example.test'],
  'the owner sees every active lock (and no rows without a lock)');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000702","role":"authenticated","aal":"aal2"}', true);
select is(tests.visible_locks_t014(), array['reader.t014@example.test'],
  'an admin only sees locks of collaborators and readers');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000704","role":"authenticated","aal":"aal2"}', true);
select is(tests.visible_locks_t014(), '{}'::text[], 'a reader sees no locks');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000701","role":"authenticated","aal":"aal1"}', true);
select is(tests.visible_locks_t014(), '{}'::text[], 'the owner with aal1 sees no locks');

reset role;
select * from finish();
rollback;
