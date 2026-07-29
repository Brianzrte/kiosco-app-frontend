# Ejemplo — Auditoría de una pantalla de venta (POS)

> **Este es un ejemplo didáctico, no una auditoría del código actual.** Describe
> una versión hipotética de una pantalla de venta con defectos deliberados, para
> mostrar el formato completo, el modelo de severidad y el nivel de detalle
> esperado. Los `archivo:línea` son ilustrativos. No debe citarse como evidencia
> sobre `src/components/pos/PosView.tsx`.

---

# UX/UI Review

## Context
- Screen: `/pos` — `src/components/pos/PosView.tsx`
- Product type: POS / kiosco. Perfil aplicado: `operational-pos`
- Primary user: cajero (rol `cashier`), entrenado, ~300 ventas por turno
- Main task: escanear productos, cobrar y empezar la siguiente venta
- Main input method: lector de código de barras + teclado
- Evidence reviewed: `PosView.tsx` completo; recorrido manual con teclado en
  1280 × 720 y 1024 × 768; contraste medido en 5 pares; emulación de reduced
  motion. **No revisado:** lector de pantalla, 1366 × 768, confirmación real
  contra backend (no disponible en el entorno).

## Result
- Score: **48/95** — *Performance y motion* no evaluada
- Status: **FAIL**
- Confidence: media (código + prueba manual; sin backend ni lector)

| Categoría | Peso | Puntaje | Por qué |
|---|---:|---:|---|
| Eficiencia de la tarea | 25 | 5 | El foco se pierde en cada escaneo y no hay navegación con flechas: el flujo obliga a usar el mouse |
| Accesibilidad | 20 | 10 | Foco no restaurado, total sin `aria-live`, y el medio de pago se distingue sólo por color |
| Jerarquía y claridad | 15 | 5 | La acción de cobro no se distingue de las secundarias y el total no domina su región |
| Consistencia | 15 | 10 | Usa los primitives, pero el monto se interpola crudo en dos lugares |
| Feedback y prevención de errores | 10 | 3 | La cantidad supera el stock y la anulación no actualiza el total |
| Responsive | 5 | 0 | En 1024 × 768 el total queda fuera de la vista |
| Performance y motion | 5 | — | **Not evaluated** — no se midió con throttling |
| Pulido visual | 5 | 4 | Espaciado y tokens correctos salvo el detalle del contraste del hint |

## Executive summary

La pantalla resuelve bien la estructura de datos —el carrito es legible, el
cálculo del total es correcto y vive en `lib/`— pero **falla en las tres cosas
que definen un POS**: el flujo no se puede completar sin mouse, el total no está
garantizado en pantalla, y hay dos caminos que llevan a cobrar un importe
incorrecto (cantidad por encima del stock, y anulación que no recalcula).

Prioridad de corrección: POS-01 y POS-02 (`BLOCKER`) antes que cualquier otra
cosa; después POS-03 y POS-04, que son los que cuestan segundos por venta.

## Blockers

- **POS-01** — El foco se pierde después de agregar un producto.
- **POS-02** — Anular una línea no actualiza el total.

## Findings

