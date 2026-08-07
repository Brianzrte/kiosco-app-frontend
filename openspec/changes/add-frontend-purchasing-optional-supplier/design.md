## Context

`PurchaseOrderForm.tsx` exige `supplierId` para habilitar el envío del formulario y siempre postea `supplier_id: supplierId` a `POST /purchase-orders`. El backend rechaza cualquier creación sin proveedor: `createPurchaseOrderRequest.SupplierID` tiene `validate:"required"` (`../backend/internal/purchasing/transport/http/dto.go:76`); las respuestas de pedido (`purchaseOrderResponse`, `purchaseOrderDetailResponse`, `purchaseOrderListItemResponse`) devuelven `supplier_id`/`supplier_name` como `string` no nullable (`dto.go:133,145,189,203`), reflejado en `src/lib/types.ts` (`PurchaseOrder.supplier_id`/`supplier_name`, `PurchaseOrderListItem.supplier_name`). `GET /purchase-orders/suggestions` no acepta parámetros (`../backend/internal/purchasing/application/list_replenishment_suggestions.go:15`) y sólo une cada producto con su proveedor preferido (`LEFT JOIN product_suppliers ps ON ps.product_id = p.id AND ps.preferred`, `../backend/internal/purchasing/infrastructure/postgres_replenishment_suggestions.go:29`). `GET /reports/purchases/by-supplier` acepta `supplier_id` opcional pero agrupa exclusivamente por proveedor (`../backend/internal/reporting/application/purchases_by_supplier.go`), sin bucket para pedidos sin proveedor.

La consulta actual sólo produce una cantidad cuando el producto tiene proveedor preferido y frecuencia configurada; el resto llega sin cantidad. Eso hace que, al crear un pedido sin proveedor, la ayuda parezca vacía o dependa de completar relaciones de proveedores que no son necesarias para que la dueña haga una lista de compras. El nuevo contrato desacopla la prioridad de compra de esa configuración: toma ventas confirmadas de los últimos 7 días y stock actual para todos los productos activos, y usa la asociación sólo para acotar la lista cuando se eligió un proveedor.

Ninguno de estos tres puntos existe hoy en el backend desplegado. Este documento describe el comportamiento deseado una vez que el contrato ampliado (`## API contract`) se despliegue y se verifique; no se implementa ni se mockea antes de esa verificación, siguiendo el mismo criterio que `add-frontend-suppliers-purchasing/backend-request.md`.

Este change conserva el warning y la asociación inline producto-proveedor de `add-frontend-purchasing-supplier-item-association`, pero reemplaza su presentación de sugerencias sin proveedor por la lista única priorizada de siete días. Ambos changes modifican el mismo requirement de sugerencias; esta decisión posterior prevalece sólo para orden, métricas y presentación de la lista, sin alterar el flujo de asociación inline.

## Goals / Non-Goals

**Goals:**

- Permitir crear un pedido de compra sin asociarlo a ningún proveedor del sistema.
- Mostrar el rótulo "Sin proveedor" en cualquier superficie que hoy asume `supplier_name` como texto plano (historial, hub de pendientes, detalle de pedido, reporte).
- Cuando hay un proveedor seleccionado en el formulario de creación, acotar las sugerencias de reposición a los productos con alguna asociación (preferida o no) con ese proveedor.
- Cuando no hay proveedor seleccionado, mostrar una única lista priorizada de productos que requieren reposición según ventas de los últimos 7 días y cobertura de stock.
- Mantener sin cambios el flujo de recepción para un pedido sin proveedor.

**Non-Goals:**

- Definir la fórmula de reposición cuando un producto tiene múltiples proveedores asociados con distinta frecuencia: es una decisión de backend, documentada como ambigüedad a resolver en `backend-request.md`.
- Hacer configurable la ventana de análisis desde una futura sección "Configuración de tu negocio". En este change es una política backend fija de 7 días; cambiarla requiere un change propio de configuración y contrato.
- Portal, login o alta automática de proveedores externos por nombre libre.
- Un filtro explícito "sin proveedor" en el historial: no se asume hasta que el backend lo ofrezca.
- Cambiar `POST /purchase-orders/{id}/receive` o el pago único por pedido.

