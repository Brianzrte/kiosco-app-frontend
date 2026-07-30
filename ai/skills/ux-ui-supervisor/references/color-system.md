# Sistema de color

## Primitivos vs semánticos

- **Primitivo**: un color con su nombre físico — `#7c3aed`, `violet-600`. Dice
  qué es, no para qué sirve.
- **Semántico**: un token con nombre de rol — `primary`, `danger`, `surface`,
  `border`. Dice para qué sirve, y por eso se puede cambiar el valor sin tocar
  ninguna pantalla.

**Los componentes consumen tokens semánticos, nunca primitivos ni hex.** Un hex
dentro de un componente es un hallazgo (`MEDIUM`; `HIGH` si además rompe
contraste), porque congela una decisión donde no se puede revisar.

En Tailwind v4 el bloque `@theme` de `src/app/globals.css` es la única capa
donde vive un valor crudo. Todo lo demás es `bg-primary`, `text-text-secondary`,
`border-border`, `bg-surface-2`.

## Roles mínimos de un sistema de color

Un sistema completo cubre estos roles. Se listan para poder detectar cuál falta
cuando un diseño necesita algo que el sistema no nombra:

```text
background        fondo de la aplicación
surface           fondo de un contenedor de contenido
surface-subtle    variante de menor énfasis (zebra, encabezado de tabla)
surface-raised    superficie por encima del plano (popover, dropdown)
text-primary      texto de lectura
text-secondary    texto de apoyo, etiquetas
text-disabled     texto inactivo
border            separación por defecto
border-strong     separación enfatizada o borde de input
primary           acción principal e identidad
primary-hover     primary en hover
primary-active    primary presionado
success           confirmación de una operación
warning           advertencia que no bloquea
danger            error y acción destructiva
info              información neutra
focus             indicador de foco
```

Mapa contra los tokens reales de este proyecto (`globals.css`). Palette:
violeta neutro-gris, no la rose/mauve anterior — si algo cita `#9c566c`,
`#85485c` o `#f8edf1`, está desactualizado:

| Rol | Token del proyecto | Nota |
|---|---|---|
| `background` | `--color-background` `#f8f8fb` | gris con lean violeta apenas perceptible, no blanco |
| `surface` | `--color-surface` `#ffffff` | |
| `surface-subtle` | `--color-surface-2` `#ece9f7` | fill de zebra/header de tabla |
| `surface-subtle` (variante intermedia) | `--color-surface-subtle` `#fcfbfd` | entre `background` y card blanca — barras de filtro, shells de dashboard |
| `surface-hover` | `--color-surface-hover` `#f3f1f9` | hover de fila, más suave que `surface-2` |
| `surface-raised` | `--color-surface-raised` `#ffffff` | superficie elevada (popover, panel flotante); se combina con `shadow-soft-lg`, no un shadow nuevo |
| `text-primary` | `--color-text-primary` `#211f2b` | |
| `text-secondary` | `--color-text-secondary` `#615e6e` | |
| `text-muted` | `--color-text-muted` `#736f85` | escalón entre secondary y disabled — metadatos, timestamps aún legibles |
| `text-disabled` | `--color-text-disabled` `#a6a2b3` | |
| `text-inverse` | `--color-text-inverse` `#ffffff` | texto sobre fondo `primary`/oscuro |
| `border` | `--color-border` `#dcd9e6` | |
| `border-hover` | `--color-border-hover` `#c9c5db` | |
| `border-strong` | `--color-border-strong` `#b3aec9` | divisor con más peso estructural: header de tabla, separador de sidebar |
| `primary` | `--color-primary` `#7c3aed` | |
| `primary-hover` | `--color-primary-hover` `#6d28d9` | |
| `primary-active` | `--color-primary-active` `#5b21b6` | presionado, un escalón más oscuro que hover |
| `primary-light` | `--color-primary-light` `#ede9fe` | dobla como "primary-subtle": fondo de pill seleccionado, tinte de badge |
| `success` / `warning` / `danger` / `info` | `--color-success` `#22c55e`, `--color-warning` `#f59e0b`, `--color-error` `#ef4444`, `--color-info` `#0ea5e9` | el rol `danger` se llama `error` acá; tintes "subtle" no son tokens nuevos, se hacen con el modificador de opacidad de Tailwind (`bg-success/15`, `border-success/40`) |
| `focus` | reutiliza `--color-primary` | en `:focus-visible` |