| ID | Severity | Area | Location | Problem | Impact | Recommendation | Validation |
|---|---|---|---|---|---|---|---|
| POS-01 | BLOCKER | teclado | `PosView.tsx:118` | El foco cae en `<body>` tras agregar al carrito | El siguiente escaneo se pierde o se escribe fuera del campo | Devolver el foco al campo con `requestAnimationFrame` | Escanear 5 productos seguidos sin tocar el mouse: los 5 entran |
| POS-02 | BLOCKER | estados | `PosView.tsx:241` | Anular una línea no recalcula el total | El cajero cobra un importe incorrecto | Derivar el total del carrito, no de un estado paralelo | Agregar 3 líneas, anular 1: el total baja en el mismo render |
| POS-03 | HIGH | responsive | layout de la región derecha | En 1024 × 768 el total queda debajo del fold | El cajero scrollea para leer lo que va a cobrar | Región derecha fija, sin scroll | Verificar en 1024 × 768 sin scrollear |
| POS-04 | HIGH | teclado | `PosView.tsx:363` | La lista de resultados no se navega con flechas | Obliga a soltar el lector y usar el mouse | Implementar el patrón combobox de la APG | Buscar, elegir el 3.º resultado y agregarlo sin mouse |
| POS-05 | HIGH | feedback | `PosView.tsx:198` | La cantidad puede superar el stock disponible | El backend rechaza al confirmar, con el cliente esperando | Topar contra el stock y explicar cuánto hay | Intentar 10 unidades de un producto con 3: se topa en 3 con mensaje |
| POS-06 | MEDIUM | jerarquía | `PosView.tsx:512` | "Confirmar venta" tiene el mismo peso que "Cancelar" | Duda ante la acción principal, cientos de veces por turno | Única `variant="primary"`, ≥ 48 px | Tapando el texto se puede señalar la acción esperada |
| POS-07 | MEDIUM | consistencia | `PosView.tsx:487` | El total se interpola crudo, sin `formatMoney` ni `.num` | Formato inconsistente y salto de ancho en cada escaneo | `formatMoney` + clase `.num` | El total muestra `$ 1.200,50` y no cambia de ancho al actualizarse |
| POS-08 | MEDIUM | accesibilidad | región del total | El total no se anuncia al cambiar | Un cajero con lector no sabe cuánto cobrar | `aria-live="polite"` en el contenedor del total | El lector anuncia el nuevo total tras cada escaneo |
| POS-09 | LOW | accesibilidad | `PosView.tsx:96` | El hint del campo da 3.9:1 sobre `surface-2` | Cuesta leer el formato esperado | `text-text-primary`, o mover el hint sobre `surface` | Medido ≥ 4.5:1 en DevTools |
| POS-10 | SUGGESTION | eficiencia | región de cobro | No hay atajo para cobrar | Obliga a tabular hasta el botón en cada venta | `F2` visible junto al botón | `F2` confirma; el atajo se ve en pantalla |

### POS-01 — El foco se pierde después de agregar un producto

- **Severidad:** BLOCKER
- **Área:** teclado
- **Ubicación:** `PosView.tsx:118`, tras `setCart(...)`
- **Problema:** al agregar una línea, el campo de escaneo se re-renderiza y el
  foco cae en `<body>`. No hay `focus()` posterior al render.
- **Evidencia:** recorrido manual en 1280 × 720. Después del primer escaneo,
  `Tab` lleva al primer control de la página, lo que confirma que el foco quedó
  en `<body>`. El código no llama a `focus()` después de la mutación.
- **Impacto:** el lector es un teclado: si el foco no está en el campo, el
  segundo escaneo se pierde o se escribe en otro control. Es el paso más
  repetido del producto — ocurre en cada ítem de cada venta.
- **Recomendación:** después de agregar, limpiar el campo y devolver el foco
  dentro de un `requestAnimationFrame`, para que se aplique después del
  re-render. Mismo tratamiento tras un escaneo fallido.
- **Criterio de validación:** escanear 5 productos seguidos sin tocar el mouse;
  los 5 entran al carrito y el campo queda vacío y enfocado después de cada uno.

### POS-02 — Anular una línea no actualiza el total

- **Severidad:** BLOCKER
- **Área:** estados
- **Ubicación:** `PosView.tsx:241`
- **Problema:** el total se guarda en un `useState` propio que se actualiza al
  agregar pero no al anular. Queda desincronizado del carrito.
- **Evidencia:** agregar 3 líneas ($ 600 + $ 450 + $ 300 = $ 1.350), anular la
  segunda. El carrito muestra 2 líneas; el total sigue en $ 1.350.
