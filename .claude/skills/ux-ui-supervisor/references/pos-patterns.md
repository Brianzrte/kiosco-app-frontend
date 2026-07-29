# Patrones de POS

## Perfil `operational-pos`

Este es el perfil de producto que **gana** sobre cualquier otro en toda pantalla
que un cajero use durante una venta. Cuando entra en conflicto con una
recomendación estética general, se aplica el perfil.

```text
Prioridad principal:    velocidad y prevención de errores.
Usuarios:               cajeros y administradores.
Entradas:               teclado, lector de código de barras y mouse.
Densidad:               normal o compacta.
Target interactivo:     44–48 px para acciones frecuentes.
Motion:                 mínimo, rápido y funcional.
Tipografía:             altamente legible.
Números:                tabulares y correctamente alineados.
Totales:                visibles y actualizados inmediatamente.
Paleta pastel:          superficies secundarias, no texto blanco.
Acciones destructivas:  confirmación proporcional al riesgo.
Flujo principal:        realizable sin mouse cuando sea posible.
```

### De dónde salen estas prioridades

El cajero **no mira la pantalla**: mira al cliente, al producto y al lector. La
pantalla se consulta de reojo, a ~60 cm, con luz variable y a veces con reflejo.
La misma secuencia se repite 100–500 veces por turno.

Consecuencias que hay que aceptar antes de recomendar nada:

- Un segundo de más por venta son ~8 minutos por turno de 500 ventas.
- Un error de cobro tiene costo real en dinero y en confianza del cliente.
- Un flujo que obliga a soltar el lector para agarrar el mouse rompe el ritmo.
- La expresividad visual no aporta nada acá: el cajero no está evaluando el
  producto, lo está usando.

## El lector de código de barras

Un lector es, para la aplicación, **un teclado que escribe muy rápido y termina
con Enter**. De ahí salen todos los requisitos:

- **El foco tiene que estar siempre en el campo de escaneo**, salvo que el
  usuario lo haya movido a propósito. Si el foco está en otro lado, el escaneo
  se escribe donde no debe o se pierde.
- El campo procesa el Enter final como "confirmar el código".
- Después de cada escaneo, el foco **vuelve** al campo de escaneo y el campo se
  limpia. Sin eso, el segundo escaneo se concatena al primero.
- El retorno del foco tiene que aplicarse después del re-render. El patrón que
  usa este repo:

  ```ts
  requestAnimationFrame(() => scanRef.current?.focus());
  ```

- El campo de escaneo no puede tener autocompletado del navegador ni
  sugerencias: interceptan el Enter.
- Un escaneo mientras hay una petición en vuelo no puede duplicar la línea.

**Foco perdido después de agregar un producto es `BLOCKER`.** No es un detalle
de accesibilidad: rompe el flujo principal del producto.

## Búsqueda manual

No todo producto tiene código legible: envases rotos, granel, productos sin
etiqueta. La búsqueda manual es un camino de primera clase, no un fallback.

- Accesible **con teclado**, sin tocar el mouse. Un atajo visible o un `Tab`
  desde el campo de escaneo.
- Resultados navegables con `ArrowDown`/`ArrowUp`, selección con `Enter`, cierre
  con `Escape` (`navigation-keyboard.md`).
- Al cerrar, el foco vuelve al campo de escaneo.
- Los resultados muestran lo necesario para desambiguar: nombre, presentación,
  precio y stock. Dos productos con nombre parecido y precio distinto son un
  error de cobro esperando.
- El conteo de resultados se anuncia (`aria-live="polite"`).
- Sin resultados: mensaje que dice qué se buscó, no un vacío mudo.

## El carrito

- **Cada línea muestra**: nombre, cantidad, precio unitario y subtotal.
- La línea recién agregada o incrementada se resalta. En este repo lo hace
  `.flash`, que es **color, no movimiento**, y por eso sobrevive a
  `prefers-reduced-motion` — es la señal con la que el cajero confirma que el
  escaneo entró.
- Un escaneo repetido del mismo producto **incrementa la cantidad**, no agrega
  una línea nueva. Diez unidades del mismo alfajor en diez líneas hacen
  imposible revisar el carrito.
- La línea afectada tiene que ser visible: si el carrito scrollea, la línea
  resaltada scrollea a la vista.
