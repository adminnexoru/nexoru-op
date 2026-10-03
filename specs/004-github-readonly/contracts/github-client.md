# Contrato: cliente de GitHub de solo lectura

**Feature**: `004-github-readonly` | Research R3 a R7, R12

## Superficie

- **Módulo único**: `src/lib/github/client.ts` (`server-only`). Es el único archivo de `src/` que
  hace peticiones a GitHub.
- **Exporta**:
  - `githubGet(route, options)`;
  - `fetchPortfolioGithub(projects, previous, deps)`, que orquesta las oleadas;
  - `GITHUB_API_ORIGIN`, la constante `https://api.github.com`.
- **Navegador**: ningún componente cliente (`"use client"`) importa `src/lib/github`.

## Reglas

1. **Método**: solo `GET`. La función interna `request(method, route)` lanza
   `GithubClientError("method_not_allowed")` con cualquier otro método **antes** de tocar la red.
2. **Destino**:
   - el origen es `https://api.github.com`;
   - en el entorno de pruebas, y solo ahí, puede ser `http://127.0.0.1:<puerto>` vía
     `GITHUB_API_ORIGIN`;
   - en el entorno de pruebas se rechaza el origen real;
   - en el entorno de uso se rechaza cualquier override.
3. **Rutas permitidas**: patrones cerrados, con `{o}` y `{r}` según `^[A-Za-z0-9_.-]+$` (sin `..`),
   `{sha}` de 40 hexadecimales y `{archivo}` como nombre de archivo de `.github/workflows/`. Una
   ruta fuera del catálogo lanza `GithubClientError("route_not_allowed")`.
   - `/repos/{o}/{r}`
   - `/repos/{o}/{r}/actions/runs?branch=…&per_page=50&exclude_pull_requests=true`
   - `/repos/{o}/{r}/actions/workflows/{archivo}/runs?branch=…&status=completed&per_page=1`
   - `/repos/{o}/{r}/pulls?state=open&per_page=30`
   - `/repos/{o}/{r}/actions/runs?head_sha={sha}&per_page=20`
   - `/repos/{o}/{r}/secret-scanning/alerts?state=open&per_page=100&hide_secret=true`
4. **Cabeceras enviadas**:
   - `Accept: application/vnd.github+json` y `X-GitHub-Api-Version: 2022-11-28`;
   - `User-Agent: nexoru-op`;
   - `If-None-Match` si hay ETag;
   - `Authorization: Bearer <token>`, solo si hay token.
5. **Opciones de `fetch`**: `cache: "no-store"`, `redirect: "error"`, y una `signal` que combina el
   plazo global (8 s) con el de la petición (4 s).
6. **Respuestas**:
   - **200**: se resume (data-model) y se guarda con su ETag.
   - **304**: se usa el resumen guardado.
   - **401**: "el token de GitHub no es válido"; se detiene todo lo que usa token.
   - **403 o 429 con `x-ratelimit-remaining: 0` o `retry-after`**: se detiene la actualización
     ("límite agotado; se restablece a las HH:MM").
   - **403 en alertas**: el token no tiene permiso.
   - **404**: "el repo no existe o el token no tiene acceso"; en alertas, "secret scanning no está
     activo en el repo o el token no tiene acceso".
   - **5xx o red caída**: "error de GitHub" o "sin conexión con GitHub".
   - **Tiempo agotado**: "tiempo agotado".
   - **Nunca se reintenta.**
7. **Límite**: cada respuesta actualiza `rateLimit`. Con `remaining ≤ 2` no se hacen más consultas.
8. **Token**: se lee solo de `getServerEnv().GITHUB_TOKEN` (opcional) y no aparece en:
   - URLs, mensajes de error ni `console.*`;
   - el índice, el HTML ni las props de componentes.

   Los errores llevan solo el código interno y el estado HTTP.
9. **Datos sensibles de la respuesta**:
   - de las alertas solo se cuenta `length` (con `hide_secret=true`);
   - de los PRs solo número, título y fecha.

## Pruebas obligatorias (deben fallar primero)

| Prueba | Comprueba |
|---|---|
| Métodos | `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` lanzan error y el `fetch` simulado no recibe nada |
| Rutas y origen | Ruta fuera del catálogo, `..`, otro host u origen real en el entorno de pruebas → error |
| Token | Con `GITHUB_TOKEN=test-token-NO-REAL-0000`: no aparece en el índice, en los errores, en la salida de consola capturada ni en el HTML de `/` y del detalle (E2E) |
| Código | Recorrido de `src/`: solo `client.ts` hace peticiones a GitHub; ningún archivo `"use client"` importa `src/lib/github` |
| ETag | Segunda consulta envía `If-None-Match` y con 304 reutiliza el resumen |
| Límite | `remaining: 2` detiene; 403/429 con `retry-after` detiene sin reintentos |
| Plazo | Respuestas lentas → "tiempo agotado" dentro de 8 s y lo local se guarda igual |
| Salvaguarda | Cualquier petición a `api.github.com` desde Vitest hace fallar la prueba (`setupFiles`) |
| Entorno de uso | `GITHUB_API_ORIGIN` con la configuración de uso hace fallar el arranque |
