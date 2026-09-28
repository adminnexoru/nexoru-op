# Constitución de Nexoru Op

Nexoru Op es el **dashboard local del portafolio de Nexoru**: un sistema de información, de solo
lectura y para un solo usuario (el Dueño), que muestra automáticamente el estado de cada proyecto
leyendo sus archivos en `PROJECTS_ROOT`, su historial de git y, en solo lectura, GitHub, según el
Estándar de Proyecto Nexoru (`nexoru-governance`).

Las palabras DEBE, NO DEBE y DEBERÍA se usan con su sentido normativo: DEBE es obligatorio;
DEBERÍA es la opción por defecto y apartarse de ella requiere justificación escrita en el plan.

## Principios fundamentales

### I. Seguridad primero

- El acceso DEBE requerir usuario, contraseña y segundo factor TOTP. El 2FA es obligatorio; no
  existe ruta de acceso que lo omita.
- Hay **un solo usuario**, el Dueño. No existen cuentas de colaboradores ni registro público.
- Toda tabla de base de datos DEBE tener Row Level Security activado con políticas explícitas.
  Una tabla sin RLS es un defecto bloqueante.
- DEBE existir una bitácora de auditoría, de solo inserción, para los accesos, los intentos
  fallidos y toda acción sensible sobre la cuenta.
- La app DEBE escuchar solo en la máquina local (`127.0.0.1`), nunca en la red.

**Razón**: el dashboard reúne información de todo el portafolio en un solo lugar; aunque sea
local, un acceso indebido la expondría completa.

### II. Cero secretos en código o base de datos

- Credenciales y tokens DEBEN vivir solo en variables de entorno, en archivos `.env*` ignorados
  por git (salvo `.env.example`, que lleva solo nombres).
- El token de GitHub es **opcional**, de **solo lectura** y vive en `.env.local`. Sin él, el
  dashboard funciona sin los datos de GitHub.
- NO DEBEN aparecer secretos en el código, en el historial de git, en la base de datos, en logs
  ni en las specs. Un secreto filtrado se considera comprometido y se rota de inmediato.

**Razón**: el repositorio es público; cualquier secreto versionado queda expuesto para siempre.

### III. Ejecución local y costo cero

- Nexoru Op DEBE correr en la máquina del Dueño, con Supabase local (Docker), sin servicios de
  pago ni despliegue en la nube.
- Toda propuesta que añada un costo recurrente DEBE documentar en el plan su monto mensual y la
  alternativa gratuita evaluada, y requiere una enmienda si contradice este principio.

**Razón**: es una herramienta interna de un solo usuario; no justifica infraestructura de pago.

### IV. Stack homologado

- El stack es: **TypeScript**, **Next.js**, **Supabase** local (Postgres + Auth) y **GitHub**.
- Toda tecnología fuera de este stack DEBE justificarse en el plan: qué problema resuelve que el
  stack no cubre, su costo (principio III) y su impacto en mantenimiento.

**Razón**: el mismo stack que el resto de proyectos de Nexoru facilita mantenerlo.

### V. Desarrollo guiado por especificaciones

- Nada se implementa sin `spec.md`, `plan.md` y `tasks.md` aprobados explícitamente por el Dueño.
- Todo código implementado DEBE corresponder a una tarea de `tasks.md`. El trabajo no previsto
  se incorpora primero a spec, plan y tasks, y se vuelve a aprobar.
- Si la implementación se aparta de la spec, la spec DEBE actualizarse en la misma rama antes
  del merge. La spec refleja siempre el sistema real.

**Razón**: la spec es la fuente de verdad técnica; si diverge del código, deja de servir.

### VI. Pruebas obligatorias

- La lógica de negocio DEBE tener pruebas unitarias; en particular, la lectura e interpretación
  de los archivos del estándar y el cálculo de conformidad.
- Los flujos críticos DEBEN tener pruebas end-to-end: como mínimo, el inicio de sesión con 2FA
  y la imposibilidad de acceder sin él.
- Las pruebas NO DEBEN poder tocar el entorno de uso del Dueño: corren contra una instancia
  separada, con salvaguardas que lo impiden.
- Ningún merge a `main` sin todas las pruebas en verde.

**Razón**: un dashboard que interpreta mal un archivo informa mal al Dueño sin que nadie lo note.

### VII. Simplicidad

- Se construye lo mínimo que funcione para la necesidad actual.
- NO DEBEN introducirse abstracciones, capas o configurabilidad "por si acaso".
- Las features DEBEN ser pequeñas y entregables por separado.

**Razón**: el código que no se necesita también se mantiene, se prueba y se asegura.

### VIII. Crecimiento modular

- El dashboard crece por módulos: lectura de proyectos, conformidad con el estándar, historial
  de git, datos de GitHub y los que vengan después.
- Cada módulo DEBE ser una feature independiente de Spec Kit, con su propia spec, plan y tasks.

**Razón**: permite entregar y revisar cada módulo por separado sin romper los existentes.

### IX. Desarrollo con Claude y contexto autosuficiente

- El desarrollo se hace con Claude en VS Code.
- `CLAUDE.md`, `PROJECT.md`, `docs/mapa-funcional.md`, la constitución y las specs DEBEN permitir
  que una sesión nueva de Claude entienda el proyecto sin contexto previo.
- Las decisiones relevantes DEBEN quedar escritas en el repositorio, no solo en conversaciones.

**Razón**: cada sesión de Claude empieza sin memoria; lo que no está en el repositorio se pierde.

### X. Idioma

- Interfaz de usuario y documentación: **español**.
- Código, identificadores, esquemas de base de datos y mensajes de commit: **inglés**.

