# Portafolio ficticio de pruebas

Proyectos **inventados** (organización `example-org`) para probar el lector y la conformidad de
Nexoru Op. Nunca se leen desde aquí: `tests/fixtures/build-portfolio.ts` los copia a una carpeta
temporal `nexoru-op-fixture-*`, crea los repos git y los casos que no se pueden versionar (enlaces,
FIFO, archivo grande, `.env` versionado) y esa copia es el `PROJECTS_ROOT` de las pruebas.

`level3-demo` es el proyecto base conforme; las demás carpetas son copias con un cambio cada una.

| Carpeta | Caso | Resultado esperado |
|---|---|---|
| `level3-demo` | Cumple niveles 1–3 salvo 3.2 | Nivel 3 (provisional); 3.2 no evaluada |
| `no-manifest` | Sin `PROJECT.md` | Nivel 0; falla 1.1; manifiesto ausente |
| `bad-yaml` | Frontmatter que no se puede interpretar | Nivel 0; falla 1.2 (`invalid_yaml`) |
| `confirmar` | `cliente: CONFIRMAR` | Nivel 0; falla 1.11 |
| `map-state-column` | Mapa con columna `Estado` y celda `en-curso` | Nivel 1; falla 2.6 |
| `spec-no-tasks` | Spec `002-extra` sin `plan.md` ni `tasks.md`, fase con estado manual | Nivel 3 (provisional); advertencias de `002-extra` |
| `unsupported-version` | `version_estandar: "2.0"` | Sin nivel: "versión no soportada (2.0)" |
| `no-version` | Sin `version_estandar` | Sin nivel: "sin versión" |
| `roadmap-states` | Fases 12/12, 10/12, 0/5, manual `pendiente` y derivada con `Estado manual` lleno | `completa`, `en-curso`, `pendiente`, `pendiente` (manual), `completa`; nivel 2; falla 3.6 |
| `duplicate-id-a`, `duplicate-id-b` | Mismo `id: duplicate-id` | Nivel 3 (provisional) cada uno; aviso general de `id` duplicado |
| `no-git` | No es repositorio git | Nivel 0; falla 1.7 "no es repositorio git"; `env_versioned` no evaluado |
| `no-origin` | Repositorio sin remoto | Nivel 0; falla 1.7 "sin remoto origin" |
| `feature-branch` | Rama `feature/x` con cambios sin commit | Nivel 3 (provisional); avisos de rama y de cambios |
| `env-versioned` | `env.fixture` se versiona como `.env` | Nivel 3 (provisional); hallazgo crítico `.env` (sin mostrar su contenido) |
| `symlink-escape` | `PROJECT.md` es un enlace fuera de la raíz | Nivel 0; falla 1.1; error de lectura `outside_root` |
| `secret-link` | `CLAUDE.md` es un enlace a un `.env` | Nivel 1; falla 2.7; error de lectura `secret_file` |
| `fifo-and-large` | `tasks.md` es una FIFO y el mapa pesa más de 1 MB | Nivel 1; falla 2.1; errores `not_regular_file` y `too_large` |
| `nexoru-governance` | Solo `CHANGELOG.md` con `## [1.0.0]` | Aparte, como estándar 1.0; sin nivel |
| `history-demo` | Repo con fechas controladas (Fase 3): último commit hace 5 días, rama `feature/history` 2 adelante y 3 atrás de `origin/main`, `FETCH_HEAD` de hace 40 días, `fase` cambiada hace 20 días y `fase_desde` de hace 14 | Actividad verde (5 días); fase que no coincide con `fase_desde` |
| `git-info-attributes` | Repo con `.git/info/attributes` no vacío | "Cambios sin commit: no evaluado" |
| `standard-1-1-retirado` | 1.1, `fase: retirado`, sin `fecha_objetivo`, roadmap concluido | Sin fallas; actividad neutra |
| `standard-1-1-operacion` | 1.1, `fase: operacion`, una fase pendiente | Hallazgo medio `operacion_pending_phases`; actividad neutra |
| `standard-1-1-construccion` | 1.1, `fase: construccion`, roadmap concluido | Hallazgo medio `construction_roadmap_concluded` |
| `gitlab-remote` | Remoto `origin` en `gitlab.example.com` (Fase 4) | Nivel 0; falla 1.7 "sin remoto origin en GitHub"; datos de GitHub "no aplica" |
| `standard-1-2-interno` | 1.2, `interno`, sin `visibilidad` (Fase 4) | Resultado de visibilidad `sin-declarar (interno)`, sin hallazgo |
| `standard-1-2-nexoru` | 1.2, `producto-nexoru`, `visibilidad: publico`, repo público | Visibilidad `aceptada` |
| `standard-1-2-sin-decision` | 1.2, `producto-nexoru`, sin `visibilidad` | `requiere-decision`, hallazgo alto |
| `standard-1-2-cliente` | 1.2, `producto-cliente`, `visibilidad: publico`, repo público | `aceptada`, más el hallazgo alto de `producto-cliente` público |
| `standard-1-2-discrepancia` | 1.2, `producto-nexoru`, `visibilidad: privado`, repo público | `discrepancia`, hallazgo alto |
| `multi-workflow` | 1.2 con tres workflows que cumplen 3.1 (CI en rojo, E2E en verde, Lint con su última ejecución fuera de las 50 recientes) | 3.2 falla nombrando CI; nivel 2 tras Actualizar |
| `ignored-copy` | Listada en `.nexoruignore` de la raíz | No aparece en ninguna parte |

Los textos `TEXTO-DE-SPEC-FICTICIO` y `TEXTO-DE-ENV-FICTICIO` sirven para comprobar que la
interfaz nunca muestra contenido de specs ni de archivos `.env` (FR-019, FR-004).

## GitHub simulado (Fase 4)

Las respuestas de GitHub de estos proyectos están en `tests/fixtures/github/data.ts` (escenario
por repo `example-org/<carpeta>`) y las sirve `tests/fixtures/github/fake-github.ts`, en memoria
para Vitest y detrás de un servidor en `127.0.0.1` para Playwright. Ninguna prueba consulta el
GitHub real: `tests/unit/setup/block-github.ts` lo bloquea.
