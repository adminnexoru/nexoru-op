-- T024: append-only audit log (FR-026 to FR-030).

create table public.audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  -- Roles at the time of the event, so FR-029a keeps working after role changes.
  actor_role public.user_role,
  attempted_email extensions.citext,
  target_id uuid,
  target_role public.user_role,
  action public.audit_action not null,
  result public.audit_result not null,
  ip inet,
  -- Non-sensitive detail only: never passwords, codes, tokens or links (FR-030).
  metadata jsonb not null default '{}'
);

create index audit_events_occurred_at on public.audit_events (occurred_at desc);
create index audit_events_actor on public.audit_events (actor_id, occurred_at desc);
create index audit_events_target on public.audit_events (target_id, occurred_at desc);
create index audit_events_action on public.audit_events (action, occurred_at desc);

-- Second barrier after the revoked privileges: not even the table owner can rewrite history.
create function public.audit_events_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_events is append-only';
end
$$;

create trigger audit_events_no_update_or_delete
  before update or delete on public.audit_events
  for each row execute function public.audit_events_append_only();

create trigger audit_events_no_truncate
  before truncate on public.audit_events
  for each statement execute function public.audit_events_append_only();

alter table public.audit_events enable row level security;

revoke all on public.audit_events from anon;
revoke insert, update, delete, truncate on public.audit_events from authenticated, service_role;

create policy audit_events_require_aal2_active on public.audit_events
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2' and (select public.is_active_user()));

-- FR-029a: the owner sees everything. An admin sees (a) events where they are the author or
-- the target, and (b) events authored by collaborators/readers, or unauthenticated attempts on
-- their accounts, as long as the target is not the owner or an admin.
create policy audit_events_select on public.audit_events
  for select
  to authenticated
  using (
    (select public.current_user_role()) = 'owner'
    or (
      (select public.current_user_role()) = 'admin'
      and (
        actor_id = (select auth.uid())
        or target_id = (select auth.uid())
        or (
          coalesce(target_role::text, '') not in ('owner', 'admin')
          and (
            actor_role in ('collaborator', 'reader')
            or (actor_id is null and target_role in ('collaborator', 'reader'))
          )
        )
      )
    )
  );

-- The only way to write an event. Called by other security definer functions, by the server
-- with the secret key, and by the postgres role in the emergency procedures (quickstart §8, §9).
create function public.log_audit_event(
  p_action public.audit_action,
  p_result public.audit_result,
  p_actor_id uuid default null,
  p_target_id uuid default null,
  p_attempted_email extensions.citext default null,
  p_ip inet default null,
  p_metadata jsonb default '{}'
)
returns bigint
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_events
    (actor_id, actor_role, attempted_email, target_id, target_role, action, result, ip, metadata)
  values (
    p_actor_id,
    (select role from public.profiles where id = p_actor_id),
    p_attempted_email,
    p_target_id,
    (select role from public.profiles where id = p_target_id),
    p_action,
    p_result,
    p_ip,
    coalesce(p_metadata, '{}')
  )
  returning id
$$;

revoke all on function public.log_audit_event(public.audit_action, public.audit_result, uuid, uuid, extensions.citext, inet, jsonb) from public, anon, authenticated;
grant execute on function public.log_audit_event(public.audit_action, public.audit_result, uuid, uuid, extensions.citext, inet, jsonb) to service_role;
