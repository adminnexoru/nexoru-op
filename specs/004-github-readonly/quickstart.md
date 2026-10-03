# Quickstart: Datos de GitHub en solo lectura

**Feature**: `004-github-readonly` | Contratos: [github-client.md](contracts/github-client.md),
[github-ui.md](contracts/github-ui.md) | [data-model.md](data-model.md)

## Parte 1: pruebas automáticas (entorno de pruebas, sin GitHub real)

```bash
npm test                      # Vitest: cliente, simulación de GitHub, reglas 3.2 y visibilidad
npx supabase db reset && npm run db:test
npm run test:e2e              # Playwright con el GitHub simulado en 127.0.0.1
```

- Ninguna prueba necesita token ni red. Una petición a `api.github.com` hace fallar la prueba.
- La CI de `nexoru-op` corre igual, sin secretos nuevos.

## Parte 2: crear el token (una vez; lo hace el Dueño)

Es un token **fine-grained**, de **solo lectura**. No pegues nunca su valor en el chat ni en
ningún archivo del repo.

1. En GitHub, con la cuenta `adminnexoru`: **Settings → Developer settings → Personal access
   tokens → Fine-grained tokens → Generate new token**.
2. **Token name**: `nexoru-op lectura`. **Expiration**: 90 días (el dashboard avisa 14 días antes).
3. **Resource owner**: `adminnexoru`.
4. **Repository access**: **Only select repositories**, y marca los repos del portafolio (hoy:
   `amazon-business-engine`, `conversa-experiencias`, `ganador`, `nexoru-governance`,
   `nexoru-onboarding`, `nexoru-op`). Al crear un repo nuevo, edita el token para añadirlo.
5. **Repository permissions**, todos en **Read-only**. Deja todo lo demás en *No access*:

   | Permiso | Historia |
   |---|---|
   | Metadata (GitHub lo marca solo) | US1, US2 |
   | Actions | US1 (CI de la rama principal) y US3 (CI de cada PR) |
   | Pull requests | US3 |
   | Secret scanning alerts | US4 |

   Sin *Account permissions*, sin *Contents*, sin nada en *Read and write*.
6. **Generate token** y copia el valor.
7. En la terminal integrada de VS Code, abre `.env.op.local` (no `.env.local`) y añade una línea
   `GITHUB_TOKEN=` seguida del valor. Guarda.
8. `npm run op:stop` y `npm run op:start` para que la app de uso lo lea.

Sin token, el dashboard consulta solo los repos públicos, con 60 consultas por hora; los privados
dicen "no disponible: requiere token".

## Parte 3: validación con el portafolio real (entorno de uso)

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | Sin token, pulsar Actualizar | Repos públicos con CI, visibilidad y PRs; `conversa-experiencias` "no disponible: requiere token"; alertas "no evaluado: requiere token" |
| 2 | Con token, pulsar Actualizar | Los 6 repos con datos; "Datos de GitHub de hace unos segundos"; consultas restantes y vencimiento del token |
| 3 | CI | La CI de `main` de cada repo coincide con `gh run list --branch main --limit 1` |
| 4 | 3.2 y Conformidad | ABE y `nexoru-op` con nivel 3 sin "provisional" y "… de 29 (incluye 3.2)"; la leyenda fija bajo la tabla |
| 4b | Sin red tras 7 días o más | "100 % · 28 de 28 (3.2 sin evaluar: sin datos recientes de GitHub)", sin ningún aviso de "cambio" |
| 5 | Visibilidad | Público o privado, igual que `gh repo list adminnexoru`; ABE y `nexoru-op` en 1.1 sin hallazgo y con el aviso de la versión 1.2 |
| 6 | PRs | Coinciden con `gh pr list` de cada repo |
| 7 | Alertas | Número igual al de la pestaña Security de cada repo; `conversa-experiencias` "no evaluado" |
| 8 | Segunda actualización (con token) | Consume como máximo el 10 % de las consultas de la primera (SC-006) |
| 9 | Sin red (Wi-Fi apagado) | Actualizar termina en menos de 10 s; lo local completo; GitHub con datos guardados "de hace X" |
| 10 | Relectura automática (más de 10 min) | No consulta GitHub: el número de consultas restantes no cambia |
| 11 | Token | El valor no aparece en la página (Ctrl+U), en `.op/app.log` ni en el índice |
| 12 | Solo lectura | Huella del portafolio y `git status` idénticos antes y después (método de la Fase 3) |

## Parte 4: cierre (tarea [MANUAL], FR-027)

Desde la sesión de cada proyecto (`amazon-business-engine` y `nexoru-op`):

1. Declarar `visibilidad: publico` en el frontmatter de `PROJECT.md`, con su fila en
   `## Decisiones clave`.
2. Subir `version_estandar` a `"1.2"` en `PROJECT.md` y en `docs/mapa-funcional.md`.

Claude verifica después, en solo lectura, que el dashboard los evalúa con 1.2 y que su visibilidad
es `aceptada`.
