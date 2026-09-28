---
description: "Lista de tareas de la feature 001-user-access"
---

# Tasks: Acceso seguro del Dueño y puesta en marcha local

**Input**: Documentos de diseño en `specs/001-user-access/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: obligatorios (principio VI). En cada fase **las pruebas se escriben primero y deben
fallar** antes de implementar.

**Redefinición (2026-09-28, constitución v2.0.0)**: las fases 1–3 se completaron con el diseño
anterior (correo, despliegue en la nube, multiusuario). Se conservan tal cual como historial; las
tareas hechas que la redefinición deja sin efecto (p. ej. T010 Resend, T020 y T030 plantillas
de correo) se retiran en la **Fase 3b**. La antigua Fase 4 (despliegue en la nube) y las fases de
US2, US3, US4 y US5 pasaron al backlog (`specs/backlog.md`, B-003 a B-007).

## Formato: `[ID] [P?] [Story?] [MANUAL?] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes).
- **[US1]**, **[US6]**: historia de usuario de la spec a la que pertenece (US5 pasó al backlog, B-007).
- **[MANUAL]**: la hace el Dueño (comandos con sus datos, Supabase Studio local o GitHub). Claude
  no la ejecuta; da los pasos exactos y espera su confirmación.

## Convenciones

- Proyecto único Next.js en la raíz con `src/`; SQL en `supabase/migrations/`, pgTAP en
  `supabase/tests/`, Vitest en `tests/unit/`, Playwright en `tests/e2e/`.
- Toda función SQL `security definer` lleva `set search_path = ''` y nombres calificados;
  `revoke execute ... from public, anon` y `grant` explícito solo a quien la usa.
- Código, identificadores y commits en inglés; textos de interfaz en español.
- Commits locales cuando el Dueño los pida; **el push lo autoriza el Dueño tras revisar**.

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
- [X] T011 [P] [MANUAL] GitHub: crear el ruleset `main` en `adminnexoru/nexoru-op` (gratis porque el repo es público): bloquear borrado y force push, y exigir PR (quickstart §7, research R11 en `specs/001-user-access/`). El check de CI se añade en T082 (antes T065), cuando ya exista
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
- [X] T019 [P] Test Vitest en `tests/unit/request.test.ts` (actualizada 2026-09-28): `getClientIp()` toma la IP **solo** de `x-vercel-forwarded-for`; ignora `X-Forwarded-For` y `x-real-ip` aunque vengan con valores válidos; sin IP confiable devuelve `"0.0.0.0"` fuera de Vercel y `null` en Vercel (`VERCEL=1`)
- [X] T020 [P] Test Vitest en `tests/unit/email-templates.test.ts` (actualizada 2026-09-28): cada plantilla de `contracts/audit-and-emails.md` produce asunto, texto y HTML en español; ninguna plantilla `notice_*` contiene URLs de acceso; las plantillas nunca incluyen contraseñas ni códigos; el aviso de código de recuperación dice que los códigos fueron reemplazados por un juego nuevo y no dice cuántos quedan

### Implementación

