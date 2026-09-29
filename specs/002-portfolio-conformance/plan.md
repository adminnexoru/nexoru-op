# Implementation Plan: Lector seguro del portafolio y conformidad con el estándar

**Branch**: `002-portfolio-conformance` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-portfolio-conformance/spec.md`

## Summary

Esta feature convierte Nexoru Op en lo que dice su constitución: el dashboard del portafolio.

- **Lectura**: lee de forma segura las carpetas de `PROJECTS_ROOT` y extrae el manifiesto de
  `PROJECT.md` y el roadmap, con el estado de cada fase derivado de los `tasks.md`.
- **Conformidad**: evalúa cada proyecto con las verificaciones del Estándar de Proyecto Nexoru
  v1.0 (niveles 0 a 3, fallas, advertencias y hallazgos). Las verificaciones que dependen de GitHub
  quedan "no evaluadas" y el nivel 3 sale como provisional.
- **Interfaz**: muestra el resultado en `/` (portafolio) y `/projects/[folder]` (detalle) a
  partir de un índice regenerable.

**Enfoque técnico**:

- **Lectura y evaluación separadas**:
  - un lector con efectos (`src/lib/portfolio/`), que es la única puerta al disco y a git;
  - un evaluador puro (`src/lib/standard/v1_0/`), probado con entradas en memoria.
- **Lector seguro**: catálogo cerrado de rutas del estándar; `realpath` dentro de la raíz; lista
  de nombres de secretos; `fstat` sobre el descriptor (archivo regular, 1 MB como máximo); UTF-8
  estricto (research R3).
- **Git**: 6 comandos fijos sin shell, con `core.fsmonitor` desactivado y `--no-optional-locks`
  para no ejecutar nada del repo ni reescribir su índice (research R4).
- **Índice**: una fila `jsonb` en `portfolio_snapshots` con RLS, escrita solo por una función
  `security definer`. Se relee al abrir si tiene más de 10 minutos o con el botón Actualizar
  (research R8 y R9).
- **Dependencia nueva**: `yaml` (YAML 1.2, sin dependencias), para el frontmatter y los flujos
  de CI (research R1).
- **Costo**: 0 USD/mes (research R13).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 24 LTS, SQL (PostgreSQL 17 de Supabase)

**Primary Dependencies**:

- Las de la Fase 1: Next.js 16.3 (App Router), React 19, Tailwind 4, shadcn/ui, `@supabase/ssr`,
  `@supabase/supabase-js`, `zod`.
- Nueva: `yaml` 2.x (research R1).
- Git del sistema (ya requerido para desarrollar; solo se invoca en solo lectura).

**Storage**:

- Supabase Postgres local: la tabla nueva `portfolio_snapshots` (índice regenerable, data-model §1),
  migración compartida por los dos entornos.
- Los archivos de `PROJECTS_ROOT` son la fuente de verdad y no se escriben nunca.

**Testing**:

- Vitest (unitarias) para:
  - el lector seguro, contra un portafolio ficticio real en una carpeta temporal, con enlaces,
    FIFO y archivos grandes;
  - git, contra repos temporales;
  - cada verificación de conformidad (un caso que pasa y uno que falla por verificación, SC-003);
  - el roadmap;
  - la lectura completa, incluidas la solo lectura (SC-007) y la regeneración (SC-008).
- pgTAP: RLS y la función del índice.
- Playwright: portafolio, detalle, Actualizar, lectura por vencimiento y acceso sin sesión.

**Target Platform**: máquina local del Dueño (Linux), navegador de escritorio actual.

**Project Type**: aplicación web full-stack local (Next.js monolítico), la misma de la Fase 1.

**Performance Goals**:

- Lectura completa de 50 proyectos en menos de 10 s.
- Vista desde el índice en menos de 2 s (SC-006).

**Constraints**:

- Solo lectura absoluta sobre `PROJECTS_ROOT` y sus repos, sin red (principios XII y XIII).
- Nunca abrir `.env*` ni llaves.
- Nunca mostrar contenido de archivos fuera de lo necesario (FR-019, FR-029).
- Todo sigue escuchando solo en `127.0.0.1`.

**Scale/Scope**:

- Hoy son 6 proyectos más el estándar; el diseño cubre hasta 50.
- 2 pantallas, 1 tabla, 1 función SQL y unas 30 verificaciones.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principio | Cumple | Evidencia |
|---|-----------|--------|-----------|
| I | Seguridad primero | ✅ | Pantallas y action detrás de AAL2 (`proxy.ts` y layout). La tabla nueva tiene RLS restrictiva AAL2 + cuenta activa, `select` solo del Dueño y escritura solo por una función `security definer`. Sin puertos nuevos |
| II | Cero secretos | ✅ | El lector nunca abre `.env*` ni llaves (contracts/reader.md). `PROJECTS_ROOT` no es secreto. Los fixtures usan `env.fixture` (contenido ficticio), que se renombra solo en la copia temporal |
| III | Local y costo cero | ✅ | Todo local; `yaml` es gratuito; 0 USD/mes (research R13) |
| IV | Stack homologado | ✅ | TypeScript, Next.js y Supabase local. `yaml` justificado abajo |
| V | Spec-driven | ✅ | Spec aclarada (5 respuestas del Dueño); este plan; `tasks.md` pendiente de aprobación antes de programar |
| VI | Pruebas | ✅ | Unitarias por verificación, lector y git; pgTAP del índice; E2E del flujo. Las pruebas usan solo el portafolio ficticio temporal (`assertTestProjectsRoot`) y la instancia de pruebas |
| VII | Simplicidad | ✅ | Intérprete de Markdown propio por líneas en lugar de remark; índice como una fila `jsonb` en lugar de tablas normalizadas; sin tareas en segundo plano; orden fijo por carpeta y sin filtros |
| VIII | Crecimiento modular | ✅ | Feature propia. Git queda limitado a lo que exige la conformidad; el historial es de la Fase 3 y GitHub de la Fase 4 |
| IX | Contexto autosuficiente | ✅ | Research, data-model, 3 contratos y quickstart. Al cerrar la fase se actualizan `PROJECT.md`, el mapa funcional y `CLAUDE.md` |
| X | Idioma | ✅ | UI y documentación en español; código, tipos y esquema en inglés |
| XI | Archivos como fuente de verdad | ✅ | El índice solo guarda el resultado de leer y se regenera (SC-008). Los datos ausentes quedan `null` y se muestran como ausentes (FR-009) |
| XII | Solo lectura | ✅ | Sin red, sin escrituras en `PROJECTS_ROOT` (SC-007 probado) y sin notificaciones |
| XIII | Lector seguro | ✅ | Catálogo cerrado de rutas, `realpath` dentro de la raíz, lista de secretos y `fstat` (research R3). Git con argumentos fijos, sin shell, con `core.fsmonitor=false` y `--no-optional-locks` (research R4). El parámetro `[folder]` nunca se usa como ruta |
| XIV | Estándar desde nexoru-governance | ✅ | Versiones soportadas `["1.0"]`; aviso si el `CHANGELOG.md` del estándar es más nuevo o no existe; no se evalúan versiones no soportadas (FR-026, FR-027) |
| Gob. | `main` protegida | ✅ | Ruleset con PR y el check de CI obligatorio (verificado en la Fase 1) |

**Tecnologías fuera del stack base (principio IV)**:

| Tecnología | Por qué | Costo |
|------------|---------|-------|
| `yaml` (npm) | YAML 1.2 con acceso a nodos y comentarios, necesario para 1.2, 1.5, 1.6, 3.1 y el hallazgo de comentarios (research R1) | 0 |
| Git del sistema | Único medio permitido por el principio XIII para el remoto, las ramas, los cambios y los archivos versionados | 0 |

**Excepción documentada**: `save_portfolio_snapshot` es una mutación sin evento de bitácora,
porque guardar el índice no es una acción sensible sobre la cuenta (research R8, supuesto de la
spec). `CLAUDE.md` exige bitácora solo para las mutaciones sensibles.

**Resultado del gate**: PASA, antes y después del diseño.

## Project Structure

### Documentation (this feature)

```text
specs/002-portfolio-conformance/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── reader.md
│   ├── conformance.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/(app)/
│   ├── page.tsx                         # portafolio (reemplaza la bienvenida)
│   ├── layout.tsx                       # navegación: "Portafolio"
│   └── projects/[folder]/page.tsx       # detalle
├── components/portfolio/                # tabla, distintivos de nivel/estado/rama, secciones del detalle, botón Actualizar
├── lib/
│   ├── env.server.ts                    # + PROJECTS_ROOT (opcional)
│   ├── portfolio/
│   │   ├── safe-fs.ts                   # única puerta al disco (contracts/reader.md)
│   │   ├── git.ts                       # 6 comandos fijos
│   │   ├── read-project.ts              # ProjectFiles de una carpeta
│   │   ├── read-portfolio.ts            # recorre la raíz, concurrencia 8, estándar aparte
│   │   ├── snapshot.ts                  # esquema zod, cargar/guardar índice, vencimiento
│   │   └── actions.ts                   # refreshPortfolio()
│   └── standard/
│       ├── versions.ts                  # SUPPORTED_STANDARD_VERSIONS
│       ├── markdown.ts                  # H2, tablas, bloques, casillas
│       ├── frontmatter.ts               # YAML 1.2, detección de 1.5 y comentarios
│       └── v1_0/
│           ├── manifest.ts              # campos, tipos y enumerados
│           ├── level1.ts  level2.ts  level3.ts
│           ├── roadmap.ts               # tabla y estado derivado
│           ├── findings.ts
│           └── evaluate.ts              # nivel acumulativo y provisional
supabase/
├── migrations/<ts>_portfolio_snapshots.sql
└── tests/20_portfolio_snapshots.sql      # pgTAP
scripts/env-guard.ts                      # + assertTestProjectsRoot
tests/
├── fixtures/
│   ├── portfolio/                        # proyectos ficticios (example-org)
│   └── build-portfolio.ts                # copia temporal + git init + enlaces/FIFO
├── unit/
│   ├── portfolio/                        # safe-fs, git, read-portfolio (SC-005, SC-007, SC-008)
│   └── standard/                         # una prueba por verificación, roadmap y nivel
└── e2e/portfolio.spec.ts
```

**Structure Decision**: se mantiene el monolito Next.js de la Fase 1. El dominio nuevo queda en
dos módulos:

- `src/lib/portfolio`: efectos, acceso a disco y a git.
- `src/lib/standard`: reglas puras, versionadas por carpeta (`v1_0`), para que una versión nueva
  del estándar sea una carpeta nueva y no una condición repartida por el código.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
