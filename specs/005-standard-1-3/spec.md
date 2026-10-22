# Feature Specification: Soporte del Estándar de Proyecto Nexoru 1.3

**Feature Branch**: `005-standard-1-3`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Abre un incremento para soportar el Estándar de Proyecto Nexoru 1.3,
siguiendo la mecánica de apertura de incremento de nexoru-governance (roadmap.md y lifecycle.md). Es
un cambio acotado: 1. Agregar '1.3' a SUPPORTED_STANDARD_VERSIONS y al tipo/mapa RULES, con las mismas
reglas de 1.2 (el CHANGELOG confirma que no cambiaron). 2. Implementar la verificación 1.8 para
'## Incrementos planeados' cuando exista: ubicación entre '## Roadmap' y '## Decisiones clave', tabla
Incremento | Objetivo | Prioridad | Referencia, y que sus filas no cuenten como fases para el cierre
del roadmap. 3. Tests: un PROJECT.md 1.3 con y sin la sección, y uno con la sección mal ubicada que
debe fallar 1.8. Los tests de 1.0–1.2 deben seguir en verde. 4. Registra el incremento en el
PROJECT.md de nexoru-op. Rama propia, muéstrame el diff antes del commit y luego PR. 5. Si para
registrar el incremento el PROJECT.md de nexoru-op necesita declarar la versión 1.3 del estándar,
súbela en este mismo incremento. 6. Al terminar, verifica en el dashboard local que
nexoru-onboarding ya muestra conformidad y avance (no 'versión no soportada')."

**Referencias**: estándar 1.3.0 (`nexoru-governance`, commit `a791d28`): `CHANGELOG.md`,
`standard/conformance.md` (1.8), `standard/project-standard.md` (sección opcional
`## Incrementos planeados`), `standard/roadmap.md` y `standard/lifecycle.md` (apertura y cierre de
incrementos). Motor de conformidad de las Fases 2 a 4 (`src/lib/standard/`).

## Clarifications

### Session 2026-10-22 (spec inicial)

- **Qué cambia en la 1.3**: según su `CHANGELOG.md`, ninguna regla de la 1.2 cambia; se agrega la
  sección opcional `## Incrementos planeados` y su formato en la verificación 1.8, y la mecánica de
  apertura y cierre de incrementos (documental). Por eso `RULES["1.3"]` es `RULES["1.2"]` más la
  comprobación de esa sección.
- **Aviso de versión más nueva**: con 1.3 soportada, un proyecto 1.0, 1.1 o 1.2 ve un aviso de
  versión más nueva. El texto debe decir qué agrega de verdad cada salto: para 1.0 y 1.1, "reglas
  más estrictas de CI y visibilidad" (vienen de la 1.2) y la sección opcional de incrementos
  planeados (de la 1.3); para 1.2, solo "la sección opcional de incrementos planeados". Decir "reglas más estrictas" a un proyecto 1.2 sería falso.
- **Alcance del incremento planeado**: la fila planeada en `nexoru-op` era "Soporte del estándar
  1.3 e historial de ciclos de vida". Este incremento abre solo el soporte de la 1.3; el historial
  de ciclos de vida sigue como incremento planeado (prioridad media).

### Session 2026-10-22 (decisiones del Dueño al aprobar tasks.md)

- Fecha objetivo de la Fase 5: 2026-10-29.
- Se divide el incremento planeado: se abre solo el soporte de la 1.3; "Historial de ciclos de vida"
  queda como incremento planeado de prioridad media.
- Texto del aviso para los proyectos 1.2: "hay una versión más nueva del estándar (1.3): agrega la sección opcional ## Incrementos planeados" (texto plano).
- Los proyectos 1.2 (p. ej. `amazon-business-engine`) verán ese aviso informativo; no es un hallazgo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Evaluar proyectos que declaran la 1.3 (Priority: P1)

El Dueño ve evaluados, con nivel, Conformidad y Avance, los proyectos que declaran
`version_estandar: "1.3"` (hoy `nexoru-onboarding`), en lugar de "versión no soportada".

**Independent Test**: un `PROJECT.md` ficticio 1.3 se evalúa con 1.3 y con las mismas reglas que
1.2; el tablero lista "Estándar soportado: 1.0, 1.1, 1.2, 1.3".

**Acceptance Scenarios**:

1. **Given** un proyecto con `version_estandar: "1.3"`, **When** se lee el portafolio, **Then** se
   evalúa con 1.3, con nivel, Conformidad y Avance.
2. **Given** un proyecto 1.2, **When** se evalúa, **Then** su resultado no cambia y ve el aviso
   informativo "hay una versión más nueva del estándar (1.3): agrega la sección opcional ## Incrementos planeados".
3. **Given** un proyecto 1.0 o 1.1, **When** se evalúa, **Then** el aviso dice "hay una versión más
   nueva del estándar (1.3) con reglas más estrictas de CI y visibilidad, y la sección opcional
   ## Incrementos planeados" (ajuste del Dueño al aprobar el diff, 2026-10-22).

