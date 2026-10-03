# Research: Historial de git, indicadores, identidad visual y gráficos

**Feature**: `003-git-history-insights` · **Fecha**: 2026-10-01

Cada decisión sigue el formato: decisión, razón y alternativas descartadas. No quedan puntos
"NEEDS CLARIFICATION". Las mediciones se hicieron en solo lectura sobre el portafolio real
(`/home/fili/proyectos`) el 2026-10-01.

## R1. Comandos de git del historial (FR-001 a FR-007)

- **Decisión**: se añaden 7 comandos al módulo `git.ts` de la Fase 2. Todos llevan argumentos
  fijos, sin shell, con el mismo prefijo endurecido (`core.fsmonitor=false`,
  `--no-optional-locks`, entorno mínimo, 5 s de tiempo máximo).

  | Para qué | Comando (argumentos fijos) |
  |---|---|
  | Último commit de todas las ramas locales | `for-each-ref --sort=-committerdate --count=1 --format=%(committerdate:unix) refs/heads` |
  | Actividad de 12 semanas | `log --branches --since=13.weeks.ago --format=%ct` (cada commit una vez; las semanas se agrupan en el programa) |
  | Adelanto/atraso contra la principal | `rev-list --left-right --count HEAD...refs/remotes/origin/HEAD`; si esa referencia no existe, `rev-list --left-right --count HEAD...refs/heads/main` |
  | Ruta de `FETCH_HEAD` (worktree o repo) | `rev-parse --path-format=absolute --git-path FETCH_HEAD` |
  | Carpeta común del repo (para worktrees) | `rev-parse --path-format=absolute --git-common-dir` |
  | Historial del campo `fase` | `log --format=%x00%H%x09%ct -p --unified=0 --no-color --no-ext-diff --no-textconv --max-count=500 -- PROJECT.md` |

- **Razón**:
  - El principio XIII pide argumentos fijos. Ninguno de estos comandos recibe datos del proyecto:
    la ventana de tiempo es la expresión fija `13.weeks.ago` (13 y no 12, para cubrir la semana en
    curso desde el lunes), y las referencias son nombres fijos.
  - `--no-ext-diff --no-textconv` es imprescindible. Un repositorio puede configurar un programa de
    comparación (`diff.external`) o de conversión (`textconv` en `.gitattributes`), y `git log -p`
    lo ejecutaría. Con estas opciones no se ejecuta nada del repo.
  - `--branches` cuenta solo las ramas locales (decisión del Dueño), y git no repite un commit que
    esté en varias.
- **Medición real**: de 50 a 95 ms por proyecto para los seis comandos de historial juntos; son 297
  commits en todo el portafolio.
- **Alternativas**:
  - `--since=<fecha calculada>`: el argumento dependería del día, y aunque fuera seguro dejaría de
    ser fijo.
  - Leer `.git/logs` o `.git/refs` a mano: frágil con referencias empaquetadas y worktrees.
  - `isomorphic-git`: dependencia grande para siete consultas.

## R2. Antigüedad de las referencias remotas, sin escribir en `.git` (FR-004)

- **Decisión**: la antigüedad de las referencias remotas locales es la **fecha de modificación** de
  `FETCH_HEAD`, leída con `lstat` sin abrir el archivo.
  - Se consultan dos rutas: la que da `--git-path FETCH_HEAD` (la del worktree) y
    `<git-common-dir>/FETCH_HEAD` (la del repositorio compartido). Se usa la más reciente.
  - Las dos rutas las da git. El lector seguro solo hace `lstat` si su ruta real queda dentro de
    `PROJECTS_ROOT`, y nunca lee el contenido.
  - Si ninguna existe, el dato aparece como "antigüedad desconocida: esta copia nunca ha hecho
    fetch".
- **Razón**: git reescribe `FETCH_HEAD` en cada `fetch` o `pull`, aunque no haya cambios. Su fecha
  es justo "cuándo se sincronizó por última vez esta copia". No hace falta ejecutar nada ni
  escribir.
- **Medición real**: funciona en 4 de 6 repos. `ganador` no tiene `FETCH_HEAD`, porque no ha hecho
  `fetch` desde que se clonó; el worktree `nexoru-onboarding-line-endings` lo resuelve con el
  `FETCH_HEAD` del repositorio compartido.
