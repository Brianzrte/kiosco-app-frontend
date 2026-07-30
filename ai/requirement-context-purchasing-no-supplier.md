# Requirement Context: Pedido sin proveedor y sugerencias acotadas a cualquier proveedor asociado

> **Documento B — bloqueado por backend.** Requiere un change de backend
> propio antes de poder implementarse en frontend. Cubre el punto 1 completo
> del requerimiento original ("pedido sin proveedor") y la parte de
> "sugerencias filtradas" que aplica **cuando sí hay un proveedor
> seleccionado** (acotar a cualquier producto asociado a ese proveedor, no
> sólo al preferido). La parte no bloqueada (dos secciones de sugerencias
> sin proveedor seleccionado + asociación inline producto-proveedor) está en
> el documento hermano
> `ai/requirement-context-purchasing-no-supplier-suggestions.md` (Documento
> A), ya sin bloqueo y lista para `openspec-writer`.
>
> Este documento **no se implementa** hasta que el backend despliegue y se
> verifique el contrato ampliado descripto en `## Backend dependencies` y
> `## API contract`. Sigue la misma disciplina que
> `add-frontend-suppliers-purchasing`: "no se implementa ni mockea ninguna
> parte bloqueada antes de verificar su despliegue"
> (`openspec/changes/add-frontend-suppliers-purchasing/proposal.md:32`).

## Objective

1. Permitir crear un pedido de compra sin asociarlo a ningún proveedor del
   sistema, para registrar compras ocasionales o de proveedores no
   registrados sin perder la auditoría del sistema.
2. Cuando el usuario **sí** seleccionó un proveedor al crear un pedido,
   acotar la lista de sugerencias de reposición a los productos que
   pertenecen a ese proveedor considerando **cualquier** asociación
   producto-proveedor (no sólo la preferida).

## Current behavior

- `PurchaseOrderForm.tsx` exige `supplierId` para habilitar el envío (`if
  (!supplierId || !orderedAt || items.length === 0)`, línea 65) y siempre
  postea `supplier_id: supplierId` (línea 88).
- El backend rechaza cualquier creación sin proveedor:
  `createPurchaseOrderRequest.SupplierID` tiene `validate:"required"`
  (`../backend/internal/purchasing/transport/http/dto.go:76`).
- `PurchaseOrder.supplier_id`/`supplier_name` y
  `PurchaseOrderListItem.supplier_name` son `string` no opcional en
  `src/lib/types.ts` (líneas 205, 230–231); ninguna vista
  (`PurchaseOrdersHistoryView.tsx`, detalle, `PurchasesReportView.tsx`) tiene
  hoy un camino para mostrar "sin proveedor".
- La spec delta todavía abierta (sin archivar) declara como requisito
  normativo vigente que crear un pedido exige "an active supplier"
  (`openspec/changes/add-frontend-suppliers-purchasing/specs/ui-suppliers-purchasing/spec.md:73-74`,
  `### Requirement: Manual purchase-order creation`). Este documento
  **modificará** ese requisito cuando se escriba el change, algo que
  corresponde a `openspec-writer`, no a este análisis.
- `GET /purchase-orders/suggestions` no acepta ningún parámetro
  (`../backend/internal/purchasing/application/list_replenishment_suggestions.go:15`)
  y calcula `suggested_quantity`/`supplier_id` uniendo cada producto **sólo
  con su proveedor preferido**
  (`LEFT JOIN product_suppliers ps ON ps.product_id = p.id AND ps.preferred`,
  `../backend/internal/purchasing/infrastructure/postgres_replenishment_suggestions.go:35`).
  No existe manera de pedirle al backend "sugerencias de este proveedor,
  considerando cualquier asociación" sin ampliar ese contrato.
- El reporte agregado `GET /reports/purchases/by-supplier`
  (`openspec/changes/add-frontend-suppliers-purchasing/backend-request.md:20`)
  agrupa exclusivamente por proveedor y no contempla un pedido sin
  proveedor.

## Desired behavior

**Pendiente de despliegue de backend.** Los escenarios siguientes describen
el comportamiento deseado una vez que el contrato ampliado (`## API
contract`) esté implementado y verificado; no se implementan hoy.

