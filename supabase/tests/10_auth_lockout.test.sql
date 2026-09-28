-- T033: failed attempts are counted per email + IP (FR-005, FR-006, research R5).
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-000000000301', 'owner.t033@example.test', 'authenticated', 'authenticated');
insert into public.profiles (id, email, full_name, role) values
  ('00000000-0000-4000-8000-000000000301', 'owner.t033@example.test', 'Dueño', 'owner');

-- Four failures from IP A, mixing factors: counted, not locked, no notice.
select is(public.record_auth_failure('owner.t033@example.test', '192.0.2.1', 'password'), false, '1st failure: no notice');
select public.record_auth_failure('owner.t033@example.test', '192.0.2.1', 'totp');
select public.record_auth_failure('owner.t033@example.test', '192.0.2.1', 'password');
select public.record_auth_failure('owner.t033@example.test', '192.0.2.1', 'totp');
select is((select failed_count from public.auth_attempts where email = 'owner.t033@example.test' and ip = '192.0.2.1'),
  4::smallint, 'failures of password and totp add up on the same email + IP');
select is(public.is_locked('owner.t033@example.test', '192.0.2.1'), false, 'not locked after 4 failures');

-- 5th failure (a recovery code) locks that email + IP for 15 minutes and asks for the notice.
select is(public.record_auth_failure('owner.t033@example.test', '192.0.2.1', 'recovery_code'), true,
  '5th failure of an existing account: send the lock notice');
select ok((select locked_until between now() + interval '14 minutes' and now() + interval '16 minutes'
             from public.auth_attempts where email = 'owner.t033@example.test' and ip = '192.0.2.1'),
  'locked for 15 minutes');
select is(public.is_locked('owner.t033@example.test', '192.0.2.1'), true, 'is_locked reports the lock for that IP');
select isnt((select last_lock_notice_at from public.profiles where email = 'owner.t033@example.test'), null,
  'last_lock_notice_at is recorded');
select is((select count(*) from public.audit_events
            where action = 'sign_in_failed' and target_id = '00000000-0000-4000-8000-000000000301' and ip = '192.0.2.1'),
  5::bigint, 'each failure is logged as sign_in_failed');
select is((select array_agg(metadata->>'factor' order by id) from public.audit_events
            where action = 'sign_in_failed' and target_id = '00000000-0000-4000-8000-000000000301'),
  array['password', 'totp', 'password', 'totp', 'recovery_code'], 'the failed factor is recorded');
select is((select count(*) from public.audit_events
            where action = 'account_locked' and target_id = '00000000-0000-4000-8000-000000000301' and ip = '192.0.2.1'),
  1::bigint, 'the lock is logged as account_locked with the IP');

-- Another IP is unaffected (SC-010).
select is(public.is_locked('owner.t033@example.test', '198.51.100.2'), false, 'the same email from another IP is not locked');
select is((select count(*) from public.auth_attempts where email = 'owner.t033@example.test' and ip = '198.51.100.2'),
  0::bigint, 'the other IP has no counter');

-- A second lock within 24 h (from another IP) does not send another notice.
select public.record_auth_failure('owner.t033@example.test', '198.51.100.2', 'password') from generate_series(1, 4);
select is(public.record_auth_failure('owner.t033@example.test', '198.51.100.2', 'password'), false,
  'a second lock within 24 h does not send another notice');

-- Unknown emails are counted and locked the same way, without creating a profile (FR-006).
select public.record_auth_failure('nobody.t033@example.test', '192.0.2.1', 'password') from generate_series(1, 4);
select is(public.record_auth_failure('nobody.t033@example.test', '192.0.2.1', 'password'), false,
  'an unknown email never triggers a notice');
select is(public.is_locked('nobody.t033@example.test', '192.0.2.1'), true, 'an unknown email is locked like a real one');
select is((select count(*) from public.profiles where email = 'nobody.t033@example.test'), 0::bigint, 'no profile is created');
select is((select count(*) from public.audit_events where attempted_email = 'nobody.t033@example.test' and action = 'sign_in_failed'),
  5::bigint, 'failures on an unknown email are logged with attempted_email');

-- An expired lock starts counting from scratch.
update public.auth_attempts set locked_until = now() - interval '1 second'
  where email = 'owner.t033@example.test' and ip = '192.0.2.1';
select public.record_auth_failure('owner.t033@example.test', '192.0.2.1', 'password');
select is((select failed_count from public.auth_attempts where email = 'owner.t033@example.test' and ip = '192.0.2.1'),
  1::smallint, 'after the lock expires the counter restarts');

-- Sentinel IP and invalid input.
select lives_ok($$ select public.record_auth_failure('owner.t033@example.test', '0.0.0.0', 'password') $$,
  'the 0.0.0.0 sentinel IP is accepted');
select throws_ok($$ select public.record_auth_failure('owner.t033@example.test', null, 'password') $$,
  'P0001', 'ip is required', 'a null IP is rejected');

-- Successful sign-in (aal2) resets the counter of its email + IP and opens the app session.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object(
  'sub', '00000000-0000-4000-8000-000000000301', 'role', 'authenticated', 'aal', 'aal2',
  'session_id', '00000000-0000-4000-8000-0000000003aa')::text, true);
select public.record_sign_in('0.0.0.0', 'totp');
reset role;
select is((select coalesce(max(failed_count), 0::smallint) from public.auth_attempts where email = 'owner.t033@example.test' and ip = '0.0.0.0'),
  0::smallint, 'record_sign_in resets the counter of its email + IP');
select ok(
  (select last_sign_in_at is not null from public.profiles where id = '00000000-0000-4000-8000-000000000301')
  and exists (select 1 from public.app_sessions where session_id = '00000000-0000-4000-8000-0000000003aa')
  and exists (select 1 from public.audit_events where action = 'sign_in' and actor_id = '00000000-0000-4000-8000-000000000301'),
  'record_sign_in updates last_sign_in_at, opens the app session and logs sign_in');

select * from finish();
rollback;
