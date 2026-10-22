---
description: "Lista de tareas de la feature 005-standard-1-3"
---

# Tasks: Soporte del Estándar de Proyecto Nexoru 1.3

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: obligatorios (principio VI). Las pruebas se escriben primero y deben fallar.

## Formato: `[ID] [P?] [Story?] [MANUAL?] Descripción`

- **Commit**: solo con la verificación completa encadenada con `&&` (regla de `CLAUDE.md`). El
  Dueño revisa el diff antes del commit.

---

## Phase 1: Pruebas primero (deben fallar)

- [X] T001 [P] [US1] `tests/unit/standard/rules-1-3.test.ts`, versiones y reglas:
  - `SUPPORTED_STANDARD_VERSIONS` es `["1.0", "1.1", "1.2", "1.3"]`; `isNewerThanSupported("1.3")` es
    `false`;
  - `RULES["1.3"]` es `{ ...RULES["1.2"], version: "1.3", plannedIncrements: true }` y las versiones
    anteriores tienen `plannedIncrements: false`;
  - un `PROJECT.md` 1.3 sin la sección se evalúa con 1.3, con el mismo nivel y las mismas
    verificaciones que como 1.2.
- [X] T002 [P] [US2] En el mismo archivo, la verificación 1.8 en 1.3:
  - con la sección bien ubicada y bien formada: pasa;
  - sin la sección: pasa;
  - después de `## Decisiones clave`: falla con "`## Incrementos planeados` debe ir entre
    `## Roadmap` y `## Decisiones clave`";
  - sin la tabla con el encabezado exacto: falla; con una prioridad fuera de `alta`, `media` y `baja`:
    falla nombrando la prioridad;
  - la misma sección mal ubicada en un proyecto 1.2: 1.8 pasa (sin cambio de comportamiento);
  - con el roadmap concluido y filas planeadas: roadmap `concluido`, Avance igual que sin la
    sección, y sin hallazgo `operacion_pending_phases` en `fase: operacion`.
- [X] T003 [P] [US1] `tests/unit/standard/newer-version.test.ts`: aviso por salto (1.0 y 1.1: "hay una
  versión más nueva del estándar (1.3) con reglas más estrictas de CI y visibilidad, y la sección opcional ## Incrementos planeados"; 1.2: "hay una versión más nueva del estándar (1.3): agrega la sección opcional ## Incrementos planeados"; 1.3:
  sin aviso).

## Phase 2: Implementación

- [X] T004 [US1] `src/lib/standard/versions.ts` y `src/lib/standard/rules.ts`: versión 1.3,
  `plannedIncrements` y aviso por salto (T001, T003).
- [X] T005 [US2] `src/lib/standard/v1_0/level1.ts`: comprobación de `## Incrementos planeados` dentro
  de 1.8 con `plannedIncrements` (T002).
- [X] T006 Ajustar las pruebas existentes que listan las versiones soportadas o el texto del aviso
  (`versions.test.ts`, `read-portfolio.test.ts`, `us5-standard-1-1.spec.ts`,
  `us4-standard-version.spec.ts`, `us2-standard-1-2.spec.ts`), sin cambiar ningún otro resultado.

## Phase 3: Registro del incremento y cierre

- [ ] T007 Registrar el incremento en `nexoru-op` con la mecánica de apertura (FR-006):
  - `PROJECT.md`: la fila sale de `## Incrementos planeados` (queda "Historial de ciclos de vida",
    prioridad media) y entra al roadmap como Fase 5 (`005-standard-1-3`, fecha objetivo 2026-10-29);
    `fase: construccion` con `fase_desde` de hoy y `fecha_objetivo` igual a la de la Fase 5;
    `version_estandar: "1.3"`; decisiones (la de mantener 1.2 se reemplaza); siguiente hito;
  - `docs/mapa-funcional.md`: `version_estandar: "1.3"` y el evaluador con 1.3;
  - `CLAUDE.md`: versiones soportadas.
- [ ] T008 Verificación encadenada completa, diff al Dueño, commit, push y PR (con su autorización).
- [ ] T009 [MANUAL] Tras el merge, con la pila de uso arriba: el Dueño pulsa Actualizar y confirma
  que `nexoru-onboarding` muestra Conformidad y Avance, no "versión no soportada" (FR-007). Al
  concluir la Fase 5, `nexoru-op` vuelve a `operacion` con `fase_desde` nuevo.
