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

## Clarifications

### Session 2026-10-01 (spec inicial)

- Q: ¿De qué ramas sale la actividad de git y el último commit? → A: De todas las ramas locales,
  sin contar dos veces un mismo commit.
- Q: ¿Qué verificaciones cuentan como "aplicables" en la Conformidad? → A: Todas las del estándar
  salvo las que no se pueden evaluar en esta fase (hoy 3.2); las que dependen de otra que falló
  ("Depende de X") cuentan como no cumplidas.
- Q: ¿Cómo cuentan en el Avance las fases con `Estado manual`? → A: No cuentan en el porcentaje
  (solo tareas de fases derivadas), el detalle indica cuántas fases manuales no se incluyeron, y al
  lado se muestra "fases completas: x de y", que sí incluye las manuales.

### Session 2026-10-01 (clarify)

- Q: ¿Los "días sin actividad" se muestran con un semáforo según umbrales, o solo como número? →
  A: Con semáforo: verde hasta 5 días, ámbar de 6 a 15 días y rojo más de 15 días; el número se
  muestra siempre al lado.

### Session 2026-10-01 (ajustes del Dueño antes del plan)

- El dashboard soporta el Estándar de Proyecto Nexoru **1.1.0** (`nexoru-governance`, commit
  `4dfee5b`): estado del roadmap (activo o concluido), los dos hallazgos nuevos de cierre y
  reactivación, la regla de correspondencia de la tabla de costos y `.nexoruignore` (US5).
- El semáforo de actividad se muestra **neutro** (gris, con ícono y texto) en las fases `pausado`,
  `operacion` y `retirado`, conservando el número de días.
- Los dos semáforos (estado declarado y actividad de git) se distinguen visualmente y llevan siempre
  su etiqueta.

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
   **Then** ve la fecha de ese commit y "5 días sin actividad" con el semáforo verde.
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
8. **Given** repos con 6, 15 y 16 días sin actividad, **When** el Dueño abre el portafolio,
   **Then** ve el semáforo ámbar, ámbar y rojo, respectivamente, cada uno con su número.

---

### User Story 5 - Soporte del estándar 1.1 (Priority: P1)

El dashboard evalúa los proyectos que declaran `version_estandar: "1.1"` con las reglas de la 1.1 y
sigue evaluando con la 1.0 a los que declaran "1.0". Muestra si el roadmap de cada proyecto está
**activo** o **concluido**, reporta los dos hallazgos nuevos de cierre y reactivación, y omite por
completo las carpetas listadas en `PROJECTS_ROOT/.nexoruignore`.

**Why this priority**: el estándar ya se publicó (1.1.0, 2026-10-01). Mientras el dashboard no lo
soporte, avisa que el estándar local es más nuevo y no evalúa a los proyectos que se actualicen
(principio XIV). Además, `.nexoruignore` saca del tablero el worktree `nexoru-onboarding-line-endings`.

**Independent Test**: con proyectos ficticios que declaran 1.1, un `.nexoruignore` y roadmaps
activos y concluidos, comprobar el nivel, el estado del roadmap, los hallazgos y las carpetas
omitidas.

**Acceptance Scenarios**:

1. **Given** un proyecto con `version_estandar: "1.1"` y `fase: retirado` sin `fecha_objetivo`,
   **When** el Dueño lo ve, **Then** se evalúa con la 1.1 y esos valores no generan fallas.
2. **Given** un roadmap cuyas fases están todas concluidas, **When** el Dueño lo ve, **Then** el
   roadmap aparece como "concluido"; si alguna fase no lo está, como "activo".
3. **Given** un proyecto 1.1 en `fase: operacion` con una fase pendiente, **When** el Dueño lo ve,
   **Then** aparece el hallazgo medio "`operacion` con fases pendientes en el roadmap".
4. **Given** un proyecto 1.1 en `fase: construccion` con el roadmap concluido, **When** el Dueño lo
   ve, **Then** aparece el hallazgo medio "`construccion` con el roadmap concluido".
