## Context

Hoy hay dos tipos de producto (`unit_type`): `unitario`, con stock en
unidades enteras ya soportado íntegramente (`ui-inventory`, `ui-pos`), y
`pesable`, vendido por peso (`price_per_kg`) que **no tiene ningún control de
stock**. Esa ausencia es una decisión de producto explícita, no un olvido:
`openspec/changes/archive/2026-07-31-add-frontend-product-weight-based-pricing/design.md`
la registra como Non-Goal ("Control de stock/inventario para productos
pesables. El POS no valida disponibilidad para ellos"), y el backend Go
implementa esa misma decisión — `ConfirmSaleUseCase.Execute`
(`../backend/internal/sales/application/confirm_sale.go`) construye la lista
de ítems a verificar/descontar de stock saltando explícitamente cualquier
línea con peso (`if item.Weight.IsPositive() { continue }`).

Este change revierte esa decisión: el usuario decidió explícitamente
implementar el feature completo (inventario + validación en POS) pese al
tamaño del cambio, en vez de una versión acotada sólo a inventario.

El resto de la infraestructura de peso decimal ya existe y se reutiliza:
`src/lib/weightPricing.ts` valida pesos de hasta 3 decimales
(`isValidWeight`) y calcula precios de línea a partir de peso × precio/kg,
usado hoy sólo en el carrito del POS, nunca en stock.

## Goals / Non-Goals

**Goals:**

- Permitir inicializar, ajustar (con motivo obligatorio) y consultar stock de
  un producto `pesable` en kilogramos, con hasta 3 decimales — mismo nivel de
  precisión que ya usa el peso en el carrito.
- Permitir definir un umbral mínimo en kg para alertar stock bajo, igual que
  ya existe para `unitario`.
- Mostrar el historial de movimientos de un `pesable` con esa misma
  precisión, sin truncar a entero.
- Que el POS valide y cap-ee el peso vendido de un `pesable` contra el stock
  disponible, con el mismo criterio ya vigente para `unitario`: stock
  desconocido (sin registro) nunca bloquea la venta; stock insuficiente sí.
- No cambiar nada del comportamiento ya vigente para `unitario`.

**Non-Goals:**

- Devolver una línea `pesable` desde `ReturnForm.tsx` — sigue diferido, sin
  evidencia de que este pedido lo reabra.
- Cualquier unidad de peso distinta de kilogramos.
- Reportes nuevos o modificados específicos de stock pesable.
- Migrar datos de productos `pesable` existentes — quedan "no inicializados"
  tras el despliegue, mismo estado que cualquier producto sin stock hoy.
- Resolver la coordinación con el "stock de dos niveles" de
  `add-frontend-product-unit-sale-catalog` (paquete + unidad suelta,
  `unit_type: unitario`) — dominio distinto, sin overlap de código.
- Introducir una librería nueva: la validación decimal reutiliza el patrón
  entero-en-milésimas ya usado por `weightPricing.ts`.

## User flow

1. Un producto `pesable` recién creado aparece en `/inventory` como "no
   inicializado" (mismo estado y mismo componente que hoy para cualquier
   producto sin stock).
2. `inventory`/`admin` abre "Gestionar stock" e inicializa la cantidad en kg
   (ej. `"12.500"`), con el mismo campo de texto que hoy usa enteros, pero
   validado y formateado como peso.
3. El listado y el historial reflejan esa cantidad con precisión decimal.
4. Un cajero escanea o busca el producto `pesable` en el POS y pesa la
   mercadería. Al ingresar el peso:
   - Si el producto tiene stock inicializado y el peso pedido excede el
     disponible, se bloquea el agregado/incremento con un mensaje análogo al
     que ya existe para `unitario` sin stock suficiente.
   - Si el producto no tiene stock inicializado todavía, la venta continúa
     sin bloqueo (mismo criterio que hoy para `unitario` con stock
     desconocido).
5. Al confirmar la venta, el backend descuenta el peso vendido del stock del
   `pesable` (hoy no descuenta nada; ver `backend-request.md`).
