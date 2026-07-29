# Tipografía

## Escala de referencia

```text
caption      12/16
label        14/20
body         16/24
body-strong  16/24, weight 600
title-sm     20/28
title-md     24/32
title-lg     30–32/40
display      36–40/48
```

**Es referencia, no una orden de reemplazar el sistema actual.** Sirve para
detectar dos defectos concretos: escalones que no se distinguen entre sí (dos
tamaños a 1 px de diferencia no leen como jerarquía) y saltos que no existen en
la escala.

Mapeo a Tailwind: `text-xs` 12/16 · `text-sm` 14/20 · `text-base` 16/24 ·
`text-lg` 18/28 · `text-xl` 20/28 · `text-2xl` 24/32 · `text-3xl` 30/36 ·
`text-4xl` 36/40. Cuando el line-height por defecto no coincide con la escala
de arriba, se ajusta explícito (`text-3xl leading-10`).

## Elección de fuente

Prioridad, en orden:

1. **La fuente ya configurada.** En este proyecto: **Geist Sans** y **Geist
   Mono**, cargadas con `next/font/google` en `src/app/layout.tsx` y expuestas
   como `--font-sans` / `--font-mono`.
2. Inter Variable.
3. Geist Sans.
4. System font stack (`ui-sans-serif, system-ui, sans-serif`).

**No se agregan fuentes.** Cada familia nueva es un request más, un riesgo de
CLS más y una decisión que se levanta al usuario. Los pesos que ya se cargan
alcanzan para toda la jerarquía: 400, 500, 600 y 700 son de sobra.

## Jerarquía tipográfica

Tres niveles de énfasis por pantalla es el techo práctico:

| Nivel | Rol | Token típico |
|---|---|---|
| Dominante | Título de pantalla o dato clave (el total) | `title-md` / `title-lg`, weight 600–700, `text-text-primary` |
| Contenido | Cuerpo, celdas, valores | `body`, weight 400, `text-text-primary` |
| Apoyo | Labels, metadatos, ayudas | `label` / `caption`, weight 400–500, `text-text-secondary` |

Regla: **la diferencia entre dos niveles se sostiene con tamaño *o* peso *o*
color, y basta con dos de los tres.** Los tres a la vez (más grande + más
negrita + más oscuro + además otro color) sobreactúa y aplana el resto.

Antipatrón frecuente: todo en `font-semibold`. Si todo pesa, nada pesa.

## Peso

- 400 — cuerpo y celdas de tabla.
- 500 — labels, encabezados de tabla.
- 600 — títulos, totales, valores destacados.
- 700 — reservado al dato dominante de la pantalla (el total de una venta).

Nunca menos de 400 para texto de lectura. Un weight 300 a 14 px pierde contraste
efectivo aunque el color cumpla WCAG.

## Line-height

| Contenido | Line-height |
|---|---|
| Títulos grandes (≥ 24 px) | 1.2–1.3 |
| Cuerpo de lectura | 1.5 |
| Celdas de tabla densa | 1.35–1.4 |
| Texto de un botón o badge | 1.0–1.2 (el alto lo da el padding) |

Un título con 1.5 se desarma en dos líneas que parecen dos elementos.

## Tracking

- Texto normal: sin ajuste (`0`).
- Títulos ≥ 30 px: `-0.01em` a `-0.02em`; a tamaño grande el espaciado por
  defecto se ve suelto.
- Números tabulares alineados en columna: leve negativo. `.num` de este repo ya
  aplica `letter-spacing: -0.01em`.
- **Nunca** tracking positivo en mayúsculas de más de dos palabras: se lee peor,
  no mejor.

## Longitud de línea

- Texto de lectura corrida: **45–75 caracteres** por línea. Se limita con
  `max-w-prose` o un `max-w-*` explícito, no dejando que herede el ancho del
  contenedor.
- Descripciones de formulario y ayudas: hasta 60 caracteres.
- Celdas de tabla: no aplica; ahí el problema es el truncado, no el largo.

Una descripción a 1440 px de ancho sin límite da líneas de 180 caracteres: el
ojo pierde el renglón al volver.

## Escaneo

La gente no lee una pantalla operativa: la barre. Lo que se puede hacer:

