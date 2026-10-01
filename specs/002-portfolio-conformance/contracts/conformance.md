# Contrato: evaluación de conformidad (estándar v1.0)

Cómo implementa Nexoru Op cada verificación de `nexoru-governance/standard/conformance.md` v1.0
(FR-021 a FR-027, FR-031). La tabla es también el catálogo de pruebas: **cada fila tiene al menos
un caso que pasa y uno que falla** en `tests/unit/standard/` (SC-003).

## Versiones

- Soportadas: `["1.0"]`.
- `version_estandar` ausente → `evaluation = "no_version"`. No está en la lista →
  `"unsupported_version"`. En los dos casos no hay nivel.
- Excepción: si `PROJECT.md` no existe o su YAML no se puede interpretar, el proyecto se evalúa
  con la 1.0 y queda en nivel 0. Sin manifiesto no se puede declarar versión, y el nivel 0 es
  cierto con cualquier versión.

## Nivel 1

| # | Implementación | Detalle típico de la falla |
|---|---|---|
| 1.1 | Existe `PROJECT.md` legible | "No existe PROJECT.md" |
| 1.2 | Empieza con `---\n`, cierra con `---` y el YAML (esquema `core`) no tiene errores | "El frontmatter no se puede interpretar (cerca de la línea N)": la línea donde el intérprete detecta el error |
| 1.3 | Campos obligatorios con su tipo: texto, número (`costo_mensual_usd`) o lista de texto (`stack`, `servicios`, `urls`). `fecha_objetivo` es obligatoria salvo en `operacion` y `pausado`; `urls` lo es con `despliegue` `nexoru-subdominio` o `dominio-cliente` | "Falta el campo `repo`" |
| 1.4 | `tipo`, `fase`, `estado`, `despliegue` en sus listas; `id` con `^[a-z0-9]+(-[a-z0-9]+)*$`; `version_estandar` con `^\d+\.\d+$`; `mapa_funcional` = `docs/mapa-funcional.md` | "`estado: amarillo` no es un valor permitido" |
| 1.5 | Sin mapas anidados, listas de objetos, anclas, alias ni escalares de bloque (`\|`, `>`) | "`stack` contiene un objeto" |
| 1.6 | `fase_desde`, `fecha_inicio`, `fecha_objetivo`: `^\d{4}-\d{2}-\d{2}$` y fecha real del calendario | "`fecha_inicio` no tiene formato AAAA-MM-DD" |
| 1.7 | `fase_desde` ≤ fecha de lectura; `fecha_objetivo` ≥ `fecha_inicio`; `urls` no vacía si aplica; `repo` = remoto `origin` normalizado (FR-031); `costo_mensual_usd` = fila **Total**; `mapa_funcional` existe | "`repo` es adminnexoru/x pero origin es adminnexoru/y" / "no es repositorio git" / "sin remoto origin" |
| 1.8 | Las 9 secciones H2 con título exacto, en orden (se permiten otras H2 intercaladas) | "Falta `## Evidencia de validación`" / "`## Alcance` está fuera de orden" |
| 1.9 | En `## Resumen ejecutivo` hay una línea que empieza con `**Métricas de éxito:**` | |
| 1.10 | En `## Costo mensual` hay una tabla con encabezado `Servicio \| USD/mes \| Nota`, una fila cuyo primer valor contiene cada elemento de `servicios` y una fila cuyo primer valor, sin `*`, es `Total` | "Falta la fila del servicio `api-pagos`" |
| 1.11 | `CONFIRMAR` no aparece en el archivo (distingue mayúsculas) | "CONFIRMAR en la línea 12" |

Filas de 1.10 y 1.7: el valor de la columna `USD/mes` se interpreta quitando `*` y espacios; `—`
cuenta como 0.

## Nivel 2

