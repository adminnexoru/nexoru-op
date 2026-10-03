# Implementation Plan: Datos de GitHub en solo lectura

**Branch**: `004-github-readonly` | **Date**: 2026-10-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-github-readonly/spec.md`

## Summary

La Fase 4 añade al dashboard los datos de GitHub de cada repo del portafolio, en solo lectura:

- **CI de la rama principal**, que activa la verificación 3.2 (US1);
- **visibilidad**, con su resultado según el estándar 1.2.0 (US2);
- **PRs abiertos** con su CI (US3);
- **número de alertas de secretos abiertas** (US4).

Se añade también el soporte del **estándar 1.2**.

**Enfoque técnico**:

- **Cliente**: un único cliente `server-only` (`src/lib/github/client.ts`) que solo hace `GET` a
  `https://api.github.com`, con un catálogo cerrado de 6 rutas (research R3, R6). El token es
  opcional, vive en `.env.op.local` y viaja solo en la cabecera `Authorization`.
- **Cuándo se consulta**: solo con el botón Actualizar, dentro de un **plazo global de 8 s**, en
  oleadas por prioridad (US1 y US2 primero, US4 al final), con concurrencia 3, ETag y respeto del
  límite de consultas (R4, R5). Lo que no llega a tiempo usa el dato guardado (menos de 7 días) o
  queda "no disponible" con motivo.
- **Índice**: los datos de GitHub y los ETag se guardan en el índice regenerable (formato 3, sin
  migración). La relectura automática a los 10 minutos no consulta GitHub (R10).
- **Motor**: `evaluateProject` recibe los datos de GitHub ya resumidos y sigue siendo puro.
  - La regla de 3.2 y la de visibilidad dependen de la versión del estándar (R8, R9, R14).
  - La base de Conformidad es 29 cuando 3.2 se evalúa y 28 cuando no; el porcentaje dice el estado
    de 3.2 en el mismo lugar y una leyenda fija explica el cambio de 28 a 29.
- **Pruebas**: con un GitHub simulado (inyectado en Vitest y un servidor en `127.0.0.1` en E2E),
  con salvaguardas que hacen fallar cualquier intento de llegar a `api.github.com` (R7).
  - La CI no necesita token.
- **Tablero**: sigue con 13 columnas.
  - Entran **CI** y **PRs**; Tipo y Cliente se fusionan; Roadmap pasa al detalle.
  - La visibilidad va bajo el nombre.
  - En el detalle hay una tarjeta GitHub (R11).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js 24

**Primary Dependencies**: Next.js 16.3.6 (App Router, Server Actions), React 19, zod 4, `yaml` 2.x,
Tailwind 4 y shadcn/ui. **Sin dependencias nuevas**: el cliente usa `fetch` nativo de Node y
`AbortSignal`, y el GitHub simulado de E2E usa `node:http`.

**Storage**: Supabase local (Postgres). Solo el índice regenerable `portfolio_snapshots.payload`
(jsonb), `FORMAT_VERSION` 2 → 3. Sin tablas ni migraciones nuevas.

**Testing**: Vitest (unitarias, GitHub simulado por inyección), pgTAP (sin cambios esperados),
Playwright (E2E con GitHub simulado en `127.0.0.1`).

**Target Platform**: máquina local del Dueño (Linux), app en `127.0.0.1`.

**Project Type**: aplicación web (Next.js, un solo proyecto).

**Performance Goals**:

- Actualizar termina en 10 s o menos (SC-005): lectura local de menos de 1 s, más un máximo de 8 s
  de GitHub.
- Con 6 repos se estiman unas 25 consultas y unos 2 s.

**Constraints**:

- Solo `GET` a `api.github.com`; el token nunca sale del servidor.
- La CSP no cambia; sin estilos en línea; sin JavaScript nuevo en el navegador.
- Sin reintentos, para respetar los límites.

**Scale/Scope**:

- Portafolio actual de 6 repos, con diseño para 50: las oleadas de menor prioridad pueden quedar
  con su dato guardado.
- Límite: 60 consultas por hora sin token y 5.000 con token.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitución **v2.0.1**. La enmienda PATCH del 2026-10-03 solo aclara dónde vive el token; el
Dueño citó la v2.0.0 y el contenido es el mismo.

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Seguridad primero | El token solo en el servidor; el acceso por "solo los repos seleccionados" (R1); 2FA y RLS sin cambios; la app sigue en `127.0.0.1` | ✅ |
| II. Cero secretos | Token opcional, de solo lectura, en `.env.op.local` (v2.0.1). Nunca en código, índice, logs ni pantalla, con pruebas (R6). En pruebas solo `test-…`. Las alertas se piden con `hide_secret=true` y solo se guarda el número | ✅ |
| III. Local y costo cero | La API de GitHub es gratis; sin servicios nuevos | ✅ |
| IV. Stack homologado | GitHub está en el stack; sin dependencias nuevas | ✅ |
| V. Spec primero | Spec, clarify y plan antes de tareas; la spec se concilió con el estándar 1.2.0 | ✅ |
| VI. Pruebas obligatorias | Cada regla con su prueba que falla primero; salvaguarda contra el GitHub real | ✅ |
| VII. Simplicidad | `fetch` nativo y un servidor simulado de pocas líneas, en vez de `octokit`, `nock` o `msw` | ✅ |
| VIII. Crecimiento modular | Módulo nuevo `src/lib/github/`, separado del lector y del motor | ✅ |
| IX. Contexto autosuficiente | `CLAUDE.md` se actualiza con las reglas del cliente y del token | ✅ |
| X. Idioma | Código en inglés; textos y documentación en español | ✅ |
| XI. Archivos como fuente de verdad | GitHub en solo lectura, como permite el principio; los datos viven solo en el índice regenerable; un dato que falta se muestra con motivo | ✅ |
| XII. Solo lectura | Solo `GET`, rechazado en código para cualquier otro método y con prueba; sin webhooks, issues, notificaciones ni reejecuciones. Es exactamente el permiso "la API de GitHub (con o sin token)" del principio | ✅ |
| XIII. Lector seguro | El lector del disco no cambia; el cliente de GitHub no lee archivos | ✅ |
| XIV. Estándar de `nexoru-governance` | Se soportan 1.0, 1.1 y 1.2 con reglas por versión; aviso informativo de versión más nueva | ✅ |

