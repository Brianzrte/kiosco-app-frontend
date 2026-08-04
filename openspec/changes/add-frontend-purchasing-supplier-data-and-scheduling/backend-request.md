# Backend request — Purchasing: datos de proveedor, fecha objetivo, permisos y pesables

**Change frontend:** `add-frontend-purchasing-supplier-data-and-scheduling`
**Fecha de verificación:** 2026-08-04
**Estado del frontend:** bloqueado en su totalidad. No se implementa ninguna
parte —ni con datos simulados— hasta que los bloques de abajo estén desplegados y
verificados contra una instancia real.

Contexto: el frontend va a implementar (a) precarga del pedido anterior como
plantilla — **no requiere backend** —, y (b) ficha de proveedor con datos de
contacto, fecha objetivo de entrega, recepción por parte del cajero y cantidades
pesables — que sí requieren los cuatro bloques de abajo.

Los bloques son independientes entre sí y pueden entregarse por separado, pero
**A conviene primero**: toca las mismas estructuras que C y evita un segundo pase
sobre los DTOs de pedido.

Este documento no prescribe reglas de negocio: pide contrato de datos y permisos.
Dónde una decisión es de producto, queda marcada como tal.

## Evidencia consultada

- `../backend/internal/bootstrap/router.go:150-190` (registro de rutas de
  purchasing y sus middlewares de rol)
- `../backend/internal/purchasing/transport/http/routes.go` (rutas registradas
  del módulo)
- `../backend/internal/purchasing/domain/supplier.go`
- `../backend/internal/purchasing/domain/purchase_order.go`
- `../backend/internal/purchasing/transport/http/dto.go`
- `../backend/internal/purchasing/application/remove_purchase_order_item.go`
- Frontend: `src/lib/types.ts`, `src/lib/purchasing.ts`, `src/lib/receiving.ts`,
  `src/lib/nav.ts`, `src/app/(app)/purchasing/[id]/page.tsx`

---

## A. Cantidades decimales en purchasing

**Motivo:** hoy no se puede pedir ni recibir "pan 15 kg". El catálogo ya distingue
`unit_type: unitario | pesable`, pero toda cantidad de compra es entera.

**Alcance real: sólo el módulo `purchasing`.** Inventory ya opera con
`decimal.Decimal` en `stock.go`, `stock_movement.go` y `repository.go`; hoy
purchasing convierte a `int` en el borde, que es exactamente lo que hay que sacar.

Cambios:

- `internal/purchasing/domain/purchase_order.go:45-46` —
  `PurchaseOrderItem.Quantity` y `.ReceivedQuantity`: `int` → `decimal.Decimal`
- `internal/purchasing/domain/purchase_order.go:82` — mismo campo en la struct de
  alta de ítem
- `internal/purchasing/domain/purchase_order.go:175` — puerto
  `StockReceiver.ReceivePurchase(..., quantity int, ...)` → `decimal.Decimal`.
  Elimina la conversión de ida hacia Inventory.
- `PurchaseOrderRepository.RecordReceivedItem(..., receivedQuantity int, ...)` →
  `decimal.Decimal`
- `ValidateReception` (`purchase_order.go:146-152`) — las comparaciones
  `receipt.Quantity < 0`, `> item.Quantity`, `< item.Quantity` pasan a
  comparaciones `decimal`
- `RecalculateTotal` / `RecalculateReceivedTotal` — el `quantity * unit_cost` en
  SQL debe operar sobre columna numérica decimal
- Migración de las columnas `quantity` y `received_quantity` a `NUMERIC`
- Los 3 DTOs: crear pedido, confirmar recepción, alta de ítem no pedido

**Contrato de API:** la cantidad viaja como **string decimal**, igual que el
dinero — nunca como float JSON. Ej: `"quantity": "15.000"`.

**Precisión:** definir escala en la migración y confirmársela al frontend
(inventory ya tiene una; lo natural es igualarla para que el ajuste de stock no
redondee en el borde). El frontend **no** asume una escala: su validación de
cantidad se escribe contra la escala confirmada. Dato bloqueante para
implementar.

**Errores esperados:** rechazo de una cantidad inválida o fuera de escala con el
status y el `message` que el módulo ya usa para validación; el frontend lo muestra
inline sin reinterpretarlo.

