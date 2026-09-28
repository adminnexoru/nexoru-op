-- T036: activation of the owner through the bootstrap invitation (FR-010, FR-011).
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-000000000601', 'owner.t036@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000602', 'owner2.t036@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000603', 'late.t036@example.test', 'authenticated', 'authenticated');
insert into public.invitations (email, role, token_hash, invited_by) values
  ('owner.t036@example.test', 'owner', extensions.digest('token-owner-t036', 'sha256'), null),
  ('owner2.t036@example.test', 'owner', extensions.digest('token-owner2-t036', 'sha256'), null);
insert into public.invitations (email, role, token_hash, invited_by, expires_at) values
  ('late.t036@example.test', 'reader', extensions.digest('token-late-t036', 'sha256'), null, now() - interval '1 minute');

set local role service_role;
select is((select role::text from public.invitation_for_token(extensions.digest('token-owner-t036', 'sha256'))),
  'owner', 'a valid token resolves to its pending invitation');
select is(public.accept_invitation(extensions.digest('token-owner-t036', 'sha256'), '00000000-0000-4000-8000-000000000601', 'Dueña de prueba'),
  'owner'::public.user_role, 'the bootstrap invitation is accepted');
select throws_ok($$ select public.accept_invitation(extensions.digest('token-owner-t036', 'sha256'), '00000000-0000-4000-8000-000000000601', 'Otra vez') $$,
  'P0001', 'invalid_or_expired', 'an accepted invitation cannot be used again');
select throws_ok($$ select public.accept_invitation(extensions.digest('token-owner2-t036', 'sha256'), '00000000-0000-4000-8000-000000000602', 'Segundo dueño') $$,
  '23505', null, 'a second owner is rejected by the single-owner index');
select throws_ok($$ select public.accept_invitation(extensions.digest('token-late-t036', 'sha256'), '00000000-0000-4000-8000-000000000603', 'Tarde') $$,
  'P0001', 'invalid_or_expired', 'an expired invitation is rejected');
reset role;

select is((select role::text || '/' || status::text from public.profiles where id = '00000000-0000-4000-8000-000000000601'),
  'owner/active', 'the owner profile is created active');
select is((select array_agg(action::text order by id) from public.audit_events where target_id = '00000000-0000-4000-8000-000000000601'),
  array['invitation_accepted', 'user_created'], 'acceptance logs invitation_accepted and user_created');

select * from finish();
rollback;
