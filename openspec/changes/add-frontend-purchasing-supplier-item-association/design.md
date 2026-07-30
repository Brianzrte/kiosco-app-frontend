## Context

`PurchaseOrderForm.tsx` ya carga proveedores, productos y sugerencias de reposición (`GET /purchase-orders/suggestions`) para armar un pedido manual. Hoy la sección de sugerencias es una lista única: cada sugerencia con `suggested_quantity` positivo ofrece "Usar N" y cada sugerencia con `suggested_quantity` nulo muestra el texto genérico "Revisar datos", sin distinguir el motivo. El formulario tampoco valida, cuando hay proveedor seleccionado, si el producto elegido en un ítem está asociado a ese proveedor: no existe ningún mecanismo de asociación producto-proveedor fuera de `ProductSuppliersPanel.tsx`, montado en la ficha de producto.

Este change es exclusivamente frontend. Ambos contratos que usa (`GET /purchase-orders/suggestions` y `GET`/`PUT /products/{id}/suppliers`) ya están desplegados y verificados por `add-frontend-suppliers-purchasing`; no se amplía ningún endpoint ni se agrega parámetro nuevo.

## Goals / Non-Goals

**Goals:**

- Cuando no hay proveedor seleccionado, mostrar las sugerencias en dos bloques explicables por su propio motivo (bajo de stock real vs. dato de planificación incompleto), cada uno con su vacío propio.
- Cuando hay proveedor seleccionado, avisar inline si el producto elegido en un ítem no tiene ninguna asociación activa (preferida o no) con ese proveedor, y permitir asociarlo con un click sin perder el pedido en curso.
- Reutilizar el patrón ya existente de alta de asociación (`GET` + `PUT` completo, `preferred: false`) para no introducir un segundo contrato de escritura.

**Non-Goals:**

- Acotar la lista de sugerencias al proveedor seleccionado (queda en el change hermano bloqueado por backend, `ai/requirement-context-purchasing-no-supplier.md`).
- Permitir crear un pedido sin proveedor.
- Marcar como preferida la asociación creada desde el warning inline: sigue siendo tarea exclusiva de `ProductSuppliersPanel.tsx`.
- Recalcular en el cliente la fórmula de reposición o `suggested_quantity`.
- Cualquier cambio a `POST /purchase-orders/{id}/receive`, pagos o reporte por proveedor.

## User flow

1. Admin o Inventory abre `/purchasing/new`.
2. Si no eligió proveedor, ve las sugerencias divididas en "Bajos de stock" (con "Usar N") y "Datos de planificación incompletos" (con la explicación del backend, sin acción automática).
3. Si eligió un proveedor y agrega o cambia el producto de un ítem, el formulario chequea en el momento si ese producto tiene alguna asociación activa con el proveedor elegido.
4. Si no la tiene, ve el warning inline "El producto seleccionado no está asociado a este proveedor, ¿desea asociarlo?" con el botón "Asociar producto al proveedor" en ese ítem.
5. Al confirmar, el frontend relee las asociaciones del producto, agrega la nueva con `preferred: false` y reenvía la lista completa; el warning de ese ítem desaparece y un toast confirma el alta, sin perder cantidades, costos ni otros ítems ya cargados.
6. Completa cantidad y costo unitario de cada ítem y envía el pedido; la creación en sí (`POST /purchase-orders`) no cambia.

## UI states

- **Loading (sugerencias):** se mantiene el estado único ya existente ("Cargando sugerencias…") antes de partir el array en los dos bloques; no hay un segundo fetch.
- **Loading (chequeo de asociación por ítem):** al elegir o cambiar el producto de un ítem con proveedor seleccionado, ese ítem entra en un estado breve de "verificando asociación" en el que no se muestra ni warning ni su ausencia, para evitar un parpadeo de warning falso.
- **Empty (sugerencias):** cada bloque tiene su propio vacío — "No hay productos bajos de stock en este momento." y "No hay productos con datos de planificación incompletos." — en vez de un vacío único para toda la sección; si un bloque tiene ítems y el otro no, el vacío complementario igual se muestra con su texto.
- **Error (chequeo de asociación):** si falla `GET /products/{id}/suppliers` para un ítem, se muestra un error inline acotado a ese ítem con reintento; el resto del formulario no se invalida.
- **Error (alta de asociación):** si falla el `PUT`, el warning permanece, se muestra `ApiError.message` bajo ese ítem y el resto del formulario conserva sus valores.
- **Success (alta de asociación):** el warning de ese ítem desaparece, aparece un toast de confirmación y el formulario no se recarga ni pierde ítems, cantidades o costos ya cargados.

