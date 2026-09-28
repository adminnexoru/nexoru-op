-- T035: second-factor recovery codes (FR-003, FR-003a, research R7).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-000000000501', 'user.t035@example.test', 'authenticated', 'authenticated');
insert into public.profiles (id, email, full_name, role) values
  ('00000000-0000-4000-8000-000000000501', 'user.t035@example.test', 'Usuario', 'reader');

create temp table codes (n int, code text);
grant all on codes to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000501","role":"authenticated","aal":"aal2"}', true);
select public.regenerate_recovery_codes();  -- a first set that the next call must replace
insert into codes select row_number() over (), c from unnest(public.regenerate_recovery_codes()) c;
select is(public.remaining_recovery_codes(), 10, 'regenerate returns 10 codes and replaces the previous set');
select throws_ok($$ select code_hash from public.recovery_codes $$, '42501', null, 'users cannot read the hashes');
reset role;

select is((select count(*) from codes where code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$'), 10::bigint,
  'codes have 10 characters from an alphabet without ambiguous characters');
select is((select count(*) from public.recovery_codes r join codes c on r.code_hash = c.code),
  0::bigint, 'only hashes are stored, never the codes');
select is((select count(*) from public.audit_events where action = 'recovery_codes_regenerated' and actor_id = '00000000-0000-4000-8000-000000000501'),
  2::bigint, 'each regeneration is logged');

set local role service_role;
select is(public.consume_recovery_code('00000000-0000-4000-8000-000000000501', (select code from codes where n = 1), '192.0.2.5'),
  9, 'a valid code is accepted and returns the remaining count');
select is(public.consume_recovery_code('00000000-0000-4000-8000-000000000501', (select code from codes where n = 1), '192.0.2.5'),
  null::int, 'the same code is not accepted twice');
select is(public.consume_recovery_code('00000000-0000-4000-8000-000000000501', 'ZZZZZZZZZZ', '192.0.2.5'),
  null::int, 'an invalid code is rejected');
reset role;

select is((select failed_count from public.auth_attempts where email = 'user.t035@example.test' and ip = '192.0.2.5'),
  2::smallint, 'each rejected code counts as a failed attempt on email + IP');
select is((select metadata from public.audit_events where action = 'recovery_code_used' and target_id = '00000000-0000-4000-8000-000000000501'),
  '{"remaining": 9}'::jsonb, 'the use is logged with the remaining count');

select * from finish();
rollback;
