# Solicitud de contrato backend: pedido sin proveedor y lista de compra priorizada

Actualizado: 2026-08-07. Este documento describe una necesidad todavía **no implementada** en el backend para el pedido sin proveedor y la lista de compra priorizada. Esas partes del frontend no se implementan ni mockean hasta que esta solicitud se despliegue y se verifique contra una instancia real.

## Contexto y necesidad de usuario

Admin e Inventory necesitan registrar compras ocasionales o de proveedores no dados de alta sin perder la auditoría del pedido en el sistema. Antes de crear ese pedido necesitan una lista útil para decidir qué comprar: productos con riesgo de quiebre ordenados por ventas confirmadas de los últimos 7 días frente al stock actual. Si eligen proveedor, necesitan la misma lista acotada a cualquier asociación producto-proveedor, no sólo la preferida. Ninguno de estos comportamientos es posible contra el backend desplegado hoy.

## Evidencia consultada (2026-07-30)

- `../backend/internal/purchasing/transport/http/dto.go`:
  - `createPurchaseOrderRequest.SupplierID` tiene `validate:"required"` (línea 76).
  - `purchaseOrderResponse.SupplierID` (línea 133), `purchaseOrderDetailResponse.SupplierID`/`SupplierName` (líneas 189–190) y `purchaseOrderListItemResponse.SupplierName` (línea 230) son `string` no nullable, sin `omitempty`.
- `../backend/internal/purchasing/application/list_replenishment_suggestions.go:15`: `Execute(ctx)` no acepta ningún parámetro.
- `../backend/internal/purchasing/infrastructure/postgres_replenishment_suggestions.go:29`: el único join con proveedor es `LEFT JOIN product_suppliers ps ON ps.product_id = p.id AND ps.preferred AND EXISTS (... sup.active)`, exclusivamente sobre el proveedor preferido activo.
- `../backend/internal/reporting/application/purchases_by_supplier.go`: `PurchasesBySupplierInput.SupplierID` ya es un filtro opcional (`strings.TrimSpace` vacío ⇒ `nil`), pero la consulta agrupa exclusivamente por proveedor: no hay evidencia de un tratamiento explícito para pedidos sin proveedor una vez que existan.
- `../backend/internal/bootstrap/router.go:183-184`: `POST /purchase-orders` y `GET /purchase-orders/suggestions` usan `creationWrapped` (Admin, Inventory); ningún cambio de rol se solicita en este documento.

## Estado actual verificado

- `POST /purchase-orders` rechaza cualquier request sin `supplier_id`.
- Las respuestas de pedido (creación, detalle, listado) siempre devuelven `supplier_id`/`supplier_name` como string no vacío, porque el dominio no admite hoy un pedido sin proveedor.
- `GET /purchase-orders/suggestions` no tiene forma de acotar la respuesta a un proveedor, ni siquiera considerando sólo el preferido.
- La respuesta vigente no expone ventas de una ventana fija, stock actual ni días de cobertura, y sólo calcula cantidad para un proveedor preferido con frecuencia configurada; no alcanza para ordenar una compra sin proveedor por riesgo de quiebre.
- `GET /reports/purchases/by-supplier` ya acepta `supplier_id` opcional, pero no hay pedidos sin proveedor en el dominio actual, por lo que no existe comportamiento definido para ese caso.

## Contrato mínimo solicitado

### 1. Creación de pedido sin proveedor

`POST /purchase-orders`: aceptar `supplier_id` ausente o `null` en el body. El pedido se crea igual, queda `PENDING` y sin proveedor asociado. Forma exacta (campo omitido vs. `null` explícito) queda a definición de backend; el frontend se adapta a la que se documente.

### 2. Respuestas de pedido con proveedor nullable

`purchaseOrderResponse.SupplierID`, `purchaseOrderDetailResponse.SupplierID`/`SupplierName` y `purchaseOrderListItemResponse.SupplierName` deben poder ser `null` cuando el pedido no tiene proveedor asociado, en creación, detalle y listado/historial.

### 3. Lista de compra priorizada y acotada por cualquier proveedor asociado

