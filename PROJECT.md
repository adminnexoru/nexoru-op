---
id: nexoru-op
nombre: Nexoru Op
tipo: interno
cliente: Nexoru
fase: construccion
fase_desde: 2026-09-26
estado: verde
despliegue: local
repo: adminnexoru/nexoru-op
fecha_inicio: 2026-09-26
fecha_objetivo: 2026-11-08
stack:
  - nextjs
  - typescript
  - supabase
  - docker
servicios:
  - have-i-been-pwned
costo_mensual_usd: 0
siguiente_hito: "Fase 3: cerrar 003-git-history-insights (historias US1 a US5 construidas; falta documentación, validación con el portafolio real, PR y merge)"
mapa_funcional: docs/mapa-funcional.md
version_estandar: "1.0"
---

# Nexoru Op

> Este archivo es la portada ejecutiva. El diseño funcional vive en [docs/mapa-funcional.md](docs/mapa-funcional.md) y el detalle técnico en `specs/` y `.specify/memory/constitution.md`. Si algo aquí no coincide con `specs/`, **`specs/` es la fuente de verdad**, salvo que el código y la documentación técnica coincidan entre sí y la spec sea la que quedó desactualizada.

## Resumen ejecutivo

**Misión:** mostrar al Dueño, en un solo lugar y sin captura manual, el estado real de todos los proyectos de Nexoru.

**Problema:** el estado de cada proyecto está repartido entre su `PROJECT.md`, sus specs, su historial de git y GitHub. Revisarlo proyecto por proyecto es lento, y un tablero capturado a mano se desincroniza de la realidad.

**Qué es:** un dashboard local, de solo lectura y para un solo usuario, que se alimenta automáticamente de los archivos de cada proyecto en `PROJECTS_ROOT`, de git y, en solo lectura, de GitHub, e interpreta esos datos según el Estándar de Proyecto Nexoru (`nexoru-governance`). No envía nada ni escribe en ningún proyecto.

**Para quién:** el Dueño de Nexoru (`admin@nexoru.ai`), en su máquina.

**Métricas de éxito:** (1) el Dueño conoce el estado de todo el portafolio en menos de 1 minuto; (2) el 100 % de los proyectos de `PROJECTS_ROOT` aparece evaluado contra el estándar sin captura manual; (3) cero discrepancias entre lo que muestra el dashboard y los archivos de cada proyecto en las revisiones del Dueño.

## Alcance

**Incluye:** acceso seguro del Dueño (contraseña y TOTP obligatorio), bitácora de auditoría (consultable desde Supabase Studio del entorno de uso), puesta en marcha local con entornos de uso y de pruebas separados, y, en las fases siguientes, la lectura segura del portafolio, la evaluación de conformidad con el estándar, el historial de git y los datos de GitHub en solo lectura.

**Fuera de alcance:**
- Cualquier acción hacia afuera: correos, WhatsApp, notificaciones, escrituras en proyectos, git o GitHub (principio XII: un sistema de información que actúa deja de ser neutral).
- Colaboradores y cuentas distintas del Dueño (backlog B-003 y B-004; requiere enmienda de la constitución).
- Recuperación de contraseña por correo (backlog B-005; hay procedimiento local).
- Pantalla de consulta de la bitácora (backlog B-007; con un solo usuario basta con Supabase Studio).
- Despliegue en la nube (backlog B-006; principio III: ejecución local y costo cero).
- Integraciones de escritura, automatizaciones, agentes y Cowork ("Visión futura" de la constitución).

## Roadmap

El estado de cada fase lo calcula el dashboard a partir de `tasks.md` de las specs vinculadas. La Fase 1 (`001-user-access`) se redefinió el 2026-09-28 (constitución v2.0.0): su `tasks.md` conserva como hechas las tareas del diseño anterior y añade las de la redefinición. La Fase 1 cerró el 2026-09-28 con el merge del PR #1 a `main`. La Fase 2 (`002-portfolio-conformance`) cerró el 2026-10-01 con el merge del PR #2 a `main`. La Fase 3 (`003-git-history-insights`) se deriva de su `tasks.md`. La Fase 4 no tiene spec y lleva estado manual.

