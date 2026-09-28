---
description: "Lista de tareas de la feature 001-user-access"
---

# Tasks: Acceso seguro y administración de usuarios

**Input**: Documentos de diseño en `specs/001-user-access/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: obligatorios (principio VI y petición del Dueño). En cada historia **las pruebas se
escriben primero y deben fallar** antes de implementar.

**Organization**: una fase por historia de usuario, en orden de prioridad. Cada historia se puede
probar por separado.

## Formato: `[ID] [P?] [Story?] [MANUAL?] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes).
- **[US1]…[US5]**: historia de usuario de la spec a la que pertenece.
- **[MANUAL]**: la hace el Dueño fuera de VS Code (paneles de Supabase, Resend, Vercel, GitHub o
  DNS, o comandos que piden sus credenciales). Claude no la ejecuta; se detiene y avisa.

## Convenciones

- Proyecto único Next.js en la raíz con `src/`; SQL en `supabase/migrations/`, pgTAP en
  `supabase/tests/`, Vitest en `tests/unit/`, Playwright en `tests/e2e/`.
- Las migraciones se nombran `supabase/migrations/<timestamp>_<nombre>.sql` y se crean con
  `npx supabase migration new <nombre>`; aquí se cita solo `<nombre>`.
- Toda función SQL `security definer` lleva `set search_path = ''` y nombres calificados
  (`public.`, `auth.`); `revoke execute ... from public, anon` y `grant` explícito solo a quien
  la usa.
- Código, identificadores y commits en inglés; textos de interfaz y correos en español.
- Un commit por tarea o grupo lógico (mensajes en inglés, estilo `feat:`, `test:`, `chore:`).

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: crear el proyecto y las herramientas. El desarrollo usa **solo Supabase local**: no se
contrata nada de pago hasta la Phase 4. Las tareas [MANUAL] de esta fase son gratuitas, no
bloquean el desarrollo local y conviene empezarlas ya: la verificación DNS de Resend puede tardar
horas.

- [X] T001 Crear la app Next.js 16 en la raíz del repo con `npx create-next-app@latest` (TypeScript, App Router, `src/`, Tailwind, ESLint, alias `@/*`, npm), generándola en una carpeta temporal y moviendo los archivos para **no sobrescribir** `CLAUDE.md`, `.gitignore`, `.specify/`, `.claude/` ni `specs/`; activar `"strict": true` en `tsconfig.json`; `<html lang="es">` en `src/app/layout.tsx`
- [X] T002 Añadir scripts en `package.json`: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (vitest run), `test:e2e` (playwright test), `db:test` (`supabase test db`), `bootstrap:owner` (`tsx scripts/bootstrap-owner.ts`); `"engines": { "node": ">=24" }`
- [X] T003 Instalar dependencias en `package.json`: `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `nodemailer`, `server-only`; dev: `supabase` (CLI), `vitest`, `@playwright/test`, `otplib`, `tsx`, `@types/nodemailer`
- [X] T004 [P] Inicializar shadcn/ui (`components.json`) y añadir en `src/components/ui/`: button, input, label, card, table, dialog, alert-dialog, select, badge, dropdown-menu, input-otp, sonner, alert
- [X] T005 [P] Configurar Vitest en `vitest.config.ts` (entorno node, alias `@/*`, incluye `tests/unit/**/*.test.ts`)
- [X] T006 [P] Configurar Playwright en `playwright.config.ts` (solo Chromium, `baseURL` `http://localhost:3000`, `webServer` con `npm run build && npm run start`, `workers: 1` porque las pruebas comparten la base local)
- [X] T007 Inicializar Supabase local con `npx supabase init` y ajustar `supabase/config.toml` según research R3–R6 y quickstart §1: `[auth] enable_signup = false`, `site_url = "http://localhost:3000"`, `additional_redirect_urls = ["http://localhost:3000/**"]`, `jwt_expiry = 300`, `minimum_password_length = 12`; `[auth.email] enable_confirmations = true`, `otp_expiry = 3600`; `[auth.mfa.totp] enroll_enabled = true`, `verify_enabled = true`; `[auth.sessions] timebox = "12h"`; sin secretos (usar `env()` si hiciera falta)
- [X] T008 [P] Crear `.env.example` solo con los nombres (sin valores) de: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, con comentarios en español que indiquen de dónde sale cada valor en local (`supabase status`, Mailpit en `127.0.0.1:54325` sin usuario) y en producción (quickstart §4)
- [X] T009 [P] Crear `.github/workflows/ci.yml`: en cada push a cualquier rama (y manual con `workflow_dispatch`), Node 24, `npm ci`, `lint`, `typecheck`, `test`, `npx supabase start`, `npx supabase db reset`, `npm run db:test`, instalar navegadores de Playwright y `npm run test:e2e` con las variables tomadas de `supabase status -o env`; **sin secretos de GitHub**
- [X] T010 [P] [MANUAL] Resend: crear la cuenta con admin@nexoru.ai, añadir el dominio `nexoru.ai` y crear en el DNS los registros DKIM (`resend._domainkey`), MX y TXT (`send`) y `_dmarc` solo si no existe, sin tocar el MX raíz (quickstart §2.1–2.2 y §3)
- [X] T011 [P] [MANUAL] GitHub: crear el ruleset `main` en `adminnexoru/nexoru-op` (gratis porque el repo es público): bloquear borrado y force push, y exigir PR (quickstart §7, research R11 en `specs/001-user-access/`). El check de CI se añade en T065, cuando ya exista
- [X] T012 [P] [MANUAL] GitHub: en **Settings → Advanced Security** de `adminnexoru/nexoru-op`, activar **Secret scanning** y **Push protection**, que rechaza un push si detecta una llave (quickstart §7, research R11)

**Checkpoint**: `npm run dev` levanta la página por defecto, `npx supabase start` funciona y CI corre (vacío) en verde.

---

## Phase 2: Foundational (prerrequisitos que bloquean todas las historias)

**Purpose**: tipos, tablas base, bitácora, matriz de permisos, clientes de Supabase y correo.

**⚠️ CRITICAL**: ninguna historia empieza hasta cerrar esta fase.

### Pruebas primero (deben fallar)

