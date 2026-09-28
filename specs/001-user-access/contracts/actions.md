# Contrato: rutas y acciones

La app no expone una API pública. La interfaz son **páginas** (App Router) y **server actions**.
Los mensajes de error visibles están en español y **nunca** revelan si un correo existe (FR-006).
Las acciones de autenticación toman la IP de `getClientIp()` (solo `x-vercel-forwarded-for`; en
local, sin ese encabezado, `0.0.0.0`, research R5). Los códigos de error de Supabase Auth, que
llegan en inglés, se traducen a español en un único mapa (`src/lib/auth/errors.ts`, FR-031).
"Service role" significa que la llamada usa la clave secreta de Supabase (`SUPABASE_SECRET_KEY`),
que solo existe en el servidor y nunca llega al navegador.

**Ninguna acción envía correos ni notificaciones** (principio XII, FR-032).

## Rutas

| Ruta | Acceso | Propósito |
|------|--------|-----------|
| `/login` | Público | Correo + contraseña |
| `/login/mfa` | AAL1 | Código TOTP o enlace a "usar código de recuperación" |
| `/login/recovery-code` | AAL1 | Introducir un código de recuperación |
| `/mfa/enroll` | AAL1 sin factores TOTP verificados | QR + verificación del primer código + mostrar los 10 códigos de recuperación una vez |
| `/invite/[token]` | Público con token válido | Activar la cuenta del Dueño con el enlace de `bootstrap:owner`: nombre + contraseña, y después `/mfa/enroll` |
| `/` | AAL2 | Inicio |
| `/account` | AAL2 | Ver cuántos códigos de recuperación quedan y regenerarlos |

`proxy.ts` hace cumplir el acceso de cada ruta:

1. Genera la CSP con nonce (research R12) y refresca la sesión.
2. Con AAL1: si hay un factor verificado, redirige a `/login/mfa`; si no hay ninguno, a
   `/mfa/enroll` (estado leído de Supabase MFA, no de `profiles`).
3. Con AAL2: llama en **cada petición** a `check_session()`. Si devuelve `idle`, `max_age` o
   `inactive_user`, cierra la sesión y redirige a `/login?reason=<estado>`.
4. Cualquier otra ruta sin sesión AAL2 redirige a `/login`. **No existe ruta de registro**
   (FR-009).

*Movidas al backlog*: `/forgot-password`, `/reset-password` y `/auth/confirm` (B-005); `/users`
(B-003); `/audit` (B-007: la bitácora se consulta desde Studio del entorno de uso, FR-038).

## Server actions

### Autenticación

| Acción | Entrada | Efecto | Errores |
|--------|---------|--------|---------|
| `signIn` | email, password | Si hay bloqueo vigente para **correo + IP** (`auth_attempts`), rechaza sin intentar. Si no, `signInWithPassword`. Si falla: `record_auth_failure(email, ip, 'password')` (service role), también si el correo no existe. Si acierta: sesión AAL1 y redirección al paso de MFA o de registro | `invalid_credentials`, `locked`: el mensaje de bloqueo es **genérico e idéntico** exista o no la cuenta ("Demasiados intentos. Espera unos minutos e inténtalo de nuevo."), sin minutos exactos (FR-006) |
| `verifyTotp` | code (6 dígitos) | Si hay bloqueo vigente, rechaza sin verificar. Si no, `mfa.challengeAndVerify`. Si falla: `record_auth_failure(email, ip, 'totp')`. Si acierta: RPC `record_sign_in` (pone a 0 el contador de correo + IP, `last_sign_in_at`, evento `sign_in`, fila en `app_sessions`) | `invalid_code`, `locked` |
| `redeemRecoveryCode` | code | RPC `consume_recovery_code` (service role; si hay bloqueo vigente, rechaza; un código inválido cuenta como intento con factor `recovery_code`; uno válido invalida en la misma operación todos los códigos), después `admin.mfa.deleteFactor` por cada factor y redirección a `/mfa/enroll` | `invalid_code`, `locked` |
| `enrollTotp` / `confirmTotp` | code | `mfa.enroll` → `challengeAndVerify`. Al confirmar: RPC `complete_mfa_enrollment` (evento `mfa_enrolled`) y `regenerate_recovery_codes` (devuelve los códigos en claro **una única vez**) | `invalid_code` |
| `signOut` / `signOutIdle` | — | `signOut({ scope: 'local' })` y evento `sign_out` o `session_expired` (`idle`) | — |
| `acceptInvitation` | token, full_name, password | Verifica el hash y que siga vigente, valida la contraseña (12+, HIBP), `admin.createUser` (service role) y RPC `accept_invitation` (crea `profiles`, eventos `invitation_accepted` y `user_created`), inicia sesión y redirige a `/mfa/enroll` | `invalid_or_expired`, `weak_password` |

### Cuenta propia

| Acción | Efecto |
|--------|--------|
| `regenerateRecoveryCodes` | RPC `regenerate_recovery_codes`, que devuelve 10 códigos nuevos una vez; evento |

*Movidas al backlog*: `requestPasswordReset`, `completePasswordReset`, `changeOwnPassword`
(B-005); `inviteUser`, `resendInvitation`, `revokeInvitation`, `changeRole` (B-003);
`deactivateUser`, `reactivateUser`, `forcePasswordReset`, `forceMfaReset` (B-004).

## Scripts de terminal (no son parte de la interfaz)

Se ejecutan en la terminal integrada de VS Code.

| Script | Entorno | Efecto |
|--------|---------|--------|
| `npm run bootstrap:owner` | Pruebas (`.env.local`) | Si no existe el Dueño: revoca cualquier enlace de activación pendiente, crea uno nuevo (token de 32 bytes, en la base solo el hash, caduca en 1 hora), registra `invitation_sent` y **muestra el enlace en la terminal**. Si el Dueño ya existe, no hace nada y lo indica (FR-036). No envía correo |
| `npm run op:bootstrap-owner` | Uso (`.env.op.local`) | Lo mismo, contra la instancia de uso |
| `npm run op:start` | Uso | Arranca la instancia de uso de Supabase, aplica migraciones y sirve la app en `http://127.0.0.1:3200` (FR-033, FR-035) |
| `npm run op:stop` | Uso | Detiene la app y la instancia de uso sin borrar datos (FR-035) |
| `npm run op:backup` / `op:restore` | Uso | Opcionales, baja prioridad (research R14) |

Los scripts `op:*` se niegan a correr con las variables de pruebas; los de pruebas, con las de uso
(FR-034, research R13).