6. Ajustes manuales, mínimo y movimientos de un `pesable` se operan desde
   `/inventory` exactamente como ya se opera un `unitario`, sólo que en kg.

## UI states

Reutiliza los cuatro estados ya normativos de `ui-inventory` (no inicializado
/ inicializado en cero / bajo mínimo / normal) sin agregar ninguno nuevo — la
única extensión es que "cero" para un `pesable` es `0.000`, no `0`, y que el
formato de entrada/visualización acepta decimales. En el POS, el estado de
bloqueo por stock insuficiente ya existe para `unitario`
(`ui-pos`, "Cart quantity respects stock") y se extiende a `pesable` con el
mismo patrón visual (mensaje de texto, no sólo color).

## Decisions

1. **Se revierte el Non-Goal de `weight-based-pricing` por decisión explícita
   del usuario, con el alcance completo (inventario + POS).**
   La alternativa angosta (sólo inventario, sin bloqueo en POS) fue
   presentada como opción durante el análisis; el usuario eligió el feature
   completo pese al tamaño. No se implementa parcialmente ni se degrada a la
   opción angosta sin una nueva decisión explícita.

2. **La precisión decimal de stock para `pesable` es de 3 decimales,
   consistente con `isValidWeight` (`lib/weightPricing.ts`), no con los 2
   decimales de dinero.**
   El stock se mide en kilogramos, no en pesos; reutilizar el mismo criterio
   de precisión que ya usa el peso del carrito evita introducir una segunda
   convención de redondeo para el mismo tipo de magnitud. Aplica tanto a
   `quantity` como a `minimum_quantity`.

3. **`unitario` no cambia de tipo ni de comportamiento.** La columna/campo de
   cantidad pasa a aceptar decimales a nivel de contrato, pero el frontend
   sigue enviando/mostrando enteros para `unitario` — no se relaja ninguna
   validación existente para ese tipo. La distinción por `unit_type` vive en
   el frontend (qué formato de input mostrar) y, del lado backend, en la
   validación del DTO (ver `backend-request.md`).

4. **El helper de validación de stock en kg vive en `src/lib/inventory.ts` y
   reutiliza `isValidWeight` de `weightPricing.ts`**, en vez de duplicar la
   regex de 3 decimales. El mensaje de "stock insuficiente" en kg es nuevo
   (análogo a `stockLimitMessage` de `PosView`, pero para peso), porque el
   texto es específico del dominio de cada pantalla.

## Accessibility

- El mensaje de stock insuficiente para un `pesable` sigue el mismo patrón
  textual (no sólo color) que ya usa `stockLimitMessage` para `unitario`.
- Los campos de cantidad en los diálogos de inventario mantienen su `label`
  visible existente; el placeholder/ayuda aclara la unidad (kg) cuando el
  producto es `pesable`, siguiendo el mismo patrón de ayuda inline que ya usa
  el mínimo ("0 desactiva la alerta").
- No se introduce ningún estado nuevo que dependa sólo de color.

## Keyboard and focus behavior

Sin cambios de patrón: los campos de cantidad en `/inventory` y el input de
peso en el POS (`data-weight-input`, `data-pending-weight`) ya son inputs de
texto estándar operables por teclado; esta extensión sólo cambia su
validación/formato, no su manejo de foco.

## Responsive behavior

Sin cambios de layout en ninguna de las dos pantallas — mismos campos,
distinta validación/formato numérico.

## API contract

Mismos endpoints que ya consume `ui-inventory` hoy, con el body/response
extendido a decimal (ver `backend-request.md` para el contrato exacto
pedido):

- `POST /api/v1/inventory/stock`
- `GET /api/v1/inventory/stock`, `GET /api/v1/inventory/stock/{product_id}`
- `POST /api/v1/inventory/stock/{product_id}/adjust`
- `PATCH /api/v1/inventory/stock/{product_id}/minimum`
- `GET /api/v1/inventory/movements`

