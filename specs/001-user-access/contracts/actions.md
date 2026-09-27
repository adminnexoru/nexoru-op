# Contrato: rutas y acciones

La app no expone una API pública. La interfaz son **páginas** (App Router) y **server actions**.
Cada server action valida la entrada con zod y devuelve `{ ok: true, data? }` o
`{ ok: false, error: <código> }`. Los mensajes de error visibles están en español y **nunca**
revelan si un correo existe (FR-006). Los códigos de error de Supabase Auth, que llegan en
inglés, se traducen a mensajes en español en un único mapa (`src/lib/auth/errors.ts`, FR-031).
"Service role" significa que la llamada usa la clave secreta de Supabase (`SUPABASE_SECRET_KEY`),
que solo existe en el servidor y nunca llega al navegador.

## Rutas

| Ruta | Acceso | Propósito |
|------|--------|-----------|
| `/login` | Público | Correo + contraseña |
| `/login/mfa` | AAL1 | Código TOTP o enlace a "usar código de recuperación" |
| `/login/recovery-code` | AAL1 | Introducir un código de recuperación |
| `/mfa/enroll` | AAL1 sin factores TOTP verificados | QR + verificación del primer código + mostrar los 10 códigos de recuperación una vez |
| `/forgot-password` | Público | Solicitar el enlace de recuperación |
| `/reset-password` | Enlace de recuperación de Supabase | Definir una contraseña nueva |
| `/invite/[token]` | Público con token válido | Aceptar la invitación: nombre + contraseña, y después `/mfa/enroll` |
| `/` | AAL2 | Inicio (panel vacío en esta feature) |
| `/users` | AAL2, Dueño/Administrador | Listado, invitar y acciones por usuario |
| `/audit` | AAL2, Dueño/Administrador | Bitácora con filtros |
| `/account` | AAL2 | Cambiar la contraseña, regenerar códigos y ver cuántos quedan |

`proxy.ts` hace cumplir el acceso de cada ruta:

1. Refresca la sesión.
2. Con AAL1: si hay un factor verificado, redirige a `/login/mfa`; si no hay ninguno, a
   `/mfa/enroll` (estado leído de Supabase MFA, no de `profiles`).
3. Con AAL2: llama en **cada petición** a `check_session(session_id)`. Si devuelve `idle`,
   `max_age` o `inactive_user`, cierra la sesión y redirige a `/login?reason=<estado>`. Así un
   usuario dado de baja sale en su siguiente acción aunque su token siga vigente (FR-020,
   SC-004).
4. Cualquier otra ruta sin sesión AAL2 redirige a `/login`. **No existe ruta de registro**
(FR-009).

## Server actions

### Autenticación

| Acción | Entrada | Efecto | Errores |
|--------|---------|--------|---------|
| `signIn` | email, password | Si hay bloqueo vigente para **correo + IP** (`auth_attempts`), rechaza sin intentar. Si no, `signInWithPassword`. Si falla: `record_auth_failure(email, ip, factor: 'password')` (service role), también si el correo no existe; si esa llamada indica que hay que avisar, envía `notice_account_locked` (solo si el correo es de un usuario; como mucho uno cada 24 h por cuenta). Si acierta: pone a 0 el contador de ese correo + IP y pasa a sesión AAL1 y redirección al paso de MFA o de registro | `invalid_credentials`, `locked`: el mensaje de bloqueo es **genérico e idéntico** exista o no la cuenta ("Demasiados intentos. Espera unos minutos e inténtalo de nuevo."), sin minutos exactos ni referencia a la cuenta (FR-006) |
| `verifyTotp` | code (6 dígitos) | Si hay bloqueo vigente para correo + IP, rechaza sin verificar. Si no, `mfa.challengeAndVerify`. Si falla: `record_auth_failure(email, ip, factor: 'totp')`, que cuenta para el bloqueo de 5 fallos (FR-005). Si acierta: RPC `record_sign_in` (pone a 0 el contador de correo + IP, `last_sign_in_at`, evento `sign_in`, crea la fila en `app_sessions`) | `invalid_code`, `locked` |
| `redeemRecoveryCode` | code | RPC `consume_recovery_code` (service role; si hay bloqueo vigente para correo + IP, rechaza; un código inválido cuenta como intento con factor `recovery_code` sobre correo + IP), después `admin.mfa.deleteFactor` por cada factor, correo de aviso y redirección a `/mfa/enroll` | `invalid_code`, `locked` |
| `enrollTotp` / `confirmTotp` | code | `mfa.enroll` → `challengeAndVerify`. Al confirmar: RPC `complete_mfa_enrollment` (evento `mfa_enrolled`), genera 10 códigos (RPC `regenerate_recovery_codes`, devuelve los códigos en claro **una única vez**) y correo de aviso | `invalid_code` |
| `signOut` | — | `signOut({ scope: 'local' })` y evento `sign_out` | — |
| `requestPasswordReset` | email | Si existe y está activo: `resetPasswordForEmail` (1 h). La respuesta es la misma en cualquier caso | — |
| `completePasswordReset` | password | Valida la contraseña (12+, HIBP), `updateUser`, revoca todas las sesiones, evento `password_reset_completed` y correo de aviso | `weak_password`, `link_expired` |

