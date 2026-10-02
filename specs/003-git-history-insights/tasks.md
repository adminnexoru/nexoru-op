---
description: "Lista de tareas de la feature 003-git-history-insights"
---

# Tasks: Historial de git, indicadores, identidad visual y gráficos

**Input**: Documentos de diseño en `specs/003-git-history-insights/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: obligatorios (principio VI). En cada fase **las pruebas se escriben primero y deben
fallar** antes de implementar. Si una prueba parece incorrecta, se corrige primero la spec o el
contrato; nunca se debilita la prueba.

## Formato: `[ID] [P?] [Story?] [MANUAL?] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes).
- **[US1]**–**[US5]**: historia de usuario de la spec. US5 (estándar 1.1) también es P1.
- **[MANUAL]**: la hace el Dueño; Claude da los pasos exactos para la terminal integrada de VS Code
  y espera su confirmación.

## Convenciones

- Se mantienen las de la Fase 2:
  - Todo acceso al disco del portafolio pasa por `src/lib/portfolio/safe-fs.ts` y todo git por
    `src/lib/portfolio/git.ts`.
  - Las pruebas usan solo el portafolio ficticio temporal (`nexoru-op-fixture-*`).
  - Código en inglés; interfaz y documentación en español.
- **Git**: todo comando lleva el **prefijo endurecido v2** y argumentos fijos
  (`contracts/git-history.md`).
- **Cálculos puros**: `history.ts`, `ignore.ts`, `indicators.ts` y `rules.ts` no tocan el disco.
- **Fechas en los fixtures**: los repos con historial se crean con fechas **relativas al momento de
  la prueba**, porque `--since=13.weeks.ago` usa el reloj real. Las pruebas reciben esa misma
  fecha base del constructor de fixtures y la pasan como `now` a `readPortfolio`.
- **Interfaz**: sin atributos `style` en el HTML, sin JavaScript para los gráficos y sin
  dependencias nuevas.
- Commits locales cuando el Dueño los pida; **el push lo autoriza el Dueño tras revisar**.

---

## Phase 1: Setup y corrección de seguridad de la Fase 2

**Propósito**: cerrar el hueco encontrado en `git status` (research R11) antes de añadir comandos, y
ampliar el portafolio ficticio.

- [ ] T001 Prueba del repo hostil en `tests/unit/portfolio/git-hardening.test.ts`. Crea su propio repo en una carpeta temporal `nexoru-op-fixture-hostile-*`:
  - `core.fsmonitor` apuntando a un script que deja la marca `MARK-fsmonitor` fuera del repo;
  - `.gitattributes` con `* filter=evil diff=evil`;
  - `filter.evil.clean` (marca `MARK-clean`);
  - `diff.evil.textconv` (marca `MARK-textconv`);
  - `diff.external` (marca `MARK-extdiff`);
  - `core.attributesFile` apuntando a otro archivo con `* filter=evil`;
  - `log.showSignature=true` con `gpg.program` (marca `MARK-gpg`);
  - un archivo versionado al que se le cambia la fecha (`touch`) para forzar la comparación.

  Comprobaciones:
  - Primero, con un `git status` normal, la marca `MARK-clean` **sí** aparece (la prueba es válida).
  - Después, `readGitInfo` y una **lectura completa** (`readPortfolio` sobre una raíz que contiene el repo) no dejan **ninguna** marca.
  - Ningún archivo dentro de `.git` cambia de contenido (sha256) ni de fecha de modificación.
  - `hasUncommittedChanges` sigue detectando un cambio real de contenido.
  - Un segundo repo con `.git/info/attributes` no vacío: `status` no se ejecuta, `hasUncommittedChanges` es `null`, `uncommittedChangesReason` = "atributos locales: no se evalúa por seguridad" y aparece un `Problem` con `reason: "git_error"`.
  - Si `status` falla (por ejemplo, un repo con el índice dañado o git sin soporte de `--attr-source`, simulado), `hasUncommittedChanges` es `null` con `uncommittedChangesReason` = "error de git", **nunca `false`**.
  - Prueba pura en `tests/unit/portfolio/branch-warnings.test.ts`: `branchWarnings` y la tarjeta de repositorio muestran "Cambios sin commit: no evaluado (motivo)" cuando `hasUncommittedChanges` es `null` en un repo, y nunca un texto de "sin cambios".
  - Debe fallar con el código actual.