- [X] T021 Migración `types_and_extensions` en `supabase/migrations/`: extensiones `citext`, `pgcrypto` y `pg_cron`; enums `user_role` (`owner`, `admin`, `collaborator`, `reader`), `user_status` (`active`, `deactivated`), `invitation_status` (`pending`, `accepted`, `revoked`, `expired`), `audit_result` (`success`, `failure`, `denied`) y `audit_action` con **todos** los valores de `contracts/audit-and-emails.md`
- [X] T022 Migración `profiles`: tabla según data-model con `id` uuid PK FK → `auth.users.id` (on delete restrict), `email` citext único, `full_name` text "1–120 caracteres" (check), `role` user_role, índice único parcial `where role = 'owner'` ("exactamente un Dueño"), `status` user_status default `active`, `last_lock_notice_at` timestamptz null, `created_at`, `last_sign_in_at` null, `deactivated_at` null; check que impide `role = 'owner' and status = 'deactivated'`; RLS activada; política **restrictiva** para `authenticated` `(select auth.jwt()->>'aal') = 'aal2' and public.is_active_user()`; `select`: Dueño/Administrador todas las filas, resto solo la propia; política `for select to supabase_auth_admin using (true)` para el hook; sin políticas de escritura
- [X] T023 Migración `permission_helpers`: `public.current_user_role()` y `public.is_active_user()` (`status = 'active'`, leyendo `profiles` para `auth.uid()`), ambas **`security definer stable set search_path = ''`** para evitar recursión en la política de `profiles`; `public.can_manage(actor user_role, target user_role)` y `public.can_assign(actor user_role, role user_role)` según `contracts/permissions.md` (T014 debe pasar)
- [X] T024 Migración `audit_events`: tabla según data-model (`id` bigint identity, `occurred_at` default now(), `actor_id`, `actor_role`, `attempted_email` citext, `target_id`, `target_role`, `action`, `result`, `ip` inet, `metadata` jsonb default `'{}'`), los 4 índices de data-model, trigger que lanza excepción en `UPDATE`/`DELETE`, `revoke update, delete, truncate` a `authenticated` y `service_role`, RLS con la restrictiva AAL2 y la política `select` de FR-029a; función interna `public.log_audit_event(p_action audit_action, p_result audit_result, p_actor_id uuid default null, p_target_id uuid default null, p_attempted_email citext default null, p_ip inet default null, p_metadata jsonb default '{}')` (security definer; sin grant a `authenticated`; grant a `service_role`; el rol `postgres` del SQL Editor puede llamarla para los procedimientos de quickstart §8 y §9) que rellena `actor_role` y `target_role` desde `profiles` en el momento del evento (T013, T015 y T016 deben pasar)
- [X] T025 [P] Implementar `src/lib/permissions.ts` (`canManage`, `canAssign` y etiquetas de rol en español: Dueño, Administrador, Colaborador, Lector), solo para la UI (T017 debe pasar)
- [X] T026 [P] Implementar `src/lib/env.ts`: validación zod de las variables públicas y, en un export separado con `import "server-only"`, de las del servidor
- [X] T027 [P] Implementar los clientes de Supabase en `src/lib/supabase/server.ts` (cookies con `@supabase/ssr`), `src/lib/supabase/browser.ts` y `src/lib/supabase/admin.ts` (`import "server-only"`, `SUPABASE_SECRET_KEY`, sin persistir sesión)
- [X] T028 [P] Implementar `src/lib/password.ts` con `validatePassword` (12+ caracteres y consulta k-anonymity a `https://api.pwnedpasswords.com/range/<5 hex>`) (T018 debe pasar)
- [X] T029 [P] Implementar `src/lib/request.ts` con `getClientIp()` (actualizada 2026-09-28): IP **solo** de `x-vercel-forwarded-for` (research R5); nunca de `X-Forwarded-For` ni `x-real-ip`. Sin IP válida: `"0.0.0.0"` con `console.warn` fuera de Vercel, y `null` en Vercel (`VERCEL=1`) para que el llamador rechace el intento (T019 debe pasar)
- [X] T030 Implementar `src/lib/email/templates.ts` (layout base; plantillas `invitation`, `forced_password_reset` y todas las `notice_*` de `contracts/audit-and-emails.md`, en español, con "si no fuiste tú, contacta a admin@nexoru.ai") y `src/lib/email/send.ts` (nodemailer SMTP desde env; si el envío falla **no lanza excepción**: registra `email_failed` con `log_audit_event` vía el cliente admin y devuelve `false`, FR-031b) (T020 debe pasar)
- [X] T031 [P] Crear `supabase/seed.sql` sin usuarios (solo un comentario explicando que el Dueño se crea con `npm run bootstrap:owner`)
- [X] T032 [P] Crear los helpers de E2E: `tests/e2e/helpers/mailpit.ts` (leer el último correo para una dirección y extraer el enlace, con la API HTTP de Mailpit en `127.0.0.1:54324`), `tests/e2e/helpers/totp.ts` (código actual con `otplib` a partir del secreto mostrado en la pantalla de registro) y `tests/e2e/helpers/db.ts` (limpiar tablas y usuarios de Auth entre tests con el cliente admin local)

**Checkpoint**: `npm test` y `npm run db:test` en verde para T013–T020; la base local tiene tipos, `profiles`, `audit_events` y los helpers.

---

## Phase 3: User Story 1 — Inicio de sesión con segundo factor obligatorio (Priority: P1) 🎯 MVP

**Goal**: el Dueño activa su cuenta (contraseña y TOTP), entra y sale con ambos factores. Incluye el bloqueo tras 5 fallos (15 min), el cierre por inactividad (30 min) y por duración máxima (12 h), los códigos de recuperación y los avisos por correo correspondientes.

**Independent Test**: con `npm run bootstrap:owner` y el correo en Mailpit, el Dueño activa su cuenta, inicia y cierra sesión; sin el segundo factor no se puede acceder a nada (`tests/e2e/us1-login-2fa.spec.ts`).

### Pruebas de US1 (escribir primero, deben fallar)