- **Límites (documentados en la interfaz y en el contrato)**:
  1. Un `git clone` sin `fetch` posterior no crea `FETCH_HEAD`: la antigüedad aparece como
     desconocida.
  2. Si alguien toca el archivo (`touch`, copia de respaldo que conserva fechas), la fecha deja de
     ser fiel.
  3. Es la fecha del último `fetch` de **cualquier** remoto y rama, no necesariamente de `origin`
     ni de la rama principal.
  4. Un `push` sin `fetch` actualiza las referencias remotas sin tocar `FETCH_HEAD`: la antigüedad
     puede ser mayor que la real.
- **Alternativas**:
  - El reflog de `refs/remotes/origin/*`: no existe en todos los repos, sus fechas no se pueden pedir
    con argumentos fijos y en las pruebas reales devolvía fechas de commits, no de sincronización.
  - La fecha de modificación de `.git/refs/remotes/...`: con referencias empaquetadas
    (`packed-refs`) no existe un archivo por referencia.

## R3. Días en la fase desde el historial de `PROJECT.md` (FR-006)

- **Decisión**:
  - Se recorre la salida del comando de R1, del commit más nuevo al más viejo, buscando en cada
    diff las líneas `+fase:` y `-fase:` del frontmatter.
  - La fecha de cambio de fase es la del **commit más reciente que dejó a `fase` en su valor
    actual**: el que la introdujo, o el que la cambió de otro valor a este.
  - Esa fecha (en la zona horaria local) se compara con `fase_desde`.
  - Si el valor en disco tiene cambios sin commit, se avisa "cambio de fase sin commit".
- **Límites**: renombrar `PROJECT.md` corta el historial, porque no se usa `--follow` para
  mantener los argumentos fijos y simples; la Fase 3 no lo necesita. Se miran como máximo 500
  commits del archivo.
- **Medición real**: `amazon-business-engine` tiene 2 cambios de `fase` y `nexoru-op` 1; es
  instantáneo.

## R4. Rendimiento y caché (SC-005)

- **Decisión**:
  - **Acotado**: la actividad se limita a 13 semanas con `--since`; el historial de `PROJECT.md`, a
    500 commits; el último commit sale de una sola consulta a las referencias.
  - **Caché por lectura**: el historial se calcula una vez por lectura del portafolio y se guarda
    en el índice regenerable (Fase 2). Abrir el tablero o el detalle no ejecuta git; solo
    **Actualizar** o el vencimiento a los 10 minutos.
  - **Tiempo máximo**: cada comando sigue limitado a 5 s. Una lectura completa, con Actualizar,
    debe terminar en menos de 10 s para 50 proyectos (SC-005); con el portafolio real se espera
    menos de 2 s (hoy, 6 proyectos × unos 100 ms con concurrencia 8). Si un comando agota su
    tiempo, ese dato queda ausente con el motivo `git_error`, sin bloquear el resto.
- **Alternativas**: una caché propia entre lecturas (p. ej. por commit de HEAD) añadiría estado e
  invalidaciones; el índice ya cumple ese papel (principio VII).

## R5. Gráficos: SVG propio frente a librería (FR-022 a FR-025)

- **Decisión**: **SVG propio, generado en el servidor por componentes de React, sin dependencias
  nuevas.** Son cinco gráficos de barras (horizontales o columnas) sobre datos ya calculados.
- **Razón**:
  - **CSP**: la política actual es `style-src 'self' 'nonce-…'`, sin `'unsafe-inline'`, y bloquea
    los atributos `style="…"` del HTML.
    - Las librerías probables (Recharts, Chart.js, Victory) dependen de JavaScript en el cliente, y
      Recharts emite atributos `style` al renderizar en el servidor. Habría violaciones o que
      relajar la CSP.
    - Un SVG propio usa solo atributos de presentación numéricos (`x`, `y`, `width`, `height`) y
      clases de CSS de una hoja propia. Esto no lo bloquea ninguna directiva.
  - **Simplicidad (VII)**: cinco gráficos de barras son unas 150 líneas de componentes; una
    librería añade decenas de kilobytes y dependencias.
  - **Accesibilidad (FR-023)**: cada SVG lleva `role="img"`, `<title>` y `<desc>`, y debajo una tabla
    con los mismos valores; los colores se refuerzan con los íconos y textos del semáforo.
  - **Sin JavaScript**: los gráficos funcionan sin hidratación ni scripts, coherente con
    `'strict-dynamic'`.
