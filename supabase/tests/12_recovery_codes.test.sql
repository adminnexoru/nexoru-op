-- T035: second-factor recovery codes (FR-003, FR-003a, research R7).
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-000000000501', 'user.t035@example.test', 'authenticated', 'authenticated');
insert into public.profiles (id, email, full_name, role) values
  ('00000000-0000-4000-8000-000000000501', 'user.t035@example.test', 'Usuario', 'reader');

create temp table codes (n int, code text);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000501","role":"authenticated","aal":"aal2"}', true);
select public.regenerate_recovery_codes();  -- a first set that the next call must replace
-- Keep the clear-text codes in a transaction-local setting; the temp table belongs to postgres.
select set_config('tests.codes', array_to_string(public.regenerate_recovery_codes(), ','), true);
select is(public.remaining_recovery_codes(), 10, 'regenerate returns 10 codes and replaces the previous set');
select throws_ok($$ select code_hash from public.recovery_codes $$, '42501', null, 'users cannot read the hashes');
reset role;
insert into codes select row_number() over (), c from unnest(string_to_array(current_setting('tests.codes'), ',')) c;

select is((select count(*) from codes where code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$'), 10::bigint,
  'codes have 10 characters from an alphabet without ambiguous characters');
select is((select count(*) from public.recovery_codes r join codes c on r.code_hash = c.code),
  0::bigint, 'only hashes are stored, never the codes');
select is((select count(*) from public.audit_events where action = 'recovery_codes_regenerated' and actor_id = '00000000-0000-4000-8000-000000000501'),
  2::bigint, 'each regeneration is logged');

set local role service_role;
select is((public.consume_recovery_code('00000000-0000-4000-8000-000000000501', split_part(current_setting('tests.codes'), ',', 1), '192.0.2.5')).accepted,
  true, 'a valid code is accepted');
select is((public.consume_recovery_code('00000000-0000-4000-8000-000000000501', split_part(current_setting('tests.codes'), ',', 1), '192.0.2.5')).accepted,
  false, 'the same code is not accepted twice');
select is((public.consume_recovery_code('00000000-0000-4000-8000-000000000501', split_part(current_setting('tests.codes'), ',', 2), '192.0.2.5')).accepted,
  false, 'using one code invalidates all the others at once (FR-003a)');
reset role;

select is((select count(*) from public.recovery_codes where user_id = '00000000-0000-4000-8000-000000000501'),
  0::bigint, 'no code of the user remains valid after using one');
select is((select failed_count from public.auth_attempts where email = 'user.t035@example.test' and ip = '192.0.2.5'),
  2::smallint, 'each rejected code counts as a failed attempt on email + IP');
select is((select count(*) from public.audit_events where action = 'recovery_code_used' and target_id = '00000000-0000-4000-8000-000000000501'),
  1::bigint, 'the use is logged once');
select is((public.consume_recovery_code('00000000-0000-4000-8000-000000000501', 'ZZZZZZZZZZ', '192.0.2.5')).accepted,
  false, 'an invalid code is rejected');

select * from finish();
rollback;