**Compatibilidad:** cambio **no aditivo**. Un frontend viejo envía `quantity` como
número JSON; hay que decidir si el backend acepta ambas formas durante la
transición o si el corte es duro. Si es duro, backend y frontend se despliegan en
la misma ventana. Confirmar.

---

## B. Datos del proveedor

**Motivo:** `Supplier` es hoy `{ID, Name, Active}`
(`internal/purchasing/domain/supplier.go`). No hay dónde guardar teléfono,
dirección ni cada cuánto pasa el proveedor.

Campos nuevos en `Supplier`, **todos opcionales / nullable**:

| Campo | Tipo | Nota |
|---|---|---|
| `phone` | string | |
| `address` | string | Dirección donde opera |
| `visit_frequency_days` | int (nullable) | Cada cuántos días pasa a entregar. 7 = semanal |
| `visit_notes` | string | Texto libre real: "martes y viernes por la mañana" |
| `notes` | string | Observaciones generales |

Decisión tomada: **`visit_frequency_days` + `visit_notes` conviven**. El entero es
filtrable y sirve para lógica de reposición; el texto refleja la realidad
operativa que un entero no captura.

**Importante — no confundir con lo existente:** ya hay
`ProductSupplier.ReplenishmentFrequencyDays` (frecuencia de reposición *de un
producto* con *ese* proveedor). El campo nuevo es a nivel proveedor y significa
otra cosa: cada cuánto **pasa físicamente** a entregar. Son dos datos distintos y
deben coexistir.

Endpoints:

- `POST /api/v1/suppliers` — hoy sólo acepta `{"name"}`
  (`dto.go:16`). Debe aceptar los campos nuevos.
- `PUT /api/v1/suppliers/{id}` — ídem.
- `GET /api/v1/suppliers/{id}` — **no existe y hace falta.** La ficha de detalle
  del proveedor lo necesita. Debe devolver el proveedor completo con los campos
  nuevos. Roles: los mismos que hoy leen proveedores (`admin`, `inventory`,
  `receiving`), más `cashier` si se aprueba el bloque D. Debe devolver `404`
  cuando el proveedor no existe.
- `GET /api/v1/suppliers` (lista) — decidir si devuelve los campos nuevos o sólo
  el resumen. El frontend puede vivir con el resumen si existe el detalle.

**Compatibilidad:** aditivo. Los proveedores existentes quedan con los campos en
`null`; la UI ya contempla mostrarlos como "sin definir".

**Errores esperados:** se conserva el `409` por nombre duplicado (constraint
UNIQUE en `suppliers.name`).

---

## C. Fecha objetivo del pedido

**Motivo:** `PurchaseOrder` sólo tiene `OrderedAt` (`purchase_order.go:68`). No hay
forma de expresar "para cuándo lo quiero" ni, por lo tanto, de definir "los pedidos
del día".

- `PurchaseOrder.ExpectedAt` — **nullable**. Los pedidos ya creados no la tienen y
  nunca la van a tener; el frontend debe poder renderizar su ausencia.
- `POST /api/v1/purchase-orders` la acepta (opcional).
- `GET /api/v1/purchase-orders` la devuelve **en el list item**, no sólo en el
  detalle.
- `GET /api/v1/purchase-orders/{id}` la devuelve.
- **Filtro nuevo:** `expected_from` / `expected_to` en el listado. Sin esto, "los
  pedidos del día" no tiene definición y el frontend tendría que traerse todo y
  filtrar en cliente.
- Orden: poder ordenar el listado por `expected_at` ascendente.

**Dato a confirmar:** el tipo en el borde HTTP. Hoy el frontend convierte el
`<input type="date">` a RFC3339 para `ordered_at` (`toOrderedAtPayload` en
`src/lib/purchasing.ts`); si `expected_at` es un timestamp RFC3339, el frontend
usa el mismo helper. Los filtros `expected_from`/`expected_to` se esperan como
días `YYYY-MM-DD`, igual que los `from`/`to` ya soportados. Confirmar ambas cosas
antes de implementar.

**Compatibilidad:** aditivo, siempre que el campo sea opcional en la creación y
nullable en las respuestas.

---

## D. Permisos de recepción para el cajero

