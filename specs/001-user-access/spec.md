# Feature Specification: Acceso seguro del Dueño y puesta en marcha local

**Feature Branch**: `001-user-access`

**Created**: 2026-09-26 · **Redefinida**: 2026-09-28 (constitución v2.0.0)

**Status**: Draft

**Input**: User description (original, 2026-09-26): "Acceso seguro y administración de usuarios
para op.nexoru.ai […] Inicio de sesión con correo y contraseña, más segundo factor con app
autenticadora (TOTP), obligatorio para todos. El primer usuario es admin@nexoru.ai con rol Dueño.
[…] Cierre de sesión por inactividad. Bitácora de auditoría consultable […] Sin registro público."

**Redefinición (2026-09-28)**: Nexoru Op pasa a ser un dashboard **local, de solo lectura y para
un solo usuario** (el Dueño). Esta feature se reduce al acceso seguro del Dueño, la consulta de la
bitácora y la puesta en marcha local. Se elimina todo envío de correo. La gestión de usuarios, los
roles y la recuperación por correo pasan al backlog (`specs/backlog.md`).

## Clarifications

### Session 2026-09-26

- Q: ¿Cuántos minutos sin actividad antes de cerrar la sesión automáticamente? → A: 30 minutos
  (FR-007).
- Q: ¿Cuántos intentos fallidos seguidos antes de bloquear, y por cuánto tiempo? → A: 5 intentos;
  bloqueo temporal de 15 minutos (FR-005).
- Q: Si el Dueño pierde el teléfono con su autenticador, ¿cómo recupera el acceso? → A: Con un
  código de recuperación, tras lo cual debe registrar un autenticador nuevo. Sin códigos:
  procedimiento manual documentado (FR-003, FR-003a).
- *(Obsoletas por la redefinición: gestión de Administradores, visibilidad de la bitácora por
  rol y avisos por correo. Se conservan en el historial de git.)*

### Session 2026-09-26 (revisión de tasks)

- Q: ¿El bloqueo por intentos fallidos se aplica a la cuenta o a la cuenta desde una IP? → A: A la
  combinación correo + IP. El mensaje de bloqueo es genérico e idéntico exista o no la cuenta
  (FR-005, FR-006, SC-010).

### Session 2026-09-28 (implementación de US1)

- Q: ¿De dónde sale la IP del bloqueo? → A: Solo de un encabezado que fija la plataforma de
  hosting; nunca de uno que el cliente pueda enviar o falsificar (FR-005, SC-011).
- Q: ¿Qué pasa con los demás códigos de recuperación al usar uno? → A: Quedan invalidados en ese
  momento y se reemplazan por un juego nuevo de 10 al registrar el autenticador nuevo (FR-003a).

### Session 2026-09-28 (redefinición del producto)

- Q: ¿Cómo se activa la cuenta del Dueño sin correo? → A: `bootstrap:owner`, ejecutado en la
  terminal integrada de VS Code, muestra en pantalla un **enlace de activación de un solo uso**
  que caduca en 1 hora. En esa página el Dueño define su contraseña (12+ caracteres y
  comprobación de contraseñas filtradas) y registra su app autenticadora. Se eligió frente a
  pedir la contraseña en la terminal porque reutiliza la pantalla ya probada y la contraseña no
  pasa por la terminal (FR-010, FR-036).
- Q: ¿Qué sentido tiene el bloqueo por correo + IP en local? → A: En uso local todas las
  peticiones llegan desde la misma máquina, así que el bloqueo actúa en la práctica por correo.
  El mecanismo se conserva: ya está construido y probado, protege si otro proceso local intenta
  adivinar la contraseña y sirve si algún día hubiera despliegue (FR-005).
- Q: ¿Cómo recupera el Dueño una contraseña olvidada sin correo? → A: Con un procedimiento local
  documentado en el quickstart (Supabase Studio local), que queda registrado en la bitácora
  (FR-037).

### Session 2026-09-28 (aprobación de la Parte A)