1. **Pedido sin proveedor**
   - WHEN un usuario Admin o Inventory deja el selector de proveedor sin
     elegir y completa fecha, uno o más productos catalogados, cantidad y
     costo unitario THEN el pedido se crea igual, queda pendiente y su
     detalle/historial lo muestra con una etiqueta explícita de "Sin
     proveedor" en vez de un nombre de proveedor.
   - WHEN el pedido sin proveedor aparece en el historial, en el hub de
     pendientes o en el reporte agregado THEN esos lugares no rompen ni
     muestran un valor vacío/`undefined`: usan el mismo rótulo "Sin
     proveedor".
   - WHEN el usuario recibe un pedido sin proveedor THEN el flujo de
     recepción (`ReceivingDetailView.tsx`) no cambia: la recepción no
     depende de tener un proveedor asociado.
2. **Sugerencias acotadas a cualquier proveedor asociado**
   - WHEN el usuario selecciona un proveedor activo en `/purchasing/new`
     THEN la lista de sugerencias se acota a los productos que tienen
     **alguna** asociación (preferida o no) con ese proveedor, no sólo los
     que lo tienen como preferido.
   - WHEN no hay ningún producto asociado (de ninguna forma) al proveedor
     seleccionado con necesidad de reposición THEN se muestra un vacío
     específico ("No hay sugerencias para este proveedor"), distinto del
     vacío general de sugerencias.

## Primary actor

Admin e Inventory, los mismos roles ya gateados para crear pedidos
(`creationWrapped`) y ver sugerencias (`GET /purchase-orders/suggestions`,
también `creationWrapped`,
`../backend/internal/bootstrap/router.go:183-184`). Ningún actor nuevo.

## Roles and permissions

Sin cambios de rol previstos: la creación sin proveedor seguiría siendo
Admin/Inventory-only, igual que hoy. Si el backend decide que el reporte
por proveedor deba exponer un bucket "Sin proveedor" a Admin, ese alcance
queda para la coordinación de backend, no es una decisión de este análisis
de frontend.

## Main user flow

1. Admin o Inventory abre `/purchasing/new`.
2. Deja el proveedor sin seleccionar (compra ocasional) o elige uno.
3. Si eligió un proveedor, la lista de sugerencias se acota a los productos
   asociados a ese proveedor (cualquier asociación).
4. Completa ítems, cantidades y costos, y envía el pedido; si no hay
   proveedor, el pedido se crea igual y queda identificado como "Sin
   proveedor" en cualquier pantalla donde hoy se muestra `supplier_name`.

## UI states

- **Loading/Empty/Error/Success**: siguen el mismo patrón ya vigente en
  `ui-suppliers-purchasing` (loading explícito, vacío que invita a acción o
  explica ausencia de datos, error inline con reintento, éxito con toast y
  relectura autoritativa). El único agregado es el vacío específico de
  "sin sugerencias para este proveedor" mencionado arriba, y que el estado
  de éxito de un pedido sin proveedor muestre el mismo patrón de
  confirmación que uno con proveedor.

## Keyboard and focus behavior

Sin requisitos nuevos más allá de los ya vigentes: dejar el selector de
proveedor vacío no cambia el orden de tabulación del formulario.

## Responsive behavior

Sin requisitos nuevos: el rótulo "Sin proveedor" debe caber donde hoy se
muestra el nombre de proveedor en tablas de historial y tarjetas de
detalle, incluida la vista mobile de esas pantallas.

## Accessibility

El rótulo "Sin proveedor" es texto, no un ícono o color: se comunica igual
que cualquier otro nombre de proveedor, sin depender de un estilo visual
distintivo para transmitir la ausencia de proveedor.

## Copy and feedback

- Rótulo para pedidos sin proveedor: **"Sin proveedor"** (sugerido; a
  confirmar en `design.md` de ese change, ya que no fue provisto un texto
  literal por el usuario para este caso).
- Vacío de sugerencias acotadas sin resultados: **"No hay sugerencias para
  este proveedor."**

## Backend dependencies

**Bloqueante en su totalidad.** Nada de este documento se puede implementar
contra el backend actual:

