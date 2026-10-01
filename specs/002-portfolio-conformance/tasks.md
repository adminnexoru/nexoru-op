---
description: "Lista de tareas de la feature 002-portfolio-conformance"
---

# Tasks: Lector seguro del portafolio y conformidad con el estándar

**Input**: Documentos de diseño en `specs/002-portfolio-conformance/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: obligatorios (principio VI). En cada fase **las pruebas se escriben primero y deben
fallar** antes de implementar. Si una prueba parece incorrecta, se corrige primero la spec o el
contrato; nunca se debilita la prueba.

## Formato: `[ID] [P?] [Story?] [MANUAL?] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes).
- **[US1]**–**[US4]**: historia de usuario de la spec.
- **[MANUAL]**: la hace el Dueño. Claude da los pasos exactos para la terminal integrada de VS Code
  y espera su confirmación.

## Convenciones

- Proyecto Next.js en la raíz: dominio en `src/lib/portfolio/` (efectos: disco y git) y
  `src/lib/standard/` (reglas puras); pantallas en `src/app/(app)/`; componentes en
  `src/components/portfolio/`.
- SQL en `supabase/migrations/` (el archivo se escribe a mano, sin `supabase migration new`, que se
  queda esperando entrada). pgTAP en `supabase/tests/`, Vitest en `tests/unit/`, Playwright en
  `tests/e2e/`.
- **Todo acceso al disco del portafolio pasa por `src/lib/portfolio/safe-fs.ts`** y todo git por
  `src/lib/portfolio/git.ts` (contracts/reader.md). Ningún otro archivo importa `node:fs` ni
  `node:child_process` para leer proyectos.
- Las pruebas usan **solo** el portafolio ficticio temporal (`nexoru-op-fixture-*`), con datos
  inventados (`example-org`, correos `@example.test`), y la instancia de Supabase de pruebas.
- Código, identificadores y commits en inglés; textos de interfaz y documentación en español.
- Commits locales cuando el Dueño los pida; **el push lo autoriza el Dueño tras revisar**.

---

## Phase 1: Setup (infraestructura compartida)

**Propósito**: dependencia nueva, configuración y portafolio ficticio para las pruebas.

- [X] T001 Instalar `yaml` 2.x como dependencia directa (`npm install yaml`) y comprobar que no añade dependencias transitivas ni scripts de instalación (`npm ls yaml`, `package.json` y `package-lock.json`)
- [X] T002 [P] Añadir `PROJECTS_ROOT` **opcional** al esquema de `src/lib/env.server.ts` (`z.string().optional()`; la validación de ruta absoluta y directorio va en el lector) y documentarlo en `.env.example` ("Carpeta del portafolio. Uso: /home/fili/proyectos. Las pruebas la generan solas; no la pongas en .env.local")
- [X] T003 [P] Crear el portafolio ficticio en `tests/fixtures/portfolio/` (todo inventado, organización `example-org`, sin nombres reales), una carpeta por caso:
  - `level3-demo`: cumple niveles 1–3 salvo 3.2 → nivel 3 provisional; su `spec.md` contiene la frase ficticia `TEXTO-DE-SPEC-FICTICIO`;
  - `no-manifest`: sin `PROJECT.md`;
  - `bad-yaml`: frontmatter que no se puede interpretar;
  - `confirmar`: nivel 0 por 1.11;
  - `map-state-column`: nivel 1 por 2.6;
  - `spec-no-tasks`: advertencia;
  - `unsupported-version`: `version_estandar: "2.0"`;
  - `no-version`: sin `version_estandar`;
  - `roadmap-states`: fases con 12/12, 10/12 y 0/5 tareas, una con `Specs` = `—` y `pendiente`, y una derivada con `Estado manual` lleno;
  - `duplicate-id-a` y `duplicate-id-b`: mismo `id`;
  - `no-git`: no será repo;
  - `no-origin`: repo sin remoto;
  - `feature-branch`: repo en otra rama y con cambios sin commit;
  - `env-versioned`: incluye `env.fixture`, que se versionará como `.env`;
  - `symlink-escape`: su `PROJECT.md` será un enlace fuera de la raíz;
  - `secret-link`: su `CLAUDE.md` será un enlace a un `.env`;
  - `fifo-and-large`: `tasks.md` será una FIFO y `docs/mapa-funcional.md` pesará más de 1 MB;
  - `nexoru-governance`: solo `CHANGELOG.md` con `## [1.0.0] - 2026-09-28`.

  Añadir `tests/fixtures/portfolio/README.md` con la tabla carpeta → caso → resultado esperado (nivel, fallas, advertencias, hallazgos)