- [X] T033 [P] [US1] Test pgTAP en `supabase/tests/10_auth_lockout.test.sql`: `record_auth_failure(email, ip, factor)` incrementa `auth_attempts.failed_count` de la combinación **correo + IP** para los tres factores (`password`, `totp` y `recovery_code`), también si se mezclan; al 5.º fallo fija `locked_until = now() + 15 min` **solo para esa IP** y registra `account_locked`; otra IP con el mismo correo sigue en 0 y sin bloqueo; un correo inexistente se cuenta y bloquea igual (sin crear perfil, con `attempted_email`); la función indica que hay que enviar el aviso solo si el correo es de un usuario y `last_lock_notice_at` es nulo o tiene más de 24 h (y entonces lo actualiza); `is_locked(email, ip)` refleja el estado; `record_sign_in` pone a 0 el contador de su correo + IP, actualiza `last_sign_in_at` y registra `sign_in`; `record_auth_failure` e `is_locked` funcionan con la IP centinela `0.0.0.0`, y una IP `null` se rechaza con error explícito (nunca llega de la app); además, en `supabase/tests/14_auth_attempts_visibility.test.sql`: sobre `auth_attempts`, el Dueño ve todos los bloqueos vigentes y un Administrador no ve los del Dueño, los de otros Administradores ni los de correos sin usuario (movido desde T016, porque la tabla se crea en T042)
- [X] T034 [P] [US1] Test pgTAP en `supabase/tests/11_access_token_hook.test.sql` (Supabase reserva al superusuario la pertenencia a `supabase_auth_admin`, así que se verifican la lógica del hook y, explícitamente, los permisos y políticas de ese rol; el camino real como `supabase_auth_admin` con RLS lo ejercen todos los inicios de sesión de la E2E): `custom_access_token_hook` devuelve error para usuarios sin perfil, dados de baja o con `app_sessions.last_activity_at` de más de 30 min; **permite** el token si aún no existe la fila de `app_sessions`; añade el claim `user_role` en los casos permitidos
- [X] T035 [P] [US1] Test pgTAP en `supabase/tests/12_recovery_codes.test.sql`: `regenerate_recovery_codes()` devuelve 10 códigos, guarda solo hashes y borra los anteriores; `consume_recovery_code` acepta un código válido una sola vez e **invalida en ese momento todos los demás códigos** del usuario, cuenta el fallo como intento y registra `recovery_code_used`; `remaining_recovery_codes()` devuelve el conteo sin exponer hashes
- [X] T036 [P] [US1] Test pgTAP en `supabase/tests/13_owner_activation.test.sql`: la invitación de arranque (rol owner, `invited_by` null) se acepta una vez y crea `profiles` y los eventos `invitation_accepted` y `user_created`; un segundo Dueño falla por el índice único; un token caducado o usado se rechaza
- [X] T037 [P] [US1] Test Vitest en `tests/unit/idle.test.ts` para `src/lib/auth/idle.ts` (`isIdleExpired(lastActivity, now)` con límite exacto de 30 min, usado por el temporizador del cliente)
- [X] T038 [P] [US1] Test Vitest en `tests/unit/recovery-code-format.test.ts` para `src/lib/auth/recovery-code.ts` (normaliza mayúsculas y guiones; formato de 10 caracteres sin caracteres ambiguos)
- [X] T039 [US1] Test E2E en `tests/e2e/us1-login-2fa.spec.ts` que cubre los escenarios 1–9 de la Historia 1: activación desde el correo en Mailpit con 10 códigos mostrados; login correcto; TOTP incorrecto rechazado con `sign_in_failed` (factor `totp`); con AAL1, `/` redirige a `/login/mfa`; mensaje genérico con credenciales incorrectas; bloqueo tras **5 contraseñas incorrectas** y, en otro caso, tras **contraseña correcta y 5 códigos TOTP incorrectos** desde la misma IP (encabezado `x-vercel-forwarded-for` fijado por contexto de Playwright, que simula el de Vercel), con el 6.º intento desde esa IP rechazado aunque sea correcto; el mensaje de bloqueo es **idéntico** para un correo existente y uno inexistente; con ese bloqueo vigente, el mismo usuario **entra desde otra IP** (SC-010); un `X-Forwarded-For` falso que cambia en cada intento **no** cambia la pareja correo + IP ni la IP de la bitácora, que salen solo de `x-vercel-forwarded-for` (SC-011); 31 min de inactividad con `page.clock` → `/login?reason=idle`; sesión de más de 12 h (`created_at` forzado en `app_sessions`) → `/login?reason=max_age`; código de recuperación → registro obligatorio de un TOTP nuevo y correo `notice_recovery_code_used` que dice que los códigos fueron reemplazados, sin "Te quedan N"; todo el flujo corre con la CSP con nonce activa y sin errores de CSP en la consola; cierre de sesión manual
- [X] T040 [P] [US1] Test E2E en `tests/e2e/security-headers.spec.ts`: las respuestas de `/login`, de `/invite/<token inválido>` y de una ruta protegida (redirección) incluyen `Strict-Transport-Security` con `max-age=63072000; includeSubDomains`, `Content-Security-Policy` con `frame-ancestors 'none'`, `default-src 'self'`, `object-src 'none'`, `script-src` con `'nonce-…'` y `'strict-dynamic'` y **sin** `'unsafe-eval'` ni `'unsafe-inline'`, y un nonce distinto en cada petición, `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin` (research R12)