- Q: ¿Qué debe escuchar solo en la máquina local? → A: La app, la base de datos y Supabase Studio,
  en los dos entornos. Docker publica por defecto los puertos en todas las interfaces, así que se
  configura con `{"ip": "127.0.0.1"}` (FR-033).
- Q: ¿Se construye la pantalla de la bitácora (US5)? → A: No; pasa al backlog (B-007). Los
  eventos se siguen registrando y el Dueño los consulta desde Supabase Studio del entorno de uso
  (FR-038).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inicio de sesión con segundo factor obligatorio (Priority: P1)

El Dueño (admin@nexoru.ai) abre Nexoru Op en su máquina y entra con su correo y contraseña y, a
continuación, con un código de su app autenticadora. La primera vez activa su cuenta con un
enlace de un solo uso que le muestra la terminal, define la contraseña y registra la app
autenticadora; a partir de ahí, cada inicio de sesión exige ambos factores. Si la sesión queda
inactiva, el sistema la cierra y pide volver a autenticarse. También puede cerrar sesión
manualmente.

**Why this priority**: sin acceso seguro no existe el sistema; es la base de todos los módulos
del dashboard y el primer requisito de la constitución (principio I).

**Independent Test**: el Dueño activa su cuenta con el enlace de la terminal, registra el
segundo factor, inicia y cierra sesión, y el sistema rechaza cualquier acceso sin ambos factores.

**Acceptance Scenarios**:

1. **Given** la cuenta del Dueño sin activar y el enlace de activación mostrado en la terminal,
   **When** el Dueño lo abre, define su contraseña y registra su app autenticadora con un código
   válido, **Then** la cuenta queda activa, ve sus códigos de recuperación una sola vez y entra.
2. **Given** el Dueño con segundo factor registrado, **When** introduce correo y contraseña
   correctos y un código TOTP válido, **Then** accede al sistema.
3. **Given** el Dueño, **When** introduce correo y contraseña correctos pero un código TOTP
   incorrecto o caducado, **Then** no accede y el intento fallido queda en la bitácora.
4. **Given** el Dueño con la contraseña verificada, **When** intenta abrir cualquier pantalla
   interna sin completar el segundo factor, **Then** el sistema lo devuelve al paso del segundo
   factor.
5. **Given** una sesión abierta, **When** pasan 30 minutos sin actividad, **Then** la sesión se
   cierra y hay que autenticarse de nuevo con ambos factores.
6. **Given** credenciales incorrectas, **When** se intenta iniciar sesión, **Then** el mensaje de
   error no revela si el correo existe ni cuál de los datos falló.
7. **Given** 5 intentos fallidos consecutivos sobre un correo desde una misma IP, **When** se hace
   un sexto intento desde esa IP, **Then** se rechaza durante 15 minutos aunque los datos sean
   correctos, con un mensaje genérico, y el bloqueo queda en la bitácora.
8. **Given** un bloqueo vigente sobre el correo del Dueño desde otra IP, **When** el Dueño inicia
   sesión desde su IP con sus datos correctos, **Then** accede con normalidad.
9. **Given** el Dueño perdió su app autenticadora y conserva sus códigos de recuperación, **When**
   introduce correo, contraseña y un código de recuperación válido, **Then** el sistema le exige
   registrar un autenticador nuevo antes de dar acceso e invalida el anterior y todos sus
   códigos, que se reemplazan por un juego nuevo de 10.

---

### User Story 6 - Puesta en marcha local (Priority: P2)

El Dueño arranca Nexoru Op en su máquina con un solo comando y lo detiene con otro. Su entorno de
uso (base de datos y cuenta) está separado del entorno de pruebas: correr las pruebas nunca toca
sus datos.

**Why this priority**: sin esto el Dueño no puede usar el sistema a diario; depende de US1. Es
la segunda historia de la feature (la antigua US5 pasó al backlog).

**Independent Test**: con `op:start` el Dueño abre la app en `http://127.0.0.1:<puerto>` y entra;
mientras está en marcha corre toda la batería de pruebas y, al terminar, su cuenta, sus códigos
y su bitácora siguen intactos; `op:stop` lo detiene.

**Acceptance Scenarios**:

