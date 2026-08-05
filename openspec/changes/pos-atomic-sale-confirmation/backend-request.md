# Solicitud de contrato backend: confirmación de venta atómica

Actualizado: 2026-08-04. Este documento describe una necesidad todavía **no implementada** en el backend; ninguna parte del frontend descripta en `design.md` se implementa o mockea hasta que esta solicitud se despliegue y se verifique contra una instancia real.

## Contexto y necesidad de usuario

El cajero confirma una venta con un carrito y un medio de pago ya completos. Hoy esa confirmación es una secuencia de hasta 4 llamadas HTTP independientes desde el frontend (`POST /sales`, N × `POST /sales/{id}/items`, `PUT /sales/{id}/payment`, `POST /sales/{id}/confirm`); si cualquiera de ellas falla y el cajero no reintenta (cierra la pestaña, navega a otra pantalla), la venta queda en estado `draft` en el backend, sin ítems o sin pago, sin que nadie la complete ni la descarte. Esta sesión reprodujo dos veces un `500` real de `POST /sales/{id}/confirm` contra el backend local: la clase de falla que motiva este pedido ocurre de verdad, no es hipotética.

## Evidencia consultada (2026-08-04)

- `../backend/internal/sales/application/create_sale.go:20`: `CreateSaleUseCase.Execute(ctx, cashierID)` no acepta ítems ni pago — crea la venta vacía en `draft`.
- `../backend/internal/sales/application/add_item.go`, `register_payments.go`, `confirm_sale.go` (por nombre de archivo, no abiertos en detalle): pasos separados, cada uno una llamada HTTP propia según `../backend/internal/sales/transport/http/routes.go:11-17`.
- `../backend/internal/sales/transport/http/routes.go`: no existe ningún endpoint que combine creación + ítems + pago + confirmación en una sola llamada.
- `../backend/internal/sales/application/register_payments.go:60-70`: `RegisterPaymentsUseCase.Execute` ya envuelve su escritura en `postgres.WithinTx` — el backend ya usa transacciones para operaciones individuales; no hay evidencia de una transacción que abarque los 4 pasos juntos.
- `src/lib/posSaleSubmission.ts`, `src/components/pos/PosView.tsx` (`confirmSale`): implementación actual del lado frontend, con la guarda de retención de `sale.id` entre reintentos (`improve-pos-checkout-flow`, Decisión 12) que este pedido busca volver innecesaria.

## Estado actual verificado

- `POST /sales` crea una venta `draft` vacía, sin ítems ni pago.
- Cada ítem se agrega con una llamada `POST /sales/{id}/items` independiente.
- El pago se registra con `PUT /sales/{id}/payment`, que **reemplaza** el conjunto completo de pagos de la venta (no acumula).
- `POST /sales/{id}/confirm` es el paso final; hoy es donde se descubre, por ejemplo, un stock insuficiente (rechazo `409`).
- No existe ningún mecanismo que agrupe estos 4 pasos en una única transacción de base de datos ni en una única llamada HTTP.

## Contrato mínimo solicitado

### 1. Operación de confirmación atómica

Un contrato (endpoint nuevo, o `POST /sales` ampliado — la forma exacta queda a elección de backend) que reciba en una sola llamada:

- los ítems de la venta, en la misma forma que hoy recibe cada `POST /sales/{id}/items` (por línea: `product_id` + `quantity` para `unitario`, o `product_id` + `weight` + `actual_price` opcional para `pesable`);
- el o los pagos, en la misma forma que hoy recibe `PUT /sales/{id}/payment` (`payments: [{ method, amount }]`, sin límite de longitud, cualquier combinación de `CASH`/`CARD`/`TRANSFER`);

y que cree la venta, sus ítems y su pago, y la confirme, todo dentro de una única transacción de base de datos: si cualquier paso falla (ítem inválido, producto inactivo, stock insuficiente, pago desbalanceado), **ningún** registro (venta, ítem o pago) debe persistir.

### 2. Respuesta de éxito

Se solicita que la respuesta de éxito mantenga la misma forma que hoy devuelve `POST /sales/{id}/confirm` (`Sale`: `id`, `sale_number`, `total`, `items`, `payments`, `confirmed_at`, etc.), para minimizar el cambio de tipos del lado del frontend. Si backend prefiere una forma distinta, debe documentarla explícitamente.