- [ ] T002 Corregir `src/lib/portfolio/git.ts` (código de la Fase 2) con el prefijo endurecido v2 de `contracts/git-history.md`:
  - añadir `-c core.attributesFile=/dev/null -c log.showSignature=false -c gc.auto=0 -c maintenance.auto=false` y `--attr-source=4b825dc642cb6eb9a060e54bf8d69288fbee4904`;
  - añadir `GIT_PAGER=cat` al entorno;
  - `status --porcelain=v1 -z --ignore-submodules=all`;
  - antes de `status`, `rev-parse --path-format=absolute --git-path info/attributes` y `lstat` de esa ruta con el lector seguro (T009): si existe y tiene tamaño > 0, no se ejecuta `status`;
  - `GitInfo.uncommittedChangesReason` (en `src/lib/portfolio/types.ts`) con el motivo cuando `hasUncommittedChanges` es `null`;
  - `src/components/portfolio/branch-badge.tsx` y `repository-card.tsx` muestran "Cambios sin commit: no evaluado (motivo)" en ese caso.

  Mantener `GIT_OPTIONAL_LOCKS=0`, `--no-optional-locks` y `core.fsmonitor=false`. Hasta verde T001 y las pruebas de git de la Fase 2 (`tests/unit/portfolio/git.test.ts`).
- [ ] T003 Ampliar `tests/fixtures/build-portfolio.ts` para que devuelva `{ root, now }` (la fecha base usada en los commits). Los usos existentes que esperan un `string` se adaptan: `global-setup.ts`, `playwright.config.ts`, la CLI y las pruebas de la Fase 2.
- [ ] T004 [P] Nuevos proyectos ficticios en `tests/fixtures/portfolio/`, todos con datos inventados (`example-org`), y filas añadidas a su `README.md`:
  - `history-demo` (1.0): repo con commits de fechas controladas por el constructor.
  - `standard-1-1-retirado`: `version_estandar: "1.1"`, `fase: retirado`, sin `fecha_objetivo` y roadmap concluido. Esperado: sin fallas.
  - `standard-1-1-operacion`: 1.1, `fase: operacion` y una fase `pendiente`. Esperado: hallazgo medio `operacion_pending_phases` y semáforo de actividad neutro.
  - `standard-1-1-construccion`: 1.1, `fase: construccion` y roadmap concluido. Esperado: hallazgo `construction_roadmap_concluded`.
  - `ignored-copy`: carpeta que listará `.nexoruignore`.
  - `git-info-attributes`: proyecto válido (1.0) cuyo repo tendrá un `.git/info/attributes` no vacío (lo crea el constructor). Esperado: "Cambios sin commit: no evaluado".
  - `.nexoruignore` en la raíz del portafolio ficticio: comentario, línea vacía, `ignored-copy`, `no/valido`, `*` y `carpeta-inexistente`.
- [ ] T005 En `tests/fixtures/build-portfolio.ts`, construir `history-demo` con `GIT_AUTHOR_DATE` y `GIT_COMMITTER_DATE` relativos a `now`:
  - **Commits en `main`**:
    - un commit inicial con `fase: especificacion` hace 60 días;
    - commits en 3 semanas distintas de las últimas 12;
    - un commit que cambia `fase: especificacion` → `fase: construccion` hace 20 días, con `fase_desde` = la fecha de hace 14 días, para que **no coincidan**;
    - el último commit hace 5 días.
  - **Rama remota**: `refs/remotes/origin/main` apunta a un commit con 3 commits que `main` no tiene, creados en una rama temporal que luego se borra.
  - **Rama actual**: `feature/history` con 2 commits propios sobre `main`.
  - **`FETCH_HEAD`**: archivo creado con `fs.utimes` a hace 40 días.