- **Impacto:** el cajero cobra $ 450 de más. Es pérdida de dinero para el
  cliente y un error de caja que aparece recién al cierre.
- **Recomendación:** el total no es estado: es una **derivación** del carrito.
  Calcularlo con `toCents`/`fromCents` en `lib/`, con su test, y renderizarlo
  desde ahí. Elimina la clase entera de bugs de sincronización.
- **Criterio de validación:** test en `lib/` que cubra agregar, incrementar,
  editar cantidad y anular. Manualmente: anular una línea baja el total en el
  mismo render.

### POS-05 — La cantidad puede superar el stock disponible

- **Severidad:** HIGH
- **Área:** feedback / prevención de errores
- **Ubicación:** `PosView.tsx:198`
- **Problema:** el input de cantidad acepta cualquier número. El límite sólo lo
  aplica el backend al confirmar.
- **Evidencia:** con un producto de 3 unidades en stock se pueden cargar 10. El
  error aparece recién al confirmar.
- **Impacto:** el cajero descubre el problema con el cliente esperando y la
  venta ya armada. Prevenir cuesta un tope; corregir cuesta una interacción con
  el cliente.
- **Recomendación:** topar la cantidad contra el stock disponible y explicar el
  tope: «Sólo hay 3 unidades disponibles de "Alfajor Jorgito"». **El stock
  desconocido no debe bloquear el escaneo** — el backend sigue siendo la
  autoridad y rechaza el sobre-venta al confirmar.
- **Criterio de validación:** con un producto de 3 unidades, escribir 10 topa en
  3 y muestra el mensaje con el nombre y la cantidad. Con stock desconocido, el
  escaneo entra igual.

### POS-06 — La acción principal no se distingue

- **Severidad:** MEDIUM
- **Área:** jerarquía
- **Ubicación:** `PosView.tsx:512`
- **Problema:** "Confirmar venta" y "Cancelar" usan el mismo tamaño y una
  variante visualmente similar. No hay una única acción primaria en la región.
- **Evidencia:** screenshot con el texto de los botones tapado — no se puede
  señalar cuál es la acción esperada.
- **Impacto:** medio segundo de duda por venta. A 300 ventas por turno, ~2,5
  minutos por turno de fricción evitable, más el riesgo de cancelar por error.
- **Principio:** una acción primaria por región + ley de Fitts
  (`../references/design-principles.md` §2, §4).
- **Recomendación:** "Confirmar venta" como única `variant="primary"`, ≥ 48 px de
  alto y ancho completo de su región. "Cancelar" a `ghost` y separado.
- **Criterio de validación:** en un screenshot con el texto tapado se puede
  señalar la acción esperada. El botón mide ≥ 48 px.

## Visual hierarchy

El carrito está bien jerarquizado: nombre a la izquierda, cantidad y subtotal a
la derecha, encabezado diferenciado por peso. La región de cobro es la que
falla: el total no domina (POS-07 lo agrava, porque sin `.num` además salta) y
la acción de cobro compite con la de cancelar (POS-06).

## Interaction and feedback

El resaltado de línea al escanear (`.flash`) es el acierto más importante de la
pantalla: confirma el escaneo sin ocupar espacio ni robar atención. Lo que falta
es feedback en el otro extremo del flujo — el total no acusa recibo del cambio y
no se anuncia (POS-08).

## Accessibility

Verificado manualmente: recorrido con teclado en 1280 × 720 y 1024 × 768;
contraste medido en 5 pares (1 falla, POS-09); escala de grises (el medio de
pago se distingue sólo por color, incluido en POS-08); reduced motion emulado
(`.flash` sobrevive correctamente, que es lo deseado).

**Not evaluated:** lector de pantalla, zoom 200 %.

## Responsive behavior

Verificado en 1280 × 720 (OK) y 1024 × 768 (falla, POS-03).
**Not evaluated:** 1366 × 768, 360 × 800, 1920 × 1080.

