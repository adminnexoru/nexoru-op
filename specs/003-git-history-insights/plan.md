# Implementation Plan: Historial de git, indicadores, identidad visual y gráficos

**Branch**: `003-git-history-insights` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-git-history-insights/spec.md`

## Summary

La Fase 3 añade al dashboard:

- el **historial de git** de cada proyecto (US1);
- el soporte del **estándar 1.1** (US5);
- dos porcentajes, **Conformidad** y **Avance** (US2);
- la **identidad visual** de `nexoru-onboarding`, con semáforos accesibles (US3);
- cinco **gráficos** del portafolio (US4).

Todo se calcula en cada lectura del portafolio y se guarda en el índice regenerable de la Fase 2.

**Enfoque técnico**:

- **Git**: 7 comandos nuevos de solo lectura con **argumentos fijos** (research R1).
  - La ventana de actividad es la expresión fija `13.weeks.ago`.
  - El adelanto/atraso se calcula contra `refs/remotes/origin/HEAD`, o `refs/heads/main` si esa no
    existe.
  - `log -p` lleva `--no-ext-diff --no-textconv`, para no ejecutar programas del repositorio.
- **Antigüedad de las referencias remotas**: fecha de modificación de `FETCH_HEAD`, solo con
  `lstat` (research R2), con límites documentados.
- **Rendimiento**: unos 100 ms por proyecto, medido en el portafolio real.
  - La actividad se acota a 13 semanas y el historial de `PROJECT.md` a 500 commits.
  - El resultado se guarda una vez por lectura en el índice (research R4).
- **Estándar 1.1**: el motor `v1_0` se generaliza con reglas por versión; `.nexoruignore` se lee
  en la raíz (research R7).
- **Gráficos**: **SVG propio generado en el servidor**, sin dependencias ni JavaScript, compatible
  con la CSP estricta sin relajarla (research R5).
- **Identidad visual**: tokens propios en `src/app/tokens.css`, con valores tomados de
  `nexoru-onboarding` en solo lectura, sin importar código; decisiones en
  `docs/identidad-visual.md` (research R6).
  - Tema **oscuro**, como la app de onboarding (confirmado por el Dueño). Los semáforos usan tonos
    propios con contraste AA o mejor sobre ese fondo.
- **Git endurecido (research R11)**: se probó que el `git status` de la Fase 2 ejecuta los filtros
  `clean` de un repositorio. Se adopta un **prefijo endurecido v2** para todos los comandos:
  `--attr-source` al árbol vacío, `core.attributesFile=/dev/null`, `log.showSignature=false`,
  `--ignore-submodules=all`, `gc.auto=0` y `maintenance.auto=false`, sumados a `core.fsmonitor=false`,
  `--no-optional-locks` y `GIT_OPTIONAL_LOCKS=0`. Si existe `.git/info/attributes`, no se ejecuta
  `status`. La corrección de la Fase 2 es la **primera tarea** de esta fase, con una prueba de repo
  hostil.
- **Fecha**: unas 7,75 jornadas frente a 16 días hábiles hasta el 2026-10-25. **Alcanzable sin
  mover historias** (research R9).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 24 LTS, SQL (sin cambios de esquema)

**Primary Dependencies**:

- Las de la Fase 2: Next.js 16.3, React 19, Tailwind 4, shadcn/ui, Supabase, `zod` y `yaml`.
- Los íconos de `lucide-react`, que ya está instalado.
- **Ninguna dependencia nueva.**

**Storage**:

- Sin tablas ni migraciones nuevas.
- El `payload` del índice cambia de formato (`FORMAT_VERSION` 1 → 2) y se regenera solo.

**Testing**:

- **Vitest**:
  - repo hostil (`core.fsmonitor`, filtro `clean`, `textconv`, `log.showSignature`): tras una lectura
    completa no hay marcas y ningún archivo de `.git` cambia;
  - historial con repos ficticios de fechas fijas y fecha de lectura fija;
  - indicadores;
  - reglas 1.1;
  - `.nexoruignore`;
  - `diff.external` y `textconv` maliciosos que no deben ejecutarse.
- **pgTAP**: sin cambios (88).
- **Playwright**: tablero, detalle, semáforos y gráficos. Fallan ante cualquier violación de CSP.

**Target Platform**: máquina local del Dueño (Linux), navegador de escritorio actual.

**Project Type**: la misma aplicación web local de las fases 1 y 2.

**Performance Goals**:

- Actualizar en menos de 10 s para 50 proyectos y menos de 2 s con el portafolio real.
- Tablero en menos de 2 s desde el índice (SC-005).

**Constraints**:

- Solo lectura absoluta, sin red (ningún `fetch`).
- Argumentos fijos en git.
- CSP intacta.
- Ningún atributo `style` en el HTML.
- Nada de código de `nexoru-onboarding` dentro de `nexoru-op`.

**Scale/Scope**:

- 6 proyectos reales; diseño para 50.
- 1 pantalla ampliada, 1 pantalla de detalle ampliada y 5 gráficos.
- Dos hallazgos nuevos y reglas 1.1; ninguna verificación nueva.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constitución **v2.0.0**.

| # | Principio | Cumple | Evidencia |
|---|-----------|--------|-----------|
| I | Seguridad primero | ✅ | Sin pantallas ni datos fuera del acceso AAL2; sin tablas nuevas |
| II | Cero secretos | ✅ | No se lee el contenido de `FETCH_HEAD` ni de ningún archivo de `.git`; solo su fecha |
| III | Local y costo cero | ✅ | Sin dependencias, servicios ni red; 0 USD/mes (R10) |
| IV | Stack homologado | ✅ | Sin tecnologías nuevas: SVG propio en lugar de una librería de gráficos |
| V | Spec-driven | ✅ | Spec aclarada (4 respuestas y 3 ajustes del Dueño); este plan; `tasks.md` pendiente de aprobación |
| VI | Pruebas | ✅ | Historial con fechas conocidas, indicadores, 1.1 y `.nexoruignore` en Vitest; E2E de tablero, detalle y gráficos que fallan ante violaciones de CSP; solo el portafolio ficticio |
| VII | Simplicidad | ✅ | SVG propio (unas 150 líneas) en lugar de una librería; reglas por versión en lugar de duplicar el motor; sin caché aparte del índice |
| VIII | Modular | ✅ | Feature propia; GitHub sigue en la Fase 4 y las alertas de discrepancia en B-012 |
| IX | Contexto autosuficiente | ✅ | Research, data-model, 2 contratos, quickstart y `docs/identidad-visual.md` |
| X | Idioma | ✅ | Interfaz y documentación en español; código en inglés |
| XI | Archivos como fuente de verdad | ✅ | Historial e indicadores se derivan en cada lectura y viven solo en el índice regenerable; sin históricos en la base (FR-026) |
| XII | Solo lectura y sin red | ✅ | Prohibidos `fetch`, `pull` y cualquier escritura; la antigüedad del remoto sale de `lstat` de `FETCH_HEAD`; sin red nueva (solo GitHub en la Fase 4 y HIBP, como hasta ahora) |
| XIII | Lector seguro | ✅ | 7 comandos con **argumentos fijos** y sin shell; prefijo endurecido v2 en **todos** los comandos (fases 2 y 3) para que ninguna configuración del repo ejecute programas: `core.fsmonitor`, filtros `clean`, `textconv`, `diff.external`, firmas, ganchos, submódulos y mantenimiento (research R11); `GIT_OPTIONAL_LOCKS=0` y `--no-optional-locks`; `.nexoruignore`, `FETCH_HEAD` e `info/attributes` por el lector seguro, solo `lstat` en los dos últimos. Se corrige el hueco encontrado en la Fase 2 (primera tarea) |
| XIV | Estándar desde nexoru-governance | ✅ | Versiones soportadas 1.0 y 1.1; cada proyecto se evalúa con la suya; los hallazgos 1.1 solo a quien declara 1.1 |
| Gob. | `main` protegida | ✅ | PR con CI obligatoria |

**CSP**: no se relaja. Los gráficos no usan atributos `style` ni JavaScript, y las E2E existentes
fallan ante cualquier violación (FR-025, SC-004).

**Resultado del gate**: PASA, antes y después del diseño.

## Project Structure

### Documentation (this feature)

```text
specs/003-git-history-insights/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── git-history.md
│   └── indicators-ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
docs/identidad-visual.md # decisiones de diseño (US3)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── tokens.css                         # tokens de diseño (colores, tipografía, espaciado, semáforos)
│   ├── globals.css                        # importa tokens.css; tema
│   └── (app)/page.tsx, projects/[folder]/page.tsx
├── components/
│   ├── portfolio/                         # columnas nuevas, historial e indicadores del detalle
│   ├── status/                            # semáforos: estado declarado y actividad
│   └── charts/                            # bar-chart.tsx, weekly-chart.tsx (SVG en el servidor) y tabla de datos
└── lib/
    ├── portfolio/
    │   ├── git.ts                         # + 7 comandos de historial
    │   ├── history.ts                     # semanas, días, fase desde el diff, semáforo de actividad (puro)
    │   ├── safe-fs.ts                     # + .nexoruignore y lstat de FETCH_HEAD
    │   ├── ignore.ts                      # interpretación de .nexoruignore (pura)
    │   └── read-portfolio.ts              # omite carpetas ignoradas; suma de actividad
    └── standard/
        ├── rules.ts                       # reglas por versión (1.0 y 1.1)
        ├── indicators.ts                  # Conformidad y Avance (puro)
        └── v1_0/                          # motor generalizado con las reglas; hallazgos 1.1
tests/
├── fixtures/portfolio/                    # + history-demo, standard-1-1, closure cases, .nexoruignore
├── unit/portfolio/history.test.ts, ignore.test.ts, git-history.test.ts
├── unit/standard/indicators.test.ts, rules-1-1.test.ts
└── e2e/us1-history.spec.ts, us2-indicators.spec.ts, us3-visual.spec.ts, us4-charts.spec.ts, us5-standard-1-1.spec.ts
```

**Structure Decision**: se mantiene el monolito.
- Todo lo calculado es **puro** (`history.ts`, `ignore.ts`, `indicators.ts`, `rules.ts`) y se prueba
  sin disco.
- Los efectos siguen solo en `safe-fs.ts` y `git.ts`.
- Los gráficos y semáforos son componentes de servidor sin estado.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