- [ ] T006 Actualizar las pruebas de la Fase 2 que dependen del número de carpetas del portafolio ficticio: `tests/unit/portfolio/read-portfolio.test.ts` (sin `ignored-copy`) y `tests/e2e/us1-portfolio.spec.ts` (filas de la tabla). `ignored-copy` no debe aparecer.

**Checkpoint**: el hueco de `git status` está cerrado y probado; `npm test` en verde.

---

## Phase 2: Foundational (prerrequisitos de todas las historias)

### Pruebas primero (deben fallar)

- [ ] T007 [P] Pruebas de `src/lib/portfolio/ignore.ts` en `tests/unit/portfolio/ignore.test.ts`:
  - ignora las líneas vacías y los comentarios `#`;
  - descarta los nombres con `/`, `\`, `*` o `?`, o que empiecen con `.`;
  - devuelve un `Set` de nombres exactos;
  - si el archivo no existe, el conjunto queda vacío.
- [ ] T008 [P] Pruebas del lector ampliado en `tests/unit/portfolio/safe-fs.test.ts`:
  - `readRootFile(".nexoruignore")` lee el archivo de la raíz con las mismas reglas que el resto;
  - cualquier otro nombre de la raíz lanza `CatalogError`;
  - `statInsideRoot(rutaAbsoluta)` devuelve la fecha de modificación y el tamaño **sin abrir** el archivo (espía sobre `open`);
  - `statInsideRoot` rechaza rutas cuya ruta real queda fuera de `PROJECTS_ROOT`.

### Implementación

- [ ] T009 En `src/lib/portfolio/safe-fs.ts`, añadir:
  - `readRootFile(name: ".nexoruignore")`;
  - `statInsideRoot(absolutePath)`: `realpath` dentro de `realpath(root) + sep`, luego `lstat`, y devuelve `{ mtimeMs, size } | null`; nunca abre el archivo.

  Hasta verde T008.
- [ ] T010 [P] Implementar `src/lib/portfolio/ignore.ts` (`parseNexoruIgnore(text): Set<string>`) (T007).
- [ ] T011 Ampliar `src/lib/portfolio/types.ts` según `data-model.md`:
  - `FORMAT_VERSION = 2`;
  - `GitHistory`, con `activityLight: "verde" | "ambar" | "rojo" | "neutro" | null` y `compareRef: "origin/HEAD" | "main" | null`;
  - `WeekActivity`;
  - `Indicators`, con `conformity` y `progress`, cada uno `{…} | { absent: string }`;
  - `roadmapStatus: "activo" | "concluido" | null`;
  - `history`, `indicators` y `roadmapStatus` en `ProjectReading`;
  - `activityByWeek` e `ignoredCount` en `PortfolioReading`;
  - los códigos de hallazgo `operacion_pending_phases` y `construction_roadmap_concluded`;
  - `supportedStandardVersions` según el soporte vigente.

  Ajustar `tests/unit/portfolio/snapshot.test.ts` para el formato 2.
- [ ] T012 Crear el componente de semáforo en `src/components/status/traffic-light.tsx`, como componente de servidor:
  - props `kind: "declared" | "activity"`, `level: "verde" | "ambar" | "rojo" | "neutro"`, `label` y `detail?`;
  - forma circular para `declared` y cuadrada redondeada para `activity`;
  - ícono de `lucide-react` según `contracts/indicators-ui.md`;
  - texto visible y etiqueta siempre ("Estado declarado", "Actividad");
  - clases de CSS, sin `style`.

  Crear también `src/app/tokens.css` con los tonos del semáforo de research R6 (`#4ade80`, `#f5b942`, `#ff7a7a`, `#a6adbb` y sus fondos al 12 %) y las clases `.traffic-light--…`, importado desde `src/app/globals.css`. La identidad completa llega en US3.
- [ ] T013 Ejecutar `npm test`, `npm run lint` y `npm run typecheck` hasta verde.

**Checkpoint**: lector ampliado, tipos y semáforo base listos.

---

## Phase 3: User Story 1 — Historial de git (Priority: P1) 🎯 MVP

**Goal**: último commit, días sin actividad con semáforo, 12 semanas, adelanto/atraso, antigüedad del
remoto y días en la fase, sin red ni escrituras.