### Implementación de US1

- [X] T041 [US1] Migración `invitations`: tabla según data-model (`email` citext "único entre invitaciones `pending`" mediante índice parcial, `role` user_role, `token_hash` bytea, `invited_by` uuid null FK → profiles "null solo en la invitación de arranque", `status` invitation_status default `pending`, `expires_at` default `now() + interval '7 days'`, `created_at`, `accepted_at`, `revoked_at`); RLS con la restrictiva AAL2; `select`: Dueño todas, Administrador solo de rol `collaborator` o `reader`
- [X] T042 [US1] Migración `recovery_codes_sessions_and_attempts`: tablas `recovery_codes` (`code_hash` text con `crypt(code, gen_salt('bf'))`, `used_at` null), `app_sessions` (`session_id` uuid PK, `user_id`, `last_activity_at`, `created_at`) y `auth_attempts` (PK `(email citext, ip inet)`, `failed_count` smallint "0–5", `locked_until` timestamptz null, `updated_at`; **sin FK** a `profiles`), todas con RLS activada, con la política **restrictiva** AAL2 + `is_active_user()` y sin políticas de escritura para `authenticated`; `select` en `auth_attempts` solo de filas con `locked_until > now()`: el Dueño todas, el Administrador solo las de correos de perfiles `collaborator` o `reader`; política `for select to supabase_auth_admin using (true)` en `app_sessions` para el hook; job de `pg_cron` diario que borra `app_sessions` de más de 24 h y `auth_attempts` sin bloqueo vigente ni cambios en 24 h
- [X] T043 [US1] Migración `auth_functions`: `is_locked(email, ip)`, `record_auth_failure(email, ip, factor)` (cuenta por correo + IP; devuelve si hay que enviar `notice_account_locked`) y `consume_recovery_code(user_id, code, ip)` (solo `service_role`); `record_sign_in(ip, method)` (usuario autenticado con AAL2; toma el `session_id` del JWT, no de un parámetro, para que nadie pueda pasar el de otra sesión; pone a 0 su contador de correo + IP, crea o actualiza `app_sessions`, evento `sign_in`); `check_session()` (también toma el `session_id` del JWT) (devuelve `ok`, `idle`, `max_age` o `inactive_user` según data-model; si es `ok`, actualiza `last_activity_at` como mucho una vez por minuto; registra `session_expired` con `{reason}` en `idle` y `max_age`); `complete_mfa_enrollment()` (evento `mfa_enrolled`); `regenerate_recovery_codes()` (devuelve los códigos en claro una sola vez, evento `recovery_codes_regenerated`); `remaining_recovery_codes()`; `invitation_for_token(token_hash)` y `accept_invitation(token_hash, user_id, full_name)`, ambas solo `service_role` (T033, T035 y T036 deben pasar)
- [X] T044 [US1] Migración `custom_access_token_hook`: función `public.custom_access_token_hook(event jsonb)` según research R5–R6 y la tabla de funciones de data-model (sin perfil → deniega; sin fila de sesión → permite), con `grant execute` a `supabase_auth_admin`, `revoke` a `authenticated`/`anon`/`public`, `grant usage on schema public` y `grant select` sobre `profiles` y `app_sessions` a `supabase_auth_admin` (las políticas RLS para ese rol están en T022 y T042); activarla en `supabase/config.toml` (`[auth.hook.custom_access_token] enabled = true`, `uri = "pg-functions://postgres/public/custom_access_token_hook"`) (T034 debe pasar)
- [X] T045 [P] [US1] Implementar `src/lib/auth/idle.ts` y `src/lib/auth/recovery-code.ts` (T037 y T038 deben pasar)
- [X] T046 [US1] Implementar `scripts/bootstrap-owner.ts`: lee env, sale sin hacer nada si ya existe un Dueño o una invitación de Dueño pendiente, crea la invitación de rol `owner` para `admin@nexoru.ai` (token aleatorio de 32 bytes; en la base solo el hash SHA-256) y envía la plantilla `invitation` con el enlace `${APP_URL}/invite/<token>`
- [X] T047 [US1] Implementar `src/lib/auth/invitation.ts` con `acceptInvitation(token, fullName, password)`: hash del token, validación de vigencia, `validatePassword`, `admin.auth.admin.createUser({ email, password, email_confirm: true })`, RPC `accept_invitation`, inicio de sesión y redirección a `/mfa/enroll`; errores `invalid_or_expired` y `weak_password` (contracts/actions.md)
- [X] T048 [US1] Implementar `src/lib/auth/actions.ts` según contracts/actions.md, con la IP de `getClientIp()` (si devuelve `null`, en producción, rechaza el intento con el mensaje genérico y registra `sign_in_failed` con `reason: "untrusted_ip"`): `signIn` (rechaza si `is_locked(email, ip)`; si falla, `record_auth_failure(email, ip, 'password')`, también para correos inexistentes, y, si esa llamada lo indica, envía `notice_account_locked`); `verifyTotp` (mismo control de bloqueo; si falla, `record_auth_failure(email, ip, 'totp')`: **los fallos de TOTP cuentan para el bloqueo**, FR-005); `redeemRecoveryCode` (mismo control; `consume_recovery_code` → `admin.auth.admin.mfa.deleteFactor` para cada factor → `notice_recovery_code_used`); `enrollTotp`; `confirmTotp` (→ `complete_mfa_enrollment` + `regenerate_recovery_codes` + `notice_mfa_enrolled`); `signOut` (evento `sign_out`). El error de bloqueo es **siempre** "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.", exista o no la cuenta y sin minutos exactos (FR-006). Mapa de códigos de error de Supabase Auth a español en `src/lib/auth/errors.ts` (FR-031)
- [X] T049 [US1] Implementar `src/proxy.ts` según contracts/actions.md: genera en cada petición la CSP con nonce de research R12 (cabecera en la petición para que Next aplique el nonce, y en la respuesta, incluidas las redirecciones); refresca la sesión con `@supabase/ssr`; rutas públicas (`/login`, `/forgot-password`, `/invite/*`, `/auth/*`); con AAL1 → `/login/mfa` si hay un factor TOTP verificado o `/mfa/enroll` si no hay ninguno (estado leído de Supabase MFA, no de `profiles`); en rutas AAL2 llama a `check_session(session_id)` en **cada petición** y, si no devuelve `ok`, cierra la sesión y redirige a `/login?reason=<idle|max_age|inactive_user>` (FR-007, FR-020, SC-004)
- [X] T050 [P] [US1] Página `src/app/(auth)/login/page.tsx`: formulario de correo y contraseña con `signIn`, mensaje de bloqueo genérico (el de T048) y aviso cuando `reason=idle`, `max_age` o `inactive_user`
- [X] T051 [P] [US1] Página `src/app/(auth)/login/mfa/page.tsx`: campo de 6 dígitos (un `Input` normal: `input-otp` pone estilos en atributos `style` que la CSP con nonce bloquea, research R12) con `verifyTotp` y enlace "Usar un código de recuperación"
- [X] T052 [P] [US1] Página `src/app/(auth)/login/recovery-code/page.tsx` con `redeemRecoveryCode`
- [X] T053 [P] [US1] Página `src/app/(auth)/mfa/enroll/page.tsx`: QR (SVG que devuelve `mfa.enroll`) y la clave en texto para introducirla a mano; verificación del primer código; después muestra los 10 códigos **una sola vez**, con "Copiar", "Descargar .txt" y la confirmación "Ya los guardé" antes de continuar
- [X] T054 [P] [US1] Página `src/app/(auth)/invite/[token]/page.tsx`: nombre completo, contraseña y confirmación con `acceptInvitation`; si la invitación no es válida, muestra "Pide una invitación nueva a tu administrador"
- [X] T055 [P] [US1] Componente `src/components/idle-timer.tsx`: cuenta la actividad (teclado, ratón, toque, scroll) en todas las pestañas con `BroadcastChannel`; a los 30 min llama a `signOut` y redirige a `/login?reason=idle`
- [X] T056 [US1] Layout `src/app/(app)/layout.tsx`: verifica en el servidor AAL2 y `is_active_user()` (segunda barrera tras el proxy), monta `IdleTimer`, navegación según rol (Inicio y Mi cuenta; los enlaces a Usuarios y Bitácora se añaden en US2 y US5, al existir esas páginas), botón "Cerrar sesión" y aviso cuando `remaining_recovery_codes() <= 2`; página `src/app/(app)/page.tsx` con un panel de bienvenida vacío; `/login` muestra un mensaje en español para cada `reason`
- [X] T057 [US1] Página `src/app/(app)/account/page.tsx` con la sección "Códigos de recuperación": cuántos quedan y "Regenerar" (`regenerate_recovery_codes`, muestra los nuevos una vez) (FR-003)
- [X] T058 [US1] Cabeceras de seguridad (actualizada 2026-09-28): `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin` en `next.config.ts` con `headers()` para `/:path*`, y también en las redirecciones de `proxy.ts`; la CSP con nonce la emite `proxy.ts` (T049), sin `'unsafe-eval'` en ningún entorno; el layout raíz fuerza el renderizado dinámico con `connection()` para que el nonce se aplique (T040 debe pasar)
- [X] T059 [US1] Ejecutar T033–T039 y T040 hasta verde; corregir sin modificar las pruebas salvo error demostrable en ellas

