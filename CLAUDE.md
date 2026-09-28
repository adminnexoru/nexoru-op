@AGENTS.md

# CLAUDE.md — nexoru-op

Guía para Claude Code en este repositorio. Léela antes de hacer cualquier cambio.

## Qué es Spec Kit

Este proyecto sigue **Spec-Driven Development (SDD)** con [Spec Kit](https://github.com/github/spec-kit) de GitHub.
La idea central: la especificación es la fuente de verdad y el código se deriva de ella, no al revés.
Primero se acuerda *qué* se construye y *por qué*, luego *cómo*, luego se desglosa en tareas, y solo entonces se implementa.

Spec Kit está instalado para Claude: cada paso del flujo es una skill en `.claude/skills/speckit-*/`
y se invoca como slash command (`/speckit-specify`, `/speckit-plan`, etc.).

## Dónde vive cada cosa

| Ruta | Contenido |
|------|-----------|
| `.specify/memory/constitution.md` | **Constitución**: principios no negociables del proyecto. Todo spec, plan y tarea debe respetarla. |
| `specs/<NNN-nombre-feature>/` | Una carpeta por feature, con sus artefactos: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`, `checklists/`. |
| `.specify/templates/` | Plantillas que usan los comandos para generar los artefactos. |
| `.specify/scripts/bash/` | Scripts auxiliares (crear feature, comprobar prerrequisitos). |
| `.claude/skills/speckit-*/` | Definición de cada comando de Spec Kit. |

## Flujo obligatorio

Siempre en este orden:

1. **`/speckit-constitution`** — crear o actualizar los principios del proyecto (una vez al inicio; se revisa cuando cambian las reglas).
2. **`/speckit-specify`** — describir la feature (qué y por qué, sin detalles técnicos). Genera `specs/<feature>/spec.md`.
3. **`/speckit-clarify`** — resolver ambigüedades del spec con preguntas dirigidas; las respuestas se integran en `spec.md`.
4. **`/speckit-plan`** — diseño técnico (stack, arquitectura, modelo de datos, contratos). Genera `plan.md` y artefactos de diseño.
5. **`/speckit-tasks`** — desglose en tareas ordenadas por dependencias. Genera `tasks.md`.
6. **`/speckit-analyze`** — análisis de consistencia (no destructivo) entre `spec.md`, `plan.md`, `tasks.md` y la constitución.
7. **`/speckit-implement`** — ejecutar las tareas de `tasks.md`.

No te saltes pasos. Si un artefacto previo no existe o está desactualizado, vuelve al paso correspondiente.

## Regla de oro

**Nunca se escribe código de la aplicación sin un `tasks.md` aprobado por el usuario** para la feature en curso.

- Aprobado significa que el usuario lo ha revisado y lo ha confirmado explícitamente (idealmente tras `/speckit-analyze` sin problemas críticos).
- Toda implementación debe corresponder a una tarea de ese `tasks.md`. Si surge trabajo no previsto, se actualiza primero el spec/plan/tasks y se vuelve a pedir aprobación.
- Excepción: archivos de configuración del repositorio y de Spec Kit (este `CLAUDE.md`, `.gitignore`, constitución, specs) no son código de la aplicación.

## Stack y seguridad

- **Qué es Nexoru Op**: dashboard local, de solo lectura y para un solo usuario (el Dueño), que
  muestra el estado del portafolio leyendo los proyectos de `PROJECTS_ROOT` según el Estándar de
  Proyecto Nexoru (constitución v2.0.0). Next.js + Supabase local; los detalles están en
  `plan.md` de cada feature.
- **Nunca** envía correos ni notificaciones ni escribe en los proyectos, en git o en GitHub.
- **Nunca** se suben archivos `.env*` ni secretos al repositorio. El `.gitignore` los bloquea; si hace falta documentar variables, usa `.env.example` sin valores reales.

## Repositorio público: qué nunca entra al repo

El repositorio `adminnexoru/nexoru-op` es **público** (decisión del Dueño por costo; se revisará antes de que el sistema maneje datos de clientes, ver `specs/001-user-access/research.md` R11). Todo lo que se sube lo puede leer cualquiera.

- **Nunca** datos reales de clientes, en ningún archivo: código, specs, fixtures, logs, issues ni descripciones de PR.
- **Nunca** correos personales ni de terceros. Los únicos correos reales permitidos son las cuentas de Nexoru que ya figuran en la constitución (`admin@nexoru.ai`) y el remitente `no-reply@nexoru.ai`.
- **Nunca** capturas de pantalla ni grabaciones del sistema, porque pueden mostrar usuarios, la bitácora o configuración.
- En pruebas y seeds se usan **solo datos ficticios**: correos en dominios reservados (`@example.com`, `@example.test`), nombres inventados e IP de documentación (`192.0.2.0/24`, `198.51.100.0/24`).
- GitHub tiene activados Secret scanning y Push protection, que rechazan un push con una llave reconocible. Es una segunda barrera; la primera es no escribir nunca un secreto en un archivo del repo.

## Documentación de proyecto (Estándar Nexoru)

Al cerrar cada fase, actualiza `PROJECT.md` (roadmap, specs vinculadas, decisiones clave,
costo mensual, riesgos, pendientes, evidencia de validación y siguiente hito) y
`docs/mapa-funcional.md` (componentes, flujo, reglas, datos y fuentes, integraciones) para
que reflejen lo construido. El mapa funcional no lleva estados de avance.

- Si algo no coincide con `specs/`, `specs/` es la fuente de verdad. Excepción: si el
  código y la documentación técnica coinciden entre sí y la spec quedó desactualizada, se
  corrige la spec. Reporta siempre qué cambiaste y por qué.
- No captures a mano lo que se deriva de git, GitHub o Spec Kit (fecha del primer commit,
  estado de fases con `tasks.md`, estado de la CI).
- Lo que no sepas y no puedas derivar va como `CONFIRMAR` para que lo responda el Dueño;
  nunca lo inventes. Un proyecto con `CONFIRMAR` no es conforme.
- Estándar: https://github.com/adminnexoru/nexoru-governance (versión en
  `version_estandar` de `PROJECT.md`).