**Paleta de pago** (dedicada, no reutiliza `primary` ni los pasteles
decorativos): `--color-payment-cash #c3ddc2`, `--color-payment-card #e5d2b0`,
`--color-payment-transfer #b5dbee`, `--color-confirm-sale #34653c`. Tonos
mudos/desaturados a propósito, exclusivos de los chips de método de pago y del
botón de confirmar venta en `PosView` — no confundir con `--color-success`
(sigue usándose sin cambios en `Toast`, `Badge`, deltas de `InventoryView`) ni
con `--color-pastel-green`/`--color-pastel-yellow` (categorías, sin cambios).

Los huecos anteriores (`surface-raised`, `primary-active`) ya se llenaron: no
quedan roles mínimos sin token hoy. Si aparece uno nuevo, se señala cuando un
diseño lo necesita y se justifica por al menos dos usos reales antes de
agregarlo — no se agrega por completitud.

## Contraste WCAG

Umbrales y método de medición: `accessibility.md`. Reglas específicas de color:

- Un color de estado se valida contra la superficie **donde se va a usar**, no
  contra blanco genérico.
- `#22c55e` (success) sobre blanco da ≈ 2.3:1 → **no sirve como texto**. Sirve
  como fondo de badge con texto oscuro, o como icono/borde acompañado de texto.
  Lo mismo aplica a `warning #f59e0b` (≈ 2.1:1). Este es el error de contraste
  más común con paletas de estado: usarlas como color de texto.
- `#ef4444` (error) sobre blanco da ≈ 3.8:1 → sirve para texto grande y para
  bordes/iconos, **no** para texto de 14 px. Un mensaje de error se escribe en
  `text-text-primary` y se señaliza con el rojo en el borde y el icono.

## Uso correcto de los colores de estado

| Token | Significa | Ejemplo válido | Uso incorrecto |
|---|---|---|---|
| `success` | Una operación terminó bien | toast "Venta confirmada" | pintar de verde un producto "activo" (eso es un estado, no un evento) |
| `warning` | Algo requiere atención pero no bloquea | badge "Stock bajo" | validación de formulario |
| `error` | Falló algo, o la acción es destructiva | `ErrorState`, botón "Eliminar" | resaltar un número negativo que es normal |
| `info` | Contexto neutro | banner "Datos hasta ayer" | énfasis genérico |

`success` **sólo** confirma una operación exitosa; `error` **sólo**
borrar/cancelar/errores (`ui-system.md`). Un estado permanente de una entidad
("activo", "inactivo") se comunica con `Badge` neutro + texto, no con verde/rojo.

## No usar el color como único indicador

Ver `accessibility.md` §1.4.1. En términos de color:

- Un badge lleva **texto**, no sólo un punto de color.
- Una fila resaltada lleva además un icono, un borde izquierdo o una etiqueta.
- Una serie de gráfico lleva etiqueta directa o leyenda con forma/patrón, no
  sólo color.
- Un campo con error lleva texto de error, no sólo borde rojo.

Prueba: filtro de escala de grises en DevTools. Si algo deja de entenderse, es
un hallazgo `HIGH`.

## Construir una escala con OKLCH

Cuando haya que derivar una rampa (una familia de tonos de un mismo color), el
espacio correcto es **OKLCH**, no HSL. En HSL dos colores con la misma `L`
tienen brillo percibido muy distinto; en OKLCH la `L` es perceptualmente
uniforme, así que dos tokens con la misma `L` contrastan igual contra el mismo
fondo.

Método:

1. Convertir el color base a `oklch(L C H)`.
2. Fijar `H`. Variar `L` en pasos parejos (p. ej. 0.98, 0.94, 0.88, 0.80, 0.70,
   0.60, 0.50, 0.42, 0.34) para los escalones de la rampa.
3. Reducir `C` en los extremos: a `L` muy alta o muy baja, un croma alto se sale
   del gamut y el navegador lo recorta de forma impredecible.
4. **Validar el contraste de cada escalón contra las superficies reales.** OKLCH
   uniformiza la percepción de claridad, no garantiza WCAG — que se calcula
   sobre luminancia relativa sRGB.

Tailwind v4 acepta `oklch()` directamente en `@theme`. Los tokens actuales están
en hex; **no** se convierten sin motivo: convertir por convertir es un cambio
visual sin beneficio (constitución §22).

## Light y dark mode

Hoy el proyecto es **tema claro únicamente** (`ui-system.md`). Estas reglas son
para no cerrarse la puerta, no trabajo pendiente:

- El dark mode no es invertir. Se rediseña la escala: fondos entre `L` 0.15–0.25,
  texto entre 0.90–0.98, y el croma **baja** (un color saturado sobre fondo
  oscuro vibra).
- La elevación en dark no se hace con sombra (no se ve): se hace con superficies
  progresivamente más claras.
- Los colores de estado se re-derivan: `#ef4444` sobre `#1a1a1a` da ≈ 4.6:1 y
  funciona, pero `#22c55e` necesita otro tono para el mismo rol.