1. **Given** Docker en marcha, **When** el Dueño ejecuta `npm run op:start`, **Then** arranca la
   instancia de uso de Supabase y la app, que escucha solo en `127.0.0.1`.
2. **Given** la app y la instancia de uso en marcha, **When** se intenta abrir la app, conectar a
   la base de datos o abrir Supabase Studio desde otra máquina de la red, **Then** ninguno
   responde.
3. **Given** el entorno de uso en marcha y con datos, **When** se ejecutan todas las pruebas,
   **Then** ningún dato del entorno de uso cambia.
4. **Given** un script de pruebas configurado por error con los datos del entorno de uso, **When**
   se ejecuta, **Then** se niega a correr y explica por qué.
5. **Given** la app en marcha, **When** el Dueño ejecuta `npm run op:stop`, **Then** se detienen
   la app y la instancia de uso, sin borrar datos.

---

### Edge Cases

- **Dueño pierde su app autenticadora**: entra con un código de recuperación (FR-003a). Si pierde
  también los códigos, sigue el procedimiento manual local del quickstart, que queda en la
  bitácora.
- **Dueño olvida su contraseña**: procedimiento manual local del quickstart (FR-037). La
  recuperación por correo está en el backlog.
- **Últimos códigos de recuperación**: cuando quedan 2 o menos, el sistema lo indica al iniciar
  sesión y sugiere regenerarlos.
- **Enlace de activación caducado o ya usado**: la página lo rechaza; el Dueño vuelve a ejecutar
  `bootstrap:owner`, que emite un enlace nuevo si la cuenta sigue sin activar.
- **`bootstrap:owner` con la cuenta ya activa**: no hace nada y lo indica.
- **Código TOTP reutilizado**: un código ya usado no se acepta de nuevo dentro de su ventana.
- **Reloj del teléfono desfasado**: se acepta el código del intervalo inmediatamente anterior y
  posterior; fuera de eso se rechaza.
- **IP falsificada por el cliente**: los encabezados de IP que el navegador puede enviar se
  ignoran (SC-011).
- **Uso local**: todas las peticiones llegan desde la misma máquina; el bloqueo actúa en la
  práctica por correo (ver Clarifications).
- **Actividad en varias pestañas**: la actividad en cualquier pestaña cuenta para el temporizador
  de inactividad.
- **Puerto ocupado al arrancar**: `op:start` falla con un mensaje claro en lugar de usar otro
  puerto.

## Requirements *(mandatory)*

### Functional Requirements

**Autenticación**

- **FR-001**: El sistema DEBE autenticar al Dueño con correo y contraseña seguidos de un código
  TOTP de una app autenticadora. Nadie puede acceder sin completar ambos factores.
- **FR-002**: El sistema DEBE exigir el registro del segundo factor al activar la cuenta y después
  de usar un código de recuperación, antes de dar acceso a cualquier pantalla interna.
- **FR-003**: El sistema DEBE entregar 10 códigos de recuperación de un solo uso al registrar el
  segundo factor, mostrarlos una única vez y permitir regenerarlos (invalidando los anteriores).
- **FR-003a**: Un código de recuperación DEBE poder usarse en lugar del código TOTP. Al usarlo, el
  sistema DEBE exigir registrar un autenticador nuevo antes de dar acceso e invalidar el
  autenticador anterior y **todos** los códigos restantes, que se reemplazan por un juego nuevo
  de 10 al registrar el autenticador nuevo.
- **FR-004**: Las contraseñas DEBEN tener al menos 12 caracteres y NO DEBEN coincidir con
  contraseñas conocidas como comprometidas.
- **FR-005**: Los intentos fallidos (contraseña, código TOTP o código de recuperación) DEBEN
  contarse por la combinación **correo + dirección IP**. Tras 5 fallos consecutivos, los intentos
  de ese correo desde esa IP DEBEN rechazarse durante 15 minutos. El conteo se aplica igual a
  correos que no pertenecen a ninguna cuenta. La IP DEBE tomarse solo de un encabezado que fija la
  plataforma de hosting, nunca de uno que el cliente pueda falsificar; en ejecución local, sin
  ese encabezado, se usa la IP de respaldo `0.0.0.0`.
