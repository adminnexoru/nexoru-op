# Research: Datos de GitHub en solo lectura

**Feature**: `004-github-readonly` | **Fecha**: 2026-10-03 | **Spec**: [spec.md](spec.md)

Cada sección registra una decisión, su razón y las alternativas descartadas. Los datos de GitHub se
verificaron el 2026-10-03 contra la documentación oficial (enlaces en cada sección) y, en solo
lectura, contra la API con `gh api`.

## R1. Permisos mínimos del token y acceso a repositorios

**Hecho verificado**: `adminnexoru` es una **cuenta de usuario** (`gh api users/adminnexoru` →
`User`), no una organización. El token fine-grained se crea con *Resource owner* `adminnexoru` y no
necesita aprobación de una organización.

**Decisión: permisos de repositorio, todos de solo lectura (Read-only)**

| Permiso fine-grained | Historia | Endpoints que lo usan | Razón |
|---|---|---|---|
| **Metadata** (obligatorio; GitHub lo añade solo) | US1, US2 | `GET /repos/{o}/{r}` | Visibilidad y rama predeterminada |
| **Actions** | US1, US3 | `GET /repos/{o}/{r}/actions/runs` | Ejecuciones de CI en la rama principal (US1) y de cada PR por `head_sha` (US3) |
| **Pull requests** | US3 | `GET /repos/{o}/{r}/pulls` | PRs abiertos |
| **Secret scanning alerts** | US4 | `GET /repos/{o}/{r}/secret-scanning/alerts` | Alertas abiertas |

Sin permisos de cuenta (*Account permissions*) y sin **Contents**, **Checks** ni **Commit
statuses**: la CI de cada PR se obtiene de las ejecuciones de Actions de su commit, que ya cubre el
permiso Actions. El precio es que una comprobación externa a GitHub Actions no se ve; hoy ningún
repo del portafolio la usa.

Fuente: [Permissions required for fine-grained personal access
tokens](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)
(Metadata, Actions, Pull requests y Secret scanning alerts, todos *read* para estos endpoints).

**Sacrificio por historias**: si se sacrifica US4 no se pide *Secret scanning alerts*; si se
sacrifica US3 no se pide *Pull requests*. US1 y US2 solo necesitan Metadata y Actions.

**Decisión: acceso a "Only select repositories"** con los repos del portafolio (hoy 6).

| | Todos los repositorios | Solo los seleccionados (recomendado) |
|---|---|---|
| Alcance si el token se filtra | Todos los repos de la cuenta, incluidos los futuros | Solo los listados |
| Alertas de secretos | Puede leer las alertas de todos los repos | Solo de los listados |
| Proyecto nuevo | Aparece solo | Hay que editar el token; mientras tanto el dashboard dice "no disponible: el token no tiene acceso al repo" |
| Mantenimiento | Ninguno | Editar el token al crear un repo (pocas veces al año) |

Se recomienda **solo los seleccionados** (principio I, seguridad primero): el token vive en un
archivo local y, con el permiso de alertas de secretos, un token filtrado con acceso a todo daría
más de lo necesario. El costo de mantenimiento es bajo y el dashboard lo hace visible.

**Alternativas descartadas**: token clásico (sus *scopes* `repo` y `security_events` dan escritura);
GitHub App (más configuración sin beneficio para un solo usuario local); el token de `gh` (OAuth,
con escritura).

## R2. Fecha de vencimiento del token

**Decisión**: leer la cabecera `GitHub-Authentication-Token-Expiration` de las respuestas (GitHub
la envía con los tokens personales que vencen; formato `AAAA-MM-DD HH:MM:SS UTC`). El dashboard
muestra "El token de GitHub vence el AAAA-MM-DD"; con 14 días o menos, un aviso visible en el
portafolio. Sin la cabecera: "sin fecha de vencimiento informada". Se recomienda vencimiento de 90
días.

