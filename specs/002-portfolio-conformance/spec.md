# Feature Specification: Lector seguro del portafolio y conformidad con el estándar

**Feature Branch**: `002-portfolio-conformance`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Fase 2 de Nexoru Op: lector seguro del portafolio y evaluación de
conformidad con el Estándar de Proyecto Nexoru. El Dueño ve en el dashboard todos los proyectos de
PROJECTS_ROOT con los datos de su PROJECT.md (metadatos, roadmap con estado de fase derivado de
tasks.md, siguiente hito) y su nivel de conformidad (0 a 3) según nexoru-governance, con las
brechas concretas de cada nivel. Lector seguro (principio XIII): solo rutas reales dentro de
PROJECTS_ROOT, solo archivos del estándar, nunca .env* ni secretos, sin ejecutar nada. Estándar
leído de nexoru-governance con versiones soportadas declaradas y aviso ante versión no soportada
(XIV). Datos ausentes se muestran como ausentes (XI); índice regenerable en la BD. Fuera de
alcance: historial de git (Fase 3) y GitHub (Fase 4); las verificaciones de conformidad que
dependen de git o GitHub se muestran como 'no evaluadas en esta fase'."

**Referencias**: constitución v2.0.0 (principios XI a XIV); Estándar de Proyecto Nexoru v1.0 en
`nexoru-governance/standard/` (`conformance.md`, `project-manifest.md`, `roadmap.md`,
`project-standard.md`).

## Clarifications

### Session 2026-09-28 (spec inicial)

- Q: ¿`nexoru-governance` (el estándar) cuenta como proyecto del portafolio? → A: Se lista aparte,
  como "estándar", con su versión vigente y sin evaluar su conformidad.
- Q: ¿Cuándo se vuelve a leer el portafolio, además de cuando el Dueño lo pide? → A: Al abrir el
  dashboard, si la última lectura tiene más de 10 minutos; el botón de actualizar sigue
  disponible.
- Q: Mientras la verificación 3.2 (CI en GitHub) no se evalúe, ¿qué nivel se muestra a un proyecto
  que pasa todo lo demás del nivel 3? → A: "Nivel 3 (provisional)", indicando que falta verificar
  la CI en GitHub. En la Fase 4, al evaluarse 3.2, el nivel pasa a definitivo (3 o 2).

### Session 2026-09-28 (clarify)

- Q: ¿De qué versión de los archivos lee el dashboard cada proyecto: de lo que hay en disco o de
  la rama principal? → A: De lo que hay en disco, mostrando la rama actual y con un aviso si no es
  la rama principal o si hay cambios sin commit.
- Q: Si una carpeta no es repositorio git o no tiene remoto `origin`, ¿la verificación 1.7 cuenta
  como fallida o como no evaluable? → A: Fallida (el proyecto queda en nivel 0), con el detalle
  "no es repositorio git" o "sin remoto `origin`".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el portafolio completo (Priority: P1)

El Dueño entra al dashboard y ve, en una sola pantalla, todos los proyectos de `PROJECTS_ROOT`
con los datos de su portada ejecutiva: nombre, tipo, cliente, fase del ciclo de vida, estado
(verde, ámbar o rojo), fecha objetivo, siguiente hito y nivel de conformidad. Cada dato sale del
archivo del proyecto; si falta, se ve como ausente. La pantalla indica cuándo se leyó el
portafolio por última vez.

**Why this priority**: es la misión del producto: conocer el estado de todo el portafolio en menos
de un minuto sin captura manual. Sin esta pantalla no hay dashboard.

**Independent Test**: con un portafolio de prueba (proyectos ficticios con y sin `PROJECT.md`),
el Dueño inicia sesión y comprueba que cada proyecto aparece con exactamente los datos de su
`PROJECT.md` y su nivel.

**Acceptance Scenarios**:

1. **Given** un proyecto con `PROJECT.md` válido, **When** el Dueño abre el dashboard, **Then** ve
   su nombre, tipo, cliente, fase, estado, fecha objetivo, siguiente hito y nivel, idénticos a los
   del archivo.
