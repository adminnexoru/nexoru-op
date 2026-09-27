# Contrato: matriz de permisos

Fuente única de verdad para la función SQL `can_manage()` y su espejo en TypeScript, que solo
sirve para mostrar u ocultar botones. **La base de datos es la que decide**. Ambas
implementaciones se prueban contra esta tabla: pgTAP en SQL y Vitest en TypeScript.

## Acciones de gestión sobre otro usuario

✅ permitido · ❌ denegado (la función devuelve `denied` y el intento queda en la bitácora)

| Autor ↓ / Afectado → | Dueño | Administrador | Colaborador | Lector |
|----------------------|-------|---------------|-------------|--------|
| **Dueño** | ❌ (sobre sí mismo) | ✅ | ✅ | ✅ |
| **Administrador** | ❌ | ❌ (incluido él mismo) | ✅ | ✅ |
| **Colaborador** | ❌ | ❌ | ❌ | ❌ |
| **Lector** | ❌ | ❌ | ❌ | ❌ |

"Gestión" incluye: cambiar el rol, dar de baja, reactivar, forzar el reinicio de contraseña,
forzar el reinicio del 2FA, y revocar o reenviar invitaciones dirigidas a ese rol.

## Roles que puede asignar cada autor (invitar o cambiar rol)

| Autor | Roles asignables |
|-------|------------------|
| Dueño | Administrador, Colaborador, Lector |
| Administrador | Colaborador, Lector |
| Colaborador / Lector | ninguno |

Nadie puede asignar el rol Dueño desde la app (FR-013, FR-014). Un Administrador no puede subir a
un Colaborador o Lector a Administrador (FR-015).

## Acciones sobre la propia cuenta (todos los roles)

| Acción | Permitido |
|--------|-----------|
| Cerrar sesión | ✅ |
| Cambiar la propia contraseña (con sesión AAL2) | ✅ |
| Regenerar los propios códigos de recuperación | ✅ |
| Cambiar el propio rol o darse de baja | ❌ (FR-017) |

## Lectura

| Recurso | Dueño | Administrador | Colaborador | Lector |
|---------|-------|---------------|-------------|--------|
| Listado de usuarios | ✅ todos | ✅ todos (solo lectura para Dueño y Administradores) | ❌ | ❌ |
| Invitaciones | ✅ todas | ✅ solo de rol Colaborador/Lector | ❌ | ❌ |
| Bitácora | ✅ todo | ✅ subconjunto FR-029a ([data-model.md](../data-model.md#audit_events)) | ❌ | ❌ |
| Bloqueos por intentos (`auth_attempts`) | ✅ todos | ✅ solo de Colaboradores y Lectores | ❌ | ❌ |
| Su propio perfil | ✅ | ✅ | ✅ | ✅ |

## Condiciones previas a cualquier acción

1. Sesión con `aal = aal2`.
2. `profiles.status = 'active'` (el bloqueo por intentos se aplica antes, en el inicio de sesión, por correo + IP).
3. Rol leído de `profiles` en ese momento, no del JWT (FR-016).
