-- T041: invitations with a 7-day, single-use token (FR-009 to FR-012, research R4).

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null,
  role public.user_role not null,
  -- SHA-256 of the token sent by email; the token itself is never stored.
  token_hash bytea not null unique,
  -- Null only for the bootstrap invitation of the owner (scripts/bootstrap-owner.ts).
  invited_by uuid references public.profiles (id) on delete restrict,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

-- One pending invitation per email.
create unique index invitations_one_pending_per_email on public.invitations (email) where status = 'pending';

alter table public.invitations enable row level security;

revoke all on public.invitations from anon;
revoke insert, update, delete, truncate on public.invitations from authenticated;

create policy invitations_require_aal2_active on public.invitations
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2' and (select public.is_active_user()));

create policy invitations_select on public.invitations
  for select
  to authenticated
  using (
    (select public.current_user_role()) = 'owner'
    or ((select public.current_user_role()) = 'admin' and role in ('collaborator', 'reader'))
  );