2. **Given** una carpeta de proyecto sin `PROJECT.md`, **When** el Dueño abre el dashboard,
   **Then** la ve listada con su nombre de carpeta, nivel 0 y la indicación "sin `PROJECT.md`",
   sin datos inventados.
3. **Given** un `PROJECT.md` cuyo frontmatter no se puede interpretar, **When** el Dueño abre el
   dashboard, **Then** el proyecto aparece con nivel 0, sus datos como ausentes y el motivo.
4. **Given** que un archivo de un proyecto cambió después de la última lectura, **When** el Dueño
   pide actualizar, **Then** la pantalla refleja el cambio y la nueva fecha de lectura.
5. **Given** que no hay sesión con segundo factor, **When** alguien intenta ver el portafolio,
   **Then** no ve ningún dato (se aplica el acceso de la Fase 1).
6. **Given** que la última lectura tiene más de 10 minutos, **When** el Dueño abre el dashboard,
   **Then** el portafolio se vuelve a leer antes de mostrarse.
7. **Given** la carpeta `nexoru-governance`, **When** el Dueño abre el dashboard, **Then** la ve
   aparte, como "estándar", con su versión vigente y sin nivel de conformidad.
8. **Given** un proyecto cuya copia en disco está en una rama distinta de la principal o tiene
   cambios sin commit, **When** el Dueño abre el dashboard, **Then** ve sus datos tal como están en
   disco, junto con el nombre de la rama y el aviso "no es la rama principal" o "cambios sin
   commit".

---

### User Story 2 - Ver la conformidad de un proyecto y sus brechas (Priority: P1)

Desde el portafolio, el Dueño abre un proyecto y ve su nivel de conformidad (0 a 3) y, para el
siguiente nivel que le falta, la lista de verificaciones que fallan con su número del estándar
(p. ej. "1.11") y un detalle concreto (qué campo, qué sección, qué carpeta). Ve también las
advertencias, los hallazgos fuera de nivel con su severidad y las verificaciones que esta fase no
evalúa.

**Why this priority**: el nivel solo sirve si dice qué falta para subirlo; es lo que el Dueño usa
para decidir qué migrar primero.

**Independent Test**: con proyectos ficticios preparados para fallar una verificación concreta de
cada nivel, se comprueba que el nivel y la falla reportada coinciden con lo que exige
`conformance.md`.

**Acceptance Scenarios**:

1. **Given** un `PROJECT.md` que contiene `CONFIRMAR`, **When** el Dueño abre el proyecto,
   **Then** ve nivel 0 y la falla 1.11 con el lugar donde aparece.
2. **Given** un proyecto que cumple el nivel 1 pero su mapa funcional contiene una columna
   `Estado`, **When** el Dueño abre el proyecto, **Then** ve nivel 1 y la falla 2.6.
3. **Given** un proyecto con una carpeta de spec sin `tasks.md`, **When** el Dueño abre el
   proyecto, **Then** ve una advertencia (no una falla de nivel 2).
4. **Given** un proyecto con un archivo `.env` versionado, **When** el Dueño abre el proyecto,
   **Then** ve un hallazgo **crítico** que nombra el archivo, sin mostrar nunca su contenido.
5. **Given** cualquier proyecto, **When** el Dueño abre su conformidad, **Then** las
   verificaciones que dependen de GitHub (3.2 y la visibilidad del repo) aparecen como "no
   evaluadas en esta fase", nunca como aprobadas ni como fallidas.
6. **Given** un proyecto que pasa todas las verificaciones de nivel 3 que se evalúan en esta fase,
   **When** el Dueño lo ve, **Then** aparece como "nivel 3 (provisional)", con la nota de que
   falta verificar la CI en GitHub (3.2).

---

### User Story 3 - Ver el roadmap con el estado derivado de cada fase (Priority: P2)

