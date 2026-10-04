---
description: "Lista de tareas de la feature 004-github-readonly"
---

# Tasks: Datos de GitHub en solo lectura

**Input**: Documentos de diseño en `specs/004-github-readonly/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: obligatorios (principio VI). En cada fase **las pruebas se escriben primero y deben
fallar** antes de implementar. Si una prueba parece incorrecta, se corrige primero la spec o el
contrato; nunca se debilita la prueba.

## Formato: `[ID] [P?] [Story?] [MANUAL?] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes).
- **[US1]**–**[US4]**: historia de usuario de la spec.
- **[MANUAL]**: la hace el Dueño; Claude da los pasos exactos para la terminal integrada de VS Code
  y espera su confirmación.

## Convenciones

- **De las fases anteriores**:
  - el lector seguro (`safe-fs.ts`) y git endurecido (`git.ts`) no cambian;
  - las pruebas usan solo el portafolio ficticio temporal;
  - código en inglés; interfaz y documentación en español;
  - sin atributos `style` ni JavaScript nuevo en el navegador;
  - los textos con números pasan por `src/lib/format.ts`.
- **GitHub**:
  - todo pasa por `src/lib/github/client.ts` (`contracts/github-client.md`): solo `GET`, catálogo
    cerrado de rutas, token solo en `Authorization`;
  - **nunca** se consulta el GitHub real en pruebas; los datos simulados usan solo repos
    `example-org/*` inventados.
- **Token**:
  - nunca en código, specs, fixtures, logs ni chat;
  - en pruebas solo `test-token-NO-REAL-0000`;
  - en el entorno de uso, en `.env.op.local`, que escribe el Dueño.
- **Cálculos puros**: `summarize.ts`, `rules.ts`, `indicators.ts`, `level3.ts` y `findings.ts` no
  tocan la red ni el disco.
- **Commits y push**: en cada parada, pruebas en verde, commit y push de la rama, como en la Fase 3.
  El PR y el merge los autoriza el Dueño.

---

## Phase 1: Setup (salvaguardas y fixtures)

**Purpose**: que ninguna prueba pueda llegar al GitHub real y que existan datos simulados.

- [X] T001 Salvaguarda de Vitest:
  - **Prueba primero**: `tests/unit/github/block-github.test.ts` comprueba que un
    `fetch("https://api.github.com/…")` y un `fetch("https://github.com/…")` dentro de una prueba
    lanzan el error "GitHub real bloqueado en pruebas". Debe fallar.
  - **Implementación**: `tests/unit/setup/block-github.ts` envuelve `globalThis.fetch`, y se
    registra en `vitest.config.ts` (`setupFiles`).
- [X] T002 Salvaguardas de entorno:
  - **Pruebas primero** en `tests/unit/env-guard.test.ts`:
    - `assertTestEnv` falla si `GITHUB_TOKEN` tiene un valor que no empieza con `test-`;
    - `GITHUB_API_ORIGIN` solo se acepta como `http://127.0.0.1:<puerto>` y solo en el entorno de
      pruebas (Supabase `127.0.0.1:54321`);
    - en el entorno de uso (55321), cualquier `GITHUB_API_ORIGIN` hace fallar el arranque.
  - **Implementación**:
    - en `scripts/env-guard.ts`;
    - en `src/lib/env.server.ts`, con `GITHUB_TOKEN` y `GITHUB_API_ORIGIN` opcionales en el esquema
      `zod`.
- [X] T003 [P] *(Hecha: el escenario está en TypeScript, `tests/fixtures/github/data.ts`, en vez de archivos JSON; así el mismo escenario genera las respuestas de las 6 rutas con fechas relativas a `now`.)* Datos simulados de GitHub en `tests/fixtures/github/`:
  - respuestas JSON ficticias de las 6 rutas del catálogo (`contracts/github-client.md`) para repos
    `example-org/*`;
  - casos de CI en verde, en rojo, en curso, sin ejecuciones, con varios workflows y con un
    workflow fuera de las 50 más recientes;
  - repo público, privado e `internal`;
  - 0, 2 y 12 PRs, con un título que contiene `<script>`;
  - 0 y 2 alertas.
  - `tests/fixtures/github/fake-github.ts` construye un `fetch` simulado en memoria con:
    - un registro de las peticiones recibidas (método, ruta y cabeceras);
    - respuestas programables: 200 con ETag, 304, 401, 403 con `x-ratelimit-remaining: 0`, 404,
      429 con `retry-after`, 500, retraso y red caída;
    - cabeceras `x-ratelimit-*` y `GitHub-Authentication-Token-Expiration` con fecha programable
      (para el aviso de 14 días o menos).
