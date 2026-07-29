# Sistema de color

## Primitivos vs semánticos

- **Primitivo**: un color con su nombre físico — `#9c566c`, `rose-500`. Dice
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

Mapa contra los tokens reales de este proyecto (`globals.css`):

| Rol | Token del proyecto | Nota |
|---|---|---|
| `background` | `--color-background` `#f8edf1` | rosa muy claro, no blanco |
| `surface` | `--color-surface` `#ffffff` | |
| `surface-subtle` | `--color-surface-2` `#f0d9e3` | ojo con el texto encima |
| `surface-raised` | — | **no existe**; hoy se resuelve con `surface` + `shadow-soft-lg` |
| `text-primary` | `--color-text-primary` `#1f2937` | |
| `text-secondary` | `--color-text-secondary` `#6b7280` | |
| `text-disabled` | `--color-text-disabled` `#9ca3af` | |
| `border` | `--color-border` `#e8c5d5` | |
| `border-strong` | `--color-border-hover` `#dfb2c4` | nombrado por interacción, se usa como refuerzo |
| `primary` | `--color-primary` `#9c566c` | |
| `primary-hover` | `--color-primary-hover` `#85485c` | |
| `primary-active` | — | **no existe**; hoy `primary-hover` cubre ambos |
| `success` / `warning` / `danger` / `info` | `--color-success` `#22c55e`, `--color-warning` `#f59e0b`, `--color-error` `#ef4444`, `--color-info` `#0ea5e9` | el rol `danger` se llama `error` acá |
| `focus` | reutiliza `--color-primary` | en `:focus-visible` |

**Los huecos (`surface-raised`, `primary-active`) se señalan cuando un diseño
los necesita; no se agregan por completitud.** Agregar un token es extender el
design system: se justifica por al menos dos usos reales.

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

En `globals.css` viven como `--color-pastel-pink` (hoy `#dfb2c4`, ajustado a la
marca), `--color-pastel-peach`, `--color-pastel-yellow`, `--color-pastel-green`,
`--color-pastel-blue`.

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
exactamente lo que ya hizo el proyecto: `primary #9c566c` y `primary-hover
#85485c` son derivados oscurecidos de `secondary #c08497` para sostener texto
blanco en AA. Si se quisiera un CTA pastel, habría que oscurecer el pastel hasta
`L` ≈ 0.55 — momento en el que deja de ser pastel. La respuesta correcta es usar
el pastel como **acento alrededor** del CTA, no como su fondo.

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
