## Context

Hoy `Product` no distingue tipos de producto (`src/lib/types.ts:119-130`,
reflejo de `../backend/internal/catalog/domain/product.go:11-22`): sólo
`id, sku, barcode, name, category_id, price, cost, active, created_at,
updated_at`. El carrito del POS (`PosView.tsx`) trabaja con
`CartLine = { product, quantity: number }` y siempre suma/resta de a 1 unidad
entera (`addToCart`, `incrementQuantity`, `setQuantity`); el total se calcula
con `toCents(line.product.price) * line.quantity`. El backend define
`SaleItem.Quantity` como `int`
(`../backend/internal/sales/domain/sale_item.go:8-30`) y no tiene ninguna
noción de "precio real" vs. "precio calculado". `SaleDetail.tsx` muestra sólo
`quantity`, `unit_price` y `subtotal` de cada línea, sin ningún control para
un precio alternativo.

Este change agrega la noción de producto "pesable" — vendido a granel por
peso en vez de por unidades enteras — y la de "precio real cobrado", que
puede diferir del precio calculado por el sistema y que reemplaza a este
último en todo cálculo posterior a la venta. Ninguno de los dos conceptos
existe hoy en el frontend ni en el backend: **este change depende de un
contrato de backend nuevo** (ver `backend-request.md`) y no es implementable
hasta que ese contrato exista y esté desplegado.

Hay un change abierto sin commitear, `add-frontend-automatic-product-sku`,
que modifica el bloque SKU/barcode de `ProductForm.tsx` sin tocar
`category_id`, `price` ni la estructura general del formulario. No hay
conflicto de contenido con este change, pero ambos tocan el mismo archivo:
ver "Backend coordination" más abajo para el orden de merge sugerido (que en
realidad es un orden de merge entre changes de frontend, no con el backend;
se documenta acá porque es la única coordinación de archivo compartido que
existe).

## Goals / Non-Goals

**Goals:**

- Permitir vender productos a granel por peso (kg, 3 decimales), con el
  precio de línea calculado automáticamente (`peso × price_per_kg`,
  redondeo a centavo).
- Permitir que el cajero registre un precio real cobrado que difiera del
  calculado, antes de confirmar la venta, y que ese precio real sea el que
  cuenta para el total de la venta, el cierre de caja, los reportes y las
  devoluciones.
- Conservar el precio calculado como dato histórico visible (tachado) en el
  detalle de venta, cuando difiere del real.
- Mantener el comportamiento actual sin cambios para productos `unitario`.

**Non-Goals:**

- Editar el precio real después de confirmada la venta. Fuera de alcance;
  si se necesita en el futuro, es un change aparte con su propia política de
  auditoría (decisión ya tomada en el Requirement Context).
- Control de stock/inventario para productos pesables. El POS no valida
  disponibilidad para ellos.
- Cualquier unidad de peso distinta de kilogramos (gramos como unidad
  principal, libras, etc.).
- Reportes nuevos o modificados específicos de pesables ("ventas por kilo").
  Los reportes existentes reciben agregados ya corregidos del backend, sin
  cambio de contrato desde la perspectiva del frontend.
