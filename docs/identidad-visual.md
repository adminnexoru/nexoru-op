# Identidad visual de Nexoru Op

Nexoru Op adopta el aspecto de la **app de onboarding de `nexoru-onboarding`** (decisión B-010 del
Dueño; tema oscuro confirmado el 2026-10-01). Todos los sistemas de Nexoru siguen ese aspecto,
salvo `conversa-experiencias`, que no se modifica.

Los valores se leyeron **en solo lectura** de `nexoru-onboarding` (rama
`001-whatsapp-followup-agent`, 2026-10-01). **No se importa código de ese repositorio**: los tokens
viven en `src/app/tokens.css` y `src/app/globals.css` los asigna a las variables de shadcn/ui.

## 1. Tema

| Decisión | Motivo |
|---|---|
| **Oscuro**, el de la app de onboarding (`app/onboarding-ui.css`) | El dashboard es una aplicación, como el flujo de onboarding, no una página de presentación |
| Paleta clara de la landing (`app/globals.css`: `#f5f7fb`, `#202430`, `#4f46e5`): **descartada** | Es la cara pública del sitio, no la de una aplicación de trabajo |
| Sin modo claro alternativo | Un solo usuario y un solo tema: menos que mantener (principio VII) |

## 2. Colores

Los colores translúcidos de onboarding se guardan **ya compuestos sobre el fondo**, para poder
comprobar su contraste en las pruebas (`tests/unit/visual/contrast.test.ts`).

| Token (`tokens.css`) | Valor | Origen en `nexoru-onboarding` | Uso |
|---|---|---|---|
| `--nx-bg` | `#05060a` | `--nx-bg` | Fondo de la página |
| `--nx-surface` | `#0a0c13` | `--nx-surface` `rgba(10,12,20,.92)` sobre el fondo | Tarjetas |
| `--nx-surface-2` | `#0d101a` | `--nx-surface-2` `rgba(14,17,28,.9)` sobre el fondo | Menús emergentes |
| `--nx-surface-3` | `#0c0d11` | `--nx-surface-3` `rgba(255,255,255,.03)` sobre el fondo | Superficies sutiles |
| `--nx-border` | `rgb(255 255 255 / .08)` | `--nx-border` | Bordes |
| `--nx-border-strong` | `rgb(124 58 237 / .24)` | `--nx-border-strong` | Bordes destacados |
| `--nx-text` | `#ffffff` | `--nx-text` | Texto principal |
| `--nx-text-soft` | `#c3c3c4` | `--nx-text-soft` `rgba(255,255,255,.76)` sobre el fondo | Texto secundario |
| `--nx-text-muted` | `#919193` | `--nx-text-muted` `rgba(255,255,255,.56)` sobre el fondo | Texto atenuado (`muted-foreground`) |
| `--nx-violet` | `#7c3aed` | `--nx-violet` | Acento: botones principales (`primary`) |
| `--nx-violet-2` | `#8b5cf6` | `--nx-violet-2` | Foco (`ring`) y barras de gráficos |
| `--nx-violet-text` | `#a78bfa` | color de texto violeta de `onboarding-ui.css` | Violeta usado como texto sobre el fondo |
| `--nx-blue` | `#38bdf8` | `--nx-blue` | Segundo color de gráficos |

Adaptaciones propias, sin equivalente en onboarding: `--secondary` `#161a26`, `--muted`
`#12141c` y `--accent` `#1a1530`, que son superficies de botones y estados intermedios con el mismo
matiz.

## 3. Tipografía

- La pila es la misma que en onboarding: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI",
  Helvetica, Arial, sans-serif`.
- **Inter va empaquetada localmente** con `@fontsource/inter` (licencia OFL-1.1, sin dependencias),
  en los pesos 400, 500, 600 y 700. Motivo (revisión del Dueño, 2026-10-02): en la máquina del Dueño
  Inter no está instalada y se renderizaba Noto Sans. Los archivos se sirven desde la propia app
  (`font-src 'self'`); no hay peticiones a servidores externos, y una prueba E2E lo comprueba.
- Se retiró la fuente Geist que traía la plantilla inicial, que se descargaba en el build.
- Monoespaciada para rutas, ramas e identificadores: la pila del sistema (`ui-monospace`, Menlo,
  Consolas).

## 4. Acento en componentes y ancho

- **Acción principal** de cada pantalla (Actualizar, Iniciar sesión, Activar cuenta, Verificar):
  botón **violeta** (`--primary` = `--nx-violet`), texto blanco y hover al 80 %.
- **Acciones secundarias** (Cerrar sesión, copiar o descargar códigos, regenerarlos): botón con
  borde, sin relleno.
- **Foco con teclado**: anillo violeta (`--ring` = `--nx-violet-2`) en todos los botones y campos.
- **Enlaces**: violeta claro `--nx-violet-text` (`#a78bfa`, contraste AA). La navegación del
  encabezado usa el color de texto normal.