- **FR-006**: Los mensajes de error de inicio de sesión, **incluido el de bloqueo**, NO DEBEN
  revelar si un correo está registrado: el texto es genérico e idéntico en todos los casos.
- **FR-007**: El sistema DEBE cerrar la sesión tras 30 minutos sin actividad y, en cualquier caso,
  a las 12 horas de haberse iniciado.
- **FR-008**: El Dueño DEBE poder cerrar sesión manualmente.

**Cuenta del Dueño**

- **FR-009**: El sistema NO DEBE ofrecer registro público ni ninguna forma de crear cuentas desde
  la interfaz.
- **FR-010**: Existe una sola cuenta, `admin@nexoru.ai`, con rol Dueño. Se crea solo con
  `bootstrap:owner` (FR-036).
- **FR-036**: `bootstrap:owner`, ejecutado en la terminal integrada de VS Code, DEBE mostrar en
  pantalla un enlace de activación de un solo uso que caduca en 1 hora. No envía correo. Si la
  cuenta ya está activa, no hace nada y lo indica; si hay un enlace pendiente, lo invalida y emite
  uno nuevo.
- **FR-037**: La recuperación de una contraseña olvidada, o del acceso sin autenticador ni códigos,
  se hace con procedimientos locales documentados en el quickstart. Cada uno DEBE registrar su
  evento en la bitácora.

**Bitácora de auditoría**

- **FR-026**: El sistema DEBE registrar en la bitácora: inicios de sesión exitosos, intentos
  fallidos (con el factor que falló), bloqueos, cierres de sesión (manuales, por inactividad o
  por duración máxima), la activación de la cuenta, registros del segundo factor, uso y
  regeneración de códigos de recuperación, y los procedimientos manuales de FR-037.
- **FR-027**: Cada evento DEBE registrar fecha y hora, autor (o el correo intentado si no hay
  sesión), acción, resultado y dirección de origen.
- **FR-028**: La bitácora DEBE ser de solo inserción: nadie, incluido el Dueño, puede modificar ni
  borrar eventos desde la aplicación.
- **FR-038**: El Dueño DEBE poder consultar la bitácora con SQL de solo lectura en Supabase Studio
  del entorno de uso, con las consultas documentadas en el quickstart (filtrar por tipo de evento
  y rango de fechas, del más reciente al más antiguo). La pantalla de la bitácora está en el
  backlog (B-007).
- **FR-030**: La bitácora NO DEBE almacenar contraseñas, códigos TOTP, códigos de recuperación ni
  enlaces de activación.

**Solo lectura y ejecución local**

- **FR-032**: El sistema NO DEBE enviar correos, mensajes ni notificaciones de ningún tipo.
- **FR-033**: La app, la base de datos y Supabase Studio DEBEN escuchar solo en `127.0.0.1`, en
  el entorno de uso y en el de pruebas. Incluye los servidores de desarrollo y de pruebas
  (`npm run dev`, el servidor de Playwright) y los puertos que publica Docker.
- **FR-034**: El entorno de uso (instancia de Supabase, variables y datos del Dueño) DEBE estar
  separado del de pruebas. Ningún script de pruebas DEBE poder conectarse al entorno de uso: si
  detecta su configuración, se niega a correr.
- **FR-035**: `npm run op:start` DEBE arrancar la instancia de uso y la app; `npm run op:stop`
  DEBE detener ambas sin borrar datos.

**Idioma**

- **FR-031**: Toda la interfaz DEBE estar en español.

### Movido al backlog por la redefinición

Se conservan los identificadores para la trazabilidad; el detalle está en el historial de git y
en `specs/backlog.md`:

- **B-003 · US2 Invitar usuarios y asignar roles**: FR-011, FR-012, FR-013, FR-014, FR-015,
  FR-016, FR-017, FR-018, FR-019, SC-003 (versión multiusuario) y SC-007.