- Si un día se agrega, la única capa que cambia es `@theme` + un bloque
  `@media (prefers-color-scheme: dark)`. Si hay un solo hex en un componente,
  esa promesa se rompe — que es exactamente por qué la regla de "sin hex en
  componentes" importa.

## Estados interactivos

| Estado | Regla | En este repo |
|---|---|---|
| `hover` | Cambio perceptible pero no dramático: un escalón de la rampa | `bg-primary-hover` |
| `active` | Más oscuro (o más claro en dark) que hover, + feedback inmediato | hoy reusa `primary-hover` |
| `focus` | **Outline, no cambio de fondo.** El fondo puede confundirse con hover | `:focus-visible` global, no se quita |
| `disabled` | Baja el contraste, pero el texto sigue siendo identificable. No se anuncia con opacidad sobre todo el bloque si eso arrastra el texto por debajo de legibilidad | `text-text-disabled` |
| `selected` | Distinto de hover **y** de focus: los tres pueden coexistir en la misma fila | `bg-primary-light` o `bg-surface-2` + marca |

Los tres —hover, focus, selected— tienen que ser **visualmente distinguibles
entre sí**. Una fila de tabla seleccionada, con el mouse encima y con foco de
teclado es un caso real, no teórico.

## La paleta pastel del proyecto

```text
#FFB3BA   rosa
#FFDFBA   durazno
#FFFFBA   amarillo
#BAFFC9   verde
#BAE1FF   azul
```

En `globals.css` viven como `--color-pastel-pink` (`#dfb2c4`), `--color-pastel-peach`,
`--color-pastel-yellow`, `--color-pastel-green`, `--color-pastel-blue` —
**sin cambios por el color-refactor de marca**: son un sistema categórico
separado del acento violeta, no un tinte de `--color-primary`.

Todos tienen luminancia muy alta (`L` ≈ 0.90–0.96 en OKLCH). De ahí salen todas
las reglas:

**Puede:**

- Funcionar como fondo suave de una superficie secundaria.
- Codificar **categorías** de forma decorativa — `pastelFor(id)` da un pastel
  estable por id de entidad.
- Ser fondo de un `Badge` **con texto oscuro**.
- Ser fondo de una card de agrupación.

**No debe:**

- Llevar **texto blanco encima**. `#FFFFBA` con blanco da ≈ 1.05:1: ilegible.
  Con `text-text-primary` (`#1f2937`) da ≈ 15:1 y funciona en todos.
- Reemplazar `success`, `warning` o `error`. Un pastel verde no comunica éxito:
  comunica "categoría 4".
- Ser el fondo de un botón primario. No hay contraste posible que sostenga un
  CTA sobre un pastel de esa luminancia.
- Codificar un dato en un gráfico. La paleta de datos es `chart-1..4`, validada
  para contraste y para deficiencia de visión de color, en orden fijo y sin
  ciclar (`ui-system.md`).

**El CTA principal necesita una variante con contraste suficiente.** Es
exactamente lo que ya hace el proyecto: `primary #7c3aed`, `primary-hover
#6d28d9` y `primary-active #5b21b6` son una rampa violeta que se oscurece en
cada paso de interacción — no un tinte derivado de otro hue — así el CTA
sostiene texto blanco en AA en sus tres estados. Si se quisiera un CTA pastel,
habría que oscurecer el pastel hasta `L` ≈ 0.55 — momento en el que deja de ser
pastel. La respuesta correcta es usar el pastel como **acento alrededor** del
CTA, no como su fondo.

**Ninguna adopción de esta paleta reemplaza los tokens actuales.** Este skill no
cambia la paleta del proyecto por su cuenta: si una pantalla necesita un color
que no existe, lo reporta como hueco del design system y propone el token, con
al menos dos usos reales que lo justifiquen.

## Checklist de color para una revisión

- [ ] Ningún hex literal en `src/components/` ni en `src/app/**/page.tsx`.
- [ ] Todo color de texto sale de la familia `text-*`.
- [ ] Contraste de texto medido ≥ 4.5:1 (≥ 3:1 si es texto grande).
- [ ] Texto secundario sobre `surface-2` o pasteles: medido explícitamente.
- [ ] Ningún pastel lleva texto blanco.
- [ ] `success`/`warning`/`error` usados por su significado, no por su tono.
- [ ] Ningún estado se comunica sólo por color (probado en escala de grises).
- [ ] `hover`, `focus` y `selected` son distinguibles entre sí.
- [ ] Serie única de gráfico en `primary`; 2+ categorías en `chart-1..4` en orden
      fijo.
- [ ] Ningún pastel codifica un dato en un gráfico.