- Empezar cada línea con la palabra que la distingue ("Stock: 12", no "Hay 12
  unidades de stock").
- Alinear a la izquierda el inicio de cada bloque escaneable — un borde
  izquierdo irregular obliga a re-encontrar el punto de partida en cada línea.
- Agrupar por proximidad, no por borde (`spacing-layout.md`).
- Poner el dato antes que la etiqueta cuando el dato es lo que se busca
  (en un detalle de venta, el monto manda sobre la palabra "Total").

## Alineación

- **Texto: siempre a la izquierda.** Nunca justificado (los ríos de espacio
  destruyen el escaneo) y nunca centrado para más de dos líneas.
- Centrado: aceptable sólo en un empty state o en un mensaje corto de
  confirmación.
- **Números: a la derecha**, siempre que se comparen en columna.
- Encabezado de columna alineado igual que su contenido: un `<th>` "Total" a la
  izquierda sobre montos a la derecha rompe la lectura de la columna.

## Cifras tabulares

En una fuente proporcional, `1` es más angosto que `8`. Al apilar montos en una
columna, los dígitos no alinean y comparar de un vistazo se vuelve imposible.

```css
font-variant-numeric: tabular-nums;
```

**Obligatorio** en: montos, totales, subtotales, cantidades, stock, contadores,
porcentajes, cualquier número que se apile o que se actualice en vivo (un total
que cambia de ancho al re-renderizar "salta").

En este proyecto ya existen dos utilidades y se usan, no se reinventan:

- `.data` — Geist Mono + `tabular-nums`. Para SKU, códigos de barras,
  identificadores y cantidades.
- `.num` — la tipografía del cuerpo con `tabular-nums lining-nums` y tracking
  `-0.01em`. Para **dinero y conteos**.

Un monto sin `.num` en una columna es un hallazgo `MEDIUM`; en el total del POS,
`HIGH` (`pos-patterns.md`).

## Dinero

El formato lo produce **siempre** `formatMoney` de `src/lib/money.ts`, que emite
formato argentino: `"1200.50"` → `$ 1.200,50`. No se interpola un monto crudo en
la UI (`ai/context/frontend-conventions.md`).

Reglas de presentación:

- Alineado a la derecha en columna.
- `.num` sin excepción.
- El símbolo `$` no se escala aparte ni se sube en superíndice: es ruido y rompe
  la alineación.
- Los decimales **no** se ocultan ni se reducen de tamaño en un contexto
  operativo — `$ 1.200,50` y `$ 1.200,05` tienen que distinguirse sin esfuerzo.
- Un monto negativo (devolución, ajuste) se marca con signo **y** etiqueta, no
  sólo con color rojo (`color-system.md`).
- El total de una operación es el elemento tipográfico dominante de su región:
  al menos dos escalones por encima del cuerpo, weight 600–700.

## Legibilidad en tablas

- Cuerpo de celda: 14 px (`label`) en tabla densa, 16 px (`body`) en tabla
  normal. Por debajo de 13 px se pierde legibilidad a distancia de mostrador.
- Encabezado: 12–14 px, weight 500–600, `text-text-secondary`. Se distingue por
  **peso y color**, no por tamaño mayor — un `<th>` más grande que su contenido
  compite con el dato.
- Números a la derecha con `.num`; texto a la izquierda.
- Una sola familia por tabla: mezclar `.data` (mono) y proporcional en la misma
  columna descoloca la lectura vertical. Entre columnas está bien (SKU en mono,
  nombre en proporcional).
- El truncado va acompañado de `title` con el texto completo, o de un ancho
  mínimo que evite truncar la columna clave.

## Texto secundario

`text-text-secondary` es para **apoyo**, no para "texto menos importante que
igual hay que leer". Si el usuario necesita leerlo para completar la tarea, es
texto primario.

Reglas:

- Nunca por debajo de 12 px.
- Nunca sobre superficies pastel o `surface-2` sin medir contraste — ahí
  `#6b7280` cae por debajo de 4.5:1 (`color-system.md`).
- Un mensaje de error **no** es texto secundario: va en `text-text-primary` con
  la señalización de error alrededor.

## Marketing vs operativo

| | Marketing / landing | Operativo (POS, tablas, formularios) |
|---|---|---|
| Escala | Amplia: display 40–64 px | Comprimida: rara vez sobre 32 px |
| Contraste de tamaño | Alto y expresivo | Suficiente para jerarquía, nada más |
| Longitud de línea | 45–65 caracteres, controlada | No aplica en tablas |
| Peso | Puede usar 700–800 para impacto | 600 es el techo habitual |
| Densidad | Baja, mucho aire | Alta, información por pantalla |
| Números | Proporcionales están bien | **Tabulares obligatorio** |
| Objetivo | Persuadir en una lectura | Encontrar un dato en la lectura 500 |

Mini Moni **no tiene superficie de marketing**: no hay landing, no hay
onboarding. Toda la tipografía de este producto es operativa. Una propuesta que
traiga un `display` de 48 px a una pantalla de cajero está aplicando el perfil
equivocado.

## Checklist tipográfico para una revisión

- [ ] Como máximo tres niveles de énfasis por pantalla.
- [ ] Los escalones de tamaño se distinguen a simple vista.
- [ ] Ningún texto de lectura por debajo de 14 px; ningún texto por debajo de 12.
- [ ] Line-height 1.5 en cuerpo, 1.2–1.3 en títulos.
- [ ] Texto de lectura con ancho máximo de 45–75 caracteres.
- [ ] Todo texto alineado a la izquierda; nada justificado.
- [ ] Todos los montos con `.num` y `formatMoney`.
- [ ] Todos los códigos y SKU con `.data`.
- [ ] Números a la derecha en columna, con su `<th>` alineado igual.
- [ ] El total de la operación es el elemento dominante de su región.
- [ ] Ningún texto secundario sobre pastel sin contraste medido.
- [ ] No se agregó ninguna familia tipográfica.
