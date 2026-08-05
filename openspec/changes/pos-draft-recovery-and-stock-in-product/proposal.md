## Why

Dos puntos del análisis original del POS quedaron diferidos en
`improve-pos-checkout-flow` por requerir backend, y comparten que ambos son
pedidos acotados sin relación funcional entre sí más allá de tocar el mismo
`PosView.tsx`:

1. Un cajero con una venta en `draft` que ya no quiere completar (se
   equivocó de cliente, cambió de idea) no tiene forma de descartarla salvo
   quitar cada línea a mano; ese draft queda huérfano en el backend sin que
   nadie lo limpie ni el cajero lo vea reflejado si vuelve más tarde.
2. Cada primer escaneo de un producto en el turno dispara dos llamadas
   (`GET /products/barcode/{code}` y `GET /inventory/stock/{product_id}`)
   antes de poder aplicar el tope de stock; el segundo round-trip es
   evitable si el stock viaja en la misma respuesta del producto.

## What Changes

- **Descartar un draft desde el POS**: nueva acción para que el cajero
  descarte explícitamente una venta en `draft`, con el mismo patrón de
  confirmación ya usado por "Vaciar carrito" (`ui-pos`, `Dialog`).
- **Ver y descartar/retomar drafts propios abandonados**: al entrar al POS
  con uno o más drafts propios existentes (`GET /sales?status=draft`, ya
  disponible hoy sin cambios de backend), el cajero puede verlos y decidir
  descartarlos o retomarlos.
- **`stock` en la respuesta de producto**: `GET /products`,
  `GET /products/{id}` y `GET /products/barcode/{barcode}` incluyen el stock
  disponible; el POS deja de hacer una segunda llamada a
  `GET /inventory/stock/{product_id}` para el primer escaneo de cada
  producto `unitario` en el turno.
- **BREAKING (contrato backend, parcial)**: requiere un endpoint nuevo para
  descartar un draft (no existe hoy) y un campo nuevo en la respuesta de
  producto — ver `backend-request.md`. Las tareas dependientes de cada punto
  quedan bloqueadas hasta que el contrato correspondiente se despliegue y se
  verifique.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-pos`: agrega el requirement de descarte/recuperación de drafts propios
  y modifica el requirement de resolución de código de barras para que el
  tope de stock use el campo `stock` de la misma respuesta en vez de una
  segunda llamada.

## Impact

- `src/components/pos/PosView.tsx`: nueva acción de descarte de venta;
  nuevo flujo de drafts pendientes al entrar al POS; `addToCart` deja de
  disparar `GET /inventory/stock/{product_id}` cuando el producto ya trae
  `stock` en su respuesta.
- Nuevo componente en `src/components/pos/` para la lista/diálogo de drafts
  pendientes (nombre y ubicación exactos a definir en `design.md`).
- `src/lib/types.ts`: `Product` gana el campo `stock` (forma exacta a
  confirmar contra backend); posible tipo nuevo para el listado de drafts si
  su forma difiere de `Sale`.
- Requiere `backend-request.md`: no existe hoy `DELETE /sales/{id}` ni
  ningún caso de uso de descarte/cancelación de venta
  (`../backend/internal/sales/transport/http/routes.go`, verificado); no
  existe el campo `stock` en `productResponse`
  (`../backend/internal/catalog/transport/http/dto.go:76-94`, verificado
  línea por línea). El listado de drafts (`GET /sales?status=draft`) **ya
  existe y no se pide** — sólo el descarte y el campo de stock están
  bloqueados.
