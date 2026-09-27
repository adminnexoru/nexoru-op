# Feature Specification: Acceso seguro y administración de usuarios

**Feature Branch**: `001-user-access`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "Acceso seguro y administración de usuarios para op.nexoru.ai. Quién lo usa: yo (dueño) y, a futuro, colaboradores que contrate. Necesito: Inicio de sesión con correo y contraseña, más segundo factor con app autenticadora (TOTP), obligatorio para todos. El primer usuario es admin@nexoru.ai con rol Dueño. Roles: Dueño (todo), Administrador (gestiona usuarios y contenido, no puede afectar al Dueño), Colaborador (edita solo lo asignado) y Lector (solo consulta). Módulo de usuarios: invitar por correo, asignar rol, dar de baja (desactivar sin borrar historial), reactivar, y forzar reinicio de contraseña y de segundo factor. Recuperación de contraseña por correo. Cierre de sesión por inactividad. Bitácora de auditoría consultable: quién hizo qué y cuándo (inicios de sesión, intentos fallidos, altas, bajas, cambios de rol). Sin registro público: nadie crea cuenta sin invitación. Fuera de alcance: login con Google, facturación y módulos de negocio."

## Clarifications

### Session 2026-09-26

- Q: ¿Puede un Administrador gestionar a otros Administradores? → A: No. Solo el Dueño gestiona
  Administradores; un Administrador gestiona únicamente Colaboradores y Lectores (FR-013, FR-015).
- Q: ¿Cuántos minutos sin actividad antes de cerrar la sesión automáticamente? → A: 30 minutos
  (FR-007).
- Q: ¿Cuántos intentos fallidos seguidos antes de bloquear, y por cuánto tiempo? → A: 5 intentos;
  bloqueo temporal de 15 minutos (FR-005).
- Q: Si un usuario pierde el teléfono con su autenticador, ¿cómo recupera el acceso? → A: Con un
  código de recuperación, tras lo cual debe registrar un autenticador nuevo (el anterior se
  invalida y se le avisa por correo). Sin códigos: reinicio forzado del 2FA por el Dueño o un
  Administrador según sus permisos. El Dueño sin códigos: procedimiento manual documentado
  (FR-003, FR-003a, FR-023).
- Q: ¿Qué parte de la bitácora puede ver un Administrador? → A: Sus propios eventos y los de
  Colaboradores y Lectores; no ve los del Dueño ni los de otros Administradores (FR-029a).
- Q: ¿Debe el sistema avisar por correo al usuario cuando cambia algo sensible de su cuenta?
  → A: Sí, al usuario afectado: cambio de contraseña, registro o reinicio de 2FA, uso de código
  de recuperación, cambio de rol, bloqueo por intentos fallidos, baja y reactivación (FR-031a).

### Session 2026-09-26 (revisión de tasks)

- Q: ¿El bloqueo por intentos fallidos se aplica a la cuenta o a la cuenta desde una IP? → A: A la
  combinación correo + IP. El correo del Dueño es público: con un bloqueo por cuenta, cualquiera
  podría dejarlo fuera fallando 5 veces a propósito. El mensaje de bloqueo es genérico e idéntico
  exista o no la cuenta (FR-005, FR-006, SC-010).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inicio de sesión con segundo factor obligatorio (Priority: P1)

El Dueño (admin@nexoru.ai) entra a op.nexoru.ai con su correo y contraseña y, a continuación,
con un código de su app autenticadora. La primera vez configura la contraseña y registra la app
autenticadora escaneando un código; a partir de ahí, cada inicio de sesión exige ambos factores.
Si la sesión queda inactiva, el sistema la cierra y pide volver a autenticarse. El usuario
también puede cerrar sesión manualmente.

**Why this priority**: sin acceso seguro no existe el sistema; es la base de todos los módulos
futuros y el primer requisito de la constitución (principio I).

**Independent Test**: con solo esta historia, el Dueño puede activar su cuenta, registrar el
segundo factor, iniciar y cerrar sesión, y el sistema rechaza cualquier acceso sin ambos
factores.

**Acceptance Scenarios**:

1. **Given** la cuenta del Dueño está provisionada y sin activar, **When** el Dueño sigue el
   enlace de activación, define su contraseña y registra su app autenticadora con un código
   válido, **Then** la cuenta queda activa, recibe sus códigos de recuperación y entra al
   sistema.
2. **Given** un usuario activo con segundo factor registrado, **When** introduce correo y
   contraseña correctos y un código TOTP válido, **Then** accede al sistema.
3. **Given** un usuario activo, **When** introduce correo y contraseña correctos pero un código
   TOTP incorrecto o caducado, **Then** no accede y el intento fallido queda en la bitácora.
4. **Given** un usuario que introdujo correo y contraseña correctos, **When** intenta abrir
   cualquier pantalla interna sin completar el segundo factor, **Then** el sistema lo devuelve al
   paso del segundo factor.
5. **Given** una sesión abierta, **When** pasan 30 minutos sin actividad, **Then** la sesión se
   cierra y el usuario debe autenticarse de nuevo con ambos factores.
6. **Given** credenciales incorrectas, **When** se intenta iniciar sesión, **Then** el mensaje
   de error no revela si el correo existe ni cuál de los datos falló.
7. **Given** 5 intentos fallidos consecutivos sobre un correo desde una misma IP, **When** se
   hace un sexto intento desde esa IP, **Then** se rechaza durante 15 minutos aunque los datos
   sean correctos, con un mensaje genérico que no revela si la cuenta existe, y el bloqueo queda
   en la bitácora.
8. **Given** un bloqueo vigente sobre el correo del Dueño desde la IP de un tercero, **When** el
   Dueño inicia sesión desde otra IP con sus datos correctos, **Then** accede con normalidad.
9. **Given** un usuario que perdió su app autenticadora y conserva sus códigos de recuperación,
   **When** introduce correo, contraseña y un código de recuperación válido, **Then** el sistema
   le exige registrar un autenticador nuevo antes de dar acceso, invalida el anterior y el código
   usado, y le envía un correo de aviso.

---

### User Story 2 - Invitar usuarios y asignar roles (Priority: P2)

El Dueño (o un Administrador) invita a una persona por correo indicando su rol. La persona
recibe un enlace de invitación de un solo uso, define su contraseña, registra su app
autenticadora y entra con los permisos de su rol. No existe forma de crear una cuenta sin
invitación.

**Why this priority**: es lo que permite que colaboradores contratados usen el sistema; sin
invitaciones solo existe el Dueño.

**Independent Test**: el Dueño invita a un Lector y a un Administrador; ambos activan su cuenta
y cada uno ve y puede hacer exactamente lo que su rol permite.

**Acceptance Scenarios**:

1. **Given** el Dueño en el módulo de usuarios, **When** invita a un correo nuevo con rol
   Lector, **Then** se envía un correo con un enlace de invitación y el usuario aparece como
   "Invitado".
2. **Given** una invitación vigente, **When** la persona abre el enlace, define contraseña y
   registra su segundo factor, **Then** su cuenta pasa a "Activo" con el rol asignado.
3. **Given** una invitación caducada (más de 7 días) o ya usada, **When** alguien abre el enlace,
   **Then** el sistema la rechaza y ofrece pedir una nueva invitación al administrador.
4. **Given** un visitante sin invitación, **When** busca una página de registro, **Then** no
   existe ninguna forma de crear una cuenta.
5. **Given** un Administrador, **When** intenta invitar a alguien con rol Dueño o
   Administrador, **Then** el sistema no ofrece esa opción ni la acepta.
6. **Given** el Dueño, **When** cambia el rol de un usuario activo, **Then** los nuevos permisos
   aplican desde la siguiente acción del usuario y el cambio queda en la bitácora.
7. **Given** una invitación pendiente, **When** el Dueño o un Administrador la revoca o la
   reenvía, **Then** el enlace anterior deja de funcionar.

---

### User Story 3 - Dar de baja, reactivar y forzar reinicios (Priority: P3)