### User Story 2 - Verificación 1.8 de `## Incrementos planeados` (Priority: P1)

En proyectos 1.3, si `PROJECT.md` tiene `## Incrementos planeados`, la verificación 1.8 comprueba
que esté entre `## Roadmap` y `## Decisiones clave` y que tenga la tabla con el encabezado exacto
`Incremento | Objetivo | Prioridad | Referencia`, con `Prioridad` en `alta`, `media` o `baja`. Sus filas
nunca cuentan como fases.

**Acceptance Scenarios**:

1. **Given** un proyecto 1.3 sin la sección, **When** se evalúa, **Then** 1.8 pasa.
2. **Given** un proyecto 1.3 con la sección bien ubicada y bien formada, **When** se evalúa,
   **Then** 1.8 pasa.
3. **Given** un proyecto 1.3 con la sección después de `## Decisiones clave` (o antes de
   `## Roadmap`), **When** se evalúa, **Then** 1.8 falla con "`## Incrementos planeados` debe ir entre
   `## Roadmap` y `## Decisiones clave`".
4. **Given** la sección sin la tabla con el encabezado exacto, o con una prioridad fuera de
   `alta`, `media` y `baja`, **When** se evalúa, **Then** 1.8 falla con el detalle.
5. **Given** un proyecto con el roadmap concluido y filas en `## Incrementos planeados`, **When** se
   evalúa, **Then** el roadmap sigue concluido, el Avance no cambia y no aparece el hallazgo de
   "`operacion` con fases pendientes".
6. **Given** un proyecto 1.2 que ya tenga la sección, **When** se evalúa, **Then** 1.8 se evalúa como
   hasta hoy (solo las 9 secciones y su orden).

### Edge Cases

- La sección sin filas (solo el encabezado): válida.
- Encabezado de la sección con mayúsculas distintas: se reconoce igual que las demás secciones H2
  (comparación sin distinguir mayúsculas), pero el encabezado de la tabla debe ser exacto.
- `Referencia` puede ser `—`, un `B-NNN` o `#NN`; no se valida su contenido (el estándar no lo exige).

## Requirements *(mandatory)*

- **FR-001**: `SUPPORTED_STANDARD_VERSIONS` DEBE incluir `"1.3"`, y `RULES["1.3"]` DEBE ser igual a
  `RULES["1.2"]` salvo la versión y la comprobación de `## Incrementos planeados`
  (`plannedIncrements: true`).
- **FR-002**: En proyectos 1.3, la verificación 1.8 DEBE, además de lo actual, comprobar la sección
  opcional `## Incrementos planeados` cuando exista: ubicación entre `## Roadmap` y
  `## Decisiones clave`; tabla con el encabezado exacto `Incremento | Objetivo | Prioridad |
  Referencia`; `Prioridad` en `alta`, `media` o `baja`.
- **FR-003**: Las filas de `## Incrementos planeados` NO DEBEN contar como fases: ni en el estado del
  roadmap (activo o concluido), ni en el Avance, ni en los hallazgos de cierre.
- **FR-004**: El aviso de versión más nueva DEBE describir lo que agrega el salto desde la versión
  del proyecto (ver Clarifications).
- **FR-005**: Las pruebas de 1.0, 1.1 y 1.2 DEBEN seguir en verde.
- **FR-006**: El incremento DEBE registrarse en `nexoru-op` con la mecánica de apertura del estándar:
  la fila sale de `## Incrementos planeados` y entra al roadmap como Fase 5 con esta spec y su fecha
  objetivo; `fase` pasa a `construccion` (la spec tendrá `spec.md` y `plan.md`) con `fase_desde`
  nuevo y `fecha_objetivo` igual a la del incremento; se actualiza `docs/mapa-funcional.md`.
  `version_estandar` sube a `"1.3"` en `PROJECT.md` y en el mapa funcional.
- **FR-007**: Al terminar, el dashboard local (entorno de uso) DEBE mostrar `nexoru-onboarding` con
  Conformidad y Avance, no "versión no soportada".

## Success Criteria *(mandatory)*

- **SC-001**: Un `PROJECT.md` 1.3 ficticio con la sección bien formada, otro sin ella y otro con ella
  mal ubicada dan 1.8 pasa, pasa y falla.
- **SC-002**: Toda la batería de pruebas (unitarias, pgTAP y E2E) en verde, con las de 1.0 a 1.2 sin
  cambios de resultado.
- **SC-003**: `nexoru-op` se evalúa con 1.3 sin fallas, y `nexoru-onboarding` aparece evaluado en el
  dashboard del Dueño.

## Assumptions

- Fecha objetivo del incremento: 2026-10-29 (Dueño).
- El historial de ciclos de vida queda fuera de este incremento.
- No hay cambios en la base de datos, en el cliente de GitHub ni en la interfaz, salvo el texto del
  aviso de versión y la lista de versiones soportadas.