- **Devolver una línea `pesable` desde el flujo actual de `ReturnForm.tsx`.**
  El selector de devolución hoy es un stepper de unidades enteras
  ("vendidas N · ya devueltas N · disponibles N", con botones +/-1,
  copy "Se van a dar de baja N unidades"). Ni el Requirement Context ni este
  design extienden ese componente a un selector de peso parcial: `ui-returns`
  no forma parte de las capabilities modificadas por este change. Mientras
  este Non-Goal siga vigente, una línea `pesable` puede devolverse
  completa por fuera de este flujo (ajuste manual de stock, ya contemplado
  hoy en el propio copy de `ReturnForm`: "la única corrección posterior es
  un ajuste manual de stock"), o quedar bloqueada hasta un change dedicado.
  No es una decisión de producto tomada acá — es una superficie que el
  Requirement Context no incluyó en "Affected components" y que se deja
  fuera para no inflar el alcance; ver "Open Questions".
- Introducir una librería nueva. El cálculo decimal-seguro se resuelve con
  los mismos patrones enteros-en-centavos que ya usa `lib/money.ts`.

## User flow

1. El cajero escanea o busca un producto `pesable`.
2. En vez de agregarse con cantidad 1, la línea pide el peso (kg, hasta 3
   decimales); mientras el peso está vacío o es `0`, no hay línea en el
   carrito.
3. El cajero ingresa el peso pesado en la balanza; el sistema calcula el
   precio de la línea (`peso × price_per_kg`, redondeado a 2 decimales) y lo
   muestra en el carrito junto a un botón (ícono lápiz) para editar el
   precio real.
4. Si el cliente pagó un monto distinto, el cajero activa el editor de
   precio real, ingresa el monto cobrado; la línea pasa a mostrar ese monto
   como el vigente para el total de la venta. El calculado se conserva sin
   mostrarse en el carrito (reaparece tachado recién en el detalle de venta
   posterior a la confirmación).
5. El cajero sigue armando el carrito — puede mezclar unitarios y pesables —
   compone el pago y confirma la venta con el flujo existente (`POST
   /sales`, `POST /sales/{id}/items`, `PUT /sales/{id}/payment`, `POST
   /sales/{id}/confirm`).
6. En el historial (`/sales/[id]`), la línea pesable con precio corregido
   muestra el calculado tachado en rojo y el real al lado.

## UI states

**ProductForm (alta/edición):**

- **Idle/inicial**: sin `unit_type` seleccionado, el formulario no permite
  enviar (campo obligatorio, sin default). Para un producto existente sin
  `unit_type` en la respuesta (backend no migrado todavía), el formulario lo
  trata como `unitario` explícito, no como un estado vacío — ver "Backend
  coordination".
- **`unitario` seleccionado**: comportamiento idéntico al actual (SKU,
  barcode, categoría, `price`, `cost`).
- **`pesable` seleccionado**: el campo `price` se reemplaza por
  `price_per_kg`; `cost` no cambia.
- **Error de validación**: mismo patrón que hoy — mensaje del backend debajo
  del campo relevante (`price_per_kg` ausente o inválido para un `pesable` se
  trata como cualquier error de validación de `ProductForm` hoy).

**POS (carrito):**

- **Loading**: sin estado propio — el cálculo de precio por peso es síncrono
  en cliente.
- **Empty**: peso vacío o `0` → no hay línea en el carrito, el control de
  peso queda vacío sin agregar nada.
- **Peso ingresado válido (> 0, ≤ 3 decimales)**: la línea aparece con el
  precio calculado y el botón de editar precio real.
- **Editor de precio real abierto**: campo de importe; confirmar reemplaza el
  precio efectivo de la línea; cancelar no cambia nada.
- **Precio real activo**: la línea muestra el precio real como el vigente;
  el calculado deja de mostrarse en el carrito (sólo reaparece tachado en el
  detalle post-confirmación).
- **Error de peso inválido** (negativo, no numérico, más de 3 decimales):
  rechazo inline en el propio control, sin llamar al backend — mismo
  criterio de "evitar llamadas obviamente inválidas" que ya usa el repo.
- **Error de confirmación de venta** (p.ej. `price_per_kg` ausente en el
  producto, rechazo de pago): igual que hoy, mensaje del backend tal
  cual (`ui-pos` §"Atomic sale confirmation").
- **Producto pesable sin `price_per_kg` cargado** (dato inconsistente o
  migración incompleta): el POS no permite agregarlo al carrito sin un
  precio por kilo válido — se trata como un producto no vendible, con un
  mensaje inline equivalente al de "producto inactivo" hoy.

**SaleDetail:**

- **Línea sin corrección** (pesable sin editar, o unitario): se muestra sólo
  el precio vigente, sin tachado — igual que hoy.
- **Línea con precio real distinto del calculado**: el calculado se muestra
  tachado en rojo (`<s>`/`line-through` semántico, no sólo color), y al lado
  el precio real, que es el que participa del `subtotal` y del total de la
  venta.

## Decisions

1. **Campo nuevo `price_per_kg`, separado de `price`** (no se reutiliza
   `price` para pesables). Alternativa descartada: sobrecargar `price` con
   una unidad implícita distinta según `unit_type` — se descarta porque
   duplica el significado de un mismo campo según un flag externo, lo que
   complica cualquier lugar que hoy lee `price` sin conocer `unit_type`
   (listado de productos, búsqueda del POS). Decisión ya tomada en el
   Requirement Context.
2. **Peso con 3 decimales, precio calculado redondeado a 2 decimales
   (centavo), siempre string decimal**, nunca `number`/float. Sigue el
   patrón exacto de `lib/money.ts` (`toCents`/`fromCents`); el peso en sí no
   es dinero, pero se maneja con la misma disciplina de string decimal para
   evitar drift de punto flotante en la multiplicación. El helper de cálculo
   (`peso × price_per_kg`) es una función pura nueva y testeable — candidato
   natural es extenderla en `lib/money.ts` o en un módulo dedicado (p.ej.
   `lib/weightPricing.ts`), siguiendo el patrón de `toCents`/`fromCents`; el
   nombre exacto del archivo es un detalle de implementación que no fija
   este design.
3. **El precio real reemplaza al calculado para todo cálculo posterior**
   (total, balance de pago, cierre de caja, reportes, devoluciones); el
   calculado queda sólo como dato histórico tachado. Alternativa descartada:
   mantener ambos valores como "aditivos" o promediarlos — se descarta
   porque el negocio quiere reflejar la caja real, no un híbrido; el
   calculado es evidencia de la diferencia, no un componente del total.
4. **La edición del precio real viaja en el mismo payload de creación de
   línea** (`POST /sales/{id}/items`), nunca en un endpoint de edición
   retroactiva. Esto es consistente con que el carrito hoy no tiene un
   endpoint de "editar línea" separado de "crear línea" — cada cambio de
   cantidad/peso en el cliente sólo se materializa contra el backend en el
   momento de confirmar (mirar `confirmSale()` en `PosView.tsx`, que recorre
   `cart` y hace un `POST /sales/{id}/items` por línea recién al confirmar).
   El precio real, por lo tanto, es estado local del carrito hasta ese
   punto, igual que el peso.
5. **Sin validación de stock para pesables**: `PosView` no llama a
   `GET /inventory/stock/{product_id}` para un producto `pesable`. Esto es
   una rama nueva en `addToCart`/`incrementQuantity` (que hoy siempre
   consultan stock), condicionada por `unit_type`.
6. **Sin scope nuevo de autorización**: la edición del precio real usa
   exactamente el mismo scope que el backend ya fuerza hoy en `/sales`
   (cajero: propias del día; admin: todas). El frontend no agrega ni replica
   ese scope — el único gate en la UI es "la venta no está confirmada
   todavía", que ya es una condición observable hoy (no hay edición de
   ninguna línea de una venta confirmada).