- **Alternativas**: Recharts (problemas de CSP descritos), Chart.js (lienzo `canvas`, no accesible
  sin trabajo extra y con JavaScript obligatorio), una imagen generada (no accesible y añade un
  paso).
- **Verificación**: las E2E existentes ya fallan ante cualquier violación de CSP (FR-025, SC-004).

## R6. Identidad visual tomada de `nexoru-onboarding` (FR-016 a FR-021, FR-032, FR-033)

- **Decisión**: los **tokens de diseño** se definen en un archivo propio,
  `src/app/tokens.css`, importado por `globals.css`. Se copian los **valores** observados en
  `nexoru-onboarding`, sin importar código de ese repo. Las decisiones y el origen de cada valor se
  documentan en `docs/identidad-visual.md`.
- **Qué se observó en `nexoru-onboarding`** (solo lectura, rama `001-whatsapp-followup-agent`,
  2026-10-01):
  - **App de onboarding** (`app/onboarding-ui.css`): tema **oscuro**.
    - Fondo `#05060a`.
    - Superficies translúcidas `rgba(10,12,20,.92)` y `rgba(14,17,28,.9)`.
    - Bordes `rgba(255,255,255,.08)`.
    - Texto `#ffffff`, con atenuaciones `.76` y `.56`.
    - Acento violeta `#7c3aed` / `#8b5cf6` y azul `#38bdf8`.
    - Peligro `#fecaca` sobre `rgba(127,29,29,.2)`; aviso `#fde68a`.
    - Radios de 18 px (tarjetas) y 999 px (píldoras).
    - Sombras grandes con resplandor violeta.
  - **Base y landing** (`app/globals.css`, `components/layout/Header.tsx`): paleta **clara**.
    - Fondo `#f5f7fb`, texto `#202430`, gris `#4b5563`, índigo `#4f46e5`.
  - **Tipografía**: Inter con la pila del sistema (`Inter, -apple-system, BlinkMacSystemFont,
    "Segoe UI", Helvetica, Arial, sans-serif`), sin fuente web descargada.
  - **Espaciados**: rellenos de 14–18 px en controles y 28–48 px en paneles; separaciones de 10–22
    px.
- **Decisión de tema**: Nexoru Op adopta el **tema oscuro de la app de onboarding**, porque el
  dashboard es una aplicación como el flujo de onboarding, no una página de presentación.
  **Confirmado por el Dueño el 2026-10-01.** La paleta clara de la landing queda documentada como
  alternativa descartada.
- **Semáforos (FR-018, FR-019, FR-032, FR-033)**:
  - **Tonos propios**, ajustados para el fondo oscuro, sin reutilizar los colores de onboarding tal
    cual (por indicación del Dueño). El contraste se calculó con la fórmula de WCAG 2.x sobre el
    fondo `#05060a` y sobre la superficie compuesta `#0a0c13`:

    | Nivel | Tono | Contraste (fondo / superficie) | Referencia en onboarding (no reutilizada) |
    |---|---|---|---|
    | Verde | `#4ade80` | 11,6:1 / 11,2:1 | — (onboarding no tiene verde) |
    | Ámbar | `#f5b942` | 11,5:1 / 11,1:1 | aviso `#fde68a` |
    | Rojo | `#ff7a7a` | 8,0:1 / 7,7:1 | peligro `#fecaca` |
    | Neutro | `#a6adbb` | 9,0:1 / 8,7:1 | texto atenuado `rgba(255,255,255,.56)` |

    Todos superan AA para texto (4,5:1) y para elementos gráficos (3:1). Los fondos tenues de cada
    semáforo usan el mismo tono al 12 % de opacidad, y el texto mantiene el tono pleno.
  - **Estado declarado**: forma **circular**, ícono `CircleCheck` / `CircleAlert` / `CircleX` y
    etiqueta "Estado declarado".
  - **Actividad**: forma **cuadrada redondeada**, ícono de reloj con su variante y etiqueta
    "Actividad".
  - **Neutro**: gris, con el ícono `CircleMinus` y el texto "Sin seguimiento".
  - Los íconos son de `lucide-react`, que ya es una dependencia.
- **Fuente**: se usa la misma pila que `nexoru-onboarding`. **Actualizado el 2026-10-02**: Inter no
  está instalada en la máquina del Dueño y se renderizaba Noto Sans, así que se empaqueta con
  `@fontsource/inter` (OFL-1.1, sin dependencias). Los archivos de fuente se sirven desde la propia
  app (`font-src 'self'`), sin peticiones externas.
