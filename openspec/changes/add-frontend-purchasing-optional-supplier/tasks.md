## 0. Prerrequisitos y coordinación backend (bloqueante para pedido sin proveedor y sugerencias acotadas)

- [ ] 0.1 Confirmar contra una instancia backend real que `POST /purchase-orders` acepta `supplier_id` ausente/`null` y crea el pedido `PENDING` sin proveedor; backend real. Bloquea toda tarea de la sección 2 y 3.
- [ ] 0.2 Confirmar contra una instancia backend real que `purchaseOrderResponse`, `purchaseOrderDetailResponse` y `purchaseOrderListItemResponse` devuelven `supplier_id`/`supplier_name` `null` para un pedido sin proveedor; backend real. Bloquea toda tarea de la sección 1 y 4.
- [ ] 0.3 Confirmar contra una instancia backend real que `GET /purchase-orders/suggestions` acepta `supplier_id` opcional y devuelve ventas de 7 días, stock, cobertura, cantidad sugerida, explicación y orden para cualquier asociación activa; backend real. Bloquea toda tarea de la sección 5.
- [ ] 0.4 Confirmar si backend documenta y despliega el tratamiento de pedidos sin proveedor en `GET /reports/purchases/by-supplier` (bucket propio o exclusión); backend real. Bloquea la sección 6; si backend no lo resuelve, la sección 6 queda fuera del alcance implementable de este change y se documenta como pendiente.
- [ ] 0.5 Confirmar que `add-frontend-suppliers-purchasing` sigue archivado o su comportamiento vigente equivalente al descripto en este documento (mismo `PurchaseOrderForm.tsx`, mismos tipos de pedido) antes de tocar los mismos archivos; inspección de código.
- [ ] 0.6 Confirmar el estado de `add-frontend-purchasing-supplier-item-association` (implementado o en curso) y que la implementación de este change no reintroduce una regresión en la partición de sugerencias sin proveedor ni en el warning de asociación inline; inspección de código.

## 1. Tipos

- [ ] 1.1 Actualizar `src/lib/types.ts`: `PurchaseOrder.supplier_id` y `supplier_name` pasan de `string` a `string | null`; `PurchaseOrderListItem.supplier_name` pasa de `string` a `string | null`; inspección de tipos y `npm run build`.

## 2. Formulario de creación: proveedor opcional

- [ ] 2.1 En `PurchaseOrderForm.tsx`, quitar `supplierId` de la validación que bloquea el envío (`if (!supplierId || !orderedAt || items.length === 0)`); inspección de código: el envío sigue exigiendo fecha e ítems válidos, no exige proveedor.
- [ ] 2.2 Ajustar el body de `POST /purchase-orders` para omitir `supplier_id` (o enviar `null`, según lo confirmado en 0.1) cuando el selector de proveedor está vacío; inspección de código contra el contrato verificado.
- [ ] 2.3 Prueba manual: crear un pedido sin proveedor de punta a punta contra backend real; confirmar que queda `PENDING` y navega al pedido creado con el mismo toast de éxito que un pedido con proveedor.

## 3. Rótulo "Sin proveedor" en pantallas existentes

- [ ] 3.1 Agregar a `src/lib/purchasing.ts` (o módulo equivalente) una función pura de display shaping que devuelva "Sin proveedor" cuando `supplier_name` es `null` y el nombre en caso contrario; prueba automatizada en `src/lib/purchasing.test.ts` con casos: `null`, string vacío no esperado, nombre presente.
- [ ] 3.2 Usar esa función en `PurchasingHubView.tsx` (hub de pendientes) donde hoy se interpola `order.supplier_name`; prueba manual: pedido sin proveedor visible en el hub con el rótulo correcto.
- [ ] 3.3 Usar esa función en `PurchaseOrdersHistoryView.tsx` donde hoy se interpola `order.supplier_name`; prueba manual: pedido sin proveedor visible en el historial con el rótulo correcto, en escritorio y mobile.
- [ ] 3.4 Usar esa función en el detalle compartido de pedido (`ReceivingDetailView.tsx`, título `Pedido de ${order.supplier_name}` y cualquier otro punto que interpole el campo) donde hoy se asume `supplier_name` no vacío; prueba manual: detalle de un pedido sin proveedor muestra "Sin proveedor" en vez de "Pedido de undefined" o similar.
- [ ] 3.5 Prueba manual: recibir un pedido sin proveedor de punta a punta contra backend real; confirmar que la recepción no depende de tener un proveedor asociado y que el pedido recibido sigue mostrando "Sin proveedor" después de cerrarse.