`GET /purchase-orders/suggestions` debe aceptar `supplier_id` opcional. Sin ese parámetro, debe devolver los productos activos que requieren reposición, ordenados por menor cobertura estimada; con el parámetro, sólo los que tengan cualquier asociación activa con ese proveedor, preferida o no, en el mismo orden.

La política inicial es fija: la demanda se calcula exclusivamente con ventas confirmadas de los últimos **7 días de negocio**. Para cada producto devuelto, la respuesta debe incluir `product_id`, `product_name`, `sales_last_7_days`, `current_stock`, `coverage_days` nullable cuando no haya ventas, `suggested_quantity` y `explanation`. La cantidad sugerida debe cubrir el mayor entre el mínimo de stock configurado y las ventas de esos 7 días, menos el stock disponible; backend define el formato decimal consistente con productos pesables y unitarios. El orden lo calcula backend: menor `coverage_days` primero para productos con ventas, y luego los productos sin ventas que todavía requieran reposición por su mínimo.

No se solicita una configuración de ventana todavía. La futura sección "Configuración de tu negocio" podría hacerla editable, pero ese campo, su autorización y su persistencia quedan fuera de este contrato.

### 4. Tratamiento de pedidos sin proveedor en el reporte agregado

`GET /reports/purchases/by-supplier` debe documentar explícitamente cómo trata un pedido sin proveedor una vez que el punto 1 se despliegue: excluirlo del agregado por proveedor, o exponer un bucket "Sin proveedor" propio. El frontend implementa la representación correspondiente sólo después de que esta decisión se documente y despliegue.

## Roles y errores

Sin cambios de rol: `POST /purchase-orders` y `GET /purchase-orders/suggestions` siguen siendo Admin/Inventory (`creationWrapped`); `GET /reports/purchases/by-supplier` sigue Admin-only. Los errores de validación siguen el envelope `{ message }` vigente; ningún nuevo código de estado se solicita más allá de los ya usados por estos endpoints.

## Compatibilidad y rollout

1. Backend implementa y despliega los cuatro puntos anteriores en una instancia verificable.
2. El frontend previo (que siempre envía `supplier_id` y siempre lee `supplier_name` como string no nulo) sigue funcionando contra el contrato ampliado mientras el campo permanezca opcional en request y sólo nullable en response cuando efectivamente no haya proveedor: ningún pedido migrado pierde su proveedor existente.
3. Se coordina con `add-frontend-purchasing-supplier-item-association` para preservar el warning de asociación inline y reemplazar sólo su presentación anterior de sugerencias en dos secciones.

## Impacto y bloqueo en el frontend

Bloquea por completo la implementación de:

- `src/components/purchasing/PurchaseOrderForm.tsx` (proveedor opcional, acotado de sugerencias).
- `src/lib/types.ts` (`PurchaseOrder.supplier_id`/`supplier_name`, `PurchaseOrderListItem.supplier_name` nullable).
- `src/components/purchasing/PurchasingHubView.tsx`, `src/components/purchasing/PurchaseOrdersHistoryView.tsx`, `src/components/receiving/ReceivingDetailView.tsx` (rótulo "Sin proveedor").
- Cualquier cambio a `src/components/reports/PurchasesReportView.tsx`, condicionado además a que backend resuelva el punto 4.

Ninguna superficie dependiente de los puntos 1–4 se implementa ni se mockea contra un contrato no confirmado.

## Criterio de desbloqueo frontend

Una instancia backend accesible:

1. acepta `POST /purchase-orders` sin `supplier_id` y crea el pedido `PENDING` sin proveedor;
2. devuelve `supplier_id`/`supplier_name` `null` para ese pedido en creación, detalle y listado;
3. devuelve la lista priorizada de siete días con todas sus métricas, y `supplier_id` la acota a cualquier asociación activa sin cambiar la fórmula ni el orden;
4. documenta y, si corresponde, expone el tratamiento de pedidos sin proveedor en `GET /reports/purchases/by-supplier`;
5. rechaza combinaciones inválidas con status y mensaje verificables.

## Fuera de alcance

- Cambiar `POST /purchase-orders/{id}/receive`, el pago único por pedido, o los roles ya definidos.
- Alta automática de proveedores por nombre libre o portal de proveedor externo.
- Cualquier filtro adicional "sin proveedor" en el historial más allá de lo que backend decida ofrecer explícitamente.