El Dueño o un Administrador desactiva a un usuario que ya no debe entrar, conservando todo su
historial; puede reactivarlo más tarde. También puede obligar a un usuario a cambiar su
contraseña o a registrar de nuevo su segundo factor (por ejemplo, si perdió el teléfono).

**Why this priority**: necesario en cuanto haya más de un usuario, pero el sistema es útil sin
ello mientras solo exista el Dueño.

**Independent Test**: el Dueño desactiva a un usuario de prueba, comprueba que ya no puede
entrar y que su historial sigue visible; lo reactiva y el usuario vuelve a entrar.

**Acceptance Scenarios**:

1. **Given** un usuario activo con sesión abierta, **When** el Dueño lo da de baja, **Then** su
   sesión se cierra de inmediato, no puede volver a entrar y su historial en la bitácora se
   conserva.
2. **Given** un usuario dado de baja, **When** el Dueño lo reactiva, **Then** puede volver a
   entrar con sus credenciales y segundo factor existentes y con el mismo rol que tenía.
3. **Given** un usuario activo, **When** un Administrador fuerza el reinicio de contraseña,
   **Then** sus sesiones se cierran y recibe por correo un enlace para definir una contraseña
   nueva; no puede entrar hasta hacerlo.
4. **Given** un usuario activo, **When** un Administrador fuerza el reinicio del segundo factor,
   **Then** sus sesiones se cierran y en el siguiente inicio de sesión debe registrar de nuevo
   su app autenticadora antes de acceder.
5. **Given** un Administrador, **When** intenta dar de baja, cambiar el rol o forzar reinicios
   sobre el Dueño u otro Administrador, **Then** el sistema no ofrece esas acciones y las
   rechaza si se intentan.
6. **Given** cualquier usuario, **When** intenta darse de baja a sí mismo o quitarse su propio
   rol de Dueño, **Then** el sistema lo impide (siempre existe un Dueño activo).

---

### User Story 4 - Recuperación de contraseña por correo (Priority: P4)

Un usuario que olvidó su contraseña pide un enlace de recuperación desde la pantalla de inicio,
recibe un correo y define una contraseña nueva. El segundo factor sigue siendo obligatorio para
entrar.

**Why this priority**: reduce la dependencia del administrador para un problema frecuente, pero
un Administrador puede cubrirlo mientras tanto forzando el reinicio de contraseña.

**Independent Test**: un usuario solicita recuperación, recibe el correo, define contraseña
nueva y entra con ella más su código TOTP; la contraseña anterior deja de funcionar.

**Acceptance Scenarios**:

1. **Given** un usuario activo, **When** solicita recuperación con su correo, **Then** recibe un
   enlace de un solo uso válido durante 1 hora.
2. **Given** un correo que no pertenece a ningún usuario activo, **When** se solicita
   recuperación, **Then** el sistema muestra el mismo mensaje que para un correo válido y no
   envía nada.
3. **Given** un enlace de recuperación válido, **When** el usuario define una contraseña nueva,
   **Then** todas sus sesiones abiertas se cierran y debe entrar con la contraseña nueva y su
   segundo factor.
4. **Given** un usuario dado de baja, **When** solicita recuperación, **Then** no recibe ningún
   enlace.
5. **Given** un usuario con sesión completa, **When** cambia su contraseña desde "Mi cuenta"
   indicando la actual, **Then** sus otras sesiones se cierran, la actual sigue abierta y recibe
   el aviso por correo.

---

### User Story 5 - Consulta de la bitácora de auditoría (Priority: P5)

El Dueño o un Administrador consulta la bitácora para saber quién hizo qué y cuándo: inicios de
sesión, intentos fallidos, bloqueos, invitaciones, altas, bajas, reactivaciones, cambios de rol
y reinicios forzados. Puede filtrar por usuario, tipo de evento y rango de fechas.

**Why this priority**: los eventos se registran desde la historia 1; esta historia añade la
pantalla para consultarlos.

**Independent Test**: tras realizar varias acciones de las historias anteriores, el Dueño abre
la bitácora, filtra por un usuario y ve cada evento con autor, acción, objetivo y fecha.

**Acceptance Scenarios**:

