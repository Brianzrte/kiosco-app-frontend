## Why

La confirmación de venta en el POS (`add-frontend-success-stock-popups`)
ofrece hoy un atajo "Inicializar stock" a cualquier cajero con acceso a
inventario, **en cada venta confirmada**, sin importar si el producto
vendido realmente tiene stock sin inicializar. El dueño del negocio reporta
que ese texto no debería aparecer en el proceso de venta: confunde durante
el flujo de cobro, que es el camino crítico del POS, y no está condicionado
a una situación real de stock pendiente.

## What Changes

- Se elimina el atajo "Inicializar stock" del panel de venta confirmada
  (`ConfirmedSalePanel.tsx`). La confirmación vuelve a ofrecer sólo "Nueva
  venta" y "Ver detalle" — se restaura el texto "Nueva venta" (el que tenía
  antes de `add-frontend-success-stock-popups`) porque "Ahora no" sólo tenía
  sentido como respuesta a la oferta de inicializar stock que se elimina acá.
- Se elimina el código que ya no tiene consumidores:
  `canInitializeStockFromPos`, el cálculo de `productId` en
  `confirmedSale`/`getLastCartLineProductId` si queda sin otro uso, y sus
  tests asociados.
- **BREAKING (spec)**: modifica el requirement "Atomic sale confirmation" de
  `ui-pos` quitando toda mención a "Inicializar stock" y sus escenarios.

## Impact

- Affected specs: `ui-pos`
- Affected code: `src/components/pos/ConfirmedSalePanel.tsx`,
  `src/components/pos/PosView.tsx`, `src/lib/products.ts`,
  `src/lib/products.test.ts`
- No afecta backend ni contratos de API.