**Checkpoint**: MVP funcional en local. El Dueño puede usar Nexoru Op con 2FA.

---

## Phase 3b: Ajustes por la redefinición (US1 sin correo)

**Purpose**: retirar todo envío de correo y adaptar la activación del Dueño (research R3, R4),
dejando US1 en verde. Las migraciones se editan en su lugar: nunca se aplicaron fuera de las
instancias locales y de CI, que se recrean con `supabase db reset`.

### Pruebas primero (deben fallar donde cambia el comportamiento)

- [X] T060 [US1] Adaptar las pruebas de US1: `tests/e2e/helpers/owner.ts` obtiene el enlace de activación de la salida de `npm run bootstrap:owner` (sin Mailpit); `tests/e2e/us1-login-2fa.spec.ts` deja de esperar correos (avisos de bloqueo y de código de recuperación); nueva `tests/e2e/us1-activation.spec.ts`: el enlace se muestra en la terminal y caduca en 1 hora, ejecutar el script dos veces invalida el primer enlace y el segundo funciona, y con el Dueño activo el script no crea nada y lo indica (FR-036); `supabase/tests/10_auth_lockout.test.sql` sin `last_lock_notice_at` ni aviso (`record_auth_failure` no devuelve nada); `supabase/tests/12_recovery_codes.test.sql` con `consume_recovery_code` devolviendo `boolean`; borrar `tests/unit/email-templates.test.ts`