1. **Given** varios eventos registrados, **When** el Dueño abre la bitácora, **Then** ve los
   eventos del más reciente al más antiguo con fecha y hora, autor, acción, usuario afectado y
   resultado.
2. **Given** la bitácora, **When** se filtra por usuario, tipo de evento o rango de fechas,
   **Then** solo aparecen los eventos que cumplen el filtro.
3. **Given** un Colaborador o Lector, **When** intenta abrir la bitácora, **Then** el sistema se
   lo impide.
4. **Given** cualquier usuario, incluido el Dueño, **When** intenta modificar o borrar un
   evento de la bitácora, **Then** el sistema no lo permite.
5. **Given** un Administrador, **When** consulta la bitácora o filtra por el Dueño u otro
   Administrador, **Then** no ve ningún evento del Dueño ni de otros Administradores, pero sí
   los suyos y los de Colaboradores y Lectores.

---

### Edge Cases

- **Usuario pierde su app autenticadora**: entra con un código de recuperación (FR-003a). Si
  tampoco tiene los códigos, pide el reinicio forzado del 2FA (FR-023): al Dueño si es
  Administrador; al Dueño o a un Administrador si es Colaborador o Lector.
- **Dueño pierde su app autenticadora**: nadie puede reiniciar el segundo factor del Dueño, así
  que recupera el acceso con un código de recuperación (FR-003a). Si pierde también los
  códigos, la recuperación es un procedimiento manual fuera de la aplicación, que DEBE quedar
  documentado en el repositorio como parte de esta feature (no automatizado).
- **Últimos códigos de recuperación**: cuando a un usuario le quedan 2 códigos o menos, el
  sistema se lo indica al iniciar sesión y le sugiere regenerarlos.
- **Invitación a un correo ya existente**: si el correo pertenece a un usuario activo o dado de
  baja, el sistema no crea otra cuenta y lo indica; para uno dado de baja se ofrece reactivarlo.
- **Usuario dado de baja con invitación o enlace de recuperación pendiente**: todos sus enlaces
  pendientes quedan invalidados al darlo de baja.
- **Cambio de rol con sesión abierta**: los permisos se reevalúan en cada acción; no hace falta
  volver a iniciar sesión para que el cambio aplique.
- **Código TOTP reutilizado**: un código ya usado no se acepta de nuevo dentro de su ventana de
  validez.
- **Reloj del teléfono desfasado**: se acepta el código del intervalo inmediatamente anterior y
  posterior; fuera de eso se rechaza.
- **Intentos fallidos de un tercero sobre el correo del Dueño**: el bloqueo afecta solo a la IP
  del tercero. El Dueño sigue entrando desde la suya (FR-005, SC-010) y recibe el aviso de
  bloqueo.
- **Ataque desde muchas IP**: cada IP tiene su propio contador, así que un atacante con muchas
  IP puede hacer más intentos en total. Lo contienen el segundo factor obligatorio y los límites
  de velocidad del servidor de autenticación (riesgo documentado en el plan).
- **Actividad en varias pestañas**: la actividad en cualquier pestaña cuenta para el temporizador
  de inactividad.

## Requirements *(mandatory)*

### Functional Requirements

**Autenticación**

- **FR-001**: El sistema DEBE autenticar a los usuarios con correo y contraseña seguidos de un
  código TOTP de una app autenticadora. Ningún usuario puede acceder sin completar ambos
  factores.
- **FR-002**: El sistema DEBE exigir el registro del segundo factor al activar la cuenta y
  después de un reinicio forzado del segundo factor, antes de dar acceso a cualquier pantalla
  interna.
- **FR-003**: El sistema DEBE entregar 10 códigos de recuperación de un solo uso al registrar el
  segundo factor, mostrarlos una única vez y permitir regenerarlos (invalidando los anteriores)
  a cada usuario sobre su propia cuenta.
- **FR-003a**: Un código de recuperación DEBE poder usarse en lugar del código TOTP. Al usarlo,
  el sistema DEBE exigir registrar un autenticador nuevo antes de dar acceso, invalidar el
  autenticador anterior y el código usado, y enviar al usuario un correo de aviso.
