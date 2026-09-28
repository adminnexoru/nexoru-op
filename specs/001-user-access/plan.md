# Implementation Plan: Acceso seguro del Dueño y puesta en marcha local

**Branch**: `001-user-access` | **Date**: 2026-09-26 · **Redefinido**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-user-access/spec.md`

## Summary

Nexoru Op es el dashboard local, de solo lectura y para un solo usuario del portafolio de Nexoru
(constitución v2.0.0). Esta primera feature entrega su base: el **acceso seguro del Dueño**
(contraseña + TOTP obligatorio, bloqueo por intentos, sesiones con inactividad y duración
máxima, códigos de recuperación), el **registro de la bitácora** (consultable desde Supabase Studio
del entorno de uso) y la **puesta en marcha local** con entornos de uso y de pruebas separados. La
pantalla de la bitácora (antes US5) está en el backlog (B-007). La lectura del portafolio llega en features
posteriores.

**Enfoque técnico**:

- Next.js 16 (App Router) servido en local con `next start -H 127.0.0.1`, y **Supabase local**
  (Docker) como Postgres + Auth con MFA TOTP nativo. La app, la base de datos y Studio escuchan
  solo en `127.0.0.1`: Docker se configura con `{"ip": "127.0.0.1"}` (FR-033).
- Los permisos se hacen cumplir **en la base de datos**: RLS restrictiva que exige AAL2 y cuenta
  activa, y funciones `security definer` que escriben la auditoría en la misma transacción.
- Piezas propias: activación del Dueño con enlace de un solo uso mostrado en la terminal,
  códigos de recuperación, bloqueo tras 5 fallos (correo + IP), inactividad de 30 min con
  `check_session` y un **Custom Access Token Hook**.
- CSP con **nonce por petición** generada en `proxy.ts`, sin `'unsafe-eval'` ni `'unsafe-inline'`
  en scripts (research R12).
- **Sin correo** (principio XII): se elimina `nodemailer` y todo lo que dependía de él.
- **Dos instancias de Supabase local** (pruebas y uso) con salvaguardas para que ninguna prueba
  toque los datos del Dueño (research R13), y scripts `op:start` / `op:stop`.
- **Costo: 0 USD/mes** (research, resumen de costos).

**Estado**: las fases 1–3 (setup, base común y US1) se implementaron con el diseño anterior, que
incluía correo y despliegue en la nube. La redefinición añade las tareas para retirar el correo,
adaptar la activación y completar la puesta en marcha local.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 24 LTS, SQL (PostgreSQL 17 de Supabase)

**Primary Dependencies**:

- Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui.
- `@supabase/ssr` y `@supabase/supabase-js`.
- `zod` (validación de entradas).
- Solo para desarrollo: `supabase` (CLI), `vitest`, `@playwright/test`, `otplib`, `tsx`.
- Se elimina `nodemailer` y `@types/nodemailer`.

**Storage**: Supabase Postgres local, con migraciones SQL versionadas en `supabase/migrations/`.
Dos instancias: pruebas (`supabase/`) y uso (`ops/supabase/`), research R13.

**Testing**:

- Vitest (unitarias), incluida una prueba que verifica que ningún script de pruebas apunta al
  entorno de uso.
- pgTAP con `supabase test db` (RLS y funciones SQL).
- Playwright (E2E contra la instancia de pruebas).

**Target Platform**: máquina local del Dueño (Linux), navegador de escritorio actual.

**Project Type**: aplicación web full-stack local (Next.js monolítico).

**Performance Goals**: acceso completo en menos de 30 s de interacción (SC-002).

**Constraints**:

- Solo lectura hacia afuera: sin correos, notificaciones ni escrituras en proyectos, git o
  GitHub (principio XII).
- La app, la base de datos y Studio escuchan solo en `127.0.0.1` (FR-033).
- Cero secretos en el repo; toda tabla con RLS; toda mutación sensible auditada de forma atómica.
- Interfaz en español; código en inglés.

**Scale/Scope**: 1 usuario, ~8 pantallas, 6 tablas propias, unos miles de eventos al año.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principio | Cumple | Evidencia |
|---|-----------|--------|-----------|
| I | Seguridad primero | ✅ | TOTP obligatorio (AAL2 exigido por RLS restrictiva en todas las tablas); un solo usuario sin registro público; RLS en las 6 tablas; bitácora de solo inserción; app, base de datos y Studio solo en `127.0.0.1` |
| II | Cero secretos | ✅ | Secretos solo en `.env.local` (pruebas) y `.env.op.local` (uso), ambos ignorados; `.env.example` solo con nombres; tokens de activación y códigos de recuperación guardados como hash; Secret scanning y Push protection activos |
| III | Ejecución local y costo cero | ✅ | Next.js y Supabase locales; 0 USD/mes (research, resumen de costos). La nube pasa a B-006 |
| IV | Stack homologado | ✅ | TypeScript, Next.js, Supabase local, GitHub. Tecnologías adicionales justificadas abajo |
| V | Spec-driven | ✅ | Spec redefinida y aclarada; este plan; tasks con las tareas de la redefinición, pendientes de aprobación |
| VI | Pruebas | ✅ | Vitest, pgTAP y Playwright; E2E de login con 2FA; pruebas de que las pruebas no tocan el entorno de uso (SC-012) |
| VII | Simplicidad | ✅ | Se reutiliza la activación por invitación en vez de crear un flujo nuevo; se conservan sin cambios los roles ya construidos en lugar de quitarlos |
| VIII | Crecimiento modular | ✅ | Esta feature es la base; el lector del portafolio, la conformidad, git y GitHub serán features propias |
| IX | Contexto autosuficiente | ✅ | `PROJECT.md`, `docs/mapa-funcional.md`, `CLAUDE.md`, research, data-model, contracts y quickstart |
| X | Idioma | ✅ | UI y documentación en español; código y commits en inglés |
| XI | Archivos como fuente de verdad | ✅ | Esta feature no guarda datos del portafolio; la base solo tiene cuenta y bitácora |
| XII | Solo lectura | ✅ | Se elimina todo envío de correo; única consulta de red: HIBP (solo lectura, k-anonymity) |
| XIII | Lector seguro | N/A | Esta feature no lee proyectos. Aplica a la feature del lector del portafolio |
| XIV | Estándar desde nexoru-governance | N/A | Aplica a la feature de conformidad |
| Gob. | `main` protegida | ⚠️ | Ruleset con PR obligatorio activo. El check de CI obligatorio (T082) **no quedó guardado** (verificado con `gh` el 2026-09-28); debe estar antes del merge |

**Tecnologías fuera del stack base (principio IV)**:

| Tecnología | Por qué | Costo |
|------------|---------|-------|
| Tailwind + shadcn/ui | Componentes accesibles sin librería de UI de pago | 0 |
| `zod` | Validación de entradas de las server actions | 0 |
| pgTAP | La única forma de probar RLS dentro de Postgres; viene con Supabase CLI | 0 |
| `otplib` (dev) | Generar códigos TOTP en los E2E | 0 |
| Docker | Requisito de Supabase local | 0 |
| API k-anonymity de Have I Been Pwned | Comprobar contraseñas filtradas en la activación (R9) | 0 |

**Resultado del gate**: PASA, con una advertencia de gobernanza (check de CI obligatorio sin
guardar) que debe resolverse antes del merge.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-access/
├── spec.md
├── plan.md                 # Este archivo
├── research.md             # Decisiones técnicas (Phase 0)
├── data-model.md           # Tablas, RLS y estados (Phase 1)
├── quickstart.md           # Puesta en marcha local, procedimientos manuales y validación
├── contracts/
│   ├── permissions.md      # Matriz de permisos (conservada para B-003)
│   ├── actions.md          # Rutas, server actions y scripts de terminal
│   └── audit-events.md     # Eventos de auditoría
├── checklists/requirements.md
└── tasks.md                # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/                  # Público o AAL1: login, login/mfa, login/recovery-code,
│   │                            # mfa/enroll, invite/[token]
│   ├── (app)/                   # AAL2: layout con sesión, inicio y account/
│   └── layout.tsx
├── components/
│   ├── ui/                      # shadcn/ui (generado)
│   └── idle-timer.tsx           # Cierre por inactividad en el cliente (R6)
├── lib/
│   ├── supabase/                # Clientes: server, browser y admin (clave secreta, solo servidor)
│   ├── auth/                    # Server actions de autenticación, bloqueo, códigos y activación
│   ├── permissions.ts           # Espejo TS de la matriz (solo para la UI)
│   ├── password.ts              # Longitud mínima + HIBP
│   └── request.ts               # IP confiable (R5)
└── proxy.ts                     # CSP con nonce, sesión, AAL2 y check_session

supabase/                        # Instancia de PRUEBAS (project_id nexoru-op, puerto 54321)
├── config.toml
├── migrations/                  # SQL versionado (compartido con la instancia de uso)
├── tests/                       # pgTAP
└── seed.sql

ops/supabase/                    # Instancia de USO (project_id nexoru-op-live, puerto 55321)
├── config.toml
└── migrations -> ../../supabase/migrations

scripts/
├── bootstrap-owner.ts           # Enlace de activación del Dueño, mostrado en la terminal
├── op-start.ts / op-stop.ts     # Puesta en marcha del entorno de uso (R14)
└── env-guard.ts                 # Salvaguardas entre entornos (R13)

tests/
├── unit/                        # Vitest (incluye la prueba de aislamiento de entornos)
└── e2e/                         # Playwright

.github/workflows/ci.yml         # push y pull_request a main: lint, typecheck, vitest, pgTAP, E2E
.env.example                     # Solo nombres de variables
next.config.ts                   # HSTS, nosniff y Referrer-Policy; distDir por entorno (R14)
```

