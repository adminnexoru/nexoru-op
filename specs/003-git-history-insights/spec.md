# Feature Specification: Historial de git, indicadores, identidad visual y gráficos del portafolio

**Feature Branch**: `003-git-history-insights`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Fase 3 de Nexoru Op: historial de git, identidad visual e indicadores
del portafolio. P1 — Historial de git (solo lectura): último commit, actividad por semana de las
últimas 12 semanas, días sin actividad, rama actual contra la principal, cambios sin commit y días
en la fase actual derivados del historial de PROJECT.md (cuándo cambió el campo fase), comparados
contra fase_desde. Prohibido git fetch o cualquier comando que escriba en .git; si hace falta
comparar contra el remoto, solo las referencias locales existentes, mostrando su antigüedad.
P2 — Porcentajes con nombres distintos: 'Conformidad' (verificaciones del estándar cumplidas sobre
las aplicables, con el detalle de cuáles faltan) y 'Avance' (tareas marcadas sobre el total de las
specs vinculadas en el roadmap, con una regla definida para las fases con 'Estado manual'), en el
tablero y en el detalle, calculados siempre de los archivos. P3 — Identidad visual (B-010): adoptar
el aspecto de nexoru-onboarding (colores, tipografías, espaciados y componentes, leídos en solo
lectura) y documentar las decisiones en un archivo de diseño; semáforos propios y accesibles con
color, ícono y texto, consistentes en tablero, detalle y gráficos; conversa no adopta este aspecto.
P4 — Gráficos: distribución de semáforos, proyectos por nivel de conformidad, avance por proyecto,
proyectos por fase del ciclo de vida y actividad de git por semana. Librerías gratuitas y
compatibles con la CSP estricta (sin 'unsafe-inline' ni 'unsafe-eval'), verificado por las E2E.
Local, solo lectura, un usuario. Fuera de alcance: GitHub (Fase 4), históricos guardados en la base
de datos y exportar reportes. Si el alcance pone en riesgo la fecha objetivo (2026-10-25), indicarlo
en el plan con una propuesta de qué historias mover."

**Referencias**: constitución v2.0.0 (principios I, VII, XI a XIV); Fase 2
(`specs/002-portfolio-conformance/`), cuyo lector seguro, motor de conformidad e índice se reutilizan;
backlog B-010.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la actividad de git de cada proyecto (Priority: P1)

El Dueño ve, para cada proyecto, cuándo fue el último commit, cuántos días lleva sin actividad,
cuántos commits hubo cada semana de las últimas 12, cuánto adelanta o atrasa la rama actual respecto
a la principal, si hay cambios sin commit y cuántos días lleva el proyecto en su fase actual según
el historial de `PROJECT.md`, comparado con el `fase_desde` que declara. Todo sale del repositorio
local, sin conectarse a la red ni modificar nada.

**Why this priority**: distingue los proyectos vivos de los abandonados y detecta un `fase_desde`
desactualizado; es el dato que más cambia y que hoy el Dueño no ve.

**Independent Test**: con repos ficticios con commits de fechas conocidas, comprobar los números
de último commit, semanas, días sin actividad, adelanto/atraso y días en la fase.

**Acceptance Scenarios**:

1. **Given** un repo cuyo último commit fue hace 5 días, **When** el Dueño abre el portafolio,
   **Then** ve la fecha de ese commit y "5 días sin actividad".
2. **Given** un repo con commits en 3 de las últimas 12 semanas, **When** el Dueño abre el
   detalle, **Then** ve las 12 semanas con su número de commits y 0 en las semanas sin commits.
3. **Given** una rama actual con 2 commits que la principal no tiene y 3 que no tiene ella,
   **When** el Dueño abre el detalle, **Then** ve "2 adelante, 3 atrás" respecto a la principal.
