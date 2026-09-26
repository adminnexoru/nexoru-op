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

- Aplicación prevista: **Next.js** (los detalles se fijan en `plan.md` de cada feature).
- **Nunca** se suben archivos `.env*` ni secretos al repositorio. El `.gitignore` los bloquea; si hace falta documentar variables, usa `.env.example` sin valores reales.
