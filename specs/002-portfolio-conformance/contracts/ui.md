# Contrato: pantallas y acciones

Todas las rutas quedan detrás del acceso de la Fase 1: `proxy.ts` exige AAL2 y el layout
`(app)` lo vuelve a comprobar (FR-014). Toda la interfaz está en español.

## `GET /`: portafolio (US1, US4)

- **Carga**: lee el índice. Si está vacío, no es válido o tiene más de 10 minutos, lee el
  portafolio, lo guarda y lo muestra en la misma petición (FR-012, FR-013).
- **Muestra**:
  - encabezado con "Última lectura: <fecha y hora local>", versiones soportadas, versión del
    estándar encontrada y el botón **Actualizar**;
  - avisos generales: `PROJECTS_ROOT` no configurado o inválido, estándar no encontrado o más
    nuevo que el soportado, `id` duplicados;
  - tabla por proyecto: Proyecto (nombre o carpeta, con enlace al detalle), Tipo, Cliente, Fase,
    Estado, Fecha objetivo, Siguiente hito, Nivel y Rama;
    - Nivel: `0`–`3`, `3 (provisional)`, "versión no soportada (X.Y)" o "sin versión";
    - Rama: el nombre, con distintivo si no es la principal o si hay cambios sin commit;
  - bloque aparte **Estándar**: `nexoru-governance`, versión vigente, sin nivel;
  - un dato ausente se muestra como "—" con `title`/texto accesible "ausente"; nunca un valor por
    defecto.
- **Vacío**: si no hay proyectos, un mensaje que explica el motivo (`root.status`).

## `GET /projects/[folder]`: detalle (US2, US3)

- `folder` se busca por igualdad exacta en `projects[].folder` del índice. Si no está, la
  respuesta es `notFound()`. **Nunca se usa como ruta del sistema de archivos.**
- **Secciones**:
  1. **Manifiesto**: todos los campos (FR-016), ausentes marcados como tales, y el motivo si no
     hay manifiesto.
  2. **Repositorio**: rama actual, rama principal, avisos y remoto `origin` (`org/nombre`).
  3. **Roadmap**: tabla Fase, Objetivo, Specs, Fecha objetivo y Estado. El Estado lleva el
     distintivo "derivado (hechas/total)" o "manual". Si no hay roadmap, se muestra como ausente.
  4. **Conformidad**: nivel (y provisional); fallas del siguiente nivel (número y detalle);
     advertencias; hallazgos con severidad; verificaciones no evaluadas con su motivo; y una lista
     plegable con todas las verificaciones y su estado.
  5. **Errores de lectura**: ruta relativa y motivo (FR-029).
- Usa el mismo índice que `/`; no lanza una lectura propia.

## Server Action `refreshPortfolio()`

- Solo se invoca desde el formulario del botón **Actualizar** en `/`.
- Comprueba la sesión con AAL2 (como toda action), lee el portafolio, llama a
  `save_portfolio_snapshot` y ejecuta `revalidatePath("/")`.
- Sin parámetros: el cliente no puede elegir qué ruta se lee.
- Errores: si el guardado falla, muestra un mensaje genérico en español; los detalles solo van al
  log del servidor, sin contenido de archivos.
- Mientras corre, el botón queda deshabilitado con el texto "Leyendo…".

## Navegación

El encabezado del layout cambia "Inicio" por "Portafolio" (`/`) y conserva "Mi cuenta".