**Independent Test**: el detalle de `history-demo` muestra los valores conocidos del fixture.

### Pruebas de US1 (escribir primero, deben fallar)

- [ ] T014 [P] [US1] Pruebas puras de `src/lib/portfolio/history.ts` en `tests/unit/portfolio/history.test.ts`:
  - **Semanas**: agrupación de lunes a domingo en hora local, 12 semanas, la actual incluida y 0 en las vacías.
  - **Días sin actividad**: días completos.
  - **Semáforo**: verde con 0 y 5 días, ámbar con 6 y 15, rojo con 16, y **neutro** con `fase` ∈ {`pausado`, `operacion`, `retirado`} conservando los días.
  - **Cambio de fase**: el commit más reciente que dejó `fase` en su valor actual, incluido el caso en que se introdujo y no hubo cambios; ignora líneas `fase:` fuera del frontmatter; sin historial devuelve `null`.
  - **Comparación con `fase_desde`**: coincide y no coincide.
  - **Adelanto/atraso**: interpreta `"2\t3"`.
- [ ] T015 [P] [US1] Pruebas de integración en `tests/unit/portfolio/git-history.test.ts` contra `history-demo` (usando `now` del constructor):
  - último commit hace 5 días;
  - 3 semanas con commits;
  - `ahead=2` y `behind=3` contra `origin/HEAD`;
  - `remoteRefsAgeDays=40`;
  - `phaseChangedAt` hace 20 días y `phaseMatchesFaseDesde=false`;
  - `no-origin` usa `main` como `compareRef`;
  - `no-git` deja `history` en `null`;
  - un repo sin `FETCH_HEAD` da `remoteRefsUpdatedAt=null`.

  Además:
  - una lectura completa no cambia ningún archivo de `.git` (huella de la Fase 2);
  - cada comando de historial lleva exactamente los argumentos de `contracts/git-history.md`: se verifica con un espía sobre `execFile` o con una lista exportada de comandos.
- [ ] T016 [P] [US1] E2E en `tests/e2e/us1-history.spec.ts`:
  - la fila de `history-demo` muestra el semáforo "Actividad" con "5 días" y su ícono;
  - el detalle muestra las 12 semanas (gráfico pequeño y "Ver datos"), "2 adelante, 3 atrás", "referencia local de hace 40 días", los días en la fase y el aviso de que no coincide con `fase_desde`;
  - `no-git` muestra los datos de git como ausentes;
  - `git-info-attributes` muestra "Cambios sin commit: no evaluado" con su motivo, y no muestra "sin cambios".

### Implementación de US1

- [ ] T017 [US1] En `src/lib/portfolio/git.ts`, añadir los comandos de historial de `contracts/git-history.md` (argumentos fijos, prefijo v2): `for-each-ref … refs/heads`, `log --branches --since=13.weeks.ago --format=%ct`, `rev-list --left-right --count HEAD...refs/remotes/origin/HEAD` (y si falla, `…refs/heads/main`), `rev-parse --git-path FETCH_HEAD`, `rev-parse --git-common-dir` y `log … -p --no-ext-diff --no-textconv --max-count=500 -- PROJECT.md`. La antigüedad del remoto se obtiene con `statInsideRoot` de las dos rutas de `FETCH_HEAD`, tomando la más reciente.
- [ ] T018 [US1] Implementar `src/lib/portfolio/history.ts`: funciones puras para semanas, días, semáforo de actividad, cambio de fase desde el diff y adelanto/atraso; construye `GitHistory` a partir de las salidas de git, `fase`, `fase_desde` y `now` (T014, T015).
- [ ] T019 [US1] Conectar el historial en `src/lib/portfolio/read-project.ts`: `history` en el `ProjectReading`. En `src/lib/portfolio/read-portfolio.ts`, añadir `activityByWeek` (suma del portafolio) y propagar `now`.
- [ ] T020 [P] [US1] Componentes:
  - `src/components/portfolio/history-card.tsx`: último commit, días con semáforo, adelanto/atraso con su `compareRef`, antigüedad del remoto con sus límites ("desconocida: esta copia nunca ha hecho fetch"), días en la fase contra `fase_desde` y cambios sin commit;
  - `src/components/charts/weekly-chart.tsx`: SVG de columnas generado en el servidor, con `role="img"`, `<title>`, `<desc>` y tabla "Ver datos".
