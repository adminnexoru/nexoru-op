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
  Proyecto Nexoru (constitución v2.0.1). Next.js + Supabase local; los detalles están en
  `plan.md` de cada feature.
- **Nunca** envía correos ni notificaciones ni escribe en los proyectos, en git o en GitHub.
- **Lector seguro (principio XIII)**: todo acceso al disco del portafolio pasa por
  `src/lib/portfolio/safe-fs.ts` (catálogo cerrado de rutas del estándar, rutas reales dentro de
  `PROJECTS_ROOT`, nunca abre `.env*` ni llaves) y todo git por `src/lib/portfolio/git.ts` (comandos
  fijos de solo lectura, sin shell). Ningún otro archivo importa `node:fs` ni `node:child_process`
  para leer proyectos (`specs/002-portfolio-conformance/contracts/reader.md`).
- **Git endurecido**: todo comando de git lleva el **prefijo v2** (`PREFIX` en `git.ts`;
  `specs/003-git-history-insights/contracts/git-history.md`), que neutraliza la configuración de un
  repo que podría ejecutar programas: `core.fsmonitor`, filtros `clean` (con `--attr-source` al árbol
  vacío y `core.attributesFile=/dev/null`), firmas, ganchos, submódulos y mantenimiento, además de
  `GIT_OPTIONAL_LOCKS=0` y `--no-optional-locks`. `log -p` lleva `--no-ext-diff --no-textconv`. Si
  existe `.git/info/attributes` no se ejecuta `status` ("no evaluado"). Nunca `fetch`, `pull`,
  `push` ni ningún comando que escriba en `.git`. Un comando nuevo exige su prueba en
  `tests/unit/portfolio/git-hardening.test.ts`.
- **Interfaz sin estilos en línea**: la CSP bloquea los atributos `style`; todo va por clases. Los
  tokens de diseño están en `src/app/tokens.css` y sus decisiones en `docs/identidad-visual.md`. Los
  gráficos son SVG generados en el servidor, sin librería ni JavaScript. Los textos con números
  pasan por `src/lib/format.ts` (singular y plural, "%" con espacio no separable, nombres legibles
  de las fases).
- **Nunca** se suben archivos `.env*` ni secretos al repositorio. El `.gitignore` los bloquea; si hace falta documentar variables, usa `.env.example` sin valores reales.

## Comandos y entornos

Hay **dos entornos locales separados** (research R13 de `specs/001-user-access/`); ningún script de
un entorno puede tocar el otro (`scripts/env-guard.ts`):

| Entorno | Supabase | App | Variables | Comandos |
|---------|----------|-----|-----------|----------|
| Pruebas y desarrollo | `supabase/` (API `127.0.0.1:54321`) | `http://127.0.0.1:3000` | `.env.local` | `npm run db:start`, `npm run dev`, `npm test`, `npm run db:test`, `npm run test:e2e`, `npm run bootstrap:owner` |
| Uso del Dueño | `ops/supabase/` (API `127.0.0.1:55321`) | `http://127.0.0.1:3200` | `.env.op.local` | `npm run op:start`, `npm run op:stop`, `npm run op:bootstrap-owner`, `npm run op:fingerprint` |

- Todo escucha solo en `127.0.0.1`. Arranca Supabase siempre con `npm run db:start` / `npm run op:start`:
  crean la red de Docker de Supabase con `host_binding_ipv4=127.0.0.1` (la opción `ip` de
  `daemon.json` no cubre esa red).
- **Nunca** ejecutes pruebas, `supabase db reset` ni limpiezas contra el entorno de uso: guarda la
  cuenta real del Dueño y su bitácora.
- Antes de `npm run db:test`, resetea la base de pruebas (`npx supabase db reset`): las E2E dejan
  datos que chocan con los fixtures de pgTAP.
- Estructura: `src/app` (páginas: `/` portafolio y `/projects/[folder]` detalle), `src/lib` (auth,
  Supabase, IP, contraseñas), `src/lib/portfolio` (lector seguro, git, lectura del portafolio e
  índice, historial de git e `.nexoruignore`), `src/lib/standard` (reglas puras de conformidad: un
  motor en `v1_0/` con reglas por versión en `rules.ts`, e indicadores), `src/lib/charts` (datos de
  los gráficos), `src/lib/format.ts`, `src/components/portfolio`, `src/components/status`
  (semáforos), `src/components/charts`, `src/app/tokens.css`, `src/proxy.ts` (CSP con nonce y sesión), `supabase/migrations`
  (esquema, RLS y funciones, compartido por los dos entornos), `supabase/tests` (pgTAP),
  `tests/unit` (Vitest), `tests/e2e` (Playwright), `tests/fixtures/portfolio` (portafolio ficticio),
  `scripts/` (bootstrap y `op:*`).
- `PROJECTS_ROOT`: carpeta del portafolio. En uso va en `.env.op.local` (`/home/fili/proyectos`).
  Las pruebas generan solas una copia temporal del portafolio ficticio (`nexoru-op-fixture-*`) y
  `assertTestProjectsRoot` impide que lean cualquier otra carpeta; no la pongas en `.env.local`.
  Las carpetas listadas en `PROJECTS_ROOT/.nexoruignore` (estándar 1.1) no se leen ni se muestran.
- Regla de la base de datos: toda tabla con RLS y toda mutación sensible mediante función
  `security definer` que escribe su evento en la bitácora en la misma transacción.
  Excepción documentada: `save_portfolio_snapshot` guarda el índice regenerable del portafolio sin
  evento de bitácora (no es una acción sobre la cuenta).
- Todo cambio llega a `main` por PR con CI en verde; el push lo autoriza el Dueño tras revisar.
- **Commit solo con la verificación completa en verde**: el commit se ejecuta únicamente si la
  verificación termina con éxito, encadenando los comandos con `&&` en una sola línea (nunca
  separados ni con `;`), para que cualquier fallo detenga el commit. Ejemplo:
  `npm test && npm run lint && npm run typecheck && npx supabase db reset && npm run db:test && npm run test:e2e && git commit …`.
  Si una prueba falla de forma intermitente, se investiga y se registra; nunca se hace commit "porque
  la siguiente corrida pasó" (decisión del Dueño, 2026-10-04).

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