En el detalle de un proyecto, el Dueño ve la tabla de su roadmap: cada fase con su objetivo,
specs vinculadas, fecha objetivo y estado. El estado es el derivado de los `tasks.md` de sus specs
(completa, en curso o pendiente, con el conteo de tareas) o, si no se puede derivar, el estado
manual, marcado como tal.

**Why this priority**: muestra el avance real de cada proyecto, pero depende de la lectura del
portafolio (US1) y aporta menos que saber qué proyectos incumplen el estándar.

**Independent Test**: con un proyecto ficticio cuyas fases tienen specs con tareas todas marcadas,
algunas marcadas y ninguna marcada, se comprueba que el estado mostrado es `completa`, `en-curso`
y `pendiente` con los conteos correctos.

**Acceptance Scenarios**:

1. **Given** una fase cuyas specs vinculadas tienen `tasks.md` con 10 de 12 tareas marcadas,
   **When** el Dueño ve el roadmap, **Then** la fase aparece `en-curso` (10/12), como derivado.
2. **Given** una fase con `Specs` = `—` y `Estado manual` = `pendiente`, **When** el Dueño ve el
   roadmap, **Then** aparece `pendiente`, identificado como estado manual.
3. **Given** una fase con estado derivado y `Estado manual` no vacío, **When** el Dueño ve el
   roadmap, **Then** se muestra el derivado y la contradicción aparece como falla 3.6.
4. **Given** un `PROJECT.md` sin tabla de roadmap reconocible, **When** el Dueño ve el proyecto,
   **Then** el roadmap aparece como ausente y el resto de los datos se muestra igual.

---

### User Story 4 - Saber con qué versión del estándar se evalúa (Priority: P2)

El dashboard muestra qué versiones del estándar soporta y la versión que encontró en
`nexoru-governance`. Si un proyecto declara una `version_estandar` no soportada, el dashboard no
lo evalúa con otras reglas: lo marca "versión del estándar no soportada" y muestra solo sus datos
de portada.

**Why this priority**: evita resultados falsos cuando el estándar evolucione (principio XIV); hoy
todos los proyectos usan la 1.0, por eso no es P1.

**Independent Test**: con un proyecto ficticio que declara `version_estandar: "2.0"`, se comprueba
que aparece sin nivel y con el aviso, y que los demás proyectos se evalúan normalmente.

**Acceptance Scenarios**:

1. **Given** un proyecto con `version_estandar: "2.0"` y soporte solo para "1.0", **When** el
   Dueño abre el portafolio, **Then** ese proyecto muestra "versión del estándar no soportada
   (2.0)" en lugar de un nivel.
2. **Given** que `nexoru-governance` publica una versión más nueva que las soportadas, **When** el
   Dueño abre el dashboard, **Then** ve un aviso general de que el estándar local es más nuevo que
   el que el dashboard sabe evaluar.
3. **Given** que `nexoru-governance` no existe en `PROJECTS_ROOT`, **When** el Dueño abre el
   dashboard, **Then** ve un aviso de que no se encontró el estándar y los proyectos se evalúan
   con la versión soportada.

---

### Edge Cases

- **Enlace simbólico que sale de `PROJECTS_ROOT`** (un `PROJECT.md`, una carpeta de proyecto o
  una carpeta de `specs/` que apunta fuera): no se lee; el dato queda ausente y el motivo se
  reporta como "ruta fuera del portafolio".
- **Archivo `.env*`, llave o archivo de secretos**: nunca se abre, aunque esté en una ruta del
  estándar o lo apunte un enlace. Para detectar `.env*` versionados solo se usan los nombres de
  archivo que reporta git, nunca el contenido.
- **Archivo demasiado grande** (más de 1 MB) o que no es un archivo regular (dispositivo, tubería):
  no se lee; se reporta como ilegible.
- **Carpeta que no es repositorio git, o repositorio sin remoto `origin`**: la verificación 1.7
  falla (FR-031). En una carpeta que no es repositorio, el hallazgo de `.env*` versionados se
  marca "no evaluable: no es un repositorio git".
