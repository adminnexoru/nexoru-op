# Quickstart: Historial de git, indicadores, identidad visual y gráficos

**Feature**: `003-git-history-insights`. Guía de validación. Los comandos se ejecutan en la terminal
integrada de VS Code, desde la raíz de `nexoru-op`.

## Parte 1: pruebas automáticas (entorno de pruebas)

```bash
npm run db:start && npx supabase db reset
npm test              # historial con fechas conocidas, indicadores, estándar 1.1, .nexoruignore
npm run db:test
npm run test:e2e      # tablero, detalle, semáforos y gráficos; falla ante cualquier violación de CSP
```

El portafolio ficticio se amplía con repos de historial conocido (commits con fechas fijas), un
proyecto que declara la 1.1 y un `.nexoruignore`. Las pruebas usan una fecha de lectura fija.

## Parte 2: validación en el entorno de uso (con el portafolio real)

1. `npm run op:stop` y `npm run op:start` (no hay migraciones nuevas; el índice con formato 1 se
   vuelve a leer solo).
2. **[MANUAL] `.nexoruignore`**: el Dueño crea `/home/fili/proyectos/.nexoruignore` con la línea
   `nexoru-onboarding-line-endings` (si lo decide).

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | Abrir `/` | Cinco gráficos encima de la tabla, cada uno con "Ver datos"; sin `nexoru-onboarding-line-endings` si está en `.nexoruignore`; sin el aviso de estándar más nuevo |
| 2 | Columnas del tablero | Estado declarado (círculo) y Actividad (cuadrado), cada uno con su etiqueta y texto; Conformidad y Avance con su base; Roadmap activo o concluido |
| 3 | Actividad | Los días sin actividad coinciden con `git log -1 --branches --format=%cI` de cada repo; semáforo según 5/15 días; neutro en `operacion`, `pausado` y `retirado` |
| 4 | Detalle de `nexoru-op` | 12 semanas con commits; adelanto/atraso contra `origin/HEAD`; antigüedad de la referencia remota; días en `construccion` y coincidencia con `fase_desde` |
| 5 | Detalle de `ganador` | Antigüedad de la referencia remota: "desconocida" (nunca hizo fetch); adelanto/atraso contra `main` |
| 6 | Conformidad y Avance | Coinciden con un cálculo a mano en `amazon-business-engine` y `nexoru-op` |
| 7 | Escala de grises | Con el filtro de escala de grises del navegador, los semáforos se distinguen por forma, ícono y texto (SC-003) |
| 8 | Solo lectura (SC-006) | Huella de 5206+ archivos y `git status` idénticos antes y después de Actualizar (método de la Fase 2) |
| 9 | Tiempo (SC-005) | Actualizar termina en menos de 2 s con el portafolio real |
| 9b | Inactivos (SC-001) | Con el tablero abierto, el Dueño identifica en menos de 30 s los proyectos con semáforo de actividad rojo (> 15 días) |
| 10 | Identidad | El tablero se parece a la app de `nexoru-onboarding` (revisión del Dueño contra `docs/identidad-visual.md`) |

Referencias: [contracts/git-history.md](contracts/git-history.md),
[contracts/indicators-ui.md](contracts/indicators-ui.md) y [data-model.md](data-model.md).
