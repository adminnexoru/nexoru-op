# Contrato: indicadores, semáforos, gráficos y pantallas

## Tablero (`/`)

- Columnas nuevas:
  - **Estado declarado**: semáforo circular, con su etiqueta. Reemplaza el texto plano de
    `estado`.
  - **Actividad**: semáforo cuadrado, con su etiqueta y "N días".
  - **Conformidad**: "93 %" con "25 de 27".
  - **Avance**: "75 %" con "30 de 40 tareas".
  - **Roadmap**: activo o concluido.
- Cinco gráficos encima de la tabla:
  1. Estado declarado: proyectos por verde, ámbar y rojo.
  2. Nivel de conformidad: proyectos por nivel 0–3, provisionales aparte.
  3. Avance por proyecto.
  4. Proyectos por fase del ciclo de vida.
  5. Actividad del portafolio: commits por semana de las últimas 12 semanas.

  Cada gráfico: SVG generado en el servidor, `role="img"` con `<title>` y `<desc>`, y una tabla con
  los mismos valores debajo (`<details>` con el resumen "Ver datos"). Sin datos: "Sin datos".
- Los totales de los gráficos 1, 2 y 4 suman el número de filas de la tabla.

## Detalle (`/projects/[folder]`)

- **Historial de git**:
  - último commit;
  - días sin actividad con el semáforo de actividad;
  - 12 semanas, como gráfico pequeño y tabla;
  - adelanto/atraso contra `origin/HEAD` o `main`;
  - antigüedad de las referencias remotas ("referencia local de hace N días" o "desconocida");
  - días en la fase, comparados con `fase_desde`, con un aviso si no coinciden;
  - cambios sin commit.
- **Indicadores**:
  - Conformidad, con la lista de las verificaciones que faltan.
  - Avance, con "fases con estado manual no incluidas: n" y "fases completas: x de y".
- **Roadmap**: activo o concluido.
- **Hallazgos**: los dos nuevos de la 1.1, cuando aplican.

## Base de Conformidad y Avance

- **Conformidad**: verificaciones cumplidas sobre las aplicables. En esta fase son **28 aplicables**
  (todas salvo la 3.2, que necesita GitHub).
- **Cambio de base en la Fase 4**: al activar la verificación 3.2, el total pasará de **28 a 29**.
  Los porcentajes pueden **bajar sin que el proyecto empeore**: por ejemplo, 28/28 = 100 % puede
  pasar a 28/29 = 97 % si la CI de `main` no está en verde. La Fase 4 **deberá mostrar ese cambio de
  base de forma explícita**, con la base anterior y la nueva y el motivo, por lo menos durante la
  primera lectura con la base nueva. Esto queda anotado en `PROJECT.md` para su spec y su plan.
- **Proyectos no evaluados** (versión del estándar no soportada o sin versión): **los dos**
  indicadores quedan ausentes con el mismo motivo, porque la lectura del roadmap también depende
  del estándar (decisión del Dueño, 2026-10-02).

## Semáforos

| Tipo | Forma | Niveles (texto) | Ícono (`lucide-react`) |
|---|---|---|---|
| Estado declarado | círculo | Verde, Ámbar, Rojo | `CircleCheck`, `CircleAlert`, `CircleX` |
| Actividad | cuadrado redondeado | Activo (≤ 5 d), Lento (6–15 d), Inactivo (> 15 d), Sin seguimiento | `Clock` con variante por nivel; `CircleMinus` para neutro |

- Los colores salen de `src/app/tokens.css`, con contraste AA sobre el fondo del tema.
- Cada semáforo lleva siempre su etiqueta ("Estado declarado", "Actividad") y su texto visible:
  nunca depende solo del color (FR-018, FR-033).
- Las formas, íconos y colores son los mismos en el tablero, el detalle y los gráficos (FR-020).

## CSP

Sin atributos `style` en el HTML, sin JavaScript para los gráficos y sin dependencias nuevas. Las
E2E existentes fallan ante cualquier violación.
