# Contrato backend verificado: proveedores, compras, pagos, planificación y recepción atómica

Actualizado: 2026-07-30. La fuente de verdad es el backend implementado y sus specs vigentes.

## Evidencia de código

- `../backend/internal/bootstrap/router.go`: define los métodos, paths y gates de rol.
- `../backend/internal/purchasing/transport/http/dto.go`: define request/response y nullabilidad de Purchasing.
- `../backend/openspec/specs/purchasing/spec.md` y `../backend/openspec/specs/reporting/spec.md`: describen la recepción atómica, pago único y reporte agregado.

## Contrato que debe consumir el frontend

| Área | Path y roles | Contrato relevante |
|---|---|---|
| Proveedores | `GET /suppliers`: Admin, Inventory, Receiving; `POST /suppliers`, `PUT /suppliers/{id}`, `PATCH /suppliers/{id}/deactivate`: Admin, Inventory | Supplier: `id`, `name`, `active`. La desactivación es lógica. |
| Asociaciones | `GET`/`PUT /products/{id}/suppliers`: Admin, Inventory | Lista `suppliers` con `product_id`, `supplier_id`, `preferred` y `replenishment_frequency_days` nullable. |
| Pedidos | `GET /purchase-orders`, `GET /purchase-orders/{id}`, recepción y edición de ítems: Admin, Inventory, Receiving; creación y sugerencias: Admin, Inventory | Total, subtotal y costo son strings decimales; `ordered_at` y timestamps usan RFC3339. |
| Sugerencias | `GET /purchase-orders/suggestions`: Admin, Inventory | El backend devuelve `suggestions`; el frontend sólo presenta y permite revisar la propuesta. |
| Pago único | `POST /purchase-orders/{id}/payment`: Admin, Cashier | Body: `amount` decimal y `payment_method` `cash` o `transfer`. Sólo admite un pago completo de un pedido recibido a cuenta corriente; no hay asignaciones ni saldo. |
| Reporte | `GET /reports/purchases/by-supplier`: Admin | Requiere `from` y `to` (`YYYY-MM-DD`) y acepta `supplier_id`; devuelve inversión decimal, conteos de pedidos/entregas y productos no entregados. |
| Recepción | `POST /purchase-orders/{id}/receive`: Admin, Inventory, Receiving | Body: `payment_method` (`cash`, `transfer`, `account`) e ítems con `item_id`, `received_quantity` y motivo nullable. Es atómica con stock y movimiento `PURCHASE`; puede devolver `RECEIVED` o `CANCELLED`. |

## Restricciones de implementación

- No calcular ni presentar saldos, pagos parciales o asignaciones entre pedidos: el backend no los ofrece.
- Un pedido recibido con `cash` o `transfer` ya tiene su pago registrado; sólo los pedidos recibidos con `account` pueden mostrar la acción de pago pendiente.
- `inventory` no registra pagos; `cashier` no accede a navegación de gestión de proveedores o pedidos, pero puede ejecutar la acción de pago autorizada desde un pedido elegible.
- Los errores siguen el envelope `{ message }`; los conflictos de recepción/pago y validaciones se muestran sin asumir éxito.

## Compatibilidad y rollout

1. Desplegar el backend que contiene estos contratos y confirmar contra una instancia roles múltiples y `receiving`.
2. Verificar autorización, shape, nullabilidad, mensajes y transacción real antes de habilitar el frontend.
3. Comunicar el cambio operativo: una recepción confirmada ya carga stock; no se repite el ajuste manual para esas unidades.

## Criterio de desbloqueo frontend

Una instancia accesible devuelve los contratos documentados, rechaza los permisos y estados inválidos con status/mensaje verificables y demuestra que una recepción exitosa crea movimientos y actualiza stock, mientras un fallo no cambia ni pedido ni stock.