- El orden es estable. Una línea que se reordena al incrementarse hace perder la
  referencia visual.

### Cantidades

- Editables directamente, sin abrir un diálogo.
- Con `inputmode="numeric"`.
- **Topadas contra el stock disponible.** Cuando se alcanza el tope, el mensaje
  dice cuánto hay: «Sólo hay 3 unidades disponibles de "Alfajor Jorgito"», no
  "Cantidad inválida" (`forms-validation.md`).
- Stock desconocido **no bloquea el escaneo**: el backend sigue siendo la
  autoridad y rechaza el sobre-venta al confirmar. Este es el criterio que ya
  aplica el POS de este repo, y es el correcto: no frenar una venta por un dato
  auxiliar que no se pudo leer.
- Cambiar una cantidad actualiza el total **de inmediato**.

### Anulación de una línea

- Un solo gesto, alcanzable con teclado.
- Actualiza el total en el mismo render. **Una anulación que no actualiza el
  total es `BLOCKER`**: el cajero cobra un importe que no corresponde.
- El foco pasa a la línea siguiente, o a la anterior si era la última, o al campo
  de escaneo si el carrito quedó vacío.
- Anular una línea de una venta en curso es de bajo riesgo y reversible
  re-escaneando: **no lleva diálogo de confirmación**. Vaciar el carrito
  completo, sí.

## El total

Es el dato más importante de la pantalla. Requisitos, todos obligatorios:

- **Siempre visible sin scrollear.** En 1024 × 768 también, que es el viewport
  que rompe este requisito.
- El elemento tipográfico **dominante** de su región: al menos dos escalones por
  encima del cuerpo, weight 600–700.
- **Cifras tabulares** (`.num`). Sin ellas el total cambia de ancho al
  actualizarse y "salta" en cada escaneo (`performance-ux.md`).
- Formato por `formatMoney`: `$ 1.200,50`.
- Actualizado **inmediatamente** ante cualquier cambio del carrito: agregar,
  incrementar, editar cantidad, anular.
- El cambio se acusa con una señal breve. `.total-flash` de este repo es un pulso
  de color de 120 ms — **no** un contador que sube número por número, que
  retrasa la lectura del valor real.
- `aria-live="polite"` para que un lector anuncie el nuevo total.
- Los decimales no se ocultan ni se achican: `$ 1.200,50` y `$ 1.200,05` tienen
  que distinguirse sin esfuerzo.

Junto al total conviene el **conteo de ítems** ("12 productos"): es la
verificación rápida contra lo que hay en el mostrador.

## Cobro

- **Botón de cobro grande, siempre visible, con la acción nombrada**: "Confirmar
  venta". 48 px de alto como mínimo.
- Es la única acción `primary` de su región (`design-principles.md`).
- Deshabilitado con el carrito vacío, **y explicando por qué**: "Agregá al menos
  un producto".
- Alcanzable por teclado, y con un atajo visible si existe (`F2 · Cobrar`).

### Medio de pago

- Las opciones frecuentes visibles de una, sin desplegar un menú: efectivo,
  tarjeta.
- Seleccionables con teclado; la selección se ve sin depender del color
  (`color-system.md`).
- Un pago dividido muestra en todo momento **cuánto falta asignar**, no sólo si
  el total cierra. `lib/paymentComposition.ts` de este repo es donde vive esa
  matemática — y ese es el lugar correcto: es lógica pura, testeable, fuera de la
  view.
- En efectivo, si se pide el importe recibido, el vuelto se calcula y se muestra
  con el mismo peso que el total.

### Confirmación y bloqueo

- **`pendingImmediate`**: la confirmación de venta muestra el spinner **sin**
  esperar los 400 ms de `MOTION.spinnerDelay`. El cajero necesita saber al
  instante que el clic entró; si no, hace clic otra vez.
- **Prevención de doble confirmación**, en capas (`forms-validation.md`):
  1. el botón se deshabilita al empezar;
  2. el handler retorna temprano si ya hay una operación en vuelo — cubre el
     Enter repetido, que no pasa por el clic;
  3. el diálogo se vuelve `dismissible={false}` mientras la acción está
     pendiente.
