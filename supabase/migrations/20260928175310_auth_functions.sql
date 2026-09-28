-- T043: sign-in, lockout, sessions, recovery codes and invitation acceptance.
-- All security definer with an empty search_path; grants at the end of the file.

-- Lockout per email + IP (FR-005, research R5) -----------------------------------------

create function public.is_locked(p_email extensions.citext, p_ip inet)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_ip is null then
    raise exception 'ip is required';
  end if;
  return exists (
    select 1 from public.auth_attempts
    where email = p_email and ip = p_ip and locked_until > now()
  );
end
$$;

-- Records a failed attempt. Returns true when the account owner must get the lock notice
-- (at most one every 24 h per account, FR-031a).
create function public.record_auth_failure(p_email extensions.citext, p_ip inet, p_factor text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_count smallint;
  v_until timestamptz;
  v_notify boolean;
begin
  if p_ip is null then
    raise exception 'ip is required';
  end if;
  if p_factor not in ('password', 'totp', 'recovery_code') then
    raise exception 'invalid factor: %', p_factor;
  end if;

  select id into v_target from public.profiles where email = p_email;

  -- An expired lock starts a new count.
  insert into public.auth_attempts as a (email, ip, failed_count, updated_at)
  values (p_email, p_ip, 1, now())
  on conflict (email, ip) do update set
    failed_count = case
      when a.locked_until is not null and a.locked_until <= now() then 1
      else least(a.failed_count + 1, 5)
    end,
    locked_until = case
      when a.locked_until is not null and a.locked_until <= now() then null
      else a.locked_until
    end,
    updated_at = now()
  returning failed_count into v_count;

  perform public.log_audit_event('sign_in_failed', 'failure', null, v_target, p_email, p_ip,
    jsonb_build_object('factor', p_factor));

  if v_count >= 5 then
    update public.auth_attempts
      set locked_until = now() + interval '15 minutes'
      where email = p_email and ip = p_ip and (locked_until is null or locked_until <= now())
      returning locked_until into v_until;

    if v_until is not null then
      perform public.log_audit_event('account_locked', 'success', null, v_target, p_email, p_ip,
        jsonb_build_object('until', v_until));

      if v_target is not null then
        update public.profiles
          set last_lock_notice_at = now()
          where id = v_target
            and (last_lock_notice_at is null or last_lock_notice_at < now() - interval '24 hours')
          returning true into v_notify;
      end if;
    end if;
  end if;

  return coalesce(v_notify, false);
end
$$;

-- Sessions (FR-007, research R6) ---------------------------------------------------------

-- Called right after the second factor succeeds. The session id comes from the JWT, never
-- from a parameter, so nobody can register another user's session.
create function public.record_sign_in(p_ip inet, p_method text default 'totp')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session uuid := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;
  v_email extensions.citext;
begin
  if v_uid is null or coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'second factor required';
  end if;
  if not public.is_active_user() then
    raise exception 'inactive user';
  end if;

  select email into v_email from public.profiles where id = v_uid;

  update public.auth_attempts
    set failed_count = 0, locked_until = null, updated_at = now()
    where email = v_email and ip = p_ip;

  update public.profiles set last_sign_in_at = now() where id = v_uid;

  if v_session is not null then
    insert into public.app_sessions (session_id, user_id)
    values (v_session, v_uid)
    on conflict (session_id) do update set last_activity_at = now();
  end if;

  perform public.log_audit_event('sign_in', 'success', v_uid, v_uid, null, p_ip,
    jsonb_build_object('method', coalesce(p_method, 'totp')));
end
$$;

-- Called by proxy.ts on every AAL2 request: 'ok', 'idle', 'max_age' or 'inactive_user'.
-- Rows are kept after 'idle'/'max_age' so the token hook keeps refusing that session.
create function public.check_session()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session uuid := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;
  v_created timestamptz;
  v_last timestamptz;
begin
  if v_uid is null or not public.is_active_user() then
    return 'inactive_user';
  end if;

  select created_at, last_activity_at into v_created, v_last
    from public.app_sessions
    where session_id = v_session and user_id = v_uid;

  if not found then
    perform public.log_audit_event('session_expired', 'success', v_uid, v_uid, null, null,
      jsonb_build_object('reason', 'idle'));
    return 'idle';
  end if;

  if v_created < now() - interval '12 hours' then
    perform public.log_audit_event('session_expired', 'success', v_uid, v_uid, null, null,
      jsonb_build_object('reason', 'max_age'));
    return 'max_age';
  end if;

  if v_last < now() - interval '30 minutes' then
    perform public.log_audit_event('session_expired', 'success', v_uid, v_uid, null, null,
      jsonb_build_object('reason', 'idle'));
    return 'idle';
  end if;

  if v_last < now() - interval '1 minute' then
    update public.app_sessions set last_activity_at = now() where session_id = v_session;
  end if;

  return 'ok';
end
$$;

-- Second factor and recovery codes (FR-002, FR-003, FR-003a, research R7) -----------------

create function public.complete_mfa_enrollment()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'second factor required';
  end if;
  perform public.log_audit_event('mfa_enrolled', 'success', v_uid, v_uid, null, null, '{}');
end
$$;

-- Replaces the user's codes with 10 new ones and returns them in clear text, once.
create function public.regenerate_recovery_codes()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  codes text[] := '{}';
  code text;
  b int;
begin
  if v_uid is null or coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' or not public.is_active_user() then
    raise exception 'second factor required';
  end if;

  delete from public.recovery_codes where user_id = v_uid;

  for i in 1..10 loop
    code := '';
    while length(code) < 10 loop
      b := get_byte(extensions.gen_random_bytes(1), 0);
      -- Rejection sampling: 248 = 31 * 8, so every character is equally likely.
      if b < 248 then
        code := code || substr(alphabet, (b % 31) + 1, 1);
      end if;
    end loop;
    insert into public.recovery_codes (user_id, code_hash)
    values (v_uid, extensions.crypt(code, extensions.gen_salt('bf', 8)));
    codes := codes || code;
  end loop;

  perform public.log_audit_event('recovery_codes_regenerated', 'success', v_uid, v_uid, null, null, '{}');
  return codes;
end
$$;

create function public.remaining_recovery_codes()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.recovery_codes
  where user_id = (select auth.uid()) and used_at is null
$$;

-- Validates a recovery code (the caller normalizes it). A valid code invalidates ALL the
-- user's codes at once; the new set is issued when the new authenticator is confirmed.
-- An invalid code counts as a failed attempt on email + IP; notify_lock tells the caller to
-- send the lock notice.
create function public.consume_recovery_code(
  p_user_id uuid,
  p_code text,
  p_ip inet,
  out accepted boolean,
  out notify_lock boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email extensions.citext;
  v_code_id uuid;
begin
  accepted := false;
  notify_lock := false;

  select email into v_email from public.profiles where id = p_user_id and status = 'active';
  if v_email is null then
    return;
  end if;

  select id into v_code_id
    from public.recovery_codes
    where user_id = p_user_id and used_at is null and code_hash = extensions.crypt(p_code, code_hash)
    limit 1;

  if v_code_id is null then
    notify_lock := public.record_auth_failure(v_email, p_ip, 'recovery_code');
    return;
  end if;

  delete from public.recovery_codes where user_id = p_user_id;
  perform public.log_audit_event('recovery_code_used', 'success', p_user_id, p_user_id, null, p_ip, '{}');
  accepted := true;
end
$$;

-- Invitations (FR-010, FR-011, research R4) -----------------------------------------------

create function public.invitation_for_token(p_token_hash bytea)
returns table (id uuid, email extensions.citext, role public.user_role)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.email, i.role
  from public.invitations i
  where i.token_hash = p_token_hash and i.status = 'pending' and i.expires_at > now()
$$;

-- Creates the profile of the auth user just created for this invitation.
create function public.accept_invitation(p_token_hash bytea, p_user_id uuid, p_full_name text)
returns public.user_role
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations%rowtype;
  v_auth_email text;
begin
  select * into v_invitation from public.invitations where token_hash = p_token_hash for update;
  if not found or v_invitation.status <> 'pending' or v_invitation.expires_at <= now() then
    raise exception 'invalid_or_expired';
  end if;

  select email into v_auth_email from auth.users where id = p_user_id;
  if v_auth_email is null or lower(v_auth_email) <> lower(v_invitation.email::text) then
    raise exception 'invalid_or_expired';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (p_user_id, v_invitation.email, p_full_name, v_invitation.role);

  update public.invitations set status = 'accepted', accepted_at = now() where id = v_invitation.id;

  perform public.log_audit_event('invitation_accepted', 'success', p_user_id, p_user_id, null, null,
    jsonb_build_object('role', v_invitation.role));
  perform public.log_audit_event('user_created', 'success', p_user_id, p_user_id, null, null,
    jsonb_build_object('role', v_invitation.role));

  return v_invitation.role;
end
$$;

-- Grants ------------------------------------------------------------------------------------

revoke all on function public.is_locked(extensions.citext, inet) from public, anon, authenticated;
revoke all on function public.record_auth_failure(extensions.citext, inet, text) from public, anon, authenticated;
revoke all on function public.consume_recovery_code(uuid, text, inet) from public, anon, authenticated;
revoke all on function public.invitation_for_token(bytea) from public, anon, authenticated;
revoke all on function public.accept_invitation(bytea, uuid, text) from public, anon, authenticated;
grant execute on function public.is_locked(extensions.citext, inet) to service_role;
grant execute on function public.record_auth_failure(extensions.citext, inet, text) to service_role;
grant execute on function public.consume_recovery_code(uuid, text, inet) to service_role;
grant execute on function public.invitation_for_token(bytea) to service_role;
grant execute on function public.accept_invitation(bytea, uuid, text) to service_role;

revoke all on function public.record_sign_in(inet, text) from public, anon;
revoke all on function public.check_session() from public, anon;
revoke all on function public.complete_mfa_enrollment() from public, anon;
revoke all on function public.regenerate_recovery_codes() from public, anon;
revoke all on function public.remaining_recovery_codes() from public, anon;
grant execute on function public.record_sign_in(inet, text) to authenticated;
grant execute on function public.check_session() to authenticated;
grant execute on function public.complete_mfa_enrollment() to authenticated;
grant execute on function public.regenerate_recovery_codes() to authenticated;
grant execute on function public.remaining_recovery_codes() to authenticated;