5. **Given** un `.nexoruignore` que lista `copia-temporal`, **When** el Dueño abre el portafolio,
   **Then** esa carpeta no aparece en ninguna parte (ni tabla, ni gráficos, ni avisos).
6. **Given** que `nexoru-governance` está en la versión 1.1.0, **When** el Dueño abre el portafolio,
   **Then** ya no ve el aviso de "estándar local más nuevo".

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
3. **Given** un roadmap con 2 fases derivadas (30 de 40 tareas) y 2 fases manuales, una
   `completa`, **When** el Dueño ve el Avance, **Then** ve 75 % ("30 de 40 tareas; 2 fases con
   estado manual no incluidas") y "fases completas: 1 de 4" si ninguna derivada está completa.
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
4. **Given** un proyecto en `fase: operacion` con 40 días sin actividad, **When** el Dueño lo ve,
   **Then** el semáforo de actividad es neutro (gris, ícono y texto propios) y muestra "40 días".
5. **Given** una fila del tablero, **When** el Dueño ve los dos semáforos, **Then** cada uno lleva su
   etiqueta ("Estado declarado", "Actividad") y tienen formas distintas, de modo que no se confunden.

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
- **Worktrees** (como `nexoru-onboarding-line-endings`): si no están en `.nexoruignore`, se leen
  como cualquier repositorio; su historial es el del repositorio compartido.
- **`.nexoruignore`** con líneas vacías, comentarios `#`, carpetas que no existen o nombres con `/`:
  las vacías y los comentarios se ignoran; una carpeta inexistente no tiene efecto; un nombre con
  `/` o comodines no es válido y se ignora.
- **`.nexoruignore` que lista `nexoru-governance`**: el estándar se sigue leyendo para conocer su
  versión (no es un proyecto).
- **Roadmap sin fases**: no está concluido (la definición exige al menos una fase).
- **Gráficos sin datos** (portafolio vacío): mensaje "sin datos" en lugar de un gráfico vacío.

## Requirements *(mandatory)*

### Functional Requirements

**Historial de git (US1)**

- **FR-001**: El sistema DEBE mostrar por proyecto la fecha del último commit y los días sin
  actividad (días completos desde ese commit hasta la fecha de lectura), con el semáforo de
  actividad: **verde** hasta 5 días, **ámbar** de 6 a 15 días y **rojo** más de 15 días, y el número
  siempre al lado. Sin commits o sin repositorio, el dato y el semáforo aparecen como ausentes.
- **FR-002**: El sistema DEBE mostrar el número de commits por semana de las últimas 12 semanas
  (semanas de lunes a domingo, la actual incluida), con 0 en las semanas sin commits. La actividad
  y el último commit (FR-001) cuentan los commits de **todas las ramas locales**, cada commit una
  sola vez.
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

**Estándar 1.1 (US5)**

- **FR-028**: El sistema DEBE soportar las versiones del estándar **1.0 y 1.1** y evaluar cada
  proyecto con las reglas de la versión que declara. En 1.1: `retirado` es un valor permitido de
  `fase` y `fecha_objetivo` no es obligatoria en `retirado`; la tabla de costos usa la
  correspondencia por nombre normalizado (como ya hace con la 1.0).
- **FR-029**: El sistema DEBE mostrar, en el tablero y en el detalle, si el roadmap de cada proyecto
  está **activo** o **concluido**, con las definiciones de `standard/roadmap.md` 1.1: una fase está
  concluida si su estado derivado es `completa` o, sin estado derivado, su `Estado manual` es
  `completa`; el roadmap está concluido si tiene al menos una fase y todas están concluidas. Sin
  roadmap, el dato aparece como ausente.
- **FR-030**: Para los proyectos evaluados con la 1.1, el sistema DEBE reportar los dos hallazgos
  medios de `conformance.md` 1.1: `fase: operacion` con fases pendientes en el roadmap, y
  `fase: construccion` o `especificacion` con el roadmap concluido. No cambian el nivel. A los
  proyectos que declaran 1.0 no se les aplican (principio XIV).
- **FR-031**: El sistema DEBE leer `PROJECTS_ROOT/.nexoruignore` si existe (una carpeta por línea,
  nombre exacto, sin rutas ni comodines; líneas vacías y comentarios `#` ignorados) y omitir esas
  carpetas por completo: no se leen, no se evalúan ni se muestran, ni siquiera como nivel 0. Sin el
  archivo, se evalúan todas las carpetas.

**Indicadores (US2)**

- **FR-009**: El sistema DEBE calcular la **Conformidad** de cada proyecto evaluado como el
  porcentaje de verificaciones cumplidas sobre las aplicables, según `conformance.md` de la versión
  del estándar aplicada, y mostrar cuáles faltan. Son **aplicables** todas las verificaciones del
  estándar salvo las que no se pueden evaluar en esta fase (hoy 3.2); una verificación que depende
  de otra que falló ("Depende de X") cuenta como no cumplida.
- **FR-010**: La Conformidad NO DEBE calcularse para proyectos no evaluados (versión no soportada o
  sin versión); se muestra como ausente con el motivo.
- **FR-011**: El sistema DEBE calcular el **Avance** de cada proyecto a partir de las casillas de
  los `tasks.md` de todas las specs vinculadas en su roadmap: tareas marcadas sobre el total.
- **FR-012**: El Avance DEBE mostrarse como ausente (no como 0 %) si el proyecto no tiene roadmap o
  ninguna fase tiene specs con `tasks.md`.
- **FR-013**: Los dos porcentajes DEBEN llevar siempre su nombre ("Conformidad", "Avance") y su
  base ("25 de 27 verificaciones", "30 de 40 tareas") en el tablero y en el detalle.
- **FR-014**: Las fases sin estado derivado (con `Estado manual`) **no cuentan** en el porcentaje
  de Avance, que usa solo las tareas de las fases derivadas; el detalle indica cuántas fases
  manuales no se incluyeron. Junto al Avance se muestra "fases completas: x de y", que cuenta todas
  las fases del roadmap (derivadas y manuales) cuyo estado mostrado es `completa`.
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
- **FR-032**: El semáforo de actividad DEBE mostrarse **neutro** (gris, con un ícono y un texto
  propios, p. ej. "Sin seguimiento") cuando la `fase` del proyecto es `pausado`, `operacion` o
  `retirado`, y conservar el número de días sin actividad.
- **FR-033**: El semáforo del estado declarado y el de actividad DEBEN distinguirse visualmente
  (forma o ícono distintos además del color) y llevar siempre su etiqueta ("Estado declarado",
  "Actividad") en el tablero, el detalle y los gráficos.
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
  Avance (porcentaje, tareas marcadas, total, fases manuales no incluidas y fases completas x de y);
  cada uno puede estar ausente con su motivo.
- **Semáforo**: tipo (estado declarado o actividad), nivel (verde, ámbar, rojo o neutro), color,
  forma, ícono, texto y etiqueta. El de actividad usa los umbrales de FR-001 y es neutro en
  `pausado`, `operacion` y `retirado`.
- **Estado del roadmap**: activo o concluido, según las definiciones del estándar 1.1.
- **Lista de exclusión del portafolio**: las carpetas de `.nexoruignore`.
- **Documento de diseño**: decisiones visuales con su origen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El Dueño identifica en menos de 30 segundos qué proyectos llevan más de 15 días sin
  actividad (semáforo rojo).
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
- El estándar 1.1.0 es el publicado en `nexoru-governance` el 2026-10-01 (commit `4dfee5b`). Las
  reglas de la 1.1 se implementan como una versión nueva del motor; la 1.0 se conserva para los
  proyectos que la siguen declarando.
