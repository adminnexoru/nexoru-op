---
id: nexoru-op
nombre: Nexoru Op
tipo: interno
cliente: Nexoru
fase: operacion
fase_desde: 2026-10-04
estado: verde
despliegue: local
repo: adminnexoru/nexoru-op
fecha_inicio: 2026-09-26
stack:
  - nextjs
  - typescript
  - supabase
  - docker
servicios:
  - have-i-been-pwned
  - github-api
costo_mensual_usd: 0
siguiente_hito: "Incremento planeado de prioridad alta: Operabilidad (B-014 y clasificación de las vulnerabilidades de npm audit)"
mapa_funcional: docs/mapa-funcional.md
version_estandar: "1.2"
visibilidad: publico
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

**Incluye:** acceso seguro del Dueño (contraseña y TOTP obligatorio), bitácora de auditoría (consultable desde Supabase Studio del entorno de uso), puesta en marcha local con entornos de uso y de pruebas separados, lectura segura del portafolio, evaluación de conformidad con el estándar (1.0, 1.1 y 1.2), historial de git con semáforo de actividad, indicadores de Conformidad y Avance, gráficos del portafolio, la identidad visual de `nexoru-onboarding` y los datos de GitHub en solo lectura (CI de la rama principal, visibilidad, PRs abiertos y número de alertas de secretos).

**Fuera de alcance:**
- Cualquier acción hacia afuera: correos, WhatsApp, notificaciones, escrituras en proyectos, git o GitHub (principio XII: un sistema de información que actúa deja de ser neutral).
- Colaboradores y cuentas distintas del Dueño (backlog B-003 y B-004; requiere enmienda de la constitución).
- Recuperación de contraseña por correo (backlog B-005; hay procedimiento local).
- Pantalla de consulta de la bitácora (backlog B-007; con un solo usuario basta con Supabase Studio).
- Despliegue en la nube (backlog B-006; principio III: ejecución local y costo cero).
- Integraciones de escritura, automatizaciones, agentes y Cowork ("Visión futura" de la constitución).

## Roadmap

El estado de cada fase lo calcula el dashboard a partir de `tasks.md` de las specs vinculadas. La Fase 1 (`001-user-access`) se redefinió el 2026-09-28 (constitución v2.0.0): su `tasks.md` conserva como hechas las tareas del diseño anterior y añade las de la redefinición. La Fase 1 cerró el 2026-09-28 con el merge del PR #1 a `main`. La Fase 2 (`002-portfolio-conformance`) cerró el 2026-10-01 con el merge del PR #2 a `main`. La Fase 3 (`003-git-history-insights`) cerró el 2026-10-03 con el merge del PR #3 a `main`. La Fase 4 (`004-github-readonly`) cerró el 2026-10-04 con el merge del PR #5 a `main`. Con la Fase 4 el roadmap quedó concluido y el proyecto pasó a `operacion` el 2026-10-04; los siguientes incrementos están en `## Incrementos planeados`.

| Fase | Objetivo | Specs | Fecha objetivo | Estado manual |
|---|---|---|---|---|
| 1 | Acceso seguro del Dueño, bitácora y puesta en marcha local | 001-user-access | — | |
| 2 | Lector seguro del portafolio y conformidad con el estándar | 002-portfolio-conformance | — | |
| 3 | Historial de git, indicadores de conformidad y avance, identidad visual y gráficos | 003-git-history-insights | 2026-10-25 | |
| 4 | Datos de GitHub en solo lectura (CI, visibilidad, PRs) | 004-github-readonly | 2026-11-08 | |

## Incrementos planeados

| Incremento | Objetivo | Prioridad | Referencia |
|---|---|---|---|
| Operabilidad | Desactivar los servicios de Supabase sin uso en ambos entornos, midiendo la memoria antes y después, y clasificar las 8 vulnerabilidades altas de `npm audit` (cuáles aplican al código que corre, cuáles se resuelven actualizando y cuáles se aceptan con su razón) | alta | B-014 |
| Soporte del estándar 1.3 e historial de ciclos de vida | Evaluar proyectos con el estándar 1.3 (incluida esta sección) y mostrar el historial de ciclos de vida de cada proyecto | media | — |