- **B-004 · US3 Dar de baja, reactivar y forzar reinicios**: FR-020 a FR-023 y SC-004.
- **B-005 · US4 Recuperación de contraseña por correo y cambio de la propia contraseña**: FR-024,
  FR-025, FR-025a y la ruta `/auth/confirm`.
- **B-007 · US5 Pantalla de consulta de la bitácora**: FR-029, SC-006 y la ruta `/audit`. Los
  eventos se siguen registrando (FR-026 a FR-028, FR-030) y se consultan desde Studio (FR-038).
- **Visibilidad de la bitácora por rol** (FR-029a) y **avisos por correo** (FR-031a, FR-031b,
  SC-009): eliminados por la constitución v2.0.0 (principio XII); si vuelven, requieren enmienda.
- **B-001 · Aviso al Dueño por fallos desde varias IP**: ya estaba en el backlog.

### Key Entities *(include if feature involves data)*

- **Cuenta del Dueño**: correo (único), nombre, rol (siempre Dueño), estado, si tiene segundo
  factor registrado, fecha de alta y del último acceso.
- **Enlace de activación**: de un solo uso, con caducidad de 1 hora; solo se guarda su huella
  (hash).
- **Sesión**: inicio, última actividad y cierre.
- **Código de recuperación**: de un solo uso; solo se guarda su huella.
- **Intentos de acceso**: por correo intentado + IP, fallos consecutivos y hasta cuándo está
  bloqueada la combinación.
- **Evento de auditoría**: registro inmutable de qué pasó, cuándo, desde dónde y con qué resultado.
- **Entorno**: de uso o de pruebas; cada uno con su propia base de datos y variables.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los accesos exitosos de la bitácora completaron ambos factores; ningún
  intento sin segundo factor tiene éxito en las pruebas end-to-end.
- **SC-002**: Con credenciales y app autenticadora a mano, el Dueño inicia sesión en menos de
  30 segundos.
- **SC-003**: El Dueño activa su cuenta (contraseña y segundo factor) en menos de 5 minutos desde
  que ejecuta `bootstrap:owner`.
- **SC-005**: El 100 % de los eventos de FR-026 aparecen en la bitácora; ninguno puede
  modificarse ni borrarse desde la aplicación.
- **SC-008**: Ninguna contraseña, código TOTP, código de recuperación ni enlace de activación
  aparece en la bitácora ni en los registros del sistema.
- **SC-010**: En las pruebas, 5 o más intentos fallidos desde una IP sobre un correo nunca
  impiden que el Dueño acceda desde otra IP.
- **SC-011**: En las pruebas, un encabezado de IP falsificado por el cliente nunca cambia la
  combinación correo + IP que se cuenta ni la IP que queda en la bitácora.
- **SC-012**: Tras ejecutar la batería completa de pruebas con el entorno de uso en marcha, sus
  datos no cambian (comprobado por una prueba automatizada), y el intento de apuntar una prueba
  al entorno de uso falla antes de conectarse.
- **SC-013**: El sistema no envía ningún correo ni notificación: la dependencia de correo no
  existe en el proyecto (comprobado en la revisión de seguridad).

## Assumptions

- **Usuario**: solo el Dueño.
- **Ejecución**: local, en la máquina del Dueño, con Docker para Supabase; costo cero.
- **Inactividad**: 30 minutos sin actividad y duración máxima de sesión de 12 horas.
- **Bloqueo**: 5 intentos fallidos consecutivos del mismo correo desde la misma IP → 15 minutos.
- **Caducidad del enlace de activación**: 1 hora.
- **Retención de la bitácora**: indefinida (volumen pequeño).
- **Roles en la base de datos**: el esquema conserva la columna de rol y la matriz de permisos ya
  construidas y probadas; con un solo usuario, siempre es Dueño. Se retoman con B-003.
- **Consultas de red**: solo lectura, la comprobación de contraseñas filtradas (Have I Been Pwned)
  y, en features posteriores, la API de GitHub (principio XII).
- **Fuera de alcance**: todo lo de "Movido al backlog", inicio de sesión con Google u otros
  proveedores, segundo factor por SMS o WhatsApp, despliegue en la nube y cualquier envío de
  correo o notificación.