- [X] T004 Crear `tests/fixtures/build-portfolio.ts`: exporta `buildFixturePortfolio(): Promise<string>`.
  - Copia `tests/fixtures/portfolio/` a `mkdtemp(join(tmpdir(), "nexoru-op-fixture-"))`.
  - En las carpetas que lo requieren (T003), hace `git init -b main` y commit con `-c user.name=Fixture -c user.email=fixture@example.test`, añade `origin` `https://github.com/example-org/<carpeta>.git` (salvo `no-origin`) y fija `refs/remotes/origin/HEAD` → `origin/main` con `git symbolic-ref` sobre una referencia creada con `git update-ref` (sin red).
  - En `env-versioned` renombra `env.fixture` → `.env` y lo versiona.
  - En `feature-branch` crea la rama `feature/x` y deja un archivo modificado.
  - Crea con `fs.symlink` los enlaces de `symlink-escape` (hacia `<tmp>/outside/PROJECT.md`, fuera de la raíz) y `secret-link` (hacia un `.env` de la misma carpeta); con `mkfifo` la FIFO; y el archivo de más de 1 MB.
  - Exporta también `removeFixturePortfolio(path)`.
  - Depende de T003.
- [X] T005 Conectar el portafolio ficticio a los ejecutores de pruebas:
  - **Vitest**: `tests/unit/global-setup.ts` construye el portafolio una vez, lo expone como `process.env.PROJECTS_ROOT` y lo borra al terminar; se registra en `vitest.config.ts` (`globalSetup`).
  - **Playwright** (`playwright.config.ts`): si `process.env.PROJECTS_ROOT` no está definido, construye el portafolio al cargar la configuración (con `execFileSync` de `tsx`, porque la configuración es síncrona) y lo guarda en `process.env.PROJECTS_ROOT`, para que los workers lo hereden sin reconstruirlo. Lo pasa en `webServer.env` y fija `reuseExistingServer: false`, para que un `npm run dev` abierto con otra raíz nunca se use en las E2E. Un `globalTeardown` (`tests/e2e/global-teardown.ts`) borra la carpeta temporal con `removeFixturePortfolio` al terminar.
  - Depende de T004.

**Checkpoint**: `npm test` sigue en verde y el portafolio ficticio se genera y se borra.

---

## Phase 2: Foundational (prerrequisitos que bloquean todas las historias)

**Propósito**: salvaguarda de pruebas, lector seguro, git, intérpretes, motor de conformidad v1.0
e índice. Ninguna historia empieza sin esta fase.

### Pruebas primero (deben fallar)

- [X] T006 [P] Pruebas de `assertTestProjectsRoot` en `tests/unit/env-guard.test.ts`: acepta solo rutas absolutas bajo `os.tmpdir()` cuyo último componente empiece con `nexoru-op-fixture-`; rechaza `/home/fili/proyectos`, rutas relativas, rutas con `..` que salgan de `tmpdir` y `undefined`, con mensaje en español
- [X] T007 [P] Pruebas del lector seguro en `tests/unit/portfolio/safe-fs.test.ts`, contra el portafolio ficticio (SC-005):
  - una ruta fuera del catálogo se rechaza sin tocar el disco (espía sobre `fs`);
  - `../otro/PROJECT.md` → `outside_root`;
  - enlace de `symlink-escape` → `outside_root`;
  - enlace de `secret-link` → `secret_file`;
  - pedir `.env`, `x.pem`, `id_ed25519` → `secret_file` sin abrir;
  - FIFO → `not_regular_file` sin bloquearse (tiempo máximo de la prueba: 2 s);
  - más de 1 MB → `too_large`;
  - bytes no UTF-8 → `invalid_utf8`;
  - CRLF normalizado;
  - `.env.example` se comprueba con `lstat` y nunca con `open` (espía);
  - listar `specs/` ignora entradas que no coinciden con `^\d{3}-[a-z0-9-]+$`.
