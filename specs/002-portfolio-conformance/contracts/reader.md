# Contrato: lector seguro del portafolio

Qué puede leer y ejecutar Nexoru Op dentro de `PROJECTS_ROOT` (principio XIII, FR-002 a FR-008,
research R3 y R4). **Cualquier acceso que no esté en este contrato es un defecto.**

## Catálogo de rutas permitidas (relativas a la carpeta del proyecto)

| Ruta | Operación | Para qué |
|---|---|---|
| `PROJECT.md` | leer | Manifiesto, secciones, roadmap (nivel 1, 3.3–3.8) |
| `docs/mapa-funcional.md` | leer | Nivel 2 (2.1–2.6). La ruta viene de `mapa_funcional`, pero solo se acepta ese valor exacto |
| `CLAUDE.md` | leer | 2.7, 2.8 |
| `.specify/` | `lstat` | 2.9 |
| `.specify/memory/constitution.md` | `lstat` | 2.9 (solo existencia) |
| `specs/` | listar | 2.10, 3.4, 3.5 |
| `specs/<NNN-nombre>/spec.md`, `plan.md` | `lstat` | 2.10 y advertencias (solo existencia) |
| `specs/<NNN-nombre>/tasks.md` | leer | Estado derivado (solo casillas) |
| `.github/workflows/` | listar | 3.1 |
| `.github/workflows/*.yml`, `*.yaml` | leer | 3.1 (solo disparadores `on`) |
| `.env.example` | `lstat` | Hallazgo medio (nunca se abre) |

Solo para la carpeta `nexoru-governance`: `CHANGELOG.md` (leer), para la versión vigente.

En `PROJECTS_ROOT`: listar sus carpetas directas.

`<NNN-nombre>` debe coincidir con `^\d{3}-[a-z0-9-]+$`; cualquier otra entrada de `specs/` se
ignora.

## Reglas de toda lectura

1. La ruta pedida está en el catálogo; si no, se rechaza sin tocar el disco.
2. `realpath` debe quedar dentro de `realpath(PROJECTS_ROOT) + "/"`. Si no, el motivo es
   `outside_root`.
3. Ni el nombre pedido ni el real coinciden con `^\.env`, `\.pem$`, `\.key$`, `\.p12$`, `\.pfx$`
   o `^id_(rsa|ed25519|ecdsa|dsa)`. Si coinciden, el motivo es `secret_file` (y no se abre).
4. Apertura en solo lectura. `fstat` debe dar un archivo regular (si no, `not_regular_file`) de
   hasta 1 048 576 bytes (si no, `too_large`).
5. UTF-8 estricto (si no, `invalid_utf8`). CRLF se normaliza a LF.
6. Ningún error de un proyecto interrumpe la lectura de los demás.
7. Nunca se escribe, crea, renombra ni borra nada dentro de `PROJECTS_ROOT`.

## Comandos de git permitidos

Sin shell, `cwd` = ruta real del proyecto, tiempo máximo de 5 s, entorno mínimo (research R4) y
prefijo fijo:

`git -c core.fsmonitor=false -c core.untrackedCache=false -c core.hooksPath=/dev/null --no-optional-locks`

> **Actualizado en la Fase 3** (`specs/003-git-history-insights/research.md` R11): `git status`
> ejecutaba los filtros `clean` de un repositorio. El prefijo vigente es el **v2** de
> `specs/003-git-history-insights/contracts/git-history.md`. Añade `--attr-source` al árbol vacío,
> `core.attributesFile=/dev/null`, `log.showSignature=false`, `gc.auto=0`, `maintenance.auto=false`,
> `GIT_PAGER=cat` y `status --ignore-submodules=all`, y omite `status` si existe
> `.git/info/attributes`.

| Argumentos | Salida usada |
|---|---|
| `rev-parse --show-toplevel` | Igual a la ruta real del proyecto ⇒ es repositorio |
| `remote get-url origin` | Normalizada a `org/nombre` |
| `branch --show-current` | Rama actual |
| `symbolic-ref --quiet --short refs/remotes/origin/HEAD` | Rama principal (sin `origin/`); si falla, `main` |
| `status --porcelain=v1 -z --ignore-submodules=all` | Vacía ⇒ sin cambios sin commit (desde la Fase 3; ver la nota del prefijo) |
| `ls-files -z` | Solo nombres; se filtran los de nombre base `^\.env` distinto de `.env.example` |

Ningún otro subcomando ni argumento. Si git no está instalado o un comando falla, el dato queda
ausente con el motivo `git_error`.