## User flow

1. Admin o Inventory abre `/purchasing/new`.
2. Deja el proveedor sin seleccionar (compra ocasional) o elige uno activo.
3. Sin proveedor, ve una lista de productos que requieren reposición, ordenada por menor cobertura de stock y mostrando ventas de los últimos 7 días, stock actual, cobertura y cantidad sugerida. Si eligió proveedor, la lista se acota a los productos con alguna asociación (preferida o no) con ese proveedor; si no hay ninguno con necesidad de reposición, ve el vacío "No hay sugerencias para este proveedor."
4. Completa ítems, cantidades y costos, y envía el pedido. Si no hay proveedor, el pedido se crea igual, queda pendiente y se identifica como "Sin proveedor" en el hub de pendientes, el historial y el detalle.
5. Cualquier rol autorizado que abra ese pedido para recepción ve el mismo flujo de siempre: la recepción no depende de tener un proveedor asociado.
6. Admin consulta el reporte agregado por proveedor; los pedidos sin proveedor se representan según la decisión que backend documente (bucket "Sin proveedor" propio o exclusión explícita).

## UI states

- **Loading/Error:** sin cambio de patrón respecto de `ui-suppliers-purchasing` vigente (carga explícita; error inline con `ApiError.message` y reintento).
- **Empty (sugerencias acotadas por proveedor):** cuando hay proveedor seleccionado y ninguna sugerencia corresponde a un producto asociado a él, se muestra "No hay sugerencias para este proveedor.", distinto del vacío general "No hay reposición sugerida en este momento." que se usa sin proveedor seleccionado.
- **Display (sin proveedor):** una lista priorizada muestra para cada producto ventas de 7 días, stock actual, días de cobertura y cantidad sugerida. El orden y los valores llegan de backend; la persona usuaria puede ajustar una cantidad antes de agregarla al borrador.
- **Success (pedido sin proveedor):** el pedido creado sin proveedor muestra el mismo toast y navegación al pedido autoritativo que un pedido con proveedor; ninguna pantalla depende de `supplier_name` truthy para confirmar éxito.
- **Display (rótulo "Sin proveedor"):** el hub de pendientes, el historial, el detalle de pedido y el reporte muestran "Sin proveedor" en el lugar donde hoy renderizan `order.supplier_name`, cuando ese campo es `null`.

## Decisions

### 1. `supplier_id` pasa a opcional en el formulario, no a un valor placeholder

Dejar el selector de Proveedor vacío se traduce en no enviar `supplier_id` (o enviarlo `null`, según la forma final que confirme backend) en `POST /purchase-orders`, en vez de introducir una opción "Sin proveedor" como fila sintética de la lista de proveedores. Un proveedor placeholder ensuciaría la lista real de proveedores activos y el reporte agregado por proveedor; la ausencia real de `supplier_id` es la señal más directa de "compra sin proveedor registrado".

### 2. "Sin proveedor" es un display-shaping puro sobre un campo nullable, no un estado de negocio nuevo

Cada vista que hoy interpola `supplier_name` pasa a comprobar si el campo es `null` y renderizar el rótulo fijo "Sin proveedor" en su lugar. No se introduce un nuevo campo de estado de pedido ni un ícono: es texto en el mismo lugar donde ya se muestra el nombre del proveedor, consistente con la regla de accesibilidad de no depender de color o ícono para transmitir un estado.

### 3. El acotado de sugerencias por proveedor se resuelve en backend, no filtrando localmente el campo `supplier_id` (preferido) ya expuesto