| Fase | Objetivo | Specs | Fecha objetivo | Estado manual |
|---|---|---|---|---|
| 1 | Acceso seguro del Dueño, bitácora y puesta en marcha local | 001-user-access | — | |
| 2 | Lector seguro del portafolio y conformidad con el estándar | 002-portfolio-conformance | — | |
| 3 | Historial de git, indicadores de conformidad y avance, identidad visual y gráficos | 003-git-history-insights | 2026-10-25 | |
| 4 | Datos de GitHub en solo lectura (CI, visibilidad, PRs) | — | 2026-11-08 | pendiente |

## Decisiones clave

| Decisión | Razón |
|---|---|
| Dashboard local, de solo lectura y para un solo usuario (constitución v2.0.0) | El valor está en ver el estado real del portafolio sin captura manual ni riesgo operativo; no justifica nube ni multiusuario |
| Los archivos de cada proyecto son la fuente de verdad; la base solo guarda autenticación, bitácora e índice regenerable | Aplica la regla central (a) del estándar: lo derivable no se captura a mano |
| Sin envío de correo ni notificaciones | Principio XII; se eliminó `nodemailer` y todo lo que dependía de él |
| Segundo factor TOTP obligatorio y permisos aplicados en la base de datos (RLS que exige AAL2) | Aunque sea local, el dashboard concentra información de todo el portafolio |
| Bloqueo de 15 min tras 5 fallos por correo + IP | Protege frente a intentos repetidos; en local actúa en la práctica por correo, y el mecanismo sirve si algún día hubiera despliegue |
| Activación del Dueño con un enlace de un solo uso mostrado en la terminal | Reutiliza la pantalla ya probada y evita que la contraseña pase por la terminal |
| CSP con nonce por petición, sin `'unsafe-eval'` ni `'unsafe-inline'` en scripts | Un script inyectado no se ejecuta |
| Dos instancias de Supabase local (uso y pruebas) con salvaguardas | Ninguna limpieza de pruebas puede borrar la cuenta del Dueño |
| La app, la base de datos y Supabase Studio escuchan solo en `127.0.0.1` (Docker configurado con `{"ip": "127.0.0.1"}`) | Docker publica por defecto en todas las interfaces: la base (`postgres`/`postgres`) y Studio (sin contraseña) quedarían accesibles desde la red local |
| La bitácora se consulta desde Supabase Studio del entorno de uso | Con un solo usuario no justifica una pantalla propia (B-007) |
| Se conservan en la base los roles y la matriz de permisos ya construidos | Están probados; quitarlos cuesta más que mantenerlos y se retoman con B-003 |
| Repo público | Tipo `interno` sin datos sensibles; permite rulesets y CI gratuitos. La constitución v2.0.0 retiró el número de WhatsApp y la lista de productos, que siguen en el historial de git |
| Una sola puerta al disco del portafolio (`safe-fs.ts`) con catálogo cerrado de rutas del estándar, rutas reales dentro de `PROJECTS_ROOT` y lista de nombres de secretos | El portafolio contiene repos con secretos locales; un lector sin límites los expondría (principio XIII) |
| Git solo con 6 comandos fijos, sin shell, con `core.fsmonitor` desactivado y `--no-optional-locks` | Un `.git/config` puede hacer que `git status` ejecute un programa, y `git status` normal reescribe `.git/index`; así no se ejecuta nada del repo ni cambia ningún archivo |
| Reglas de conformidad como código puro y probado, por versión del estándar (`src/lib/standard/v1_0/`); solo se evalúan versiones soportadas | Una versión nueva del estándar es una carpeta nueva, no condiciones repartidas; evaluar con otra versión daría resultados falsos (principio XIV) |
| Mientras GitHub no se consulte (Fase 4), la verificación 3.2 queda "no evaluada" y el nivel 3 se muestra como provisional | No se presenta como cumplido lo que no se verificó |
| La correspondencia fila–servicio de la tabla de costos (1.10) se compara normalizada (minúsculas, espacios a guiones) | El estándar 1.0 no la define y `amazon-business-engine` usa nombres legibles; aclaración propuesta para el estándar 1.0.1 |
| Índice regenerable en una sola fila `jsonb`, que se vuelve a leer si tiene más de 10 minutos o con Actualizar; guardarlo no deja evento de bitácora | Solo se consulta completo; no es una acción sobre la cuenta |
| Cada proyecto se lee tal como está en disco, con aviso si no está en su rama principal o tiene cambios sin commit | Decisión del Dueño (clarify de la Fase 2): datos reales y aviso de cuándo desconfiar |
| Dependencia nueva: `yaml` 2.x (sin dependencias, sin costo) | YAML 1.2 con acceso a nodos y comentarios, necesario para las verificaciones 1.2, 1.5, 1.6 y 3.1 |