- [X] T013 [P] Test pgTAP en `supabase/tests/00_rls_enabled.test.sql` (con `create extension if not exists pgtap with schema extensions`): toda tabla de `public` tiene RLS activado; `anon` no puede leer ni escribir ninguna; una sesión `authenticated` con claim `aal = 'aal1'` obtiene **0 filas** en cada tabla de `public`, y un usuario con JWT válido pero `status = 'deactivated'` también (principio I, FR-020)
- [X] T014 [P] Test pgTAP en `supabase/tests/01_permissions_matrix.test.sql`: `public.can_manage(actor_role, target_role)` y `public.can_assign(actor_role, role)` devuelven exactamente la matriz de `specs/001-user-access/contracts/permissions.md`, en todas las combinaciones de los 4 roles
- [X] T015 [P] Test pgTAP en `supabase/tests/02_audit_immutability.test.sql`: `UPDATE` y `DELETE` sobre `public.audit_events` fallan como `authenticated` y como `service_role`; `authenticated` no puede insertar directamente
- [X] T016 [P] Test pgTAP en `supabase/tests/03_audit_visibility.test.sql`: con eventos de ejemplo, el Dueño ve todos; un Administrador ve solo (a) aquellos donde es `actor_id` o `target_id` y (b) los de `actor_role` ∈ {collaborator, reader} (o, sin autor, `target_role` ∈ {collaborator, reader}) cuyo `target_role` no es owner ni admin; no ve eventos con `actor_id` y `target_id` nulos; Colaborador y Lector no ven nada; una sesión con `aal1` no ve nada (FR-029a)
- [X] T017 [P] Test Vitest en `tests/unit/permissions.test.ts`: `canManage` y `canAssign` de `src/lib/permissions.ts` coinciden con la matriz de `contracts/permissions.md`
- [X] T018 [P] Test Vitest en `tests/unit/password.test.ts`: `validatePassword` rechaza menos de 12 caracteres, rechaza contraseñas presentes en la respuesta simulada de HIBP (se envían solo los 5 primeros caracteres del SHA-1) y acepta si HIBP no responde (fallo abierto registrado en consola, sin la contraseña)
- [X] T019 [P] Test Vitest en `tests/unit/request.test.ts`: `getClientIp()` devuelve `x-real-ip` si existe, si no el primer valor de `x-forwarded-for`, y `"0.0.0.0"` si no hay ninguna o no es una IP válida
- [X] T020 [P] Test Vitest en `tests/unit/email-templates.test.ts`: cada plantilla de `contracts/audit-and-emails.md` produce asunto, texto y HTML en español; ninguna plantilla `notice_*` contiene URLs de acceso; las plantillas nunca incluyen contraseñas ni códigos

### Implementación

- [X] T021 Migración `types_and_extensions` en `supabase/migrations/`: extensiones `citext`, `pgcrypto` y `pg_cron`; enums `user_role` (`owner`, `admin`, `collaborator`, `reader`), `user_status` (`active`, `deactivated`), `invitation_status` (`pending`, `accepted`, `revoked`, `expired`), `audit_result` (`success`, `failure`, `denied`) y `audit_action` con **todos** los valores de `contracts/audit-and-emails.md`
- [X] T022 Migración `profiles`: tabla según data-model con `id` uuid PK FK → `auth.users.id` (on delete restrict), `email` citext único, `full_name` text "1–120 caracteres" (check), `role` user_role, índice único parcial `where role = 'owner'` ("exactamente un Dueño"), `status` user_status default `active`, `last_lock_notice_at` timestamptz null, `created_at`, `last_sign_in_at` null, `deactivated_at` null; check que impide `role = 'owner' and status = 'deactivated'`; RLS activada; política **restrictiva** para `authenticated` `(select auth.jwt()->>'aal') = 'aal2' and public.is_active_user()`; `select`: Dueño/Administrador todas las filas, resto solo la propia; política `for select to supabase_auth_admin using (true)` para el hook; sin políticas de escritura
- [X] T023 Migración `permission_helpers`: `public.current_user_role()` y `public.is_active_user()` (`status = 'active'`, leyendo `profiles` para `auth.uid()`), ambas **`security definer stable set search_path = ''`** para evitar recursión en la política de `profiles`; `public.can_manage(actor user_role, target user_role)` y `public.can_assign(actor user_role, role user_role)` según `contracts/permissions.md` (T014 debe pasar)
- [X] T024 Migración `audit_events`: tabla según data-model (`id` bigint identity, `occurred_at` default now(), `actor_id`, `actor_role`, `attempted_email` citext, `target_id`, `target_role`, `action`, `result`, `ip` inet, `metadata` jsonb default `'{}'`), los 4 índices de data-model, trigger que lanza excepción en `UPDATE`/`DELETE`, `revoke update, delete, truncate` a `authenticated` y `service_role`, RLS con la restrictiva AAL2 y la política `select` de FR-029a; función interna `public.log_audit_event(p_action audit_action, p_result audit_result, p_actor_id uuid default null, p_target_id uuid default null, p_attempted_email citext default null, p_ip inet default null, p_metadata jsonb default '{}')` (security definer; sin grant a `authenticated`; grant a `service_role`; el rol `postgres` del SQL Editor puede llamarla para los procedimientos de quickstart §8 y §9) que rellena `actor_role` y `target_role` desde `profiles` en el momento del evento (T013, T015 y T016 deben pasar)
- [X] T025 [P] Implementar `src/lib/permissions.ts` (`canManage`, `canAssign` y etiquetas de rol en español: Dueño, Administrador, Colaborador, Lector), solo para la UI (T017 debe pasar)
- [X] T026 [P] Implementar `src/lib/env.ts`: validación zod de las variables públicas y, en un export separado con `import "server-only"`, de las del servidor
- [X] T027 [P] Implementar los clientes de Supabase en `src/lib/supabase/server.ts` (cookies con `@supabase/ssr`), `src/lib/supabase/browser.ts` y `src/lib/supabase/admin.ts` (`import "server-only"`, `SUPABASE_SECRET_KEY`, sin persistir sesión)
- [X] T028 [P] Implementar `src/lib/password.ts` con `validatePassword` (12+ caracteres y consulta k-anonymity a `https://api.pwnedpasswords.com/range/<5 hex>`) (T018 debe pasar)
- [X] T029 [P] Implementar `src/lib/request.ts` con `getClientIp()`, que toma la IP **solo** de las cabeceras que fija Vercel (`x-real-ip`, o el primer valor de `x-forwarded-for`), según research R5. Si falta o no es una IP válida, devuelve `"0.0.0.0"` y hace `console.warn` sin datos personales. Lo usan el bloqueo por correo + IP y la columna `ip` de la bitácora. Comentario en el código: la regla solo es válida detrás de Vercel (T019 debe pasar)
- [X] T030 Implementar `src/lib/email/templates.ts` (layout base; plantillas `invitation`, `forced_password_reset` y todas las `notice_*` de `contracts/audit-and-emails.md`, en español, con "si no fuiste tú, contacta a admin@nexoru.ai") y `src/lib/email/send.ts` (nodemailer SMTP desde env; si el envío falla **no lanza excepción**: registra `email_failed` con `log_audit_event` vía el cliente admin y devuelve `false`, FR-031b) (T020 debe pasar)
- [X] T031 [P] Crear `supabase/seed.sql` sin usuarios (solo un comentario explicando que el Dueño se crea con `npm run bootstrap:owner`)
- [X] T032 [P] Crear los helpers de E2E: `tests/e2e/helpers/mailpit.ts` (leer el último correo para una dirección y extraer el enlace, con la API HTTP de Mailpit en `127.0.0.1:54324`), `tests/e2e/helpers/totp.ts` (código actual con `otplib` a partir del secreto mostrado en la pantalla de registro) y `tests/e2e/helpers/db.ts` (limpiar tablas y usuarios de Auth entre tests con el cliente admin local)