El campo `supplier_id` que hoy trae cada sugerencia identifica sólo el proveedor preferido del producto (`ps.preferred` en el JOIN de `postgres_replenishment_suggestions.go`). Filtrar localmente por ese campo daría falsos negativos: un producto asociado de forma no preferida al proveedor elegido no aparecería aunque debiera. Por eso este change depende de que backend amplíe el contrato — vía parámetro de filtro en `GET /purchase-orders/suggestions` o vía un campo de respuesta con todas las asociaciones del producto — en vez de intentar resolver la pregunta con el dato ya disponible, que no la responde correctamente.

### 4. El frontend no decide la fórmula de reposición para un proveedor no preferido

Si un producto tiene más de un proveedor asociado, cada uno con su propia `replenishment_frequency_days`, no está definido con qué frecuencia calcular `suggested_quantity` al pedir sugerencias para un proveedor no preferido. Esa ambigüedad se documenta en `backend-request.md` como decisión de backend; el frontend no recalcula ni infiere una frecuencia alternativa.

### 5. Change complementario y no conflictivo con `add-frontend-purchasing-supplier-item-association`

Ambos changes modifican el requirement `Manual purchase-order creation` de `ui-suppliers-purchasing`, pero sobre aspectos distintos: ese change agrega el warning de asociación inline (independiente de si hay o no proveedor sin asociación) y este hace opcional el campo Proveedor. El delta de este change conserva explícitamente el escenario de warning de asociación como fuera de su alcance y no reescribe los escenarios ya agregados por el change hermano.

### 6. Prioridad por cobertura de stock en una ventana fija de siete días

Sin proveedor, la lista de compras no depende de que cada producto tenga una relación de abastecimiento completa. El backend calcula para cada producto activo la demanda de los últimos 7 días, el stock actual, los días de cobertura y la cantidad a reponer; devuelve sólo los productos que requieren reposición y los ordena desde la menor cobertura. La cantidad sugerida cubre el mayor entre el mínimo configurado y la demanda de siete días, menos el stock disponible. Cuando hay proveedor seleccionado, la misma fórmula se aplica sólo a productos asociados a ese proveedor, incluso si no es el preferido.

La ventana de 7 días es una política fija inicial porque coincide con el ciclo de reposición actual. La interfaz no recalcula cantidades, coberturas ni orden; sólo muestra la explicación y deja ajustar la cantidad antes de agregarla al pedido.

Alternativa descartada: dividir la lista entre sugerencias y "Datos de planificación incompletos". Esa división expone una limitación de configuración antes que ayudar a decidir qué comprar, y deja fuera productos vendidos que deberían competir por prioridad aun sin proveedor asignado.

## Accessibility

El rótulo "Sin proveedor" es texto plano en el mismo lugar donde hoy se muestra el nombre de proveedor: no depende de un ícono o color distintivo para comunicar la ausencia de proveedor. El vacío "No hay sugerencias para este proveedor." usa el mismo patrón de texto explicativo que los demás vacíos de `ui-suppliers-purchasing`, sin agregar un control nuevo de foco.

## Keyboard and focus behavior

Sin requisitos nuevos: dejar el selector de proveedor vacío no cambia el orden de tabulación del formulario; el "Sin proveedor" no introduce ningún control interactivo nuevo en historial, detalle o reporte.

## Responsive behavior

El rótulo "Sin proveedor" cabe donde hoy se muestra el nombre de proveedor en las tablas de historial (`PurchaseOrdersHistoryView.tsx`), el hub de pendientes (`PurchasingHubView.tsx`), el detalle (`ReceivingDetailView.tsx`) y el reporte (`PurchasesReportView.tsx`), incluida su vista mobile de tarjetas o desplazamiento horizontal ya definida por `ui-suppliers-purchasing`.

## API contract

El pedido sin proveedor y la lista priorizada con o sin proveedor quedan bloqueados por los contratos faltantes documentados en `backend-request.md`:

- `POST /purchase-orders`: falta que acepte `supplier_id` ausente o `null`.
- Respuestas de pedido (creación, detalle, listado/historial): falta que `supplier_id` y `supplier_name` sean nullable.
- `GET /purchase-orders/suggestions`: faltan la prioridad calculada para una ventana fija de 7 días, sus métricas visibles y un parámetro que acote por proveedor considerando cualquier asociación.
- `GET /reports/purchases/by-supplier`: falta que documente cómo trata los pedidos sin proveedor.