**Structure Decision**: un único proyecto Next.js en la raíz del repo, con `src/`. La lógica de
permisos vive en `supabase/migrations` (la base de datos decide) y `src/lib` solo orquesta. La
instancia de uso reutiliza las mismas migraciones mediante un enlace simbólico, para que ambos
entornos tengan siempre el mismo esquema.

## Complexity Tracking

No hay violaciones de la constitución que justificar. Se registran las piezas propias que añaden
complejidad frente a "usar solo Supabase":

| Pieza propia | Requisito | Alternativa más simple rechazada porque |
|--------------|-----------|------------------------------------------|
| Enlace de activación con la tabla `invitations` | FR-010, FR-036 | Pedir la contraseña en la terminal duplicaría la validación y la dejaría en el historial (R4) |
| `recovery_codes` | FR-003/003a | Los códigos nativos de Supabase son experimentales (B-002) |
| Tabla `auth_attempts` (correo + IP) | FR-005 | Los hooks nativos de verificación de Supabase son de pago en la nube |
| `app_sessions` + hook | FR-007 (30 min) | El inactivity timeout de Supabase mide refrescos de token, no actividad del usuario |
| Segunda instancia de Supabase local | FR-034 | Una sola instancia permitiría que una limpieza de pruebas borrara la cuenta del Dueño (R13) |
