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
siguiente_hito: "Cerrar la Fase 1: retirar el correo y puesta en marcha local (001-user-access)"
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

El estado de cada fase lo calcula el dashboard a partir de `tasks.md` de las specs vinculadas. La Fase 1 (`001-user-access`) se redefinió el 2026-09-28 (constitución v2.0.0): su `tasks.md` conserva como hechas las tareas del diseño anterior y añade las de la redefinición. Las fases 2 a 4 no tienen spec todavía, por eso llevan estado manual.

| Fase | Objetivo | Specs | Fecha objetivo | Estado manual |
|---|---|---|---|---|
| 1 | Acceso seguro del Dueño, bitácora y puesta en marcha local | 001-user-access | 2026-10-04 | |
| 2 | Lector seguro del portafolio y conformidad con el estándar | — | 2026-10-18 | pendiente |
| 3 | Historial de git por proyecto | — | 2026-10-25 | pendiente |
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

## Costo mensual

| Servicio | USD/mes | Nota |
|---|---|---|
| Have I Been Pwned (`have-i-been-pwned`) | — | Sin costo. API pública de consulta k-anonymity |
| Supabase local (Docker) | — | Sin costo |
| GitHub (repo público y Actions) | — | Sin costo |
| **Total** | **0** | |

## Riesgos, bloqueos y dependencias

- **Riesgo de calidad:** el ruleset de `main` todavía no exige el check de CI (verificado con `gh` el 2026-09-28); hasta que se active (T082 de `specs/001-user-access/`), un merge con pruebas en rojo no quedaría bloqueado.
- **Dependencia:** Docker (configurado solo en local) y Node.js 24 en la máquina del Dueño.
- **Riesgo de calidad:** las dos pilas de Supabase local (uso y pruebas) consumen unos 2–3 GB de memoria cada una; la de pruebas se puede detener cuando no se usa.
- **Dependencia:** la conformidad se evalúa con el Estándar de Proyecto Nexoru v1.0 (`nexoru-governance`); cada versión nueva del estándar puede requerir actualizar el dashboard (principio XIV).
- **Riesgo de calidad:** el repo es público; la constitución anterior, con el número comercial de WhatsApp y la lista de productos, sigue visible en el historial de git.

## Pendientes conocidos

- Fase 3b de `specs/001-user-access/tasks.md` (T060–T065): retirar el correo, adaptar la activación del Dueño y dejar todos los servidores solo en `127.0.0.1`.
- Fase 4 (T066–T077): Docker solo en local, puesta en marcha local, entornos separados y validación del aislamiento.
- Fase 5 (T078–T084): revisión de seguridad, validación completa, ruleset con CI y PR hacia `main`.
- Backlog en `specs/backlog.md`: B-001 a B-007.

## Evidencia de validación

| Qué | Evidencia |
|---|---|
| US1: inicio de sesión con 2FA, bloqueo por correo + IP, IP no falsificable, inactividad, 12 h, códigos de recuperación y cabeceras | En local y en CI (no en producción), con el diseño anterior a la redefinición (aún con correo): Playwright 14/14, pgTAP 74/74 y Vitest 83/83. CI: ejecución 36466874823 del 2026-09-28 en la rama `001-user-access` |
| CSP con nonce sin violaciones | Las 14 E2E registran cualquier violación de CSP en la consola del navegador y fallan si aparece alguna; ninguna apareció |

## Siguiente hito

Cerrar la Fase 1: retirar el correo y puesta en marcha local (`001-user-access`), con fecha objetivo 2026-10-04.

1. **Fase 3b:** US1 sin correo y con la activación por enlace en la terminal.
2. **Fase 4:** Docker solo en local; `op:start` / `op:stop` con entornos separados; el Dueño activa su cuenta en el entorno de uso.
3. **Fase 5:** PR de `001-user-access` hacia `main`, con el check de CI obligatorio activo.