### Invitaciones

| Acción | Entrada | Efecto | Errores |
|--------|---------|--------|---------|
| `inviteUser` | email, role | RPC `create_invitation` (permisos + evento) → devuelve el token → correo de invitación | `forbidden`, `already_exists`, `already_invited` |
| `resendInvitation` | invitationId | RPC `resend_invitation` (revoca la anterior y crea una nueva) → correo | `forbidden`, `not_pending` |
| `revokeInvitation` | invitationId | RPC `revoke_invitation` | `forbidden`, `not_pending` |
| `acceptInvitation` | token, full_name, password | Verifica el hash y que siga vigente, valida la contraseña, `admin.createUser` (service role) y RPC `accept_invitation` (crea `profiles`, evento `invitation_accepted` + `user_created`), después inicia sesión y redirige a `/mfa/enroll` | `invalid_or_expired`, `weak_password` |

### Gestión de usuarios

Todas: RPC con permisos + evento (atómico), y después los efectos en Auth con service role.

| Acción | RPC | Efecto posterior en Auth | Aviso al afectado |
|--------|-----|--------------------------|-------------------|
| `changeRole` | `change_role(target, new_role)` | — | ✅ |
| `deactivateUser` | `deactivate_user(target)`: status, revoca sesiones (`auth.sessions`) e invalida invitaciones y enlaces | `admin.updateUserById(ban_duration: '876000h')` | ✅ |
| `reactivateUser` | `reactivate_user(target)` | `admin.updateUserById(ban_duration: 'none')` | ✅ |
| `forcePasswordReset` | `force_password_reset(target)`: revoca sesiones | Contraseña aleatoria con `admin.updateUserById` + `admin.generateLink(recovery)` → correo `forced_password_reset` | ✅ (el mismo correo de reinicio) |
| `forceMfaReset` | `force_mfa_reset(target)`: revoca sesiones y borra los códigos de recuperación | `admin.mfa.deleteFactor` por cada factor | ✅ |

Si el paso en Auth falla, la RPC ya aplicó el cambio en `profiles`, y RLS y el hook de tokens ya
impiden el acceso. El fallo se registra (`auth_sync_failed`) y la acción se puede reintentar
desde la interfaz.

### Bitácora

| Acción | Entrada | Efecto |
|--------|---------|--------|
| `listAuditEvents` | userId?, action?, from?, to?, cursor? | `select` con RLS (FR-029a) y paginación por cursor (50 por página), del más reciente al más antiguo |

### Cuenta propia

| Acción | Efecto |
|--------|--------|
| `changeOwnPassword` | FR-025a: pide la contraseña actual (se verifica con `signInWithPassword`; un fallo cuenta como intento) y la nueva (12+, HIBP), `updateUser`, cierra **todas las demás** sesiones (conserva la actual), evento `password_changed` y aviso |
| `regenerateRecoveryCodes` | RPC `regenerate_recovery_codes`, que devuelve 10 códigos nuevos una vez; evento |

## Puesta en marcha (no es parte de la interfaz)

`npm run bootstrap:owner`: script local que usa `SUPABASE_SECRET_KEY` desde el entorno y
crea la invitación de rol `owner` para `admin@nexoru.ai` **solo si no existe ningún Dueño** ni
invitación de Dueño pendiente. Envía el correo de activación.