- [X] T008 [P] Pruebas de git en `tests/unit/portfolio/git.test.ts`, contra repos del portafolio ficticio:
  - `no-git` → `isRepo=false`, aunque esté dentro de otra carpeta con repo;
  - `no-origin` → `originRepo=null` y `mainBranch="main"` (sin `origin/HEAD`, se usa `main`);
  - `feature-branch` → rama `feature/x`, `onMainBranch=false`, `hasUncommittedChanges=true`;
  - `env-versioned` → `.env` listado y `.env.example` excluido;
  - normalización de remotos https, `git@` y `ssh://` a `org/nombre`;
  - un repo con `core.fsmonitor` configurado a un script que crea un archivo testigo: tras leer, **el testigo no existe**;
  - tras todas las lecturas, `mtime` y hash de `.git/index` sin cambios.
- [X] T009 [P] Pruebas del intérprete de Markdown en `tests/unit/standard/markdown.test.ts`:
  - H2 con y sin numeración, sin distinguir mayúsculas;
  - H2 dentro de bloque de código ignorado;
  - tablas con `\|` escapado y separadores `|---|`;
  - detección de ```` ```mermaid ````;
  - casillas `- [ ]`, `- [x]`, `- [X]` fuera de bloques de código;
  - texto de una sección hasta el siguiente H2.
- [X] T010 [P] Pruebas del frontmatter en `tests/unit/standard/frontmatter.test.ts`:
  - fechas quedan como texto;
  - detecta objetos anidados, listas de objetos, anclas, alias y escalares `|`/`>` (1.5);
  - detecta comentarios YAML (hallazgo bajo);
  - YAML inválido devuelve error con línea;
  - archivo sin `---` inicial.
- [X] T011 [P] Pruebas de verificaciones de nivel 1 en `tests/unit/standard/level1.test.ts`: **un caso que pasa y uno que falla por cada verificación 1.1–1.11**, incluidas todas las validaciones cruzadas de 1.7 (`fase_desde` futura, `fecha_objetivo` < `fecha_inicio`, `urls` vacía con `nexoru-subdominio`, `repo` ≠ origin, "no es repositorio git", "sin remoto `origin`", Total ≠ `costo_mensual_usd`, mapa inexistente), `fecha_objetivo` opcional en `operacion`/`pausado`, y `—` como 0 en la tabla de costos (contracts/conformance.md)
- [X] T012 [P] Pruebas de nivel 2 en `tests/unit/standard/level2.test.ts`: un caso que pasa y uno que falla por cada verificación 2.1–2.10, y las advertencias (spec sin `plan.md`, sin `tasks.md`, `tasks.md` sin casillas)
- [X] T013 [P] Pruebas del roadmap y del nivel 3 en `tests/unit/standard/level3.test.ts` y `tests/unit/standard/roadmap.test.ts`:
  - estado derivado `completa` / `en-curso` / `pendiente` con conteos, y solo si todas las specs de la fase tienen `tasks.md`;
  - `shownState`;
  - un caso que pasa y uno que falla por 3.1 (`on` como texto, lista y mapa) y 3.3–3.8;
  - 3.2 siempre `not_evaluated` con el motivo "Se evaluará con GitHub en la Fase 4".
- [X] T014 [P] Pruebas del nivel y los hallazgos en `tests/unit/standard/evaluate.test.ts`:
  - nivel acumulativo (falla en 1 ⇒ 0 aunque pase 2);
  - todo lo evaluable del nivel 3 en verde ⇒ `level 3` y `provisional=true`;
  - `failures` = fallidas del nivel siguiente;
  - hallazgos `env_versioned` (crítico, solo nombres), `env_example_missing` (medio) y `yaml_comments` (bajo);
  - `secret_history`, `repo_visibility` y `env_example_coverage` en `not_evaluated`;
  - en carpeta sin repo, `env_versioned` en `not_evaluated`;
  - ningún `detail` contiene texto de archivos `.env*`.
- [X] T015 [P] pgTAP en `supabase/tests/20_portfolio_snapshots.test.sql`:
  - RLS activada;
  - `authenticated` sin `insert`/`update`/`delete` directos;
  - `select` solo con AAL2, cuenta activa y rol `owner`;
  - `save_portfolio_snapshot` rechaza AAL1, cuenta inactiva, no dueño, `p_payload` que no es objeto y `p_read_at` más de 1 minuto en el futuro;
  - dos llamadas seguidas dejan exactamente una fila (la última);
  - `revoke` de `public` y `anon` sobre la función;
  - la función es `security definer` con `search_path` vacío.

### Implementación

- [X] T016 Implementar `assertTestProjectsRoot` en `scripts/env-guard.ts` (T006) y llamarlo en `tests/unit/global-setup.ts` y `playwright.config.ts` antes de exponer la ruta
- [X] T017 [P] Definir los tipos y esquemas `zod` del resultado de lectura en `src/lib/portfolio/types.ts`, exactamente como `data-model.md` §2: `PortfolioReading`, `StandardInfo`, `ProjectReading`, `GitInfo`, `Manifest`, `RoadmapPhase`, `RoadmapState` ("completa" | "implementada-sin-validar" | "en-curso" | "bloqueada" | "pendiente"), `ConformanceResult`, `Check` (status "pass" | "fail" | "not_evaluated"), `Finding` (severity "critical" | "high" | "medium" | "low") y `Problem` (reason "missing" | "outside_root" | "secret_file" | "too_large" | "not_regular_file" | "invalid_utf8" | "invalid_yaml" | "git_error" | "unreadable"). Incluye `FORMAT_VERSION = 1`
- [X] T018 Implementar `src/lib/portfolio/safe-fs.ts` según contracts/reader.md: catálogo cerrado de rutas, `realpath` dentro de `realpath(root) + sep`, lista de nombres de secretos sobre el nombre pedido y el real, `open(…, "r")` + `fstat` (archivo regular, hasta 1 048 576 bytes) + lectura del mismo descriptor, `TextDecoder("utf-8", { fatal: true })`, CRLF→LF, `lstat` para existencias y `readdir` solo en la raíz, `specs/` y `.github/workflows/`. Devuelve `{ ok: true, text } | { ok: false, problem }` (T007)
- [X] T019 Implementar `src/lib/portfolio/git.ts` según contracts/reader.md: `execFile("git", [...PREFIX, ...args])` sin shell, `cwd` real, 5 s, `maxBuffer` 10 MB, entorno mínimo (`PATH`, `HOME`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_OPTIONAL_LOCKS=0`, `GIT_TERMINAL_PROMPT=0`, `LC_ALL=C`), los 6 comandos fijos y `normalizeGithubRemote()`. Devuelve `GitInfo` y la lista de `.env*` versionados; los errores dan datos ausentes con `git_error` (T008)
- [X] T020 [P] Implementar `src/lib/standard/markdown.ts`: `h2Sections`, `sectionText`, `tables` (encabezado, filas, celdas con `\|`), `hasMermaidBlock`, `taskCheckboxes` (hechas / total), ignorando bloques de código (T009)
- [X] T021 [P] Implementar `src/lib/standard/frontmatter.ts` con `yaml` (`parseDocument`, esquema `core`): extraer el bloque entre `---`, devolver valores planos, violaciones de 1.5 con el campo, presencia de comentarios y error con línea (T010)
- [X] T022 [P] Implementar `src/lib/standard/versions.ts`: `SUPPORTED_STANDARD_VERSIONS = ["1.0"]`, `parseChangelogVersion(text)` (primer `## [X.Y.Z]` → `"X.Y"`) y `isNewerThanSupported(version)`
- [X] T023 Implementar `src/lib/standard/v1_0/manifest.ts` (campos, tipos, enumerados y formatos de `project-manifest.md`; ausente o de tipo incorrecto ⇒ `null`) y `src/lib/standard/v1_0/level1.ts` (1.1–1.11, incluida 1.7 con FR-031) sobre un `ProjectFiles` en memoria y una fecha de evaluación (T011)
- [X] T024 Implementar `src/lib/standard/v1_0/level2.ts` (2.1–2.10 y advertencias) (T012)
- [X] T025 Implementar `src/lib/standard/v1_0/roadmap.ts` (tabla, `specs`, `targetDate`, `manualState`, `derived` con conteos y `shownState`) y `src/lib/standard/v1_0/level3.ts` (3.1, 3.2 `not_evaluated`, 3.3–3.8) (T013)
- [X] T026 Implementar `src/lib/standard/v1_0/findings.ts` y `src/lib/standard/v1_0/evaluate.ts`: todas las verificaciones, el nivel acumulativo con `provisional`, `failures`, `warnings` y `findings` (contracts/conformance.md, "Cálculo del nivel") (T014)
- [X] T027 Migración `supabase/migrations/20261001000000_portfolio_snapshots.sql` según data-model §1:
  - tabla `public.portfolio_snapshots` (`id uuid pk default gen_random_uuid()`, `read_at timestamptz not null`, `format_version smallint not null`, `payload jsonb not null`, `created_by uuid not null references auth.users(id)`);
  - RLS activada, política restrictiva `portfolio_snapshots_require_aal2_active` y política `portfolio_snapshots_select` (`current_user_role() = 'owner'`);
  - `revoke insert, update, delete` a `authenticated` y `anon`;
  - función `public.save_portfolio_snapshot(p_payload jsonb, p_read_at timestamptz) returns void`: `security definer`, `set search_path = ''`; exige AAL2, `is_active_user()` y rol `owner`, `jsonb_typeof(p_payload) = 'object'` y `p_read_at <= now() + interval '1 minute'`; borra e inserta con `format_version = 1` y `created_by = auth.uid()`;
  - `revoke all … from public, anon` y `grant execute … to authenticated`.

  Después, `npx supabase db reset` en pruebas y `npm run db:test` en verde (T015)