## Decisions

### 1. Partición de sugerencias es display shaping puro

Separar "Bajos de stock" de "Datos de planificación incompletos" se resuelve con una función pura sobre el array ya recibido de `GET /purchase-orders/suggestions`, distinguiendo por `suggested_quantity > 0` vs. `null`. Se descarta pedir dos veces el endpoint o filtrar en el `render`: ambas alternativas duplicarían lógica o esconderían el criterio de partición de una prueba automatizada. La función se agrega a `src/lib/purchasing.ts`, testeable en `node` sin React.

### 2. El chequeo de asociación usa la lista completa de asociaciones, no el campo preferido de la sugerencia

Cada sugerencia de reposición trae un `supplier_id` que identifica sólo el proveedor preferido del producto. Usar ese campo para decidir si mostrar el warning daría falsos positivos: un producto puede estar asociado al proveedor elegido sin ser su preferido. Por eso el chequeo llama `GET /products/{id}/suppliers` para ese producto puntual y evalúa la lista completa. Se acepta el costo de una consulta adicional por selección de producto porque es el único dato que responde correctamente la pregunta "¿está asociado, sea o no preferido?".

### 3. Alta de asociación reutiliza el patrón GET+PUT completo de `ProductSuppliersPanel.tsx`

`PUT /products/{id}/suppliers` reemplaza la lista completa de asociaciones del producto: no existe un endpoint de alta incremental. Para no perder asociaciones existentes, la acción "Asociar producto al proveedor" relee las asociaciones vigentes justo antes de escribir, agrega la nueva con `preferred: false` y sin `replenishment_frequency_days`, y reenvía la lista reconstruida. Se descarta ofrecer "marcar como preferido" desde este warning: esa decisión requiere ver y comparar todas las asociaciones del producto, tarea que sigue siendo exclusiva de `ProductSuppliersPanel.tsx`. Se extraen dos funciones puras y testeables a `src/lib/purchasing.ts` — `hasSupplierAssociation` (evalúa si una lista de asociaciones ya incluye un `supplierId`) y `appendSupplierAssociation` (construye el payload agregando la nueva relación sin remover las existentes) — reduciendo la lógica que hoy sólo vive inline en `ProductSuppliersPanel.tsx`. La refactorización de ese panel para reutilizar las mismas funciones queda señalada como mejora futura, no como parte de este change.

### 4. El warning sólo se evalúa con proveedor seleccionado

Sin proveedor elegido en el pedido no hay contra qué comparar la asociación del producto, y "pedido sin proveedor" es responsabilidad del change hermano bloqueado por backend. Cuando no hay proveedor seleccionado, ningún ítem dispara el chequeo ni el warning.

### 5. Cada cambio de producto en un ítem dispara su propio chequeo y descarta el anterior

Si la persona usuaria cambia el producto de un ítem varias veces antes de enviar el pedido, cada cambio dispara un nuevo chequeo de asociación para ese ítem y el resultado anterior se descarta, para no dejar un warning obsoleto de un producto ya reemplazado en ese mismo ítem.

## Accessibility

El warning se comunica con texto explícito, no sólo con un tono de color; si usa un token de warning del sistema de diseño, el texto sigue siendo la fuente primaria de significado. El botón "Asociar producto al proveedor" es un control nativo con label visible. Los encabezados "Bajos de stock" y "Datos de planificación incompletos" son texto (`h3`/`p`), no una separación puramente visual.

## Keyboard and focus behavior

El warning y su botón se integran al orden de tabulación existente del ítem (mismo `grid` de producto/cantidad/costo/quitar). Al confirmar la asociación, el foco permanece en el control que ocupaba el botón del ítem (que pasa a estar deshabilitado u oculto tras el éxito), para que la persona usuaria siga completando cantidad y costo sin saltos de foco inesperados.

## Responsive behavior

