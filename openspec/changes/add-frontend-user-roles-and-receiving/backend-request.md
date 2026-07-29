# Backend request — add-frontend-user-roles-and-receiving

El backend ya implementa este contrato en `../backend/openspec/changes/add-multi-role-and-receiving`. Esta lista deja documentada la forma final que consume el frontend.

Verificado contra `../backend/internal/bootstrap/router.go`, `internal/identity/domain/user.go`, `internal/identity/application/update_user_profile.go` y `internal/purchasing/**` al 2026-07-28.

## 1. Identity — roles múltiples

| Necesidad | Estado hoy |
|---|---|
| `roles: string[]` en toda respuesta que devuelve un usuario (`GET /users`, `POST /users`, `PUT /users/{id}`) | Implementado; `role` escalar sigue deprecado por compatibilidad. |
| `roles: string[]` en la respuesta de `POST /auth/login` | Implementado, junto al `role` escalar deprecado. |
| `GET /users/{id}` — detalle de un usuario | Implementado, sólo Admin. |
| `PUT /users/{id}/roles` con `{ roles: [...] }`, Admin, `422` si el conjunto viene vacío | Implementado; `PUT /users/{id}` sigue siendo sólo perfil. |

Pedidos concretos:

- `role` escalar se mantiene deprecado una versión (primer rol del conjunto) para que el rollback del frontend sea posible.
- La invariante "no dejar el sistema sin ningún Admin activo" se valida en el backend y se rechaza con un `message` en español. El frontend no puede contar Admins activos sin inventarse una consulta.
- Un usuario siempre tiene al menos un rol.

## 2. Identity — rol `receiving`

Se necesita un cuarto rol con exactamente este alcance:

- **Sí**: `POST /inventory/stock`, `POST /inventory/stock/{product_id}/adjust`, lecturas de stock; `GET /purchase-orders`, `GET /purchase-orders/{id}`, recepción y edición de ítems.
- **No**: ninguna escritura de Catalog (productos, precios, categorías), `PATCH /inventory/stock/{id}/minimum`, `GET /inventory/valuation`, `POST /suppliers`, `POST /purchase-orders`, ningún `/reports/*`.

Este rol es la razón por la que los roles múltiples solos no alcanzan: darle `inventory` a un cajero le daría escritura sobre el catálogo.

El nombre literal del rol es **`receiving`**: la UI debe usarlo sin traducción como valor de autorización.

## 3. Purchasing — detalle de pedido

`GET /purchase-orders/{id}` está implementado para `admin`, `inventory` y `receiving`; devuelve la cabecera, proveedor e ítems, incluidos los removidos. Devuelve `404` si no existe.

Necesita devolver, además de la cabecera: proveedor, `ordered_at`, total, estado, y para cada ítem:

- `id`, `quantity`, `unit_cost`, `subtotal` (decimal string)
- `product_id` (nullable) **y `product_name`** — sin el nombre resuelto, el detalle tendría que hacer un `GET /products/{id}` por ítem, que es un N+1 en la pantalla que se usa con el repartidor esperando
- `description` (nullable): el texto libre del ítem no catalogado
- `removed_at`, `removed_by`, `removal_reason` (nullables): los ítems removidos se devuelven, no se ocultan
- Para un pedido recibido: `received_at`, `received_by` (id), `received_by_name` (nombre de usuario) y `payment_method`.

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

## 10. Sales — resumen operativo diario del cajero

**Necesidad de usuario:** mientras cobra, el cajero necesita un pantallazo de
lo vendido durante su turno para seguir el total y el desglose por medio de
pago, sin acceso a reportes ni a las ventas de otras personas.

**Estado original verificado al 2026-07-29:** `GET /reports/sales/summary` existe, pero
`registerReportingRoutes` monta todo `/api/v1/reports/` detrás de
`RequireRole(admin)`. Además, su caso de uso acepta un rango arbitrario y sus
consultas agregan todas las ventas confirmadas; abrir ese endpoint a `cashier`
expondría información fuera de su scope.

Se solicitó un endpoint operativo nuevo, separado de Reporting:

```text
GET /api/v1/sales/today-summary
```

### Contrato mínimo solicitado

- **Autorización:** `cashier`; un usuario con varios roles conserva los scopes
  que el backend determine, pero la respuesta de este endpoint siempre se
  calcula sobre el usuario autenticado, nunca sobre un `cashier_id` recibido
  por query o body.
- **Scope:** sólo ventas `confirmed` del cajero autenticado en el día de negocio
  actual definido por el backend. No acepta parámetros de fecha, rango,
  usuario ni filtro que permitan ampliar ese scope.
- **Respuesta `200`:** reutiliza la forma agregada ya usada por las cards,
  con decimales como strings:

  ```json
  {
    "total_sales": 12,
    "total_amount": "24500.00",
    "by_payment_method": [
      { "method": "CASH", "sale_count": 8, "total_amount": "15000.00" },
      { "method": "CARD", "sale_count": 4, "total_amount": "9500.00" }
    ]
  }
  ```

  Si no hubo ventas, responde `200` con `total_sales: 0`, `total_amount:
  "0.00"` y un desglose vacío o con ceros, como el resumen actual.
- **Errores:** `401` para sesión ausente o vencida; `403` para un rol sin
  permiso; cualquier otro error mantiene el formato `{ "message": "..." }`.

### Estado posterior y desbloqueo

El código del backend ahora registra la ruta en
`registerCashierTodaySummaryRoute`, la protege con `RequireRole(cashier)` y el
spec backend archivado `add-cashier-today-summary` describe el mismo contrato.
`GET /reports/sales/summary` sigue Admin-only para el cierre de caja y los
reportes. Falta verificar el despliegue contra una instancia real antes de que
el frontend la consuma; no puede derivar los totales desde el listado paginado
de ventas.

Desbloquea la integración cuando una instancia real responda el contrato para
un cajero con ventas propias, no devuelva ventas ajenas, respete el día de
negocio del backend y devuelva `403` a un usuario sin `cashier`.

## Pregunta abierta hacia el backend

**¿Un pedido recibido se puede corregir?** El frontend asume que `RECEIVED` es terminal y no ofrece edición. Si el kiosco necesita corregir un método de pago mal elegido, hace falta un flujo que ninguno de los dos cambios cubre.
