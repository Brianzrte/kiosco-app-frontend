## Why

Un análisis de comportamiento sobre `PosView.tsx` (1334 líneas, 23 `useState`,
sin lógica extraída a `src/lib/`) encontró fallas concretas en el camino
crítico de cada venta: un doble Enter del lector puede duplicar una línea
saltando el tope de stock; corregir un peso a un valor inválido conserva en
pantalla el subtotal del peso anterior; un fallo parcial de red durante la
confirmación puede crear un `draft` de venta duplicado en el backend porque el
`id` de la venta ya creada no se retiene entre reintentos; y la columna de
cobro apila hasta cinco mensajes de estado sin prioridad, mientras el vuelto
se muestra con una jerarquía tipográfica muy menor a la del total. Estos son
errores de confiabilidad y de foco operativo en la pantalla que usa el cajero
en cada venta, no sólo deuda de estilo.

## What Changes

- **Guarda de escaneo/búsqueda en vuelo**: un segundo Enter o selección
  mientras la petición anterior sigue en curso ya no dispara una segunda
  petición en paralelo ni evalúa el tope de stock contra un carrito
  desactualizado.
- **Alta de línea no bloqueada por stock**: la línea aparece en el carrito al
  resolver el producto; el tope de stock se aplica en cuanto la consulta en
  paralelo responde, sin retrasar la aparición de la línea.
- **Error de peso por línea**: cada línea pesable lleva su propio estado de
  error; ya no se pinta de error toda otra línea pesable del carrito.
- **Subtotal siempre consistente con el peso mostrado**: un peso inválido deja
  de conservar el subtotal calculado con el peso anterior.
- **Una sola UI para pesables**: se elimina el panel separado "Peso de
  `<producto>`"; el peso siempre se ingresa en el campo de la línea del
  carrito.
- **"Precio real" como campo visible de la línea**, con su propia validación
  inline, en vez de un ícono lápiz oculto que reutiliza el banner de escaneo.
- **Efectivo preseleccionado** como medio de pago por defecto al iniciar una
  venta con carrito no vacío (el cajero puede cambiarlo); el pago dividido
  existente no cambia.
- **"Efectivo entregado" siempre visible con la jerarquía tipográfica del
  total** cuando el medio incluye Efectivo (se elimina el botón "Calcular
  vuelto"), en vez de un campo oculto detrás de un botón y en `text-sm`.
- **Última venta persistente en la columna de cobro**: tras confirmar una
  venta, un rastro breve ("Última venta: #`N` · Ver") queda visible en la
  columna de cobro incluso después de que el panel modal de confirmación se
  cierre — hoy ese número se pierde sin dejar rastro.
- **Conteo real de unidades** junto al total (líneas y unidades/peso vendido),
  no sólo la cantidad de líneas.
- **Una única región de estado por zona** (entrada y cobro), cada una con un
  solo mensaje visible a la vez según una prioridad explícita, reemplazando
  las variables de estado que hoy pueden superponerse.
- **`confirmError` con `role="alert"`** y una acción de recuperación acorde al
  tipo de error (reintentar si es transitorio; volver a iniciar sesión si es
  `401`/`403`, siguiendo el patrón ya vigente en el repo).
- **No duplicar el draft de venta**: un reintento tras un fallo parcial
  reutiliza el `id` de venta ya creado en vez de crear uno nuevo.
- **Vaciar carrito**: una acción visible que confirma en un `Dialog` (el ya
  existente en el repo) antes de vaciar todas las líneas; quitar una única
  línea sigue sin diálogo.
- **Atajos de teclado** para confirmar venta, enfocar la búsqueda por nombre,
  enfocar/mostrar el cálculo de vuelto, abrir "vaciar carrito" y seleccionar
  cada medio de pago; cada uno impreso junto a su control.
- **Orden de tabulación agrupado por línea** del carrito, en vez de un tab
  stop por cada botón +/- individual.
- **El dropdown de resultados de búsqueda no tapa el carrito** (ajuste de
  superposición/z-index sobre la composición ya existente de
  `audit-pos-density-and-header-overflow`).
- **Scroll propio del carrito** que lleva a la vista la línea recién afectada
  cuando el contenido excede el alto disponible.
- **Persistencia de carrito en `sessionStorage`** (carrito y medio de pago),
  para que un refresh accidental no pierda una venta en curso; se limpia al
  confirmar o al vaciar explícitamente.
- **Descomposición**: la lógica de carrito, la resolución de mensajes de
  estado y la secuencia de envío de venta se extraen a funciones puras en
  `src/lib/` con tests; `PosView.tsx` pasa a orquestar sub-componentes.

Fuera de alcance (ver `design.md`, "Non-Goals"): fusionar el campo de escaneo
y el de búsqueda en un único omnibox; cualquier cambio a la cantidad de
columnas o a la composición rail/catálogo/carrito de la pantalla (decisión de
layout ya aprobada y no implementada en `refactor-erp-pos-visual-system`);
pago dividido en más de dos tramos o con Transferencia; venta atómica de un
único endpoint; búsqueda server-side de productos; stock incluido en la
respuesta de producto; recuperación de un draft huérfano ya existente en el
backend.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-pos`: agrega y modifica requirements de comportamiento del carrito
  (guarda de escaneo, stock no bloqueante, error de peso por línea, subtotal
  consistente, precio real visible), de la región de cobro (prioridad única de
  mensajes, `confirmError` con `role="alert"` y recuperación, "Efectivo
  entregado" siempre visible con jerarquía tipográfica del total, conteo real
  de unidades, medio de pago preseleccionado, no duplicar el draft de venta al
  reintentar, rastro persistente de la última venta confirmada), de la región
  de entrada (dropdown de búsqueda que no tapa el carrito), de la operación
  del carrito (vaciar carrito con diálogo, scroll propio, orden de tabulación
  agrupado por línea) y de persistencia local (carrito en `sessionStorage`).
  Ningún requirement vigente sobre roles, rutas, contrato de API o layout de
  columnas cambia.

## Impact

- `src/components/pos/PosView.tsx`: pasa de contener toda la lógica y el JSX
  a orquestar sub-componentes (entrada/escaneo, líneas de carrito, panel de
  cobro, región de estado de cobro, diálogo de vaciar carrito); el panel de
  "Venta confirmada" se extrae sin cambios de comportamiento. `PosView` gana
  el estado de la última venta confirmada de la sesión (para el rastro
  persistente), separado del estado que dispara el panel modal.
- `src/components/pos/CheckoutPanel.tsx`: el bloque de "Efectivo entregado"/
  vuelto deja de tener un botón de mostrar/ocultar; se agrega el rastro
  "Última venta: #`N` · Ver" debajo del botón "Confirmar venta".
- Nuevos módulos en `src/lib/`: `cart.ts`, `posStatus.ts`,
  `posSaleSubmission.ts`, cada uno con su `*.test.ts`.
- `src/lib/weightPricing.ts`: mismo contrato, ajusta cómo se invoca para no
  conservar un subtotal calculado con un peso inválido.
- `src/lib/paymentComposition.ts`: sin cambios de contrato.
- Sin cambios de tipos en `src/lib/types.ts`, sin cambios de contrato HTTP,
  sin cambios de roles ni de rutas. No requiere `backend-request.md`: los 20
  puntos de comportamiento se implementan reordenando llamadas existentes
  (`GET /products/barcode/{code}`, `GET /inventory/stock/{id}`,
  `GET /products`, `POST /sales`, `POST /sales/{id}/items`,
  `PUT /sales/{id}/payment`, `POST /sales/{id}/confirm`) y agregando
  guardas/estado del lado del cliente.