- [ ] T021 [US1] Añadir la columna "Actividad" en `src/components/portfolio/portfolio-table.tsx` y la tarjeta de historial en `src/app/(app)/projects/[folder]/page.tsx`.
- [ ] T022 [US1] Ejecutar `npm test` y `npm run test:e2e` hasta verde, sin violaciones de CSP.

**Checkpoint**: US1 funciona sola; es el MVP de la fase.

---

## Phase 4: User Story 5 — Estándar 1.1 (Priority: P1)

**Goal**: evaluar con 1.0 o 1.1 según lo declarado, mostrar el roadmap activo o concluido, los
hallazgos de cierre y reactivación, y omitir las carpetas de `.nexoruignore`.

**Independent Test**: los proyectos `standard-1-1-*` dan sus resultados esperados e `ignored-copy`
no aparece en ninguna parte.

### Pruebas de US5 (escribir primero, deben fallar)

- [ ] T023 [P] [US5] Pruebas en `tests/unit/standard/rules-1-1.test.ts`:
  - un proyecto 1.1 con `fase: retirado` sin `fecha_objetivo` pasa 1.3 y 1.4, y el mismo proyecto declarando 1.0 falla 1.4 (`retirado` no permitido en 1.0);
  - `roadmapStatus`: concluido si hay al menos una fase y todas están concluidas (derivada `completa` o manual `completa`), activo en otro caso, `null` sin roadmap;
  - los hallazgos `operacion_pending_phases` y `construction_roadmap_concluded` (severidad `medium`) solo para 1.1 y no para 1.0;
  - `especificacion` con el roadmap concluido también genera `construction_roadmap_concluded`.
- [ ] T024 [P] [US5] Pruebas en `tests/unit/portfolio/read-portfolio.test.ts`:
  - `ignored-copy` no aparece en `projects` y `ignoredCount` = 1;
  - las entradas inválidas y la carpeta inexistente de `.nexoruignore` no tienen efecto;
  - con `nexoru-governance` listado en `.nexoruignore`, `standard.found` sigue siendo `true`;
  - `supportedStandardVersions = ["1.0", "1.1"]`;
  - con el `CHANGELOG.md` en 1.1.0, `newerThanSupported = false`;
  - en 1.2.0 sí es `true`.
- [ ] T025 [P] [US5] E2E en `tests/e2e/us5-standard-1-1.spec.ts`:
  - el portafolio no muestra `ignored-copy`;
  - muestra "Estándar soportado: 1.0, 1.1";
  - la fila de `standard-1-1-construccion` dice roadmap "concluido";
  - su detalle muestra el hallazgo medio.

### Implementación de US5

- [ ] T026 [US5] Crear `src/lib/standard/rules.ts`: `StandardRules = { version, fases, phasesWithoutTarget, closureFindings }` para 1.0 (sin `retirado`; `operacion` y `pausado` sin fecha objetivo; sin hallazgos de cierre) y 1.1 (con `retirado` en las dos listas; con hallazgos de cierre). Generalizar `src/lib/standard/v1_0/manifest.ts`, `level1.ts`, `findings.ts` y `evaluate.ts` para recibir las reglas, sin duplicar el motor. Despachar por versión en `src/lib/standard/evaluate.ts`. `SUPPORTED_STANDARD_VERSIONS = ["1.0", "1.1"]` en `src/lib/standard/versions.ts`.
- [ ] T027 [US5] Añadir `roadmapStatus` (función `roadmapConcluded` en `src/lib/standard/v1_0/roadmap.ts`) y los dos hallazgos en `src/lib/standard/v1_0/findings.ts` (solo si `closureFindings`) (T023).
- [ ] T028 [US5] Leer `.nexoruignore` en `src/lib/portfolio/read-portfolio.ts` con `readRootFile` y `parseNexoruIgnore`, y omitir esas carpetas antes de leerlas. `nexoru-governance` se lee siempre como estándar (T024).
- [ ] T029 [US5] Interfaz:
  - columna "Roadmap" (activo o concluido) en `src/components/portfolio/portfolio-table.tsx` y en el detalle;
  - etiquetas de los dos hallazgos nuevos en `src/components/portfolio/labels.ts`.
