# Data Model: Acceso seguro y administración de usuarios

**Feature**: `001-user-access` | **Fecha**: 2026-09-26

Todas las tablas (6) viven en el esquema `public` y tienen **RLS activado**. Los identificadores y
valores de enumeraciones están en inglés (principio X). Los usuarios de Auth
(`auth.users`, `auth.mfa_factors`, `auth.sessions`) los gestiona Supabase; aquí solo se
modelan las tablas propias.

## Reglas comunes a todas las tablas

- Política **restrictiva** para `authenticated`: `auth.jwt()->>'aal' = 'aal2'` y
  `public.is_active_user()`. Sin segundo factor completado o con la cuenta dada de baja, no se
  lee nada.
- Sin políticas de `insert`, `update` ni `delete` para `authenticated`: toda escritura pasa por
  funciones `security definer` (ver [contracts/actions.md](contracts/actions.md)).
- `anon` no tiene acceso a ninguna tabla.

## Enumeraciones

| Tipo | Valores |
|------|---------|
| `user_role` | `owner` (Dueño), `admin` (Administrador), `collaborator` (Colaborador), `reader` (Lector) |
| `user_status` | `active` (Activo), `deactivated` (Dado de baja) |
| `invitation_status` | `pending`, `accepted`, `revoked`, `expired` (derivado: `pending` con `expires_at < now()`) |
| `audit_action` | Ver [contracts/audit-and-emails.md](contracts/audit-and-emails.md) |
| `audit_result` | `success`, `failure`, `denied` |

## `profiles`

Una fila por usuario con cuenta creada (invitación aceptada o Dueño activado). La clave es la
misma que `auth.users.id`.

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | uuid PK | FK → `auth.users.id` |
| `email` | citext, único | Copia del correo de Auth, en minúsculas |
| `full_name` | text | 1–120 caracteres |
| `role` | `user_role` | Índice único parcial `where role = 'owner'`: **exactamente un Dueño** |
| `status` | `user_status` | Por defecto `active`. El Dueño no puede pasar a `deactivated` (check + función) |
| `last_lock_notice_at` | timestamptz null | Último aviso `notice_account_locked` enviado. Como mucho uno cada 24 h por cuenta, para no agotar el cupo diario de correo (research R3) |
| `created_at` | timestamptz | |
| `last_sign_in_at` | timestamptz null | Se actualiza al completar AAL2 |
| `deactivated_at` | timestamptz null | Se rellena con la baja y se vacía con la reactivación |

**Lectura (RLS)**: Dueño y Administrador ven todas las filas (listado de usuarios, FR-018).
Colaborador y Lector solo ven la suya. Política adicional `for select to supabase_auth_admin
using (true)` para que el Custom Access Token Hook pueda leer el estado (sin ella, RLS le oculta
todas las filas).

**Registro del segundo factor**: no se guarda en `profiles`. Se deduce del estado de Supabase
MFA: un usuario sin factores TOTP verificados debe ir a `/mfa/enroll`. Esto cubre la cuenta
recién creada, el reinicio forzado del 2FA y el uso de un código de recuperación, porque los dos
últimos borran los factores. Así el proxy no necesita leer `profiles` con una sesión AAL1, algo
que la política restrictiva AAL2 impide.

**Estados**:

```text
(invitación aceptada) ──► active ──baja──► deactivated ──reactivar──► active
```

El bloqueo por intentos fallidos no es un estado del perfil: vive en `auth_attempts`, por correo
+ IP. En el listado de usuarios, "Bloqueado temporalmente" se muestra cuando el correo tiene al
menos una fila de `auth_attempts` con `locked_until > now()` (FR-018).

## `invitations`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | uuid PK | |
| `email` | citext | Único entre invitaciones `pending`. No puede coincidir con un `profiles.email` existente |
| `role` | `user_role` | Nunca `owner`, salvo la invitación de arranque del Dueño (creada por el script de puesta en marcha) |
| `token_hash` | bytea | SHA-256 del token enviado por correo. El token en claro no se guarda |
| `invited_by` | uuid null | FK → `profiles.id`. Es null solo en la invitación de arranque |
| `status` | `invitation_status` | |
| `expires_at` | timestamptz | `created_at + 7 días` |
| `created_at`, `accepted_at`, `revoked_at` | timestamptz | |

**Transiciones**: `pending → accepted` (acepta) · `pending → revoked` (se revoca, se reenvía,
que revoca la anterior y crea una nueva, o se da de baja al usuario) · `pending → expired` (por
tiempo).

**Lectura (RLS)**: Dueño todas. Administrador solo las de rol `collaborator` o `reader`.

## `auth_attempts`

Contador de intentos fallidos por **correo + IP** (FR-005, research R5). Existe también para
correos sin usuario, para que el comportamiento sea idéntico (FR-006).

| Campo | Tipo | Reglas |
|-------|------|--------|
| `email` | citext | Correo intentado, en minúsculas. **Sin FK** a `profiles` |
| `ip` | inet | IP tomada de las cabeceras de Vercel (research R5) |
| `failed_count` | smallint | "0–5". Vuelve a 0 con un acceso exitoso desde esa IP |
| `locked_until` | timestamptz null | Si es `> now()`, se rechazan los intentos de ese correo desde esa IP |
| `updated_at` | timestamptz | |

PK `(email, ip)`. El mismo job diario de `pg_cron` que limpia `app_sessions` borra las filas
sin bloqueo vigente y sin cambios en 24 h.

**IP ausente**: si la petición no trae IP, la app usa la IP centinela `0.0.0.0` (research R5).
`ip` nunca es nula.