- **FR-004**: Las contraseñas DEBEN tener al menos 12 caracteres y NO DEBEN coincidir con
  contraseñas conocidas como comprometidas.
- **FR-005**: Los intentos fallidos (contraseña, código TOTP o código de recuperación) DEBEN
  contarse por la combinación **correo + dirección IP**. Tras 5 fallos consecutivos de un mismo
  correo desde una misma IP, los intentos de ese correo desde esa IP DEBEN rechazarse durante
  15 minutos. Los intentos desde otras IP no se ven afectados. El conteo se aplica igual a
  correos que no pertenecen a ningún usuario, para que el comportamiento sea idéntico (FR-006).
- **FR-006**: Los mensajes de error de inicio de sesión y recuperación, **incluido el de
  bloqueo**, NO DEBEN revelar si un correo está registrado: el texto es genérico e idéntico en
  todos los casos.
- **FR-007**: El sistema DEBE cerrar la sesión tras 30 minutos sin actividad y, en cualquier
  caso, a las 12 horas de haberse iniciado.
- **FR-008**: Los usuarios DEBEN poder cerrar sesión manualmente.

**Registro e invitaciones**

- **FR-009**: El sistema NO DEBE ofrecer registro público; solo se crean cuentas a partir de una
  invitación.
- **FR-010**: La cuenta admin@nexoru.ai DEBE existir con rol Dueño antes del primer uso,
  pendiente de activación (contraseña y segundo factor).
- **FR-011**: El Dueño y los Administradores DEBEN poder invitar por correo indicando el rol.
  La invitación es de un solo uso y caduca a los 7 días.
- **FR-012**: El Dueño y los Administradores DEBEN poder revocar y reenviar invitaciones
  pendientes; reenviar invalida el enlace anterior.

**Roles y permisos**

- **FR-013**: El sistema DEBE soportar exactamente cuatro roles:
  - **Dueño**: todos los permisos. Existe exactamente un Dueño y siempre está activo.
  - **Administrador**: gestiona Colaboradores, Lectores y contenido; no puede realizar ninguna
    acción de gestión sobre el Dueño ni sobre otros Administradores, ni asignar los roles Dueño o
    Administrador.
  - **Colaborador**: consulta y edita solo los elementos que se le asignen.
  - **Lector**: solo consulta; no puede crear, modificar ni borrar nada.
- **FR-014**: Un Administrador NO DEBE poder dar de baja, cambiar el rol ni forzar reinicios
  sobre el Dueño, ni asignar el rol Dueño a nadie.
- **FR-015**: Solo el Dueño DEBE poder gestionar Administradores: invitar con rol
  Administrador, asignar o quitar ese rol, dar de baja, reactivar y forzar reinicios sobre un
  Administrador. Un Administrador solo gestiona Colaboradores y Lectores, y no puede promover a
  nadie a Administrador.
- **FR-016**: Los permisos DEBEN comprobarse en cada acción, de modo que un cambio de rol o una
  baja surtan efecto sin esperar a un nuevo inicio de sesión.
- **FR-017**: Ningún usuario DEBE poder darse de baja a sí mismo ni cambiar su propio rol.

**Gestión de usuarios**

- **FR-018**: El módulo de usuarios DEBE listar a todos los usuarios con correo, rol, estado
  (Invitado, Activo, Bloqueado temporalmente, Dado de baja) y fecha del último acceso.
  "Bloqueado temporalmente" significa que el correo tiene al menos un bloqueo vigente desde
  alguna IP.
- **FR-019**: El Dueño y los Administradores DEBEN poder cambiar el rol de un usuario, dentro de
  los límites de FR-014 y FR-015.
- **FR-020**: Dar de baja DEBE impedir el acceso, cerrar de inmediato todas las sesiones del
  usuario e invalidar sus enlaces pendientes, sin borrar el usuario ni su historial.
- **FR-021**: Reactivar DEBE devolver el acceso con el mismo rol, contraseña y segundo factor
  que tenía el usuario al darse de baja.
- **FR-022**: Forzar reinicio de contraseña DEBE cerrar las sesiones del usuario, invalidar su
  contraseña actual y enviarle por correo un enlace para definir una nueva.