- [ ] T030 [US5] Ejecutar `npm test` y `npm run test:e2e` hasta verde.

---

## Phase 5: User Story 2 — Conformidad y Avance (Priority: P2)

**Goal**: dos porcentajes con nombre y base, en el tablero y en el detalle.

**Independent Test**: los porcentajes de `level3-demo`, `roadmap-states` y `confirmar` coinciden con
el cálculo a mano.

### Pruebas de US2 (escribir primero, deben fallar)

- [ ] T031 [P] [US2] Pruebas en `tests/unit/standard/indicators.test.ts`:
  - **Conformidad**:
    - aplicables = todas las verificaciones salvo `3.2`;
    - las "Depende de X" cuentan como no cumplidas;
    - `level3-demo` da `passed = applicable` → 100 %;
    - `confirmar` da `missing` con `1.11`;
    - un proyecto no evaluado da `{ absent }`.
  - **Avance**:
    - `roadmap-states` da tareas solo de las fases derivadas, cada spec una vez;
    - `manualPhasesExcluded` = 1;
    - `phasesCompleted` / `phasesTotal` según la definición de fase concluida;
    - sin roadmap o sin fases derivadas da `{ absent }`, nunca 0 %.
  - **Redondeo**: `Math.round`.
- [ ] T032 [P] [US2] E2E en `tests/e2e/us2-indicators.spec.ts`:
  - el tablero muestra "Conformidad 100 %" con "x de x" para `level3-demo`;
  - muestra "Avance" con "n de m tareas";
  - el detalle de `roadmap-states` dice "fases con estado manual no incluidas: 1" y "fases completas: x de y";
  - `no-manifest` muestra los dos porcentajes como ausentes con su motivo.

### Implementación de US2

- [ ] T033 [US2] Implementar `src/lib/standard/indicators.ts` (`conformity(result)`, `progress(roadmap, specs)`) según research R8 y conectarlo en `src/lib/portfolio/read-project.ts` (T031).
- [ ] T034 [US2] Interfaz: columnas "Conformidad" y "Avance" con su base en `src/components/portfolio/portfolio-table.tsx`, y la tarjeta `src/components/portfolio/indicators-card.tsx` en el detalle, con las verificaciones que faltan y la regla de las fases manuales.
- [ ] T035 [US2] Ejecutar `npm test` y `npm run test:e2e` hasta verde.

---

## Phase 6: User Story 3 — Identidad visual y semáforos accesibles (Priority: P3)

> **Punto de control (2026-10-21)**: si el 21 de octubre US3 no está terminada, pasa a una fase
> siguiente (orden de sacrificio del Dueño: primero P4, luego P3). Se actualizan `PROJECT.md` y el
> roadmap.

**Goal**: aspecto de la app de `nexoru-onboarding` (tema oscuro) y semáforos consistentes y
accesibles.

**Independent Test**: el documento de diseño enumera los tokens y su origen; ningún semáforo depende
solo del color.

### Pruebas de US3 (escribir primero, deben fallar)

- [ ] T036 [P] [US3] Pruebas en `tests/unit/visual/contrast.test.ts`: lee `src/app/tokens.css`, calcula el contraste WCAG de cada tono del semáforo y del texto contra el fondo y la superficie del tema, y exige ≥ 4,5:1.
- [ ] T037 [P] [US3] E2E en `tests/e2e/us3-visual.spec.ts`:
  - cada semáforo del tablero y del detalle tiene etiqueta, texto visible e ícono (`svg` con `aria-hidden` y texto al lado);
  - el de estado declarado es circular (clase `traffic-light--declared`) y el de actividad cuadrado (`traffic-light--activity`);
  - `standard-1-1-operacion` muestra el semáforo de actividad neutro con "Sin seguimiento" y su número de días;
  - el `<body>` usa el fondo del tema oscuro (estilo calculado `rgb(5, 6, 10)`).