El warning y el botón conviven en el mismo layout de ítem existente (`grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_10rem_auto]` en escritorio, una columna en mobile) sin generar overflow horizontal. Las dos secciones de sugerencias conservan el mismo contenedor con scroll vertical acotado que usa hoy la lista única.

## API contract

Sin endpoints nuevos ni modificados. Se reutilizan exclusivamente:

- `GET /purchase-orders/suggestions` → `ReplenishmentSuggestionsList` (`src/lib/types.ts`), sin parámetros nuevos. `suggested_quantity` nulo identifica dato de planificación incompleto; positivo identifica bajo de stock real.
- `GET /products/{id}/suppliers` → `ProductSuppliersList`, para leer las asociaciones vigentes de un producto puntual al chequear un ítem y justo antes de escribir la nueva asociación.
- `PUT /products/{id}/suppliers` con body `{ suppliers: [{ supplier_id, preferred, replenishment_frequency_days? }] }` → `ProductSuppliersList`, reemplazando la lista completa; el alta nueva usa `preferred: false` sin `replenishment_frequency_days`.

Dinero y fechas no cambian de contrato en este change: ningún campo nuevo de dinero o fecha se introduce.

## Error handling

`401` redirige a login mediante `api()`, sin cambios respecto del comportamiento vigente del formulario. `403` no aplica un caso nuevo: los roles autorizados a crear pedidos y a mutar asociaciones producto-proveedor ya coinciden (Admin/Inventory). Un fallo de `GET /products/{id}/suppliers` al chequear un ítem se muestra inline y acotado a ese ítem, con reintento, sin invalidar el resto del formulario. Un fallo de `PUT /products/{id}/suppliers` al confirmar la asociación muestra `ApiError.message` bajo ese ítem, conserva el warning visible y no asume éxito ni recarga la página.

## Backend coordination

Ninguna. Ambos contratos reutilizados ya están desplegados y verificados por `add-frontend-suppliers-purchasing` (tarea 0.2 de ese change). Este change no requiere `backend-request.md`: no hay endpoint faltante, cambio de contrato, cambio de autorización ni dependencia de despliegue nueva.

## Risks / Trade-offs

- [Consulta adicional por ítem al elegir producto con proveedor seleccionado] → acotada a un chequeo por cambio de producto, con su propio estado de carga y error inline; no bloquea el resto del formulario ni introduce polling.
- [Warning obsoleto tras cambios repetidos de producto en el mismo ítem] → cada cambio de producto descarta el resultado de chequeo anterior de ese ítem antes de mostrar el nuevo.
- [Duplicar lógica de asociación entre este formulario y `ProductSuppliersPanel.tsx`] → se extraen funciones puras compartibles (`hasSupplierAssociation`, `appendSupplierAssociation`) a `src/lib/purchasing.ts`; unificar su uso en `ProductSuppliersPanel.tsx` queda señalado como mejora futura, fuera de este change.

## Migration Plan

No aplica: no hay cambio de contrato, estado persistido ni coordinación de despliegue. Es una mejora de UI pura sobre un formulario ya existente, desplegable como cualquier cambio de frontend.

## Rollback

Si se revierte este change, `PurchaseOrderForm.tsx` vuelve a mostrar la lista única de sugerencias y deja de ofrecer la asociación inline; ninguna asociación producto-proveedor creada mientras el change estuvo activo se revierte automáticamente, porque `PUT /products/{id}/suppliers` ya persistió esos datos en backend de forma indistinguible de una asociación creada desde `ProductSuppliersPanel.tsx`.

## Open Questions

- Copy exacto de los encabezados y vacíos de las dos secciones de sugerencias (usados en este documento: "Bajos de stock" / "Datos de planificación incompletos"; textos de vacío como se detallan en `UI states`), ajustable sin cambiar el comportamiento observable.
- Copy exacto del toast de éxito de la asociación inline (sugerido "Proveedor asociado al producto", consistente con "Proveedores del producto actualizados" de `ProductSuppliersPanel.tsx`).
- Si conviene, en una iteración futura, que `ProductSuppliersPanel.tsx` reutilice `hasSupplierAssociation`/`appendSupplierAssociation` en vez de su lógica inline actual; no bloqueante para este change.
