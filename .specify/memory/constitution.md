# Constitución de Nexoru Op

Nexoru Op (op.nexoru.ai) es el sistema de control para operar, automatizar y gobernar Nexoru.
Esta constitución rige Nexoru Op y es además el **estándar base para todos los repositorios de
Nexoru**. Un repositorio puede añadir reglas más estrictas, pero nunca relajar estas.

Las palabras DEBE, NO DEBE y DEBERÍA se usan con su sentido normativo: DEBE es obligatorio;
DEBERÍA es la opción por defecto y apartarse de ella requiere justificación escrita en el plan.

## Principios fundamentales

### I. Seguridad primero

- El acceso DEBE requerir usuario, contraseña y segundo factor TOTP. El 2FA es obligatorio
  para toda cuenta; no existe ruta de acceso que lo omita.
- Los roles DEBEN seguir el mínimo privilegio: cada rol recibe solo los permisos que su función
  necesita, y todo permiso nuevo se justifica en la spec.
- Toda tabla de base de datos DEBE tener Row Level Security activado con políticas explícitas.
  Una tabla sin RLS es un defecto bloqueante.
- DEBE existir una bitácora de auditoría para altas y bajas de usuarios, cambios de rol y toda
  acción sensible, registrando quién, qué, cuándo y sobre qué recurso. La bitácora es de solo
  inserción para los usuarios de la aplicación.

**Razón**: Nexoru Op concentra el control de productos, clientes e integraciones; un acceso
indebido compromete a toda la empresa.

### II. Cero secretos en código o base de datos

- Credenciales, tokens y claves DEBEN vivir solo en variables de entorno del proveedor
  (Vercel, Supabase, GitHub Actions, etc.).
- NO DEBEN aparecer secretos en el código, en el historial de git, en la base de datos, en logs
  ni en las specs. Los archivos `.env*` están excluidos del repositorio; solo se permite
  `.env.example` sin valores reales.
- El sistema PUEDE registrar **dónde** vive un secreto (proveedor, proyecto, nombre de la
  variable, responsable), nunca su **valor**.
- Un secreto filtrado se considera comprometido: se rota de inmediato y el incidente se
  registra.

**Razón**: una base de datos o un repositorio con secretos convierte cualquier fuga en un
compromiso total.

### III. Costo mínimo

- Se DEBE elegir la opción gratuita o más barata que cumpla los requisitos.
- Toda decisión con costo recurrente DEBE documentarse en el `plan.md` con su monto mensual
  estimado y la alternativa gratuita evaluada (y por qué no basta).
- Un servicio de pago no documentado así no se aprueba.

**Razón**: Nexoru opera varios productos a la vez; los costos pequeños sin control se acumulan.

### IV. Stack homologado

- El stack estándar es: **TypeScript**, **Next.js**, **Supabase** (Postgres + Auth),
  **GitHub** y despliegue en **Vercel** o una alternativa equivalente de menor costo.
- Toda tecnología fuera de este stack (lenguaje, framework, base de datos, servicio externo o
  dependencia relevante) DEBE justificarse en el plan: qué problema resuelve que el stack no
  cubre, su costo (principio III) y su impacto en mantenimiento.

**Razón**: un stack común permite mover gente, código y conocimiento entre productos, y
facilita migrar cada producto al dominio del cliente.

### V. Desarrollo guiado por especificaciones

- Nada se implementa sin `spec.md`, `plan.md` y `tasks.md` aprobados explícitamente por el
  responsable del proyecto.
- Todo código implementado DEBE corresponder a una tarea de `tasks.md`. El trabajo no previsto
  se incorpora primero a spec, plan y tasks, y se vuelve a aprobar.
- Si la implementación se aparta de la spec, la spec DEBE actualizarse en la misma rama antes
  del merge. La spec refleja siempre el sistema real.

**Razón**: la spec es la fuente de verdad del proyecto; si diverge del código, deja de servir.

### VI. Pruebas obligatorias

- La lógica de negocio DEBE tener pruebas unitarias.
- Los flujos críticos DEBEN tener pruebas end-to-end. Como mínimo: login con 2FA, alta y baja
  de usuarios y verificación de permisos por rol. Cada spec identifica sus flujos críticos.
- Ningún merge a `main` sin todas las pruebas en verde.

**Razón**: los flujos de acceso y permisos son los que más daño causan al fallar y los que
menos se notan en una revisión manual.

### VII. Simplicidad

- Se construye lo mínimo que funcione para la necesidad actual.
- NO DEBEN introducirse abstracciones, capas o configurabilidad "por si acaso"; se añaden
  cuando exista un segundo caso real que las necesite.
- Las features DEBEN ser pequeñas y entregables por separado.

**Razón**: el código que no se necesita también se mantiene, se prueba y se asegura.

### VIII. Crecimiento modular

- Nexoru Op crece por módulos: portafolio, activos y costos, integraciones (GitHub, Supabase,
  Vercel, Meta), automatizaciones y agentes, entre otros.