1. `POST /purchase-orders` exige `supplier_id`
   (`../backend/internal/purchasing/transport/http/dto.go:76`,
   `validate:"required"`). Hace falta que el backend acepte `supplier_id`
   ausente o `null`.
2. Las respuestas de pedido (`purchaseOrderResponse`,
   `purchaseOrderDetailResponse`, el listado de historial) devuelven hoy
   `supplier_id`/`supplier_name` como valores no nulos
   (`dto.go:133,145,189,203`; `src/lib/types.ts:205,230-231`). Hace falta
   que puedan ser `null` cuando el pedido no tiene proveedor.
3. `GET /purchase-orders/suggestions` no acepta ningún parámetro de filtro
   (`list_replenishment_suggestions.go:15`) y su cálculo de
   `suggested_quantity`/`supplier_id` sólo considera el proveedor preferido
   de cada producto (`postgres_replenishment_suggestions.go:35`). Hace
   falta que el backend permita acotar por proveedor considerando
   **cualquier** asociación, no sólo la preferida.
4. El reporte `GET /reports/purchases/by-supplier` no contempla pedidos sin
   proveedor; hace falta que el backend decida y documente cómo los agrega
   (bucket "Sin proveedor" propio, o exclusión explícita del agregado por
   proveedor).

## API contract

Ninguno de los siguientes existe hoy; se documentan como **faltantes**, no
se asumen ni se inventa su forma exacta más allá de lo mínimo necesario para
pedirlos:

- `POST /purchase-orders`: **falta** aceptar `supplier_id` ausente/`null` en
  el request. Forma exacta del contrato (si se omite el campo, o se envía
  `null` explícito) queda a definición del backend.
- Respuestas de pedido (creación, detalle, listado/historial): **falta**
  que `supplier_id` y `supplier_name` sean nullable cuando el pedido no
  tiene proveedor.
- `GET /purchase-orders/suggestions`: **falta** un parámetro (p. ej.
  `supplier_id`) que acote la respuesta a productos con alguna asociación a
  ese proveedor, no sólo la preferida. Alternativa a evaluar por backend:
  exponer todas las asociaciones de cada producto en la respuesta de
  sugerencias (no sólo la preferida) para que el frontend pueda filtrar
  sobre un campo ya completo, sin necesidad de un parámetro de consulta —
  la elección entre "filtro server-side" y "campo más completo" es una
  decisión de diseño de backend, no de este documento.
- `GET /reports/purchases/by-supplier`: **falta** definir cómo se agregan
  los pedidos sin proveedor (bucket propio vs. exclusión).

### Ambigüedad de negocio a resolver por backend (no por frontend)

Si un producto tiene más de un proveedor asociado, cada uno con su propia
`replenishment_frequency_days`, y se pide "sugerencias de este proveedor no
preferido", **no está definido con qué frecuencia de reposición calcular
`suggested_quantity`** (hoy la fórmula usa siempre la frecuencia del
preferido). Esta ambigüedad debe resolverla el backend al diseñar el
contrato ampliado; el frontend no debe recalcular ni inferir una frecuencia
alternativa en el cliente.

## Data types

Cuando el backend despliegue el contrato:

- `src/lib/types.ts`: `PurchaseOrder.supplier_id` y `supplier_name` pasan de
  `string` a `string | null` (líneas 230–231); `PurchaseOrderListItem.supplier_name`
  igual (línea 205).
- Toda vista que hoy asume `supplier_name` como texto plano
  (`PurchaseOrdersHistoryView.tsx`, detalle de pedido,
  `PurchasesReportView.tsx`) necesita un camino explícito para `null` →
  "Sin proveedor", en vez de asumir que siempre hay un nombre.

## Error behavior

Sin cambio de patrón general (`ApiError.message` inline, sin asumir éxito).
Si el backend decide rechazar ciertas combinaciones (p. ej. un pedido sin
proveedor con algún producto que sólo tiene sentido para reposición
planificada), ese mensaje se muestra tal cual, sin que el frontend intente
adivinar o replicar esa regla de negocio.

## Edge cases