### Implementación

- [X] T061 [US1] Editar las migraciones existentes: quitar `email_failed` del enum `audit_action` y actualizar el comentario que cita `contracts/audit-and-emails.md` (ahora `audit-events.md`) en `types_and_extensions`; quitar `profiles.last_lock_notice_at` en `profiles`; en `auth_functions`, `record_auth_failure` pasa a `returns void` y `consume_recovery_code` a `returns boolean`, sin la lógica de avisos (T060 debe pasar en pgTAP)
- [X] T062 [US1] Eliminar el correo del código: borrar `src/lib/email/` (`templates.ts`, `send.ts`); quitar `nodemailer` y `@types/nodemailer` de `package.json`; quitar `SMTP_*` y `EMAIL_FROM` de `src/lib/env.server.ts` y `.env.example`; en `src/lib/auth/actions.ts`, quitar `sendEmail` y el manejo de `notify` / `notify_lock` (FR-032)
- [X] T063 [US1] `scripts/bootstrap-owner.ts` sin correo: si el Dueño existe, no hace nada y lo indica; si no, revoca las invitaciones de Dueño pendientes (evento `invitation_revoked`), crea una nueva con caducidad de 1 hora (evento `invitation_sent`) e imprime el enlace `${APP_URL}/invite/<token>` en la terminal (FR-036, research R4)
- [X] T064 [US1] Limpieza de configuración: en `supabase/config.toml`, volver a comentar `smtp_port` de Mailpit; borrar `tests/e2e/helpers/mailpit.ts`; en `.github/workflows/ci.yml`, quitar las variables `SMTP_*` y `EMAIL_FROM`, añadir el disparador `pull_request` hacia `main` además de `push` (verificación 3.1 del estándar) y usar `APP_URL=http://127.0.0.1:3000`; solo en local (FR-033): scripts `dev` y `start` de `package.json` con `-H 127.0.0.1`, `baseURL` y `webServer.url` de `playwright.config.ts` en `http://127.0.0.1:3000`, `site_url` y `additional_redirect_urls` de `supabase/config.toml` en `http://127.0.0.1:3000`, y `.env.example` con `APP_URL=http://127.0.0.1:3000` como ejemplo local
- [X] T065 [US1] Ejecutar lint, typecheck, Vitest, pgTAP y E2E hasta verde; corregir sin debilitar las pruebas

**Checkpoint**: US1 en verde sin ninguna dependencia de correo.

---

## Phase 4: User Story 6 — Puesta en marcha local (Priority: P3)

**Goal**: el Dueño arranca y detiene Nexoru Op con un comando, en un entorno de uso separado del
de pruebas (FR-033 a FR-035, research R13 y R14).

**Independent Test**: con `op:start`, la app responde en `http://127.0.0.1:3200` y el Dueño entra;
la huella del entorno de uso es la misma antes y después de correr todas las pruebas.

### Pruebas primero (deben fallar)