- [X] T028 Ejecutar `npm test`, `npm run db:test`, `npm run lint` y `npm run typecheck` hasta verde

**Checkpoint**: lector, git y motor de conformidad probados con entradas reales y en memoria.

---

## Phase 3: User Story 1 — Ver el portafolio completo (Priority: P1) 🎯 MVP

**Goal**: el Dueño ve todos los proyectos con los datos de su `PROJECT.md`, nivel y rama, más el
estándar aparte, desde un índice que se relee al vencer o con Actualizar.

**Independent Test**: con el portafolio ficticio, iniciar sesión y comprobar filas, datos
ausentes, bloque del estándar, Actualizar y vencimiento a los 10 minutos.

### Pruebas de US1 (escribir primero, deben fallar)

- [ ] T029 [P] [US1] Pruebas de la lectura completa en `tests/unit/portfolio/read-portfolio.test.ts`, contra el portafolio ficticio:
  - un `ProjectReading` por carpeta no oculta, sin `nexoru-governance`, ordenados por `folder`;
  - `standard` con `found=true` y `version "1.0"`;
  - `no-manifest` con `manifest=null` y nivel 0;
  - `bad-yaml` con `invalid_yaml`;
  - aviso de `id` duplicado;
  - rama y avisos de `feature-branch`;
  - un proyecto con error no interrumpe los demás;
  - una carpeta borrada entre dos lecturas ya no aparece en la segunda;
  - `root.status` = `missing` / `not_absolute` / `not_directory`;
  - **SC-007**: hash y `mtime` de todos los archivos del portafolio ficticio (incluido `.git/`) idénticos antes y después;
  - **SC-008**: dos lecturas seguidas dan el mismo resultado salvo `readAt`;
  - **SC-006**: 50 copias del proyecto `level3-demo` se leen en menos de 10 s.