- **Alternativas**:
  - Importar el CSS de `nexoru-onboarding`: acoplaría los repos y traería clases que no se usan.
  - `next/font/google`: descarga en el build, y el principio III prefiere evitarlo.

## R11. Endurecimiento de git: configuraciones de un repo que pueden ejecutar programas

**Hallazgo (2026-10-01, prueba en un repo desechable)**: el `git status` de la **Fase 2 ejecuta el
programa de un filtro `filter.<nombre>.clean`** configurado en el repositorio. Ocurre cuando un
archivo versionado cambió de fecha, porque git vuelve a pasarlo por el filtro para compararlo. Es el
mecanismo que usa, por ejemplo, Git LFS. Ni `core.fsmonitor=false` ni `GIT_OPTIONAL_LOCKS=0` lo
evitan, y `diff-index`, `diff-files` y `ls-files -m` tampoco.

**Matriz de las operaciones que usamos** (medida, salvo donde se indica):

| Configuración del repo | Qué ejecutaría | Comandos afectados | Neutralización |
|---|---|---|---|
| `core.fsmonitor` | Un programa en cada `status` | `status` | `-c core.fsmonitor=false` (ya en la Fase 2) |
| `filter.<n>.clean` + `.gitattributes` del proyecto | El filtro al comparar archivos | `status` | `--attr-source=<árbol vacío>`: ignora los `.gitattributes` del proyecto (medido) |
| `filter.<n>.clean` + `core.attributesFile` del repo | Igual | `status` | `-c core.attributesFile=/dev/null` (medido) |
| `filter.<n>.clean` + `.git/info/attributes` | Igual | `status` | No se puede anular por opción: si ese archivo existe y no está vacío, **no se ejecuta `status`**; el dato queda ausente con el motivo de seguridad (ningún repo real lo tiene) |
| `diff.<n>.textconv`, `diff.external` | Un conversor o comparador externo | `log -p` | `--no-textconv --no-ext-diff` (medido) |
| `log.showSignature` + `gpg.program` | gpg u otro programa por cada commit firmado | `log` | `-c log.showSignature=false` |
| Ganchos (`core.hooksPath`, `.git/hooks`) | Ganchos como `post-index-change` | Ninguno, porque no se escribe el índice | `-c core.hooksPath=/dev/null` (ya en la Fase 2) |
| Submódulos | `status` recorre submódulos con su propia configuración | `status` | `--ignore-submodules=all` |
| `gc.auto`, `maintenance.auto` | Mantenimiento automático | Ninguno de los nuestros lo dispara | `-c gc.auto=0 -c maintenance.auto=false` (defensa en profundidad) |
| `core.pager` | Un paginador | Ninguno: la salida no es una terminal | `GIT_PAGER=cat` en el entorno |
| `core.sshCommand`, `credential.helper`, `remote.*.uploadpack`, `core.askPass` | Programas de red | Ninguno: nunca usamos la red | Nada que hacer; `GIT_TERMINAL_PROMPT=0` ya está |
| `alias.*` con `!` | Comandos de shell | Ninguno: los alias no pueden reemplazar comandos internos | — |
| `trace2.*` | Escritura de trazas | Solo se lee de la configuración global o del sistema, no del repo | `GIT_CONFIG_NOSYSTEM=1` (ya en la Fase 2) |

**Decisión: prefijo endurecido v2**, para todos los comandos de las fases 2 y 3:

```text
git -c core.fsmonitor=false -c core.untrackedCache=false -c core.hooksPath=/dev/null \
    -c core.attributesFile=/dev/null -c log.showSignature=false -c gc.auto=0 -c maintenance.auto=false \
    --no-optional-locks --attr-source=4b825dc642cb6eb9a060e54bf8d69288fbee4904 <comando>
```