**Razón**: el Dueño trabaja en español; el código en inglés sigue las convenciones del ecosistema.

### XI. Los archivos de cada proyecto son la fuente de verdad

- El estado del portafolio se obtiene **siempre** de los archivos de cada proyecto
  (`PROJECT.md`, `docs/mapa-funcional.md`, `specs/`, `.specify/`), de git y, en solo lectura, de
  GitHub. Nunca se captura a mano en el dashboard.
- La base de datos DEBE guardar solo la autenticación, la bitácora y un **índice regenerable**.
  Borrar el índice no pierde información: se reconstruye leyendo los proyectos.
- Si un dato falta o no se puede leer, el dashboard lo muestra como ausente; NO DEBE inventarlo
  ni rellenarlo.

**Razón**: el estándar define que lo derivable no se captura a mano; el dashboard no puede ser
una segunda fuente de verdad que se desincronice.

### XII. Solo lectura: sin acciones hacia afuera

- Nexoru Op NO DEBE enviar correos, mensajes de WhatsApp ni notificaciones de ningún tipo.
- NO DEBE escribir en los proyectos, en sus repositorios git ni en GitHub.
- Las únicas consultas de red permitidas son de solo lectura: la API de GitHub (con o sin token)
  y la comprobación de contraseñas filtradas (Have I Been Pwned, por k-anonymity).

**Razón**: un sistema de información que puede actuar deja de ser neutral y pasa a ser un riesgo
operativo.

### XIII. Lector seguro

- El lector DEBE acceder solo a rutas dentro de `PROJECTS_ROOT`, resolviendo rutas reales para
  impedir salidas por enlaces simbólicos o `..`.
- DEBE leer solo los archivos que define el estándar. NUNCA lee `.env*`, llaves ni otros
  archivos de secretos.
- NO DEBE ejecutar nada de los proyectos (scripts, dependencias, binarios). La única excepción
  son comandos de git de solo lectura, invocados sin shell y con argumentos fijos.

**Razón**: el portafolio incluye repos con secretos locales; un lector sin límites los expondría.

### XIV. El estándar se lee de nexoru-governance

- Las reglas de conformidad se toman del Estándar de Proyecto Nexoru, en `nexoru-governance`.
- El dashboard DEBE declarar qué versiones del estándar (`version_estandar`) soporta y DEBE
  avisar cuando un proyecto declare una versión no soportada, en lugar de evaluarlo con reglas
  que no le corresponden.

**Razón**: el estándar evoluciona con semver; evaluar un proyecto con otra versión daría
resultados falsos.

## Contexto: portafolio y estándar

- **Portafolio**: cada proyecto de Nexoru vive en una carpeta de `PROJECTS_ROOT` (en la máquina
  del Dueño, `/home/fili/proyectos`) con su propio repositorio en GitHub, en la organización
  `adminnexoru`.
- **Estándar**: `nexoru-governance` define `PROJECT.md`, `docs/mapa-funcional.md`, el roadmap y
  los niveles de conformidad (0 a 3). Sus reglas mandan sobre cualquier interpretación del
  dashboard.
- **Usuario**: el Dueño, con la cuenta `admin@nexoru.ai`.

## Visión futura (fuera de alcance)

Lo siguiente queda **fuera del alcance** de esta constitución. Incorporarlo requiere una enmienda
explícita (MAJOR si contradice los principios III o XII):

- Integraciones de escritura (GitHub, Supabase, Vercel, Meta u otras).
- Automatizaciones y agentes que actúen sobre los proyectos.
- Integración con Cowork.
- Colaboradores y cuentas con roles distintos del Dueño.
- Despliegue en la nube.

## Flujo de desarrollo y puertas de calidad

- **Flujo Spec Kit**: constitution → specify → clarify → plan → tasks → analyze → implement.
  No se omiten pasos.
- **Puertas de aprobación**:
  1. `spec.md` aprobada antes de planificar.
  2. `plan.md` aprobado antes de generar tareas. Su verificación constitucional DEBE cubrir los
     catorce principios, con especial atención a la solo lectura (XII) y al lector seguro (XIII).
  3. `tasks.md` aprobado, tras `/speckit-analyze` sin hallazgos críticos, antes de escribir código.
- **Ramas y merges**: `main` está protegida por un ruleset que exige PR y CI en verde. Cada feature
  se desarrolla en su propia rama y se integra solo mediante pull request. El push lo autoriza el
  Dueño tras revisar.
- **Estándar de proyecto**: al cerrar cada fase se actualizan `PROJECT.md` y
  `docs/mapa-funcional.md` según `nexoru-governance`.

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica o convención del repositorio. Ante un
  conflicto, gana la constitución; el Estándar de Proyecto Nexoru rige la estructura de
  documentación del proyecto.
- **Enmiendas**: cambiar, añadir o eliminar un principio requiere una enmienda explícita: un
  cambio dedicado a este documento que explique el motivo y el impacto en specs y planes, aprobado
  por el Dueño.
- **Versionado semántico**:
  - MAJOR: se elimina o redefine un principio o una regla de gobernanza de forma incompatible.
  - MINOR: se añade un principio o sección, o se amplía materialmente una guía.
  - PATCH: aclaraciones, redacción o erratas sin cambio de significado.
- **Cumplimiento**: cada `plan.md` incluye una verificación constitucional; toda desviación se
  justifica por escrito o se corrige antes de continuar. Cada PR se revisa contra esta
  constitución.
- **Guía operativa**: `CLAUDE.md` describe cómo trabajar día a día y DEBE mantenerse coherente
  con esta constitución.

**Versión**: 2.0.0 | **Ratificada**: 2026-09-26 | **Última enmienda**: 2026-09-28
