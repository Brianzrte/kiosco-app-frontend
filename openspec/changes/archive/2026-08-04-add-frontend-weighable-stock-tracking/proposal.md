## Why

Los productos `pesable` (fiambre, verdura, a granel) hoy no tienen ningún
control de stock: el change `add-frontend-product-weight-based-pricing`
(archivado) dejó explícitamente afuera "control de stock/inventario para
productos pesables" como Non-Goal, y el POS ni siquiera consulta
disponibilidad para ellos. En la práctica esto significa que nadie sabe
cuánto queda de un producto pesable hasta pesarlo físicamente, y un cajero
puede vender más de lo que hay en el mostrador sin ningún aviso. Este change
revierte esa decisión: habilita inicializar, ajustar, consultar y validar
stock de pesables en kilogramos, igual que ya existe para productos
`unitario` en unidades.

## What Changes

- El diálogo de "Gestionar stock" en `/inventory` acepta cantidades en
  kilogramos con hasta 3 decimales (mismo formato que ya usa el peso en el
  carrito del POS) para productos `pesable`, en vez de únicamente enteros:
  inicialización, ajuste manual (entrada/salida, con motivo obligatorio) y
  umbral mínimo.
- El listado de stock y el historial de movimientos muestran la cantidad de
  un producto `pesable` con esa misma precisión decimal, sin truncarla a
  entero.
- **BREAKING (comportamiento de POS)**: agregar o incrementar el peso de un
  producto `pesable` en el carrito del POS pasa a consultar y cap-ear contra
  el stock disponible, igual que ya hace un producto `unitario` — revierte el
  requirement vigente "Weighable products are not checked against stock" de
  `ui-pos`. Un producto pesable sin stock inicializado todavía no bloquea la
  venta (mismo criterio ya vigente para `unitario`: "stock desconocido nunca
  bloquea un escaneo").
- **BREAKING (backend)**: este change depende de un contrato que el backend
  no expone hoy — `product_stock.quantity`/`minimum_quantity` y los campos
  equivalentes de movimientos son `INTEGER` en la base actual, y ningún DTO
  acepta decimales. Ver `backend-request.md`. No es implementable hasta que
  ese contrato exista y esté desplegado.

Fuera de alcance:

- Devolver una línea `pesable` desde `ReturnForm.tsx` — sigue diferido, sin
  cambios respecto de la decisión ya tomada en `weight-based-pricing`.
- Cualquier unidad de peso distinta de kilogramos.
- Reportes nuevos o modificados específicos de stock pesable; si
  `GET /inventory/valuation` ya incluye esas filas una vez que tengan stock,
  el frontend no necesita cambio propio.
- Migración de datos de productos `pesable` existentes: quedan "no
  inicializados" tras el despliegue, igual que cualquier producto nuevo sin
  stock.
- Coordinación con el stock de dos niveles (paquete + unidad suelta) que
  anota como trabajo futuro el change abierto
  `add-frontend-product-unit-sale-catalog` — afecta `unit_type: unitario`,
  terreno distinto sin overlap de código identificado.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-inventory`: los requirements "Initialize stock", "Manual stock
  adjustment requires a reason", "Set minimum quantity" y "Stock movement
  history" pasan a admitir cantidades decimales (kg, 3 decimales) para
  productos `pesable`, conservando el comportamiento entero existente para
  `unitario`.
- `ui-pos`: el requirement "Weighable products are not checked against
  stock" se reemplaza — un producto `pesable` con stock inicializado pasa a
  validarse y cap-earse contra el disponible, con el mismo criterio que ya
  aplica a `unitario` (stock desconocido no bloquea).

## Impact

- `src/components/inventory/InventoryView.tsx`: diálogos de
  inicialización/ajuste/mínimo dejan de asumir `parseInt`/enteros para
  `pesable`; listado y panel de movimientos formatean cantidad en kg cuando
  corresponde.
- `src/components/pos/PosView.tsx`: `availableStock`, `addToCart`,
  `beginWeightEntry`, `applyWeight` y `updateLineWeight` empiezan a
  consultar y cap-ear stock para `pesable`.
- `src/lib/inventory.ts`: helper puro de validación/formateo de cantidad en
  kg para stock, reusando el patrón ya existente en
  `src/lib/weightPricing.ts`.
- Backend: dependencia dura de contrato y de despliegue, documentada en
  `backend-request.md`. Sin ella, ninguna tarea de implementación puede
  ejecutarse.