4. **Given** que la referencia local de la rama remota se actualizó por última vez hace 40 días,
   **When** el Dueño la ve, **Then** el dato indica su antigüedad ("referencia local de hace 40
   días"), porque el dashboard no la actualiza.
5. **Given** un `PROJECT.md` cuyo campo `fase` cambió a `construccion` en un commit del
   2026-09-26, con `fase_desde: 2026-09-26`, **When** el Dueño abre el detalle, **Then** ve los días
   en la fase contados desde ese commit y que coincide con `fase_desde`.
6. **Given** que el historial dice que la fase cambió el 2026-09-20 pero `fase_desde` dice
   2026-09-26, **When** el Dueño abre el detalle, **Then** ve las dos fechas y el aviso de que no
   coinciden.
7. **Given** una carpeta que no es repositorio git, **When** el Dueño la ve, **Then** todos los
   datos de git aparecen como ausentes, con el motivo.

---

### User Story 2 - Conformidad y Avance como porcentajes (Priority: P2)

En el tablero y en el detalle, el Dueño ve dos porcentajes con nombres distintos que nunca se
confunden: **Conformidad**, que dice qué parte del estándar cumple el proyecto, y **Avance**, que
dice qué parte del trabajo planeado en su roadmap está hecha. Cada uno muestra cómo se calculó.

**Why this priority**: resume en un número lo que hoy requiere abrir el detalle; depende del
motor de conformidad y del roadmap ya construidos.

**Independent Test**: con proyectos ficticios de verificaciones y tareas conocidas, comprobar que
los porcentajes y su detalle coinciden con el cálculo a mano.

**Acceptance Scenarios**:

1. **Given** un proyecto con 25 de 27 verificaciones aplicables cumplidas, **When** el Dueño lo
   ve, **Then** su Conformidad es 93 % y el detalle nombra las 2 que faltan.
2. **Given** un roadmap con 30 de 40 tareas marcadas en sus specs vinculadas, **When** el Dueño lo
   ve, **Then** su Avance es 75 %, con "30 de 40 tareas".
3. **Given** un roadmap con fases de `Estado manual`, **When** el Dueño ve el Avance, **Then** se
   aplica la regla de FR-014 y el detalle explica cómo cuentan esas fases.
4. **Given** un proyecto sin `PROJECT.md`, con una versión del estándar no soportada o sin roadmap,
   **When** el Dueño lo ve, **Then** el porcentaje que no se puede calcular aparece como ausente,
   con el motivo; nunca como 0 %.

---

### User Story 3 - Identidad visual de Nexoru y semáforos accesibles (Priority: P3)

Nexoru Op adopta el aspecto de `nexoru-onboarding` (colores, tipografías, espaciados y
componentes). Las decisiones quedan escritas en un documento de diseño de `nexoru-op`. El estado de
cada proyecto (verde, ámbar, rojo) y los demás indicadores se muestran con un semáforo propio que
combina color, ícono y texto, igual en el tablero, el detalle y los gráficos.

**Why this priority**: mejora la lectura y unifica la marca, pero no cambia los datos.

**Independent Test**: comparar el documento de diseño con los estilos de `nexoru-onboarding`, y
comprobar en la interfaz que ningún semáforo depende solo del color.

**Acceptance Scenarios**:

1. **Given** el documento de diseño, **When** el Dueño lo revisa, **Then** encuentra los colores,
   tipografías, espaciados y componentes tomados de `nexoru-onboarding`, con su origen.
2. **Given** un proyecto en estado `ambar`, **When** el Dueño lo ve en el tablero, el detalle o un
   gráfico, **Then** el semáforo muestra el mismo color, el mismo ícono y el texto "Ámbar".
3. **Given** que el Dueño ve la pantalla en escala de grises, **When** compara semáforos, **Then**
   los distingue por su ícono y su texto.

---

### User Story 4 - Gráficos del portafolio (Priority: P4)

El tablero incluye gráficos de: distribución de semáforos, proyectos por nivel de conformidad,
Avance por proyecto, proyectos por fase del ciclo de vida y actividad de git por semana de todo el
portafolio.

**Why this priority**: da la vista de conjunto, pero se construye sobre los datos de US1 y US2.

**Independent Test**: con el portafolio ficticio, comprobar que cada gráfico suma lo mismo que la
tabla y que no hay violaciones de la política de seguridad de contenido.

**Acceptance Scenarios**:

1. **Given** el portafolio ficticio, **When** el Dueño abre el tablero, **Then** cada gráfico
   muestra los mismos totales que la tabla (por ejemplo, tantos proyectos por nivel como filas con
   ese nivel).
2. **Given** cualquier gráfico, **When** el Dueño lo lee, **Then** cada valor también está en texto
   (etiqueta o tabla equivalente), no solo como forma o color.
3. **Given** que se cargan los gráficos, **When** el navegador aplica la política de seguridad de
   contenido, **Then** no hay ninguna violación.

---

### Edge Cases

- **Repo sin commits** (recién creado): último commit y actividad ausentes; "sin commits".
- **HEAD separado**: el adelanto/atraso se calcula desde el commit actual y se indica "HEAD
  separado".
- **Rama principal desconocida o sin referencia local**: adelanto/atraso ausente con el motivo.
- **`PROJECT.md` que nunca se versionó** o sin cambios del campo `fase` en el historial: días en la
  fase ausentes ("sin historial de la fase"); se muestra solo `fase_desde`.
- **Cambios de `fase` que solo están en el disco, sin commit**: el historial no los ve; se indica
  que hay cambios sin commit en `PROJECT.md`.
- **Fechas de commit en el futuro** (reloj mal configurado): se muestran tal cual, con aviso.
- **Proyectos con muchos commits** (decenas de miles): el cálculo se limita a lo necesario (las
  últimas 12 semanas y el último commit) y no supera los límites de tiempo de la lectura.
- **Worktrees** (como `nexoru-onboarding-line-endings`): se leen como cualquier repositorio; su
  historial es el del repositorio compartido.
- **Gráficos sin datos** (portafolio vacío): mensaje "sin datos" en lugar de un gráfico vacío.

## Requirements *(mandatory)*

### Functional Requirements

**Historial de git (US1)**

- **FR-001**: El sistema DEBE mostrar por proyecto la fecha del último commit y los días sin
  actividad (días completos desde ese commit hasta la fecha de lectura).
- **FR-002**: El sistema DEBE mostrar el número de commits por semana de las últimas 12 semanas
  (semanas de lunes a domingo, la actual incluida), con 0 en las semanas sin commits.
  [NEEDS CLARIFICATION: ¿la actividad y el último commit cuentan los commits de todas las ramas
  locales, solo de la rama principal o solo de la rama actual?]
- **FR-003**: El sistema DEBE mostrar cuántos commits adelanta y atrasa la rama actual respecto a
  la rama principal, usando solo referencias locales.
- **FR-004**: Cuando el dato use una referencia local de una rama remota, el sistema DEBE mostrar
  su antigüedad (cuándo se actualizó por última vez en esta máquina), porque nunca la actualiza.
- **FR-005**: El sistema DEBE seguir mostrando la rama actual y los cambios sin commit (Fase 2).
- **FR-006**: El sistema DEBE derivar del historial de `PROJECT.md` la fecha del último commit que
  cambió el valor del campo `fase`, mostrar los días en la fase desde esa fecha y compararla con
  `fase_desde`, avisando si no coinciden.
- **FR-007**: El sistema NO DEBE ejecutar `git fetch`, `pull` ni ningún comando que contacte la red
  o escriba en `.git`. Toda consulta de git es de solo lectura, sin shell y con argumentos fijos o
  validados (principio XIII).
- **FR-008**: Si un dato de git no se puede obtener, DEBE mostrarse como ausente con el motivo
  (FR-009 de la Fase 2).

**Indicadores (US2)**

- **FR-009**: El sistema DEBE calcular la **Conformidad** de cada proyecto evaluado como el
  porcentaje de verificaciones cumplidas sobre las aplicables, según `conformance.md` de la versión
  del estándar aplicada, y mostrar cuáles faltan.
  [NEEDS CLARIFICATION: ¿qué verificaciones cuentan como "aplicables": todas las del estándar salvo
  las que no se pueden evaluar en esta fase (3.2), o también se excluyen las que dependen de otra
  que falló ("Depende de X")?]
- **FR-010**: La Conformidad NO DEBE calcularse para proyectos no evaluados (versión no soportada o
  sin versión); se muestra como ausente con el motivo.
- **FR-011**: El sistema DEBE calcular el **Avance** de cada proyecto a partir de las casillas de
  los `tasks.md` de todas las specs vinculadas en su roadmap: tareas marcadas sobre el total.
- **FR-012**: El Avance DEBE mostrarse como ausente (no como 0 %) si el proyecto no tiene roadmap o
  ninguna fase tiene specs con `tasks.md`.
- **FR-013**: Los dos porcentajes DEBEN llevar siempre su nombre ("Conformidad", "Avance") y su
  base ("25 de 27 verificaciones", "30 de 40 tareas") en el tablero y en el detalle.
- **FR-014**: Regla de Avance para fases con `Estado manual`.
  [NEEDS CLARIFICATION: ¿cómo cuentan en el Avance las fases sin estado derivado (con `Estado
  manual`)?]
- **FR-015**: Los porcentajes se redondean a entero y se calculan en cada lectura del portafolio;
  nunca se capturan a mano (principio XI).

**Identidad visual (US3)**

- **FR-016**: Nexoru Op DEBE adoptar los colores, tipografías, espaciados y estilos de componentes
  de `nexoru-onboarding`, leídos de sus archivos en solo lectura durante el desarrollo.
- **FR-017**: Las decisiones de diseño DEBEN quedar en un documento de diseño dentro de `nexoru-op`,
  con el origen de cada decisión en `nexoru-onboarding` y las adaptaciones propias.
- **FR-018**: El estado del proyecto y los demás indicadores con niveles DEBEN usar un semáforo que
  combine color, ícono y texto; ninguno puede depender solo del color.
- **FR-019**: Los colores del semáforo DEBEN tener contraste suficiente para leerse sobre el fondo
  (nivel AA de las pautas de accesibilidad web) en modo claro.
- **FR-020**: El semáforo DEBE verse igual en el tablero, el detalle y los gráficos.
- **FR-021**: `conversa-experiencias` no se modifica; esta identidad solo cambia `nexoru-op`.

**Gráficos (US4)**

- **FR-022**: El tablero DEBE incluir cinco gráficos: distribución de semáforos (estado), proyectos
  por nivel de conformidad, Avance por proyecto, proyectos por fase del ciclo de vida y actividad
  de git por semana (suma del portafolio, últimas 12 semanas).
- **FR-023**: Cada gráfico DEBE tener una alternativa en texto con los mismos valores.
- **FR-024**: Los totales de cada gráfico DEBEN coincidir con los de la tabla del portafolio.

**Restricciones**

- **FR-025**: Toda librería nueva DEBE ser gratuita y funcionar con la política de seguridad de
  contenido actual, sin relajarla; las pruebas end-to-end DEBEN fallar ante cualquier violación.
- **FR-026**: No se guardan históricos en la base de datos: los datos de git y los porcentajes son
  parte del índice regenerable (principio XI).
- **FR-027**: Las pruebas usan solo el portafolio ficticio, ampliado con repos de historial
  conocido, y nunca el `PROJECTS_ROOT` real.

### Key Entities *(include if feature involves data)*

- **Historial de git del proyecto**: último commit (fecha), días sin actividad, commits por semana
  (12 valores), adelanto y atraso respecto a la principal, antigüedad de la referencia remota local,
  fecha del último cambio de fase según el historial, días en la fase y si coincide con
  `fase_desde`.
- **Indicadores**: Conformidad (porcentaje, cumplidas, aplicables, lista de las que faltan) y
  Avance (porcentaje, tareas marcadas, total y cómo cuentan las fases manuales); cada uno puede estar
  ausente con su motivo.
- **Semáforo**: nivel (por ejemplo verde, ámbar, rojo), color, ícono y texto.
- **Documento de diseño**: decisiones visuales con su origen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El Dueño identifica en menos de 30 segundos qué proyectos llevan más de 14 días sin
  actividad.
- **SC-002**: En el portafolio ficticio, el 100 % de los datos de git, Conformidad y Avance coinciden
  con el valor calculado a mano.
- **SC-003**: Ningún semáforo ni gráfico depende solo del color: en escala de grises el Dueño
  distingue todos los estados.
- **SC-004**: Cero violaciones de la política de seguridad de contenido en todas las pruebas
  end-to-end.
- **SC-005**: La lectura del portafolio, ahora con historial de git, sigue por debajo de 10 segundos
  para 50 proyectos, y el tablero con gráficos abre en menos de 2 segundos desde el índice.
- **SC-006**: Tras una lectura, ningún archivo de `PROJECTS_ROOT`, incluido `.git`, cambió.

## Assumptions

- "Semáforo" del estado del proyecto es el campo `estado` del manifiesto (`verde`, `ambar`,
  `rojo`); otros indicadores pueden usar el mismo componente con sus propios niveles.
- La rama principal es la de la Fase 2 (la que `origin` marca como principal; si no se sabe,
  `main`).
- Las fechas se muestran en la zona horaria de la máquina del Dueño; las semanas empiezan en lunes.
- La identidad visual se toma de `nexoru-onboarding` tal como está en su rama actual en disco al
  hacer el diseño; cambios posteriores en `nexoru-onboarding` no se propagan solos.
- El historial de `fase` usa solo commits; los cambios sin commit de `PROJECT.md` no cuentan.
- Sin conexión a GitHub en esta fase (Fase 4).
