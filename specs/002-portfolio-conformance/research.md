# Research: Lector seguro del portafolio y conformidad con el estándar

**Feature**: `002-portfolio-conformance` · **Fecha**: 2026-09-28

Cada decisión sigue el formato: decisión, razón y alternativas descartadas. No quedan puntos
"NEEDS CLARIFICATION".

## R1. Interpretar YAML (frontmatter y flujos de CI)

- **Decisión**: añadir `yaml` (paquete de npm, v2.x, sin dependencias, licencia ISC) como
  dependencia directa. Se usa `parseDocument` con el esquema `core` de YAML 1.2.
- **Razón**:
  - Con el esquema `core`, las fechas quedan como texto (`2026-09-26`). Así se puede validar el
    formato `AAAA-MM-DD` (1.6) sin que la librería las convierta en fechas.
  - La clave `on:` de los flujos de GitHub sigue siendo texto (en YAML 1.1 se convierte en `true`).
  - El documento conserva los nodos, así que permite detectar lo que 1.5 prohíbe (anclas, alias,
    bloques multilínea `|` y `>`, objetos anidados) y los comentarios (hallazgo bajo).
- **Alternativas**:
  - `js-yaml`: ya está en `node_modules`, pero solo como dependencia de ESLint y shadcn. Usa
    YAML 1.1 por defecto y no expone comentarios ni el tipo de escalar.
  - `gray-matter`: añade `js-yaml` y utilidades innecesarias.
  - Un parser propio: frágil ante YAML válido pero poco común.

## R2. Interpretar Markdown