En 1024 × 768 la región derecha entra en el flujo de scroll de la página y el
total queda debajo del fold. Es el viewport más probable de una notebook de
mostrador.

## Keyboard navigation

```text
1. Carga → foco en campo de escaneo. OK.
2. Escaneo → línea agregada, foco cae en <body>. POS-01.
3. Tab hasta búsqueda manual → Enter → abre. OK.
4. ArrowDown → no pasa nada. POS-04.
5. Escape → cierra, foco vuelve al escaneo. OK.
6. Anular línea con Enter → total no cambia. POS-02.
```

El flujo completo **no** se puede hacer sin mouse. En el perfil
`operational-pos` eso es `BLOCKER` por definición.

## States

Loading, error y vacío del carrito están resueltos. El manejo de estado
desconocido tras una confirmación ambigua está presente y es correcto — ver
*Positive findings*. Falta el estado de tope de stock (POS-05).

## Performance and motion

**Not evaluated.** No se midió con throttling de CPU ni se revisó Network. Se
observa que las animaciones usan sólo `background-color` y `color`, dentro de
las duraciones de `lib/motion.ts`, lo que es correcto — pero no alcanza para
puntuar la categoría.

## Positive findings

- **El manejo del estado desconocido tras una confirmación ambigua es
  correcto.** No asume éxito, no limpia el carrito y no ofrece un reintento que
  pueda duplicar la venta. Es el patrón difícil de este dominio y está bien
  resuelto: preservarlo en cualquier rediseño.
- **`.flash` sobrevive a `prefers-reduced-motion` a propósito**, y el comentario
  del código explica por qué (es color, no movimiento, y es la señal del
  escaneo). Reducir movimiento sin perder información es exactamente el criterio
  correcto.
- **Un escaneo repetido incrementa la cantidad en vez de agregar una línea
  nueva.** Mantiene el carrito revisable.
- **El stock desconocido no bloquea el escaneo**, con el motivo documentado en
  el código. Es la decisión correcta: no frenar una venta por un dato auxiliar.
- Los primitives del UI kit se usan consistentemente; no hay estilo ad-hoc ni
  hex sueltos salvo lo señalado.

## Acceptance criteria

- [ ] Escanear 5 productos seguidos sin mouse: los 5 entran; el campo queda
      vacío y enfocado después de cada uno.
- [ ] Anular una línea baja el total en el mismo render.
- [ ] El cálculo del total vive en `lib/` con test que cubre agregar,
      incrementar, editar y anular.
- [ ] El total y el botón de cobro están visibles sin scrollear en 1024 × 768.
- [ ] La búsqueda manual se navega con ArrowDown/ArrowUp y se confirma con Enter.
- [ ] Escape cierra la búsqueda y devuelve el foco al campo de escaneo.
- [ ] Con un producto de 3 unidades, escribir 10 topa en 3 y muestra el mensaje
      con el nombre del producto.
- [ ] Con stock desconocido, el escaneo entra igual.
- [ ] Tapando el texto de los botones se puede señalar la acción de cobro; mide
      ≥ 48 px.
- [ ] El total usa `formatMoney` + `.num` y no cambia de ancho al actualizarse.
- [ ] El total lleva `aria-live="polite"`.
- [ ] El hint del campo de escaneo mide ≥ 4.5:1 de contraste.
- [ ] El flujo completo —escanear, ajustar, cobrar, confirmar— se hace sin mouse.

## Deferred suggestions

- **POS-10 (atajo `F2` para cobrar).** Es una mejora real de velocidad, pero
  agrega un contrato de teclado que conviene decidir junto con el resto de los
  atajos del POS, no de a uno. Corresponde a un change propio.
- Mostrar el vuelto calculado al cobrar en efectivo. Depende de si se captura el
  importe recibido, que es una decisión de producto.
- Impresión de comprobante desde la confirmación. Depende del backend.
