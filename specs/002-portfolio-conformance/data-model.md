# Data Model: Lector seguro del portafolio y conformidad con el estándar

**Feature**: `002-portfolio-conformance` · **Fecha**: 2026-09-28

El modelo tiene dos capas:

- **En la base de datos**, una tabla, el índice regenerable (principio XI).
- **En memoria y dentro del índice**, el resultado de una lectura, con tipos de TypeScript
  validados con `zod`. Los nombres de campos van en inglés (principio X).

## 1. Tabla `public.portfolio_snapshots`

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` PK, `default gen_random_uuid()` | |
| `read_at` | `timestamptz not null` | Momento de la lectura (FR-011) |
| `format_version` | `smallint not null` | Versión del formato de `payload`; hoy `1`. Si no coincide con la del código, el índice se trata como vacío |
| `payload` | `jsonb not null` | Un `PortfolioReading` (sección 2) |
| `created_by` | `uuid not null` → `auth.users(id)` | Quién pidió la lectura (siempre el Dueño) |

**Invariante**: hay como máximo una fila, porque `save_portfolio_snapshot` borra la anterior en la
misma transacción. Borrar la tabla entera no pierde información (SC-008).

**RLS** (activado):

- Política restrictiva `portfolio_snapshots_require_aal2_active`, igual a la de `profiles`:
  `aal = 'aal2'` y `is_active_user()`.
- Política `portfolio_snapshots_select` para `authenticated`: `current_user_role() = 'owner'`.
- Sin políticas de `insert`, `update` ni `delete`, y `revoke insert, update, delete` a
  `authenticated` y `anon`. La única escritura es la función de abajo.

**Función** `public.save_portfolio_snapshot(p_payload jsonb, p_read_at timestamptz) returns void`:

- `security definer`, `set search_path = ''`.
- Exige `auth.jwt() ->> 'aal' = 'aal2'`, `is_active_user()` y rol `owner`; si no, lanza
  `insufficient_privilege`.
- Exige que `p_payload` sea un objeto JSON y que `p_read_at` no esté en el futuro (tolerancia de
  1 minuto).
- En una transacción: `delete from public.portfolio_snapshots;` e `insert` con
  `format_version = 1` y `created_by = auth.uid()`.
- `grant execute` solo a `authenticated`.
- No escribe en la bitácora (research R8).

## 2. Resultado de una lectura (`PortfolioReading`, dentro de `payload`)

```text
PortfolioReading
├── readAt: string (ISO 8601)
├── root: { status: "ok" } | { status: "missing" | "not_absolute" | "not_directory" }
├── supportedStandardVersions: string[]          ← ["1.0"]
├── standard: StandardInfo
├── projects: ProjectReading[]                    ← ordenados por folder
└── warnings: PortfolioWarning[]                  ← p. ej. ids duplicados

StandardInfo
├── folder: "nexoru-governance"
├── found: boolean
├── version: string | null                        ← "1.0" (de CHANGELOG.md, research R5)
└── newerThanSupported: boolean

ProjectReading
├── folder: string                                ← nombre de la carpeta; clave única
├── git: GitInfo
├── manifest: Manifest | null                     ← null si no hay PROJECT.md legible
├── manifestProblem: Problem | null               ← por qué no hay manifiesto
├── roadmap: RoadmapPhase[] | null                ← null = ausente
├── conformance: ConformanceResult
└── readErrors: Problem[]                          ← rutas relativas y motivo (FR-029)

GitInfo
├── isRepo: boolean
├── branch: string | null                          ← null = HEAD separado o no es repo
├── mainBranch: string | null                      ← origin/HEAD o "main"
├── onMainBranch: boolean | null
├── hasUncommittedChanges: boolean | null
└── originRepo: string | null                      ← normalizado "org/nombre"