- [ ] T030 [P] [US1] Pruebas del índice en `tests/unit/portfolio/snapshot.test.ts`: `isStale` (más de 600 000 ms), un `payload` inválido o con `format_version ≠ 1` se trata como vacío, y el esquema acepta el resultado de `readPortfolio` del portafolio ficticio
- [ ] T031 [P] [US1] E2E en `tests/e2e/us1-portfolio.spec.ts` (sesión del Dueño con los helpers de `tests/e2e/helpers/owner.ts`):
  - la tabla muestra cada proyecto ficticio con nombre, tipo, cliente, fase, estado, fecha objetivo, siguiente hito, nivel y rama;
  - `no-manifest` muestra nivel 0, "sin PROJECT.md" y "—";
  - el bloque "Estándar" muestra `nexoru-governance` 1.0 sin nivel;
  - `feature-branch` muestra el aviso de rama y el de cambios;
  - tras cambiar `siguiente_hito` de `level3-demo` en la carpeta temporal y pulsar **Actualizar**, se ve el nuevo valor y la hora cambia;
  - con `read_at` retrasado 11 minutos (helper en `tests/e2e/helpers/db.ts` con el cliente admin de pruebas), abrir `/` produce una lectura nueva;
  - sin sesión, `/` redirige a `/login`.

### Implementación de US1

- [ ] T032 [US1] Implementar `src/lib/portfolio/read-project.ts`: arma el `ProjectFiles` de una carpeta con `safe-fs` y `git` (solo rutas del catálogo) y devuelve el `ProjectReading` (manifiesto, roadmap, `evaluate`, `readErrors` con rutas relativas)
- [ ] T033 [US1] Implementar `src/lib/portfolio/read-portfolio.ts`:
  - valida `PROJECTS_ROOT` (absoluta y directorio);
  - lista las carpetas no ocultas y separa `nexoru-governance` (lee su `CHANGELOG.md` con `parseChangelogVersion`);
  - lee los proyectos con concurrencia 8 y un `try/catch` por proyecto;
  - detecta `id` duplicados;
  - ordena por `folder` (T029).