## 4. Filtro de historial por proveedor sin efectos colaterales

- [ ] 4.1 Verificar por inspección que un filtro de historial por un proveedor específico no requiere ni ofrece un filtro adicional "sin proveedor" no soportado por backend; inspección de código, sin cambio de UI si no aplica.

## 5. Lista de compra priorizada y acotada al proveedor seleccionado

- [ ] 5.1 Confirmar contra backend real que `GET /purchase-orders/suggestions` devuelve la lista de prioridad de siete días con ventas, stock, cobertura, cantidad, explicación y orden, y acepta `supplier_id` para cualquier asociación activa. **[backend real]**
- [ ] 5.2 Actualizar `src/lib/types.ts` y el builder de query con las métricas y el parámetro confirmados; mantener montos y cantidades en el formato decimal que backend entregue. **[inspección + npm run build]**
- [ ] 5.3 En `ReplenishmentSuggestionsPanel.tsx`, mostrar una lista única ordenada por backend con ventas de siete días, stock actual, cobertura, cantidad sugerida y explicación; permitir ajustar la cantidad antes de agregar la línea y no recalcular prioridad ni cantidad en el cliente. **[inspección + prueba manual]**
- [ ] 5.4 En `PurchaseOrderForm.tsx`, volver a pedir o actualizar la lista con `supplier_id` al elegir proveedor; sin proveedor usar la lista completa. Mostrar el vacío específico "No hay sugerencias para este proveedor." cuando corresponda. **[inspección + prueba manual]**
- [ ] 5.5 Prueba manual contra backend real: confirmar el orden por cobertura sin proveedor, la inclusión de un producto vendido sin proveedor preferido, el recorte por una asociación no preferida y el ajuste manual de una cantidad antes de agregarla al pedido. **[backend real + prueba manual]**

## 6. Reporte por proveedor (condicional a 0.4)

- [ ] 6.1 Si backend define un bucket "Sin proveedor" o una exclusión explícita para `GET /reports/purchases/by-supplier`, actualizar `src/components/reports/PurchasesReportView.tsx` y sus tipos para representar esa decisión con `formatMoney()` y sin reagrupación local; inspección de código y prueba manual. Si backend no lo resuelve para este release, dejar esta tarea explícitamente pendiente sin implementar ningún comportamiento inventado.

## 7. Verificación y entrega

- [ ] 7.1 Ejecutar `npm run lint` y `npm test`; corregir fallos vinculados a este change.
- [ ] 7.2 Ejecutar `npm run build` por los cambios de tipos en `src/lib/types.ts`; corregir errores de tipos vinculados a este change.
- [ ] 7.3 Realizar verificación manual integral: creación de pedido sin proveedor, rótulo "Sin proveedor" en hub/historial/detalle, filtro de sugerencias por proveedor con asociación no preferida, teclado/foco y responsive sin regresión respecto de `ui-suppliers-purchasing` vigente.
- [ ] 7.4 Validar este change contra backend real (los cuatro puntos de `backend-request.md`) y actualizar `ai/context/` descriptivo sólo cuando el comportamiento esté implementado y verificado.
- [ ] 7.5 Con decisión explícita del usuario, sincronizar el delta de spec sobre `ui-suppliers-purchasing` y archivar el change después de implementación y verificación completas.