### Implementación de US3

- [ ] T038 [US3] Escribir `docs/identidad-visual.md` (en español), con base en la lectura de `nexoru-onboarding`:
  - origen de cada valor: archivo y variable de `nexoru-onboarding/app/onboarding-ui.css` o `app/globals.css`;
  - tema oscuro elegido y paleta clara descartada;
  - tokens de color, tipografía (pila Inter sin fuente descargada), espaciados, radios y sombras;
  - semáforos con sus tonos propios y contrastes medidos;
  - reglas de uso (nunca solo color, etiquetas siempre).

  No importar código de ese repo.
- [ ] T039 [US3] Completar `src/app/tokens.css` y adaptar `src/app/globals.css`: variables de shadcn (`--background`, `--card`, `--border`, `--primary` violeta, etc.) en tema oscuro con los valores del documento, pila tipográfica Inter, radios (18 px tarjetas, 999 px píldoras) y superficies. Verificar que las pantallas de acceso de la Fase 1 siguen legibles (T037).
- [ ] T040 [US3] Usar `TrafficLight` en el tablero (columna "Estado declarado", que reemplaza el texto de `estado`), en el detalle y en la leyenda de los gráficos. El semáforo de actividad pasa a neutro según `fase` (FR-032) (T036, T037).
- [ ] T041 [US3] Ejecutar `npm test` y `npm run test:e2e` hasta verde.

---

## Phase 7: User Story 4 — Gráficos (Priority: P4)

> **Punto de control (2026-10-18)**: si el 18 de octubre US4 no ha empezado, pasa a una fase
> siguiente. Se actualizan `PROJECT.md` y el roadmap.

**Goal**: cinco gráficos del portafolio, accesibles y compatibles con la CSP.

**Independent Test**: los totales de cada gráfico coinciden con la tabla y no hay violaciones de
CSP.

### Pruebas de US4 (escribir primero, deben fallar)

- [ ] T042 [P] [US4] Pruebas puras en `tests/unit/charts/chart-data.test.ts`: cálculo de las series de los cinco gráficos desde `PortfolioReading` (distribución de `estado`, proyectos por nivel con los provisionales aparte, Avance por proyecto sin los ausentes y con su nota, proyectos por `fase` y actividad por semana); los totales de los gráficos 1, 2 y 4 coinciden con el número de proyectos.
- [ ] T043 [P] [US4] E2E en `tests/e2e/us4-charts.spec.ts`:
  - hay cinco gráficos (`role="img"` con `<title>`), cada uno con "Ver datos";
  - la suma de "Ver datos" de "Nivel de conformidad" es igual a las filas de la tabla;
  - **sin violaciones de CSP**;
  - el HTML de la página no contiene ningún atributo `style=`.

### Implementación de US4

- [ ] T044 [US4] Implementar `src/lib/charts/chart-data.ts` (puro) (T042).
- [ ] T045 [P] [US4] Implementar `src/components/charts/bar-chart.tsx` (barras horizontales SVG en el servidor, atributos numéricos y clases de `tokens.css`, `role="img"`, `<title>`, `<desc>` y tabla "Ver datos" en `<details>`; "Sin datos" si no hay valores) y reutilizar `weekly-chart.tsx` para la actividad del portafolio.
- [ ] T046 [US4] Añadir la sección de gráficos encima de la tabla en `src/app/(app)/page.tsx`.
- [ ] T047 [US4] Ejecutar `npm test` y `npm run test:e2e` hasta verde, sin violaciones de CSP.

---

## Phase 8: Cierre de la feature

- [ ] T048 [P] Actualizar:
  - `CLAUDE.md`: prefijo endurecido v2 de git, `tokens.css`, `docs/identidad-visual.md` y `.nexoruignore`;
  - `README.md`: qué muestra el tablero ahora;
  - `specs/002-portfolio-conformance/contracts/reader.md`, si quedó algo pendiente.