- **Nunca optimista.** Una venta se confirma cuando el backend responde. El
  dinero no se actualiza de forma optimista (`states-feedback.md`).
- El bloqueo termina siempre: éxito, error o timeout. Un estado pendiente
  permanente es `BLOCKER`.

## Después de la venta

- **Confirmación inequívoca**: número de venta y total cobrado. `.pop-in` es la
  entrada de esa confirmación, degradada a fade con reduced motion.
- Se muestra el tiempo suficiente para leerla, y **no bloquea** el inicio de la
  siguiente venta.
- El carrito se limpia. Es el único caso en que limpiar es correcto: es el
  resultado deseado de un éxito (`forms-validation.md`).
- **El foco vuelve al campo de escaneo.** La siguiente venta empieza escaneando,
  sin tocar nada.
- Debe quedar accesible el detalle de la venta recién hecha, por si hay que
  revisarla o imprimirla.

## Recuperación de errores sin perder la venta

**Regla dura: ningún error borra el carrito.**

| Error | Qué pasa |
|---|---|
| Código no encontrado | Mensaje con el código buscado + volver el foco al escaneo. El carrito intacto |
| Producto inactivo | Mensaje nombrando el producto y qué hacer. El carrito intacto |
| Fallo de red al confirmar | El carrito intacto, con la acción de reintentar |
| `403` / sesión expirada | El carrito intacto; al reautenticar se puede confirmar |
| Stock insuficiente al confirmar | Mensaje que dice **qué producto** y cuánto hay. El carrito intacto |
| Respuesta ambigua | **No** asumir éxito. Ver abajo |

Perder un carrito de 15 productos por un error de red obliga a rehacer todo con
el cliente esperando. Es `BLOCKER`.

### Estado desconocido

Si la confirmación no devuelve una respuesta clara (timeout, error de red
después de enviar), la venta puede haberse registrado o no. La UI **no puede
asumir ninguna de las dos**:

- Se dice explícitamente que el estado es desconocido.
- Se indica cómo verificarlo (revisar el listado de ventas).
- **No** se ofrece un "reintentar" que pueda duplicar la venta sin verificar
  primero.
- No se limpia el carrito.

El POS de este repo tiene un `unknownState` justamente para esto. Es el patrón
correcto y hay que preservarlo en cualquier rediseño.

## Visibilidad del estado de la operación

En todo momento tiene que poder responderse, de un vistazo:

- ¿Cuántos productos hay en el carrito?
- ¿Cuánto es el total?
- ¿La venta está en curso, confirmada o falló?
- ¿Hay algo esperando respuesta del servidor?
- ¿Dónde está el foco?

Si alguna de estas no se responde sin scrollear ni hacer clic, es un hallazgo.

## Motion en el POS: mecanismo por caso

El árbol de decisión de `motion.md` aplica igual acá, pero en `operational-pos`
la mitad inferior de cada rango de duración es la que corresponde por defecto
(`motion.md`, *Duraciones de referencia*), y **el carrito nunca usa AutoAnimate
para reordenar**: el orden tiene que quedarse estable (arriba, *El carrito*), y
una librería que anima reordenamientos automáticos está resolviendo un
problema que acá no debe existir.

| Caso | Mecanismo | Ya implementado como |
|---|---|---|
| Producto agregado (línea nueva) | CSS | `.flash`, color, 200 ms |
| Producto ya existente (cantidad incrementada) | CSS | `.flash` reaplicado con una key que cambia (`id` + nonce) para re-disparar la animación sin re-animar el layout de la fila |
| Eliminar producto | CSS (salida corta) o ninguna | Reacomodo de filas sin animación de layout — el orden de las demás no se anima, sólo desaparece la fila |
| Total actualizado | CSS | `.total-flash`, pulso de color, 120 ms |
| Confirmación de venta | CSS | `.pop-in`, entrada con scale 0.92→1, degrada a fade con reduced motion |
| Error de stock | Ninguna espacial | Mensaje inline + estado de error — sin shake, sin vibración |
| Mensajes de validación de un formulario auxiliar (p. ej. alta rápida de producto) | AutoAnimate | No implementado hoy; candidato válido si aparece esa lista |

