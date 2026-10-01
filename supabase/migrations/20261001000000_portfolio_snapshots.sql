-- T027: regenerable portfolio index (data-model §1, research R8, constitution XI).
-- One row at most: the result of the last reading of PROJECTS_ROOT. Deleting it loses nothing:
-- it is rebuilt by reading the projects again. Saving it is not a sensitive account action, so it
-- writes no audit event (documented exception in plan.md).

create table public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  read_at timestamptz not null,
  format_version smallint not null,
  payload jsonb not null,
  created_by uuid not null references auth.users (id) on delete cascade
);

alter table public.portfolio_snapshots enable row level security;

-- Every table: nothing is readable without the second factor and an active account.
create policy portfolio_snapshots_require_aal2_active on public.portfolio_snapshots
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2' and (select public.is_active_user()));

-- Only the owner reads the portfolio.
create policy portfolio_snapshots_select on public.portfolio_snapshots
  for select
  to authenticated
  using ((select public.current_user_role()) = 'owner');

revoke all on public.portfolio_snapshots from anon;
revoke insert, update, delete, truncate on public.portfolio_snapshots from authenticated;

-- The only way to write the index: replaces the previous snapshot in one transaction.
create function public.save_portfolio_snapshot(p_payload jsonb, p_read_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2'
     or not public.is_active_user()
     or public.current_user_role() is distinct from 'owner' then
    raise exception 'only the owner with a second factor can save the portfolio index'
      using errcode = 'insufficient_privilege';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'p_payload must be a JSON object' using errcode = 'invalid_parameter_value';
  end if;
  if p_read_at is null or p_read_at > now() + interval '1 minute' then
    raise exception 'p_read_at cannot be in the future' using errcode = 'invalid_parameter_value';
  end if;

  delete from public.portfolio_snapshots where true;
  insert into public.portfolio_snapshots (read_at, format_version, payload, created_by)
  values (p_read_at, 1, p_payload, auth.uid());
end;
$$;

revoke all on function public.save_portfolio_snapshot(jsonb, timestamptz) from public, anon;
grant execute on function public.save_portfolio_snapshot(jsonb, timestamptz) to authenticated;
