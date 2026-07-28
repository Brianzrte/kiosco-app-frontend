# Backend request — add-frontend-user-roles-and-receiving

Todo lo de abajo **no existe hoy** en `../backend`. Nada se mockea. El cambio espejo que lo cubre es `../backend/openspec/changes/add-multi-role-and-receiving`; esta lista es el contrato mínimo que el frontend necesita, expresado desde la pantalla.

Verificado contra `../backend/internal/bootstrap/router.go`, `internal/identity/domain/user.go`, `internal/identity/application/update_user_profile.go` y `internal/purchasing/**` al 2026-07-28.

## 1. Identity — roles múltiples

| Necesidad | Estado hoy |
|---|---|
| `roles: string[]` en toda respuesta que devuelve un usuario (`GET /users`, `POST /users`, `PUT /users/{id}`) | `role` escalar (`domain.User.Role`) |
| `roles: string[]` en la respuesta de `POST /auth/login` | devuelve `role` |
| `GET /users/{id}` — detalle de un usuario | **no existe**; hoy sólo hay listado |
| `PUT /users/{id}/roles` con `{ roles: [...] }`, Admin, `422` si el conjunto viene vacío | **no existe**; `PUT /users/{id}` es sólo perfil, por diseño explícito |

Pedidos concretos:

- `role` escalar se mantiene deprecado una versión (primer rol del conjunto) para que el rollback del frontend sea posible.
- La invariante "no dejar el sistema sin ningún Admin activo" se valida en el backend y se rechaza con un `message` en español. El frontend no puede contar Admins activos sin inventarse una consulta.
- Un usuario siempre tiene al menos un rol.

## 2. Identity — rol `receiving`

Se necesita un cuarto rol con exactamente este alcance:

- **Sí**: `POST /inventory/stock`, `POST /inventory/stock/{product_id}/adjust`, lecturas de stock; `GET /purchase-orders`, `GET /purchase-orders/{id}`, recepción y edición de ítems.
- **No**: ninguna escritura de Catalog (productos, precios, categorías), `PATCH /inventory/stock/{id}/minimum`, `GET /inventory/valuation`, `POST /suppliers`, `POST /purchase-orders`, ningún `/reports/*`.

Este rol es la razón por la que los roles múltiples solos no alcanzan: darle `inventory` a un cajero le daría escritura sobre el catálogo.

**El nombre literal del rol (`receiving`) tiene que quedar fijado antes de implementar el frontend**: la UI descarta roles desconocidos, así que un nombre distinto hace desaparecer la sección sin error visible.

## 3. Purchasing — detalle de pedido

`GET /purchase-orders/{id}` — **no existe**. El listado devuelve cabeceras sin ítems.

Necesita devolver, además de la cabecera: proveedor, `ordered_at`, total, estado, y para cada ítem:

- `id`, `quantity`, `unit_cost`, `subtotal` (decimal string)
- `product_id` (nullable) **y `product_name`** — sin el nombre resuelto, el detalle tendría que hacer un `GET /products/{id}` por ítem, que es un N+1 en la pantalla que se usa con el repartidor esperando
- `description` (nullable): el texto libre del ítem no catalogado
- `removed_at`, `removed_by`, `removal_reason` (nullables): los ítems removidos se devuelven, no se ocultan
- Para un pedido recibido: `received_at`, `received_by` (nombre de usuario, no id) y `payment_method`

## 4. Purchasing — recepción con método de pago

`POST /purchase-orders/{id}/receive` existe pero recibe sólo el id del pedido y el del usuario (`receive_purchase_order.go`).

Necesita aceptar `{ "payment_method": "cash" | "transfer" | "account" }`, obligatorio, y persistirlo junto al usuario y el timestamp que ya guarda. `409` si ya está recibido (ya lo hace). El frontend muestra "efectivo", "transferencia" y "cuenta corriente".

## 5. Purchasing — ítem fuera del pedido

`POST /purchase-orders/{id}/items` — **no existe**.

- Body: `{ product_id?, description?, quantity, unit_cost }`, con `product_id` y `description` mutuamente excluyentes y exactamente uno presente.
- `description` cubre el caso en que el proveedor trae algo que no está en el catálogo. El ítem queda marcado como pendiente de alta por un Admin.
- Sólo sobre pedidos `PENDING`.
- El total del pedido se recalcula en el backend. El frontend no lo computa nunca.

## 6. Purchasing — baja de ítem con motivo

`DELETE /purchase-orders/{id}/items/{item_id}` — **no existe**.

- Body: `{ "reason": "..." }`, obligatorio y no vacío. Mismo criterio de auditoría que la anulación de un ítem en una venta.
- Baja **lógica**: el ítem se conserva con motivo, usuario y timestamp, y se sigue devolviendo en el detalle marcado como removido.
- Sólo sobre pedidos `PENDING`. El total se recalcula.

## 7. Purchasing — autorización

`registerPurchasingRoutes` exige hoy `admin` + `inventory`. Se necesita que **lectura, recepción y edición de ítems** acepten también `receiving`. La creación de pedidos y proveedores **no** cambia.

## 8. Inventory — autorización

`registerInventoryRoutes` exige hoy `admin` + `inventory`. Se necesita que `POST /inventory/stock`, `POST /inventory/stock/{product_id}/adjust` y las lecturas de stock acepten también `receiving`. `PATCH .../minimum` y `GET /inventory/valuation` no.

## 9. Sales — historial del cajero acotado al día

`GET /sales` fuerza hoy el `cashier_id` del cajero pero no acota la fecha. Se necesita que para un usuario cuyo permiso viene de `cashier` y no de `admin`, el rango se **recorte** al día en curso del servidor (no que se rechace la request).

El frontend deja de renderizar el selector de rango para ese caso. Si el backend decide rechazar en vez de recortar, avisar: cambia la pantalla.

## Pregunta abierta hacia el backend

**¿Un pedido recibido se puede corregir?** El frontend asume que `RECEIVED` es terminal y no ofrece edición. Si el kiosco necesita corregir un método de pago mal elegido, hace falta un flujo que ninguno de los dos cambios cubre.