7. **Migración implícita a `unitario`**: todo producto existente se
   considera `unitario` por defecto. Mientras el backend no haya migrado el
   dato en la base (o mientras el frontend viejo conviva con el backend
   nuevo), la ausencia del campo `unit_type` en una respuesta se trata como
   `unitario` explícito — no como un estado de error ni un placeholder
   vacío.

8. **A repeated scan of a `pesable` product already in the cart does not
   increment anything.** Unlike a `unitario` line (where a repeated scan
   adds one more unit automatically), a weight is never "one more" of a
   fixed size — each weighing is a fresh, independent measurement. A
   repeated scan of a `pesable` product already in the cart focuses that
   line's weight input for a new entry, rather than silently adding to the
   existing weight or creating a second line for the same product. This is
   a necessary consequence of Decision 2 and Goal "peso, no cantidad", not a
   new feature: the Requirement Context's main flow only describes the
   first scan, and this fills the otherwise-undefined repeated-scan case
   for a `pesable` product to avoid an ambiguous UI state.

## Accessibility

- El precio calculado tachado en `SaleDetail` no puede depender sólo del
  color rojo: usa `<s>`/`line-through` semántico y un texto o `aria-label`
  adicional que indique "precio calculado, reemplazado por precio real".
- El botón de editar precio real (ícono lápiz) en el carrito del POS lleva
  un `aria-label` que nombra el producto y la acción (p.ej. "Editar precio
  real de <producto>"), nunca sólo el ícono sin nombre accesible.
- El control de peso y el campo del editor de precio real tienen foco
  visible, igual que el resto de inputs del kit (`Input`).
- El estado "precio real activo" en el carrito no se comunica sólo por
  color; el texto junto al monto lo indica explícitamente (p.ej. una
  etiqueta corta "editado").

## Keyboard and focus behavior

El POS mantiene el input de escaneo como el camino crítico de teclado
(`ui-pos` §"Scan-first sale screen"). Abrir el editor de precio real (lápiz)
es la única interrupción deliberada de ese foco: al confirmar o cancelar esa
edición, el foco vuelve al input de escaneo, con el mismo patrón que ya usa
`refocus()` tras cualquier otra acción del carrito. Dentro del editor,
`Enter` confirma el precio ingresado y `Escape` cancela sin cambiar nada —
mismo patrón de atajo que ya usa la categoría de `ui-catalog` (`Enter`
confirma, `Escape` cancela y restaura el valor anterior). El control de peso
es un input de texto estándar del kit, sin comportamiento de teclado
adicional más allá de la validación inline.

## Responsive behavior

No hay pantalla nueva: el control de peso y el botón de editar precio real
son una extensión del carrito ya responsive de `PosView` (funcional desde
320px). Ni el control de peso ni el botón lápiz dependen de hover ni de
espacio horizontal amplio — mismo criterio que ya aplica a los controles
+/- de cantidad existentes. En `SaleDetail`, el tachado del precio calculado
se muestra tanto en la vista de tarjetas móvil como en la tabla de
escritorio, siguiendo el mismo patrón dual que ya usa ese componente para
"Devuelto"/"parcialmente devuelto".

## API contract

**Existentes, sin cambio de forma para `unit_type = "unitario"`:**
`GET /api/v1/products`, `POST /api/v1/products`, `PUT
/api/v1/products/{id}`, `GET /api/v1/categories`, `GET
/api/v1/products/barcode/{barcode}`, `POST /api/v1/sales`, `PUT
/api/v1/sales/{id}/payment`, `POST /api/v1/sales/{id}/confirm`, `GET
/api/v1/sales/{id}`.

**Requieren un contrato nuevo que hoy no existe — ver `backend-request.md`:**

- `POST /api/v1/products` y `PUT /api/v1/products/{id}`: aceptar
  `unit_type` (obligatorio) y `price_per_kg` (obligatorio cuando
  `unit_type = "pesable"`, decimal string).
- `POST /api/v1/sales/{id}/items`: aceptar una línea por peso (decimal
  string, 3 decimales) en vez de (o junto a) `quantity: number`, y
  opcionalmente en el mismo payload un precio real que reemplace al
  calculado.
- `GET /api/v1/sales/{id}`: la línea (`SaleItem`) debe devolver tanto el
  precio calculado histórico como el precio real efectivo, decimal string,
  para que `SaleDetail` pueda mostrar el tachado.

**Sin cambio de contrato desde la perspectiva del frontend:** reportes y
cierre de caja (`GET /reports/...`, `GET /sales/summary`, `GET
/sales/today-summary`) siguen devolviendo agregados ya calculados por el
backend; es el backend quien debe usar el precio real en esos agregados, sin
que el frontend cambie cómo los consume.

Los nombres de campo exactos (`unit_type`, `price_per_kg`, nombre del campo
de peso, nombre de los dos precios de línea) son una referencia propuesta,
no un contrato cerrado: el backend puede nombrarlos distinto, y el frontend
se ajusta al nombre real que el backend defina (ver `backend-request.md`).

## Error handling

- Peso inválido (negativo, no numérico, más de 3 decimales): validado en
  cliente antes de llamar al backend, sin mensaje del backend involucrado.
- Rechazo del backend al crear una línea o confirmar la venta (p.ej.
  `price_per_kg` ausente, peso fuera de un rango que el backend valide): se
  muestra el `{ message }` tal como llega, sin traducir ni reinterpretar —
  mismo patrón que el resto de `ui-pos`.
- Conflicto de validación al dar de alta un producto `pesable` sin
  `price_per_kg`: mismo patrón que cualquier error de validación de
  `ProductForm` hoy (mensaje del backend debajo del campo).
- Precio real con un monto negativo o absurdamente alto: el frontend sólo
  evita valores obviamente inválidos (vacío, no numérico, negativo); el
  rango razonable lo valida el backend al confirmar, sin que el frontend
  replique un límite de negocio inventado.

## Backend coordination

Este change **no se puede implementar sin backend nuevo**. Ver
`backend-request.md` para el contrato mínimo pedido: `unit_type` y
`price_per_kg` en `Product`; una representación de peso decimal y de precio
calculado/real en la línea de venta. Nada de esto existe hoy en
`../backend/internal/catalog/domain/product.go`,
`../backend/internal/sales/domain/sale_item.go` ni en
`../backend/internal/bootstrap/router.go` (verificado con `rg` sobre ambos
árboles para `weight|pesable|peso|unit_type|kilogram|by_weight|per_kg`, sin
resultados).

**Coordinación de archivo compartido (no de backend):** el change abierto
`add-frontend-automatic-product-sku` modifica el bloque SKU/barcode de
`ProductForm.tsx` sin tocar `category_id`/`price`. No hay conflicto de
contenido, pero conviene fusionar ese change antes de implementar este —o
resolver el conflicto de archivo en el momento de implementar, lo que ocurra
primero— para no generar un merge innecesariamente complejo sobre el mismo
componente.

## Risks / Trade-offs

- [Riesgo] El contrato de backend no existe: cualquier decisión de shape
  tomada acá es provisional. → Mitigación: `backend-request.md` documenta el
  contrato mínimo sin inventar nombres definitivos; las tareas de
  implementación quedan explícitamente bloqueadas hasta la verificación
  contra una instancia real.
- [Riesgo] Un producto pesable sin `price_per_kg` cargado podría intentar
  agregarse al carrito con un cálculo `NaN`/roto. → Mitigación: se trata como
  no vendible en el POS, igual que un producto inactivo.
- [Riesgo] `lib/returns.ts` (`computeAvailability`, `computeSelectionValue`)
  asume `quantity` como entero para aritmética simple de "vendido menos
  devuelto"; si una línea `pesable` usa un campo de peso separado en vez de
  `quantity`, ese módulo no necesita cambios porque nunca ve esa línea como
  candidata a devolución completa desde `ReturnForm` (Non-Goal). → Mitigación:
  si en un change futuro se habilita devolver pesables, ese trabajo revisa
  `returns.ts` y `ReturnForm.tsx` explícitamente; no es responsabilidad de
  este change.
- [Trade-off] Mostrar el precio calculado tachado sólo en `SaleDetail` (no en
  el carrito, una vez que hay precio real) simplifica el carrito a costa de
  que el cajero no vea ambos valores simultáneamente durante el armado de la
  venta. Se acepta porque el flujo principal es "corregí un valor", no
  "comparar dos valores en paralelo".

## Migration Plan

- Mientras el backend no soporte `unit_type`/`price_per_kg`, `ProductForm`
  sigue funcionando exactamente igual que hoy — no hay regresión para
  productos unitarios existentes.
- Todo producto existente se trata como `unitario` por defecto, tanto si el
  backend migra el dato en la base como si, transitoriamente, no envía el
  campo `unit_type` en absoluto (ver Decisión 7).
- El rollout depende de un despliegue de backend previo (ver
  `backend-request.md` y la sección 0 de `tasks.md`): la implementación de
  frontend no puede empezar sin verificar ese contrato contra una instancia
  real, no contra el código.

## Rollback

- Si el backend revierte el contrato nuevo (o el rollout se pausa), el
  frontend puede volver a la versión anterior de `ProductForm`, `PosView` y
  `SaleDetail` sin pérdida de datos: los productos `unitario` no cambiaron de
  forma, y ningún dato nuevo (`unit_type`, `price_per_kg`, peso, precio
  real) se vuelve obligatorio para leer un producto o una venta existente
  mientras el backend mantenga el campo ausente como equivalente a
  `unitario`.
- No hay migración destructiva de datos del lado del frontend: no se borra
  ni se transforma ningún campo existente.

## Open Questions

- Copy exacto de labels, placeholders y mensajes de error (peso, precio por
  kilo, botón de editar precio real).
- Si se permite reeditar el precio real más de una vez antes de confirmar la
  venta, o si el editor "se cierra" tras la primera corrección.
- Si `ProductDetail.tsx` necesita mostrar explícitamente el tipo de producto
  y el precio por kilo de forma destacada, o alcanza con que `ProductForm`
  (que ya se renderiza dentro de `ProductDetail`) lo muestre en el
  formulario de edición.
- Nombre exacto de los campos nuevos en el contrato del backend — el
  `backend-request.md` propone `unit_type`/`price_per_kg` como referencia,
  pero el backend puede nombrarlos distinto.
- Si el editor de precio real permite volver al precio calculado (deshacer
  la corrección) o sólo permite avanzar hacia un nuevo valor.
- Si devolver una línea `pesable` completa (no parcial) es un caso de uso
  que se necesita pronto — de ser así, es candidato a un change dedicado que
  extienda `ui-returns`, `ReturnForm.tsx` y `lib/returns.ts`, fuera del
  alcance de este change.
