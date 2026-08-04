# Solicitud de contrato backend: descarte de venta en `draft` y stock en la respuesta de producto

Actualizado: 2026-08-04. Este documento describe dos necesidades todavía **no implementadas** en el backend, independientes entre sí. Ninguna parte del frontend descripta en `design.md` se implementa o mockea hasta que el contrato correspondiente se despliegue y se verifique contra una instancia real.

## Contexto y necesidad de usuario

**Descarte de draft**: un cajero con una venta creada (`draft`, `sale.id` ya asignado) que ya no quiere completar no tiene hoy ninguna acción para descartarla — sólo puede quitar cada línea del carrito local a mano, lo cual no elimina la venta del lado del backend. Esa venta queda huérfana, sin ítems o sin pago, indefinidamente.

**Stock en producto**: cada primer escaneo de un producto `unitario` en el turno dispara dos llamadas secuenciales — `GET /products/barcode/{code}` (o la búsqueda) y luego `GET /inventory/stock/{product_id}` — antes de poder aplicar el tope de stock. La segunda es evitable si el stock viaja en la misma respuesta del producto.

## Evidencia consultada (2026-08-04)

- `../backend/internal/sales/transport/http/routes.go`: no existe `DELETE /sales/{id}` ni ningún endpoint de descarte/cancelación — sólo `DELETE /sales/{id}/items/{item_id}` (quitar un ítem, no la venta).
- `../backend/internal/sales/application/`: no hay ningún archivo `cancel_sale.go`/`discard_sale.go`/`void_sale.go` ni caso de uso equivalente (verificado por listado del directorio).
- `../backend/internal/sales/application/list_sales.go`: `GET /sales?status=draft` **ya existe y funciona**, scoped a cajero — no se pide en este documento.
- `../backend/internal/catalog/transport/http/dto.go:76-94`: `productResponse` no tiene ningún campo de stock, verificado línea por línea (`ID`, `SKU`, `Barcode`, `Name`, `CategoryID`, `UnitType`, `Price`, `PricePerKg`, `Cost`, `SellsByUnit`, `UnitsPerPackage`, `ExtraMarginPercent`, `ParentProductID`, `UnitProduct`, `Active`, `CreatedAt`, `UpdatedAt`).
- `../backend/internal/bootstrap/router.go:126-148`: el módulo de inventario (`GET /inventory/stock/{product_id}`) es un dominio separado del catálogo — agregar `stock` a `productResponse` requiere que el caso de uso de listado/detalle de productos consulte ese dominio (join o llamada interna), decisión de implementación de backend.

## Estado actual verificado

- No existe ninguna forma de eliminar, cancelar o invalidar una venta `draft` desde la API.
- `productResponse` no expone stock en ninguna de sus tres rutas de lectura (`GET /products`, `GET /products/{id}`, `GET /products/barcode/{barcode}`).
- El stock de un producto sólo está disponible vía `GET /inventory/stock/{product_id}`, una llamada aparte por producto.

## Contrato mínimo solicitado

### 1. Descarte de una venta en `draft`

Un endpoint (forma exacta a elección de backend — `DELETE /sales/{id}`, o `POST /sales/{id}/discard`, etc.) que:

- sólo opera sobre una venta en estado `draft` (rechaza si ya está `confirmed`, con un status y mensaje verificables);
- verifica ownership igual que el resto de las rutas de `Sales` (`sale.IsOwnedBy(cashierID)`, mismo patrón ya usado por `RegisterPaymentsUseCase`/`ConfirmSaleUseCase`);
- elimina la venta y sus ítems/pagos asociados, o la marca de forma que ya no aparezca en `GET /sales?status=draft` ni pueda confirmarse — la forma exacta (borrado físico vs. estado nuevo tipo `discarded`) queda a elección de backend, documentada explícitamente.

### 2. `stock` en la respuesta de producto

Agregar un campo de stock disponible a `productResponse`, presente en las tres rutas de lectura (`GET /products`, `GET /products/{id}`, `GET /products/barcode/{barcode}`). Forma exacta a elección de backend (entero simple del disponible, o un objeto con más detalle) — el frontend se adapta a la que se documente. Para un producto `pesable`, el campo puede venir ausente o `null`: el frontend nunca lo usa para esa clase de producto (`ui-pos` ya establece que `pesable` no se chequea contra stock).

**Ambigüedad a resolver por backend:** si el stock que se embebe en la respuesta de listado (`GET /products`, hasta 100 productos por página en el uso actual del POS) puede quedar desactualizado respecto del valor en tiempo real de `GET /inventory/stock/{product_id}`, y si eso es aceptable para el caso de uso del POS (tope de stock al momento del escaneo, no una fuente de verdad de inventario). El frontend no decide este trade-off; backend lo documenta.

## Roles y errores

Sin cambios de rol. El endpoint de descarte debe seguir el mismo criterio de autenticación/ownership que las rutas de `Sales` ya vigentes (sin `RequireRole` propio, ownership en el caso de uso). Los campos de lectura de producto (`GET /products*`) no cambian de rol. Errores siguen el envelope `{ message }` vigente.

## Compatibilidad y rollout

1. Backend implementa y despliega ambos contratos en una instancia verificable, cada uno independiente del otro.
2. El frontend previo (que no descarta drafts ni lee `stock` de producto) sigue funcionando sin cambios: un `stock` nuevo en la respuesta que el frontend previo no lee se ignora; la ausencia de un endpoint de descarte no rompe nada del flujo actual.
3. Backend documenta si el descarte de una venta ya confirmada por otra vía (por ejemplo, mientras el cajero tenía el diálogo abierto) devuelve un error verificable (no un `500` genérico) — el frontend necesita distinguirlo para mostrar el mensaje correcto en vez de asumir éxito.

## Impacto y bloqueo en el frontend

Bloquea por completo la implementación de:

- La acción "Descartar venta" y su diálogo de confirmación en
  `src/components/pos/PosView.tsx` (punto 1).
- El consumo de `stock` en `addToCart`/`availableStock` de
  `src/components/pos/PosView.tsx`, y el campo correspondiente en
  `src/lib/types.ts` (`Product.stock`) (punto 2).
- La superficie de "drafts pendientes al entrar al POS" descripta en
  `design.md`, que depende del endpoint de descarte del punto 1 estando
  verificado antes de diseñarse en detalle.

Ninguna de estas superficies se implementa ni se mockea contra un contrato no confirmado.

## Criterio de desbloqueo frontend

Una instancia backend accesible:

1. acepta el descarte de una venta `draft` propia y la elimina o la marca como no recuperable, dejando de aparecer en `GET /sales?status=draft` y de poder confirmarse;
2. rechaza el descarte de una venta ya confirmada, o que no pertenece al cajero, con un status y mensaje verificables;
3. incluye `stock` en `productResponse` para `GET /products`, `GET /products/{id}` y `GET /products/barcode/{barcode}`, documentando su forma exacta y su criterio de actualización.

## Fuera de alcance

- Venta atómica — cubierto por `pos-atomic-sale-confirmation`, backend-request aparte.
- Pago dividido de más de 2 tramos o con Transferencia, búsqueda server-side de productos — el backend ya los soporta hoy; se cubren en un change frontend-only, sin backend-request.
- Un historial o papelera de drafts descartados.
- Cambiar `GET /sales?status=draft`, que ya funciona y no se pide en este documento.
- Cambiar roles, scopes o el envelope de error `{ message }` ya vigente.
