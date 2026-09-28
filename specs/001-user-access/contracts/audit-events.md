# Contrato: eventos de auditoría

## Eventos (`audit_action`)

Cubre FR-026. Nexoru Op no envía correos (FR-032). Ningún evento guarda contraseñas, códigos, tokens ni enlaces (FR-030).

| `action` | Cuándo | `metadata` (sin secretos) |
|----------|--------|---------------------------|
| `sign_in` | Acceso completado con AAL2 | `{ method: "totp" }` o `{ method: "recovery_code" }` |
| `sign_in_failed` | Fallo de contraseña, TOTP o código de recuperación, o intento sin IP confiable (solo si algún día hubiera despliegue en Vercel) | `{ factor: "password" \| "totp" \| "recovery_code" }` o `{ factor, reason: "untrusted_ip" }` |
| `account_locked` | 5.º fallo consecutivo de un correo desde una IP (con `attempted_email` si el correo no es de ningún usuario) | `{ until }` (la IP va en la columna `ip`) |
| `sign_out` | Cierre manual | `{}` |
| `session_expired` | Cierre por inactividad o por las 12 h, detectado por `check_session` en la siguiente petición | `{ reason: "idle" \| "max_age" }` |
| `invitation_sent` / `invitation_revoked` | `bootstrap:owner` emite un enlace de activación (y revoca el pendiente, si lo hay). `invitation_resent` queda para B-003 | `{ email, role }` |
| `invitation_accepted` | El Dueño activa su cuenta con el enlace | `{ role }` |
| `user_created` | Se crea el perfil | `{ role }` |
| `user_deactivated` / `user_reactivated` | Reservados para B-004 | `{}` |
| `role_changed` | Reservado para B-003 | `{ from, to }` |
| `password_reset_forced` / `mfa_reset_forced` | `mfa_reset_forced`: procedimiento manual de emergencia en Supabase Studio local (quickstart). `password_reset_forced` queda para B-004 | `{ via: "panel" }` |
| `password_reset_requested` | Reservado para B-005 | `{}` |
| `password_changed` | Procedimiento manual local de contraseña olvidada (quickstart). Los demás orígenes quedan para B-005 | `{ via: "panel" }` |
| `mfa_enrolled` | Registro de autenticador | `{}` |
| `recovery_code_used` | Uso de un código (invalida todos los demás) | `{}` |
| `recovery_codes_regenerated` | Regeneración | `{}` |
| `permission_denied` | Reservado para B-003 | `{ attempted_action }` |
| `auth_sync_failed` | Fallo en la Admin API tras una RPC exitosa (p. ej. al borrar factores tras usar un código de recuperación) | `{ operation }` |

## Correos

Ninguno. La redefinición del 2026-09-28 (constitución v2.0.0, principio XII) eliminó las
plantillas de invitación, de reinicio forzado y los avisos `notice_*`. El valor `email_failed` se
retira del enum `audit_action`.