## Costo mensual

| Servicio | USD/mes | Nota |
|---|---|---|
| Have I Been Pwned (`have-i-been-pwned`) | — | Sin costo. API pública de consulta k-anonymity |
| Supabase local (Docker) | — | Sin costo |
| GitHub (repo público y Actions) | — | Sin costo |
| **Total** | **0** | |

## Riesgos, bloqueos y dependencias

- **Riesgo de calidad:** los procedimientos manuales de recuperación (2FA perdido sin códigos y contraseña olvidada) están documentados pero no se han validado con la cuenta real (backlog B-008).
- **Dependencia:** Docker y Node.js 24 en la máquina del Dueño. Supabase se arranca siempre con `npm run db:start` / `npm run op:start`, que crean su red de Docker solo en `127.0.0.1` (la opción `ip` de `daemon.json` no la cubre).
- **Riesgo de calidad:** las dos pilas de Supabase local (uso y pruebas) consumen unos 2–3 GB de memoria cada una; la de pruebas se puede detener cuando no se usa.
- **Dependencia:** la conformidad se evalúa con el Estándar de Proyecto Nexoru v1.0 (`nexoru-governance`); cada versión nueva del estándar puede requerir actualizar el dashboard (principio XIV).
- **Riesgo de calidad:** el repo es público; la constitución anterior, con el número comercial de WhatsApp y la lista de productos, sigue visible en el historial de git.
- **Riesgo de calidad:** la regla normalizada de la verificación 1.10 es una interpretación del dashboard hasta que el estándar 1.0.1 la aclare (pendiente de la sesión de portafolio, anotado en `/home/fili/proyectos/CLAUDE.md`).
- **Riesgo de calidad:** `nexoru-onboarding-line-endings` es un worktree de `nexoru-onboarding`, no un proyecto, y hoy se evalúa como tal (nivel 0) hasta que exista una forma de excluir carpetas (`.nexoruignore`, backlog B-011).

## Pendientes conocidos

- Backlog en `specs/backlog.md`: B-001 a B-011. En particular, B-008 (validar los procedimientos manuales de recuperación), B-009 (`op:backup` / `op:restore`, opcional), B-010 (adoptar el look and feel de `nexoru-onboarding`; entra en la Fase 3) y B-011 (soportar `.nexoruignore`).
- **Para la Fase 4 (spec y plan)**: al activar la verificación 3.2 (CI de `main` en GitHub), la base
  de Conformidad pasará de 28 a 29 verificaciones aplicables y los porcentajes pueden bajar sin que
  el proyecto empeore. La Fase 4 debe mostrar ese cambio de base de forma explícita (contrato
  `specs/003-git-history-insights/contracts/indicators-ui.md`).
- Para la sesión de portafolio: aclaración del estándar 1.0.1 (correspondencia fila–servicio) y propuesta de `.nexoruignore`.

## Evidencia de validación