## Decisiones clave

| Decisión | Razón |
|---|---|
| `version_estandar` se mantiene en `"1.2"` hasta que el dashboard soporte la 1.3, aunque `PROJECT.md` ya usa la sección `## Incrementos planeados` de la 1.3 | El dashboard solo evalúa versiones soportadas: declarar 1.3 dejaría a `nexoru-op` sin evaluar. Subir a 1.3 es parte del incremento "Soporte del estándar 1.3" |
| Pasar a `operacion` el 2026-10-04, sin fase nueva en el roadmap (decisión del Dueño) | Con la Fase 4 el roadmap quedó concluido y el dashboard está desplegado en local; el trabajo siguiente se planea como incrementos y se abre como fase cuando se comprometa |
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
| Repo público (`visibilidad: publico`) | Tipo `interno` sin datos sensibles ni de clientes; permite rulesets y CI gratuitos. Se declara en el manifiesto aunque el estándar 1.2 no lo exige para `interno`, para dejar registrada la decisión del Dueño. La constitución v2.0.0 retiró el número de WhatsApp y la lista de productos, que siguen en el historial de git |
| Una sola puerta al disco del portafolio (`safe-fs.ts`) con catálogo cerrado de rutas del estándar, rutas reales dentro de `PROJECTS_ROOT` y lista de nombres de secretos | El portafolio contiene repos con secretos locales; un lector sin límites los expondría (principio XIII) |
| Git solo con comandos fijos de solo lectura, sin shell y con el prefijo v2 (Fase 3): `core.fsmonitor`, filtros `clean`, firmas, ganchos, submódulos y mantenimiento desactivados, `GIT_OPTIONAL_LOCKS=0` y `--no-optional-locks`; si el repo tiene `.git/info/attributes`, no se ejecuta `status` y se muestra "no evaluado" | Un `.git/config` o un filtro de atributos puede hacer que git ejecute un programa del repo (se comprobó en la Fase 3 con `filter.clean`), y `git status` normal reescribe `.git/index`; así no se ejecuta nada del repo ni cambia ningún archivo |
| Reglas de conformidad como código puro y probado, por versión del estándar (`src/lib/standard/v1_0/`); solo se evalúan versiones soportadas | Una versión nueva del estándar es una carpeta nueva, no condiciones repartidas; evaluar con otra versión daría resultados falsos (principio XIV) |
| La verificación 3.2 se evalúa con la CI de GitHub (Fase 4); sin datos de GitHub recientes queda "no evaluada", el nivel 3 se muestra provisional y la Conformidad dice en la misma celda que su base es 28 y por qué | No se presenta como cumplido lo que no se verificó, y una falla de GitHub no se lee como retroceso (la frase "la base cambió de 28 a 29" solo vive en una leyenda fija) |
| La correspondencia fila–servicio de la tabla de costos (1.10) se compara normalizada (minúsculas, espacios a guiones) | El estándar 1.0 no la definía y `amazon-business-engine` usa nombres legibles; el estándar 1.1.0 la incorporó con esa misma regla |
| Índice regenerable en una sola fila `jsonb`, que se vuelve a leer si tiene más de 10 minutos o con Actualizar; guardarlo no deja evento de bitácora | Solo se consulta completo; no es una acción sobre la cuenta |
| Cada proyecto se lee tal como está en disco, con aviso si no está en su rama principal o tiene cambios sin commit | Decisión del Dueño (clarify de la Fase 2): datos reales y aviso de cuándo desconfiar |
| Un único cliente de GitHub (`src/lib/github/client.ts`): solo `GET` a `api.github.com`, catálogo cerrado de 6 rutas, sin reintentos, rechaza en código cualquier otro método | Principio XII: el dashboard nunca puede escribir en GitHub; una prueba lo demuestra y otra prueba que ningún otro archivo hace peticiones a GitHub |
| Token opcional, fine-grained, de solo lectura, con acceso solo a los repos seleccionados y vencimiento de 90 días; vive en `.env.op.local` (constitución v2.0.1) | Mínimo privilegio: si se filtra, solo expone esos repos; el dashboard avisa 14 días antes de que venza |
| GitHub se consulta solo con Actualizar: plazo de 8 s, 3 peticiones a la vez, por prioridad (repo, CI, PRs, alertas), con ETag; la relectura automática reutiliza lo guardado; un dato de 7 días o más no evalúa | Lo local nunca se bloquea por GitHub, se respeta el límite de consultas y un dato viejo no se presenta como actual |
| De las alertas de secretos solo se guarda el número (`hide_secret=true`); con 0 alertas el hallazgo "Secretos en el historial" sigue "no evaluado" | El secret scanning solo detecta patrones conocidos: 0 alertas no prueba que no haya secretos |
| La CI de cada PR se lee de las ejecuciones de Actions de su commit | Evita pedir los permisos Checks y Commit statuses |
| Pruebas con un GitHub simulado; cualquier petición al GitHub real hace fallar la prueba y los tokens de prueba son ficticios | Ninguna prueba depende de la red ni puede filtrar un token real |
| Dependencia nueva: `yaml` 2.x (sin dependencias, sin costo) | YAML 1.2 con acceso a nodos y comentarios, necesario para las verificaciones 1.2, 1.5, 1.6 y 3.1 |
| El historial de git se calcula en cada lectura y solo vive en el índice regenerable; no hay tabla de historial | Git ya es la fuente de verdad; guardar series en la base sería capturar lo derivable |
| Semáforo de actividad: verde hasta 5 días sin commits, ámbar de 6 a 15 y rojo con más de 15; neutro en `pausado`, `operacion` y `retirado` | Decisión del Dueño (clarify de la Fase 3); en esas fases la inactividad es esperada |
| El semáforo declarado (círculo) y el de actividad (cuadrado) llevan siempre forma, ícono, texto y etiqueta | Se distinguen sin color y en escala de grises (SC-003) |
| Conformidad = verificaciones cumplidas / aplicables (28 mientras 3.2 no se evalúe); Avance = tareas de las fases derivadas, cada spec una vez, sin las fases manuales | Indicadores que salen de reglas del estándar y de `tasks.md`, sin captura; con versión no soportada o sin versión no se muestran y se dice por qué |
| Días en la fase desde el historial de `PROJECT.md`, comparados con `fase_desde`: si el historial empieza al crearse el campo, solo es una cota y el resultado es "no verificable" (opción A) | Decisión del Dueño en la Fase 3: evita marcar como discrepancia una fecha anterior a la creación de `PROJECT.md` |
| Identidad visual de `nexoru-onboarding` (tema oscuro, tokens en `src/app/tokens.css`, Inter empaquetada con `@fontsource/inter`, OFL-1.1) | Decisión del Dueño (B-010) para todos los sistemas salvo `conversa-experiencias`; la fuente local evita depender de la red |
| Gráficos como SVG generados en el servidor, sin librería ni JavaScript, cada uno con su tabla "Ver datos" | Compatibles con la CSP sin `style` en línea y accesibles; ninguna librería gratuita cumplía las dos cosas sin excepciones |
| Soporte del estándar 1.0, 1.1 y 1.2 con reglas por versión; en 1.2, 3.2 con la última ejecución de cada workflow que cumple 3.1 y el campo `visibilidad` comparado con GitHub | Cada proyecto se evalúa con las reglas que declara; un aviso informativo (no un hallazgo) señala la versión más nueva |