- **Entorno**: `PATH`, `HOME`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_OPTIONAL_LOCKS=0`,
  `GIT_TERMINAL_PROMPT=0`, `GIT_PAGER=cat`, `LC_ALL=C`.
- **Opciones nuevas**: `status` añade `--ignore-submodules=all`.
- **Versión de git**: `--attr-source` requiere una versión reciente. La máquina del Dueño tiene git
  2.53; si git no reconoce la opción, el dato queda ausente con `git_error` en lugar de leer sin
  protección.
- **Comprobación previa**: antes de `status` se pide `rev-parse --path-format=absolute --git-path
  info/attributes` y se hace `lstat` de esa ruta con el lector seguro.
- **Corrección de la Fase 2**: toca `src/lib/portfolio/git.ts`, que es código de la Fase 2. Entra
  como **primera tarea de la Fase 3**, con su prueba, y se actualiza el contrato
  `specs/002-portfolio-conformance/contracts/reader.md`.

**Prueba (pedida por el Dueño)**: un repo de fixtures **hostil** con:
- `core.fsmonitor` apuntando a un script que deja una marca;
- un filtro `clean` en `.gitattributes` y en `core.attributesFile`;
- un `textconv`;
- `log.showSignature` con un `gpg.program` que deja marca.

Tras una **lectura completa del portafolio** no debe aparecer ninguna marca, y ningún archivo dentro
de `.git` puede cambiar de fecha ni de contenido. Un segundo repo con `.git/info/attributes`
comprueba que `status` no se ejecuta y que el motivo se reporta.

## R7. Estándar 1.1 (FR-028 a FR-031)

- **Decisión**:
  - El motor `v1_0` se generaliza con un objeto de reglas por versión (`src/lib/standard/rules.ts`):
    valores de `fase`, fases sin `fecha_objetivo` obligatoria y si aplican los hallazgos de cierre
    y reactivación.
  - 1.0 y 1.1 comparten todas las verificaciones; la 1.1 añade `retirado` y los dos hallazgos
    medios.
  - `SUPPORTED_STANDARD_VERSIONS = ["1.0", "1.1"]`.
  - La función "roadmap concluido" se calcula para cualquier proyecto con roadmap, porque es un
    cálculo sobre el roadmap y no una regla de conformidad. Los hallazgos de cierre y reactivación
    solo se reportan a proyectos que declaran la 1.1 (principio XIV).
- **`.nexoruignore`**: el lector seguro añade la lectura de un archivo en la **raíz** de
  `PROJECTS_ROOT`, con las mismas reglas: ruta real, archivo regular, hasta 1 MB, UTF-8. Las
  carpetas listadas se quitan antes de leer nada de ellas.
- **Razón**: duplicar el motor por una diferencia de tres reglas sería mantener dos copias
  (principio VII).

## R8. Indicadores (FR-009 a FR-015)

- **Conformidad** = verificaciones `pass` ÷ verificaciones aplicables × 100, redondeado.
  - Son aplicables todas las verificaciones salvo las diferidas a otra fase (`3.2`).
  - Las "Depende de X" cuentan como no cumplidas.
  - No se calcula en proyectos no evaluados.
- **Avance** = tareas marcadas ÷ total de tareas de las specs vinculadas a fases con estado derivado
  × 100.
  - Cada spec cuenta una sola vez aunque esté en varias fases.
  - Las fases manuales no cuentan, y el detalle dice cuántas son.
  - "Fases completas: x de y" usa la definición de fase concluida del estándar 1.1.
- Los dos se calculan en cada lectura y se guardan en el índice; ausentes, llevan su motivo.

## R9. Estimación y fecha objetivo (2026-10-25)

| Historia | Esfuerzo estimado (jornadas de trabajo) |
|---|---|
| Setup y base (fixtures con historial, reglas por versión, lector ampliado) | 1,0 |
| US5 Estándar 1.1 | 0,75 |
| US1 Historial de git | 1,5 |
| US2 Conformidad y Avance | 0,75 |
| US3 Identidad visual y semáforos | 1,5 |
| US4 Gráficos | 1,25 |
| Cierre (seguridad, validación real, docs, PR) | 1,0 |
| **Total** | **7,75** |

- **Calendario**: del 2026-10-02 al 2026-10-25 hay 16 días hábiles. Las fases 1 y 2 tomaron cerca
  de una jornada cada una por historia, contando las revisiones del Dueño. **La fecha es alcanzable
  sin mover historias**, con unos 8 días de margen.
- **Punto de control**: si el 2026-10-18 US4 no ha empezado, US4 (P4) pasa a una fase siguiente; si
  el 2026-10-21 US3 tampoco está, US3 (P3) también (orden de sacrificio del Dueño). US5, US1 y US2 no
  se mueven.

## R10. Costos

Sin dependencias nuevas, sin servicios y sin red: **0 USD/mes**.