| Qué | Evidencia |
|---|---|
| US1 sin correo: 2FA obligatorio, bloqueo por correo + IP, IP no falsificable, inactividad, 12 h, códigos de recuperación y cabeceras | En local (no hay producción): Playwright 17/17 (incluye 3 de activación por enlace en la terminal), pgTAP 72/72 y Vitest 77/77, el 2026-09-28 en la rama `001-user-access`. La CI pasó en el PR #1 y, tras el merge, en `main` (ejecución 36499343842, commit `b0fa233`, 2026-09-28) |
| Activación del Dueño en el entorno de uso (SC-003) | 20 segundos desde `op:bootstrap-owner` hasta entrar; la cuenta persiste tras `op:stop` / `op:start` (2026-09-28, entorno de uso) |
| Las pruebas no tocan el entorno de uso (SC-012) | Huella de `op:fingerprint` idéntica (`965bcf22f806afa5`) antes y después de Vitest, pgTAP y Playwright, con el entorno de uso en marcha (2026-09-28) |
| Todo escucha solo en `127.0.0.1` (FR-033) | `ss -ltn`: app (3000, 3200) y las dos instancias de Supabase (5432x, 5532x) solo en `127.0.0.1`; desde la IP de red y desde otro dispositivo no responden (2026-09-28) |
| Bitácora inmutable y consultable desde Studio (FR-028, FR-038) | La consulta del quickstart devuelve los eventos del entorno de uso; un `update` falla con `audit_events is append-only` (2026-09-28) |
| CSP con nonce | La app de uso responde con `script-src 'self' 'nonce-…' 'strict-dynamic'`, sin `'unsafe-eval'`; las E2E fallan ante cualquier violación de CSP y no hubo ninguna |
| Fase 2: lector seguro, git, conformidad v1.0, portafolio, detalle, roadmap y versiones | CI en verde en el PR #2 y, tras el merge, en `main` (ejecución 36940235574, commit `46a673d`, 2026-10-01). En local, rama `002-portfolio-conformance`, 2026-10-01: Vitest 281/281 (una prueba por verificación de conformidad, enlaces fuera de la raíz, `.env`, FIFO, archivo > 1 MB, `core.fsmonitor` malicioso), pgTAP 88/88 y Playwright 38/38, con un portafolio ficticio |
| Solo lectura sobre el portafolio real (SC-007) | Entorno de uso, 2026-10-01: antes y después de pulsar Actualizar, fechas de modificación y tamaño de 5206 archivos de `/home/fili/proyectos` idénticos y `git status` de los 7 repos sin cambios |
| Validación con el portafolio real (quickstart Fase 2, escenarios 1–13) | Validada por el Dueño el 2026-10-01 en el entorno de uso: 6 proyectos y el estándar aparte; niveles: `amazon-business-engine` 3 (provisional), `nexoru-op` 3 (provisional) y 0 los cuatro sin `PROJECT.md`; ramas y avisos correctos; Actualizar, vencimiento a 10 min y acceso sin sesión (redirige a `/login`) comprobados; sin discrepancias con los `PROJECT.md` |
| Identidad visual de la Fase 3 (US3) | Aprobada por el Dueño el 2026-10-02 en el entorno de uso, después de una primera revisión que encontró el botón Actualizar sin acento y el ancho limitado (corregidos en `db3a2cf`). Pruebas: contraste AA calculado desde `tokens.css` y E2E con los colores, anchos y fuente que calcula el navegador (`tests/e2e/us3-visual-render.spec.ts`) |
| Lectura de 50 proyectos (SC-006) | Prueba unitaria: 50 copias de un proyecto ficticio con repo git se leen en menos de 10 s |

## Siguiente hito

Fase 3: cerrar 003-git-history-insights (historias US1 a US5 construidas; falta documentación, validación con el portafolio real, PR y merge).

1. **Hecho:** historial de git (US1), estándar 1.1 y `.nexoruignore` (US5), Conformidad y Avance (US2), identidad visual aprobada por el Dueño (US3) y gráficos (US4), con la CI de la rama en verde.
2. **Cierre (T048–T055 de `specs/003-git-history-insights/tasks.md`):** documentación y revisión de seguridad; validación de `.nexoruignore` con una carpeta de prueba; `version_estandar` 1.1 en `amazon-business-engine` y `nexoru-op`; validación con el portafolio real; `PROJECT.md` y mapa funcional; PR con CI en verde y merge. Fecha objetivo de la fase: 2026-10-25.