**Motivo:** el caso de uso es que el cajero de mostrador reciba los pedidos del
día. Hoy el backend le devuelve **403 en todo purchasing** salvo el pago.

**Además hay un bug vivo:** `src/app/(app)/purchasing/[id]/page.tsx` (frontend)
permite `cashier` en su gate, pero `router.go:166-171` no. La pantalla monta y el
primer `GET /purchase-orders/{id}` falla con 403. El frontend lo corrige de su lado
en el change correspondiente, pero la decisión de permisos es de acá.

En `internal/bootstrap/router.go:162-171`, `receivingWrapped` es hoy
`admin | inventory | receiving`. Agregar `cashier` a:

- `GET /api/v1/suppliers`
- `GET /api/v1/purchase-orders`
- `GET /api/v1/purchase-orders/{id}`
- `POST /api/v1/purchase-orders/{id}/receive`
- `POST /api/v1/purchase-orders/{id}/items`
- `DELETE /api/v1/purchase-orders/{id}/items/{item_id}`

`POST /purchase-orders/{id}/payment` ya incluye `cashier`. La creación de pedidos
y proveedores (`creationWrapped`) **no** cambia: sigue `admin | inventory`.

### ⚠️ Decisión de producto pendiente

Ampliar `receivingWrapped` significa que **el cajero pasa a ver todo el historial
de compras, los costos de proveedor y la inversión del negocio.**

Alternativa más acotada: un endpoint con permiso propio que devuelva sólo los
pedidos con `expected_at` = hoy y en estado `PENDING`, sin exponer el histórico.

Recomendación: ampliar (simple), salvo que los costos de compra sean información
sensible frente al personal de mostrador. **Confirmar antes de implementar.**

Si se elige la alternativa acotada, cambia el endpoint que el hub consume para el
rol `cashier` y el change frontend se actualiza antes de implementarse.

**Compatibilidad y rollout:** ampliación de permisos. Se despliega en backend
**antes** de que el frontend muestre cualquier acceso al rol `cashier`, nunca al
revés. Revertirla en backend deja al frontend mostrando una entrada que devuelve
`403`, así que la reversión se coordina en el mismo sentido inverso.

---

## Orden de despliegue y criterio de desbloqueo

1. **A** desplegado; escala decimal confirmada por escrito al frontend.
2. **B** desplegado; `GET /api/v1/suppliers/{id}` responde `200` con los campos
   nuevos y `404` para un id inexistente.
3. **C** desplegado; `GET /api/v1/purchase-orders` devuelve `expected_at` en el
   list item y respeta `expected_from`/`expected_to`.
4. **D** decidido y desplegado; un usuario con rol `cashier` real obtiene `200` —
   no `403` — en `GET /api/v1/purchase-orders/{id}` y puede confirmar una
   recepción.

Cada punto se verifica contra una instancia real, no contra el código fuente: un
endpoint que existe en el repositorio pero no está desplegado no desbloquea nada.

---

## Fuera de alcance / ya resuelto

- **Ajuste automático de stock:** ya lo hace el backend en la recepción
  (`ReceivePurchaseOrderUseCase` → `StockReceiver`). Sin cambios.
- **Quitar ítem no entregado con motivo:** ya existe por dos caminos (cantidad
  recibida menor con `non_delivery_reason`, y `DELETE .../items/{id}` con
  `removal_reason`). Sin cambios.
- **Motivo obligatorio también para admin:** se mantiene la regla actual. El motivo
  es el registro de auditoría; exceptuar al admin destruye la trazabilidad justo
  donde más vale. **No cambiar** `remove_purchase_order_item.go` ni
  `ValidateReception` en este sentido.
- **Ítem no pedido con descripción libre y precio:** ya existe y está completo.
- **Plantilla / precarga del pedido anterior:** se resuelve en frontend con
  `GET /purchase-orders?supplier_id=X&limit=1` + `GET /purchase-orders/{id}`, ambos
  existentes. **No requiere backend.**

## Hueco adyacente detectado (no bloqueante)

`GET /api/v1/purchase-orders/uncatalogued-items` existe en el backend (admin
exclusivo) y **no tiene ningún consumidor en el frontend**. No hay pantalla donde
el admin vea la cola de productos pendientes de alta que generaron las recepciones
con ítems de texto libre. Candidato a change futuro.
