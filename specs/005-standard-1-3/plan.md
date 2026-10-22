# Implementation Plan: Soporte del Estándar de Proyecto Nexoru 1.3

**Branch**: `005-standard-1-3` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

## Summary

El motor de conformidad ya es uno solo con reglas por versión (`src/lib/standard/rules.ts`). La 1.3 se
agrega como `RULES["1.3"] = { ...RULES["1.2"], version: "1.3", plannedIncrements: true }`, y la
verificación 1.8 gana una comprobación opcional de `## Incrementos planeados` que solo se activa con
`plannedIncrements`. El roadmap ya solo se lee de la tabla de `## Roadmap`, así que las filas de
incrementos planeados no cuentan como fases: se fija con pruebas. El aviso de versión más nueva pasa
a describir el salto según la versión del proyecto.

## Technical Context

- **Stack**: el de las fases anteriores (TypeScript, Next.js 16, Vitest, Playwright, pgTAP). Sin
  dependencias nuevas, sin migraciones, sin cambios en el cliente de GitHub.
- **Archivos**:
  - `src/lib/standard/versions.ts`: `SUPPORTED_STANDARD_VERSIONS` con `"1.3"`; `newerStandardNotice`
    con el texto por salto.
  - `src/lib/standard/rules.ts`: `version` admite `"1.3"`; campo `plannedIncrements`.
  - `src/lib/standard/v1_0/level1.ts`: `plannedIncrementsIssues(body)` dentro de 1.8 cuando
    `ctx.rules.plannedIncrements`.
  - Pruebas: `tests/unit/standard/rules-1-3.test.ts` (nueva) y ajustes de textos en
    `newer-version.test.ts`, `versions.test.ts`, `read-portfolio.test.ts` y las E2E que listan las
    versiones soportadas o el aviso.
  - Documentación: `PROJECT.md`, `docs/mapa-funcional.md` y `CLAUDE.md` de `nexoru-op`.

## Constitution Check

- **V (spec primero)**: spec, plan y tareas antes del código; tareas aprobadas por el Dueño.
- **VI (pruebas obligatorias)**: las pruebas de la 1.3 se escriben primero y deben fallar.
- **XIV (estándar desde `nexoru-governance`)**: la 1.3 se soporta con sus reglas; los proyectos se
  siguen evaluando con la versión que declaran.
- **XII y XIII**: sin cambios (solo lectura, lector seguro).

Sin violaciones.

## Fecha objetivo

2026-10-29 (Dueño). El cambio es acotado (unas 8 tareas, 1 día de trabajo más la verificación).