- Pedido sin proveedor recibido con diferencias/faltantes: el flujo de
  recepción no depende de proveedor, así que no debería verse afectado; se
  verifica igual contra backend real una vez desbloqueado.
- Pedido sin proveedor filtrado en historial por proveedor: un filtro por
  proveedor específico naturalmente no debe devolver pedidos sin proveedor;
  no hace falta un filtro adicional "sin proveedor" a menos que el backend
  lo ofrezca explícitamente (no asumido acá).
- Producto sin ninguna asociación con el proveedor seleccionado pero con
  bajo stock real: no aparece en la lista acotada por proveedor (es
  esperable, dado que "pertenece a ese proveedor" es el criterio pedido),
  pero sí aparecería en la lista general del Documento A si se deselecciona
  el proveedor.

## Affected routes

`src/app/(app)/purchasing/new/page.tsx`,
`src/app/(app)/purchasing/history/page.tsx` (o su vista equivalente),
`src/app/(app)/purchasing/[id]/page.tsx` (detalle) y
`src/app/(app)/reports/purchases` si el reporte necesita representar "sin
proveedor". Ninguna ruta nueva.

## Affected components

- `src/components/purchasing/PurchaseOrderForm.tsx`: hacer opcional el
  campo Proveedor y acotar sugerencias por proveedor con cualquier
  asociación.
- `src/components/purchasing/PurchaseOrdersHistoryView.tsx` y el detalle de
  pedido: mostrar "Sin proveedor" donde hoy se asume `supplier_name`.
- `src/components/reports/PurchasesReportView.tsx` (o equivalente): reflejar
  la decisión de backend sobre cómo agregar pedidos sin proveedor.

## Affected libraries

- Si el backend expone todas las asociaciones por producto en la respuesta
  de sugerencias (en vez de un parámetro de filtro), la función de
  "sugerencias que pertenecen a un proveedor dado" es candidata a
  `src/lib/purchasing.ts`, testeable sin React, análoga a las funciones ya
  propuestas en el Documento A.
- Ningún cálculo de negocio (frecuencia, cantidad sugerida, agregado del
  reporte) se replica en el cliente: sigue siendo responsabilidad exclusiva
  del backend.

## Testing implications

- Testeable en `lib/*.test.ts` una vez desplegado el contrato: la función de
  filtrado de sugerencias por proveedor (si el backend devuelve todas las
  asociaciones) y cualquier helper de display shaping para "Sin proveedor".
- Verificación manual: creación de un pedido sin proveedor de punta a punta
  contra backend real, su aparición correcta en historial/detalle/reporte,
  y el filtrado de sugerencias por proveedor con productos de asociación no
  preferida.

## Deployment considerations

1. Backend diseña y despliega el contrato ampliado (`supplier_id` opcional
   en creación y respuestas, filtro o campo ampliado en sugerencias,
   tratamiento de "sin proveedor" en el reporte).