- **Carpetas ocultas** (que empiezan con `.`) en `PROJECTS_ROOT`: no son proyectos.
- **`PROJECTS_ROOT` no configurado o inexistente**: el dashboard lo dice claramente y no muestra
  proyectos; no usa una ruta por defecto.
- **Proyecto borrado entre lecturas**: desaparece del portafolio en la siguiente lectura.
- **Error al leer un proyecto**: no impide leer los demás; ese proyecto muestra el error.
- **Dos proyectos con el mismo `id`**: ambos se muestran y se reporta el duplicado.
- **Codificación inválida o finales de línea CRLF**: se toleran los CRLF; un archivo que no es
  UTF-8 válido se reporta como ilegible.

## Requirements *(mandatory)*

### Functional Requirements

**Lectura del portafolio**

- **FR-001**: El sistema DEBE tratar como proyecto cada carpeta directa y no oculta de
  `PROJECTS_ROOT`, salvo `nexoru-governance`, que DEBE mostrarse aparte como "estándar", con su
  versión vigente y sin evaluar su conformidad.
- **FR-002**: El sistema DEBE acceder de cada proyecto solo a los archivos que el estándar define.
  Lee el contenido de `PROJECT.md`, `docs/mapa-funcional.md`, `CLAUDE.md`, los `tasks.md` de
  `specs/<NNN-nombre>/` y los flujos de `.github/workflows/`. De `.specify/`,
  `.specify/memory/constitution.md`, los `spec.md` y `plan.md` de `specs/<NNN-nombre>/` y
  `.env.example` solo comprueba que existen, sin abrirlos (contracts/reader.md).
- **FR-003**: El sistema DEBE resolver la ruta real de todo archivo y carpeta antes de leerlo y
  rechazar cualquiera que quede fuera de `PROJECTS_ROOT`.
- **FR-004**: El sistema NUNCA DEBE abrir archivos `.env*` (incluido `.env.example`), llaves
  (`*.pem`, `*.key`, `id_*`) ni otros archivos de secretos, sin importar cómo se llegue a ellos.
- **FR-005**: El sistema NO DEBE ejecutar nada de los proyectos. La única excepción son comandos
  de git de solo lectura, sin shell y con argumentos fijos, para: el remoto `origin` (validación
  cruzada 1.7), la lista de archivos versionados que coinciden con `.env*` (hallazgo crítico), la
  rama actual, la rama principal y si hay cambios sin commit (FR-030). Ninguno de esos comandos
  puede modificar el repositorio, ni siquiera sus archivos internos.
- **FR-006**: El sistema NO DEBE escribir, crear ni modificar nada dentro de `PROJECTS_ROOT`.
- **FR-007**: El sistema DEBE rechazar archivos de más de 1 MB o que no sean archivos regulares y
  reportarlos como ilegibles.
- **FR-008**: La falla al leer un proyecto NO DEBE impedir leer los demás.
- **FR-009**: Todo dato que falta o no se puede leer DEBE mostrarse como ausente, con el motivo
  cuando se conoce; el sistema NO DEBE inventarlo ni rellenarlo con valores por defecto.

**Índice y actualización**

- **FR-010**: El resultado de la lectura DEBE guardarse en un índice regenerable: borrarlo no
  pierde información, porque se reconstruye leyendo los proyectos.
- **FR-011**: El dashboard DEBE mostrar la fecha y hora de la lectura en la que se basa.
- **FR-012**: El Dueño DEBE poder pedir una nueva lectura del portafolio desde el dashboard. Además,
  al abrir el dashboard, el sistema DEBE volver a leer el portafolio si la última lectura tiene
  más de 10 minutos.
- **FR-013**: Si el índice está vacío (primera vez o tras borrarlo), el sistema DEBE leer el
  portafolio antes de mostrarlo.
- **FR-014**: El índice y las pantallas del portafolio DEBEN quedar protegidos por el mismo
  acceso de la Fase 1: solo el Dueño con sesión de segundo factor.

**Portafolio y detalle**

