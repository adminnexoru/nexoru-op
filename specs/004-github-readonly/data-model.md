# Data Model: Datos de GitHub en solo lectura

**Feature**: `004-github-readonly` | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Todo vive en el **índice regenerable** (`portfolio_snapshots.payload`, `FORMAT_VERSION = 3`). No hay
tablas ni migraciones nuevas. Nada de esto contiene el token ni cabeceras HTTP.

## GithubData (por proyecto: `ProjectReading.github`)

| Campo | Tipo | Regla |
|---|---|---|
| `applies` | `"yes"` \| `"no_remote"` \| `"not_github"` | `not_github` y `no_remote` → la interfaz dice "no aplica" |
| `repo` | `string` \| `null` | `dueño/nombre`, del remoto `origin` normalizado |
| `repoMismatch` | `string` \| `null` | Valor de `repo` en `PROJECT.md` si difiere del de `origin` |
| `repoInfo` | `Fetched<RepoInfo>` | Consulta 1 |
| `ci` | `Fetched<CiInfo>` | Consultas 2 y 2b |
| `pulls` | `Fetched<PullInfo[]>` | Consultas 3 y 4 |
| `secretAlerts` | `Fetched<number>` | Consulta 5 (solo el número) |

### Fetched\<T\>

| Campo | Tipo | Regla |
|---|---|---|
| `status` | `"ok"` \| `"unavailable"` \| `"not_evaluated"` | `not_evaluated` solo en alertas (sin permiso, sin token o sin secret scanning) |
| `value` | `T` \| `null` | El último valor bueno, aunque sea de una consulta anterior |
| `fetchedAt` | ISO \| `null` | Fecha de `value` |
| `reason` | `string` \| `null` | Motivo legible si la consulta actual no lo trajo (p. ej. "tiempo agotado", "límite agotado; se restablece a las 14:05", "requiere token") |

Un valor con `fetchedAt` de 7 días o más no se usa para evaluar (R8): se muestra con su fecha y
"desactualizado".

### RepoInfo

| Campo | Tipo | Regla |
|---|---|---|
| `visibility` | `"publico"` \| `"privado"` | `public` → `publico`; `private` e `internal` → `privado` |
| `defaultBranch` | `string` | Rama principal para la CI |
| `archived` | `boolean` | Se muestra; no cambia reglas |

### CiInfo

| Campo | Tipo | Regla |
|---|---|---|
| `branch` | `string` | La rama consultada |
| `latest` | `CiRun` \| `null` | Ejecución más reciente de cualquier workflow (puede estar en curso) |
| `latestCompletedAny` | `CiRun` \| `null` | Para 3.2 en 1.0 y 1.1 |
| `perWorkflow` | `{ path, latestCompleted: CiRun \| null, inProgress: boolean }[]` | Para 3.2 en 1.2; solo los workflows que cumplen 3.1 |

### CiRun

`{ workflowName: string, path: string, status: "completed" | "in_progress" | "queued",
conclusion: "success" | "failure" | "cancelled" | "timed_out" | "skipped" | "neutral" |
"action_required" | "stale" | null, at: ISO }`. Solo `success` cumple.

### PullInfo

`{ number: number, title: string, openedAt: ISO, ci: "success" | "failure" | "in_progress" |
"none" | "not_queried" }`. El título se guarda como texto plano y se muestra escapado. Máximo 10
PRs con CI consultada por repo.

## GithubStatus (por lectura: `PortfolioReading.githubStatus`)

| Campo | Tipo | Regla |
|---|---|---|
| `fetchedAt` | ISO \| `null` | Última consulta a GitHub (Actualizar); `null` si nunca |
| `tokenPresent` | `boolean` | Solo si hay token; nunca su valor |
| `tokenExpiresAt` | ISO \| `null` | De `GitHub-Authentication-Token-Expiration` |
| `rateLimit` | `{ limit, remaining, resetAt }` \| `null` | De la última respuesta |
| `stoppedReason` | `string` \| `null` | Si la actualización se detuvo (límite, límite secundario, tiempo agotado) |

## GithubCache (por lectura: `PortfolioReading.githubCache`)

Mapa `clave de consulta → { etag, summary }`. La clave es la ruta de la consulta sin origen (p. ej.
`/repos/example-org/demo/pulls?state=open&per_page=30`); `summary` es el resultado ya resumido
(los tipos de arriba). Con 304 se reutiliza `summary`. Se descarta entero si cambia el formato.

## Cambios a entidades existentes

- **`Manifest`**: campo opcional `visibilidad` (`publico` \| `privado`; vacío = no declarado; otro
  valor → advertencia y no declarado).
- **`ConformanceResult`**:
  - 3.2 pasa a `pass`, `fail` o `not_evaluated` según los datos de GitHub;
  - nuevo campo `visibility`: `"aceptada"` \| `"requiere-decision"` \| `"discrepancia"` \|
    `"sin-declarar (interno)"` \| `"no_evaluado"` \| `null`. Es `null` en 1.0 y 1.1, y en
    proyectos sin manifiesto.
- **`Finding`**: hallazgos altos de visibilidad y hallazgo crítico de alertas de secretos. Ninguno
  cambia el nivel.
- **`Indicators.conformity`**: `applicable` 28 o 29; campo nuevo `check32`: `{ included: true }` o
  `{ included: false, reason }`, con `reason` uno de los motivos fijos de FR-017. Describe el estado
  actual; no guarda el estado anterior ni ningún "cambio".
- **`StandardRules`**: `version` admite `"1.2"`; campos nuevos `ciRule` (`"latest_any"` \|
  `"each_workflow"`) y `visibilityField` (`boolean`).

## Transiciones de un dato de GitHub en cada Actualizar

```text
consulta OK (200)            → status ok, value nuevo, fetchedAt ahora, etag nuevo
consulta 304                 → status ok, value del caché, fetchedAt ahora
falla (red, error, tiempo,   → status unavailable, value anterior (si hay), fetchedAt anterior,
  límite)                       reason = motivo
relectura automática         → sin consultas: todo igual, se reevalúa con la regla de 7 días
```