- [X] T004 [P] Remotos de GitHub en el portafolio ficticio: en `tests/fixtures/build-portfolio.ts` y
  `tests/fixtures/portfolio/`, los proyectos con repo git reciben `origin` apuntando a
  `https://github.com/example-org/<nombre>.git`, con `git remote add`, sin red.
  - Se añaden un proyecto con remoto que no es de GitHub (`https://gitlab.example.com/…`) y uno sin
    remoto.
  - Se actualiza `tests/fixtures/portfolio/README.md`.
  - Se ajustan las pruebas de las fases anteriores que dependan del número de proyectos.
- [X] T005 [P] `.env.example`:
  - `GITHUB_TOKEN`, con el comentario "token fine-grained de solo lectura; solo en .env.op.local;
    ver specs/004-github-readonly/quickstart.md";
  - `GITHUB_API_ORIGIN`, con el comentario "solo pruebas E2E; nunca en uso".

---

## Phase 2: Foundational (cliente, oleadas e índice)

**⚠️ CRITICAL**: ninguna historia empieza antes de terminar esta fase.

### Pruebas primero (deben fallar)

- [X] T006 [P] Pruebas del cliente en `tests/unit/github/client.test.ts`, todas las filas de
  "Pruebas obligatorias" de `contracts/github-client.md`:
  - **Métodos**: `POST`, `PUT`, `PATCH`, `DELETE` y `HEAD` lanzan `method_not_allowed` y el `fetch`
    simulado no recibe nada.
  - **Rutas y origen**: rutas fuera del catálogo, con `..` o con otro host lanzan
    `route_not_allowed`; el origen real se rechaza en el entorno de pruebas.
  - **Cabeceras enviadas**: `Accept`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: nexoru-op`;
    `Authorization: Bearer test-token-NO-REAL-0000` solo con token; `If-None-Match` con ETag.
  - **Opciones de `fetch`**: `cache: "no-store"` y `redirect: "error"`.
  - **Respuestas**: 304 reutiliza el resumen; 401 da "el token de GitHub no es válido"; 403 o 429
    con límite detienen sin reintentos; con `remaining ≤ 2` no se consulta más; el plazo de 4 s
    por petición se cumple.
  - **Token**: no aparece en los errores ni en la consola capturada (`vi.spyOn(console, …)`).
  - **Vencimiento**: `GitHub-Authentication-Token-Expiration` se convierte en ISO.
- [X] T007 [P] Revisión de código en `tests/unit/security/review.test.ts`:
  - solo `src/lib/github/client.ts` contiene `fetch(` hacia GitHub;
  - ningún archivo `"use client"` importa `@/lib/github`;
  - el código no contiene métodos HTTP distintos de `GET` hacia GitHub;
  - `next.config` no activa `logging.fetches`.
- [X] T008 [P] Pruebas de las oleadas en `tests/unit/github/fetch-portfolio.test.ts`:
  - **Orden**: por prioridad (repo → CI → PRs → alertas), con concurrencia máxima 3.
  - **Plazo de 8 s**: con respuestas lentas, lo pendiente queda `unavailable` ("tiempo agotado").
  - **Fusión con lo anterior**: una falla conserva `value` y `fetchedAt` anteriores con `reason`.
  - **Proyectos sin GitHub**: un proyecto sin remoto o con remoto que no es de GitHub no genera
    consultas (`applies`).
  - **Discrepancia de repo**: `repoMismatch` cuando `PROJECT.md` declara otro `repo`.
  - Aquí solo se prueba la oleada 1; las demás las prueba cada historia.
- [X] T009 [P] Pruebas del índice en `tests/unit/portfolio/snapshot.test.ts`:
  - `FORMAT_VERSION` 3; un índice de formato 2 se descarta y se vuelve a leer;
  - **`localOnly`** (relectura a los 10 minutos) no llama al cliente de GitHub y conserva
    `github`, `githubStatus` y `githubCache`;
  - **`withGitHub`** (Actualizar) sí lo llama;
  - el índice guardado no contiene `test-token-NO-REAL-0000`.

### Implementación

- [X] T010 Tipos `zod` en `src/lib/github/types.ts`, según `data-model.md`:
  - **`GithubData`**: `applies: "yes" | "no_remote" | "not_github"`.
  - **`Fetched<T>`**: `status: "ok" | "unavailable" | "not_evaluated"`; `value` "el último valor
    bueno, aunque sea de una consulta anterior".
  - **`RepoInfo`**: `visibility: "publico" | "privado"` ("`public` → `publico`; `private` e
    `internal` → `privado`").
  - **`CiInfo`**, **`CiRun`** y **`PullInfo`**.
  - **`GithubStatus`**: sin el valor del token, solo `tokenPresent`.
  - **`GithubCache`**: clave = ruta sin origen.
- [X] T011 Cliente `src/lib/github/client.ts` (`server-only`), según `contracts/github-client.md`:
  - `githubGet(route, options)` y la función interna `request(method, route)`;
  - el origen y su override de pruebas;
  - el catálogo de rutas;
  - las cabeceras;
  - el ETag;
  - el límite;
  - el vencimiento del token;
  - errores sin cabeceras (T006, T007).
- [X] T012 Oleadas en `src/lib/github/fetch-portfolio.ts`:
  - `fetchPortfolioGithub(projects, previous, deps)` con plazo global de 8 s (`AbortSignal`),
    concurrencia 3 y oleadas registrables por prioridad;
  - **oleada 1**: consulta 1 (repo);
  - fusión con los datos anteriores (T008).
- [X] T013 Índice y flujo de lectura:
  - **`src/lib/portfolio/types.ts`**: `FORMAT_VERSION = 3`, más `github`, `githubStatus` y
    `githubCache`.
  - **`src/lib/portfolio/read-portfolio.ts`**: lee lo local, luego GitHub (si el modo lo pide) y
    luego evalúa. `evaluateProject(files, date, github)` recibe los datos de GitHub, por ahora
    sin usarlos.
  - **`src/lib/portfolio/snapshot.ts`**: modos `withGitHub` y `localOnly`.
  - **`src/lib/portfolio/actions.ts`**: Actualizar usa `withGitHub`; `getPortfolio` usa
    `localOnly` al vencer los 10 minutos (T009).
- [X] T014 *(Hecha con un ajuste: la consulta a GitHub ocurre dentro del servidor de la app, así que la parte "sin simulado no se consulta el GitHub real" es la función pura `githubClientFor`, probada en `tests/unit/env-guard.test.ts`; la E2E `github-safeguard.spec.ts` comprueba que la app solo llega al simulado, solo con GET, rutas del catálogo y el token ficticio, y que abrir el tablero no consulta GitHub. El simulado escucha en el puerto fijo 4010 y cambia de modo por `POST /__state`.)* GitHub simulado para E2E:
  - **Servidor**: `tests/e2e/fake-github.ts`, un servidor `node:http` en `127.0.0.1` con un puerto
    libre que sirve las respuestas de `tests/fixtures/github/`, con escenarios conmutables por
    archivo de estado (normal, apagado, límite agotado).
  - **Configuración**: en `playwright.config.ts`, el servidor arranca antes del `webServer`, que
    recibe `GITHUB_API_ORIGIN` y `GITHUB_TOKEN=test-token-NO-REAL-0000`.
  - **Prueba de la salvaguarda**: en `tests/e2e/github-safeguard.spec.ts`, con el origen real
    forzado en el entorno de pruebas, Actualizar no consulta nada y muestra "no disponible".
- [X] T015 Ejecutar `npm test`, `npm run lint` y `npm run typecheck` hasta verde.

**Checkpoint**: cliente, oleadas e índice listos; ninguna prueba sale a la red.

---

## Phase 3: User Story 1 — CI de la rama principal y verificación 3.2 (Priority: P1) 🎯 MVP

**Goal**: CI de la rama principal por proyecto; 3.2 evaluada; base 28/29 con el estado de 3.2 en
la celda y la leyenda fija.

**Independent Test**: con el GitHub simulado, Actualizar muestra la CI, 3.2, el nivel y la
Conformidad con su texto exacto; con el GitHub simulado apagado, el motivo.

### Pruebas de US1 (escribir primero, deben fallar)

- [X] T016 [P] [US1] Pruebas en `tests/unit/github/summarize.test.ts` del resumen de ejecuciones
  (consultas 2 y 2b):
  - `latest`, aunque esté en curso;
  - `latestCompletedAny`;
  - `perWorkflow` solo para los archivos que cumplen 3.1, emparejados por `path`;
  - consulta 2b cuando un workflow no aparece entre las 50;
  - solo `conclusion: "success"` cumple.
- [X] T017 [P] [US1] Pruebas de 3.2 en 1.0 y 1.1 en `tests/unit/standard/check-3-2.test.ts`:
  - **Resultado**: pasa con la última ejecución terminada en verde y falla en rojo, con su
    detalle (workflow y fecha); una ejecución en curso no decide.
  - **Datos guardados**: un dato de 2 días se usa ("CI de hace 2 días"); uno de 7 días o más da
    `not_evaluated` ("sin datos recientes de GitHub").
  - **Motivos de no evaluación**: "requiere token", "token de GitHub no válido o vencido", "el
    remoto no es de GitHub" y "sin remoto".
  - **Nivel**: con 3.2 evaluada, el nivel 3 no es provisional; si 3.2 falla, el nivel es 2.
- [X] T018 [P] [US1] Pruebas de la base en `tests/unit/standard/indicators.test.ts` y
  `tests/unit/format.test.ts` (filas "Conformidad sin 3.2" y "Secuencia de actualizaciones" de
  `contracts/github-ui.md`):
  - **Texto exacto**: "100 % · 28 de 28 (3.2 sin evaluar: <motivo>)" para cada motivo de FR-017, y
    "97 % · 28 de 29 (incluye 3.2)".
  - **Secuencia**:
    1. verde da 29;
    2. sin respuesta con un dato de 2 días, sigue en 29;
    3. con un dato de 8 días da 28 con el motivo.

    Fuera de la leyenda nunca aparece "cambió".
  - **`check32`**: describe el estado actual, nunca un cambio.
- [X] T019 [P] [US1] *(Escrita antes de la interfaz; no pudo correr en rojo porque la compilación de Next revisa los tipos de las pruebas, que importaban módulos aún inexistentes. El rojo de US1 lo dieron las 35 pruebas unitarias.)* E2E en `tests/e2e/us1-github-ci.spec.ts`:
  - columna CI con su semáforo (rombo) y el texto, en los cinco estados;
  - tarjeta GitHub del detalle con la CI;
  - Conformidad con su texto, y la leyenda fija una sola vez bajo la tabla;
  - encabezado "Datos de GitHub de hace X", consultas restantes y "Token de GitHub: vence el …";
  - aviso con 14 días o menos;
  - con el GitHub simulado apagado: el motivo, y lo local completo;
  - **Token**: el token ficticio no aparece en el HTML de `/` ni del detalle;
  - **CSP**: cero violaciones.

### Implementación de US1

- [X] T020 [US1] Resumen de ejecuciones en `src/lib/github/summarize.ts` y oleada 2 (consultas 2 y
  2b) en `src/lib/github/fetch-portfolio.ts` (T016).
- [X] T021 [US1] 3.2 en el motor (T017):
  - **`src/lib/standard/rules.ts`**: `ciRule: "latest_any"` en 1.0 y 1.1.
  - **`src/lib/standard/v1_0/level3.ts`**: 3.2 con los datos de GitHub, con la regla de los 7 días
    y los motivos de FR-017.
  - **`src/lib/standard/v1_0/evaluate.ts` y `src/lib/standard/evaluate.ts`**: reciben y pasan el
    argumento `github`.
  - **`GITHUB_PHASE_REASON`** se elimina.
- [X] T022 [US1] Base y texto de la Conformidad (T018):
  - **`src/lib/standard/indicators.ts`**: `applicable` 28 o 29 y `check32`.
  - **`src/lib/format.ts`**: `conformityText`.
- [X] T023 [US1] *(Hecha: el semáforo de CI reutiliza los tonos de `tokens.css`, que ya tienen su prueba de contraste AA, y se distingue por la forma: extremos en punta con `clip-path`, `data-shape="diamond"`. La lógica del semáforo está en `src/lib/github/ci-state.ts`. También se ajustaron `us1-portfolio`, `us2-indicators`, `us3-visual`, `us5-standard-1-1` y `us2-conformance` por la fusión Tipo/Cliente, Roadmap al detalle, el texto de la Conformidad y el semáforo nuevo.)* Tablero (`contracts/github-ui.md`):
  - **Semáforo de CI**: en `src/components/status/traffic-light.tsx`, `kind: "ci"` con forma de
    rombo. Sus tokens van en `src/app/tokens.css`, con la prueba de contraste en
    `tests/unit/visual/contrast.test.ts`.
  - **Columnas**: en `src/components/portfolio/portfolio-table.tsx`, entra la columna CI, Tipo y
    Cliente se fusionan y sale Roadmap.
  - **Conformidad**: la celda con `conformityText`, y la leyenda fija bajo la tabla.
  - **Pruebas de fases anteriores**: se ajustan las que dependen de las columnas:
    `tests/e2e/us1-portfolio.spec.ts`, `review-tables-charts.spec.ts`, `us3-roadmap.spec.ts` y
    `us2-indicators.spec.ts`.
- [X] T024 [US1] Detalle y encabezado:
  - **Tarjeta GitHub**: `src/components/github/github-card.tsx`, con repo, aviso de discrepancia
    de `repo`, CI por workflow y origen de los datos. Va en `src/app/(app)/projects/[folder]/page.tsx`.
  - **Estado de GitHub**: `src/components/github/github-status.tsx`, con antigüedad, límite,
    token, vencimiento y avisos de 14 días o menos, de token no válido y de límite. Va en
    `src/app/(app)/page.tsx`.
  - **Leyenda**: la leyenda fija también en `src/components/portfolio/indicators.tsx` (T019).
- [X] T025 [US1] Parada: `npm test`, `npm run lint`, `npm run typecheck`,
  `npx supabase db reset && npm run db:test` y `npm run test:e2e` en verde; commit y push de la
  rama.

**Checkpoint**: MVP; 3.2 activa y la Conformidad dice su base en todo momento.

---

## Phase 4: Estándar 1.2 (prerrequisito de US2; FR-026 y FR-028)

**Goal**: el dashboard soporta 1.0, 1.1 y 1.2 con reglas por versión, y avisa de la versión más
nueva.

### Pruebas primero (deben fallar)

- [X] T026 [P] Pruebas en `tests/unit/standard/versions.test.ts` y
  `tests/unit/standard/rules-1-2.test.ts`:
  - **Versiones**: `SUPPORTED_STANDARD_VERSIONS` es `["1.0", "1.1", "1.2"]`; el aviso de estándar
    local más nuevo se calcula contra 1.2.
  - **Reglas**: `RULES["1.2"]` es igual a 1.1 más `ciRule: "each_workflow"` y
    `visibilityField: true`.
  - **3.2 en 1.2**: cumple si la última ejecución terminada de **cada** workflow que cumple 3.1 está
    en verde; un workflow sin ejecuciones terminadas no cumple; la falla nombra los workflows; si
    3.1 falla, 3.2 falla con "ningún workflow cumple 3.1".
- [X] T027 [P] Pruebas del manifiesto en `tests/unit/standard/manifest-visibilidad.test.ts`: campo
  opcional `visibilidad`.
  - Vacía equivale a no declarada.
  - `publico` y `privado` son válidos.
  - Otro valor (incluido `CONFIRMAR`) da una advertencia y cuenta como no declarada. Con
    `CONFIRMAR` además falla 1.11, como dice el estándar.
  - No es un campo enumerado de 1.4.
- [X] T028 [P] Pruebas del aviso de versión en `tests/unit/standard/newer-version.test.ts` y en
  `tests/e2e/us2-standard-1-2.spec.ts`. El texto es "hay una versión más nueva del estándar (1.2)
  con reglas más estrictas de CI y visibilidad" (FR-028).
  - Aparece en proyectos 1.0 y 1.1, en el detalle y como indicación en el tablero.
  - No aparece en 1.2.
  - No es hallazgo ni cambia el nivel ni la Conformidad.
  - El número sale de la versión más reciente soportada.
- [X] T029 [P] Fixtures 1.2 en `tests/fixtures/portfolio/`: proyectos 1.2 ficticios `interno`,
  `producto-nexoru` y `producto-cliente`, con y sin `visibilidad`. El README se actualiza.

### Implementación

- [X] T030 Soporte de 1.2:
  - `src/lib/standard/versions.ts`;
  - `src/lib/standard/rules.ts` (1.2);
  - `src/lib/standard/v1_0/level3.ts` (`each_workflow`);
  - `src/lib/standard/v1_0/manifest.ts` (campo `visibilidad`);
  - `src/lib/portfolio/types.ts` (manifiesto).

  Cubre T026 y T027.
- [X] T031 Aviso de versión más nueva: cálculo en `src/lib/standard/evaluate.ts`, que lo incluye
  en el resultado; se muestra en `src/components/portfolio/conformance-panel.tsx` y como indicación
  en la tabla (T028).
- [X] T032 Parada: pruebas en verde; commit y push.

---

## Phase 5: User Story 2 — Visibilidad del repo (Priority: P2)

**Goal**: visibilidad por repo y su resultado según la versión del estándar.

**Independent Test**: con el GitHub simulado y los fixtures 1.1 y 1.2, cada proyecto muestra su
visibilidad, su resultado y sus hallazgos según FR-019 y FR-020.

### Pruebas de US2 (escribir primero, deben fallar)

- [X] T033 [P] [US2] Pruebas en `tests/unit/standard/visibility.test.ts`:
  - **1.0 y 1.1**: solo el hallazgo alto "`producto-cliente` en un repo público"; `visibility`
    es `null`.
  - **1.2**:
    - sin campo en `producto-nexoru` o `producto-cliente`: `requiere-decision` con hallazgo alto;
    - sin campo en `interno`: `sin-declarar (interno)`, sin hallazgo;
    - declarado y coincide: `aceptada`, sin hallazgo;
    - declarado y no coincide: `discrepancia` con hallazgo alto.
  - **`producto-cliente` con `visibilidad: publico` y repo público**: `aceptada` **y** el
    hallazgo alto de `producto-cliente`.
  - **`internal`** cuenta como `privado`.
  - **Sin dato de GitHub**: `no_evaluado` con el motivo; con un dato guardado de menos de 7 días,
    se usa.
  - **Nivel**: ningún caso lo cambia.
- [X] T034 [P] [US2] *(Se corrió en rojo después de escribir la interfaz, contra los dos componentes sin US2: falló la primera prueba; el caso del repo privado sin token queda en las pruebas unitarias, porque la batería E2E siempre lleva el token ficticio.)* E2E en `tests/e2e/us2-github-visibility.spec.ts`:
  - "público" o "privado" bajo el nombre de cada proyecto en la tabla;
  - el resultado y su explicación en la tarjeta GitHub;
  - los hallazgos en el panel de conformidad;
  - un repo privado sin token da "no disponible: requiere token".

### Implementación de US2

- [X] T035 [US2] *(Hecha: además de `repo_visibility` (`producto-cliente` público), dos códigos nuevos de hallazgo, `visibility_decision_required` y `visibility_mismatch`; el dato de GitHub se usa con la misma regla de 7 días y motivos que 3.2, en `usableGithub`. Se eliminó `GITHUB_PHASE_REASON`.)* Evaluación de visibilidad (T033):
  - **`src/lib/standard/v1_0/findings.ts`**: la evaluación.
  - **`ConformanceResult.visibility`**: en `src/lib/portfolio/types.ts`.
  - **Datos de entrada**: la oleada 1 ya trae `RepoInfo`.
- [X] T036 [US2] Interfaz:
  - visibilidad bajo el nombre en `src/components/portfolio/portfolio-table.tsx`;
  - sección de visibilidad en `src/components/github/github-card.tsx` (T034).
- [X] T037 [US2] Parada: pruebas en verde; commit y push.

---

## Phase 6: User Story 3 — Pull requests abiertos (Priority: P3)

**Goal**: PRs abiertos con su antigüedad y su CI.

**Independent Test**: con el GitHub simulado, repos con 0, 2 y 12 PRs muestran la lista correcta y
el número en el tablero.

### Pruebas de US3 (escribir primero, deben fallar)

- [X] T038 [P] [US3] Pruebas de PRs:
  - **Resumen**, en `tests/unit/github/summarize.test.ts`:
    - número, título, `openedAt` y CI (`success`, `failure`, `in_progress`, `none`);
    - *(Añadido el 2026-10-04 a pedido del Dueño.)* PR en borrador (`draft`), PR de un fork
      (`fromFork`, incluido un fork borrado con `head.repo` nulo), ejecuciones de un fork que
      esperan aprobación (`awaiting_approval`) y un PR sin `head.sha` válido (`not_queried`, sin
      error);
    - CI consultada solo para los 10 PRs más recientes, el resto `not_queried`;
    - no se guarda el cuerpo ni el autor.
  - **Oleada 3**, en `tests/unit/github/fetch-portfolio.test.ts`: consultas 3 y 4, con
    `head_sha` validado como 40 hexadecimales.
- [X] T039 [P] [US3] E2E en `tests/e2e/us3-github-pulls.spec.ts`:
  - columna PRs (número, "—" o "?" con motivo);
  - lista en el detalle con "abierto hace N días" y la CI;
  - "Ninguno" cuando no hay PRs;
  - el título con `<script>` se muestra como texto, sin ejecutarse y sin violación de CSP;
  - *(Añadido el 2026-10-04.)* un PR en borrador muestra "borrador" y uno de un fork "desde un fork",
    con su CI ("requiere aprobación" si GitHub la espera), sin errores ni violaciones de CSP.

### Implementación de US3

- [X] T040 [US3] Resumen de PRs en `src/lib/github/summarize.ts` y oleada 3 en
  `src/lib/github/fetch-portfolio.ts` (T038).
- [X] T041 [US3] Interfaz: columna PRs en `src/components/portfolio/portfolio-table.tsx` y lista
  de PRs en `src/components/github/github-card.tsx` (T039).
- [X] T042 [US3] Parada: pruebas en verde; commit y push.

---

## Phase 7: User Story 4 — Alertas de secretos (Priority: P4)

**Goal**: número de alertas de secret scanning abiertas, o "no evaluado" con su motivo.

**Independent Test**: con el GitHub simulado, repos con 0 y 2 alertas, sin permiso y sin token.

### Pruebas de US4 (escribir primero, deben fallar)

- [X] T043 [P] [US4] Pruebas de alertas en `tests/unit/github/summarize.test.ts`,
  `tests/unit/github/fetch-portfolio.test.ts` y `tests/unit/standard/secret-alerts.test.ts`:
  - **Ruta**: siempre con `hide_secret=true`.
  - **Qué se guarda**: solo el número; el secreto, su tipo, su ubicación y la URL de la alerta del
    simulado nunca llegan al índice, a los logs ni a la pantalla.
  - **Motivos de "no evaluado"** (ajuste del Dueño, 2026-10-04): sin token, "requiere token"; 403,
    "el token no tiene permiso de alertas"; 404, "secret scanning no está activo".
  - **Hallazgo**: con 1 o más alertas, el crítico "Secretos en el historial" (`secret_history`)
    queda encontrado, sin cambiar el nivel; con 0 sigue "no evaluado" con la nota de que el secret
    scanning solo detecta patrones conocidos.
- [X] T044 [P] [US4] E2E en `tests/e2e/us4-github-alerts.spec.ts`:
  - el aviso del portafolio "N repos tienen alertas de secretos abiertas";
  - la sección de alertas de la tarjeta GitHub: "sin alertas abiertas (secret scanning de GitHub)"
    con 0, nunca "sin secretos";
  - los motivos.

### Implementación de US4

- [X] T045 [US4] *(Hecha. Al implementarla apareció un defecto en `usableGithub` (US1–US2): trataba el valor 0 como "sin dato"; ahora solo `null` cuenta como ausencia. La consulta devuelve además el tipo de fallo, para distinguir el 404 (secret scanning no activo) del 403 (token sin el permiso).)* Oleada 4 en `src/lib/github/fetch-portfolio.ts`, resumen en
  `src/lib/github/summarize.ts` y hallazgo en `src/lib/standard/v1_0/findings.ts` (T043).
- [X] T046 [US4] Interfaz: aviso del portafolio en `src/app/(app)/page.tsx` y sección en
  `src/components/github/github-card.tsx` (T044).
- [X] T047 [US4] Parada: pruebas en verde; commit y push.

---

## Phase 8: Cierre

- [X] T056 *(Trabajo no previsto, 2026-10-04: causa de B-013.)* Corregir la navegación "Ya los guardé"
  de `src/components/auth/enroll-form.tsx` (Fase 1): hoy navega con `onClick` y `router.push("/")`, que
  solo funciona después de la hidratación. En la corrida del 2026-10-04 la traza mostró que el código
  TOTP se envió como POST normal (página aún sin hidratar), el servidor devolvió los códigos y el clic en
  "Ya los guardé" no produjo ninguna petición durante 5 s. Se convierte en un enlace a `/` con aspecto de
  botón, que funciona con y sin JavaScript.
  - **Prueba primero**: `tests/e2e/us1-enroll-no-js.spec.ts`, con JavaScript desactivado, recorre la
    activación y el registro del segundo factor y comprueba que "Ya los guardé" lleva a `/`. Debe fallar
    antes de la corrección.
  - Se ajustan las pruebas que buscan "Ya los guardé" como botón.

- [ ] T048 Documentación:
  - **`CLAUDE.md`**: reglas del cliente de GitHub; el token en `.env.op.local`; las salvaguardas
    de pruebas; la estructura con `src/lib/github` y `src/components/github`.
  - **`docs/identidad-visual.md`**: el rombo de la CI.
  - **`README.md`**: si menciona variables.
  - **`.env.example`**: revisión.
  - **`specs/004-github-readonly/quickstart.md`**: revisar que los pasos del token y los escenarios
    coinciden con lo construido (FR-025).
- [ ] T049 Revisión de seguridad, convertida en pruebas permanentes en
  `tests/unit/security/review.test.ts`:
  - solo `GET`;
  - solo `client.ts` consulta GitHub;
  - el token ficticio no aparece en el HTML, el índice ni los logs de las E2E;
  - `hide_secret=true`;
  - la CSP es idéntica a la de la Fase 3 (la prueba de cabeceras no cambia);
  - sin dependencias nuevas;
  - `npm audit` sin vulnerabilidades nuevas respecto de la Fase 3.
- [ ] T050 [MANUAL] Crear el token (quickstart, Parte 2): fine-grained, de solo lectura, *Only
  select repositories* con los 6 repos del portafolio, vencimiento a 90 días y permisos Metadata,
  Actions, Pull requests y Secret scanning alerts.
  - El Dueño lo pega en `.env.op.local` y reinicia con `npm run op:stop` y `npm run op:start`.
  - Claude da los pasos exactos y nunca ve el valor.
- [ ] T051 *(2026-10-04: hecho en `nexoru-op` (`visibilidad: publico`, 1.2 en `PROJECT.md` y el mapa funcional, la razón en "Decisiones clave" y la Fase 4 del roadmap enlazada a `004-github-readonly`, sin la cual fallaba 3.5); el lector lo evalúa con 1.2, nivel 3 provisional y sin fallas. Pendiente `amazon-business-engine`, que hace el Dueño desde su sesión.)* [MANUAL] `visibilidad` y 1.2 (FR-027), desde la sesión de cada proyecto y después de
  verificar que cumplen la 1.2:
  - declarar `visibilidad` en el frontmatter de `PROJECT.md` de `amazon-business-engine` y
    `nexoru-op`, con su fila en `## Decisiones clave`. En `nexoru-op` se declara
    `visibilidad: publico` aunque sea `interno` (el estándar no lo exige para `interno`), para que
    la decisión del Dueño quede registrada y su resultado sea `aceptada`;
  - subir `version_estandar` a `"1.2"` en `PROJECT.md` y `docs/mapa-funcional.md`.

  Cada cambio va en su propio commit en su repo. Claude verifica después, en solo lectura, que el
  dashboard los evalúa con 1.2 y que su visibilidad es `aceptada`.
- [ ] T052 [MANUAL] Validación con el portafolio real: escenarios 1–12 de la Parte 3 de
  `quickstart.md`.
  - Claude toma las huellas de solo lectura (escenario 12).
  - Claude compara la CI, la visibilidad y los PRs con `gh` en solo lectura (escenarios 3, 5 y 6).
  - Claude comprueba que el token no aparece en la página, en `.op/app.log` ni en el índice
    (escenario 11).
- [ ] T053 Al cerrar la fase:
  - **`PROJECT.md`**:
    - roadmap con la Fase 4 enlazada a `004-github-readonly` y `Estado manual` vacío;
    - decisiones clave;
    - riesgos (vencimiento del token);
    - pendientes;
    - evidencia;
    - siguiente hito.
  - **`docs/mapa-funcional.md`**: el cliente de GitHub en componentes, flujo, reglas, datos e
    integraciones; el token en `.env.op.local`.
  - **`specs/backlog.md`**: lo que se haya sacrificado.
  - **`/home/fili/proyectos/CLAUDE.md`**: la fila de Nexoru Op.
- [ ] T054 Con la autorización del Dueño: PR de `004-github-readonly` hacia `main` con descripción
  en español; esperar la CI en verde.
- [ ] T055 [MANUAL] Revisar y hacer merge del PR con "Create a merge commit"; Claude confirma con
  `gh` la CI de `main`.

---

## Dependencies & Execution Order

- **Fase 1**:
  - T001 y T002 primero (salvaguardas);
  - T003, T004 y T005 en paralelo entre sí.
- **Fase 2**: depende de la Fase 1.
  - T006 a T009 primero (deben fallar);
  - T010 antes que T011 y T012;
  - T013 depende de T010 a T012;
  - T014 depende de T003 y T013.
- **US1 (Fase 3)**: depende de la Fase 2. Es el MVP.
- **Estándar 1.2 (Fase 4)**: depende de US1, porque extiende la regla de 3.2 de T021.
- **US2 (Fase 5)**: depende de la Fase 4 (campo `visibilidad`) y de la oleada 1 (Fase 2).
- **US3 (Fase 6)**: depende de la Fase 2. Es independiente de US1 y US2, pero conviene después de
  US1 por la tarjeta GitHub.
- **US4 (Fase 7)**: depende de la Fase 2 y de la tarjeta GitHub (T024).
- **Cierre (Fase 8)**:
  - T048 y T049 después de las historias;
  - T050 y T051 antes de T052, para que la validación ejerza el token y la 1.2;
  - T054 requiere la autorización del Dueño;
  - T055 lo hace el Dueño.

### Paralelismo

- Fase 1: T003, T004 y T005 a la vez.
- Fase 2: T006, T007, T008 y T009 a la vez.
- Dentro de cada historia, sus pruebas marcadas [P] a la vez.
- US3 puede avanzar en paralelo con la Fase 4 y US2, si se trabaja en archivos distintos.

---

## Implementation Strategy y fecha (research R13)

1. Fases 1 y 2: salvaguardas, cliente, oleadas e índice.
2. US1 (CI y 3.2): **MVP**; el nivel 3 deja de ser provisional.
3. Estándar 1.2 y US2 (visibilidad).
4. US3 (PRs) y US4 (alertas).
5. Cierre: token, 1.2 en los proyectos, validación real y un solo PR.

**Puntos de control de la fecha (2026-11-08)**:

- Si el **2026-10-24** no están terminadas US1, el estándar 1.2 y US2, US4 sale de esta fase y el
  token no lleva el permiso *Secret scanning alerts*.
- Si el **2026-10-31** no está US3, también sale y el token no lleva *Pull requests*.
- Lo que salga vuelve a `specs/backlog.md`.

---

## Notes

- **[MANUAL]**: Claude se detiene, da los pasos exactos y espera la confirmación del Dueño.
- El token nunca pasa por el chat ni por un archivo del repo; Claude no edita `.env.op.local`.
- Nunca se usa el GitHub real ni el portafolio real en pruebas, ni se copian datos reales a los
  fixtures.
