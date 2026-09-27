-- T016: audit log visibility per role (FR-029, FR-029a).
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- Fixtures (fictitious). O = owner, A/A2 = admins, C = collaborator, R = reader.
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-000000000201', 'owner.t016@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000202', 'admin.t016@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000203', 'admin2.t016@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000204', 'collab.t016@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000205', 'reader.t016@example.test', 'authenticated', 'authenticated');
insert into public.profiles (id, email, full_name, role) values
  ('00000000-0000-4000-8000-000000000201', 'owner.t016@example.test', 'Dueño', 'owner'),
  ('00000000-0000-4000-8000-000000000202', 'admin.t016@example.test', 'Admin A', 'admin'),
  ('00000000-0000-4000-8000-000000000203', 'admin2.t016@example.test', 'Admin B', 'admin'),
  ('00000000-0000-4000-8000-000000000204', 'collab.t016@example.test', 'Colaborador', 'collaborator'),
  ('00000000-0000-4000-8000-000000000205', 'reader.t016@example.test', 'Lector', 'reader');

-- e1 owner acts on collaborator         -> admin A: hidden (author is the owner)
select public.log_audit_event('role_changed', 'success', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000204', null, null, '{"t":"T016","e":1}');
-- e2 admin A acts on collaborator       -> visible (A is the author)
select public.log_audit_event('role_changed', 'success', '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000204', null, null, '{"t":"T016","e":2}');
-- e3 admin A2 acts on reader            -> hidden (another admin is the author)
select public.log_audit_event('user_deactivated', 'success', '00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000205', null, null, '{"t":"T016","e":3}');
-- e4 collaborator signs in              -> visible
select public.log_audit_event('sign_in', 'success', '00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000204', null, null, '{"t":"T016","e":4}');
-- e5 failed attempt on the reader       -> visible (no author, target is a reader)
select public.log_audit_event('sign_in_failed', 'failure', null, '00000000-0000-4000-8000-000000000205', 'reader.t016@example.test', '192.0.2.10', '{"t":"T016","e":5}');
-- e6 failed attempt on an unknown email -> hidden (no author, no target)
select public.log_audit_event('sign_in_failed', 'failure', null, null, 'nobody.t016@example.test', '192.0.2.11', '{"t":"T016","e":6}');
-- e7 owner changes admin A's role       -> visible (A is the target)
select public.log_audit_event('role_changed', 'success', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000202', null, null, '{"t":"T016","e":7}');
-- e8 failed attempt on the owner        -> hidden
select public.log_audit_event('sign_in_failed', 'failure', null, '00000000-0000-4000-8000-000000000201', 'owner.t016@example.test', '192.0.2.12', '{"t":"T016","e":8}');
-- e9 collaborator acts without target   -> visible
select public.log_audit_event('recovery_codes_regenerated', 'success', '00000000-0000-4000-8000-000000000204', null, null, null, '{"t":"T016","e":9}');

create schema if not exists tests;
create function tests.visible_t016() returns int[] language sql as $$
  select coalesce(array_agg((metadata->>'e')::int order by (metadata->>'e')::int), '{}')
    from public.audit_events where metadata->>'t' = 'T016' $$;
grant usage on schema tests to authenticated;
grant execute on function tests.visible_t016() to authenticated;

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000201","role":"authenticated","aal":"aal2"}', true);
select is(tests.visible_t016(), array[1,2,3,4,5,6,7,8,9], 'the owner sees every event');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000202","role":"authenticated","aal":"aal2"}', true);
select is(tests.visible_t016(), array[2,4,5,7,9], 'an admin sees only own events and those of collaborators and readers');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000204","role":"authenticated","aal":"aal2"}', true);
select is(tests.visible_t016(), '{}'::int[], 'a collaborator sees nothing');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000205","role":"authenticated","aal":"aal2"}', true);
select is(tests.visible_t016(), '{}'::int[], 'a reader sees nothing');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000201","role":"authenticated","aal":"aal1"}', true);
select is(tests.visible_t016(), '{}'::int[], 'the owner with aal1 sees nothing');

reset role;
select is(
  (select array_agg(actor_role::text || '>' || coalesce(target_role::text, '-') order by (metadata->>'e')::int)
     from public.audit_events where metadata->>'t' = 'T016' and (metadata->>'e')::int in (1, 7)),
  array['owner>collaborator', 'owner>admin'],
  'log_audit_event stores the roles at the time of the event');

select * from finish();
rollback;
