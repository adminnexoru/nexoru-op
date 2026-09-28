-- T022: one row per user with an account. Policies live in permission_helpers, because they
-- use functions that read this table.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  email extensions.citext not null unique,
  full_name text not null check (char_length(full_name) between 1 and 120),
  role public.user_role not null,
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  deactivated_at timestamptz,
  -- There is always an active owner (FR-013, FR-017).
  constraint profiles_owner_always_active check (not (role = 'owner' and status = 'deactivated'))
);

-- Exactly one owner.
create unique index profiles_single_owner on public.profiles (role) where role = 'owner';

alter table public.profiles enable row level security;

-- Writes only through security definer functions.
revoke all on public.profiles from anon;
revoke insert, update, delete, truncate on public.profiles from authenticated;

-- The Custom Access Token Hook reads the account status (research R5, R6).
grant select on public.profiles to supabase_auth_admin;