- **FR-030**: El sistema DEBE leer los archivos de cada proyecto tal como están en disco y mostrar,
  por proyecto, la rama actual y un aviso si no es la rama principal (la que `origin` marca como
  principal; si no se puede saber, `main`) o si hay cambios sin commit. En una carpeta que no es
  repositorio git, esos datos se muestran como ausentes.

- **FR-015**: La vista del portafolio DEBE mostrar por proyecto: nombre (o carpeta, si no hay
  nombre), tipo, cliente, fase, estado, fecha objetivo, siguiente hito y nivel de conformidad.
- **FR-016**: El detalle de un proyecto DEBE mostrar todos los campos del manifiesto, el roadmap
  con el estado de cada fase y la conformidad completa (FR-021 a FR-025).
- **FR-017**: El estado de cada fase DEBE derivarse según `standard/roadmap.md`: contando las
  casillas `- [ ]` y `- [x]`/`- [X]` de los `tasks.md` de todas sus specs vinculadas; solo hay
  estado derivado si todas esas specs tienen `tasks.md`.
- **FR-018**: El dashboard DEBE mostrar el conteo de tareas (hechas / total) de las fases con
  estado derivado y distinguir visualmente el estado derivado del manual.
- **FR-019**: El dashboard NO DEBE mostrar contenido de specs, planes ni constituciones más allá
  de lo necesario para la conformidad y el roadmap (conteos y existencia).

**Conformidad**

- **FR-020**: El sistema DEBE declarar las versiones del estándar que soporta (en esta fase,
  solo "1.0") y mostrarlas en el dashboard.
- **FR-021**: El sistema DEBE ejecutar las verificaciones 1.1–1.11, 2.1–2.10 y 3.1, 3.3–3.8 de
  `standard/conformance.md` v1.0, incluidas las validaciones cruzadas del manifiesto, con la
  fecha de la lectura como fecha de evaluación.
- **FR-031**: La validación cruzada 1.7 "`repo` coincide con el remoto `origin`" DEBE contar como
  fallida si la carpeta no es repositorio git o no tiene remoto `origin`, con el detalle "no es
  repositorio git" o "sin remoto `origin`".
- **FR-022**: El nivel DEBE calcularse de forma acumulativa: el más alto cuyas verificaciones, y
  las de todos los niveles anteriores, pasan completas.
- **FR-023**: Las verificaciones que requieren GitHub (3.2 y la visibilidad del repo) y la
  búsqueda de secretos en el historial DEBEN aparecer como "no evaluadas en esta fase", nunca
  como aprobadas ni fallidas. Un proyecto que pasa todas las demás verificaciones del nivel 3
  (y las de los niveles anteriores) DEBE mostrarse como "nivel 3 (provisional)", con la nota de
  que falta verificar la CI en GitHub; el nivel pasa a definitivo cuando la Fase 4 evalúe 3.2.
- **FR-024**: Para cada proyecto, el sistema DEBE reportar: nivel; fallas del siguiente nivel
  (número de verificación y detalle concreto); advertencias (specs sin `plan.md` o `tasks.md`,
  comentarios YAML en el frontmatter); hallazgos fuera de nivel con severidad; y verificaciones
  no evaluadas con su motivo.
- **FR-025**: Los hallazgos fuera de nivel evaluados en esta fase DEBEN ser: `.env*` versionado
  (crítico, solo el nombre del archivo), falta de `.env.example` (medio) y comentarios YAML en el
  frontmatter (bajo). La comprobación de que `.env.example` lista todas las variables que lee el
  código queda "no evaluada en esta fase".
- **FR-026**: Si un proyecto declara una `version_estandar` no soportada o no la declara, el
  sistema NO DEBE calcular su nivel con otras reglas: DEBE mostrar "versión del estándar no
  soportada" (o "sin versión del estándar") junto con los datos de portada que sí se pudieron
  leer.
- **FR-027**: El sistema DEBE leer la versión vigente del estándar en `nexoru-governance` y
  avisar si es más nueva que las soportadas o si no se encuentra.