Manifest                                           ← cada campo: valor o ausente
├── id, nombre, tipo, cliente, fase, fase_desde, estado, despliegue, repo,
│   fecha_inicio, fecha_objetivo, siguiente_hito, mapa_funcional, version_estandar: string | null
├── urls, stack, servicios: string[] | null
└── costo_mensual_usd: number | null

RoadmapPhase
├── phase: string                                  ← "1", "1.5"
├── objective: string
├── specs: string[]                                ← [] si "—"
├── targetDate: string | null                      ← null si "—"
├── manualState: RoadmapState | null
├── derived: { state: RoadmapState, done: number, total: number } | null
└── shownState: RoadmapState | null                ← derivado si existe; si no, manual

RoadmapState = "completa" | "implementada-sin-validar" | "en-curso" | "bloqueada" | "pendiente"

ConformanceResult
├── standardVersion: string | null                 ← la aplicada ("1.0") o null
├── evaluation: "evaluated" | "unsupported_version" | "no_version"
├── level: 0 | 1 | 2 | 3 | null                   ← null si no se evaluó
├── provisional: boolean                           ← true solo si falta 3.2 (FR-023)
├── checks: Check[]                                ← todas, con su estado
├── failures: Check[]                              ← las fallidas del siguiente nivel
├── warnings: Problem[]                            ← specs sin plan/tasks, tasks sin casillas
└── findings: Finding[]

Check
├── id: string                                     ← "1.11", "2.6", "3.2"
├── level: 1 | 2 | 3
├── status: "pass" | "fail" | "not_evaluated"
└── detail: string | null                          ← en español; nunca contenido de secretos

Finding
├── severity: "critical" | "high" | "medium" | "low"
├── code: "env_versioned" | "env_example_missing" | "env_example_coverage"
│         | "yaml_comments" | "secret_history" | "repo_visibility"
├── status: "found" | "not_found" | "not_evaluated"
└── detail: string | null                          ← p. ej. ".env.local"

Problem
├── path: string | null                            ← relativa al proyecto
├── reason: "missing" | "outside_root" | "secret_file" | "too_large"
│           | "not_regular_file" | "invalid_utf8" | "invalid_yaml" | "git_error" | "unreadable"
└── detail: string | null
```

## 3. Reglas de validación y derivación

| Regla | Origen |
|---|---|
| `folder` coincide con `^[^.]` (no oculta) y no es `nexoru-governance` | FR-001 |
| Un campo del manifiesto ausente o de tipo incorrecto queda `null`, sin valor por defecto | FR-009 |
| `level` es acumulativo; con 3.2 como única verificación `not_evaluated` del nivel 3, se usa `level = 3` y `provisional = true` | FR-022, FR-023, research R6 |
| `evaluation = "unsupported_version"` si `version_estandar` no está en `supportedStandardVersions`; entonces `level = null` y `checks = []` | FR-026 |
| 1.7 falla con "no es repositorio git" o "sin remoto `origin`" cuando `git.isRepo = false` o `originRepo = null` | FR-031 |
| `shownState` = `derived.state` si todas las specs de la fase tienen `tasks.md`; si no, `manualState` | FR-017 |
| `readAt` más de 10 minutos antes de ahora → índice vencido y nueva lectura al abrir | FR-012 |
| `payload` inválido según el esquema `zod` o `format_version ≠ 1` → índice vacío | FR-013 |

## 4. Estados y transiciones del índice

```text
vacío ──(abrir dashboard)──▶ leyendo ──▶ vigente
vigente ──(10 min)──▶ vencido ──(abrir dashboard)──▶ leyendo ──▶ vigente
vigente | vencido ──(botón Actualizar)──▶ leyendo ──▶ vigente
cualquiera ──(payload inválido / formato viejo)──▶ vacío
```

Si una lectura falla por completo (p. ej. `PROJECTS_ROOT` no existe), se guarda igual: el
resultado dice por qué no hay proyectos (`root.status`). Así el dashboard no vuelve a leer en cada
petición y el motivo queda a la vista.
