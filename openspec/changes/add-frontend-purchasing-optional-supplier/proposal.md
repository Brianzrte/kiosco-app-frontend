## Why

Hoy todo pedido de compra exige un proveedor registrado: no hay forma de cargar una compra ocasional o de un proveedor no dado de alta sin inventar un proveedor placeholder o perder la auditoría de esa compra en el sistema. Además, cuando la persona usuaria sí elige un proveedor al crear un pedido, la lista de sugerencias de reposición sigue mostrando productos de cualquier proveedor preferido: no se acota a los productos realmente asociados al proveedor elegido, incluida cualquier asociación no preferida, lo que obliga a revisar manualmente cuáles corresponden.

Ambos puntos requieren ampliar contrato de backend (`supplier_id` opcional/nullable en pedidos, filtro o campo ampliado en `GET /purchase-orders/suggestions`) todavía no implementado. Este change documenta el comportamiento deseado y su coordinación con backend; no se implementa hasta que ese contrato se despliegue y se verifique contra una instancia real, siguiendo el mismo criterio que `add-frontend-suppliers-purchasing`.

## What Changes

- Permitir crear un pedido de compra (`/purchasing/new`) dejando el selector de Proveedor vacío; el pedido se crea igual, queda pendiente y su detalle/historial/reporte lo identifican con el rótulo explícito "Sin proveedor" en lugar de un nombre de proveedor o un valor vacío.
- Cuando la persona usuaria sí selecciona un proveedor activo al crear un pedido, acotar la lista de sugerencias de reposición a los productos que tienen alguna asociación (preferida o no) con ese proveedor, con un vacío específico cuando no hay sugerencias para ese proveedor.
- Fuera de alcance de este change: la partición de sugerencias en dos secciones sin proveedor seleccionado y el warning + asociación inline producto-proveedor, ya cubiertos por el change hermano `add-frontend-purchasing-supplier-item-association`.
- Bloqueado en su totalidad hasta que backend acepte `supplier_id` ausente/`null` en creación y respuestas de pedido, y amplíe `GET /purchase-orders/suggestions` para acotar por cualquier asociación producto-proveedor. No se implementa ni mockea ninguna parte de este change antes de verificar ese despliegue.

## Capabilities

### Modified Capabilities

- `ui-suppliers-purchasing`: la creación manual de pedidos admite dejar el proveedor sin elegir, el hub de pendientes, el historial y el detalle de pedido representan "Sin proveedor" cuando corresponde, y las sugerencias de reposición se acotan al proveedor seleccionado considerando cualquier asociación.

No se declara `ui-reports` como capability modificada en este change: cómo debe representar `GET /reports/purchases/by-supplier` un pedido sin proveedor (bucket propio vs. exclusión) todavía no está decidido por backend. Ese punto queda documentado como pregunta abierta en `backend-request.md`, no como un requirement normativo de este documento; se especificará en un incremento posterior una vez que backend lo defina.

## Impact

- `src/components/purchasing/PurchaseOrderForm.tsx`: el campo Proveedor deja de ser obligatorio para enviar el formulario y las sugerencias se acotan por proveedor seleccionado cuando el backend lo permita.
- `src/components/purchasing/PurchaseOrdersHistoryView.tsx`, `src/components/purchasing/PurchasingHubView.tsx` y `src/components/receiving/ReceivingDetailView.tsx` (detalle compartido de pedido): mostrar "Sin proveedor" donde hoy se asume `supplier_name` como texto plano no vacío.
- `src/components/reports/PurchasesReportView.tsx`: potencialmente afectado según cómo backend decida tratar los pedidos sin proveedor en el agregado; no se especifica su comportamiento observable en este change hasta esa decisión.
- `src/lib/types.ts`: `PurchaseOrder.supplier_id`/`supplier_name` y `PurchaseOrderListItem.supplier_name` pasan a nullable.
- Depende de `add-frontend-suppliers-purchasing` (todavía sin archivar), del cual hereda `PurchaseOrderForm.tsx` y la capability `ui-suppliers-purchasing`.
- Requiere backend: `supplier_id` opcional/nullable en `POST /purchase-orders` y en las respuestas de pedido; ampliación de `GET /purchase-orders/suggestions` para acotar por cualquier asociación producto-proveedor; definición de cómo `GET /reports/purchases/by-supplier` trata los pedidos sin proveedor. Ver `backend-request.md`.
- No agrega dependencias.
