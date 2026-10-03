-- Phase 3 (T011 fix): the portfolio index format comes from the code (FORMAT_VERSION in
-- src/lib/portfolio/types.ts). The phase 2 function always stored 1, so after the format moved
-- to 2 every stored index looked outdated and every visit re-read the whole portfolio.

drop function public.save_portfolio_snapshot(jsonb, timestamptz);

create function public.save_portfolio_snapshot(p_payload jsonb, p_read_at timestamptz, p_format_version smallint)
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
  if p_format_version is null or p_format_version < 1 then
    raise exception 'p_format_version must be 1 or greater' using errcode = 'invalid_parameter_value';
  end if;

  delete from public.portfolio_snapshots where true;
  insert into public.portfolio_snapshots (read_at, format_version, payload, created_by)
  values (p_read_at, p_format_version, p_payload, auth.uid());
end;
$$;

revoke all on function public.save_portfolio_snapshot(jsonb, timestamptz, smallint) from public, anon;
grant execute on function public.save_portfolio_snapshot(jsonb, timestamptz, smallint) to authenticated;
