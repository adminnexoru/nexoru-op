-- T013: every table in public has RLS; anon has no privileges; an aal1 session and a
-- deactivated user see 0 rows in every public table (constitution principle I, FR-020).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Fixtures (fictitious data only).
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-000000000101', 'owner.t013@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000102', 'reader.t013@example.test', 'authenticated', 'authenticated');
insert into public.profiles (id, email, full_name, role, status, deactivated_at) values
  ('00000000-0000-4000-8000-000000000101', 'owner.t013@example.test', 'Dueño de prueba', 'owner', 'active', null),
  ('00000000-0000-4000-8000-000000000102', 'reader.t013@example.test', 'Lector de prueba', 'reader', 'deactivated', now());
select public.log_audit_event(
  p_action => 'sign_in', p_result => 'success',
  p_actor_id => '00000000-0000-4000-8000-000000000101',
  p_target_id => '00000000-0000-4000-8000-000000000101',
  p_metadata => '{"t":"T013"}');

-- Counts the rows the current role can see in every public table (security invoker).
create schema if not exists tests;
create function tests.visible_rows_in_public() returns bigint
language plpgsql as $$
declare r record; c bigint; total bigint := 0;
begin
  -- Tables the role cannot even SELECT count as 0 visible rows (e.g. recovery_codes).
  for r in select c.relname as tablename from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'p')
              and has_table_privilege(current_user, c.oid, 'SELECT') loop
    execute format('select count(*) from public.%I', r.tablename) into c;
    total := total + c;
  end loop;
  return total;
end $$;
grant usage on schema tests to authenticated;
grant execute on function tests.visible_rows_in_public() to authenticated;

select is(
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity),
  0::bigint,
  'every public table has RLS enabled');

select is(
  (select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and has_table_privilege('anon', c.oid, 'SELECT, INSERT, UPDATE, DELETE')),
  0::bigint,
  'anon has no privileges on any public table');

-- aal1 session of the owner (password verified, second factor pending).
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated","aal":"aal1"}', true);
select is(tests.visible_rows_in_public(), 0::bigint, 'an aal1 session sees 0 rows in every public table');

-- Same owner with aal2 does see rows (control case: the fixtures are visible when allowed).
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated","aal":"aal2"}', true);
select ok(tests.visible_rows_in_public() > 0, 'the active owner with aal2 sees rows (control)');

-- Deactivated user with a still-valid aal2 JWT.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated","aal":"aal2"}', true);
select is(tests.visible_rows_in_public(), 0::bigint, 'a deactivated user with a valid JWT sees 0 rows');

reset role;
select * from finish();
rollback;
