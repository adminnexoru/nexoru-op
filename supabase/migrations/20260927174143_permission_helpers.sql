-- T023: permission helpers and the policies of public.profiles.

-- security definer: they are used inside the profiles policies and read profiles themselves;
-- as security invoker Postgres would detect infinite recursion in the policy.
create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active'
  )
$$;

-- Management actions over another user (contracts/permissions.md).
create function public.can_manage(actor public.user_role, target public.user_role)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case actor
    when 'owner' then target <> 'owner'
    when 'admin' then target in ('collaborator', 'reader')
    else false
  end
$$;

-- Roles an author may give through an invitation or a role change. Nobody assigns owner.
create function public.can_assign(actor public.user_role, role public.user_role)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case actor
    when 'owner' then role <> 'owner'
    when 'admin' then role in ('collaborator', 'reader')
    else false
  end
$$;

revoke all on function public.current_user_role() from public, anon;
revoke all on function public.is_active_user() from public, anon;
revoke all on function public.can_manage(public.user_role, public.user_role) from public, anon;
revoke all on function public.can_assign(public.user_role, public.user_role) from public, anon;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.is_active_user() to authenticated, service_role;
grant execute on function public.can_manage(public.user_role, public.user_role) to authenticated, service_role;
grant execute on function public.can_assign(public.user_role, public.user_role) to authenticated, service_role;

-- Every table: nothing is readable without the second factor and an active account.
create policy profiles_require_aal2_active on public.profiles
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2' and (select public.is_active_user()));

-- Owner and admins list every user (FR-018); everyone else only sees their own row.
create policy profiles_select on public.profiles
  for select
  to authenticated
  using (
    (select public.current_user_role()) in ('owner', 'admin')
    or id = (select auth.uid())
  );

create policy profiles_select_auth_hook on public.profiles
  for select
  to supabase_auth_admin
  using (true);
