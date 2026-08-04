## Contexto y necesidad

El frontend necesita registrar, ajustar y consultar stock de productos
`pesable` en kilogramos (hasta 3 decimales), y que la confirmación de venta
descuente ese stock al vender. Hoy el backend trata a los `pesable` como
productos sin stock por diseño explícito.

## Fecha y evidencia de verificación

Verificado el 2026-08-04 contra `../backend` en el estado actual del
repositorio (rama de trabajo, no un commit fijado):

- `db/migrations/013_fix_stock_and_movements.up.sql`: `stock.quantity` es
  `INTEGER` (constraint `stock_quantity_check CHECK (quantity >= 0)`),
  `stock.minimum_quantity` es `INTEGER NOT NULL DEFAULT 0`,
  `stock_movements.quantity_delta`/`previous_quantity`/`new_quantity` son
  `INTEGER`.
- `internal/inventory/transport/http/dto.go`: `initializeStockRequest.Quantity
  int`, `adjustStockRequest.QuantityDelta int`,
  `setMinimumQuantityRequest.MinimumQuantity int`, y las respuestas
  (`stockResponse`, `stockListItemResponse`, `movementListItemResponse`)
  exponen esos mismos campos como `int`.
- `internal/sales/domain/repository.go`: `StockCheckItem` (usado por
  `CheckAvailability`/`DecrementStock`/`IncrementStock`) tiene un campo
  `Quantity` entero.
- `internal/sales/application/confirm_sale.go`: `ConfirmSaleUseCase.Execute`
  construye `checkItems` **saltando explícitamente** cualquier línea de
  venta con peso positivo (`if item.Weight.IsPositive() { continue }`) antes
  de llamar a `CheckAvailability`/`DecrementStock` — es la implementación
  actual del Non-Goal "sin control de stock para pesables".

Ninguno de estos puntos acepta ni propaga un valor decimal hoy; no hay
ningún endpoint ni flag existente que ya soporte esto sin usar.

## Estado actual

- Los productos `pesable` no tienen ningún registro de stock nunca (no es
  que quede en `0`: no existe el flujo para crearlo desde la UI actual).
- El POS no llama a `GET /api/v1/inventory/stock/{product_id}` para un
  `pesable` (`src/components/pos/PosView.tsx`, `addToCart`).
- La confirmación de venta no descuenta nada de stock para una línea con
  peso, por diseño (`confirm_sale.go`, ver arriba).

## Contrato mínimo solicitado

1. **Migración de esquema**: `stock.quantity` y `stock.minimum_quantity`
   pasan a un tipo decimal con al menos 3 posiciones (ej.
   `NUMERIC(12,3)`), igual que `stock_movements.quantity_delta`,
   `previous_quantity` y `new_quantity`. Queda a criterio del backend si
   mantiene una restricción de "sólo entero" para filas de producto
   `unitario` (vía `CHECK` condicionado por `unit_type` del producto
   asociado, o vía validación en la capa de aplicación) — el frontend no
   necesita saber cuál de las dos, sólo que un `unitario` nunca reciba ni
   pueda guardar un valor fraccionario.
2. **DTOs de inventario** (`internal/inventory/transport/http/dto.go` y los
   casos de uso que los consumen) aceptan y devuelven decimal en vez de
   `int` para los mismos cuatro endpoints ya usados por el frontend:
   - `POST /api/v1/inventory/stock` — `{ product_id, quantity, reason }`
   - `POST /api/v1/inventory/stock/{product_id}/adjust` — `{ quantity_delta,
     reason }`
   - `PATCH /api/v1/inventory/stock/{product_id}/minimum` — `{
     minimum_quantity }`
   - Las respuestas de `GET /api/v1/inventory/stock`,
     `GET /api/v1/inventory/stock/{product_id}` y
     `GET /api/v1/inventory/movements` devuelven esos mismos campos como
     decimal.
   Método y path no cambian; sólo el tipo de los campos de cantidad.
3. **`StockCheckItem.Quantity`** (`internal/sales/domain/repository.go`) y
   su uso en `CheckAvailability`/`DecrementStock`/`IncrementStock` aceptan
   decimal, para poder representar peso.
4. **`ConfirmSaleUseCase.Execute`** deja de saltar las líneas con peso al
   construir `checkItems`: una línea `pesable` con peso positivo debe
   incluirse con su `weight` como la cantidad a verificar/descontar, en vez
   de la exclusión actual.
5. **Validación de rango**: mantener la regla ya vigente "no bajar de cero"
   para cualquier ajuste o descuento, ahora también para valores
   fraccionarios.

## Roles, scopes, errores y status

Sin cambios respecto de lo ya vigente hoy para estos mismos endpoints:
mismos roles (`inventory`/`admin` para stock, autorización de venta ya
existente para confirmar), mismos códigos de error
(`InsufficientStockError` extendido a `pesable` sin cambiar su forma ni su
status).

## Compatibilidad y rollout

- **No compatible con el frontend viejo sin el backend nuevo desplegado
  primero**: si el backend expone decimal antes de que el frontend lo
  consuma, el frontend viejo sigue funcionando igual (sigue mandando/leyendo
  enteros, que son un subconjunto válido de decimal).
- **El frontend nuevo no es compatible con el backend viejo**: si el
  frontend empieza a enviar un decimal fraccionario a un endpoint que
  todavía valida `int`, la request falla. Por eso el orden de despliegue es
  estrictamente backend → frontend (ver `design.md`, Migration Plan).
- Productos `pesable` existentes no requieren backfill de datos: seguirán
  resolviéndose como "sin registro de stock" (no inicializados) tras la
  migración, mismo estado que hoy.

## Impacto / bloqueo en el frontend

Ninguna tarea de implementación de este change (`tasks.md`) puede empezar
mientras este contrato no esté desplegado — tanto el diálogo de stock de
`/inventory` como la validación en `PosView` dependen de poder enviar y leer
cantidades decimales.

## Criterio de desbloqueo

Este change queda desbloqueado cuando, contra el ambiente de destino:

- `POST /api/v1/inventory/stock` acepta `{ product_id, quantity: "1.500",
  reason }` (o el tipo numérico decimal equivalente) para un producto
  `pesable` y lo persiste sin truncar.
- Un ajuste con `quantity_delta` fraccionario se aplica y el nuevo valor
  devuelto por `GET /api/v1/inventory/stock/{product_id}` refleja los
  decimales.
- Una venta confirmada con una línea `pesable` con peso descuenta ese peso
  del stock del producto (verificable comparando `quantity` antes/después de
  confirmar).

## Fuera de alcance

- No se pide ningún endpoint nuevo — el contrato existente se extiende, no
  se reemplaza.
- No se pide soporte para otra unidad que no sea kilogramos.
- No se pide backfill ni migración de datos de productos `pesable`
  existentes.
