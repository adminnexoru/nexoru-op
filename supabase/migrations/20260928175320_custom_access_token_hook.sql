-- T044: Custom Access Token Hook (research R5, R6). Runs as supabase_auth_admin on every
-- token issuance, including refreshes: refuses tokens to users without profile, deactivated
-- users and sessions idle for more than 30 minutes; adds the informative user_role claim.
-- (The email + IP lockout is enforced by the server actions: the hook does not know the IP.)

create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_status public.user_status;
  v_role public.user_role;
  v_last timestamptz;
begin
  select status, role into v_status, v_role
    from public.profiles
    where id = (event ->> 'user_id')::uuid;

  if not found or v_status <> 'active' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'La cuenta no está disponible.'));
  end if;

  select last_activity_at into v_last
    from public.app_sessions
    where session_id = nullif(event -> 'claims' ->> 'session_id', '')::uuid;

  -- No row yet: first token of a sign-in (record_sign_in has not run): allowed.
  if found and v_last < now() - interval '30 minutes' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'La sesión se cerró por inactividad.'));
  end if;

  return jsonb_set(event, '{claims,user_role}', to_jsonb(v_role::text));
end
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