Fuente: [Managing your personal access
tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
y el [changelog de expiración de tokens](https://github.blog/changelog/2021-07-26-expiration-options-for-personal-access-tokens/).

**Alternativa descartada**: pedir la fecha al Dueño en una variable (captura manual, principio XI).

## R3. Consultas por proyecto

**Decisión**: por proyecto con remoto `origin` en `github.com`, en este orden:

| # | Consulta | Para | Notas |
|---|---|---|---|
| 1 | `GET /repos/{o}/{r}` | Visibilidad, rama predeterminada, archivado | `public` = `publico`; `private` e `internal` = `privado` |
| 2 | `GET /repos/{o}/{r}/actions/runs?branch={rama}&per_page=50&exclude_pull_requests=true` | CI de la rama principal (US1, 3.2) | De las 50 más recientes salen la última de cada workflow por `path` y la última de cualquiera |
| 2b | `GET /repos/{o}/{r}/actions/workflows/{archivo}/runs?branch={rama}&status=completed&per_page=1` | Solo si un workflow que cumple 3.1 no aparece entre las 50 | Raro; evita leer historial completo |
| 3 | `GET /repos/{o}/{r}/pulls?state=open&per_page=30` | PRs abiertos (US3) | Título tratado como texto |
| 4 | `GET /repos/{o}/{r}/actions/runs?head_sha={sha}&per_page=20` | CI de cada PR (US3) | Máximo 10 PRs por repo, los más recientes; el resto "CI no consultada" |
| 5 | `GET /repos/{o}/{r}/secret-scanning/alerts?state=open&per_page=100&hide_secret=true` | Alertas abiertas (US4) | Solo con token; `hide_secret=true` |

Para un portafolio de 6 repos, una actualización completa son unas 20 a 30 consultas.

Fuente: [List workflow runs for a
repository](https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-repository)
(parámetros `branch`, `status`, `head_sha`, `exclude_pull_requests`; campos `path`, `status`,
`conclusion`, `head_branch`, `event`).

**Alternativa descartada**: `GET /commits/{ref}/check-runs` o `/status` para la CI de los PRs:
exigen los permisos Checks o Commit statuses además de Actions.

## R4. Peticiones condicionales y límite de consultas

**Hechos verificados** ([Best practices for using the REST
API](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)):

- "Making a conditional request does not count against your primary rate limit if a `304` response
  is returned and the request was made while correctly authorized with an `Authorization` header."
  **Sin token, un 304 sí cuenta.** Por eso SC-006 se reformuló para aplicar solo con token.
- GitHub recomienda peticiones en serie para no disparar los límites secundarios.

**Decisión**:

- Cada consulta guarda su `etag` junto con su resultado ya resumido (no la respuesta completa) en el
  índice. La siguiente vez se envía `If-None-Match`; con 304 se reutiliza el resultado guardado.
- Cada respuesta actualiza el estado del límite con `x-ratelimit-limit`, `x-ratelimit-remaining` y
  `x-ratelimit-reset`.
- Antes de cada consulta: si `remaining` ≤ 2, no se consulta y el dato queda "no disponible:
  límite de consultas de GitHub agotado; se restablece a las HH:MM".
- Un 403 o 429 con `remaining: 0` o con `retry-after` (límite secundario) detiene todas las
  consultas pendientes de esa actualización. **Nunca se reintenta.**
- Sin token, el límite es de 60 por hora: alcanza para una o dos actualizaciones completas por
  hora con el portafolio actual. El quickstart lo dice y recomienda el token.

## R5. Reparto de los 8 segundos

**Decisión**:

- **Plazo global**: un único `AbortSignal` de 8 s para toda la consulta a GitHub de una
  actualización. Cada petición, además, se corta a los 4 s.
- **Concurrencia 3**, como compromiso entre el consejo de GitHub (en serie) y el plazo: 3
  peticiones a la vez está muy lejos de los límites secundarios.
- **Por prioridad, en oleadas**, para que lo que falte al vencer el plazo sea lo menos importante.
  La oleada 2 empieza cuando todas las de la oleada 1 terminaron o vencieron:
  1. Consulta 1 (repo) de todos los proyectos: US2 y la rama para US1.
  2. Consultas 2 y 2b (CI): US1.
  3. Consultas 3 y 4 (PRs y su CI): US3.
  4. Consulta 5 (alertas): US4.
- **Al vencer el plazo**, lo pendiente queda "no disponible: tiempo agotado" y se usan los datos
  guardados con su fecha (FR-015).
- **Lectura local primero**: lo local (archivos y git, menos de 1 s) se lee primero, porque GitHub
  necesita el remoto `origin` de cada proyecto. Después se consulta GitHub y por último se evalúa.
  Así Actualizar tarda como máximo unos 9 s, dentro de SC-005 (10 s).
- **Estimación**: 6 repos, unas 25 consultas de 150 a 300 ms cada una, con concurrencia 3: unos
  2 s. Con 50 repos, las oleadas 3 y 4 pueden no caber; quedan con sus datos guardados.

**Alternativas descartadas**: todas las consultas a la vez (riesgo de límite secundario); en serie
estricta (25 × 300 ms se acerca al plazo); reparto fijo por proyecto (desperdicia tiempo de los
proyectos rápidos).

## R6. Cliente de GitHub: solo GET y el token protegido

**Decisión**: un único módulo `src/lib/github/client.ts`, `server-only`, que es el **único** archivo
que llama a `fetch` hacia GitHub.

- **Solo GET**: la función interna recibe el método y rechaza todo lo que no sea `GET`, lanzando
  error antes de la red. La API pública solo expone `githubGet(path)`.
- **Solo un destino**: el origen es la constante `https://api.github.com`. La ruta se valida con un
  patrón cerrado (`/repos/{o}/{r}/…`, solo los 5 endpoints de R3) y sin `..`, `//`, `@` ni
  esquema. Ninguna ruta se forma con texto que no venga del remoto normalizado
  (`normalizeGithubRemote`) o de un número o SHA validado.
- **Token**:
  - Se lee solo en el servidor (`getServerEnv().GITHUB_TOKEN`, opcional) y viaja solo en la
    cabecera `Authorization`, nunca en la URL.
  - Ningún error, registro ni dato del índice incluye cabeceras. Los errores se construyen con el
    estado HTTP y un motivo fijo.
  - `fetch` lleva `cache: "no-store"` y `redirect: "error"` (no se siguen redirecciones a otro
    destino).
  - `next.config` no activa `logging.fetches`.
- **Pruebas que lo demuestran**:
  1. Llamar a la función interna con `POST`, `PUT`, `PATCH` y `DELETE` lanza error sin tocar la
     red.
  2. Una ruta fuera del catálogo o con otro origen lanza error.
  3. Se recorre el código de `src/` y solo `client.ts` contiene `fetch(` hacia GitHub; ningún
     archivo del cliente del navegador importa `src/lib/github`.
  4. Con el token ficticio `test-token-NO-REAL-0000`, nada de lo siguiente lo contiene: el HTML de
     las páginas, el índice guardado, los mensajes de error ni la salida de consola capturada.

## R7. Pruebas sin GitHub real

**Decisión**:

- **Unitarias (Vitest)**: el cliente recibe la implementación de `fetch` por parámetro. Las pruebas
  le pasan un **GitHub simulado en memoria** con respuestas ficticias (repos `example-org/*`) que
  cubre 200, 304 con ETag, 403 por límite, 404, 429 con `retry-after`, tiempo agotado y red caída.
- **E2E (Playwright)**:
  - Un servidor HTTP simulado de GitHub escucha en `127.0.0.1` (puerto libre, levantado en el
    `globalSetup`).
  - La app lo usa a través de `GITHUB_API_ORIGIN`. El cliente acepta esa variable **solo** si su
    valor es `http://127.0.0.1:<puerto>` **y** el entorno es el de pruebas (Supabase en
    `127.0.0.1:54321`, la misma salvaguarda de `scripts/env-guard.ts`). En el entorno de uso la
    variable se rechaza y la app no arranca.
- **Salvaguarda contra el GitHub real**:
  1. El `setupFiles` de Vitest reemplaza `globalThis.fetch` por una envoltura que **hace fallar la
     prueba** ante cualquier petición a `api.github.com` (o a `github.com`).
  2. En E2E, en el entorno de pruebas, el cliente rechaza el origen `https://api.github.com`:
     cualquier intento lanza error y la prueba falla.
  3. `assertTestEnv` aborta si en el entorno de pruebas `GITHUB_TOKEN` tiene un valor que no
     empieza con `test-` (nunca un token real en pruebas).
- **CI de nexoru-op**: no lleva token ni secretos nuevos; todo corre contra el GitHub simulado.

**Alternativas descartadas**: `nock` o `msw` (dependencias nuevas para lo que cubre una función
inyectada y un servidor de 50 líneas con `node:http`); grabar respuestas reales (meterían datos
reales al repo público).

## R8. Verificación 3.2, base de Conformidad y datos guardados

**Decisión**:

- **Por versión** (`rules.ts`, campo `ciRule`):
  - **1.0 y 1.1** (`latest_any`): se cumple si la ejecución terminada más reciente de cualquier
    workflow en la rama principal tiene `conclusion: success`.
  - **1.2** (`each_workflow`): se cumple si, para **cada** archivo que cumple 3.1, su ejecución
    terminada más reciente en la rama principal tiene `conclusion: success`. Un workflow sin
    ejecuciones terminadas no cumple. La falla nombra cada workflow en rojo o sin ejecuciones.
- **En curso**: una ejecución en curso se muestra ("en curso") pero no decide.
- **Datos guardados**: si no hay dato fresco, se usa el guardado con menos de 7 días, mostrando su
  antigüedad. Sin dato utilizable, 3.2 queda `not_evaluated` con el motivo.
- **Si 3.1 falla**: en 1.2, 3.2 falla con "ningún workflow cumple 3.1"; en 1.0 y 1.1 se evalúa con
  cualquier workflow, como dice su texto.
- **Base**: 3.2 es aplicable solo si se evaluó (pasa o falla): 29 con 3.2 evaluada y 28 si no. El
  texto de la Conformidad dice el estado en el mismo lugar ("97 % · 28 de 29 (incluye 3.2)" o
  "100 % · 28 de 28 (3.2 sin evaluar: sin datos recientes de GitHub)"). La frase "la base cambió de
  28 a 29 por la activación de 3.2" vive solo en una leyenda fija: el dashboard describe el estado
  de cada proyecto y nunca anuncia como "cambio" que GitHub no respondiera (ajuste del Dueño al
  aprobar el plan).
- **Nivel**: con 3.2 evaluada, el nivel 3 deja de ser provisional; si 3.2 falla, el nivel máximo
  es 2.
- **Motor puro**: `evaluateProject` recibe un argumento nuevo `github` (los datos de CI y de
  visibilidad ya resumidos, con su fecha); sigue sin tocar la red.

## R9. Visibilidad por versión

**Decisión**:

- **1.0 y 1.1**: solo el hallazgo alto "`producto-cliente` en un repo público".
- **1.2** (estándar 1.2.0, `repo-visibility.md` "Visibilidad declarada"): un resultado por
  proyecto, `aceptada`, `requiere-decision`, `discrepancia` o `sin-declarar (interno)`, con los
  hallazgos altos correspondientes, más el de `producto-cliente` público, que se evalúa aparte.
- **Valores del campo**: `visibilidad` vacía equivale a no declarada; un valor fuera de
  `publico`/`privado` da una advertencia y cuenta como no declarado.
- **Sin dato de GitHub**: "no evaluado" con el motivo. Si el dato guardado tiene menos de 7 días,
  se usa, como en R8.
- **Aviso de versión más nueva (FR-028)**: "hay una versión más nueva del estándar (1.2) con reglas
  más estrictas de CI y visibilidad". La versión sale de la más reciente de
  `SUPPORTED_STANDARD_VERSIONS`.

## R10. Índice: formato 3

**Decisión**:

- **Formato**: `FORMAT_VERSION` pasa a 3. Cada proyecto gana `github` (ver
  [data-model.md](data-model.md)) y la lectura gana `githubStatus` y `githubCache` (ETag y resultado
  resumido por consulta). Un índice con formato 2 se vuelve a leer solo, como en la Fase 3; sus
  datos de GitHub empiezan vacíos.
- **Sin migración**: la columna `payload jsonb` y `save_portfolio_snapshot` ya admiten el formato
  nuevo.
- **Dos modos de `refreshSnapshot`**:
  - `withGitHub` (botón Actualizar): lee lo local, consulta GitHub y evalúa.
  - `localOnly` (relectura automática a los 10 minutos): lee lo local y reutiliza `github`,
    `githubStatus` y `githubCache` del índice anterior, reevaluando 3.2 y la visibilidad con la
    regla de los 7 días.
- **Qué no se guarda nunca**: el token, las cabeceras, el texto de las alertas (con
  `hide_secret=true` y solo el conteo), los cuerpos de las PRs y los nombres de quienes las abren.

## R11. Disposición del tablero

**Decisión**: la tabla pasa de 13 a 13 columnas.

| Cambio | Columna |
|---|---|
| Entra | **CI**: semáforo compacto de la rama principal: éxito, falla, en curso, no disponible o no aplica, con ícono, texto y etiqueta oculta, como los de la Fase 3 |
| Entra | **PRs**: número de PRs abiertos; "—" si no aplica |
| Se fusiona | **Tipo** y **Cliente** quedan en una sola columna "Tipo" (el cliente debajo, solo en `producto-cliente`) |
| Pasa al detalle | **Roadmap** (activo o concluido): ya está en el detalle y sus hallazgos de cierre aparecen ahí |
| Bajo el nombre del proyecto | **Visibilidad** (público o privado) como texto pequeño, sin columna |

Además:

- **Encabezado del portafolio**: "Datos de GitHub de hace X" (o "sin datos de GitHub: pulsa
  Actualizar"), consultas restantes y hora de restablecimiento, y si hay token y cuándo vence.
- **Avisos del portafolio**: el token vence en 14 días o menos; repos con alertas de secretos
  abiertas.
- **Detalle**: una tarjeta **GitHub** con la CI por workflow, la visibilidad y su resultado, los
  PRs y las alertas, cada dato con su motivo si no está disponible.
- **Estado de 3.2 en la Conformidad**: en la misma celda, como texto ("28 de 29 (incluye 3.2)" o
  "28 de 28 (3.2 sin evaluar: motivo)"); la leyenda fija de Conformidad va bajo la tabla y en el
  detalle.

**Alternativas descartadas**: añadir 4 columnas (CI, PRs, visibilidad y alertas), porque la tabla
ya está al límite de legibilidad; meter la visibilidad en la columna Rama (mezcla git local con
GitHub).

## R12. Alertas de secretos

**Hechos verificados** ([List secret scanning alerts for a
repository](https://docs.github.com/en/rest/secret-scanning/secret-scanning#list-secret-scanning-alerts-for-a-repository)):

- Hace falta ser administrador del repo; el Dueño lo es.
- La respuesta incluye el campo `secret` con el secreto en claro **salvo** con `hide_secret=true`.
- 404 cuando el secret scanning está desactivado o el token no tiene acceso.

**Decisión**:

- Siempre con `hide_secret=true`. Solo se guarda el **número** de alertas abiertas.
- Con 1 o más alertas: hallazgo crítico "Alertas de secretos abiertas: N" (sin ruta ni tipo de
  secreto). No cambia el nivel.
- **Motivos de "no evaluado"**:
  - sin token: "requiere token";
  - 403: "el token no tiene permiso de lectura de alertas de secretos";
  - 404: "secret scanning no está activo en el repo o el token no tiene acceso".
- En repos privados de una cuenta personal, el secret scanning requiere un producto de pago de
  GitHub, así que lo esperado es el 404 (hoy, `conversa-experiencias`).

## R13. Evaluación de la fecha objetivo (2026-11-08)

- **Tiempo disponible**: desde hoy (2026-10-03) hay unas 5 semanas.
- **Referencia**: la Fase 3, con 5 historias y 55 tareas, fue de la spec (2026-10-01) al merge
  (2026-10-03).
- **Tamaño estimado de la Fase 4**: unas 45 tareas: cliente, simulación, 4 historias, estándar 1.2
  y cierre.
- **Riesgos**:
  - el servidor de GitHub simulado en E2E;
  - las variantes de respuesta de GitHub (límite secundario, 404 ambiguos);
  - la validación con el token real, que depende de que el Dueño cree el token;
  - la tarea [MANUAL] de declarar `visibilidad` y subir ABE y `nexoru-op` a 1.2.
- **Veredicto**: la fecha se cumple con margen y **no hace falta sacrificar historias**.
- **Puntos de control**:
  - si el **2026-10-24** US1 y US2 no están terminadas, se sacrifica US4 (y su permiso del token);
  - si el **2026-10-31** US3 no está terminada, se sacrifica US3.

  Lo sacrificado vuelve al backlog.

## R14. Soporte del estándar 1.2

**Decisión**:

- `SUPPORTED_STANDARD_VERSIONS` pasa a `["1.0", "1.1", "1.2"]`. `RULES["1.2"]` es igual a la 1.1 más
  `ciRule: "each_workflow"` y `visibilityField: true`. El motor sigue siendo uno (`v1_0`).
- El aviso de estándar local más nuevo de la Fase 2 se calcula contra 1.2.
- El manifiesto acepta el campo opcional `visibilidad` (fuera de los enumerados de 1.4, como dice
  el estándar).
- Al cierre, tarea [MANUAL] (FR-027): declarar `visibilidad` en `amazon-business-engine` y
  `nexoru-op` y subirlos a 1.2.