- [ ] T034 [US1] Implementar `src/lib/portfolio/snapshot.ts` (`import "server-only"`): `loadSnapshot()` con el cliente del usuario (RLS) y validación `zod`; `saveSnapshot(reading)` con `rpc("save_portfolio_snapshot")`; `isStale(readAt, now)` con `STALE_AFTER_MS = 600_000`; y `getPortfolio()`, que lee y guarda si el índice está vacío, es inválido o está vencido (T030)
- [ ] T035 [US1] Implementar la Server Action `refreshPortfolio()` en `src/lib/portfolio/actions.ts`: sin parámetros; comprueba AAL2 como las actions de `src/lib/auth/actions.ts`; lee, guarda y `revalidatePath("/")`; ante un error, mensaje genérico en español y detalle solo en el log del servidor, sin contenido de archivos (FR-029)
- [ ] T036 [P] [US1] Componentes en `src/components/portfolio/`:
  - `level-badge.tsx`: `0`–`3`, `3 (provisional)`, "versión no soportada (X.Y)", "sin versión";
  - `branch-badge.tsx`;
  - `absent.tsx`: "—" con texto accesible "ausente";
  - `refresh-button.tsx`: cliente, con `useFormStatus`, "Leyendo…" y deshabilitado mientras corre;
  - `portfolio-table.tsx`: shadcn `Table`, columnas de contracts/ui.md.

  Solo texto; nunca `dangerouslySetInnerHTML`
- [ ] T037 [US1] Reemplazar `src/app/(app)/page.tsx` por el portafolio (contracts/ui.md, `GET /`): llama a `getPortfolio()`, muestra la última lectura en hora local, las versiones, los avisos generales, la tabla, el bloque "Estándar" y el estado vacío según `root.status`. En `src/app/(app)/layout.tsx`, cambiar "Inicio" por "Portafolio"
- [ ] T038 [US1] Ejecutar `npm test`, `npm run db:test` (tras `npx supabase db reset`) y `npm run test:e2e` hasta verde

**Checkpoint**: US1 funciona sola; es el MVP.

---

## Phase 4: User Story 2 — Conformidad de un proyecto y sus brechas (Priority: P1)

**Goal**: desde el portafolio, el detalle muestra el nivel, las fallas del siguiente nivel, las
advertencias, los hallazgos y las verificaciones no evaluadas.

**Independent Test**: abrir el detalle de `confirmar`, `map-state-column`, `spec-no-tasks`,
`env-versioned` y `level3-demo` y comparar con la tabla de `tests/fixtures/portfolio/README.md`.

### Pruebas de US2 (escribir primero, deben fallar)

- [ ] T039 [P] [US2] E2E en `tests/e2e/us2-conformance.spec.ts`:
  - `confirmar`: nivel 0 y falla 1.11 con su línea;
  - `map-state-column`: nivel 1 y falla 2.6;
  - `spec-no-tasks`: advertencia, no falla;
  - `env-versioned`: hallazgo crítico que nombra `.env` y no muestra su contenido (la cadena ficticia de `env.fixture` no aparece en la página);
  - `level3-demo`: "3 (provisional)" y 3.2 "no evaluada en esta fase", y la frase `TEXTO-DE-SPEC-FICTICIO` no aparece en la página (FR-019);
  - `/projects/no-existe` y `/projects/..%2F..%2Fetc` → 404;
  - enlace desde la fila del portafolio al detalle.

### Implementación de US2

- [ ] T040 [US2] Crear `src/app/(app)/projects/[folder]/page.tsx`: busca `folder` por igualdad exacta en el índice (`getPortfolio()`), sin usarlo nunca como ruta, y si no está responde `notFound()`. Muestra las secciones Manifiesto, Repositorio, Conformidad y Errores de lectura de contracts/ui.md
- [ ] T041 [P] [US2] Componentes `src/components/portfolio/manifest-card.tsx`, `repository-card.tsx`, `conformance-panel.tsx` (nivel, fallas con número y detalle, advertencias, hallazgos con severidad, no evaluadas con motivo, y lista plegable de todas las verificaciones) y `read-errors.tsx`. Enlazar el nombre de cada fila de `portfolio-table.tsx` a `/projects/<folder>`
- [ ] T042 [US2] Ejecutar `npm test` y `npm run test:e2e` hasta verde