- **FR-023**: Forzar reinicio del segundo factor DEBE cerrar las sesiones del usuario, eliminar
  su app autenticadora y códigos de recuperación, y exigirle registrar un nuevo segundo factor en
  su siguiente inicio de sesión.

**Recuperación de contraseña**

- **FR-024**: Los usuarios activos DEBEN poder solicitar un enlace de recuperación por correo,
  de un solo uso y válido 1 hora.
- **FR-025**: Definir una contraseña nueva mediante recuperación o reinicio forzado DEBE cerrar
  todas las sesiones del usuario. El segundo factor sigue siendo obligatorio para entrar.
- **FR-025a**: Un usuario con sesión completa (ambos factores) DEBE poder cambiar su propia
  contraseña desde su cuenta, indicando la actual. Al hacerlo se cierran todas sus demás
  sesiones (la actual se conserva) y recibe el aviso de FR-031a.

**Bitácora de auditoría**

- **FR-026**: El sistema DEBE registrar en la bitácora: inicios de sesión exitosos, intentos
  fallidos (con el factor que falló), bloqueos, cierres de sesión, invitaciones (envío,
  reenvío, revocación, aceptación), altas, bajas, reactivaciones, cambios de rol, reinicios
  forzados, recuperaciones de contraseña, registros y regeneraciones del segundo factor y uso
  de códigos de recuperación.
- **FR-027**: Cada evento DEBE registrar fecha y hora, autor (o el correo intentado si no hay
  usuario autenticado), acción, usuario afectado, resultado y dirección de origen.
- **FR-028**: La bitácora DEBE ser de solo inserción: nadie, incluido el Dueño, puede modificar
  ni borrar eventos desde la aplicación.
- **FR-029**: El Dueño y los Administradores DEBEN poder consultar la bitácora con filtros por
  usuario, tipo de evento y rango de fechas, ordenada del evento más reciente al más antiguo.
  Colaboradores y Lectores no tienen acceso.
- **FR-029a**: El Dueño DEBE ver todos los eventos. Un Administrador DEBE ver únicamente:
  (a) los eventos en los que él es el autor o el usuario afectado, y (b) los eventos cuyo autor
  es un Colaborador o Lector, o un intento de acceso sobre la cuenta de uno de ellos. Fuera del
  caso (a), no ve ningún evento cuyo autor o afectado sea el Dueño u otro Administrador, ni los
  intentos sobre correos que no pertenecen a ningún usuario. Los filtros respetan esta
  restricción.
- **FR-030**: La bitácora NO DEBE almacenar contraseñas, códigos TOTP, códigos de recuperación
  ni enlaces de invitación o recuperación.

**Avisos de seguridad**

- **FR-031a**: El sistema DEBE enviar un correo al usuario afectado cuando: cambia su
  contraseña (por él mismo, por recuperación o por reinicio forzado), se registra o se reinicia
  su segundo factor, se usa uno de sus códigos de recuperación, cambia su rol, se bloquean los
  intentos sobre su cuenta desde alguna IP (como mucho un aviso de este tipo cada 24 h por
  cuenta, para no agotar el cupo de correo), o se le da de baja o se le reactiva. El correo indica qué
  ocurrió, cuándo y, si aplica, quién lo hizo, y NO DEBE incluir contraseñas, códigos ni enlaces
  de acceso.
- **FR-031b**: Si el envío de un aviso falla, la acción que lo originó NO DEBE revertirse ni
  bloquearse; el fallo de envío DEBE quedar en la bitácora.

**Idioma**

- **FR-031**: Toda la interfaz y los correos enviados DEBEN estar en español.

### Key Entities *(include if feature involves data)*

- **Usuario**: persona con acceso a Nexoru Op. Atributos: correo (único), nombre, rol, estado
  (Invitado, Activo, Dado de baja), si tiene segundo factor registrado, fecha de alta, fecha del
  último acceso, bloqueo temporal vigente.
- **Rol**: uno de Dueño, Administrador, Colaborador o Lector; define qué acciones puede hacer el
  usuario.
