# Nexoru Op

Dashboard **local, de solo lectura y para un solo usuario** (el Dueño de Nexoru) que muestra el
estado del portafolio leyendo los proyectos de `PROJECTS_ROOT` según el
[Estándar de Proyecto Nexoru](https://github.com/adminnexoru/nexoru-governance).

- **Portada ejecutiva:** [PROJECT.md](PROJECT.md)
- **Diseño funcional:** [docs/mapa-funcional.md](docs/mapa-funcional.md)
- **Principios:** [.specify/memory/constitution.md](.specify/memory/constitution.md)
- **Specs:** [specs/](specs/) (fuente de verdad técnica) y [specs/backlog.md](specs/backlog.md)

Nexoru Op no envía correos ni notificaciones, no escribe en los proyectos, en git ni en GitHub, y
escucha solo en `127.0.0.1`.

## Qué muestra

- **Portafolio (`/`):** cada proyecto de `PROJECTS_ROOT` con los datos de su `PROJECT.md` (tipo,
  cliente, fase, estado, fecha objetivo, siguiente hito), su nivel de conformidad con el estándar
  (0 a 3) y su rama actual. `nexoru-governance` aparece aparte, como estándar. El portafolio se
  vuelve a leer al abrirlo si la última lectura tiene más de 10 minutos, o con el botón
  **Actualizar**.
- **Detalle (`/projects/<carpeta>`):** fallas para subir de nivel, advertencias, hallazgos (p. ej.
  un `.env` versionado), verificaciones que todavía no se evalúan (las que necesitan GitHub),
  manifiesto completo, roadmap con el estado derivado de `tasks.md` y errores de lectura.

Un dato que no está en los archivos del proyecto se muestra como ausente (—); nunca se inventa.

## Requisitos

- Node.js 24 (`nvm use 24`) y Docker.
- `npm ci`.
- Docker solo en local: `/etc/docker/daemon.json` con `{"ip": "127.0.0.1"}`. Los scripts
  `db:start` y `op:start` crean además la red de Supabase solo en `127.0.0.1`.

## Uso diario (entorno de uso)

```bash
npm run op:start            # Supabase de uso + app en http://127.0.0.1:3200
npm run op:bootstrap-owner  # solo la primera vez: enlace de activación en la terminal
npm run op:stop             # detiene todo sin borrar datos
```

Variables en `.env.op.local` (ver `.env.example`), incluida `PROJECTS_ROOT=/home/fili/proyectos`
(la carpeta del portafolio; sin ella el dashboard avisa que falta). Guía completa, procedimientos de recuperación y
consulta de la bitácora: [specs/001-user-access/quickstart.md](specs/001-user-access/quickstart.md).

## Desarrollo y pruebas (entorno de pruebas)

```bash
npm run db:start            # Supabase de pruebas (127.0.0.1:54321)
npx supabase db reset       # aplica las migraciones
npm run dev                 # http://127.0.0.1:3000
npm run lint && npm run typecheck
npm test                    # Vitest
npm run db:test             # pgTAP (RLS y funciones SQL)
npm run test:e2e            # Playwright
```

Variables en `.env.local` (ver `.env.example`). Las pruebas se niegan a correr contra el entorno de
uso y leen solo un portafolio ficticio que generan en una carpeta temporal
(`tests/fixtures/portfolio/`); `PROJECTS_ROOT` no va en `.env.local`.