## Costo mensual

| Servicio | USD/mes | Nota |
|---|---|---|
| Have I Been Pwned (`have-i-been-pwned`) | — | Sin costo. API pública de consulta k-anonymity |
| API de GitHub (`github-api`) | — | Sin costo. Solo lectura, con token fine-grained (5.000 consultas por hora) o anónima (60) |
| Supabase local (Docker) | — | Sin costo |
| GitHub (repo público y Actions) | — | Sin costo |
| **Total** | **0** | |

## Riesgos, bloqueos y dependencias

- **Riesgo de calidad:** los procedimientos manuales de recuperación (2FA perdido sin códigos y contraseña olvidada) están documentados pero no se han validado con la cuenta real (backlog B-008).
- **Dependencia:** Docker y Node.js 24 en la máquina del Dueño. Supabase se arranca siempre con `npm run db:start` / `npm run op:start`, que crean su red de Docker solo en `127.0.0.1` (la opción `ip` de `daemon.json` no la cubre).
- **Riesgo de calidad:** las dos pilas de Supabase local (uso y pruebas) consumen unos 2–3 GB de memoria cada una; la de pruebas se puede detener cuando no se usa.
- **Dependencia:** la conformidad se evalúa con el Estándar de Proyecto Nexoru 1.0, 1.1 y 1.2 (`nexoru-governance`); cada versión nueva del estándar puede requerir actualizar el dashboard (principio XIV).
- **Riesgo de calidad:** el repo es público; la constitución anterior, con el número comercial de WhatsApp y la lista de productos, sigue visible en el historial de git.
- **Riesgo de calidad:** `npm audit` reporta 8 vulnerabilidades altas anteriores a la Fase 3, de `braces` en herramientas de desarrollo (shadcn y `eslint-config-next`); no llegan a la app en ejecución. Sin cambios en la Fase 4 (ninguna dependencia nueva).
- **Riesgo de calidad:** en los proyectos cuyo historial de `PROJECT.md` empieza con la fase actual, los días en la fase salen de `fase_desde` y no se pueden verificar con git (hoy `amazon-business-engine` y `nexoru-op`).
- **Dependencia:** el token de GitHub vence cada 90 días; el dashboard avisa con 14 días de anticipación y, al vencer, los repos privados quedan "no disponible" y 3.2 deja de evaluarse en ellos hasta reemplazarlo en `.env.op.local`. Un repo nuevo se debe añadir al token.
- **Riesgo de calidad:** con las dos pilas de Supabase en marcha, la máquina de 6,2 GiB queda sin memoria y la batería E2E se vuelve lenta e intermitente (B-013); conviene correrla con la pila de uso detenida mientras se aplica B-014 (desactivar los servicios de Supabase que no se usan).
- **Riesgo de calidad:** el secret scanning de GitHub no está disponible en repos privados de una cuenta personal sin el producto de pago (hoy `conversa-experiencias`), y en los públicos solo detecta patrones conocidos.