**Checkpoint**: `npm test` y `npm run db:test` en verde para T013–T020; la base local tiene tipos, `profiles`, `audit_events` y los helpers.

---

## Phase 3: User Story 1 — Inicio de sesión con segundo factor obligatorio (Priority: P1) 🎯 MVP

**Goal**: el Dueño activa su cuenta (contraseña y TOTP), entra y sale con ambos factores. Incluye el bloqueo tras 5 fallos (15 min), el cierre por inactividad (30 min) y por duración máxima (12 h), los códigos de recuperación y los avisos por correo correspondientes.

**Independent Test**: con `npm run bootstrap:owner` y el correo en Mailpit, el Dueño activa su cuenta, inicia y cierra sesión; sin el segundo factor no se puede acceder a nada (`tests/e2e/us1-login-2fa.spec.ts`).

### Pruebas de US1 (escribir primero, deben fallar)

- [ ] T033 [P] [US1] Test pgTAP en `supabase/tests/10_auth_lockout.test.sql`: `record_auth_failure(email, ip, factor)` incrementa `auth_attempts.failed_count` de la combinación **correo + IP** para los tres factores (`password`, `totp` y `recovery_code`), también si se mezclan; al 5.º fallo fija `locked_until = now() + 15 min` **solo para esa IP** y registra `account_locked`; otra IP con el mismo correo sigue en 0 y sin bloqueo; un correo inexistente se cuenta y bloquea igual (sin crear perfil, con `attempted_email`); la función indica que hay que enviar el aviso solo si el correo es de un usuario y `last_lock_notice_at` es nulo o tiene más de 24 h (y entonces lo actualiza); `is_locked(email, ip)` refleja el estado; `record_sign_in` pone a 0 el contador de su correo + IP, actualiza `last_sign_in_at` y registra `sign_in`; `record_auth_failure` e `is_locked` funcionan con la IP centinela `0.0.0.0`, y una IP `null` se rechaza con error explícito (nunca llega de la app); además, en `supabase/tests/14_auth_attempts_visibility.test.sql`: sobre `auth_attempts`, el Dueño ve todos los bloqueos vigentes y un Administrador no ve los del Dueño, los de otros Administradores ni los de correos sin usuario (movido desde T016, porque la tabla se crea en T042)
- [ ] T034 [P] [US1] Test pgTAP en `supabase/tests/11_access_token_hook.test.sql`, ejecutado **como `supabase_auth_admin`** con RLS activa: `custom_access_token_hook` devuelve error para usuarios sin perfil, dados de baja o con `app_sessions.last_activity_at` de más de 30 min; **permite** el token si aún no existe la fila de `app_sessions`; añade el claim `user_role` en los casos permitidos
- [ ] T035 [P] [US1] Test pgTAP en `supabase/tests/12_recovery_codes.test.sql`: `regenerate_recovery_codes()` devuelve 10 códigos, guarda solo hashes y borra los anteriores; `consume_recovery_code` acepta un código válido una sola vez, cuenta el fallo como intento y registra `recovery_code_used` con `remaining`; `remaining_recovery_codes()` devuelve el conteo sin exponer hashes
- [ ] T036 [P] [US1] Test pgTAP en `supabase/tests/13_owner_activation.test.sql`: la invitación de arranque (rol owner, `invited_by` null) se acepta una vez y crea `profiles` y los eventos `invitation_accepted` y `user_created`; un segundo Dueño falla por el índice único; un token caducado o usado se rechaza
- [ ] T037 [P] [US1] Test Vitest en `tests/unit/idle.test.ts` para `src/lib/auth/idle.ts` (`isIdleExpired(lastActivity, now)` con límite exacto de 30 min, usado por el temporizador del cliente)
- [ ] T038 [P] [US1] Test Vitest en `tests/unit/recovery-code-format.test.ts` para `src/lib/auth/recovery-code.ts` (normaliza mayúsculas y guiones; formato de 10 caracteres sin caracteres ambiguos)
- [ ] T039 [US1] Test E2E en `tests/e2e/us1-login-2fa.spec.ts` que cubre los escenarios 1–9 de la Historia 1: activación desde el correo en Mailpit con 10 códigos mostrados; login correcto; TOTP incorrecto rechazado con `sign_in_failed` (factor `totp`); con AAL1, `/` redirige a `/login/mfa`; mensaje genérico con credenciales incorrectas; bloqueo tras **5 contraseñas incorrectas** y, en otro caso, tras **contraseña correcta y 5 códigos TOTP incorrectos** desde la misma IP (cabecera `x-forwarded-for` fijada por contexto de Playwright), con el 6.º intento desde esa IP rechazado aunque sea correcto; el mensaje de bloqueo es **idéntico** para un correo existente y uno inexistente; con ese bloqueo vigente, el mismo usuario **entra desde otra IP** (SC-010); 31 min de inactividad con `page.clock` → `/login?reason=idle`; sesión de más de 12 h (`created_at` forzado en `app_sessions`) → `/login?reason=max_age`; código de recuperación → registro obligatorio de un TOTP nuevo y correo `notice_recovery_code_used`; cierre de sesión manual
- [ ] T040 [P] [US1] Test E2E en `tests/e2e/security-headers.spec.ts`: las respuestas de `/login`, de `/invite/<token inválido>` y de una ruta protegida (redirección) incluyen `Strict-Transport-Security` con `max-age=63072000; includeSubDomains`, `Content-Security-Policy` con `frame-ancestors 'none'`, `default-src 'self'` y `object-src 'none'`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin` (research R12)

### Implementación de US1

- [ ] T041 [US1] Migración `invitations`: tabla según data-model (`email` citext "único entre invitaciones `pending`" mediante índice parcial, `role` user_role, `token_hash` bytea, `invited_by` uuid null FK → profiles "null solo en la invitación de arranque", `status` invitation_status default `pending`, `expires_at` default `now() + interval '7 days'`, `created_at`, `accepted_at`, `revoked_at`); RLS con la restrictiva AAL2; `select`: Dueño todas, Administrador solo de rol `collaborator` o `reader`
- [ ] T042 [US1] Migración `recovery_codes_sessions_and_attempts`: tablas `recovery_codes` (`code_hash` text con `crypt(code, gen_salt('bf'))`, `used_at` null), `app_sessions` (`session_id` uuid PK, `user_id`, `last_activity_at`, `created_at`) y `auth_attempts` (PK `(email citext, ip inet)`, `failed_count` smallint "0–5", `locked_until` timestamptz null, `updated_at`; **sin FK** a `profiles`), todas con RLS activada, con la política **restrictiva** AAL2 + `is_active_user()` y sin políticas de escritura para `authenticated`; `select` en `auth_attempts` solo de filas con `locked_until > now()`: el Dueño todas, el Administrador solo las de correos de perfiles `collaborator` o `reader`; política `for select to supabase_auth_admin using (true)` en `app_sessions` para el hook; job de `pg_cron` diario que borra `app_sessions` de más de 24 h y `auth_attempts` sin bloqueo vigente ni cambios en 24 h
- [ ] T043 [US1] Migración `auth_functions`: `is_locked(email, ip)`, `record_auth_failure(email, ip, factor)` (cuenta por correo + IP; devuelve si hay que enviar `notice_account_locked`) y `consume_recovery_code(user_id, code, ip)` (solo `service_role`); `record_sign_in(ip, session_id)` (usuario autenticado: pone a 0 su contador de correo + IP, crea o actualiza `app_sessions`, evento `sign_in`); `check_session(session_id)` (devuelve `ok`, `idle`, `max_age` o `inactive_user` según data-model; si es `ok`, actualiza `last_activity_at` como mucho una vez por minuto; registra `session_expired` con `{reason}` en `idle` y `max_age`); `complete_mfa_enrollment()` (evento `mfa_enrolled`); `regenerate_recovery_codes()` (devuelve los códigos en claro una sola vez, evento `recovery_codes_regenerated`); `remaining_recovery_codes()`; `accept_invitation(token_hash, user_id, full_name)` (T033, T035 y T036 deben pasar)
- [ ] T044 [US1] Migración `custom_access_token_hook`: función `public.custom_access_token_hook(event jsonb)` según research R5–R6 y la tabla de funciones de data-model (sin perfil → deniega; sin fila de sesión → permite), con `grant execute` a `supabase_auth_admin`, `revoke` a `authenticated`/`anon`/`public`, `grant usage on schema public` y `grant select` sobre `profiles` y `app_sessions` a `supabase_auth_admin` (las políticas RLS para ese rol están en T022 y T042); activarla en `supabase/config.toml` (`[auth.hook.custom_access_token] enabled = true`, `uri = "pg-functions://postgres/public/custom_access_token_hook"`) (T034 debe pasar)
- [ ] T045 [P] [US1] Implementar `src/lib/auth/idle.ts` y `src/lib/auth/recovery-code.ts` (T037 y T038 deben pasar)
- [ ] T046 [US1] Implementar `scripts/bootstrap-owner.ts`: lee env, sale sin hacer nada si ya existe un Dueño o una invitación de Dueño pendiente, crea la invitación de rol `owner` para `admin@nexoru.ai` (token aleatorio de 32 bytes; en la base solo el hash SHA-256) y envía la plantilla `invitation` con el enlace `${APP_URL}/invite/<token>`
- [ ] T047 [US1] Implementar `src/lib/auth/invitation.ts` con `acceptInvitation(token, fullName, password)`: hash del token, validación de vigencia, `validatePassword`, `admin.auth.admin.createUser({ email, password, email_confirm: true })`, RPC `accept_invitation`, inicio de sesión y redirección a `/mfa/enroll`; errores `invalid_or_expired` y `weak_password` (contracts/actions.md)
- [ ] T048 [US1] Implementar `src/lib/auth/actions.ts` según contracts/actions.md, con la IP de `getClientIp()`: `signIn` (rechaza si `is_locked(email, ip)`; si falla, `record_auth_failure(email, ip, 'password')`, también para correos inexistentes, y, si esa llamada lo indica, envía `notice_account_locked`); `verifyTotp` (mismo control de bloqueo; si falla, `record_auth_failure(email, ip, 'totp')`: **los fallos de TOTP cuentan para el bloqueo**, FR-005); `redeemRecoveryCode` (mismo control; `consume_recovery_code` → `admin.auth.admin.mfa.deleteFactor` para cada factor → `notice_recovery_code_used`); `enrollTotp`; `confirmTotp` (→ `complete_mfa_enrollment` + `regenerate_recovery_codes` + `notice_mfa_enrolled`); `signOut` (evento `sign_out`). El error de bloqueo es **siempre** "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.", exista o no la cuenta y sin minutos exactos (FR-006). Mapa de códigos de error de Supabase Auth a español en `src/lib/auth/errors.ts` (FR-031)
- [ ] T049 [US1] Implementar `src/proxy.ts` según contracts/actions.md: refresca la sesión con `@supabase/ssr`; rutas públicas (`/login`, `/forgot-password`, `/invite/*`, `/auth/*`); con AAL1 → `/login/mfa` si hay un factor TOTP verificado o `/mfa/enroll` si no hay ninguno (estado leído de Supabase MFA, no de `profiles`); en rutas AAL2 llama a `check_session(session_id)` en **cada petición** y, si no devuelve `ok`, cierra la sesión y redirige a `/login?reason=<idle|max_age|inactive_user>` (FR-007, FR-020, SC-004)
- [ ] T050 [P] [US1] Página `src/app/(auth)/login/page.tsx`: formulario de correo y contraseña con `signIn`, mensaje de bloqueo genérico (el de T048) y aviso cuando `reason=idle`, `max_age` o `inactive_user`
- [ ] T051 [P] [US1] Página `src/app/(auth)/login/mfa/page.tsx`: `input-otp` de 6 dígitos con `verifyTotp` y enlace "Usar un código de recuperación"
- [ ] T052 [P] [US1] Página `src/app/(auth)/login/recovery-code/page.tsx` con `redeemRecoveryCode`
- [ ] T053 [P] [US1] Página `src/app/(auth)/mfa/enroll/page.tsx`: QR (SVG que devuelve `mfa.enroll`) y la clave en texto para introducirla a mano; verificación del primer código; después muestra los 10 códigos **una sola vez**, con "Copiar", "Descargar .txt" y la confirmación "Ya los guardé" antes de continuar
- [ ] T054 [P] [US1] Página `src/app/(auth)/invite/[token]/page.tsx`: nombre completo, contraseña y confirmación con `acceptInvitation`; si la invitación no es válida, muestra "Pide una invitación nueva a tu administrador"
- [ ] T055 [P] [US1] Componente `src/components/idle-timer.tsx`: cuenta la actividad (teclado, ratón, toque, scroll) en todas las pestañas con `BroadcastChannel`; a los 30 min llama a `signOut` y redirige a `/login?reason=idle`
- [ ] T056 [US1] Layout `src/app/(app)/layout.tsx`: verifica en el servidor AAL2 y `is_active_user()` (segunda barrera tras el proxy), monta `IdleTimer`, navegación según rol (Inicio; Usuarios y Bitácora solo para Dueño/Administrador; Mi cuenta), botón "Cerrar sesión" y aviso cuando `remaining_recovery_codes() <= 2`; página `src/app/(app)/page.tsx` con un panel de bienvenida vacío; `/login` muestra un mensaje en español para cada `reason`
- [ ] T057 [US1] Página `src/app/(app)/account/page.tsx` con la sección "Códigos de recuperación": cuántos quedan y "Regenerar" (`regenerate_recovery_codes`, muestra los nuevos una vez) (FR-003)
- [ ] T058 [US1] Cabeceras de seguridad en `next.config.ts` con `headers()` para `/:path*`: `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `Content-Security-Policy` según research R12 (con `connect-src` a `NEXT_PUBLIC_SUPABASE_URL` y `'unsafe-eval'` solo en desarrollo), `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin` (T040 debe pasar)
- [ ] T059 [US1] Ejecutar T033–T039 y T040 hasta verde; corregir sin modificar las pruebas salvo error demostrable en ellas

**Checkpoint**: MVP funcional en local. El Dueño puede usar Nexoru Op con 2FA.

---

## Phase 4: Despliegue del MVP (op.nexoru.ai)

**Purpose**: contratar los servicios de pago (Supabase Pro y Vercel Pro, 45 USD/mes desde aquí), entregar US1 en su propio PR y publicarla en producción. Requiere T010 completa. Casi todo es [MANUAL]; Claude prepara el PR y valida después.

- [ ] T060 [MANUAL] Supabase: contratar el plan **Pro** para la organización Nexoru, con el **Spend Cap activado** (el costo empieza aquí), y crear el proyecto `nexoru-op` en East US; guardar la Project URL, la publishable key y la secret key en el gestor de contraseñas (quickstart §1.1–1.3, en `specs/001-user-access/quickstart.md`). Hasta esta fase, todo el desarrollo usa solo Supabase local
- [ ] T061 [MANUAL] Supabase, panel de producción: ajustes de Auth del quickstart §1.4–1.8 y §1.10, §1.12 y §1.13 (registro desactivado, contraseña de 12+, protección de contraseñas filtradas, TOTP, time-box de 12 h, JWT de 300 s, OTP de 3600 s, URLs y límites por IP) en `specs/001-user-access/quickstart.md`
- [ ] T062 [MANUAL] Supabase: SMTP propio con la API key de Resend (quickstart §1.9 y §2.3), una vez que Resend muestre el dominio como **Verified**
- [ ] T063 Entrega de US1 en su propio PR: quitar el comentario "Sync Impact Report" de `.specify/memory/constitution.md`, hacer commit de la constitución (`docs: ratify constitution v1.0.0`) y del trabajo de las fases 1–3, y abrir con `gh pr create` el PR `001-user-access` → `main` titulado "US1: secure sign-in with mandatory 2FA", con descripción en español (resumen, costos, tareas [MANUAL] pendientes y resultado de `tests/e2e/us1-login-2fa.spec.ts`); **esperar CI en verde** y corregir si falla
- [ ] T064 [MANUAL] En la **terminal integrada de VS Code**, donde el Dueño teclea los comandos, **solo cuando el PR de T063 tenga CI en verde**: `npx supabase login`, `npx supabase link --project-ref <ref>` y `npx supabase db push` (quickstart §5); después activar el Custom Access Token Hook en el panel (quickstart §1.14)
- [ ] T065 [MANUAL] Antes de hacer merge del PR de US1: en **Settings → Rules → Rulesets → main**, activar *Require status checks to pass* y seleccionar el check de CI, que ya aparece porque corrió en el PR de T063. Guardar el ruleset, comprobar que el PR muestra el check como **requerido** y en verde, y hacer merge con "Create a merge commit" (no squash) una vez que T064 haya aplicado las migraciones en producción
- [ ] T066 [MANUAL] Vercel: contratar **Pro** para el equipo Nexoru (el costo empieza aquí), importar `adminnexoru/nexoru-op`, cargar las 9 variables solo en Production (secretas marcadas como Sensitive), desactivar las previews, región `iad1` y dominio `op.nexoru.ai` (quickstart §4). El primer despliegue sale de `main` con US1 ya integrada
- [ ] T067 [MANUAL] DNS: CNAME `op` con el valor que indique Vercel (proxy desactivado si el DNS está en Cloudflare) (quickstart §3)
- [ ] T068 [MANUAL] Activar la cuenta del Dueño en producción: en la **terminal integrada de VS Code**, donde el Dueño teclea los comandos, exportar las variables de producción solo en esa sesión de terminal y ejecutar `npm run bootstrap:owner`; abrir el correo, definir la contraseña, registrar el TOTP y guardar los 10 códigos fuera del teléfono (quickstart §6)
- [ ] T069 [MANUAL] Prueba de humo en `https://op.nexoru.ai`: el escenario 1 de la validación del quickstart (login correcto, TOTP incorrecto rechazado, cierre de sesión)

**Checkpoint**: Nexoru Op en producción con acceso seguro para el Dueño.

---

## Phase 5: User Story 2 — Invitar usuarios y asignar roles (Priority: P2)

**Goal**: el Dueño o un Administrador invita por correo con un rol (dentro de sus límites), revoca o reenvía invitaciones y cambia roles; la persona invitada activa su cuenta con 2FA.

**Independent Test**: el Dueño invita a un Lector y a un Administrador; ambos activan su cuenta y cada uno ve y puede hacer solo lo que su rol permite (`tests/e2e/us2-invitations.spec.ts`).

### Pruebas de US2 (escribir primero, deben fallar)

- [ ] T070 [P] [US2] Test pgTAP en `supabase/tests/20_invitations.test.sql`: `create_invitation` permite al Dueño invitar a admin, collaborator o reader y al Administrador solo a collaborator o reader; nadie invita a `owner`; rechaza correos de perfiles existentes (`already_exists`) o con invitación pendiente (`already_invited`); `resend_invitation` revoca la anterior y crea otra; `revoke_invitation` solo funciona sobre `pending`; cada operación registra su evento, y cada rechazo `permission_denied`
- [ ] T071 [P] [US2] Test pgTAP en `supabase/tests/21_change_role.test.sql`: `change_role` respeta `can_manage` y `can_assign`, rechaza el cambio del propio rol (FR-017), registra `role_changed` con `{from, to}`, y el nuevo rol aplica de inmediato a RLS aunque el JWT tenga el claim antiguo (FR-016)
- [ ] T072 [US2] Test E2E en `tests/e2e/us2-invitations.spec.ts` que cubre los escenarios 1–7 de la Historia 2: invitar Lector (estado "Invitado"); aceptar y activar; invitación caducada (fecha forzada en la base) o usada rechazada; `/signup` y `/register` devuelven 404; el Administrador no ve la opción de invitar Dueño ni Administrador y la llamada directa devuelve `forbidden`; el cambio de rol aplica en la siguiente acción y envía `notice_role_changed`; revocar o reenviar invalida el enlace anterior

### Implementación de US2

- [ ] T073 [US2] Migración `invitation_functions`: `create_invitation(email, role, token_hash)`, `resend_invitation(invitation_id, new_token_hash)`, `revoke_invitation(invitation_id)` y `change_role(target_id, new_role)`, todas security definer con AAL2, cuenta activa, `can_manage`/`can_assign` y evento en la misma transacción (T070 y T071 deben pasar)
- [ ] T074 [US2] Implementar `src/lib/users/invitations.ts` con las server actions `inviteUser`, `resendInvitation` y `revokeInvitation` (token de 32 bytes, solo el hash va a la base; envío de la plantilla `invitation`), según contracts/actions.md
- [ ] T075 [US2] Implementar `src/lib/users/change-role.ts` con la server action `changeRole` y el aviso `notice_role_changed`
- [ ] T076 [US2] Página `src/app/(app)/users/page.tsx`: tabla con correo, nombre, rol, estado (Invitado, Activo, Bloqueado temporalmente si el correo tiene alguna fila de `auth_attempts` con `locked_until > now()`, Dado de baja) y último acceso (FR-018); las invitaciones pendientes aparecen con su caducidad; acceso solo para Dueño/Administrador (el resto → 404). Para un Administrador, el estado de las filas del Dueño y de otros Administradores nunca muestra "Bloqueado temporalmente", porque RLS no le deja verlo
- [ ] T077 [P] [US2] Componente `src/components/users/invite-dialog.tsx`: correo y selector de rol limitado por `canAssign`
- [ ] T078 [P] [US2] Componente `src/components/users/role-select.tsx` con confirmación, visible solo si `canManage`
- [ ] T079 [US2] Ejecutar T070–T072 hasta verde
- [ ] T080 [US2] Entrega de US2 en su propio PR: commit y `gh pr create` `001-user-access` → `main` titulado "US2: invitations and roles", con descripción en español y el resultado de `tests/e2e/us2-invitations.spec.ts`; esperar CI en verde
- [ ] T081 [US2] [MANUAL] Aplicar las migraciones nuevas en producción con `npx supabase db push` en la terminal integrada de VS Code (quickstart §5) y después hacer merge del PR con "Create a merge commit"

**Checkpoint**: US1 y US2 funcionan cada una por separado.

---

## Phase 6: User Story 3 — Dar de baja, reactivar y forzar reinicios (Priority: P3)

**Goal**: el Dueño o un Administrador (dentro de sus límites) desactiva a un usuario sin borrar su historial, lo reactiva, y fuerza el reinicio de contraseña o de 2FA.

**Independent Test**: con un Lector de prueba creado por fixture, el Dueño lo da de baja (su sesión muere y no puede entrar, el historial sigue), lo reactiva, y le fuerza el reinicio de 2FA y de contraseña (`tests/e2e/us3-user-management.spec.ts`).

### Pruebas de US3 (escribir primero, deben fallar)

- [ ] T082 [P] [US3] Test pgTAP en `supabase/tests/30_user_management.test.sql`: `deactivate_user` pone `status = 'deactivated'` y `deactivated_at`, borra las filas del usuario en `auth.sessions` y `app_sessions`, revoca sus invitaciones pendientes y conserva sus eventos; tras la baja, `check_session` devuelve `inactive_user` y el usuario con su JWT aún válido obtiene 0 filas; no se aplica al Dueño ni a uno mismo; un Administrador no puede actuar sobre el Dueño ni sobre otros Administradores; `reactivate_user` restaura `active` con el mismo rol; `force_mfa_reset` borra los códigos de recuperación y revoca sesiones; `force_password_reset` revoca sesiones; todos registran su evento, y los rechazos `permission_denied`
- [ ] T083 [US3] Test E2E en `tests/e2e/us3-user-management.spec.ts` que cubre los escenarios 1–6 de la Historia 3, con dos contextos de navegador (Dueño y Lector): baja → en su siguiente acción (menos de 1 min, con el token todavía vigente) el Lector es **redirigido a `/login?reason=inactive_user`** y no puede volver a entrar; llega `notice_deactivated`; un enlace de recuperación pedido antes de la baja no da acceso; reactivación con las mismas credenciales y TOTP; reinicio forzado de contraseña con el enlace de Mailpit; reinicio forzado de 2FA con registro nuevo; el Administrador no tiene acciones sobre el Dueño ni sobre otro Administrador; nadie puede darse de baja a sí mismo

### Implementación de US3

- [ ] T084 [US3] Migración `user_management_functions`: `deactivate_user`, `reactivate_user`, `force_password_reset` y `force_mfa_reset` (security definer; permisos, cambio, borrado en `auth.sessions` y evento en una transacción) (T082 debe pasar)
- [ ] T085 [US3] Implementar `src/lib/users/manage.ts` con las server actions `deactivateUser` (+ `admin.updateUserById({ ban_duration: '876000h' })`), `reactivateUser` (+ `ban_duration: 'none'`), `forcePasswordReset` (+ contraseña aleatoria con `admin.updateUserById` + `admin.generateLink({ type: 'recovery' })` → correo `forced_password_reset`) y `forceMfaReset` (+ `admin.mfa.deleteFactor` por cada factor); si falla la Admin API, registrar `auth_sync_failed`; las acciones son idempotentes, así que reintentar es repetirlas; enviar el aviso correspondiente
- [ ] T086 [US3] Route handler `src/app/auth/confirm/route.ts`: `verifyOtp({ type: 'recovery', token_hash })` y redirección a `next` (solo rutas internas); enlaces inválidos o caducados → `/forgot-password?error=link_expired`
- [ ] T087 [US3] Página `src/app/(auth)/reset-password/page.tsx` y la server action `completePasswordReset` en `src/lib/auth/password-reset.ts`: `validatePassword`, cambio con `admin.updateUserById` para el usuario de la sesión de recuperación (evita el requisito de AAL2), revocación de todas sus sesiones, evento `password_changed` y aviso `notice_password_changed`; redirección a `/login`
- [ ] T088 [P] [US3] Componente `src/components/users/user-actions-menu.tsx`: "Dar de baja", "Reactivar", "Forzar cambio de contraseña" y "Forzar nuevo 2FA", cada una con `alert-dialog` de confirmación y visible solo si `canManage`; integrarlo en `src/app/(app)/users/page.tsx`
- [ ] T089 [US3] Ejecutar T082–T083 hasta verde
- [ ] T090 [US3] Entrega de US3 en su propio PR: commit y `gh pr create` `001-user-access` → `main` titulado "US3: deactivation, reactivation and forced resets", con descripción en español y el resultado de `tests/e2e/us3-user-management.spec.ts`; esperar CI en verde
- [ ] T091 [US3] [MANUAL] Aplicar las migraciones nuevas en producción con `npx supabase db push` en la terminal integrada de VS Code (quickstart §5) y después hacer merge del PR con "Create a merge commit"

**Checkpoint**: US1–US3 funcionan cada una por separado.

---

## Phase 7: User Story 4 — Recuperación de contraseña por correo (Priority: P4)

**Goal**: quien olvidó su contraseña la recupera por correo (enlace de 1 h); el 2FA sigue siendo obligatorio. Incluye el cambio de la propia contraseña desde "Mi cuenta".

**Independent Test**: un usuario pide la recuperación, recibe el correo, define la contraseña nueva y entra con ella y su TOTP; la anterior deja de funcionar (`tests/e2e/us4-password-recovery.spec.ts`).

### Pruebas de US4 (escribir primero, deben fallar)

- [ ] T092 [P] [US4] Test pgTAP en `supabase/tests/40_password_reset_request.test.sql`: `log_password_reset_request(email, ip)` (solo `service_role`) devuelve true y registra `password_reset_requested` con `success` para usuarios activos; para correos inexistentes o dados de baja devuelve false y registra `failure` con `attempted_email`
- [ ] T093 [US4] Test E2E en `tests/e2e/us4-password-recovery.spec.ts` que cubre los escenarios 1–5 de la Historia 4: mismo mensaje para un correo válido y uno inexistente, con un solo correo en Mailpit; el enlace cambia la contraseña, cierra todas las sesiones y sigue pidiendo TOTP; un usuario dado de baja no recibe correo; un enlace caducado (más de 1 h, fecha forzada) se rechaza; cambio de contraseña desde `/account` (FR-025a): la otra sesión abierta se cierra, la actual sigue y llega el aviso

### Implementación de US4

- [ ] T094 [US4] Migración `password_reset_request`: función `log_password_reset_request(email, ip)` (T092 debe pasar)
- [ ] T095 [US4] Server action `requestPasswordReset` en `src/lib/auth/password-reset.ts`: si `log_password_reset_request` devuelve true, llama a `resetPasswordForEmail(email, { redirectTo: APP_URL + '/auth/confirm?next=/reset-password' })`; la respuesta al usuario es idéntica en todos los casos
- [ ] T096 [P] [US4] Página `src/app/(auth)/forgot-password/page.tsx` (con el mensaje de `error=link_expired`) y enlace "¿Olvidaste tu contraseña?" en `src/app/(auth)/login/page.tsx`
- [ ] T097 [P] [US4] Plantilla en español `supabase/templates/recovery.html` con el enlace `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`, referenciada en `supabase/config.toml` (`[auth.email.template.recovery]`, asunto "Recupera tu contraseña de Nexoru Op")
- [ ] T098 [US4] Sección "Cambiar contraseña" en `src/app/(app)/account/page.tsx` con la server action `changeOwnPassword` en `src/lib/auth/password-reset.ts` (FR-025a: verifica la actual, contando los fallos para el bloqueo; `validatePassword` para la nueva; cierra todas las demás sesiones y conserva la actual; evento `password_changed` con `via: self` y aviso)
- [ ] T099 [US4] [MANUAL] Supabase, panel de producción: pegar el contenido de `supabase/templates/recovery.html` en Authentication → Emails → Templates → Reset password (quickstart §1.11)
- [ ] T100 [US4] Ejecutar T092–T093 hasta verde
- [ ] T101 [US4] Entrega de US4 en su propio PR: commit y `gh pr create` `001-user-access` → `main` titulado "US4: password recovery", con descripción en español y el resultado de `tests/e2e/us4-password-recovery.spec.ts`; esperar CI en verde
- [ ] T102 [US4] [MANUAL] Aplicar las migraciones nuevas con `npx supabase db push` en la terminal integrada de VS Code, confirmar que T099 está hecha y hacer merge del PR con "Create a merge commit". Desde aquí, la recuperación de contraseña del Dueño ya no usa el procedimiento del panel (quickstart §9)

**Checkpoint**: US1–US4 funcionan cada una por separado.

---

## Phase 8: User Story 5 — Consulta de la bitácora de auditoría (Priority: P5)

**Goal**: el Dueño y los Administradores consultan la bitácora con filtros; cada rol ve solo lo que le corresponde (FR-029a).

**Independent Test**: tras generar eventos por fixture, el Dueño filtra por usuario y fechas y ve cada evento con autor, acción, afectado, resultado y fecha; un Administrador no ve eventos del Dueño ni de otros Administradores (`tests/e2e/us5-audit.spec.ts`).

### Pruebas de US5 (escribir primero, deben fallar)

- [ ] T103 [P] [US5] Test Vitest en `tests/unit/audit-labels.test.ts`: cada valor de `audit_action` de `contracts/audit-and-emails.md` tiene etiqueta en español en `src/lib/audit/labels.ts`, y cada `audit_result` también
- [ ] T104 [US5] Test E2E en `tests/e2e/us5-audit.spec.ts` que cubre los escenarios 1–5 de la Historia 5: orden descendente; filtros por usuario, tipo y rango de fechas; paginación de 50; Colaborador y Lector reciben 404; el Administrador no ve eventos del Dueño ni de otros Administradores, ni siquiera filtrando por ellos

### Implementación de US5

- [ ] T105 [P] [US5] Implementar `src/lib/audit/labels.ts` (T103 debe pasar)
- [ ] T106 [US5] Implementar `src/lib/audit/query.ts` con `listAuditEvents({ userId?, action?, from?, to?, cursor? })`: `select` con el cliente de sesión (RLS decide la visibilidad), orden `occurred_at desc, id desc`, cursor por `(occurred_at, id)` y 50 por página
- [ ] T107 [US5] Página `src/app/(app)/audit/page.tsx`: filtros (usuario, tipo de evento, desde/hasta) en `searchParams`, tabla con fecha y hora local (America/Mexico_City), autor (o correo intentado), acción, afectado, resultado, IP y "Cargar más"; acceso solo para Dueño/Administrador
- [ ] T108 [US5] Ejecutar T103–T104 hasta verde

**Checkpoint**: las 5 historias funcionan cada una por separado.

---

## Phase 9: Polish y temas transversales

- [ ] T109 [P] Actualizar `CLAUDE.md`: estructura del código, comandos (`dev`, `test`, `db:test`, `test:e2e`, `bootstrap:owner`, `supabase start/db reset/migration new`), regla de "toda tabla con RLS y toda mutación vía función con auditoría" y dónde están los pasos manuales
- [ ] T110 [P] Verificar con `gh api repos/adminnexoru/nexoru-op/rulesets/<id>` que el ruleset `main` está activo y exige PR **y el check de CI** (regla `required_status_checks`); si falta el check, detenerse y avisar al Dueño. Documentar en `CLAUDE.md` que todo cambio llega a `main` por PR con CI en verde
- [ ] T111 [P] Crear `README.md` en español: qué es Nexoru Op, cómo levantarlo en local y enlaces a la constitución, la spec y el quickstart
- [ ] T112 Revisión de seguridad y cobertura de auditoría: ningún archivo de `src/app` o de componentes cliente importa `src/lib/supabase/admin.ts` ni `env` del servidor; `git ls-files | grep -i env` devuelve solo `.env.example`; búsqueda de contraseñas y códigos de prueba en `audit_events` y en los logs de E2E sin coincidencias (SC-008); toda tabla nueva tiene RLS (T013); y test Vitest `tests/unit/audit-coverage.test.ts` que falla si algún valor de `audit_action` de FR-026 no aparece como literal en al menos un archivo de `supabase/migrations/` o `src/` (SC-005); y que quickstart §8 y §9 registran su evento con `log_audit_event` (principio I)
- [ ] T113 Ejecutar la validación completa en local de `specs/001-user-access/quickstart.md` (Parte 2, escenarios 1–7) y anotar los resultados en el PR
- [ ] T114 Entrega de US5 y de la fase de cierre en su propio PR (el último de la feature): commit y `gh pr create` `001-user-access` → `main` titulado "US5: audit log and polish", con descripción en español (resultado de `tests/e2e/us5-audit.spec.ts` y de la validación de T113); esperar CI en verde
- [ ] T115 [MANUAL] Revisar y hacer merge del PR de US5 con "Create a merge commit" (US5 no trae migraciones); Vercel despliega producción automáticamente
- [ ] T116 [MANUAL] Validar en `https://op.nexoru.ai` los escenarios 3–6 del quickstart con una cuenta de prueba propia (por ejemplo, un alias de admin@nexoru.ai con rol Lector) y darla de baja al terminar

---

## Dependencies & Execution Order

### Dependencias entre fases

- **Setup (Phase 1)**: sin dependencias. Las [MANUAL] T010–T012 (Resend, ruleset y Secret scanning, todas gratuitas) corren en paralelo con todo lo demás.
- **Foundational (Phase 2)**: depende de Setup. **Bloquea todas las historias.**
- **US1 (Phase 3)**: depende de Foundational.
- **Despliegue MVP (Phase 4)**: depende de US1 y de T010 (dominio verificado en Resend). Aquí se contratan Supabase Pro (T060) y Vercel Pro (T066); antes no hay costo.
- **US2, US3, US4 y US5 (Phases 5–8)**: dependen de Foundational **y de US1**. No es un acoplamiento arbitrario: US1 aporta el inicio de sesión con 2FA, la aceptación de invitaciones y el layout AAL2 sin los que nadie puede entrar a probar las demás. Entre ellas son independientes, con una excepción: US4 reutiliza `/auth/confirm` y `/reset-password` de US3 (T086, T087). Si se hace US4 antes que US3, esas dos tareas pasan a US4.
- **Polish (Phase 9)**: depende de US5; se entrega junto con ella en el último PR (T114–T115).

### Entrega: un PR por historia

Cada historia se entrega en **su propio PR** de `001-user-access` hacia `main`, que se abre cuando su fase está en verde:

| Historia | PR (Claude) | Migraciones en producción y merge ([MANUAL]) |
|----------|-------------|-----------------------------------------------|
| US1 (+ Setup y Foundational) | T063 | T064 (`db push`) → T065 |
| US2 | T080 | T081 |
| US3 | T090 | T091 |
| US4 | T101 | T102 |
| US5 + Polish | T114 | T115 (sin migraciones) |

Reglas: CI en verde antes del merge (ruleset de T011); las migraciones se aplican en producción **antes** del merge; merge con "Create a merge commit" para que la rama siga alineada con `main`.

### Dentro de cada historia

1. Pruebas (pgTAP, Vitest, E2E) escritas y **fallando**.
2. Migraciones SQL.
3. Server actions en `src/lib/`.
4. Páginas y componentes.
5. Tarea final "ejecutar hasta verde".

### Oportunidades de paralelismo

- Setup: T004–T006, T008 y T009, más las [MANUAL] T010–T012.
- Foundational: todas las pruebas T013–T020 en paralelo; luego T025–T029, T031 y T032 en paralelo tras las migraciones T021–T024, que son secuenciales.
- US1: T033–T038 en paralelo; páginas T050–T055 en paralelo tras T048–T049.
- Tras US1: US2, US3 (salvo el aviso anterior), US4 y US5 pueden desarrollarse en paralelo, y la Phase 4 en paralelo con todas; pero los PR se integran de uno en uno, en el orden de la tabla anterior.

---

## Parallel Example: User Story 1

```bash
# Pruebas de US1 en paralelo (deben fallar):
Task: "Test pgTAP de bloqueo en supabase/tests/10_auth_lockout.test.sql"
Task: "Test pgTAP del hook en supabase/tests/11_access_token_hook.test.sql"
Task: "Test pgTAP de códigos en supabase/tests/12_recovery_codes.test.sql"
Task: "Test pgTAP de activación en supabase/tests/13_owner_activation.test.sql"
Task: "Test Vitest de inactividad en tests/unit/idle.test.ts"
Task: "Test Vitest de formato en tests/unit/recovery-code-format.test.ts"
Task: "Test E2E de cabeceras en tests/e2e/security-headers.spec.ts"

# Páginas de US1 en paralelo (tras T048–T049):
Task: "Página login en src/app/(auth)/login/page.tsx"
Task: "Página MFA en src/app/(auth)/login/mfa/page.tsx"
Task: "Página de código de recuperación en src/app/(auth)/login/recovery-code/page.tsx"
Task: "Página de registro de TOTP en src/app/(auth)/mfa/enroll/page.tsx"
Task: "Página de invitación en src/app/(auth)/invite/[token]/page.tsx"
Task: "Componente IdleTimer en src/components/idle-timer.tsx"
```

---

## Implementation Strategy

### MVP primero (solo US1)

1. Phase 1 (Setup) + las [MANUAL] gratuitas T010–T012 en paralelo. Desarrollo solo con Supabase local.
2. Phase 2 (Foundational).
3. Phase 3 (US1) → **parar y validar** con `tests/e2e/us1-login-2fa.spec.ts`.
4. Phase 4 → se contratan Supabase Pro y Vercel Pro, US1 entra a `main` por su PR (T063–T065) y Nexoru Op queda en `op.nexoru.ai` con acceso seguro para el Dueño.

### Entrega incremental

Tras el MVP: US2 (invitaciones) → US3 (bajas y reinicios) → US4 (recuperación) → US5
(bitácora). Cada una se valida con su E2E, se entrega en **su propio PR** contra `main` (ver
"Entrega: un PR por historia") y llega a producción con su merge antes de empezar la siguiente
entrega.

---

## Notes

- **[MANUAL]**: cuando `/speckit-implement` llegue a una de estas tareas, Claude se detiene, te
  indica la sección exacta del quickstart y espera tu confirmación antes de marcarla.
- Nunca pegues un valor secreto en el chat ni en un archivo del repo: solo en los paneles o en
  tu `.env.local`.
- Si una prueba parece incorrecta, se corrige primero la spec o el contrato y después la prueba;
  nunca se debilita una prueba para que pase.
