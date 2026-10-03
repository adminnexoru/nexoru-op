-- T015: the regenerable portfolio index (data-model §1, research R8). Only the owner with the
-- second factor reads it, and it is written only through save_portfolio_snapshot.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-000000002001', 'owner.t015@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000002002', 'admin.t015@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000002003', 'reader.t015@example.test', 'authenticated', 'authenticated');
insert into public.profiles (id, email, full_name, role, status, deactivated_at) values
  ('00000000-0000-4000-8000-000000002001', 'owner.t015@example.test', 'Dueño', 'owner', 'active', null),
  ('00000000-0000-4000-8000-000000002002', 'admin.t015@example.test', 'Admin', 'admin', 'active', null),
  ('00000000-0000-4000-8000-000000002003', 'reader.t015@example.test', 'Lector', 'reader', 'deactivated', now());

-- Structure and grants.
select ok((select relrowsecurity from pg_class where oid = 'public.portfolio_snapshots'::regclass),
  'portfolio_snapshots has RLS enabled');
select ok(
  not has_table_privilege('authenticated', 'public.portfolio_snapshots', 'INSERT')
  and not has_table_privilege('authenticated', 'public.portfolio_snapshots', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.portfolio_snapshots', 'DELETE')
  and not has_table_privilege('anon', 'public.portfolio_snapshots', 'SELECT'),
  'authenticated cannot write the table directly and anon cannot read it');
select ok(
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
    where oid = 'public.save_portfolio_snapshot(jsonb, timestamptz, smallint)'::regprocedure),
  'save_portfolio_snapshot is security definer with an empty search_path');
select ok(
  not has_function_privilege('anon', 'public.save_portfolio_snapshot(jsonb, timestamptz, smallint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.save_portfolio_snapshot(jsonb, timestamptz, smallint)', 'EXECUTE')
  and not exists (
    select 1 from pg_proc, aclexplode(proacl) acl
    where oid = 'public.save_portfolio_snapshot(jsonb, timestamptz, smallint)'::regprocedure and acl.grantee = 0),
  'only authenticated (not anon nor PUBLIC) may execute save_portfolio_snapshot');

create schema if not exists tests;
create function tests.snapshot_rows_t015() returns bigint language sql as $$
  select count(*) from public.portfolio_snapshots $$;
grant usage on schema tests to authenticated;
grant execute on function tests.snapshot_rows_t015() to authenticated;

set local role authenticated;

-- The owner with aal2 saves and reads; two saves leave only the last one.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000002001","role":"authenticated","aal":"aal2"}', true);
select lives_ok($$ select public.save_portfolio_snapshot('{"n": 1}'::jsonb, now(), 2::smallint) $$, 'the owner saves a snapshot');
select lives_ok($$ select public.save_portfolio_snapshot('{"n": 2}'::jsonb, now(), 2::smallint) $$, 'the owner saves a second snapshot');
select is(tests.snapshot_rows_t015(), 1::bigint, 'only one snapshot remains');
select is((select payload ->> 'n' from public.portfolio_snapshots), '2', 'the remaining snapshot is the last one');
select is((select format_version from public.portfolio_snapshots), 2::smallint,
  'format_version is the one given by the code (phase 3 bug: it was always 1)');

-- Invalid input.
select throws_ok($$ select public.save_portfolio_snapshot('[1, 2]'::jsonb, now(), 2::smallint) $$, '22023', null,
  'a payload that is not a JSON object is rejected');
select throws_ok($$ select public.save_portfolio_snapshot('{}'::jsonb, now() + interval '5 minutes', 2::smallint) $$, '22023', null,
  'a read_at more than 1 minute in the future is rejected');
select throws_ok($$ select public.save_portfolio_snapshot('{}'::jsonb, now(), 0::smallint) $$, '22023', null,
  'a format_version below 1 is rejected');
select ok(to_regprocedure('public.save_portfolio_snapshot(jsonb, timestamptz)') is null,
  'the old two-argument function no longer exists');

-- Without the second factor, without the owner role or with a deactivated account.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000002001","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.save_portfolio_snapshot('{}'::jsonb, now(), 2::smallint) $$, '42501', null,
  'the owner with aal1 cannot save');
select is(tests.snapshot_rows_t015(), 0::bigint, 'the owner with aal1 sees no snapshot');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000002002","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.save_portfolio_snapshot('{}'::jsonb, now(), 2::smallint) $$, '42501', null,
  'an admin (not the owner) cannot save');
select is(tests.snapshot_rows_t015(), 0::bigint, 'an admin with aal2 sees no snapshot');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000002003","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$ select public.save_portfolio_snapshot('{}'::jsonb, now(), 2::smallint) $$, '42501', null,
  'a deactivated account cannot save');

reset role;
select * from finish();
rollback;