## Pendientes conocidos

- Backlog en `specs/backlog.md`: B-001 a B-014. En particular, B-008 (validar los procedimientos manuales de recuperación), B-009 (`op:backup` / `op:restore`, opcional) B-012 (alertas de discrepancia entre el estado declarado y la evidencia), B-013 (vigilar fallos intermitentes de las E2E) y B-014 (desactivar servicios de Supabase sin uso). B-010 (look and feel de `nexoru-onboarding`) y B-011 (`.nexoruignore`) se construyeron en la Fase 3.
- **Incrementos planeados** (`## Incrementos planeados`): Operabilidad (prioridad alta: B-014 y la clasificación de `npm audit`) y Soporte del estándar 1.3 e historial de ciclos de vida (prioridad media). Abrir uno lo regresa a `construccion` según `lifecycle.md`.

## Evidencia de validación

| Qué | Evidencia |
|---|---|
| US1 sin correo: 2FA obligatorio, bloqueo por correo + IP, IP no falsificable, inactividad, 12 h, códigos de recuperación y cabeceras | En local (no hay producción): Playwright 17/17 (incluye 3 de activación por enlace en la terminal), pgTAP 72/72 y Vitest 77/77, el 2026-09-28 en la rama `001-user-access`. La CI pasó en el PR #1 y, tras el merge, en `main` (ejecución 36499343842, commit `b0fa233`, 2026-09-28) |
| Activación del Dueño en el entorno de uso (SC-003) | 20 segundos desde `op:bootstrap-owner` hasta entrar; la cuenta persiste tras `op:stop` / `op:start` (2026-09-28, entorno de uso) |
| Las pruebas no tocan el entorno de uso (SC-012) | Huella de `op:fingerprint` idéntica (`965bcf22f806afa5`) antes y después de Vitest, pgTAP y Playwright, con el entorno de uso en marcha (2026-09-28) |
| Todo escucha solo en `127.0.0.1` (FR-033) | `ss -ltn`: app (3000, 3200) y las dos instancias de Supabase (5432x, 5532x) solo en `127.0.0.1`; desde la IP de red y desde otro dispositivo no responden (2026-09-28) |
| Bitácora inmutable y consultable desde Studio (FR-028, FR-038) | La consulta del quickstart devuelve los eventos del entorno de uso; un `update` falla con `audit_events is append-only` (2026-09-28) |
| CSP con nonce | La app de uso responde con `script-src 'self' 'nonce-…' 'strict-dynamic'`, sin `'unsafe-eval'`; las E2E fallan ante cualquier violación de CSP y no hubo ninguna |
| Cierre del roadmap | Proyecto cerrado el 2026-10-04 con 4 fases; fecha objetivo original 2026-11-08 (35 días antes) |
| Cierre de la Fase 4 en `main` | PR #5 fusionado por el Dueño el 2026-10-04 (merge commit `ef35115`); CI de `main` en verde (ejecución 37250949793) |
| Cierre de la Fase 3 en `main` | PR #3 fusionado por el Dueño el 2026-10-03 (merge commit `0e1359a`); CI de `main` en verde (ejecución 37095999987) |
| Fase 2: lector seguro, git, conformidad v1.0, portafolio, detalle, roadmap y versiones | CI en verde en el PR #2 y, tras el merge, en `main` (ejecución 36940235574, commit `46a673d`, 2026-10-01). En local, rama `002-portfolio-conformance`, 2026-10-01: Vitest 281/281 (una prueba por verificación de conformidad, enlaces fuera de la raíz, `.env`, FIFO, archivo > 1 MB, `core.fsmonitor` malicioso), pgTAP 88/88 y Playwright 38/38, con un portafolio ficticio |
| Solo lectura sobre el portafolio real (SC-007) | Entorno de uso, 2026-10-01: antes y después de pulsar Actualizar, fechas de modificación y tamaño de 5206 archivos de `/home/fili/proyectos` idénticos y `git status` de los 7 repos sin cambios |
| Validación con el portafolio real (quickstart Fase 2, escenarios 1–13) | Validada por el Dueño el 2026-10-01 en el entorno de uso: 6 proyectos y el estándar aparte; niveles: `amazon-business-engine` 3 (provisional), `nexoru-op` 3 (provisional) y 0 los cuatro sin `PROJECT.md`; ramas y avisos correctos; Actualizar, vencimiento a 10 min y acceso sin sesión (redirige a `/login`) comprobados; sin discrepancias con los `PROJECT.md` |
| Identidad visual de la Fase 3 (US3) | Aprobada por el Dueño el 2026-10-02 en el entorno de uso, después de una primera revisión que encontró el botón Actualizar sin acento y el ancho limitado (corregidos en `db3a2cf`). Pruebas: contraste AA calculado desde `tokens.css` y E2E con los colores, anchos y fuente que calcula el navegador (`tests/e2e/us3-visual-render.spec.ts`) |
| Fase 3: historial de git, estándar 1.1 y `.nexoruignore`, indicadores, identidad visual y gráficos | En local, rama `003-git-history-insights`, 2026-10-02: Vitest 412/412 (incluye el endurecimiento de git con repos de fixtures que intentan ejecutar `core.fsmonitor` y `filter.clean`, y la revisión de seguridad permanente `tests/unit/security/review.test.ts`), pgTAP 90/90 y Playwright 77/77, con el portafolio ficticio; las mismas cifras en la CI de la rama (ejecución 37094824853, commit `381e130`) |
| `.nexoruignore` con el portafolio real (T050) | Validado por el Dueño el 2026-10-02: una carpeta de prueba aparece, desaparece al listarla en `.nexoruignore` y se borra al final |
| Validación con el portafolio real (quickstart Fase 3, escenarios 1–10 y 9b) | Validada por el Dueño el 2026-10-02 en el entorno de uso: `amazon-business-engine` y `nexoru-op` evaluados con 1.1 (nivel 3 provisional, sin fallas); días sin actividad iguales a `git log -1 --branches`; Conformidad y Avance iguales al cálculo a mano (61/71 y 191/195); semáforos distinguibles en escala de grises; lectura completa en 276 ms (SC-005) |
| Solo lectura sobre el portafolio real en la Fase 3 (SC-006) | Entorno de uso, 2026-10-02: contenido y fecha de modificación de 1776 archivos (sin `node_modules`, `.next` ni `.temp`) y metadatos de `.git` de cada repo idénticos antes y después de Actualizar, salvo el log del servidor de uso (`.op/app.log`, ignorado por git); `git status` de todos los repos sin cambios |
| Fase 4: datos de GitHub en solo lectura (CI y 3.2, visibilidad, PRs, alertas) y estándar 1.2 | En local, rama `004-github-readonly`, 2026-10-04, con un GitHub simulado: Vitest 574/574 (cliente solo GET con catálogo cerrado, token ausente de errores, logs e índice, oleadas con plazo y límite, reglas 3.2 y visibilidad por versión, solo el número de alertas), pgTAP 90/90 y Playwright 106/106 (incluye título de PR con `<script>`, borrador, forks y activación sin JavaScript) |
| Salvaguardas demostradas (2026-10-04) | Un GET real a `api.github.com` en una prueba falla con "GitHub real bloqueado en pruebas"; sin la salvaguarda la prueba lo detecta; el cliente cambiado a POST hace fallar 3 pruebas |
| Validación con el portafolio real (quickstart Fase 4, escenarios 1–12, 3b y 4b) | Validada por el Dueño el 2026-10-04 en el entorno de uso, con token: `amazon-business-engine` y `nexoru-op` en 1.2, nivel 3 sin provisional, visibilidad `aceptada`, Conformidad 29 de 29; CI, visibilidad y PRs iguales a `gh`; sin token, los privados "requiere token"; el token no aparece en la página, en `.op/app.log` ni en el índice |
| Solo lectura sobre el portafolio real en la Fase 4 (SC-003) | Entorno de uso, 2026-10-04: contenido y fecha de 1441 archivos, 66 metadatos de `.git` y el `git status` de los 6 repos idénticos antes y después de Actualizar (huella `6c145555171813d7` en ambas) |
| Lectura de 50 proyectos (SC-006) | Prueba unitaria: 50 copias de un proyecto ficticio con repo git se leen en menos de 10 s |

## Siguiente hito

Incremento planeado de prioridad alta: Operabilidad (sin fecha comprometida mientras no se abra).

1. **Hecho:** Fase 4 cerrada (PR #5, merge `ef35115`, CI de `main` en verde); el proyecto pasó a `operacion` el 2026-10-04.
2. **Siguiente:** cuando el Dueño lo abra, Operabilidad entra al roadmap como Fase 5 con su spec y su fecha: desactivar los servicios de Supabase sin uso en ambos entornos, midiendo la memoria antes y después (B-014), y clasificar las 8 vulnerabilidades altas de `npm audit`.