La ventana, orden, cantidad sugerida, ventas y cobertura son autoridad backend; el frontend no deriva ninguno de esos valores a partir de respuestas de ventas o stock separadas.

Dinero sigue viajando como string decimal; fechas de pedidos y timestamps mantienen RFC3339; rangos de reporte mantienen `YYYY-MM-DD`. Ningún cálculo de negocio (frecuencia, cantidad sugerida, agregado de reporte) se replica en el cliente.

## Error handling

Sin cambio de patrón general: `401` redirige a login mediante `api()`; `403` no aplica un caso nuevo (los roles autorizados a crear pedidos y ver sugerencias no cambian). Si el backend rechaza una combinación específica de pedido sin proveedor (por ejemplo, algún ítem que sólo tenga sentido para reposición planificada asociada a proveedor), el mensaje se muestra inline tal como llega, sin que el frontend intente adivinar o replicar esa regla de negocio.

## Backend coordination

Ver `backend-request.md` para el contrato mínimo solicitado, el criterio de desbloqueo y la política de siete días que corresponde resolver a backend.

## Risks / Trade-offs

- [Contrato backend no verificado] → no se construyen llamadas ni mocks antes de verificar instancia y shapes reales; todas las tareas de implementación quedan bloqueadas en `tasks.md`.
- [Ambigüedad de frecuencia de reposición para proveedor no preferido] → se documenta explícitamente como pregunta de negocio para backend; el frontend no la resuelve ni la infiere.
- [Reporte por proveedor sin criterio para pedidos sin proveedor] → se documenta como punto abierto en `backend-request.md`; hasta su resolución, el reporte no se modifica.
- [Coexistencia con `add-frontend-purchasing-supplier-item-association`] → ambos changes modifican el mismo requirement sobre aspectos distintos; este documento deja explícito que no reescribe los escenarios de warning de asociación ya agregados por ese change.

## Migration Plan

1. Backend diseña y despliega el contrato ampliado: `supplier_id` opcional/nullable en creación y respuestas de pedido, ampliación de `GET /purchase-orders/suggestions`, y decisión documentada sobre pedidos sin proveedor en el reporte.
2. Se verifica cada contrato contra una instancia real, con el mismo criterio de desbloqueo que `add-frontend-suppliers-purchasing/backend-request.md`.
3. Frontend implementa este change sólo después de esa verificación: tipos nullable, formulario con proveedor opcional, acotado de sugerencias, rótulo "Sin proveedor" en historial/hub/detalle/reporte.
4. Se coordina con `add-frontend-purchasing-supplier-item-association` para preservar el warning de asociación inline y retirar sólo su presentación anterior de sugerencias en dos secciones.

## Rollback

Si el frontend se revierte, el backend puede mantener el contrato ampliado sin romper el frontend previo, siempre que `supplier_id` ausente siga siendo válido junto con el requerido histórico (el frontend previo seguirá enviando `supplier_id` siempre, lo cual el contrato ampliado debe seguir aceptando). No hay estado persistido nuevo que revertir del lado del frontend.

## Open Questions

- Copy exacto del rótulo "Sin proveedor" en cada superficie (historial, hub, detalle, reporte): sugerido "Sin proveedor" en todas, ajustable sin cambiar el comportamiento observable.
- Si el reporte agregado por proveedor debe mostrar un bucket "Sin proveedor" propio o excluir esos pedidos del agregado: corresponde decidirlo junto con backend; no bloquea escribir este documento, queda como pregunta abierta hacia backend en `backend-request.md`.
- Si backend prefiere resolver el acotado de sugerencias con un parámetro de filtro o exponiendo todas las asociaciones en la respuesta: ambas opciones cumplen el requisito; la elección es de diseño de backend y no bloquea el resto de este documento.