| # | Implementación |
|---|---|
| 2.1 | Existe `docs/mapa-funcional.md` legible |
| 2.2 | Frontmatter con `proyecto` = `id`, `tipo_documento: mapa-funcional` y `version_estandar` presente |
| 2.3 | Secciones `Misión`, `Componentes`, `Flujo`, `Reglas de negocio no negociables`, `Datos y fuentes`, `Integraciones`, en ese orden relativo |
| 2.4 | Al menos un bloque que abre con ```` ```mermaid ```` |
| 2.5 | Sin `CONFIRMAR` |
| 2.6 | Ninguna celda de tabla (fuera de bloques de código) es exactamente un estado del roadmap, y ningún encabezado de columna es `Estado`, `Estado manual` o `Fecha objetivo` |
| 2.7 | `CLAUDE.md` tiene una línea `^## Documentación de proyecto` |
| 2.8 | El texto de esa sección, hasta el siguiente H2, contiene `PROJECT.md`, `docs/mapa-funcional.md` y `specs/` |
| 2.9 | Existen `.specify/` (directorio) y `.specify/memory/constitution.md` |
| 2.10 | `specs/` tiene al menos una carpeta `^\d{3}-[a-z0-9-]+$`, y cada una tiene `spec.md` |

Advertencias (no cambian el nivel): spec sin `plan.md`; spec sin `tasks.md`; `tasks.md` sin
casillas.

## Nivel 3

| # | Implementación |
|---|---|
| 3.1 | Algún `.github/workflows/*.y(a)ml` tiene `on` que incluye `push` y `pull_request`, sea como texto, lista o claves de un mapa |
| 3.2 | **`not_evaluated`**: "Se evaluará con GitHub en la Fase 4" |
| 3.3 | `## Roadmap` contiene una tabla con encabezado exacto `Fase \| Objetivo \| Specs \| Fecha objetivo \| Estado manual` |
| 3.4 | Cada `Specs` es `—` o una lista `, `-separada de carpetas existentes en `specs/` |
| 3.5 | Toda carpeta de spec aparece en alguna fila |
| 3.6 | Las fases con estado derivado tienen `Estado manual` vacío |
| 3.7 | Las fases sin estado derivado tienen `Estado manual` con un valor permitido |
| 3.8 | Toda fase `bloqueada` tiene una línea que empieza con `- **Bloqueo` en `## Riesgos, bloqueos y dependencias` |

## Verificaciones dependientes

Una verificación que necesita el resultado de otra que falló no se repite como falla: queda
`not_evaluated` con el detalle "Depende de X". Por ejemplo, sin `PROJECT.md` (1.1), las 1.2–1.11
quedan "Depende de 1.1"; con el YAML ilegible (1.2), las 1.3–1.7 y 1.10 quedan "Depende de 1.2";
sin tabla de roadmap (3.3), las 3.4–3.8 quedan "Depende de 3.3". Así, las fallas mostradas son solo
las reales. Estas verificaciones siempre acompañan a una falla de su nivel o de uno anterior, por lo
que no producen un nivel provisional: **solo 3.2** (pendiente de GitHub) lo produce.

## Cálculo del nivel

```text
nivel = 0
para N en 1..3:
  si todas las verificaciones de N son pass: nivel = N
  si no, si las únicas que no pasan son not_evaluated pendientes de otra fase (hoy solo 3.2): nivel = N, provisional = true; parar
  si no: parar
failures = verificaciones fail del nivel (nivel + 1)
```

## Hallazgos fuera de nivel

| Código | Severidad | En esta fase |
|---|---|---|
| `env_versioned` | crítico | Evaluado con `git ls-files`: `found` con los nombres. Si la carpeta no es repo: `not_evaluated` |
| `secret_history` | crítico | `not_evaluated`: requiere un escáner de secretos, fuera de alcance |
| `repo_visibility` | alto | `not_evaluated`: requiere GitHub (Fase 4) |
| `env_example_missing` | medio | Evaluado con `lstat` |
| `env_example_coverage` | medio | `not_evaluated`: requiere leer el código del proyecto (principio XIII) |
| `yaml_comments` | bajo | Evaluado sobre el frontmatter de `PROJECT.md` |