- **Invitación**: correo destino, rol asignado, quién invitó, fecha de envío, caducidad y estado
  (Pendiente, Aceptada, Caducada, Revocada).
- **Sesión**: acceso autenticado de un usuario, con inicio, última actividad y cierre.
- **Código de recuperación**: código de un solo uso asociado a un usuario, usado o sin usar.
- **Intentos de acceso**: por cada combinación de correo intentado y dirección IP, el número de
  fallos consecutivos y hasta cuándo está bloqueada. Existe también para correos sin usuario.
- **Evento de auditoría**: registro inmutable de quién hizo qué, sobre quién, cuándo, desde
  dónde y con qué resultado.
- **Asignación**: vínculo entre un Colaborador y un elemento que puede editar. En esta feature
  se define solo el concepto; los elementos asignables llegarán con los módulos de negocio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los accesos exitosos registrados en la bitácora completaron ambos
  factores; ningún intento de acceso sin segundo factor tiene éxito en las pruebas end-to-end.
- **SC-002**: Un usuario con credenciales y app autenticadora a mano inicia sesión en menos de
  30 segundos.
- **SC-003**: Una persona invitada activa su cuenta (contraseña y segundo factor) en menos de
  5 minutos desde que abre el correo.
- **SC-004**: Un usuario dado de baja pierde el acceso en menos de 1 minuto, incluidas las
  sesiones que tuviera abiertas.
- **SC-005**: El 100 % de los eventos de FR-026 aparecen en la bitácora; ningún evento puede
  modificarse ni borrarse desde la aplicación.
- **SC-006**: Encontrar en la bitácora un evento concreto filtrando por usuario y fecha lleva
  menos de 1 minuto.
- **SC-007**: En las pruebas de permisos, el 100 % de los intentos de un Administrador de
  actuar sobre el Dueño u otros Administradores, y de un Lector o Colaborador de hacer acciones
  fuera de su rol, son rechazados.
- **SC-008**: Ninguna contraseña, código TOTP, código de recuperación ni enlace de un solo uso
  aparece en la bitácora ni en los registros del sistema.
- **SC-009**: El 100 % de los eventos de FR-031a generan un aviso al usuario afectado, que lo
  recibe en menos de 5 minutos, con la única excepción del límite de un aviso de bloqueo cada
  24 h por cuenta.
- **SC-010**: En las pruebas, 5 o más intentos fallidos desde una IP sobre un correo nunca
  impiden que el usuario legítimo acceda desde otra IP.

## Assumptions

- **Usuarios**: el Dueño y pocos colaboradores (menos de 50 usuarios en el horizonte previsible).
- **Primera cuenta**: admin@nexoru.ai se provisiona una sola vez como parte de la puesta en
  marcha (no desde la interfaz) y recibe un enlace de activación por correo.
- **Un único Dueño**: la transferencia del rol Dueño queda fuera de esta feature; si fuera
  necesaria, se hará mediante un procedimiento manual documentado.
- **Inactividad**: 30 minutos sin actividad y duración máxima de sesión de 12 horas (valores
  habituales para paneles administrativos).
- **Bloqueo**: 5 intentos fallidos consecutivos del mismo correo desde la misma IP → bloqueo de
  15 minutos para esa combinación.
- **Caducidades**: invitaciones 7 días; enlaces de recuperación y de reinicio forzado 1 hora.
- **Retención de la bitácora**: indefinida (el volumen previsto es pequeño).
- **Colaborador**: en esta feature no hay elementos asignables todavía; el rol existe y se
  comporta como Lector hasta que los módulos de negocio definan qué se puede asignar.
- **Contenido**: el "contenido" que gestiona el Administrador llega con módulos futuros; aquí
  su gestión se limita a usuarios e invitaciones.
- **Correo**: se requiere un servicio de envío de correo para invitaciones, recuperación,
  reinicios y avisos de seguridad; su elección y costo se documentan en el plan (principio III).
- **Fuera de alcance**: inicio de sesión con Google u otros proveedores, facturación, módulos de
  negocio, cambio del propio correo, transferencia del rol Dueño y segundo factor por SMS o
  WhatsApp.