- **Decisión**: un intérprete propio, mínimo y por líneas, en `src/lib/standard/markdown.ts`.
  Reconoce:
  - encabezados H2 con la expresión del estándar `^## (\d+\.\s+)?X\s*$`, sin distinguir
    mayúsculas;
  - bloques de código delimitados (```` ``` ````), para ignorar lo que haya dentro y detectar
    ```` ```mermaid ````;
  - tablas de tuberías: filas `|…|`, con separador `|---|` y `\|` escapado;
  - casillas de tarea `- [ ]`, `- [x]` y `- [X]`, fuera de bloques de código.
- **Razón**: el estándar define sus verificaciones sobre líneas y tablas simples. Una librería
  completa de Markdown (remark/unified, unas 40 dependencias) no aporta nada que las verificaciones
  necesiten (principio VII).
- **Alternativas**: `remark` + `remark-gfm` (más dependencias y un árbol que habría que recorrer
  igual); expresiones sueltas en cada verificación (duplicación y errores con bloques de código).
- **Notas**:
  - Se aceptan finales de línea CRLF: se normalizan a `\n` al leer.
  - El contenido nunca se muestra como HTML: la interfaz solo presenta texto, que React escapa.

## R3. Lector seguro (principio XIII, FR-002 a FR-009)

- **Decisión**: un único módulo, `src/lib/portfolio/safe-fs.ts`, es la única vía de acceso al
  sistema de archivos del portafolio.
  1. `PROJECTS_ROOT` se resuelve con `realpath` una vez por lectura; debe ser una ruta absoluta y
     un directorio.
  2. Cada petición de lectura recibe una ruta **relativa del catálogo del estándar**
     (`contracts/reader.md`). Cualquier otra ruta se rechaza antes de tocar el disco.
  3. Se resuelve la ruta real (`realpath`), que debe empezar por `rootReal + sep`. Si no, se
     rechaza con "ruta fuera del portafolio".
  4. Se rechaza también si el nombre base, **tanto el pedido como el real**, coincide con la
     lista de secretos: `^\.env`, `\.pem$`, `\.key$`, `^id_(rsa|ed25519|ecdsa|dsa)`, `\.p12$`,
     `\.pfx$`. Así un `PROJECT.md` que enlaza a un `.env` no se lee.
  5. Se abre en solo lectura (`open(path, 'r')`) y se hace `fstat` sobre el descriptor. Debe ser
     un archivo regular de 1 MB como máximo; si no, se reporta "ilegible". La lectura se hace sobre
     el mismo descriptor, lo que evita la carrera entre comprobar y abrir.
  6. Se decodifica con `TextDecoder('utf-8', { fatal: true })`: un archivo que no es UTF-8 válido
     se reporta "ilegible".
  - Los listados de carpeta (`readdir`) solo se hacen en tres lugares: `PROJECTS_ROOT`, `specs/` y
    `.github/workflows/`, con el mismo control de ruta real.
  - La existencia de `.env.example` se comprueba con `lstat`, sin abrirlo (FR-004).
- **Razón**: una sola puerta, con lista permitida y lista de secretos, es fácil de auditar y de
  probar (SC-005).
- **Alternativas**:
  - `O_NOFOLLOW`: solo protege el último componente de la ruta, no carpetas intermedias
    enlazadas, así que `realpath` hace falta igual.
  - Un contenedor o chroot: desproporcionado para un solo usuario local.

## R4. Comandos de git (FR-005, FR-030, FR-031)

- **Decisión**: `src/lib/portfolio/git.ts` ejecuta `git` con `execFile` (sin shell), con
  argumentos fijos, `cwd` = carpeta real del proyecto, tiempo máximo de 5 s y salida máxima de
  10 MB. Todos los comandos llevan un prefijo endurecido:

  ```text
  git -c core.fsmonitor=false -c core.untrackedCache=false -c core.hooksPath=/dev/null --no-optional-locks <comando>
  ```

  El entorno es mínimo: `PATH`, `HOME`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_OPTIONAL_LOCKS=0`,
  `GIT_TERMINAL_PROMPT=0` y `LC_ALL=C`.

  | Para qué | Comando |
  |---|---|
  | ¿Es la raíz de un repositorio? | `rev-parse --show-toplevel` (debe ser igual a la ruta real del proyecto) |
  | Remoto `origin` (1.7) | `remote get-url origin` |
  | Rama actual | `branch --show-current` (vacío = HEAD separado) |
  | Rama principal | `symbolic-ref --quiet --short refs/remotes/origin/HEAD` (si falla, se usa `main`) |
  | Cambios sin commit | `status --porcelain=v1 -z` (salida no vacía = hay cambios, incluidos archivos nuevos) |
  | `.env*` versionados | `ls-files -z`, filtrado en el programa por nombre base `^\.env` salvo `.env.example` |

- **Razón**:
  - El principio XIII permite solo git de solo lectura con argumentos fijos.
  - `core.fsmonitor` es el riesgo real: un `.git/config` puede definir un programa que
    `git status` ejecuta. Se anula por línea de comandos, que tiene prioridad sobre la
    configuración del repo.
  - `--no-optional-locks` evita que `git status` reescriba `.git/index`, así que ni los archivos
    internos del repo cambian (FR-005, SC-007).
  - `rev-parse --show-toplevel` evita que una carpeta sin `.git` se evalúe con el repo de una
    carpeta padre.
  - Solo se leen **nombres** de archivo, nunca contenido (FR-004).
- **Alternativas**:
  - Leer `.git/config` y `.git/HEAD` a mano: frágil con worktrees, `includeIf` y referencias
    empaquetadas.
  - `isomorphic-git`: dependencia grande para seis consultas.
- **Comparación del remoto (1.7)**: se normaliza `https://github.com/org/nombre(.git)`,
  `git@github.com:org/nombre(.git)` y `ssh://git@github.com/org/nombre(.git)` a `org/nombre`, y se
  compara sin distinguir mayúsculas con `repo`. Un remoto de otro host no coincide.

## R5. Versión del estándar (FR-020, FR-026, FR-027)

- **Decisión**:
  - `SUPPORTED_STANDARD_VERSIONS = ["1.0"]` en `src/lib/standard/versions.ts`.
  - La versión vigente de `nexoru-governance` se lee del primer encabezado `## [X.Y.Z]` de su
    `CHANGELOG.md` (formato Keep a Changelog, que el propio estándar usa) y se reduce a `X.Y`.
  - Si esa versión es mayor que la soportada más alta, hay aviso general. Si no existe la carpeta
    o el archivo, hay aviso "no se encontró el estándar".
  - `nexoru-governance` no se evalúa (FR-001). Su lectura usa el mismo lector seguro, con
    `CHANGELOG.md` añadido al catálogo solo para esa carpeta.
- **Razón**: el `CHANGELOG.md` es un archivo del estándar, legible sin git. Las etiquetas de git
  (`v1.0.0`) exigirían otro comando.
- **Alternativas**: `git describe --tags` (otro comando más); leer las reglas en tiempo de
  ejecución desde `standard/*.md`, descartado porque las verificaciones son código probado, no
  texto interpretable.

## R6. Motor de conformidad

- **Decisión**:
  - Funciones puras en `src/lib/standard/v1_0/`, una por grupo (`level1.ts`, `level2.ts`,
    `level3.ts`, `findings.ts`, `manifest.ts`, `roadmap.ts`).
  - Cada verificación devuelve `{ id, level, status: "pass" | "fail" | "not_evaluated", detail }`.
  - Reciben un `ProjectFiles` ya leído (contenido o motivo de ausencia por archivo, más los datos
    de git) y la fecha de evaluación. **No tocan el disco.**
  - El cálculo del nivel (FR-022, FR-023):
    - el nivel es el mayor N tal que todas las verificaciones de los niveles 1..N están en `pass`;
    - si una verificación del nivel N+1 está en `not_evaluated` y las demás de ese nivel pasan, el
      resultado es `N+1` con `provisional: true`;
    - en esta fase eso solo ocurre con 3.2.
- **Razón**: separar la lectura (con efectos) de la evaluación (pura) permite probar cada
  verificación con entradas en memoria, un caso por verificación (SC-003), sin crear archivos.
- **Alternativas**: evaluar mientras se lee (difícil de probar); un motor de reglas declarativo
  (configurabilidad "por si acaso", principio VII).

## R7. Estado derivado del roadmap (FR-017, FR-018)

- **Decisión**:
  - Para cada fila de la tabla `## Roadmap`, se cuentan las casillas de los `tasks.md` de sus
    specs.
  - Si todas las specs tienen `tasks.md`: todas marcadas → `completa`; alguna marcada y alguna
    pendiente → `en-curso`; ninguna marcada → `pendiente`.
  - Si no, se usa `Estado manual`, marcado como manual.
  - Caso borde: 0 casillas en total, con `tasks.md` presentes. El estándar no lo define; se trata
    como `pendiente` (ninguna marcada) y se reporta una advertencia.
- **Razón**: es la regla literal de `standard/roadmap.md`.

## R8. Índice regenerable (FR-010 a FR-014)

- **Decisión**:
  - Una tabla `public.portfolio_snapshots` con **una sola fila vigente**: `read_at`,
    `format_version` y `payload jsonb` con el resultado completo de la lectura (data-model.md).
  - Se escribe solo mediante la función `security definer` `save_portfolio_snapshot(p_payload,
    p_read_at)`, que exige AAL2 y cuenta activa, borra la fila anterior e inserta la nueva en una
    transacción.
  - Se lee con RLS: la política restrictiva AAL2 + `is_active_user()` y una política de `select`
    para el Dueño.
  - Al leer el índice, el `payload` se valida con `zod`. Si no es válido o su `format_version` no
    es el actual, se trata como índice vacío y se vuelve a leer el portafolio (FR-013).
- **Razón**:
  - El índice solo se consulta completo: normalizarlo en tablas añadiría migraciones sin
    beneficio (principio VII).
  - Borrarlo no pierde nada (principio XI, SC-008).
- **Bitácora**: guardar el índice no es una acción sensible sobre la cuenta (supuesto de la spec),
  así que la función no escribe en la bitácora. Es la única mutación sin evento, y se documenta
  como excepción deliberada a la regla de `CLAUDE.md` ("toda mutación sensible").
- **Alternativas**:
  - Sin índice, leer en cada visita: descartado por el Dueño en clarify.
  - Tablas normalizadas por proyecto y verificación: más esquema sin consultas que lo aprovechen.
  - Un archivo local en `.op/`: rompería la regla de que la base guarda el índice (principio XI) y
    no tendría RLS.

## R9. Flujo de lectura y actualización (FR-011 a FR-013)

- **Decisión**:
  - La página `/` (Server Component) carga el índice.
  - Si está vacío, no es válido o tiene más de 10 minutos (`STALE_AFTER_MS = 600_000`), lee el
    portafolio **antes de renderizar**, lo guarda y lo muestra.
  - El botón "Actualizar" es un formulario con la Server Action `refreshPortfolio()`, que lee,
    guarda y hace `revalidatePath("/")`.
  - La lectura procesa los proyectos con una concurrencia de 8 y aísla los errores por proyecto
    (FR-008).
- **Razón**: con pocos proyectos la lectura tarda menos de 1 s, así que una espera en el servidor
  es más simple que una lectura en segundo plano con estados de carga.
- **Rendimiento (SC-006)**: 50 proyectos × (unos 15 archivos + 6 comandos git de unos 10 ms) con
  concurrencia 8 da del orden de 1–2 s, dentro del límite de 10 s. La vista desde el índice es una
  consulta de una fila.
- **Alternativas**: `after()` o una tarea en segundo plano (el Dueño vería datos viejos sin saber
  cuándo cambian); lectura en el navegador (expondría la lógica y exigiría una API).

## R10. Configuración de `PROJECTS_ROOT`

- **Decisión**:
  - `PROJECTS_ROOT` es una variable de solo servidor en `src/lib/env.server.ts`, opcional en el
    esquema. Si falta, no es absoluta o no es un directorio, la página muestra "No está
    configurado `PROJECTS_ROOT`" (caso límite de la spec) en lugar de fallar.
  - Uso: `PROJECTS_ROOT=/home/fili/proyectos` en `.env.op.local`, que edita el Dueño (tarea
    [MANUAL]). No es secreto, pero ese archivo es suyo.
  - `.env.example` documenta el nombre.
  - `op:start` no la exige: sin ella la app funciona y avisa.
- **Pruebas (FR-028)**:
  - `scripts/env-guard.ts` gana `assertTestProjectsRoot(path)`, que acepta solo carpetas bajo el
    directorio temporal del sistema con prefijo `nexoru-op-fixture-`. Playwright y Vitest lo
    llaman antes de leer.
  - Así, una prueba nunca puede apuntar a `/home/fili/proyectos`.

## R11. Portafolio ficticio para pruebas

- **Decisión**:
  - Los proyectos ficticios viven como carpetas normales en `tests/fixtures/portfolio/`, con datos
    inventados (organización `example-org`, sin datos reales).
  - Un script de preparación (`tests/fixtures/build-portfolio.ts`, usado como `globalSetup` de
    Vitest y Playwright) los copia a una carpeta temporal `nexoru-op-fixture-*` y ahí:
    - inicializa los repos git necesarios, con commit, remoto `origin` ficticio y ramas;
    - convierte `env.fixture` en `.env` versionado, para el hallazgo crítico;
    - crea los enlaces simbólicos de escape (hacia fuera de la raíz y hacia un `.env`), una
      tubería FIFO y un archivo de más de 1 MB.
- **Razón**:
  - No se pueden versionar repos git anidados ni archivos `.env` en este repo: el `.gitignore` los
    bloquea y Push protection podría rechazarlos.
  - Los enlaces y las FIFO tampoco se versionan bien.
  - La copia temporal es desechable y nunca es el portafolio real.
- **Alternativas**: submódulos git (reales y externos, descartado); mocks del sistema de archivos
  (no prueban `realpath` ni enlaces reales).

## R12. Interfaz

- **Decisión**:
  - `/` pasa a ser el portafolio: tabla con los datos de FR-015, fecha de lectura, versión del
    estándar, avisos generales, bloque aparte para `nexoru-governance` y botón "Actualizar".
  - `/projects/[folder]` es el detalle: manifiesto, rama y avisos, roadmap y conformidad.
  - Orden: por nombre de carpeta. Así la lista es estable y predecible, y los filtros se dejan
    para después si hacen falta.
  - Componentes shadcn que ya existen: `Table`, `Badge`, `Card` y `Alert`.
- **Seguridad**:
  - El parámetro `[folder]` **nunca** se usa como ruta. Solo se busca en el índice por
    coincidencia exacta; si no está, la respuesta es `notFound()`.
  - Todo se presenta como texto.
- **Texto**: se reemplaza el mensaje de bienvenida de la Fase 1 ("sistema de control para operar,
  automatizar y gobernar"), que ya no describe el producto.

## R13. Costos

| Concepto | USD/mes |
|---|---|
| Paquete `yaml` (npm, ISC) | 0 |
| Supabase local, lectura de archivos y git local | 0 |
| **Total** | **0** |

No hay consultas de red en esta feature.