**Checkpoint**: US1 y US2 funcionan juntas y por separado.

---

## Phase 5: User Story 3 — Roadmap con estado derivado (Priority: P2)

**Goal**: el detalle muestra el roadmap con el estado derivado (y su conteo) o el manual, marcado.

**Independent Test**: el detalle de `roadmap-states` muestra `completa (12/12)`,
`en-curso (10/12)`, `pendiente (0/5)`, `pendiente` manual y la falla 3.6.

- [ ] T043 [P] [US3] E2E en `tests/e2e/us3-roadmap.spec.ts`: las fases de `roadmap-states` con sus estados, conteos y distintivos "derivado" o "manual"; la falla 3.6 en la conformidad; y `no-manifest` con el roadmap como ausente
- [ ] T044 [US3] Crear `src/components/portfolio/roadmap-table.tsx` (Fase, Objetivo, Specs, Fecha objetivo y Estado con distintivo "derivado (hechas/total)" o "manual") y añadirlo al detalle en `src/app/(app)/projects/[folder]/page.tsx`
- [ ] T045 [US3] Ejecutar `npm run test:e2e` hasta verde

---

## Phase 6: User Story 4 — Versión del estándar (Priority: P2)

**Goal**: los proyectos con versión no soportada o sin versión no se evalúan con otras reglas, y
el dashboard avisa si el estándar local es más nuevo o no se encuentra.

**Independent Test**: `unsupported-version` muestra "versión no soportada (2.0)"; con el
`CHANGELOG.md` ficticio en `## [1.1.0]` aparece el aviso general; sin `nexoru-governance`, el aviso
"no se encontró el estándar".

- [ ] T046 [P] [US4] Pruebas en `tests/unit/standard/evaluate.test.ts` y `tests/unit/portfolio/read-portfolio.test.ts`:
  - `version_estandar: "2.0"` ⇒ `evaluation="unsupported_version"`, `level=null`, `checks=[]` y manifiesto presente;
  - sin `version_estandar` ⇒ `"no_version"`;
  - sin `PROJECT.md` o con YAML inválido ⇒ se evalúa con 1.0 y queda en nivel 0 (contracts/conformance.md, "Versiones");
  - `CHANGELOG.md` con `## [1.1.0]` ⇒ `newerThanSupported=true`;
  - sin carpeta `nexoru-governance` ⇒ `found=false`.

  Para los dos últimos, crear copias del portafolio ficticio con esas variantes.
- [ ] T047 [P] [US4] E2E en `tests/e2e/us4-standard-version.spec.ts`: la fila de `unsupported-version` y la de `no-version` con sus etiquetas; el portafolio muestra las versiones soportadas y la encontrada
- [ ] T048 [US4] Aplicar en `src/lib/standard/v1_0/evaluate.ts` (o en un despachador `src/lib/standard/evaluate.ts` por versión) la regla de versiones de contracts/conformance.md, y mostrar en `src/app/(app)/page.tsx` los avisos de estándar más nuevo o no encontrado
- [ ] T049 [US4] Ejecutar `npm test` y `npm run test:e2e` hasta verde

---

## Phase 7: Cierre de la feature

- [ ] T050 [P] Actualizar `CLAUDE.md` (estructura: `src/lib/portfolio`, `src/lib/standard`, `tests/fixtures`; regla "todo acceso al portafolio pasa por `safe-fs.ts` y `git.ts`"; `PROJECTS_ROOT`) y `README.md` (qué muestra el dashboard y cómo configurar `PROJECTS_ROOT`)
- [ ] T051 Revisión de seguridad:
  - `grep -rn "node:fs\|node:child_process\|from \"fs\"\|child_process" src/` solo encuentra `src/lib/portfolio/safe-fs.ts` y `src/lib/portfolio/git.ts`;
  - ningún componente cliente importa `src/lib/portfolio/*` salvo la action;
  - ninguna llamada a `exec`/`spawn` con `shell: true`;
  - sin `dangerouslySetInnerHTML`;
  - FR-019: el detalle no muestra contenido de specs, planes ni constituciones, solo conteos y existencia (revisión de `src/components/portfolio/` y de la página del proyecto en `tests/e2e/us2-conformance.spec.ts`: el texto ficticio de un `spec.md` no aparece);
  - `git ls-files | grep -i env` solo devuelve `.env.example` (`env.fixture` no coincide);
  - sin `fetch` nuevo (principio XII);
  - toda tabla con RLS (`supabase/tests/00_rls_enabled.test.sql` cubre la nueva);
  - `ss -ltn` sin puertos del proyecto en `0.0.0.0`.
