# Rediseño de la sección Compras y proveedores (frontend puro)

## Why

La sección de compras creció por partes: el hub reparte la atención entre
pendientes, filtros y un panel lateral de acciones; el pedido nuevo se arma en
un componente de 932 líneas; y la recepción vive dentro de un diálogo donde
todas las líneas se editan a la vez, sin decir qué falta resolver ni qué pasa
si no llega nada. Además la mercadería recurrente se vuelve a tipear entera
cada semana: no hay forma de partir de lo que ya se le compró al proveedor,
aunque el backend ya expone ese historial.

Hay un rediseño aprobado por la persona usuaria que resuelve las tres cosas con
el contrato que **ya existe**. Este change adopta la parte de ese rediseño que
no depende de backend nuevo, y aprovecha el rework para cerrar una deuda
estructural: la capability `ui-receiving` sigue exigiendo una sección en
`/receiving` que hoy es sólo un `redirect` a `/purchasing`.

## What Changes

- **Hub `/purchasing`**: la CTA `Crear pedido` y los accesos a historial y
  proveedores suben al encabezado, desaparece el panel lateral de acciones, y
  los pedidos pendientes pasan de tabla a filas tipo card con proveedor,
  fecha del pedido, total, estado y acción `Recibir` directa. Los filtros
  quedan como bloque compacto al pie, junto a un teaser que lleva las
  sugerencias de reposición al formulario de pedido.
- **Nuevo pedido `/purchasing/new`**: al elegir proveedor, el borrador se
  precarga con las líneas del último pedido a ese proveedor
  (`GET /purchase-orders?supplier_id=X&limit=1` + `GET /purchase-orders/{id}`,
  ambos existentes), con un banner explícito de precarga editable y el detalle
  de qué líneas no se precargaron y por qué. Las sugerencias de reposición
  bajan a ayuda secundaria debajo de la tabla de productos.
- **Detalle de pedido `/purchasing/[id]`**: la recepción deja de ser un diálogo
  con todas las líneas juntas y pasa a un modelo de resolución línea por línea
  — `Recibí todo`, `Recibí menos`, `No lo trajo` — con motivo obligatorio que
  bloquea la línea antes de intentar nada, `Deshacer` por línea, contador
  "N de M líneas resueltas" y un confirmar con tres estados, incluido el aviso
  explícito de que un pedido sin nada recibido se cancela.
- **Alta de ítem no pedido**: el selector de modo pasa de `<select>` a dos
  pestañas grandes (`Buscar en el catálogo` / `Describir el producto`), y el
  modo texto libre muestra, **antes** de guardar, qué significa que el ítem
  quede "Pendiente de alta".
- **Estructura interna**: se parte `PurchaseOrderForm.tsx` (932 líneas) en
  componentes antes de sumarle la precarga; `ReceivingDetailView.tsx` y
  `AddPurchaseOrderItemForm.tsx` se mudan a `src/components/purchasing/`; se
  borra el re-export muerto `ReceivingListView.tsx`.
- **Capabilities**: los requirements vigentes de `ui-receiving` se re-alojan en
  `ui-suppliers-purchasing` con las rutas reales (`/purchasing`,
  `/purchasing/[id]`) y `ui-receiving` queda sin requirements. Los stubs de
  redirect `/suppliers`, `/receiving` y `/receiving/[id]` se conservan por
  compatibilidad de links y marcadores.
- **BREAKING (documental, no de runtime)**: `ui-receiving` deja de existir como
  capability con requirements propios. Cualquier change abierto que declare un
  delta sobre `ui-receiving` debe re-alojarlo en `ui-suppliers-purchasing`
  antes de archivarse (ver `design.md` → `Risks / Trade-offs`).

**Fuera de alcance de este change** (van a
`add-frontend-purchasing-supplier-data-and-scheduling`, que está bloqueado por
backend): fecha objetivo del pedido, los bloques "Qué llega hoy" / "Esta
semana" / "Atrasado" del hub, la ficha de proveedor con datos de contacto, las
cantidades decimales para pesables y los permisos de compras para el rol
`cashier`. Tampoco entra el restyling de `/purchasing/suppliers` ni de
`/purchasing/history`: el rediseño aprobado no tiene mockup de esas pantallas.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `ui-suppliers-purchasing`: el hub reordena su jerarquía y sus acciones, el
  formulario de pedido precarga el último pedido del proveedor y baja las
  sugerencias a ayuda secundaria, el detalle de pedido pasa a resolución línea
  por línea antes de confirmar la recepción, el alta de ítem no pedido expone
  sus dos modos como pestañas con aviso previo, y la capability absorbe los
  requirements de recepción con sus rutas reales.
- `ui-receiving`: se remueven todos sus requirements; su comportamiento vigente
  queda re-alojado en `ui-suppliers-purchasing`.

## Impact

- `src/components/purchasing/PurchasingHubView.tsx`: encabezado con acciones,
  filas card de pendientes con acción `Recibir`, filtros y teaser al pie.
- `src/components/purchasing/PurchaseOrderForm.tsx`: se parte en
  `PurchaseOrderItemRow.tsx`, `ProductCombobox.tsx`,
  `SupplierAssociationCheck.tsx`, `ReplenishmentSuggestionsPanel.tsx` y
  `PurchaseOrderConfirmationModal.tsx` dentro de
  `src/components/purchasing/`, y recién después suma la precarga y su banner.
- `src/components/receiving/ReceivingDetailView.tsx` →
  `src/components/purchasing/ReceivingDetailView.tsx`, reescrito al modelo de
  resolución línea por línea, con la confirmación de recepción (método de pago
  y aviso de qué se registra) en un diálogo propio.
- `src/components/receiving/AddPurchaseOrderItemForm.tsx` →
  `src/components/purchasing/AddPurchaseOrderItemForm.tsx`, con pestañas de
  modo y banner de "Pendiente de alta".
- `src/components/receiving/ReceivingListView.tsx`: se elimina (re-export
  muerto, sin importadores).
- `src/app/(app)/purchasing/[id]/page.tsx`: actualiza el import al nuevo path.
- `src/lib/purchasing.ts`: suma la derivación pura del borrador desde el último
  pedido, la query del último pedido y la construcción/resumen del payload de
  recepción; `src/lib/purchasing.test.ts` cubre esos helpers.
- Endpoints: sólo los ya existentes y verificados en
  `../backend/internal/bootstrap/router.go` — `GET /purchase-orders`,
  `GET /purchase-orders/{id}`, `POST /purchase-orders/{id}/receive`,
  `POST /purchase-orders/{id}/items`,
  `DELETE /purchase-orders/{id}/items/{item_id}`, `GET /suppliers`,
  `GET /products`, `GET /purchase-orders/suggestions`. **No requiere backend
  nuevo**, por lo que este change no incluye `backend-request.md`.
- No agrega dependencias ni modifica `package.json`.
- Convive con `refactor-erp-pos-visual-system` (mueve tokens; por eso el
  rediseño se implementa traduciendo a tokens y nunca copiando hex) y con
  `add-frontend-purchasing-optional-supplier` (pedido sin proveedor: sin
  proveedor no hay precarga posible).
