# Implementation Plan: Acceso seguro y administración de usuarios

**Branch**: `001-user-access` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-user-access/spec.md`

## Summary

Nexoru Op necesita acceso solo por invitación, con contraseña y TOTP obligatorio, cuatro roles
(Dueño, Administrador, Colaborador, Lector), gestión de usuarios y una bitácora de auditoría
inmutable.

**Enfoque técnico**:

- Next.js 16 (App Router) sobre **Vercel Pro**, con **Supabase Pro** como Postgres + Auth (MFA
  TOTP nativo).
- Los permisos se hacen cumplir **en la base de datos**: RLS restrictiva que exige AAL2 y cuenta
  activa, y funciones `security definer` que validan la matriz de permisos y escriben la
  auditoría en la misma transacción.
- Lo que Supabase no trae se implementa con piezas pequeñas propias:
  - Invitaciones de 7 días.
  - Códigos de recuperación.
  - Bloqueo tras 5 fallos, contado por **correo + IP** para que nadie pueda bloquear al Dueño
    desde fuera (research R5).
  - Inactividad de 30 min.

  Un **Custom Access Token Hook** impide que el servidor de Auth emita tokens a cuentas
  dadas de baja o a sesiones inactivas.
- Cabeceras de seguridad HTTP (HSTS, CSP con `frame-ancestors 'none'`, `X-Content-Type-Options`,
  `Referrer-Policy`) en `next.config.ts` (research R12).
- Correo por SMTP con **Resend Free** desde `no-reply@nexoru.ai`.
- **Costo total recomendado: 45 USD/mes** (detalle en [research.md](research.md#resumen-de-costos)).
  Supabase Pro y Vercel Pro se contratan al desplegar el MVP; mientras tanto, el desarrollo usa
  solo Supabase local y cuesta 0 USD.

**Entrega**: cada historia de usuario se entrega en **su propio PR** de `001-user-access` hacia
`main`, con CI en verde, las migraciones aplicadas en producción antes del merge y merge commit
(no squash) para que la rama siga limpia para la historia siguiente.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 24 LTS, SQL (PostgreSQL 17 de Supabase)

**Primary Dependencies**:

- Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui.
- `@supabase/ssr` y `@supabase/supabase-js`.
- `zod` (validación de entradas) y `nodemailer` (SMTP).
- Solo para desarrollo: `otplib` (TOTP en los tests).

**Storage**: Supabase Postgres, con migraciones SQL versionadas en `supabase/migrations/`
(Supabase CLI)

**Testing**:

- Vitest (unitarias).
- pgTAP con `supabase test db` (RLS y funciones SQL).
- Playwright (E2E contra Supabase local y Mailpit).

**Target Platform**: web; Vercel (región `iad1`) + Supabase (us-east-1); navegadores de
escritorio y móvil actuales

**Project Type**: aplicación web full-stack (Next.js monolítico: la UI y las server actions en
el mismo proyecto)

**Performance Goals**: acceso completo en menos de 30 s de interacción de usuario (SC-002);
bitácora filtrada en menos de 1 s con miles de eventos

**Constraints**:

- Cero secretos en el repo.
- Toda tabla con RLS.
- Toda mutación sensible auditada de forma atómica.
- Interfaz en español; código en inglés.
- Baja efectiva en menos de 1 min (SC-004).

**Scale/Scope**: menos de 50 usuarios, ~11 pantallas, 6 tablas propias, unos miles de eventos
de auditoría al año

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principio | Cumple | Evidencia |
|---|-----------|--------|-----------|
| I | Seguridad primero | ✅ | TOTP obligatorio (AAL2 exigido por RLS restrictiva en todas las tablas); matriz de mínimo privilegio en SQL ([permissions](contracts/permissions.md)); RLS en las 6 tablas; bitácora de solo inserción con evento atómico en cada acción sensible ([data-model](data-model.md)) |
| II | Cero secretos | ✅ | Secretos solo en Vercel (Sensitive) y Supabase; `.env.example` sin valores; tokens de invitación y códigos de recuperación guardados solo como hash; FR-030 impide secretos en la bitácora; CI sin secretos; repo público con Secret scanning y Push protection de GitHub activados; `CLAUDE.md` prohíbe datos reales de clientes, correos personales y capturas en el repo |
| III | Costo mínimo | ✅ | Costo mensual documentado con la alternativa gratuita evaluada para cada servicio ([research](research.md#resumen-de-costos)). Se eligen dos servicios de pago (Vercel Pro y Supabase Pro), cada uno con su justificación: el gratuito no cumple (uso comercial; pausas, backups y controles de Auth) |
| IV | Stack homologado | ✅ | TypeScript, Next.js, Supabase, GitHub y Vercel. Tecnologías adicionales justificadas abajo |
| V | Spec-driven | ✅ | Spec aclarada (6 decisiones registradas); este plan; tasks pendientes de `/speckit-tasks` y de aprobación |
| VI | Pruebas | ✅ | Vitest (lógica), pgTAP (RLS y permisos), Playwright (login con 2FA, alta, baja y permisos); CI obligatorio en cada PR |
| VII | Simplicidad | ✅ | Un solo proyecto Next.js; sin capa de repositorios ni ORM; un único canal de correo (SMTP); sin tabla de asignaciones hasta que exista algo asignable |
| VIII | Crecimiento modular | ✅ | Feature independiente; `lib/auth` y las funciones SQL de permisos son la interfaz que usarán los módulos futuros |
| IX | Contexto autosuficiente | ✅ | research, data-model, contracts y quickstart documentan las decisiones y los pasos manuales; `CLAUDE.md` se actualiza con los comandos del proyecto en las tareas |
| X | Idioma | ✅ | UI y correos en español; esquema, código y commits en inglés |
| Gob. | `main` protegida | ✅ | Repo público desde el 2026-09-26: ruleset gratuito que exige PR y el check de CI (ruleset en T011, check de CI exigido en T065, research R11); Secret scanning y Push protection activados (T012) |

**Tecnologías fuera del stack base (principio IV)**:

| Tecnología | Por qué | Costo |
|------------|---------|-------|
| Tailwind + shadcn/ui | Pedido explícito; componentes accesibles sin librería de UI de pago | 0 |
| Resend (SMTP) | Supabase no envía correo a terceros sin SMTP propio (R3) | 0 |
| `nodemailer` | Cliente SMTP estándar; el mismo código envía a Resend en producción y a Mailpit en pruebas | 0 |
| `zod` | Validación de entradas de las server actions en el servidor | 0 |
| pgTAP | La única forma de probar RLS dentro de Postgres; viene con Supabase CLI | 0 |
| `otplib` (dev) | Generar códigos TOTP en los E2E | 0 |
| API k-anonymity de Have I Been Pwned | Comprobar contraseñas filtradas cuando se crea el usuario con la Admin API (R9) | 0 |

**Resultado del gate (antes y después del diseño)**: PASA. Revisado tras `/speckit-analyze` del
2026-09-26: correcciones H1–H4, M1–M7 y L1–L6 aplicadas (L5 sin cambios, por diseño) en data-model, contracts, spec y tasks.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-access/
├── spec.md
├── plan.md                 # Este archivo
├── research.md             # Decisiones técnicas y costos (Phase 0)
├── data-model.md           # Tablas, RLS y estados (Phase 1)
├── quickstart.md           # Pasos manuales del Dueño + validación (Phase 1)
├── contracts/
│   ├── permissions.md      # Matriz de permisos
│   ├── actions.md          # Rutas y server actions
│   └── audit-and-emails.md # Eventos de auditoría y plantillas de correo
├── checklists/requirements.md
└── tasks.md                # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/                  # Público o AAL1: login, login/mfa, login/recovery-code,
│   │                            # mfa/enroll, forgot-password, reset-password, invite/[token]
│   ├── (app)/                   # AAL2: layout con sesión, página de inicio, users/, audit/, account/
│   └── layout.tsx
├── components/
│   ├── ui/                      # shadcn/ui (generado)
│   └── idle-timer.tsx           # Cierre por inactividad en el cliente (R6)
├── lib/
│   ├── supabase/                # Clientes: server, browser y admin (clave secreta, solo servidor)
│   ├── auth/                    # Server actions de autenticación, bloqueo y códigos de recuperación
│   ├── users/                   # Server actions de invitaciones y gestión de usuarios
│   ├── audit/                   # Consulta de la bitácora
│   ├── email/                   # Envío SMTP y plantillas en español
│   ├── permissions.ts           # Espejo TS de la matriz (solo para la UI)
│   └── password.ts              # Longitud mínima + HIBP
└── proxy.ts                     # Sesión, AAL2, redirecciones y última actividad

supabase/
├── config.toml                  # Config local (sin secretos; usa env())
├── migrations/                  # SQL versionado: tipos, tablas, RLS, funciones, hook
├── templates/recovery.html      # Plantilla en español del correo de recuperación
├── tests/                       # pgTAP
└── seed.sql                     # Solo local: sin usuarios reales

scripts/bootstrap-owner.ts       # Invitación inicial de admin@nexoru.ai

tests/
├── unit/                        # Vitest
└── e2e/                         # Playwright

.github/workflows/ci.yml         # lint, typecheck, vitest, pgTAP y Playwright
.env.example                     # Solo nombres de variables
next.config.ts                   # Cabeceras de seguridad HTTP (R12)
```

**Structure Decision**: un único proyecto Next.js en la raíz del repo, con `src/`. La lógica de
permisos vive en `supabase/migrations` (la base de datos decide) y `src/lib` solo orquesta las
llamadas. No se separan frontend y backend porque las server actions cubren el servidor
(principio VII).

## Complexity Tracking

No hay violaciones de la constitución que justificar. Se registran las piezas propias que
añaden complejidad frente a "usar solo Supabase", porque cada una cubre un requisito que
Supabase no trae en los planes Free o Pro:

| Pieza propia | Requisito | Alternativa más simple rechazada porque |
|--------------|-----------|------------------------------------------|
| Tabla `invitations` | FR-011/012 (7 días, revocar, reenviar) | La invitación nativa caduca en 24 h como máximo |
| `recovery_codes` | FR-003/003a | Supabase MFA no tiene códigos de recuperación |
| Tabla `auth_attempts` (correo + IP) | FR-005 | Los hooks nativos de verificación solo existen en Team (599 USD/mes), y contar por cuenta permitiría a un tercero bloquear al Dueño |
| `app_sessions` + hook | FR-007 (30 min) | El inactivity timeout de Supabase mide refrescos de token, no actividad del usuario |