- [ ] T052 [MANUAL] Entorno de uso: el Dueño añade `PROJECTS_ROOT=/home/fili/proyectos` a `.env.op.local` y reinicia con `npm run op:stop` y `npm run op:start` (quickstart Parte 1 §2); Claude confirma después con `npx supabase migration list --workdir ops --local` que la migración del índice quedó aplicada
- [ ] T053 [MANUAL] Validación en el entorno de uso: el Dueño recorre los escenarios 1–13 de `specs/002-portfolio-conformance/quickstart.md` (Parte 2), con Claude dando los comandos de la huella (escenarios 9 y 10), y confirma los resultados; Claude los anota como evidencia
- [ ] T054 Al cerrar la fase:
  - actualizar `PROJECT.md`: roadmap (Fase 2 derivada y `Estado manual` vacío), decisiones clave (`yaml`, índice `jsonb`, git endurecido), riesgos, pendientes, evidencia de validación y siguiente hito (Fase 3);
  - actualizar `docs/mapa-funcional.md`: componentes Lector del portafolio, Evaluador de conformidad e Índice ya construidos, flujo y datos;
  - actualizar la fila de Nexoru Op en `/home/fili/proyectos/CLAUDE.md`.
- [ ] T055 Con la autorización de push del Dueño: push de `002-portfolio-conformance` y PR hacia `main` con `gh pr create` y descripción en español (resumen, pruebas y tareas [MANUAL]); esperar la CI en verde
- [ ] T056 [MANUAL] Revisar y hacer merge del PR con "Create a merge commit"; Claude confirma con `gh` la CI de `main`

---

## Dependencies & Execution Order

- **Fase 1 (Setup)**: T001–T002 en paralelo con T003; T004 depende de T003; T005 de T004.
- **Fase 2 (Foundational)**: depende de la Fase 1. Las pruebas T006–T015 van primero, en paralelo.
  - T018 y T019 dependen de T017.
  - T023–T026 dependen de T020–T022; T026 depende de T023–T025.
  - T027 es independiente del código TypeScript.
- **US1 (Fase 3)**: depende de la Fase 2. Es el MVP.
- **US2 (Fase 4)**: depende de US1 (usa el índice y la tabla para enlazar al detalle).
- **US3 (Fase 5)**: depende de US2 (añade una sección al detalle).
- **US4 (Fase 6)**: depende de la Fase 2 y de US1 (avisos en `/`); puede hacerse en paralelo con
  US2 y US3.
- **Cierre (Fase 7)**: depende de todas. T052 antes de T053; T055 requiere la autorización del
  Dueño; T056 lo hace el Dueño.

### Dentro de cada fase

1. Pruebas escritas y **fallando**.
2. Migraciones SQL.
3. Código.
4. Tarea final "ejecutar hasta verde".

### Paralelismo

- Fase 2: T006–T015 (pruebas en archivos distintos) a la vez; después, T020, T021 y T022 a la
  vez, y T018/T019 en paralelo con ellos una vez hecho T017.
- US1: T029, T030 y T031 a la vez; T036 en paralelo con T032–T035.
- US2–US4: las pruebas de cada historia ([P]) a la vez; US4 en paralelo con US2/US3.

---

## Implementation Strategy

1. Fases 1–2: base probada (lector seguro, git sin efectos, motor v1.0, índice).
2. US1 → **MVP**: el Dueño ya ve su portafolio con niveles. Punto de parada para revisión.
3. US2 → brechas de cada proyecto (lo que se usa para decidir qué migrar).
4. US3 y US4 → roadmap y versiones.
5. Cierre → validación en el entorno de uso, documentación y un solo PR hacia `main`.

---

## Notes

- **[MANUAL]**: Claude se detiene, da los pasos exactos y espera la confirmación del Dueño.
- `PROJECTS_ROOT` no es secreto, pero `.env.op.local` es del Dueño: Claude no lo edita.
- Nunca se usa el portafolio real en pruebas ni se copian datos de proyectos reales a los
  fixtures.
