# Contrato: eventos de auditoría y correos

## Eventos (`audit_action`)

Cubre FR-026 y FR-031b. Ningún evento guarda contraseñas, códigos, tokens ni enlaces (FR-030).

| `action` | Cuándo | `metadata` (sin secretos) |
|----------|--------|---------------------------|
| `sign_in` | Acceso completado con AAL2 | `{ method: "totp" }` o `{ method: "recovery_code" }` |
| `sign_in_failed` | Fallo de contraseña, TOTP o código de recuperación, o intento sin IP confiable en producción | `{ factor: "password" \| "totp" \| "recovery_code" }` o `{ factor, reason: "untrusted_ip" }` |
| `account_locked` | 5.º fallo consecutivo de un correo desde una IP (con `attempted_email` si el correo no es de ningún usuario) | `{ until }` (la IP va en la columna `ip`) |
| `sign_out` | Cierre manual | `{}` |
| `session_expired` | Cierre por inactividad o por las 12 h, detectado por `check_session` en la siguiente petición | `{ reason: "idle" \| "max_age" }` |
| `invitation_sent` / `invitation_resent` / `invitation_revoked` | Gestión de invitaciones | `{ email, role }` |
| `invitation_accepted` | La persona acepta | `{ role }` |
| `user_created` | Se crea el perfil | `{ role }` |
| `user_deactivated` / `user_reactivated` | Baja y reactivación | `{}` |
| `role_changed` | Cambio de rol | `{ from, to }` |
| `password_reset_forced` / `mfa_reset_forced` | Reinicios forzados (desde la app, o `mfa_reset_forced` desde el panel de Supabase en el procedimiento de emergencia, quickstart §8) | `{}` o `{ via: "panel" }` |
| `password_reset_requested` | Solicitud de recuperación (solo si el correo es de un usuario activo; si no, se registra con `attempted_email` y `result = failure`) | `{}` |
| `password_changed` | Cambio propio, por recuperación, tras un reinicio forzado o desde el panel de Supabase (quickstart §9) | `{ via: "self" \| "recovery" \| "forced" \| "panel" }` |
| `mfa_enrolled` | Registro de autenticador | `{}` |
| `recovery_code_used` | Uso de un código (invalida todos los demás) | `{}` |
| `recovery_codes_regenerated` | Regeneración | `{}` |
| `permission_denied` | Intento de acción no permitida | `{ attempted_action }` |
| `email_failed` | Fallo al enviar un aviso o invitación (FR-031b) | `{ template }` |
| `auth_sync_failed` | Fallo en la Admin API tras una RPC exitosa | `{ operation }` |

## Correos

Todos en español, con remitente `Nexoru Op <no-reply@nexoru.ai>`, texto plano + HTML simple.
Los avisos **no incluyen enlaces de acceso** (FR-031a); solo indican qué pasó, cuándo y, si
aplica, quién, además de "si no fuiste tú, contacta a admin@nexoru.ai".

| Plantilla | La envía | Contiene enlace | Caducidad |
|-----------|----------|-----------------|-----------|
| `invitation` | App (SMTP) | ✅ `/invite/<token>` | 7 días |
| `password_recovery` | Supabase Auth (SMTP propio) | ✅ enlace de recuperación | 1 h |
| `forced_password_reset` | App, con enlace de `admin.generateLink({ type: "recovery" })` | ✅ enlace de recuperación | 1 h |
| `notice_password_changed` | App | ❌ | — |
| `notice_mfa_enrolled` | App | ❌ | — |
| `notice_mfa_reset` | App | ❌ | — |
| `notice_recovery_code_used` | App: dice que se usó un código y que los códigos fueron reemplazados por un juego nuevo, sin contar cuántos quedan | ❌ | — |
| `notice_role_changed` | App | ❌ | — |
| `notice_account_locked` | App, como mucho uno cada 24 h por cuenta (`profiles.last_lock_notice_at`) | ❌ | — |
| `notice_deactivated` / `notice_reactivated` | App | ❌ | — |

La plantilla `password_recovery` se personaliza en español en el panel de Supabase (ver
quickstart). El reinicio forzado usa su propia plantilla (asunto "Tu administrador pidió que
cambies tu contraseña"), enviada por la app con un enlace generado por la Admin API, que no
envía nada por sí misma.