- [ ] T049 Revisión de seguridad:
  - ningún comando de git sin el prefijo v2 (prueba que recorre la lista exportada de comandos);
  - ningún `fetch`, `pull` ni `push` en el código;
  - `node:fs` y `node:child_process` solo en `safe-fs.ts` y `git.ts`;
  - sin atributos `style` ni `dangerouslySetInnerHTML`;
  - sin dependencias nuevas en `package.json`;
  - sin `.env*` versionados;
  - ningún puerto en `0.0.0.0`.
- [ ] T050 [MANUAL] Entorno de uso: el Dueño decide si crea `/home/fili/proyectos/.nexoruignore` con `nexoru-onboarding-line-endings`, y reinicia con `npm run op:stop` y `npm run op:start`. Claude da los pasos exactos.
- [ ] T051 [MANUAL] Validación con el portafolio real: escenarios 1–10 de `specs/003-git-history-insights/quickstart.md` (Parte 2). Claude toma las huellas de solo lectura (escenario 8) y compara los datos de git con `git log` (escenario 3).
- [ ] T052 Al cerrar la fase:
  - `PROJECT.md`: roadmap con la Fase 3 derivada y `Estado manual` vacío, decisiones clave, riesgos, pendientes, evidencia y siguiente hito (Fase 4);
  - `docs/mapa-funcional.md`;
  - la fila de Nexoru Op en `/home/fili/proyectos/CLAUDE.md`.
- [ ] T053 Con la autorización de push del Dueño: push de `003-git-history-insights` y PR hacia `main` con descripción en español; esperar la CI en verde.
- [ ] T054 [MANUAL] Revisar y hacer merge del PR con "Create a merge commit"; Claude confirma con `gh` la CI de `main`.

---

## Dependencies & Execution Order

- **Fase 1**:
  - T001 antes que T002, para que la prueba falle primero;
  - T003 antes que T004 y T005;
  - T006 después de T004.
- **Fase 2**: depende de la Fase 1. T007 y T008 van primero; T009 depende de T008.
  - T002 usa `statInsideRoot` (T009): si se hace en orden, T002 se completa al terminar T009, y la comprobación de `info/attributes` se activa entonces.
- **US1 (Fase 3)**: depende de la Fase 2. Es el MVP.
- **US5 (Fase 4)**: depende de la Fase 2; es independiente de US1.
- **US2 (Fase 5)**: depende de US5 (fases concluidas y reglas por versión).
- **US3 (Fase 6)**: depende del semáforo base (T012); conviene hacerla después de US1 y US2 para aplicar el tema a todas las columnas.
- **US4 (Fase 7)**: depende de US1 (actividad), US2 (Avance) y US3 (tokens).
- **Cierre (Fase 8)**: depende de todas. T050 antes de T051; T053 requiere la autorización del Dueño; T054 lo hace el Dueño.

### Paralelismo

- Fase 1: T004 en paralelo con T001 y T002.
- Fase 2: T007 y T008 a la vez; T010 en paralelo con T009.
- Dentro de cada historia, sus pruebas marcadas [P] a la vez. US1 y US5 pueden avanzar en paralelo.

---

## Implementation Strategy y fecha (research R9)

1. Fases 1–2: corrección de seguridad de la Fase 2 y base.
2. US1 (historial) → **MVP**; US5 (estándar 1.1) → ya no hay aviso de estándar más nuevo.
3. US2 (indicadores).
4. US3 (identidad) y US4 (gráficos).
5. Cierre con validación en el entorno de uso y un solo PR.

**Puntos de control de la fecha (2026-10-25)**: si el 2026-10-18 no ha empezado US4, sale de esta
fase; si el 2026-10-21 no está US3, también sale (orden de sacrificio del Dueño: P4, luego P3). US1,
US5 y US2 no se mueven.

---

## Notes

- **[MANUAL]**: Claude se detiene, da los pasos exactos y espera la confirmación del Dueño.
- `nexoru-onboarding` y `conversa-experiencias` no se modifican; de `nexoru-onboarding` solo se leen
  valores, en solo lectura.
- Nunca se usa el portafolio real en pruebas ni se copian datos reales a los fixtures.
