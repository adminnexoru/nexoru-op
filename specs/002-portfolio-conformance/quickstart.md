# Quickstart: Lector seguro del portafolio y conformidad

**Feature**: `002-portfolio-conformance`. Guía de configuración y validación. Los comandos se
ejecutan en la terminal integrada de VS Code, desde la raíz de `nexoru-op`.

## Parte 1: configuración

### 1. Entorno de pruebas (desarrollo)

No hace falta configurar `PROJECTS_ROOT` en `.env.local`. Las pruebas generan un portafolio
ficticio en una carpeta temporal (`nexoru-op-fixture-*`) y se lo pasan a la app. La salvaguarda
`assertTestProjectsRoot` impide cualquier otra ruta (FR-028).

```bash
npm run db:start            # Supabase de pruebas (si no está en marcha)
npx supabase db reset       # aplica la migración nueva del índice
npm test                    # unitarias (lector, git, conformidad, roadmap)
npm run db:test             # pgTAP (tabla del índice y su función)
npm run test:e2e            # portafolio y detalle con el portafolio ficticio
```

### 2. Entorno de uso del Dueño [MANUAL]

1. Detén la app de uso: `npm run op:stop`.
2. Abre `.env.op.local` en el editor y añade esta línea (no es un secreto):

   ```text
   PROJECTS_ROOT=/home/fili/proyectos
   ```

3. Arranca: `npm run op:start`. El script aplica la migración nueva a la base de uso con
   `supabase migration up`, sin borrar datos.
4. Entra en `http://127.0.0.1:3200` con tu cuenta y tu segundo factor.

## Parte 2: escenarios de validación

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | Abrir `/` en el entorno de uso | Aparecen `amazon-business-engine`, `conversa-experiencias`, `ganador`, `nexoru-onboarding`, `nexoru-onboarding-line-endings` y `nexoru-op`; `nexoru-governance` aparece aparte como estándar 1.0 |
| 2 | Comparar cada fila con el `PROJECT.md` del proyecto | Nombre, tipo, cliente, fase, estado, fecha objetivo y siguiente hito coinciden (SC-004) |
| 3 | Proyectos sin `PROJECT.md` | Nivel 0, "sin PROJECT.md" y datos ausentes, sin valores inventados |
| 4 | Detalle de `nexoru-op` | Roadmap: Fase 1 `completa` derivada (83/83); Fase 2 `en-curso` derivada (hechas/56). Nivel 3 (provisional), con 3.2 "no evaluada en esta fase" |
| 5 | Detalle de `amazon-business-engine` | Nivel y fallas coherentes con su `PROJECT.md` (revisión del Dueño) |
| 6 | Proyecto en otra rama (`nexoru-onboarding`) | Muestra la rama y el aviso "no es la rama principal" |
| 7 | Editar un `PROJECT.md` (p. ej. el `siguiente_hito` de un proyecto) y pulsar **Actualizar** | El cambio aparece y la hora de lectura se actualiza |
| 8 | Esperar más de 10 minutos y volver a abrir `/` | La hora de lectura es nueva sin haber pulsado Actualizar |
| 9 | Solo lectura (SC-007) | Antes y después de pulsar Actualizar, `git -C <proyecto> status --porcelain` da lo mismo en todos los proyectos, y la huella de fechas de modificación del paso 10 no cambia |
| 10 | Huella de fechas | `find /home/fili/proyectos \( -name node_modules -o -name .next -o -name .next-op -o -path '*/nexoru-op/.op' -o -name test-results -o -name playwright-report \) -prune -o -type f -printf '%T@ %s %p\n' \| sort -k3`, guardado antes y después de Actualizar (con los editores cerrados) y comparado con `diff`, no muestra diferencias. Se excluye lo que cambia solo (dependencias, builds y el log de la app de uso). Los `git status` de comparación usan `--no-optional-locks` para no reescribir `.git/index` |
| 11 | Seguridad (SC-005) | Cubierta por las pruebas unitarias con el portafolio ficticio: enlaces fuera de la raíz, `..`, `.env`, llaves, FIFO y archivo > 1 MB. Resultado: ninguno se lee |
| 12 | Sin sesión | `/` y `/projects/nexoru-op` redirigen a `/login` |
| 13 | Tiempo (SC-001, SC-006) | Desde que termina el inicio de sesión hasta ver el portafolio: menos de 1 minuto; la vista desde el índice abre en menos de 2 s |

Referencias: [contracts/reader.md](contracts/reader.md),
[contracts/conformance.md](contracts/conformance.md), [contracts/ui.md](contracts/ui.md) y
[data-model.md](data-model.md).