- Cada módulo DEBE ser una feature independiente de Spec Kit, con su propia spec, plan y tasks.
- Un módulo NO DEBE depender de detalles internos de otro; se comunican mediante interfaces
  documentadas en sus contratos.

**Razón**: permite entregar y revisar cada módulo por separado sin romper los existentes.

### IX. Desarrollo con Claude y contexto autosuficiente

- El desarrollo se hace con Claude en VS Code.
- `CLAUDE.md`, la constitución, las specs y los planes DEBEN permitir que una sesión nueva de
  Claude o un colaborador nuevo entienda el proyecto sin contexto previo: qué es, cómo se
  organiza, en qué estado está y cómo se trabaja.
- Las decisiones relevantes DEBEN quedar escritas en el repositorio, no solo en conversaciones.

**Razón**: cada sesión de Claude empieza sin memoria; lo que no está en el repositorio se
pierde.

### X. Idioma

- Interfaz de usuario y documentación (specs, planes, `CLAUDE.md`, README): **español**.
- Código, identificadores, nombres de variables, esquemas de base de datos y mensajes de
  commit: **inglés**.

**Razón**: el equipo y los clientes trabajan en español; el código en inglés sigue las
convenciones del ecosistema y de las herramientas.

## Contexto de Nexoru

- **Empresa**: Nexoru es una empresa de IA que construye productos y servicios con Claude:
  agentes, integraciones, sistemas y apps.
- **Productos actuales**:
  - **Conversa**: en operación en un dominio del cliente, fuera de nexoru.ai.
  - **Ganador** y **Amazon Business Engine**: en subdominios de nexoru.ai
    (p. ej. `abe.nexoru.ai`).
- **Ciclo de vida de un producto**: se construye en el stack de Nexoru (principio IV) y después
  se migra al dominio real del cliente. Todo producto DEBE diseñarse para que esa migración sea
  posible sin reescritura: dominio, credenciales y datos del cliente configurables por entorno.
- **Activos propios**:
  - `nexoru.ai`: one pager comercial.
  - `app.nexoru.ai`: wizard de onboarding. Todo servicio se ofrece a través del wizard.
  - `op.nexoru.ai`: Nexoru Op, este sistema.
- **WhatsApp**: número +52 55 8648 8746 en Meta, portafolio principal PMAAS TOTAL. Es el
  contacto comercial y también el número de pruebas; toda prueba que envíe mensajes DEBE
  tenerlo en cuenta para no afectar conversaciones comerciales reales.
- **Cuenta administradora única**: `admin@nexoru.ai`.
- **Organización de proyectos**: cada proyecto vive en `/proyectos/<nombre>` con su propio
  repositorio en GitHub.

## Flujo de desarrollo y puertas de calidad

- **Flujo Spec Kit**: constitution → specify → clarify → plan → tasks → analyze → implement.
  No se omiten pasos.
- **Puertas de aprobación**:
  1. `spec.md` aprobada antes de planificar.
  2. `plan.md` aprobado antes de generar tareas. Su verificación constitucional DEBE cubrir los
     diez principios, con especial atención al costo mensual (III) y a la tecnología nueva (IV).
  3. `tasks.md` aprobado, tras `/speckit-analyze` sin hallazgos críticos, antes de escribir
     código de la aplicación.
- **Ramas y merges**: `main` está protegida. Cada feature se desarrolla en su propia rama (la que
  crea Spec Kit) y se integra solo mediante pull request.
- **Revisión de PR**: todo PR DEBE verificar que las pruebas están en verde (VI), que no
  introduce secretos (II), que toda tabla nueva tiene RLS (I) y que la spec refleja lo
  implementado (V).

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica, guía o convención del repositorio.
  Ante un conflicto, gana la constitución.
- **Enmiendas**: cambiar, añadir o eliminar un principio requiere una enmienda explícita: un PR
  dedicado que modifique este documento, explique el motivo y el impacto en specs y planes
  existentes, y sea aprobado por el responsable del proyecto.
- **Versionado semántico**:
  - MAJOR: se elimina o redefine un principio o una regla de gobernanza de forma incompatible.
  - MINOR: se añade un principio o sección, o se amplía materialmente una guía.
  - PATCH: aclaraciones, redacción o erratas sin cambio de significado.
- **Cumplimiento**: cada `plan.md` incluye una verificación constitucional; toda desviación se
  justifica por escrito o se corrige antes de continuar. Cada PR se revisa contra esta
  constitución.
- **Guía operativa**: `CLAUDE.md` describe cómo trabajar día a día en cada repositorio y DEBE
  mantenerse coherente con esta constitución.
- **Adopción en otros repositorios**: cada repositorio de Nexoru copia esta constitución como
  base e indica la versión de la que parte.

**Versión**: 1.0.0 | **Ratificada**: 2026-09-26 | **Última enmienda**: 2026-09-26