2. Se verifica cada contrato contra una instancia real (mismo criterio que
   `add-frontend-suppliers-purchasing/backend-request.md`: "Criterio de
   desbloqueo frontend").
3. Frontend implementa este documento sólo después de esa verificación; no
   se mockea contra un contrato no confirmado.
4. Se coordina con el Documento A (ya implementado o en curso) para no
   introducir una regresión en el warning de asociación inline ni en las
   dos secciones de sugerencias sin proveedor.

## Out of scope

- Todo lo ya cubierto por el Documento A (dos secciones de sugerencias sin
  proveedor seleccionado, warning + alta de asociación inline): no se
  repite acá.
- Definir la fórmula de reposición quando hay múltiples proveedores
  asociados con distinta frecuencia: es una decisión de backend, no de este
  documento ni de su futuro `design.md` de frontend.
- Portal o alta automática de proveedores nuevos por nombre libre: sigue
  siendo un Non-Goal vigente del change base.
- Cambiar `POST /purchase-orders/{id}/receive` o el pago único por pedido.

## Decisions made

- El punto "pedido sin proveedor" se resuelve pidiendo al backend que
  `supplier_id` sea opcional/nullable en creación y en las respuestas de
  `PurchaseOrder`/`PurchaseOrderListItem`, en vez de usar un proveedor
  placeholder o diferirlo indefinidamente (opción elegida entre las
  presentadas en el análisis previo).
- El filtrado de sugerencias por proveedor seleccionado se resuelve
  considerando cualquier asociación producto-proveedor, no sólo la
  preferida, lo que requiere ampliar `GET /purchase-orders/suggestions` (o
  el campo que devuelve) — no se conforma con el campo `supplier_id`
  (preferido) que ya expone el contrato actual.
- Este documento se trata como un change de frontend separado del
  Documento A, con su propio `backend-request.md`, siguiendo el precedente
  de `add-frontend-suppliers-purchasing`.

## Remaining non-blocking questions

- Copy exacto del rótulo "Sin proveedor" en cada superficie (historial,
  detalle, reporte) — sugerido arriba, ajustable en `design.md` una vez
  desbloqueado.
- Si el reporte agregado por proveedor debe mostrar un bucket "Sin
  proveedor" o excluir esos pedidos del agregado — corresponde decidirlo
  junto con backend al diseñar el contrato ampliado, no bloquea escribir el
  `proposal.md` de este change (puede declararse explícitamente como
  pregunta abierta hacia backend en su propio `backend-request.md`).
- Si el backend prefiere resolver "cualquier proveedor asociado" con un
  parámetro de filtro en `/purchase-orders/suggestions` o exponiendo todas
  las asociaciones en la respuesta: ambas cumplen el requerimiento, la
  elección es de diseño de backend.

## Evidence consulted

- `ai/roles/requirement-analyst.md`, `ai/skills/analyze-frontend-requirement/SKILL.md`.
- `ai/context/module-map.md`.
- `openspec/changes/add-frontend-suppliers-purchasing/proposal.md`,
  `design.md`, `backend-request.md`, `tasks.md`,
  `specs/ui-suppliers-purchasing/spec.md`.
- `src/components/purchasing/PurchaseOrderForm.tsx`.
- `src/lib/types.ts` (`PurchaseOrder`, `PurchaseOrderListItem`,
  `ReplenishmentSuggestion`).
- Backend (`../backend`): `internal/bootstrap/router.go` (gates de rol);
  `internal/purchasing/transport/http/dto.go`
  (`createPurchaseOrderRequest.SupplierID`, respuestas de pedido);
  `internal/purchasing/application/list_replenishment_suggestions.go`;
  `internal/purchasing/infrastructure/postgres_replenishment_suggestions.go`
  (join sólo con proveedor preferido).

---

## Borrador de `backend-request.md` para este change (cuando se cree)

Para cuando se escriba el change de este documento, el pedido a backend
debería cubrir, como mínimo, estos tres puntos (con el mismo formato que
`add-frontend-suppliers-purchasing/backend-request.md`):

1. **Creación de pedido sin proveedor**: `POST /purchase-orders` acepta
   `supplier_id` ausente o `null`; el pedido creado queda sin proveedor
   asociado.
2. **Respuestas nullable**: `supplier_id`/`supplier_name` en la respuesta de
   creación, detalle y listado de pedidos pasan a ser nullable cuando el
   pedido no tiene proveedor.
3. **Sugerencias por cualquier proveedor asociado**: `GET
   /purchase-orders/suggestions` permite acotar a un proveedor considerando
   cualquier asociación producto-proveedor (no sólo la preferida) — vía
   parámetro de filtro o vía un campo de respuesta con todas las
   asociaciones del producto. Backend decide con qué
   `replenishment_frequency_days` calcular `suggested_quantity` cuando el
   proveedor pedido no es el preferido.
4. **Reporte por proveedor**: `GET /reports/purchases/by-supplier` define
   explícitamente cómo trata los pedidos sin proveedor (bucket propio o
   exclusión), y lo documenta.

Este borrador **no reemplaza** el trabajo de `openspec-writer`/coordinación
de backend real: es un punto de partida para ese `backend-request.md`, no
una promesa de contrato.

---

Listo para escribir el change cuando el usuario lo decida, entendiendo que
la implementación en sí queda bloqueada hasta que backend despliegue y se
verifique el contrato descripto arriba.