- [ ] T066 [P] [US6] Test Vitest en `tests/unit/env-guard.test.ts` para `scripts/env-guard.ts`: `assertTestEnv(url)` acepta `http://127.0.0.1:54321` y rechaza `http://127.0.0.1:55321` y cualquier URL no local; `assertOpsEnv(url)` acepta 55321 y rechaza 54321; ambos explican el motivo en español
- [ ] T067 [P] [US6] Test Vitest en `tests/unit/env-isolation.test.ts`: ningún script de pruebas de `package.json` (`test`, `test:e2e`, `db:test`, `dev`, `bootstrap:owner`), ni `playwright.config.ts`, `vitest.config.ts` o archivo de `tests/`, menciona `55321`, `55322`, `55323`, `ops/` ni `.env.op.local`; y todos los scripts `op:*` usan `ops`/`.env.op.local` (SC-012)

### Implementación

- [X] T068 [US6] [MANUAL] Docker solo en local (FR-033, quickstart §1b): con Supabase detenido, crear o editar `/etc/docker/daemon.json` con `{"ip": "127.0.0.1"}`, reiniciar Docker y comprobar con `ss -ltn` que los puertos de la instancia de pruebas (54321–54323) solo escuchan en `127.0.0.1`. Claude da los pasos exactos para la terminal integrada y espera la confirmación — *Hecha el 2026-09-28. Hallazgo: `daemon.json` solo cubre la red `bridge` de Docker; la red propia de Supabase seguía en `0.0.0.0`. Se resuelve en T072 y en el script `db:start` (research R1).*
- [X] T069 [US6] Implementar `scripts/env-guard.ts` (T066 debe pasar) y aplicarlo: `tests/e2e/helpers/db.ts` y `playwright.config.ts` llaman a `assertTestEnv` antes de conectarse; los scripts `op:*` llaman a `assertOpsEnv`
- [X] T070 [US6] Instancia de uso: `ops/supabase/config.toml` con `project_id = "nexoru-op-live"`, puertos 55321–55329, la misma configuración de Auth que `supabase/config.toml` (registro público desactivado, contraseña de 12+, TOTP, `timebox = "12h"`, JWT de 300 s, hook de tokens) y `site_url = "http://127.0.0.1:3200"`; `ops/supabase/migrations` como enlace simbólico a `../../supabase/migrations`; sin seed
- [X] T071 [US6] `next.config.ts`: `distDir` desde `NEXT_DIST_DIR` (por defecto `.next`), para que el build de uso (`.next-op`) no choque con el de pruebas; añadir `.next-op/` y `.op/` a `.gitignore`
- [X] T072 [US6] `scripts/op-start.ts` y `scripts/op-stop.ts`, con los scripts `op:start`, `op:stop` y `op:bootstrap-owner` en `package.json`, más `db:start` (instancia de pruebas con la misma comprobación de red, en `scripts/supabase-network.ts`): cargan `.env.op.local` y `assertOpsEnv`; antes de arrancar Supabase, `op:start` crea la red `supabase_network_nexoru-op-live` con `com.docker.network.bridge.host_binding_ipv4=127.0.0.1` si falta y se niega a arrancar si existe sin esa opción; después arranca `supabase start --workdir ops`, aplica migraciones pendientes sin resetear (`supabase migration up --workdir ops --local`), construye con `NEXT_DIST_DIR=.next-op`, comprueba que el puerto 3200 está libre (si no, falla con mensaje claro) y lanza `next start -H 127.0.0.1 -p 3200` en segundo plano, con PID y log en `.op/`; `op:stop` detiene la app por su PID y ejecuta `supabase stop --workdir ops` sin borrar datos
- [X] T073 [US6] Script `op:fingerprint` (solo lectura, entorno de uso): imprime una huella de la cuenta del Dueño, sus factores, los códigos de recuperación y el número de eventos de la bitácora, para comprobar el aislamiento (SC-012)
- [X] T074 [US6] Ejecutar T066–T067 hasta verde, más lint, typecheck y la batería completa
- [X] T075 [US6] [MANUAL] Puesta en marcha real: crear `.env.op.local` (quickstart §2), `npm run op:start`, `npm run op:bootstrap-owner`, activar la cuenta y guardar los códigos (quickstart §4), `npm run op:stop` y `op:start` de nuevo para comprobar que la cuenta persiste; medir el tiempo desde `op:bootstrap-owner` hasta entrar (SC-003: menos de 5 minutos) — *Hecha el 2026-09-28: activación en 20 s (SC-003) y cuenta persistente tras `op:stop`/`op:start`.*
- [X] T076 [US6] [MANUAL] Validación de aislamiento y red: `npm run op:fingerprint` antes y después de `npm test`, `npm run db:test` y `npm run test:e2e` con el entorno de uso en marcha (misma huella); comprobar con `ss -ltn` que la app (3200), la base de datos (55322) y Studio (55323) solo escuchan en `127.0.0.1`, y que `http://<ip-de-la-máquina>:3200` y `:55323` no responden desde otro dispositivo de la red; ejecutar los procedimientos manuales de 2FA perdido y contraseña olvidada (quickstart §5 y §6) y comprobar sus eventos en la bitácora con las consultas del §7 (quickstart, escenarios 8, 9 y 11; FR-037, FR-038) — *Hecha el 2026-09-28: huella idéntica (`965bcf22f806afa5`) antes y después de Vitest, pgTAP y E2E; todos los puertos en `127.0.0.1` y cerrados desde la red, también desde otro dispositivo. La validación de los procedimientos manuales se pospuso por decisión del Dueño: backlog B-008.*
- ~~T077~~ *(movida al backlog, B-009, el 2026-09-28)* (Opcional, baja prioridad) `op:backup` y `op:restore`: volcado y restauración de la base de uso en `.op/backups/` (ignorado por git)

