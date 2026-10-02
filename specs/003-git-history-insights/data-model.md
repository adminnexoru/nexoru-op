# Data Model: Historial de git, indicadores, identidad visual y gráficos

**Feature**: `003-git-history-insights` · **Fecha**: 2026-10-01

Amplía el resultado de lectura de la Fase 2 (`specs/002-portfolio-conformance/data-model.md` §2).
**No hay tablas nuevas**: todo vive en el `payload` del índice regenerable (FR-026, principio XI).
`FORMAT_VERSION` pasa de **1 a 2**: un índice con formato 1 se trata como vacío y se vuelve a leer
(regla de la Fase 2).

## Cambios en `PortfolioReading`

```text
PortfolioReading (+)
├── supportedStandardVersions: ["1.0", "1.1"]
├── ignoredCount: number              ← solo para pruebas y registros; la interfaz no lo muestra (FR-031)
└── activityByWeek: WeekActivity[12]  ← suma de todos los proyectos (gráfico de actividad)

GitInfo (+, Fase 2 ampliada)
└── uncommittedChangesReason: string | null   ← motivo cuando hasUncommittedChanges es null
                                                 ("atributos locales: no se evalúa por seguridad", "error de git")

ProjectReading (+)
├── history: GitHistory | null        ← null si no es repositorio
├── indicators: Indicators
└── roadmapStatus: "activo" | "concluido" | null   ← null sin roadmap (FR-029)

GitHistory
├── lastCommitAt: string | null       ← ISO 8601; null = repo sin commits
├── daysWithoutActivity: number | null
├── activityLight: "verde" | "ambar" | "rojo" | "neutro" | null
├── weekly: WeekActivity[12]          ← de la más antigua a la actual
├── compareRef: "origin/HEAD" | "main" | null
├── ahead: number | null
├── behind: number | null
├── remoteRefsUpdatedAt: string | null      ← fecha de modificación de FETCH_HEAD (research R2)
├── remoteRefsAgeDays: number | null
├── phaseChangedAt: string | null     ← commit más reciente que dejó `fase` en su valor actual
├── daysInPhase: number | null
├── phaseMatchesFaseDesde: boolean | null
└── problems: Problem[]               ← reason "git_error" con el comando que falló

WeekActivity
├── weekStart: string                 ← AAAA-MM-DD (lunes, hora local)
└── commits: number

Indicators
├── conformity: { percent, passed, applicable, missing: string[] } | { absent: string }
└── progress:  { percent, done, total, manualPhasesExcluded, phasesCompleted, phasesTotal } | { absent: string }

Finding.code (+) "operacion_pending_phases" | "construction_roadmap_concluded"   ← medio, solo 1.1
```

## Reglas

| Regla | Origen |
|---|---|
| `activityLight`: `neutro` si `fase` ∈ {`pausado`, `operacion`, `retirado`}; si no, `verde` ≤ 5 días, `ambar` 6–15, `rojo` > 15 | FR-001, FR-032 |
| `daysWithoutActivity` = días completos (hora local) entre `lastCommitAt` y `readAt` | FR-001 |
| Semanas: lunes a domingo; `weekly[11]` es la semana en curso | FR-002 |
| `phaseMatchesFaseDesde` = fecha local de `phaseChangedAt` == `fase_desde` | FR-006 |
| `conformity.applicable` = verificaciones que no son `3.2`; las "Depende de X" cuentan como no cumplidas | FR-009 |
| `progress` cuenta cada spec una vez, solo en fases derivadas; `phasesCompleted` usa "fase concluida" (1.1) | FR-011, FR-014 |
| `roadmapStatus` = `concluido` si hay ≥ 1 fase y todas están concluidas | FR-029 |
| Porcentajes: entero redondeado (`Math.round`) | FR-015 |
| `hasUncommittedChanges = null` ⇒ la interfaz muestra "Cambios sin commit: no evaluado (motivo)", nunca "sin cambios" | contracts/git-history.md |