- **Ancho**: el contenido usa todo el ancho de la ventana (márgenes de 24 px). Las tablas y los
  gráficos ocupan todo el ancho disponible; en pantallas angostas, la tabla tiene su propio
  desplazamiento horizontal, sin cortar columnas ni desplazar la página. Los textos largos
  (descripciones, avisos, notas) se limitan a un ancho de lectura cómodo (`max-w-prose`, unos 65
  caracteres).
- Lo comprueban pruebas E2E con los valores que calcula el navegador (`getComputedStyle`), no solo
  con los tokens (`tests/e2e/us3-visual-render.spec.ts`).

## 5. Espaciado, radios y sombras

| Elemento | Valor | Origen |
|---|---|---|
| Radio base (`--radius`) | 18 px | Tarjetas de onboarding (`border-radius: 18px`) |
| Píldoras | 999 px | Botones y chips de onboarding |
| Separaciones | 10–22 px | `gap` de onboarding |
| Relleno de paneles | 24–28 px (las tarjetas de shadcn) | Paneles de onboarding: 28–48 px; se reduce porque el tablero es denso |
| Resplandor | `0 0 26px rgb(124 58 237 / .28)` (`--nx-shadow-glow`) | `--nx-glow-violet` |

Se omiten a propósito los orbes y la rejilla decorativa del fondo de onboarding: el tablero muestra
datos densos, y la decoración resta legibilidad.

## 6. Semáforos

**Tonos propios**, ajustados para el fondo oscuro y sin reutilizar tal cual los de onboarding:

| Nivel | Tono | Contraste (fondo / tarjeta) | Referencia en onboarding |
|---|---|---|---|
| Verde | `#4ade80` | 11,6:1 / 11,2:1 | — (onboarding no tiene verde) |
| Ámbar | `#f5b942` | 11,5:1 / 11,1:1 | aviso `#fde68a` (no reutilizado) |
| Rojo | `#ff7a7a` | 8,0:1 / 7,7:1 | peligro `#fecaca` (no reutilizado) |
| Neutro | `#a6adbb` | 9,0:1 / 8,7:1 | texto atenuado |

**Reglas de uso** (FR-018, FR-020, FR-032 y FR-033):

1. **Nunca solo color.** Cada semáforo lleva un ícono (`lucide-react`, decorativo, con
   `aria-hidden`), un texto visible y su etiqueta.
2. **Dos tipos que no se confunden.**
   - **Estado declarado** (el campo `estado` del manifiesto) es una **píldora** de borde continuo.
     Íconos: círculo con check (Verde), círculo con exclamación (Ámbar) y círculo con X (Rojo).
   - **Actividad** (días sin commits) es un **cuadrado de borde discontinuo**. Íconos de reloj:
     Activo (≤ 5 días), Lento (6–15 días) e Inactivo (> 15 días).
3. **Neutro.** La actividad es gris, con el texto "Sin seguimiento" y el número de días, en las
   fases `pausado`, `operacion` y `retirado`.
4. **Igual en todas partes.** Los mismos colores, formas e íconos en el tablero, el detalle y los
   gráficos. El fondo de cada semáforo es su tono al 12 %.
5. **Sin estilos en línea.** Todo es por clases de CSS (`.traffic-light--…`), porque la CSP
   estricta bloquea los atributos `style`.

## 7. Qué no cambia

- Componentes: se mantienen los de shadcn/ui; solo cambian sus variables.
- `conversa-experiencias` no se toca.
- Cambios posteriores en `nexoru-onboarding` no se propagan solos: si su aspecto cambia, se
  actualiza este documento y `tokens.css`.
