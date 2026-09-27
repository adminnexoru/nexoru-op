-- T015: audit_events is insert-only (FR-028).
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select public.log_audit_event(p_action => 'sign_out', p_result => 'success', p_metadata => '{"t":"T015"}');

set local role service_role;
select throws_ok($$ update public.audit_events set result = 'failure' where metadata->>'t' = 'T015' $$,
  '42501', null, 'service_role cannot UPDATE audit_events');
select throws_ok($$ delete from public.audit_events where metadata->>'t' = 'T015' $$,
  '42501', null, 'service_role cannot DELETE audit_events');
select throws_ok($$ truncate public.audit_events $$,
  '42501', null, 'service_role cannot TRUNCATE audit_events');

set local role authenticated;
select throws_ok($$ insert into public.audit_events (action, result) values ('sign_out', 'success') $$,
  '42501', null, 'authenticated cannot INSERT into audit_events directly');
select throws_ok($$ update public.audit_events set result = 'failure' $$,
  '42501', null, 'authenticated cannot UPDATE audit_events');

-- Even the table owner is stopped by the trigger.
reset role;
select throws_ok($$ delete from public.audit_events where metadata->>'t' = 'T015' $$,
  'P0001', 'audit_events is append-only', 'the append-only trigger rejects DELETE by the owner');

select * from finish();
rollback;
