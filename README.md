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

- **Portafolio (`/`):**
  - cinco gráficos: estado declarado, nivel de conformidad, Avance por proyecto, fase del ciclo de
    vida y actividad de git por semana, cada uno con su tabla "Ver datos";
  - una tabla con cada proyecto de `PROJECTS_ROOT`: datos de su `PROJECT.md`, semáforo de estado
    declarado, nivel de conformidad (0 a 3), Conformidad y Avance en porcentaje, semáforo de
    actividad de git, CI de la rama principal (GitHub), PRs abiertos y rama actual; bajo el nombre,
    si el repo es público o privado;
  - `nexoru-governance` aparte, como estándar (se soportan las versiones 1.0, 1.1 y 1.2);
  - en el encabezado, la antigüedad de los datos de GitHub, las consultas restantes y el
    vencimiento del token.

  El portafolio se vuelve a leer al abrirlo si la última lectura tiene más de 10 minutos, o con el
  botón **Actualizar**, que es el único que consulta GitHub (en solo lectura). Las carpetas listadas en
  `PROJECTS_ROOT/.nexoruignore` no se muestran.
- **Detalle (`/projects/<carpeta>`):**
  - indicadores con su cálculo;
  - conformidad: fallas para subir de nivel, advertencias, hallazgos (p. ej. un `.env` versionado)
    y verificaciones que no se pudieron evaluar, con su motivo;
  - roadmap con el estado derivado de `tasks.md`;
  - manifiesto completo y repositorio;
  - historial de git: último commit, 12 semanas de actividad, adelanto y atraso frente a la rama
    principal, antigüedad de las referencias remotas y días en la fase frente a `fase_desde`;
  - GitHub: visibilidad y su resultado (estándar 1.2), CI por workflow, PRs abiertos con su CI y
    número de alertas de secretos abiertas;
  - errores de lectura.

Todo se lee en solo lectura: el dashboard nunca ejecuta `fetch` ni escribe en los repositorios.
La identidad visual sigue la app de `nexoru-onboarding` (`docs/identidad-visual.md`).

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
(la carpeta del portafolio; sin ella el dashboard avisa que falta) y, opcional, `GITHUB_TOKEN` (cómo
crearlo con permisos mínimos: [specs/004-github-readonly/quickstart.md](specs/004-github-readonly/quickstart.md)). Guía completa, procedimientos de recuperación y
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
