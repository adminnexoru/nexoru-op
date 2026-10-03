# Contrato: GitHub en el tablero y el detalle

**Feature**: `004-github-readonly` | Research R8 a R11

Reglas generales de la Fase 3:

- Sin estilos en línea (CSP).
- Los semáforos llevan forma, ícono, texto y etiqueta.
- Los textos con números pasan por `src/lib/format.ts`.
- Un dato que falta se muestra con su motivo.

## Encabezado del portafolio

- "Datos de GitHub de hace X" (con `<time>`), o "Sin datos de GitHub: pulsa Actualizar".
- "Consultas a GitHub: N restantes, se restablece a las HH:MM" (si hay dato del límite).
- **Token**:
  - "Token de GitHub: vence el AAAA-MM-DD", o "Token de GitHub: sin fecha de vencimiento informada";
  - "Sin token: solo repos públicos, 60 consultas por hora".
- **Avisos** (`Alert`):
  - el token vence en 14 días o menos;
  - el token no es válido;
  - la actualización se detuvo por el límite;
  - N repos tienen alertas de secretos abiertas.

## Tabla del portafolio (13 columnas)

`Proyecto` · `Tipo` · `Fase` · `Estado declarado` · `Fecha objetivo` · `Siguiente hito` · `Nivel` ·
`Conformidad` · `Avance` · `Actividad` · **`CI`** · **`PRs`** · `Rama`

| Columna | Contenido |
|---|---|
| Proyecto | Nombre y, debajo, "público" o "privado" (o nada si no hay dato) |
| Tipo | Tipo y, en `producto-cliente`, el cliente debajo (antes eran dos columnas) |
| Conformidad | "97 % · 28 de 29 (incluye 3.2)" o "100 % · 28 de 28 (3.2 sin evaluar: sin datos recientes de GitHub)": el estado de 3.2 en la misma celda, como texto (sin depender de un ícono ni de un tooltip) |
| CI | Semáforo compacto (forma: rombo, distinta de círculo y cuadrado) con éxito, falla, en curso, no disponible o no aplica; "hace X" si el dato es guardado |
| PRs | Número de PRs abiertos, "—" si no aplica, "?" con motivo accesible si no disponible |

La columna **Roadmap** sale de la tabla: sigue en el detalle.

**Leyenda fija de Conformidad**, bajo la tabla y en el detalle: "La Conformidad incluye la
verificación 3.2 (CI de la rama principal) desde la Fase 4: la base es 29 cuando 3.2 se evalúa y 28
cuando no se puede evaluar; la base cambió de 28 a 29 por la activación de 3.2". Es el único lugar
donde aparece "cambió"; no depende de lo que pasó en la última actualización.

## Detalle del proyecto: tarjeta "GitHub"

- **Repo** (`dueño/nombre`), y el aviso si difiere del `repo` de `PROJECT.md`.
- **Visibilidad**:
  - "público" o "privado", o "no disponible: motivo";
  - en 1.2, el resultado (`aceptada`, `requiere-decision`, `discrepancia`,
    `sin-declarar (interno)`) con su explicación.
- **CI de la rama principal** (`rama`): una fila por workflow que cumple 3.1 (1.2), o la última
  ejecución (1.0 y 1.1). Cada fila lleva el nombre del workflow, el resultado, la fecha y "en
  curso" si aplica.
- **PRs abiertos**: número, título (texto), "abierto hace N días" y CI; "Ninguno" si no hay.
- **Alertas de secretos**: "Ninguna", "N abiertas" o "no evaluado: motivo".
- **Origen de los datos**: "Datos de GitHub de hace X" y "desactualizado" si tienen 7 días o más.

## Conformidad y nivel en el detalle

- 3.2 aparece como cumplida, fallida (con los workflows en rojo o sin ejecuciones) o no evaluada
  (con motivo).
- El nivel 3 sin "provisional" cuando 3.2 está evaluada.
- El estado de 3.2 junto al porcentaje, con el mismo texto que en la tabla, y la leyenda fija.
- El aviso informativo de versión, en proyectos 1.0 y 1.1: "hay una versión más nueva del estándar
  (1.2) con reglas más estrictas de CI y visibilidad". No es un hallazgo.

## Pruebas obligatorias (deben fallar primero)

| Prueba | Comprueba |
|---|---|
| Conformidad sin 3.2 (unitaria, `format.ts` e indicadores) | Para cada motivo de FR-017 (sin red, requiere token, token no válido o vencido, dato de 8 días, remoto que no es de GitHub, sin remoto): base 28 y el texto exacto "100 % · 28 de 28 (3.2 sin evaluar: <motivo>)"; con 3.2 evaluada: "… de 29 (incluye 3.2)" |
| Secuencia de actualizaciones (unitaria) | Actualización 1 con CI en verde → 29 (incluye 3.2); actualización 2 sin respuesta de GitHub y dato de 2 días → sigue en 29 con "CI de hace 2 días"; relectura con el dato de 8 días → 28 con "sin datos recientes de GitHub". Fuera de la leyenda fija no aparece la palabra "cambió" |
| Tablero y detalle (E2E) | Con el GitHub simulado apagado, la celda de Conformidad muestra el texto con el motivo y la leyenda fija aparece una sola vez bajo la tabla |

## Accesibilidad y CSP

- El nuevo semáforo de CI cumple contraste AA (prueba de `tokens.css`) y se distingue en escala de
  grises por su forma.
- Ningún origen nuevo en la CSP: no hay imágenes ni scripts de GitHub. Las E2E siguen fallando ante
  cualquier violación.
