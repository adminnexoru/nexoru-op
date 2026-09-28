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

Variables en `.env.op.local` (ver `.env.example`). Guía completa, procedimientos de recuperación y
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
uso.
