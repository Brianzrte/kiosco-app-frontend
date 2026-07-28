# Proposal: add-frontend-inventory-v15

## Why

Inventory concentra la mayor deuda de V1.5, y una parte de esa deuda ya es un defecto de producto en producción.

**El defecto:** `InventoryView.tsx:85` decide si un producto está en stock bajo con `quantity <= minimum_quantity`, una regla de negocio calculada en el cliente — justo lo que `CLAUDE.md` §1 prohíbe. Peor: como no existe forma de fijar `minimum_quantity`, la columna vale 0 para todos los productos, así que la alerta o no se dispara nunca o se dispara para todo lo que llegó a cero. La función de alerta de stock bajo está, en la práctica, muerta.

**Lo que rompe:** `add-inventory-v15` elimina `GET /api/v1/reports/stock/history`, que `ReportsView.tsx:224` consume hoy. El historial de movimientos se muda a Inventory, gana paginación, filtro por tipo, `product_id` opcional y el nombre de quien ejecutó el movimiento. Además `GET /inventory/stock` pasa de `offset` a `page`.

**Lo que falta:** fijar el mínimo por producto y ver de un vistazo qué está por debajo.

## What Changes

- **Fijar `minimum_quantity`** por producto vía `PATCH /api/v1/inventory/stock/{product_id}/minimum`. Es lo que convierte la columna muerta en una función real.
- **Delegar la definición de stock bajo al backend.** Se deja de calcular en el cliente: el listado se filtra con `low_stock_only=true` y se usa la marca que devuelve el backend. Un producto sin stock inicializado nunca es stock bajo.
- **Migrar el historial de movimientos** de `/reports/stock/history` a `GET /api/v1/inventory/movements`, y sacarlo de la pantalla de reportes: pasa a vivir en Inventory, que es donde el operador lo busca. Gana paginación, filtro por tipo y por producto, y la columna de quién lo ejecutó.
- **Migrar la paginación** del listado de stock de `offset` a `page`.
- Agregar el filtro por categoría al listado de stock, que el backend ahora soporta.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-inventory`: se agregan `Set minimum quantity`, `Low-stock view` y `Stock movement history`. `Stock view per product` deja de calcular el umbral en el cliente y pasa a reflejar la marca del backend.
- `ui-reports`: se retira `Stock movement history`, cedido a Inventory. **Especificado en `add-frontend-reports-v15`**; los dos changes deben desplegarse juntos.

## Impact

- Modificados: `src/components/inventory/InventoryView.tsx`, `src/components/reports/ReportsView.tsx` (retiro del historial), `src/lib/types.ts`.
- Nuevos: `src/components/inventory/MovementHistory.tsx`, `src/components/inventory/MinimumQuantityDialog.tsx`.
- **Depende de `add-inventory-v15` + `add-reporting-v15` (backend), que van juntos.** Este change debe desplegarse en el mismo release: antes, el historial nuevo no existe; después, el viejo ya no.
- **Respuesta a una pregunta abierta del backend:** `add-inventory-v15/design.md` pide verificar si algún cliente consume `/reports/stock/history` antes de borrarlo. **Sí: `ReportsView.tsx`.** No es un borrado invisible.