**CSP**: sin cambios. Todas las consultas las hace el servidor; el navegador no carga nada de
GitHub (sin avatares ni scripts). Las E2E siguen fallando ante cualquier violación (SC-004).

**Resultado**: sin violaciones. No hace falta *Complexity Tracking*.

*Re-check tras el diseño (Fase 1)*: los contratos y el modelo de datos no añaden tablas, orígenes en
la CSP, métodos HTTP ni dependencias. ✅

## Project Structure

### Documentation (this feature)

```text
specs/004-github-readonly/
├── plan.md
├── research.md           # R1–R14
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── github-client.md
│   └── github-ui.md
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
src/lib/github/
├── client.ts             # único GET a GitHub: catálogo de rutas, token, ETag, límite, plazo
├── fetch-portfolio.ts    # oleadas por prioridad y fusión con los datos guardados
├── summarize.ts          # resume repo, ejecuciones, PRs y alertas (puro)
└── types.ts              # GithubData, GithubStatus, GithubCache (zod)
src/lib/standard/
├── rules.ts              # + "1.2": ciRule, visibilityField
├── versions.ts           # SUPPORTED_STANDARD_VERSIONS = 1.0, 1.1, 1.2
├── indicators.ts         # base 28/29 y estado de 3.2 (check32)
└── v1_0/
    ├── level3.ts         # 3.2 con datos de GitHub
    ├── findings.ts       # visibilidad y alertas de secretos
    └── manifest.ts       # campo opcional visibilidad
src/lib/portfolio/
├── read-portfolio.ts     # local → GitHub → evaluación
├── snapshot.ts           # modos withGitHub y localOnly
└── types.ts              # FORMAT_VERSION 3
src/lib/env.server.ts     # GITHUB_TOKEN y GITHUB_API_ORIGIN opcionales, con salvaguardas
src/components/github/    # tarjeta GitHub, semáforo de CI, estado del token y del límite
src/components/portfolio/portfolio-table.tsx
scripts/env-guard.ts      # sin token real en pruebas; sin override de origen en uso
tests/unit/github/        # cliente, oleadas, resúmenes, salvaguarda
tests/unit/standard/      # 3.2 por versión, visibilidad 1.2, base 29
tests/unit/setup/block-github.ts   # setupFiles: falla ante api.github.com
tests/e2e/fake-github.ts  # servidor simulado (node:http, 127.0.0.1)
tests/e2e/us*-github-*.spec.ts
tests/fixtures/github/    # respuestas ficticias (example-org/*)
```

**Structure Decision**: un solo proyecto Next.js, como en las Fases 2 y 3. GitHub queda en su
propio módulo para que ningún otro archivo haga peticiones de red a GitHub.

## Orden de construcción (para /speckit-tasks)

1. **Fundamentos**:
   - cliente `GET` con su catálogo y sus pruebas que fallan primero;
   - salvaguardas de pruebas;
   - variables de entorno;
   - GitHub simulado;
   - índice con formato 3 y modos de actualización.
2. **US1 (MVP)**: CI de la rama principal, 3.2 por versión, base 28/29 con el estado de 3.2 en la
   celda y la leyenda fija, columna CI,
   tarjeta GitHub (CI), estado del límite y del token.
3. **Estándar 1.2** (antes de US2): versiones soportadas, reglas, campo `visibilidad` y aviso de
   versión más nueva.
4. **US2**: visibilidad y su resultado, y visibilidad bajo el nombre del proyecto.
5. **US3**: PRs y su CI, y columna PRs.
6. **US4**: alertas de secretos y aviso del portafolio.
7. **Cierre**:
   - documentación (`CLAUDE.md`, `.env.example`, mapa funcional, `PROJECT.md`);
   - revisión de seguridad;
   - **[MANUAL]** crear el token;
   - validación con el portafolio real;
   - **[MANUAL]** `visibilidad` y 1.2 en ABE y `nexoru-op`;
   - PR y merge.

Paradas como en la Fase 3: pruebas en verde, commit y push de la rama al terminar cada historia.

## Fecha objetivo (2026-11-08)

Se cumple con margen sin sacrificar historias (research R13).

| Punto de control | Si no se cumple |
|---|---|
| 2026-10-24: US1, estándar 1.2 y US2 terminadas | Se sacrifica US4 (sin el permiso *Secret scanning alerts*) |
| 2026-10-31: US3 terminada | Se sacrifica US3 (sin el permiso *Pull requests*) |

Lo sacrificado vuelve a `specs/backlog.md`.

## Complexity Tracking

No aplica: el Constitution Check no tiene violaciones.