**Lectura (RLS)**: política restrictiva común (AAL2 y cuenta activa). El Dueño lee las filas con
bloqueo vigente. El Administrador lee solo las filas con bloqueo vigente cuyo `email` pertenece a
un perfil de rol `collaborator` o `reader`: no ve bloqueos del Dueño, de otros Administradores ni
de correos sin usuario, igual que en FR-029a. Colaborador y Lector no leen nada. Solo escriben
las funciones `security definer`.

## `recovery_codes`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | uuid PK | |
| `user_id` | uuid | FK → `profiles.id` |
| `code_hash` | text | `crypt(code, gen_salt('bf'))` |
| `used_at` | timestamptz null | Un código usado no vuelve a aceptarse |
| `created_at` | timestamptz | |

Cada usuario tiene como mucho 10 códigos vigentes: regenerar borra los anteriores. **Lectura
(RLS)**: nadie lee hashes; el usuario solo puede consultar cuántos le quedan, mediante la
función `remaining_recovery_codes()`.

## `app_sessions`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `session_id` | uuid PK | Claim `session_id` del JWT (= `auth.sessions.id`) |
| `user_id` | uuid | FK → `profiles.id` |
| `last_activity_at` | timestamptz | Se actualiza como máximo una vez por minuto |
| `created_at` | timestamptz | |

El Custom Access Token Hook rechaza el refresco si `now() - last_activity_at > 30 min`. Si la
fila no existe (el primer token de un inicio de sesión se emite antes de `record_sign_in`), el
hook **permite** el token. Una tarea programada (`pg_cron`, diaria) borra filas de más de 24 h.
**Lectura (RLS)**: ninguna desde la app; política `for select to supabase_auth_admin using
(true)` para el hook.

## `audit_events`

**Solo inserción**: sin políticas de `update` ni `delete` para nadie, `revoke update, delete`
incluso para `service_role`, y un trigger que rechaza `UPDATE` y `DELETE` como segunda barrera.

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | bigint identity PK | |
| `occurred_at` | timestamptz | `default now()` |
| `actor_id` | uuid null | Autor. Null en intentos sin usuario autenticado |
| `actor_role` | `user_role` null | Rol del autor en el momento del evento (para aplicar FR-029a aunque el rol cambie después) |
| `attempted_email` | citext null | Correo intentado cuando no hay autor |
| `target_id` | uuid null | Usuario afectado |
| `target_role` | `user_role` null | Rol del afectado en el momento del evento |
| `action` | `audit_action` | |
| `result` | `audit_result` | |
| `ip` | inet null | |
| `metadata` | jsonb | Detalle no sensible (p. ej. rol anterior y nuevo, factor que falló). **Prohibido** guardar contraseñas, códigos o tokens (FR-030) |

Índices: `(occurred_at desc)`, `(actor_id, occurred_at desc)`, `(target_id, occurred_at desc)`,
`(action, occurred_at desc)`.

**Lectura (RLS, FR-029a)**:

- **Dueño**: todos los eventos.
- **Administrador**:
  - (a) eventos donde `actor_id` o `target_id` es él mismo, y
  - (b) eventos donde `actor_role` ∈ {collaborator, reader} **o**, si no hay autor,
    `target_role` ∈ {collaborator, reader}, siempre que `target_role` no sea `owner` ni `admin`.
  - Nada más. En particular, no ve los intentos sobre correos que no pertenecen a ningún usuario
    (`actor_id` y `target_id` nulos).
- **Colaborador / Lector**: nada.

## Asignaciones (Colaborador)

Sin tabla en esta feature: no hay elementos asignables todavía (Assumptions de la spec). El
primer módulo de negocio con elementos editables añadirá su tabla de asignaciones y sus
políticas RLS.

## Funciones auxiliares (SQL)

`current_user_role()` e `is_active_user()` son `security definer stable set search_path = ''`.
Se usan en la política de `profiles` y a la vez leen `profiles`: sin `security definer`, Postgres
detecta recursión infinita en la política.

| Función | Uso |
|---------|-----|
| `current_user_role()` | Rol del usuario actual leído de `profiles` (no del JWT) |
| `is_active_user()` | `status = 'active'` |
| `can_manage(actor_role, target_role)` / `can_assign(actor_role, role)` | Matriz de [contracts/permissions.md](contracts/permissions.md) |
| `check_session(session_id)` | La llama `proxy.ts` en cada petición AAL2. Devuelve `ok`, `idle` (más de 30 min sin actividad), `max_age` (más de 12 h desde `app_sessions.created_at`) o `inactive_user` (dado de baja). Si es `ok`, actualiza `last_activity_at` solo si tiene más de 1 min. En los demás casos registra `session_expired` (o nada si es `inactive_user`, porque la baja ya se registró) |
| `custom_access_token_hook(event)` | Sin perfil: **deniega**. Cuenta dada de baja: deniega. (No aplica el bloqueo por intentos, porque el hook no conoce la IP; ver research R5.) Fila de `app_sessions` inactiva más de 30 min: deniega. Sin fila de `app_sessions`: permite. Añade el claim informativo `user_role` |
| `log_audit_event(p_action audit_action, p_result audit_result, p_actor_id uuid default null, p_target_id uuid default null, p_attempted_email citext default null, p_ip inet default null, p_metadata jsonb default '{}')` | Única vía de escritura en `audit_events`. Rellena `actor_role` y `target_role` desde `profiles` en el momento del evento. `security definer`; sin grant a `authenticated`; grant a `service_role`. El rol `postgres` del SQL Editor puede llamarla (procedimientos manuales de quickstart §8 y §9) |
