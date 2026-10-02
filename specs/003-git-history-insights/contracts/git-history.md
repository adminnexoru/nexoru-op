# Contrato: historial de git y lector ampliado

Amplía `specs/002-portfolio-conformance/contracts/reader.md`. **Cualquier acceso que no esté en
los dos contratos es un defecto.**

## Prefijo endurecido v2 (todos los comandos, fases 2 y 3)

```text
git -c core.fsmonitor=false -c core.untrackedCache=false -c core.hooksPath=/dev/null
    -c core.attributesFile=/dev/null -c log.showSignature=false -c gc.auto=0 -c maintenance.auto=false
    --no-optional-locks --attr-source=4b825dc642cb6eb9a060e54bf8d69288fbee4904 <comando>
```

- **Entorno**: `PATH`, `HOME`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_OPTIONAL_LOCKS=0`,
  `GIT_TERMINAL_PROMPT=0`, `GIT_PAGER=cat`, `LC_ALL=C`.
- **`status`**: `status --porcelain=v1 -z --ignore-submodules=all`.
- **Antes de `status`**: `lstat`, con el lector seguro, de la ruta de `info/attributes` que da el
  `rev-parse` único. Si ese archivo existe y no está vacío, no se ejecuta `status`:
  `hasUncommittedChanges` queda ausente con el motivo de seguridad.
- **Por qué** (research R11): en una prueba, `git status` ejecutó el filtro `clean` de un
  repositorio. Con este prefijo no se ejecuta nada de ningún repositorio.
- **Cuando `status` no se ejecuta o falla**: por `info/attributes`, porque git no reconoce
  `--attr-source`, por tiempo agotado o por cualquier otro error. "Cambios sin commit" se muestra
  como **"no evaluado"** con su motivo, **nunca como "sin cambios"**. El motivo viaja en
  `GitInfo.uncommittedChangesReason`.

## Comandos nuevos (argumentos fijos)

| Argumentos | Salida usada |
|---|---|
| `rev-parse --path-format=absolute --show-toplevel --git-path info/attributes --git-path FETCH_HEAD --git-common-dir` | **Una sola llamada por proyecto** (cambio de la implementación de US1): raíz del repo, ruta de `info/attributes`, ruta de `FETCH_HEAD` del worktree y carpeta común. Reemplaza el `rev-parse --show-toplevel` de la Fase 2 y las dos consultas de rutas que estaban por separado |
| `for-each-ref --sort=-committerdate --count=1 --format=%(committerdate:unix) refs/heads` | Fecha del último commit de las ramas locales. **Solo si el log de actividad está vacío**; si no, el último commit es el más reciente del log |
| `log --branches --since=13.weeks.ago --format=%ct` | Una marca de tiempo por commit; se agrupan por semana |
| `rev-list --left-right --count HEAD...refs/remotes/origin/HEAD` | `adelante\tatrás` contra la principal remota local |
| `rev-list --left-right --count HEAD...refs/heads/main` | Solo si el anterior falla porque no existe `origin/HEAD` |
| `log --format=%x00%H%x09%ct -p --unified=0 --no-color --no-ext-diff --no-textconv --max-count=500 -- PROJECT.md` | Líneas `+fase:` / `-fase:` por commit |

Prohibido: `fetch`, `pull`, `push`, `gc`, `checkout`, `config` y cualquier comando que escriba o
use la red. `--no-ext-diff --no-textconv` impiden que `log -p` ejecute programas configurados en el
repositorio.

## Lecturas nuevas del lector seguro

| Ruta | Operación | Regla |
|---|---|---|
| `PROJECTS_ROOT/.nexoruignore` | leer | Archivo regular, ≤ 1 MB, UTF-8, ruta real dentro de la raíz |
| `FETCH_HEAD` (rutas que da git) | `lstat` (solo fecha de modificación) | Ruta real dentro de `PROJECTS_ROOT`; nunca se abre |

## `.nexoruignore`

- Una carpeta por línea, nombre exacto. Las líneas vacías y las que empiezan con `#` se ignoran.
  Un nombre con `/`, `\`, `*`, `?` o que empiece con `.` no es válido y se ignora.
- Las carpetas listadas no se leen, no se evalúan y no aparecen en el tablero, los gráficos ni los
  avisos (estándar 1.1, `project-standard.md` §8).
- `nexoru-governance` se sigue leyendo como estándar aunque esté listada.

## Límites conocidos (se muestran al Dueño)

- Antigüedad de las referencias remotas = fecha de modificación de `FETCH_HEAD` (research R2):
  desconocida si la copia nunca hizo `fetch`; no refleja un `push` sin `fetch`; corresponde a
  cualquier remoto.
- El historial de `fase` se corta si `PROJECT.md` se renombró, y mira como máximo 500 commits.
