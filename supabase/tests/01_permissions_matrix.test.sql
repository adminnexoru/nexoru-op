-- T014: can_manage and can_assign match specs/001-user-access/contracts/permissions.md.
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select set_eq(
  $$ select a::text, t::text
       from unnest(enum_range(null::public.user_role)) a,
            unnest(enum_range(null::public.user_role)) t
      where public.can_manage(a, t) $$,
  $$ values ('owner', 'admin'), ('owner', 'collaborator'), ('owner', 'reader'),
            ('admin', 'collaborator'), ('admin', 'reader') $$,
  'can_manage(actor, target) allows exactly the pairs of the permissions matrix');

select set_eq(
  $$ select a::text, r::text
       from unnest(enum_range(null::public.user_role)) a,
            unnest(enum_range(null::public.user_role)) r
      where public.can_assign(a, r) $$,
  $$ values ('owner', 'admin'), ('owner', 'collaborator'), ('owner', 'reader'),
            ('admin', 'collaborator'), ('admin', 'reader') $$,
  'can_assign(actor, role) allows exactly the roles each author may assign; nobody assigns owner');

select * from finish();
rollback;
