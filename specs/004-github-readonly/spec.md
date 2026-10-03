# Feature Specification: Datos de GitHub en solo lectura

**Feature Branch**: `004-github-readonly`

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: "Fase 4 de Nexoru Op: datos de GitHub en solo lectura. Historias en
orden de prioridad: P1: CI y verificación 3.2. Por proyecto con remoto en GitHub: resultado, fecha y
workflow de la última ejecución de CI en la rama principal. Esto activa la verificación 3.2: la
Conformidad pasa de base 28 a 29 y el dashboard lo anuncia explícitamente ('la base cambió de 28 a 29
por la activación de 3.2'), para que una baja de porcentaje no se lea como retroceso. P2: Visibilidad.
Muestra si cada repo es público o privado y evalúa el hallazgo de visibilidad según
repo-visibility.md del estándar (por ejemplo, un producto-cliente público es hallazgo alto). Las
decisiones registradas en 'Decisiones clave', como la de ABE, se muestran como hallazgo aceptado, no
como pendiente. P3: PRs abiertos: número, título, antigüedad y estado de su CI. P4: Alertas de
secretos: si el token tiene permiso de lectura de alertas de secret scanning, muestra cuántas alertas
abiertas hay; si no, queda 'no evaluado' con su motivo. Restricciones: solo peticiones GET a
api.github.com, hechas por el servidor local; el cliente de GitHub rechaza en código cualquier otro
método, con una prueba que lo demuestre; el token nunca llega al navegador, nunca se registra en logs
y nunca aparece en pantalla. Token opcional en .env.local: fine-grained, solo lectura; documentar en
el quickstart cómo crearlo con los permisos mínimos para cada historia. Sin token, los repos públicos
se consultan con el límite anónimo y los privados quedan 'no disponible: requiere token'. Las
consultas se hacen solo al pulsar Actualizar y se guardan en el índice con su fecha ('datos de GitHub
de hace X'). Usa peticiones condicionales (ETag) para no gastar límite, y respeta el límite de
consultas mostrando cuándo se restablece. Sin red, con error o con el límite agotado: 'no disponible'
con motivo; lo local nunca se bloquea por GitHub. Remotos que no son de GitHub: 'no aplica'.
Constitución v2.0.0: confirma que esta fase cabe en su permiso de 'GitHub en solo lectura' y que la
CSP no cambia. Fuera de alcance: cualquier escritura, webhooks, issues, notificaciones, volver a
correr workflows e históricos. Fecha objetivo: 2026-11-08. Si el alcance la pone en riesgo, el orden
de sacrificio es P4, luego P3."

**Referencias**: constitución v2.0.1 (principios II, III, XI, XII y XIV); estándar
(`nexoru-governance/standard/conformance.md` verificación 3.2 y hallazgos fuera de nivel;
`standard/repo-visibility.md`; `standard/project-standard.md` §6); Fases 2 y 3
(`specs/002-portfolio-conformance/`, `specs/003-git-history-insights/`), cuyo motor de conformidad,
indicadores e índice se reutilizan; contrato `specs/003-git-history-insights/contracts/indicators-ui.md`
(cambio de base de 28 a 29); estándar 1.2.0 (campo `visibilidad` y regla de 3.2 con varios
workflows), que el Dueño publica desde la sesión de `nexoru-governance` antes de la implementación.

## Clarifications

### Session 2026-10-03 (spec inicial)

- **Encaje en la constitución v2.0.0**: la fase cabe en su permiso sin enmiendas de fondo. El
  principio XII permite como consulta de red "la API de GitHub (con o sin token)" en solo lectura y
  prohíbe escribir en GitHub; el principio II define el token como opcional, de solo lectura y fuera
  del código y de la base; el principio III se cumple porque la API de GitHub no tiene costo; el
  principio XI se cumple porque los datos de GitHub solo viven en el índice regenerable.
- **La CSP no cambia**: todas las consultas las hace el servidor local; el navegador no se conecta
  a GitHub, así que no hay orígenes nuevos en la política (`connect-src`, `img-src` ni otros). Los
  avatares u otras imágenes de GitHub quedan fuera.
- **Rama principal**: la que GitHub declara como predeterminada del repo.
- **Qué repo se consulta**: el del remoto `origin` de la copia local (el mismo que ya muestra la
  Fase 2). Si `PROJECT.md` declara otro `repo`, se avisa de la discrepancia.

### Session 2026-10-03 (respuestas del Dueño a la spec inicial)

- Q: ¿Dónde vive el token de GitHub, si el entorno de uso lee `.env.op.local` y `.env.local` es el
  de pruebas? → A: En `.env.op.local` para el entorno de uso. Las pruebas simulan GitHub y nunca
  usan un token real. Se hace una enmienda PATCH al principio II de la constitución para que diga
  que el token vive en el archivo de variables del entorno de uso, ignorado por git.
- Q: ¿Cómo se evalúa la visibilidad de un repo que no es `producto-cliente`? → A: Con un campo
  estructurado del estándar 1.2.0 en el frontmatter de `PROJECT.md`:
  `visibilidad: publico | privado`. Sin el campo: hallazgo alto "requiere decisión del Dueño".
  Declarado y coincide con GitHub: "aceptado". Declarado y no coincide con GitHub (privado y
  GitHub dice público, o al revés): hallazgo alto por discrepancia. El texto de "Decisiones clave"
  **no** se interpreta.
- Q: Con varios workflows, ¿qué cuenta como "la última ejecución de CI" para 3.2? → A: La ejecución
  más reciente de **cada** workflow que cumple 3.1 (se dispara con `push` y `pull_request`) debe
  estar en verde. La regla entra al estándar 1.2.0.
- El dashboard soporta las versiones 1.0, 1.1 y 1.2 del estándar.
- Al cierre hay una tarea [MANUAL]: declarar `visibilidad` en `amazon-business-engine` y
  `nexoru-op` y subirlos a `version_estandar: "1.2"`, desde la sesión de cada proyecto.

### Session 2026-10-03 (clarify)

- Q: ¿Cómo se evalúan la verificación 3.2 y el hallazgo de visibilidad en los proyectos que siguen
  declarando el estándar 1.0 o 1.1? → A: Cada versión con sus propias reglas. En 1.0 y 1.1, 3.2
  toma la última ejecución terminada de cualquier workflow de CI en la rama principal y el hallazgo
  de visibilidad solo detecta un `producto-cliente` público; en 1.2, el campo `visibilidad` y la
  regla de todos los workflows. Además, un proyecto que declara una versión anterior a la más
  reciente soportada muestra un aviso informativo, sin hallazgo ni cambio de nivel: "hay una
  versión más nueva del estándar (1.2) con reglas más estrictas de CI y visibilidad".
- Q: En un proyecto 1.2 `producto-cliente` que declara `visibilidad: publico` y cuyo repo es
  público, ¿el hallazgo se acepta? → A: No. Sigue siendo hallazgo alto: para `producto-cliente`, la
  regla de `repo-visibility.md` manda sobre lo declarado; "aceptado" solo aplica a los demás tipos.
- Q: Si una actualización no consigue datos nuevos de GitHub pero hay datos guardados de una
  consulta anterior, ¿3.2 se evalúa con ellos? → A: Sí, con su fecha a la vista ("CI de hace X"),
  mientras tengan menos de 7 días; con 7 días o más, 3.2 queda "no evaluada: datos de GitHub de
  más de 7 días".
- Q: Al pulsar Actualizar, ¿la página espera a GitHub o lo muestra en una acción aparte? → A: Un solo
  botón Actualizar: lee lo local y consulta GitHub a la vez, con un tiempo máximo de 8 segundos
  para GitHub; lo que no responda a tiempo queda con los datos guardados o "no disponible: tiempo
  agotado".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CI de la rama principal y verificación 3.2 (Priority: P1)

El Dueño ve, para cada proyecto con remoto en GitHub, el resultado, la fecha y el nombre del workflow
de la última ejecución de CI en la rama principal (una por workflow de CI si hay varios). Con ese dato, el dashboard evalúa la verificación
3.2 del estándar: el nivel 3 deja de ser provisional (o el proyecto baja a nivel 2 si la CI está en
rojo) y la Conformidad pasa a 29 verificaciones aplicables. El dashboard anuncia el cambio de base
para que una baja del porcentaje no se lea como retroceso.

**Why this priority**: es lo único que falta para que la conformidad sea completa; hoy todos los
proyectos de nivel 3 son "provisionales". Además, una CI rota en `main` es la señal más directa de
que algo se descompuso.

**Independent Test**: con GitHub simulado (repos ficticios con ejecuciones de CI en verde, en rojo,
en curso y sin ejecuciones), pulsar Actualizar y comprobar el dato de CI, el resultado de 3.2, el
nivel, la Conformidad con base 29 y el aviso de cambio de base.

**Acceptance Scenarios**:

1. **Given** un proyecto de nivel 3 provisional cuya última CI en la rama principal terminó con
   éxito, **When** el Dueño pulsa Actualizar, **Then** el proyecto muestra "CI: éxito", la fecha, el
   nombre del workflow, nivel 3 sin "provisional" y Conformidad sobre 29 (p. ej. 29/29).
2. **Given** un proyecto cuya última CI en la rama principal falló, **When** se actualiza, **Then**
   3.2 aparece como falla con su detalle (workflow y fecha), el proyecto queda en nivel 2 y la
   Conformidad baja a, p. ej., 28/29.
3. **Given** un proyecto con 3.2 evaluada por primera vez, **When** el Dueño ve su Conformidad en el
   tablero o en el detalle, **Then** junto al porcentaje aparece "la base cambió de 28 a 29 por la
   activación de 3.2".
4. **Given** un proyecto para el que GitHub no respondió (sin red, error, límite agotado o repo
   privado sin token) y sin datos guardados de menos de 7 días, **When** se actualiza, **Then** 3.2
   queda "no evaluada" con el motivo, el
   nivel 3 sigue provisional, la Conformidad mantiene la base 28 y los datos locales se muestran
   igual.
5. **Given** un proyecto cuyo remoto no es de GitHub o que no tiene remoto, **When** se muestra,
   **Then** los datos de GitHub dicen "no aplica" y 3.2 queda "no evaluada" con ese motivo.
6. **Given** un proyecto con datos de CI guardados hace 2 días y una actualización en la que GitHub
   no responde, **When** se actualiza, **Then** 3.2 se evalúa con el dato guardado, se muestra "CI
   de hace 2 días" y el nivel no cambia por la falta de red.

---

### User Story 2 - Visibilidad del repo y su hallazgo (Priority: P2)

El Dueño ve si cada repo es público o privado. El dashboard evalúa el hallazgo de visibilidad
(severidad alta) con dos fuentes estructuradas: la regla de `repo-visibility.md` según el `tipo` del
manifiesto y, desde el estándar 1.2.0, el campo `visibilidad` del frontmatter de `PROJECT.md`, que
registra la decisión del Dueño. Si lo declarado coincide con GitHub, el hallazgo se muestra como
**aceptado**, no como pendiente.

**Why this priority**: un repo de cliente público expone datos que nunca deben ser públicos; es el
hallazgo de más severidad que hoy no se evalúa.

**Independent Test**: con GitHub simulado, proyectos 1.2 con `visibilidad` declarada que coincide,
que no coincide y sin el campo, un `producto-cliente` público y un repo privado consultado sin token;
comprobar la visibilidad y el hallazgo de cada uno.

**Acceptance Scenarios**:

1. **Given** un proyecto `tipo: producto-cliente` con repo público, **When** se actualiza, **Then**
   aparece el hallazgo alto "la visibilidad del repo contradice repo-visibility.md", aunque declare
   `visibilidad: publico` (nunca se muestra como aceptado).
2. **Given** un proyecto 1.2 con `visibilidad: publico` y repo público en GitHub, **When** se
   actualiza, **Then** el hallazgo de visibilidad aparece como "aceptado: declarado en PROJECT.md"
   y no cuenta como pendiente.
3. **Given** un proyecto 1.2 sin el campo `visibilidad`, **When** se actualiza, **Then** aparece el
   hallazgo alto "requiere decisión del Dueño: declara `visibilidad` en PROJECT.md".
4. **Given** un proyecto 1.2 con `visibilidad: privado` cuyo repo es público en GitHub (o al revés),
   **When** se actualiza, **Then** aparece el hallazgo alto "la visibilidad declarada (privado) no
   coincide con GitHub (público)".
5. **Given** un repo privado consultado sin token, **When** se actualiza, **Then** la visibilidad
   dice "no disponible: requiere token" y el hallazgo queda "no evaluado".
6. **Given** un proyecto 1.1 `producto-nexoru` con repo público y sin el campo `visibilidad`,
   **When** se actualiza, **Then** no hay hallazgo de visibilidad y aparece el aviso informativo
   "hay una versión más nueva del estándar (1.2) con reglas más estrictas de CI y visibilidad".

---

### User Story 3 - Pull requests abiertos (Priority: P3)

El Dueño ve, por proyecto, los pull requests abiertos: número, título, antigüedad (días desde que se
abrieron) y estado de la CI de su último commit (éxito, falla, en curso o sin CI).

**Why this priority**: muestra trabajo detenido a medio camino (un PR viejo o con la CI en rojo);
es útil pero no afecta la conformidad.

**Independent Test**: con GitHub simulado, un repo sin PRs, uno con un PR reciente en verde y uno
con un PR de 30 días en rojo; comprobar la lista y el resumen del tablero.

**Acceptance Scenarios**:

1. **Given** un repo con 2 PRs abiertos, **When** el Dueño abre el detalle, **Then** ve cada PR
   con número, título, "abierto hace N días" y el estado de su CI.
2. **Given** un repo sin PRs abiertos, **When** se muestra, **Then** dice "Ninguno".
3. **Given** el tablero, **When** el Dueño lo ve, **Then** cada proyecto muestra cuántos PRs
   abiertos tiene.

---

### User Story 4 - Alertas de secretos abiertas (Priority: P4)

Si el token tiene permiso de lectura de alertas de secret scanning, el Dueño ve cuántas alertas
abiertas tiene cada repo. Si no, el dato queda "no evaluado" con su motivo.

**Why this priority**: complementa el hallazgo crítico de secretos del estándar, pero depende de un
permiso adicional del token y de la configuración del repo.

**Independent Test**: con GitHub simulado, un repo con 2 alertas abiertas, uno con 0, uno al que el
token no tiene permiso y la consulta sin token.

**Acceptance Scenarios**:

1. **Given** un token con el permiso y un repo con 2 alertas abiertas, **When** se actualiza,
   **Then** el proyecto muestra "Alertas de secretos abiertas: 2" como hallazgo crítico.
2. **Given** un repo con 0 alertas abiertas, **When** se actualiza, **Then** muestra "Ninguna".
3. **Given** un token sin el permiso, o sin token, **When** se actualiza, **Then** muestra "no
   evaluado: el token no tiene permiso de lectura de alertas de secretos" o "no evaluado: requiere
   token".

---

### Edge Cases

- **Límite de consultas agotado**: lo que falte queda "no disponible: límite de consultas de GitHub
  agotado; se restablece a las HH:MM"; se conservan los datos anteriores con su fecha si los hay,
  y 3.2 se evalúa con ellos mientras tengan menos de 7 días (FR-015).
- **Sin red o GitHub caído**: "no disponible: sin conexión con GitHub" o "no disponible: error de
  GitHub"; la lectura local termina igual.
- **GitHub lento**: las consultas a GitHub tienen un tiempo máximo de 8 segundos en total; lo que no
  responde a tiempo queda con los datos guardados (FR-015) o "no disponible: tiempo agotado".
- **Repo no encontrado o sin acceso**: GitHub responde igual para un repo privado sin permiso y uno
  que no existe; se muestra "no disponible: el repo no existe o el token no tiene acceso".
- **Token inválido o vencido**: "no disponible: el token de GitHub no es válido"; nunca se muestra
  el token ni parte de él.
- **Datos sin cambios**: una respuesta "sin cambios" (petición condicional) reutiliza los datos
  guardados y no gasta límite.
- **Ejecución de CI en curso**: se muestra "en curso"; 3.2 se evalúa con la última ejecución
  terminada.
- **Sin ejecuciones de CI en la rama principal**: 3.2 falla con "sin ejecuciones de CI en la rama
  principal".
- **Varios workflows**: 3.2 exige que la ejecución más reciente de cada workflow que cumple 3.1 esté
  en verde; la falla nombra los workflows en rojo. Un workflow que no cumple 3.1 se muestra pero no
  cuenta para 3.2.
- **Un workflow de CI sin ejecuciones en la rama principal**: 3.2 falla y lo nombra.
- **Remoto `origin` distinto del `repo` de `PROJECT.md`**: se consulta el de `origin` y se avisa.
- **Proyecto sin `PROJECT.md`** (nivel 0): se muestran los datos de GitHub (CI, visibilidad, PRs) si
  tiene remoto en GitHub, pero 3.2 y el hallazgo de visibilidad no se evalúan (no hay `tipo` ni
  nivel 2).
- **Índice anterior a esta fase**: no tiene datos de GitHub; se muestra "sin datos de GitHub: pulsa
  Actualizar".
- **Relectura automática del índice (más de 10 minutos)**: vuelve a leer lo local pero no consulta
  GitHub; conserva los datos de GitHub anteriores con su fecha.

## Requirements *(mandatory)*

### Functional Requirements

**Cliente de GitHub y seguridad**

- **FR-001**: El sistema DEBE consultar GitHub solo con peticiones de lectura (GET) a la API pública
  de GitHub, hechas por el servidor local. El cliente DEBE rechazar en código cualquier otro método
  y cualquier otro destino, y una prueba DEBE demostrarlo.
- **FR-002**: El token es opcional, fine-grained y de solo lectura, y vive solo en `.env.op.local`,
  el archivo de variables del entorno de uso, ignorado por git. Las pruebas simulan GitHub y NUNCA
  usan un token real ni consultan el GitHub real. La constitución recibe una enmienda PATCH al
  principio II con esta ubicación.
- **FR-003**: El token NUNCA DEBE llegar al navegador, registrarse en logs ni en la bitácora,
  guardarse en la base de datos ni aparecer en pantalla o en mensajes de error. Una prueba DEBE
  comprobar que no aparece en el HTML, en los datos del índice ni en la salida de los logs.
- **FR-004**: Sin token, el sistema DEBE consultar los repos públicos con el límite anónimo; los
  privados quedan "no disponible: requiere token".
- **FR-005**: Las consultas a GitHub se hacen **solo** al pulsar Actualizar, que es un solo botón:
  lee lo local y consulta GitHub a la vez y muestra el resultado cuando ambos terminan. La relectura
  automática del índice (más de 10 minutos) no consulta GitHub.
- **FR-006**: Los datos de GitHub se guardan en el índice regenerable con la fecha de la consulta, y
  el dashboard muestra su antigüedad ("datos de GitHub de hace X").
- **FR-007**: El sistema DEBE usar peticiones condicionales para no gastar límite cuando los datos no
  cambiaron.
- **FR-008**: El sistema DEBE respetar el límite de consultas: si se agota, deja de consultar,
  muestra "no disponible" con la hora en que se restablece y conserva los datos anteriores con su
  fecha.
- **FR-009**: Sin red, con error, con el límite agotado o con tiempo agotado, cada dato afectado
  queda "no disponible" con su motivo. La lectura local NUNCA DEBE bloquearse ni fallar por GitHub:
  las consultas a GitHub tienen un tiempo máximo de 8 segundos en total, de modo que Actualizar
  termina aunque GitHub no responda.
- **FR-010**: Para un remoto que no es de GitHub, o sin remoto, los datos de GitHub dicen "no
  aplica".
- **FR-011**: La política de seguridad de contenido (CSP) NO DEBE cambiar: el navegador nunca se
  conecta a GitHub.
- **FR-012**: El sistema NO DEBE escribir en GitHub, registrar webhooks, crear issues, volver a
  correr workflows ni enviar notificaciones.

**CI y verificación 3.2 (US1)**

- **FR-013**: Por proyecto con remoto en GitHub, el sistema DEBE mostrar el resultado (éxito, falla,
  cancelada, en curso u otro), la fecha y el nombre del workflow de la última ejecución de CI en la
  rama principal, en el detalle y, resumido, en el tablero.
- **FR-014**: El sistema DEBE evaluar la verificación 3.2 con el dato de GitHub: la ejecución más
  reciente ya terminada en la rama principal de **cada** workflow que cumple 3.1 (se dispara con
  `push` y `pull_request`) terminó con éxito (regla del estándar 1.2.0). En proyectos 1.0 y 1.1, 3.2 se evalúa con su propio texto: la última
  ejecución ya terminada de cualquier workflow de CI en la rama principal terminó con éxito. Con 3.2 evaluada, el nivel 3 deja de ser
  provisional; si falla, el proyecto queda en nivel 2 con la falla y su detalle.
- **FR-015**: Si la consulta actual no trae el dato de CI pero hay uno guardado de una consulta
  anterior con menos de 7 días, 3.2 se evalúa con ese dato y se muestra su antigüedad ("CI de hace
  X"). Sin dato guardado, o con uno de 7 días o más, 3.2 queda "no evaluada" con el motivo (p. ej.
  "datos de GitHub de más de 7 días") y el nivel 3 sigue provisional, como en la Fase 3.
- **FR-016**: La Conformidad DEBE contar 3.2 como aplicable solo cuando se evaluó: base 29 con 3.2
  evaluada, base 28 si no.
- **FR-017**: Cuando la base de un proyecto es 29, el dashboard DEBE mostrar junto a su Conformidad,
  en el tablero y en el detalle, el aviso "la base cambió de 28 a 29 por la activación de 3.2".

**Visibilidad (US2)**

- **FR-018**: El sistema DEBE mostrar si cada repo es público o privado.
- **FR-019**: El sistema DEBE evaluar el hallazgo alto de visibilidad del estándar: un repo
  `producto-cliente` público contradice `repo-visibility.md`. En proyectos 1.0 y 1.1 esa es la
  única regla de visibilidad; FR-020 aplica solo a proyectos 1.2.
- **FR-020**: En proyectos 1.2, el sistema DEBE comparar el campo `visibilidad` (`publico` o
  `privado`) del frontmatter con la visibilidad en GitHub: sin el campo, hallazgo alto "requiere
  decisión del Dueño"; declarado y coincide, hallazgo **aceptado** (no cuenta como pendiente),
  salvo en `producto-cliente` con repo público, donde manda FR-019 y el hallazgo sigue alto;
  declarado y no coincide, hallazgo alto por discrepancia. El texto de "Decisiones clave" NO se
  interpreta.

**Pull requests (US3)**

- **FR-021**: El sistema DEBE mostrar los PRs abiertos de cada repo con número, título, antigüedad
  en días y estado de la CI de su último commit (éxito, falla, en curso o sin CI). El título se
  muestra como texto, nunca como HTML.
- **FR-022**: El tablero DEBE mostrar cuántos PRs abiertos tiene cada proyecto.

**Alertas de secretos (US4)**

- **FR-023**: Si el token tiene permiso de lectura de alertas de secret scanning, el sistema DEBE
  mostrar cuántas alertas abiertas tiene cada repo; con una o más, como hallazgo crítico. Nunca
  muestra el secreto ni su ubicación.
- **FR-024**: Sin ese permiso, sin token o si el repo no tiene secret scanning activado, el dato
  queda "no evaluado" con el motivo.

**Versiones del estándar**

- **FR-026**: El dashboard DEBE soportar las versiones 1.0, 1.1 y 1.2 del estándar, con las reglas de
  1.2 tomadas del estándar 1.2.0 publicado en `nexoru-governance` (campo `visibilidad` en el
  manifiesto y regla de 3.2 con varios workflows). La implementación de las reglas 1.2 empieza
  cuando 1.2.0 esté publicado; si su texto difiere de esta spec, manda el estándar y la spec se
  corrige. Cada proyecto se evalúa con las reglas de la versión que declara.
- **FR-028**: Un proyecto que declara una versión soportada anterior a la más reciente (hoy 1.0 o
  1.1) DEBE mostrar, en el detalle y como indicación en el tablero, el aviso informativo "hay una
  versión más nueva del estándar (1.2) con reglas más estrictas de CI y visibilidad". El aviso no
  es hallazgo, no cambia el nivel ni la Conformidad, y el número de versión sale de la versión
  soportada más reciente, no de un texto fijo.

**Documentación**

- **FR-025**: El quickstart DEBE explicar cómo crear el token fine-grained con los permisos mínimos
  de cada historia (metadatos y Actions para US1; metadatos para US2; pull requests y estados de
  commit para US3; alertas de secret scanning para US4), todos de solo lectura y limitados a los
  repos de la organización.
- **FR-027**: El cierre de la fase DEBE incluir una tarea [MANUAL]: declarar `visibilidad` en
  `amazon-business-engine` y `nexoru-op` y subirlos a `version_estandar: "1.2"`, desde la sesión de
  cada proyecto y después de verificar que cumplen la 1.2.

### Key Entities *(include if feature involves data)*

- **Datos de GitHub de un proyecto**: repo consultado (`dueño/nombre`), fecha de la consulta,
  disponibilidad (disponible, no disponible con motivo, no aplica), rama principal, visibilidad,
  última ejecución de CI (resultado, fecha, workflow), PRs abiertos y alertas de secretos abiertas.
  Vive en el índice regenerable.
- **Estado del límite de consultas**: consultas restantes y hora en que se restablece, de la última
  consulta.
- **Validador de caché de GitHub**: identificador de la última respuesta de cada consulta, para las
  peticiones condicionales. Vive en el índice regenerable y no contiene secretos.
- **Visibilidad declarada**: campo `visibilidad` (`publico` o `privado`) del frontmatter de
  `PROJECT.md`, estándar 1.2.0; registra la decisión del Dueño.
- **Hallazgo aceptado**: hallazgo de visibilidad cuya decisión está declarada en `visibilidad` y
  coincide con GitHub; se muestra como aceptado, no como pendiente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tras Actualizar con el portafolio real, el 100 % de los proyectos con remoto en GitHub
  muestra su CI de la rama principal, o "no disponible" con motivo; ninguno queda en blanco.
- **SC-002**: En el portafolio ficticio con GitHub simulado, el 100 % de los datos de GitHub, del
  resultado de 3.2, del nivel y de la Conformidad coincide con el valor esperado calculado a mano.
- **SC-003**: Cero peticiones distintas de lectura a GitHub, cero apariciones del token en el
  navegador, en el índice o en los logs, comprobado por pruebas automáticas.
- **SC-004**: Cero violaciones de la política de seguridad de contenido en todas las pruebas
  end-to-end, con la misma política que en la Fase 3.
- **SC-005**: Sin conexión con GitHub, Actualizar termina en menos de 10 segundos y muestra todos los
  datos locales; con GitHub disponible, termina en menos de 10 segundos para el portafolio real.
- **SC-006**: Una segunda actualización sin cambios en GitHub consume como máximo el 10 % del límite
  de la primera, gracias a las peticiones condicionales.
- **SC-007**: El Dueño distingue en el tablero, en menos de 30 segundos, qué proyectos tienen la CI
  de su rama principal en rojo.

## Assumptions

- La "rama principal" es la rama predeterminada del repo en GitHub.
- El repo que se consulta es el del remoto `origin` de la copia local; solo remotos de `github.com`
  se consideran de GitHub.
- Para cada workflow que cumple 3.1, su "última ejecución" es la más reciente ya terminada en la
  rama principal, disparada por un push; una ejecución en curso se muestra pero no decide 3.2.
- Un workflow de CI sin ejecuciones en la rama principal hace fallar 3.2 (no hay evidencia de
  éxito).
- El estándar 1.2.0 lo publica el Dueño en paralelo, antes de la implementación.
- El estado de la CI de un PR es el combinado de las comprobaciones de su último commit.
- Las alertas de secretos de GitHub complementan, no sustituyen, el hallazgo crítico de `.env*`
  versionados que ya evalúa la Fase 2.
- El reparto del tiempo máximo de 8 segundos entre consultas se fija en el plan, dentro de SC-005.
- Las pruebas nunca consultan el GitHub real: usan un GitHub simulado con datos ficticios.
- Sin token, el límite anónimo (60 consultas por hora) basta para el portafolio actual (6 repos) con
  una actualización; las peticiones condicionales permiten actualizaciones repetidas.
- Si el alcance pone en riesgo la fecha objetivo (2026-11-08), se sacrifica primero US4 y luego US3.
- Fuera de alcance: cualquier escritura en GitHub, webhooks, issues, notificaciones, volver a correr
  workflows, históricos de CI o de PRs, imágenes de GitHub en el navegador y alertas de discrepancia
  (backlog B-012).