Estos cuatro mecanismos CSS (`.flash`, `.total-flash`, `.pop-in`,
`.section-enter`) **no se migran a Motion**: ya cumplen la regla central de
`motion.md` (el mecanismo más chico que resuelve la interacción) y migrarlos
agregaría una dependencia de runtime a una animación que no la necesita. Un
hallazgo que proponga "modernizar" estos cuatro casos con Motion sin una
razón funcional nueva es un hallazgo mal formulado (`motion.md`, *Motion
funcional vs decorativo*).

Motion (Nivel 2) tendría un caso real en el POS si apareciera, por ejemplo,
un drawer de detalle de venta con `AnimatePresence`, o un panel de medio de
pago expandible con `layout`. Ninguno de los dos existe hoy; se documentan acá
como referencia para cuando corresponda evaluarlos, no como trabajo pendiente.

## Layout de referencia

```text
┌────────────────────────────────────┬──────────────────────┐
│ [ Código de barras            ] ⌨  │  TOTAL               │
│ (foco por defecto, siempre)        │  $ 1.200,50          │
│ Buscar manualmente…                │  12 productos        │
├────────────────────────────────────┤                      │
│ Alfajor Jorgito   2  600,00  1.200 │  Medio de pago       │
│ Agua 500ml        1  450,00    450 │  ( ) Efectivo        │
│ …                            scroll│  ( ) Tarjeta         │
│                                    │                      │
│                                    │ ┌──────────────────┐ │
│                                    │ │ Confirmar venta  │ │
│                                    │ └──────────────────┘ │
└────────────────────────────────────┴──────────────────────┘
```

Dos regiones fijas. La izquierda (entrada + carrito) scrollea; la derecha
(total + cobro) **nunca**. Verificado en 1024 × 768, 1280 × 720 y 1366 × 768
(`responsive-design.md`).

## Checklist `operational-pos`

- [ ] El foco está en el campo de escaneo al entrar a la pantalla.
- [ ] Después de cada escaneo el foco vuelve al campo y el campo se limpia.
- [ ] Un escaneo repetido incrementa la cantidad, no agrega una línea.
- [ ] La línea afectada se resalta y es visible.
- [ ] El resaltado sobrevive a `prefers-reduced-motion`.
- [ ] La búsqueda manual se navega con flechas y se confirma con Enter.
- [ ] Escape cierra la búsqueda y devuelve el foco al escaneo.
- [ ] Las cantidades se editan sin abrir un diálogo.
- [ ] La cantidad se topa contra el stock disponible.
- [ ] El mensaje de tope dice cuántas unidades hay.
- [ ] Un stock desconocido no bloquea el escaneo.
- [ ] Anular una línea actualiza el total en el mismo render.
- [ ] Anular una línea mueve el foco a un lugar deliberado.
- [ ] El total está siempre visible, también en 1024 × 768.
- [ ] El total es el elemento dominante de su región.
- [ ] El total usa `.num` y `formatMoney`.
- [ ] El total se actualiza inmediatamente ante cualquier cambio.
- [ ] El total lleva `aria-live="polite"`.
- [ ] El conteo de ítems está visible.
- [ ] El botón de cobro mide ≥ 48 px y es la única acción primaria de la región.
- [ ] Con el carrito vacío, el botón explica qué falta.
- [ ] El medio de pago se elige con teclado y no se comunica sólo por color.
- [ ] El pago dividido muestra cuánto falta asignar.
- [ ] La confirmación usa `pendingImmediate`.
- [ ] Hay guarda contra doble confirmación además del botón deshabilitado.
- [ ] La venta no se confirma de forma optimista.
- [ ] El bloqueo termina siempre en éxito, error o timeout.
- [ ] La confirmación muestra número de venta y total.
- [ ] Después de confirmar, el foco vuelve al campo de escaneo.
- [ ] Ningún error borra el carrito.
- [ ] Una respuesta ambigua se declara desconocida y no ofrece un reintento
      duplicante.
- [ ] El flujo completo —escanear, ajustar, cobrar, confirmar— se hace sin mouse.
- [ ] El carrito no usa AutoAnimate ni una layout animation de Motion para
      reordenar: el orden se mantiene estable sin animación de posición.
- [ ] Ninguna animación del POS supera 400 ms; la mayoría está en la mitad
      inferior de su rango de referencia (`motion.md`).