**Checkpoint**: el Dueño usa Nexoru Op en local; las pruebas no pueden tocar su entorno, y nada
escucha fuera de `127.0.0.1`.

---

## Phase 5: Cierre de la feature

- [X] T078 [P] Actualizar `CLAUDE.md` (comandos `op:*`, entornos de uso y pruebas, estructura) y crear `README.md` en español (qué es Nexoru Op, cómo arrancarlo y cómo probarlo)
- [X] T079 Revisión de seguridad: ningún archivo de `src/app` o componente cliente importa `src/lib/supabase/admin.ts` ni `src/lib/env.server.ts`; `git ls-files | grep -i env` devuelve solo `.env.example`; `grep -rn nodemailer` no encuentra nada fuera del historial (SC-013); el único `fetch` a un dominio externo es el de HIBP (principio XII); toda tabla tiene RLS (T014); la prueba de cobertura de la bitácora (`tests/unit/audit-coverage.test.ts`: cada valor vigente de `audit_action` aparece en `supabase/migrations/`, `src/` o el quickstart); y `ss -ltn` sin puertos del proyecto en `0.0.0.0` (FR-033)
- [X] T080 Ejecutar la validación completa de `specs/001-user-access/quickstart.md` (Parte 2, escenarios 1–11) y anotar los resultados
- [X] T081 Al cerrar la fase: actualizar `PROJECT.md` (roadmap, evidencia de validación, pendientes y siguiente hito) y `docs/mapa-funcional.md` según el Estándar de Proyecto Nexoru, y la fila de Nexoru Op en `/home/fili/proyectos/CLAUDE.md`; quitar el "Sync Impact Report" de la constitución
- [ ] T082 [MANUAL] GitHub: activar en el ruleset `main` *Require status checks to pass* con `lint, types, unit, db and e2e tests` y guardar (quickstart §7); Claude lo verifica con `gh`
- [ ] T083 Con la autorización de push del Dueño: push de `001-user-access` y PR hacia `main` con `gh pr create`, descripción en español (redefinición, resumen, pruebas y tareas [MANUAL]); esperar CI en verde
- [ ] T084 [MANUAL] Revisar y hacer merge del PR con "Create a merge commit"

---

## Dependencies & Execution Order

- **Fases 1–3**: hechas.
- **Fase 3b**: primero; deja US1 sin correo y en verde.
- **Fase 4 (US6)**: depende de 3b. T068, T075 y T076 son [MANUAL]; T075–T076 requieren T068–T074.
- **Fase 5**: depende de 3b y 4. T082 debe estar antes del merge (T084).

### Dentro de cada fase

1. Pruebas escritas y **fallando**.
2. Migraciones SQL.
3. Código.
4. Tarea final "ejecutar hasta verde".

---

## Implementation Strategy

1. Fase 3b → US1 sin correo, en verde.
2. Fase 4 → el Dueño puede usar Nexoru Op en local (T075).
3. Fase 5 → un solo PR de la feature hacia `main`, con el push autorizado por el Dueño.

La siguiente feature (dashboard del portafolio: lector seguro de `PROJECTS_ROOT`, conformidad con
el estándar e historial de git) empieza con `/speckit-specify` después del merge.

---

## Notes

- **[MANUAL]**: Claude se detiene, da los pasos exactos y espera la confirmación del Dueño.
- Nunca se pega un valor secreto en el chat ni en un archivo versionado: solo en `.env.local` o
  `.env.op.local`.
- Si una prueba parece incorrecta, se corrige primero la spec o el contrato y después la prueba;
  nunca se debilita una prueba para que pase.
