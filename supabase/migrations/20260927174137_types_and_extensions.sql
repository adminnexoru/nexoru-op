-- T021: extensions, enums and default privileges for feature 001-user-access.

create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- anon never gets privileges on tables created in public from now on (constitution principle I).
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

create type public.user_role as enum ('owner', 'admin', 'collaborator', 'reader');

create type public.user_status as enum ('active', 'deactivated');

create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

create type public.audit_result as enum ('success', 'failure', 'denied');

-- Every event of contracts/audit-and-emails.md (FR-026, FR-031b).
create type public.audit_action as enum (
  'sign_in',
  'sign_in_failed',
  'account_locked',
  'sign_out',
  'session_expired',
  'invitation_sent',
  'invitation_resent',
  'invitation_revoked',
  'invitation_accepted',
  'user_created',
  'user_deactivated',
  'user_reactivated',
  'role_changed',
  'password_reset_forced',
  'mfa_reset_forced',
  'password_reset_requested',
  'password_changed',
  'mfa_enrolled',
  'recovery_code_used',
  'recovery_codes_regenerated',
  'permission_denied',
  'email_failed',
  'auth_sync_failed'
);