### 3. Error de stock insuficiente identifica la línea afectada

`ui-pos` (spec vigente, `improve-pos-checkout-flow`) exige que un motivo de bloqueo por stock nombre la línea/producto afectado. Si la operación atómica descubre stock insuficiente dentro de la transacción, el error devuelto debe permitir identificar qué producto lo causó (por ejemplo, incluyendo el `product_id` o el nombre en el `{ message }`, o un campo estructurado adicional — a elección de backend, pero debe ser posible para el frontend mostrar cuál línea).

### 4. Compatibilidad con el flujo de 4 pasos actual

**Ambigüedad de negocio a resolver por backend:** ¿el contrato atómico reemplaza por completo los 4 endpoints actuales (`POST /sales`, `POST /sales/{id}/items`, `PUT /sales/{id}/payment`, `POST /sales/{id}/confirm` quedan deprecados para el flujo de confirmación normal), o conviven — por ejemplo, para permitir que un cajero arme un carrito incrementalmente contra el backend antes de confirmar? El frontend no asume ninguna de las dos opciones; backend decide y lo documenta, y el frontend implementa contra lo que se confirme.

## Roles y errores

Sin cambios de rol: la confirmación de venta sigue sin `RequireRole` propio — cualquier sesión autenticada, con ownership verificado en el caso de uso (mismo criterio que las rutas actuales de `Sales`, ver comentario en `../backend/internal/bootstrap/router.go:192-197`). Los errores siguen el envelope `{ message }` vigente; se solicita mantener la distinción ya normativa entre `403` (sesión sin permiso, no aplica aquí porque no hay scope por rol) y el resto de los rechazos de negocio (`{ message }` mostrado tal cual, con acción "Reintentar").

## Compatibilidad y rollout

1. Backend implementa y despliega la operación atómica en una instancia verificable, incluyendo su tratamiento de error de stock insuficiente con línea identificable.
2. Backend documenta si los 4 endpoints actuales quedan deprecados o siguen disponibles en paralelo (punto 4 del contrato mínimo).
3. El frontend previo (que sigue usando los 4 pasos) continúa funcionando sin cambios mientras esos endpoints sigan desplegados, sea cual sea la decisión del punto 2 — este pedido no rompe el frontend actual hasta que el change frontend se implemente explícitamente contra el contrato nuevo.

## Impacto y bloqueo en el frontend

Bloquea por completo la implementación de:

- `src/lib/posSaleSubmission.ts` (secuencia simplificada a una sola llamada).
- `src/components/pos/PosView.tsx` (`confirmSale()`).
- `src/lib/posSaleSubmission.test.ts` (tests de la guarda anti-duplicado actual, a reemplazar).
- Posiblemente `src/lib/types.ts` (`Sale`), si la respuesta final difiere de la actual.

Ninguna de estas superficies se implementa ni se mockea contra un contrato no confirmado.

## Criterio de desbloqueo frontend

Una instancia backend accesible:

1. acepta la operación atómica con ítems + pago y confirma la venta en una sola transacción;
2. no persiste ningún registro parcial (venta, ítem o pago) cuando la operación falla en cualquier paso interno;
3. devuelve, en éxito, un `Sale` con la forma acordada (idealmente igual a la actual de `POST /sales/{id}/confirm`);
4. devuelve, en un rechazo por stock insuficiente, un error que permite identificar la línea/producto afectado;
5. documenta si los 4 endpoints actuales quedan deprecados o conviven con la operación nueva.

## Fuera de alcance

- Recuperación de drafts huérfanos ya existentes (creados antes de este cambio, con los 4 endpoints actuales) — cubierto por el change `pos-draft-recovery-and-stock-in-product`, backend-request aparte.
- Cambiar roles, scopes o el envelope de error `{ message }` ya vigente.
- Pago dividido de más de 2 tramos o con Transferencia desde la UI — el backend ya lo acepta (`RegisterPaymentsUseCase` sin límite de longitud), pero ese es un change frontend-only aparte, sin backend-request.
- Búsqueda server-side de productos o `stock` en la respuesta de producto — sin relación con este pedido.