**Seguridad y pruebas**

- **FR-028**: Las pruebas DEBEN usar un portafolio ficticio propio (proyectos inventados, sin
  datos reales) y NUNCA leer el `PROJECTS_ROOT` real del Dueño.
- **FR-029**: Los mensajes de error y los registros NO DEBEN incluir contenido de archivos de los
  proyectos, solo rutas relativas a `PROJECTS_ROOT` y el motivo.

### Key Entities *(include if feature involves data)*

- **Portafolio**: el conjunto de proyectos de `PROJECTS_ROOT` en una lectura; tiene la fecha de
  lectura, la versión del estándar encontrada en `nexoru-governance` y los avisos generales.
- **Proyecto**: una carpeta del portafolio; tiene su carpeta, su rama actual y sus avisos de rama
  (rama no principal, cambios sin commit), su manifiesto (si existe), su
  roadmap, su resultado de conformidad y los errores de lectura.
- **Manifiesto**: los campos del frontmatter de `PROJECT.md`, cada uno presente o ausente.
- **Fase del roadmap**: fase, objetivo, specs vinculadas, fecha objetivo, estado manual, estado
  derivado (si aplica) y conteo de tareas.
- **Resultado de conformidad**: versión del estándar aplicada, nivel, fallas, advertencias,
  hallazgos y verificaciones no evaluadas.
- **Verificación**: número del estándar (p. ej. "2.6"), resultado (aprobada, fallida, no
  evaluada) y detalle.
- **Índice**: la copia guardada de la última lectura del portafolio; regenerable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El Dueño conoce el estado y el nivel de conformidad de todo el portafolio en menos
  de 1 minuto desde que inicia sesión.
- **SC-002**: El 100 % de las carpetas de proyecto de `PROJECTS_ROOT` aparece en el portafolio,
  sin captura manual, y `nexoru-governance` aparece aparte como estándar.
- **SC-003**: En el portafolio de prueba, el nivel y las fallas de cada proyecto coinciden en el
  100 % de los casos con el resultado esperado según `conformance.md` v1.0 (un caso por
  verificación).
- **SC-004**: Cero discrepancias entre lo que muestra el dashboard y los archivos de los
  proyectos del Dueño en su revisión de cierre de fase.
- **SC-005**: Ningún intento de salir de `PROJECTS_ROOT` ni de leer un `.env*` o una llave tiene
  éxito en las pruebas (enlaces simbólicos, `..`, nombres de archivo de secretos).
- **SC-006**: Una lectura completa de un portafolio de hasta 50 proyectos termina en menos de
  10 segundos, y la vista del portafolio abre en menos de 2 segundos a partir del índice.
- **SC-007**: Tras una lectura, ningún archivo de `PROJECTS_ROOT` cambió (contenido ni fecha de
  modificación).
- **SC-008**: Borrar el índice y volver a leer produce exactamente el mismo resultado.

## Assumptions

- `PROJECTS_ROOT` se configura por variable de entorno en cada entorno: en uso,
  `/home/fili/proyectos`; en pruebas, una copia temporal (`nexoru-op-fixture-*`) de un portafolio
  ficticio que vive en el repo.
- Las reglas de conformidad de la versión 1.0 se implementan en el dashboard a partir de
  `nexoru-governance/standard/`; de `nexoru-governance` se lee en tiempo de ejecución solo su
  versión vigente, para el aviso de FR-027.
- El remoto `origin` y los archivos versionados se obtienen con comandos de git de solo lectura
  permitidos por el principio XIII; el historial de git (commits, autores, fechas) es de la
  Fase 3.
- Sin token de GitHub ni consultas a GitHub en esta fase (Fase 4).
- La lectura del portafolio no se registra en la bitácora: no es una acción sensible sobre la
  cuenta (principio I).
- El dashboard se usa en el navegador de escritorio del Dueño; no se optimiza para móvil.
- `nexoru-op` se evalúa como cualquier otro proyecto del portafolio.