Ningún endpoint nuevo. El flujo de venta (`POST /api/v1/sales/{id}/confirm`)
no cambia de contrato observable para el frontend — el descuento de stock
para `pesable` pasa a ocurrir server-side, sin que el frontend deba enviar
nada adicional.

## Error handling

- Backend rechaza un ajuste que llevaría el stock a negativo: mismo mecanismo
  ya normativo en `ui-inventory` ("Backend rejects adjustment"), sin cambio,
  sólo con precisión decimal.
- Backend rechaza la confirmación de una venta por stock insuficiente
  (`InsufficientStockError`, ya usado hoy para `unitario`): se extiende a
  `pesable`, mismo mensaje mostrado por el POS que ya existe para esa
  respuesta.
- Un peso inválido tipeado en el diálogo de stock (más de 3 decimales, `0`,
  negativo) se rechaza en el cliente con el mismo texto que ya usa
  `applyWeight` en el POS ("Ingresá un peso mayor a cero con hasta tres
  decimales."), sin llegar a pegarle al backend.

## Backend coordination

Dependencia dura documentada en `backend-request.md`: cambio de tipo de
columna (`INTEGER` → decimal) en `stock`/`stock_movements`, DTOs que hoy
validan `int`, y la exclusión explícita de líneas con peso en
`ConfirmSaleUseCase.Execute` que debe revertirse. No se implementa ninguna
tarea de UI hasta que ese contrato esté desplegado.

## Risks / Trade-offs

- [Cambio grande, un solo change] Tocar inventario y POS a la vez en un
  único change aumenta el radio de blast si algo sale mal. → Mitigado porque
  todo el comportamiento de `unitario` queda sin cambios (mismo código,
  misma rama condicional por `unit_type`), y porque el bloqueo por
  `backend-request.md` obliga a un despliegue coordinado en vez de un
  frontend a medio camino.
- [Precisión de punto flotante en JS] `Stock.quantity` es un `number` de
  TypeScript; sumar/restar decimales de kg en JS puede acumular error de
  punto flotante igual que ya le pasa a cualquier cálculo de peso. →
  Mitigado reusando el mismo patrón entero-en-milésimas
  (`parseWeightThousandths`) que ya usa `weightPricing.ts` para evitar
  aritmética de punto flotante directa sobre los kg.
- [Reversión de una decisión ya comunicada/documentada] Si alguien lee el
  `design.md` archivado de `weight-based-pricing` esperando que los pesables
  nunca tengan stock, este change contradice esa expectativa. → Mitigado
  citando explícitamente la reversión en el proposal y en este documento, en
  vez de modificarlo en silencio.

## Migration Plan

Requiere orden de despliegue backend → frontend: la migración de columna y
los DTOs decimales deben estar en producción antes de que el frontend
empiece a inicializar/mostrar stock de `pesable` y a validar contra él en el
POS. Desplegar el frontend antes rompería: el diálogo de inventario
intentaría enviar un decimal a un endpoint que todavía valida `int`. Los
productos `pesable` existentes no requieren migración de datos: quedan "no
inicializados", mismo estado que cualquier producto nuevo sin stock.

## Rollback

Revertir el frontend restaura el comportamiento actual (pesables sin control
de stock, POS sin validarlos) sin ningún dato persistido que deshacer del
lado frontend. Si el backend ya migró la columna a decimal y se necesita
revertir también ese lado, es responsabilidad de ese equipo/change — este
`design.md` no prescribe el rollback del backend.

## Open Questions

- Precisión de `minimum_quantity` para `pesable`: se fijó en 3 decimales por
  consistencia con la cantidad (Decision 2), pero podría preferirse un
  umbral más grueso (ej. medio kilo) — no bloqueante, ajustable en
  implementación si el usuario lo pide.
- Si `unit_type` es editable post-creación con stock ya cargado (conversión
  `unitario`↔`pesable`): sin evidencia de que el formulario lo permita hoy;
  si no lo permite, no aplica.
