## Context

`PurchaseOrderForm.tsx` ya carga proveedores, productos y sugerencias de reposición (`GET /purchase-orders/suggestions`) para armar un pedido manual. Hoy la sección de sugerencias es una lista única: cada sugerencia con `suggested_quantity` positivo ofrece "Usar N" y cada sugerencia con `suggested_quantity` nulo muestra el texto genérico "Revisar datos", sin distinguir el motivo. El formulario tampoco valida, cuando hay proveedor seleccionado, si el producto elegido en un ítem está asociado a ese proveedor: no existe ningún mecanismo de asociación producto-proveedor fuera de `ProductSuppliersPanel.tsx`, montado en la ficha de producto.

Este change es exclusivamente frontend. Ambos contratos que usa (`GET /purchase-orders/suggestions` y `GET`/`PUT /products/{id}/suppliers`) ya están desplegados y verificados por `add-frontend-suppliers-purchasing`; no se amplía ningún endpoint ni se agrega parámetro nuevo.

## Goals / Non-Goals

**Goals:**

- Cuando no hay proveedor seleccionado, mostrar las sugerencias en dos bloques explicables por su propio motivo (bajo de stock real vs. dato de planificación incompleto), cada uno con su vacío propio y un tono de color distinto que refuerce (sin reemplazar) la distinción textual.
- Hacer accionable el bloque de datos incompletos: permitir marcar un ítem, ingresar una cantidad manual y agregarlo al pedido, en vez de mostrarlo como texto puramente informativo.
- Cuando hay proveedor seleccionado, avisar inline si el producto elegido en un ítem no tiene ninguna asociación activa (preferida o no) con ese proveedor, y permitir asociarlo con un click sin perder el pedido en curso.
- Reutilizar el patrón ya existente de alta de asociación (`GET` + `PUT` completo, `preferred: false`) para no introducir un segundo contrato de escritura.
- Exigir una confirmación final con resumen (productos, cantidades, costos, subtotales, total) antes de enviar `POST /purchase-orders`, para que la persona usuaria revise una compra real antes de crearla.
- Permitir filtrar el bloque "Datos de planificación incompletos" por nombre de producto con un buscador expandible, sin pedir datos nuevos al backend.
- Permitir elegir el producto de un ítem con un combobox buscable en vez de un `<select>` nativo, reutilizando el patrón accesible ya usado en el buscador de productos del POS.

**Non-Goals:**

- Acotar la lista de sugerencias al proveedor seleccionado (queda en el change hermano bloqueado por backend, `ai/requirement-context-purchasing-no-supplier.md`).
- Permitir crear un pedido sin proveedor.
- Marcar como preferida la asociación creada desde el warning inline: sigue siendo tarea exclusiva de `ProductSuppliersPanel.tsx`.
- Recalcular en el cliente la fórmula de reposición o `suggested_quantity`.
- Cualquier cambio a `POST /purchase-orders/{id}/receive`, pagos o reporte por proveedor.

## User flow

1. Admin o Inventory abre `/purchasing/new`.
2. Si no eligió proveedor, ve las sugerencias divididas en "Bajos de stock" (con "Usar N") y "Datos de planificación incompletos", cada bloque con su propio tono de color.
3. En "Datos de planificación incompletos", puede hacer click en la lupa junto al encabezado para expandir un campo de búsqueda hacia la izquierda y filtrar la lista por nombre de producto; puede marcar el checkbox de un producto filtrado o no, ingresar una cantidad y confirmar para agregarlo al pedido; si desmarca antes de confirmar, el campo se oculta sin agregar nada.
4. Al elegir el producto de cualquier ítem del pedido, escribe en el combobox de producto para filtrar el catálogo ya cargado y lo selecciona de la lista de resultados (con mouse o teclado), en vez de desplegar un `<select>` con todas las opciones.
5. Si eligió un proveedor y agrega o cambia el producto de un ítem, el formulario chequea en el momento si ese producto tiene alguna asociación activa con el proveedor elegido.
6. Si no la tiene, ve el warning inline "El producto seleccionado no está asociado a este proveedor, ¿desea asociarlo?" con el botón "Asociar producto al proveedor" en ese ítem.
7. Al confirmar, el frontend relee las asociaciones del producto, agrega la nueva con `preferred: false` y reenvía la lista completa; el warning de ese ítem desaparece y un toast confirma el alta, sin perder cantidades, costos ni otros ítems ya cargados.
8. Completa cantidad y costo unitario de cada ítem y hace click en "Crear pedido"; la validación de campos existente corre igual que hoy.
9. Si la validación pasa, se abre un modal con el resumen del pedido (producto, cantidad, costo unitario, subtotal por ítem y total). Al confirmar en el modal recién se envía `POST /purchase-orders`; al cancelar o cerrar el modal, vuelve al formulario sin enviar nada y sin perder ningún valor cargado.

## UI states

- **Loading (sugerencias):** se mantiene el estado único ya existente ("Cargando sugerencias…") antes de partir el array en los dos bloques; no hay un segundo fetch.
- **Loading (chequeo de asociación por ítem):** al elegir o cambiar el producto de un ítem con proveedor seleccionado, ese ítem entra en un estado breve de "verificando asociación" en el que no se muestra ni warning ni su ausencia, para evitar un parpadeo de warning falso.
- **Empty (sugerencias):** cada bloque tiene su propio vacío — "No hay productos bajos de stock en este momento." y "No hay productos con datos de planificación incompletos." — en vez de un vacío único para toda la sección; si un bloque tiene ítems y el otro no, el vacío complementario igual se muestra con su texto.
- **Error (chequeo de asociación):** si falla `GET /products/{id}/suppliers` para un ítem, se muestra un error inline acotado a ese ítem con reintento; el resto del formulario no se invalida.
- **Error (alta de asociación):** si falla el `PUT`, el warning permanece, se muestra `ApiError.message` bajo ese ítem y el resto del formulario conserva sus valores.
- **Success (alta de asociación):** el warning de ese ítem desaparece, aparece un toast de confirmación y el formulario no se recarga ni pierde ítems, cantidades o costos ya cargados.
- **Checklist de datos incompletos (cerrado → abierto):** al marcar el checkbox de un ítem, aparece inline un campo de cantidad y un botón "Agregar"; el resto de la lista no se recarga.
- **Checklist de datos incompletos (desmarcado sin confirmar):** al desmarcar antes de confirmar, el campo de cantidad se oculta y no se agrega ningún ítem al pedido; no hay estado intermedio persistido.
- **Modal de confirmación (apertura):** se abre sólo si la validación de campos ya existente pasa; si falla, el formulario muestra el error inline como hoy y el modal no se abre.
- **Modal de confirmación (envío en curso):** el botón "Confirmar pedido" entra en estado `pending` (mismo patrón que `Button`/`pending` ya usado en el submit actual); el resto del modal permanece visible y no interactivo mientras tanto.
- **Modal de confirmación (error de envío):** si el `POST /purchase-orders` falla, el modal permanece abierto, se muestra `ApiError.message` dentro del modal (no se cierra ni se pierde el resumen) y "Confirmar pedido" vuelve a estar disponible para reintentar.
- **Modal de confirmación (éxito):** el modal se cierra, se dispara el mismo flujo ya existente (toast "Pedido creado" y redirección a `/purchasing/{id}`).
- **Buscador de datos incompletos (colapsado → expandido):** al hacer click en la lupa, el campo de texto se expande hacia la izquierda con una transición de ancho/opacidad usando `--motion-base`/`--ease-standard`; el encabezado y la lupa permanecen en su posición.
- **Buscador de datos incompletos (expandido, sin resultados):** si el término no coincide con ningún producto de la sección, se muestra el mismo patrón de vacío ya usado en la sección (texto explicativo), no una lista vacía sin contexto.
- **Buscador de datos incompletos (colapsar):** al volver a hacer click en la lupa, presionar `Esc` con el campo enfocado, o perder el foco con el campo vacío, el campo se colapsa con la misma transición y el filtro se limpia, mostrando de nuevo la lista completa.
- **Combobox de producto (escribiendo):** al tipear, se filtran los productos ya cargados por nombre (client-side, sin nuevo fetch) y se muestra una lista de resultados navegable con teclado, mismo patrón que el buscador del POS.
- **Combobox de producto (sin resultados):** si ningún producto coincide, se muestra un mensaje inline ("Ningún producto coincide con…"), sin dejar la lista de resultados vacía sin explicación.
- **Combobox de producto (selección):** al elegir un resultado (click o Enter), el campo muestra el nombre del producto elegido y el `productId` del ítem se actualiza igual que antes con el `<select>`, disparando el mismo chequeo de asociación si hay proveedor seleccionado (decisión 2).

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

### 6. El color de cada sección de sugerencias es un refuerzo visual, no la única señal

Se usan los tonos ya existentes de `Badge.tsx` (sin definir tonos nuevos): un tono `success`/`info` para acompañar la cantidad sugerida en "Bajos de stock" (urgencia real, acción disponible) y un tono `neutral`/pastel para "Datos de planificación incompletos" (menor urgencia, requiere completar datos antes de poder actuar). El color decora un badge o borde junto al texto ya existente; el encabezado y la explicación siguen siendo la fuente primaria de significado, consistente con la decisión de accesibilidad ya vigente en este change (el warning no se comunica sólo con color).

### 7. El checklist de datos incompletos agrega el ítem sólo al confirmar, nunca al marcar el checkbox

Marcar el checkbox únicamente revela el campo de cantidad; no agrega nada al pedido todavía. Desmarcarlo antes de confirmar descarta cualquier cantidad tipeada sin efecto sobre el pedido. Sólo el botón de confirmar ejecuta la misma función ya usada por "Usar N" (`addSuggestion`), agregando un ítem con ese `product_id` y la cantidad ingresada, con costo unitario vacío para completar abajo. Se descarta agregar el ítem automáticamente al marcar el checkbox porque el requerimiento pide una cantidad explícita que el backend no puede sugerir para estos productos (por eso están en la sección de datos incompletos).

### 8. El modal de confirmación es un paso de repaso, no una segunda validación

La validación de campos (proveedor, fecha, producto/cantidad/costo por ítem) sigue ejecutándose exactamente igual que hoy, antes de abrir el modal; el modal no repite ni relaja esa validación. Los subtotales y el total que muestra el modal se calculan en el cliente (`cantidad × costo unitario`, formateados con `formatMoney()`) como una vista previa: son consistentes con lo que se va a enviar, pero el total autoritativo sigue siendo el que devuelve el backend tras crear el pedido, sin cambios respecto del comportamiento actual. Si el `POST` falla tras confirmar, el modal permanece abierto con el resumen intacto y el error visible, para no obligar a reconstruir el resumen ni perder el intento.

### 9. El buscador de datos incompletos filtra client-side sobre datos ya cargados, la expansión es sólo chrome visual

`GET /purchase-orders/suggestions` ya se pide una única vez por carga del formulario (decisión 1); no hay ninguna razón para pedirlo de nuevo por cada tecleo. El buscador agrega una función pura de filtro (por `product_name`, case-insensitive, sin acentos si el resto de la app ya normaliza así) en `src/lib/purchasing.ts`, aplicada sobre el resultado ya partido de `incompleteData`. La animación de expansión/colapso del campo es puramente visual (ancho/opacidad con los tokens `--motion-base`/`--ease-standard` ya definidos en `globals.css`), no afecta el estado del filtro salvo al colapsar, momento en que el término se limpia y la lista vuelve a mostrarse completa — se descarta conservar el filtro colapsado porque el ícono de lupa ya visualmente indica "sin búsqueda activa" cuando el campo está cerrado, y conservar un filtro invisible sería confuso.

### 10. El combobox de producto reutiliza el patrón ya implementado en el buscador de POS, no una librería nueva

`PosView.tsx` ya resuelve el mismo problema (elegir un producto de un catálogo potencialmente extenso mediante texto libre) con un patrón 100% accesible sin dependencias externas: `<input role="combobox" aria-expanded aria-controls aria-activedescendant>`, una lista de resultados con `role="option"`, navegación con flechas/Enter/`Esc`, y filtro client-side con `useMemo`. Se reutiliza ese mismo patrón para el producto de cada ítem de `PurchaseOrderForm.tsx`, filtrando sobre el array `products` ya cargado por `useLoad` (sin nuevo fetch), en vez de adoptar una librería de combobox/autocomplete nueva. Al seleccionar un resultado, se llama al mismo `onUpdate("productId", value)` que ya usa el `<select>` actual, por lo que el chequeo de asociación (decisión 2) y el resto del flujo del ítem no cambian de contrato interno, sólo el control de entrada. Cada ítem mantiene su propio estado de texto/resultados, igual que cada `SupplierAssociationCheck` es independiente por ítem.

## Accessibility

El warning se comunica con texto explícito, no sólo con un tono de color; si usa un token de warning del sistema de diseño, el texto sigue siendo la fuente primaria de significado. El botón "Asociar producto al proveedor" es un control nativo con label visible. Los encabezados "Bajos de stock" y "Datos de planificación incompletos" son texto (`h3`/`p`), no una separación puramente visual; el color agregado (decisión 6) es un refuerzo adicional, nunca la única señal. El checkbox de datos incompletos usa un `<label>` asociado y el campo de cantidad revelado tiene su propio `label` visible (mismo patrón que `Input` en el resto del formulario). El modal de confirmación reutiliza `Dialog.tsx`, que ya maneja `<dialog>` nativo (foco atrapado y `Esc` para cerrar por comportamiento nativo del elemento); el resumen usa una tabla o lista con texto plano, sin depender de color para distinguir producto/cantidad/costo/subtotal. El botón de lupa del buscador de datos incompletos es un control nativo con `aria-label` visible ("Buscar en datos de planificación incompletos") y `aria-expanded` reflejando si el campo está abierto; el campo revelado tiene un `label` (visualmente oculto si el diseño lo requiere, pero presente en el DOM). El combobox de producto sigue exactamente el mismo contrato de accesibilidad ya implementado en `PosView.tsx` (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, opciones con `role="option"` y `aria-selected`), sin relajar ninguno de esos atributos al adaptarlo a este formulario.

## Keyboard and focus behavior

El warning y su botón se integran al orden de tabulación existente del ítem (mismo `grid` de producto/cantidad/costo/quitar). Al confirmar la asociación, el foco permanece en el control que ocupaba el botón del ítem (que pasa a estar deshabilitado u oculto tras el éxito), para que la persona usuaria siga completando cantidad y costo sin saltos de foco inesperados. El checkbox y el campo de cantidad revelado en "Datos de planificación incompletos" siguen el orden de tabulación natural del ítem de la lista. Al abrir el modal de confirmación, el foco inicial queda dentro del modal (comportamiento nativo de `<dialog>.showModal()`, ya usado por `Dialog.tsx`); al cerrarlo (cancelar, confirmar con éxito o `Esc`), el foco vuelve al botón "Crear pedido" que lo disparó, mismo patrón ya usado por `CashierShiftClosingModal.tsx`. Al hacer click en la lupa del buscador de datos incompletos, el foco pasa al campo recién expandido; `Esc` con el campo enfocado lo colapsa y devuelve el foco al botón de lupa (mismo patrón de "cerrar sin perder el punto de partida" que el modal). El combobox de producto usa la misma navegación por teclado ya implementada en `PosView.tsx` (flechas para mover la selección activa, `Enter` para confirmarla, `Esc` para descartar los resultados sin perder el texto tipeado), integrado al mismo orden de tabulación que hoy ocupa el `<select>` de producto.

## Responsive behavior

El warning y el botón conviven en el mismo layout de ítem existente (`grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_10rem_auto]` en escritorio, una columna en mobile) sin generar overflow horizontal. Las dos secciones de sugerencias conservan el mismo contenedor con scroll vertical acotado que usa hoy la lista única; el campo de cantidad revelado por el checkbox se integra en el mismo `<li>` sin romper el layout en mobile. El modal de confirmación usa `Dialog` con un `className` más ancho que el `max-w-md` por defecto (por ejemplo `max-w-lg` o `max-w-2xl`, a definir en implementación) para que la lista de productos sea legible en escritorio, y su contenido interno usa scroll vertical acotado (mismo patrón `max-h-*/overflow-y-auto` que las listas de sugerencias) si el pedido tiene muchos ítems, sin overflow horizontal en mobile. El buscador de datos incompletos expande el campo dentro del ancho disponible del encabezado (`flex` con `justify-between` ya existente), sin forzar overflow horizontal en mobile; si el espacio es insuficiente, el campo puede ocupar el ancho completo de la sección en una fila propia en mobile. El combobox de producto ocupa la misma celda del `grid` que hoy ocupa el `<select>` (`minmax(0,1fr)`), sin cambiar el layout de columnas del ítem.

## API contract

Sin endpoints nuevos ni modificados. Se reutilizan exclusivamente:

- `GET /purchase-orders/suggestions` → `ReplenishmentSuggestionsList` (`src/lib/types.ts`), sin parámetros nuevos. `suggested_quantity` nulo identifica dato de planificación incompleto; positivo identifica bajo de stock real.
- `GET /products/{id}/suppliers` → `ProductSuppliersList`, para leer las asociaciones vigentes de un producto puntual al chequear un ítem y justo antes de escribir la nueva asociación.
- `PUT /products/{id}/suppliers` con body `{ suppliers: [{ supplier_id, preferred, replenishment_frequency_days? }] }` → `ProductSuppliersList`, reemplazando la lista completa; el alta nueva usa `preferred: false` sin `replenishment_frequency_days`.

Dinero y fechas no cambian de contrato en este change: ningún campo nuevo de dinero o fecha se introduce. `POST /purchase-orders` no cambia de request ni de response; sólo se pospone el momento en que el formulario lo invoca, desde el submit del `<form>` hasta la confirmación dentro del modal. El buscador de datos incompletos y el combobox de producto no agregan parámetros de consulta nuevos: ambos filtran client-side sobre `GET /purchase-orders/suggestions` y `GET /products` ya cargados una sola vez por el formulario.

## Error handling

`401` redirige a login mediante `api()`, sin cambios respecto del comportamiento vigente del formulario. `403` no aplica un caso nuevo: los roles autorizados a crear pedidos y a mutar asociaciones producto-proveedor ya coinciden (Admin/Inventory). Un fallo de `GET /products/{id}/suppliers` al chequear un ítem se muestra inline y acotado a ese ítem, con reintento, sin invalidar el resto del formulario. Un fallo de `PUT /products/{id}/suppliers` al confirmar la asociación muestra `ApiError.message` bajo ese ítem, conserva el warning visible y no asume éxito ni recarga la página. Un fallo de `POST /purchase-orders` al confirmar en el modal muestra `ApiError.message` dentro del propio modal (mismo texto que hoy se mostraba bajo el formulario), sin cerrarlo ni descartar el resumen, para permitir reintentar sin volver a abrir el modal ni reconstruir el pedido.

## Backend coordination

Ninguna. Ambos contratos reutilizados ya están desplegados y verificados por `add-frontend-suppliers-purchasing` (tarea 0.2 de ese change). Este change no requiere `backend-request.md`: no hay endpoint faltante, cambio de contrato, cambio de autorización ni dependencia de despliegue nueva.

## Risks / Trade-offs

- [Consulta adicional por ítem al elegir producto con proveedor seleccionado] → acotada a un chequeo por cambio de producto, con su propio estado de carga y error inline; no bloquea el resto del formulario ni introduce polling.
- [Warning obsoleto tras cambios repetidos de producto en el mismo ítem] → cada cambio de producto descarta el resultado de chequeo anterior de ese ítem antes de mostrar el nuevo.
- [Duplicar lógica de asociación entre este formulario y `ProductSuppliersPanel.tsx`] → se extraen funciones puras compartibles (`hasSupplierAssociation`, `appendSupplierAssociation`) a `src/lib/purchasing.ts`; unificar su uso en `ProductSuppliersPanel.tsx` queda señalado como mejora futura, fuera de este change.
- [Redondeo o desalineación entre el subtotal mostrado en el modal y el total que finalmente devuelve el backend] → el modal aclara textualmente que el total es un resumen antes de crear el pedido; el total autoritativo sigue siendo el de la respuesta del backend tras el `POST`, sin cambios respecto del comportamiento actual (`formatMoney()` sobre strings decimales en ambos casos, mismo criterio de redondeo que ya usa el resto de la app).
- [El checklist de datos incompletos permite agregar cantidades sin ningún límite sugerido por backend, a diferencia de "Usar N"] → se acepta como parte del alcance pedido: el backend no puede sugerir una cantidad para estos productos (por eso están en esta sección); la persona usuaria decide la cantidad como si agregara un producto manualmente, sin una validación de negocio adicional más allá de la ya existente (entero positivo).
- [Duplicar el patrón de combobox entre `PosView.tsx` y `PurchaseOrderForm.tsx` en vez de extraerlo a un componente compartido] → se acepta para este change por alcance acotado (un solo campo, sin scanner de código de barras ni las particularidades de venta del POS); extraer un componente `Combobox` reutilizable queda señalado como mejora futura, no bloqueante.
- [Catálogo de productos grande vuelve el filtro client-side del combobox más lento que un filtro server-side] → aceptado porque el formulario ya carga el catálogo completo hoy (`GET /products?limit=100`) para el `<select>` actual; el combobox no agrega carga adicional, sólo cambia cómo se navega la misma lista ya en memoria.

## Migration Plan

No aplica: no hay cambio de contrato, estado persistido ni coordinación de despliegue. Es una mejora de UI pura sobre un formulario ya existente, desplegable como cualquier cambio de frontend.

## Rollback

Si se revierte este change, `PurchaseOrderForm.tsx` vuelve a mostrar la lista única de sugerencias y deja de ofrecer la asociación inline; ninguna asociación producto-proveedor creada mientras el change estuvo activo se revierte automáticamente, porque `PUT /products/{id}/suppliers` ya persistió esos datos en backend de forma indistinguible de una asociación creada desde `ProductSuppliersPanel.tsx`.

## Open Questions

- Copy exacto de los encabezados y vacíos de las dos secciones de sugerencias (usados en este documento: "Bajos de stock" / "Datos de planificación incompletos"; textos de vacío como se detallan en `UI states`), ajustable sin cambiar el comportamiento observable.
- Copy exacto del toast de éxito de la asociación inline (sugerido "Proveedor asociado al producto", consistente con "Proveedores del producto actualizados" de `ProductSuppliersPanel.tsx`).
- Si conviene, en una iteración futura, que `ProductSuppliersPanel.tsx` reutilice `hasSupplierAssociation`/`appendSupplierAssociation` en vez de su lógica inline actual; no bloqueante para este change.
- Copy exacto del botón de confirmar cantidad en el checklist de datos incompletos (sugerido "Agregar") y del título/encabezado del modal de confirmación (sugerido "Confirmar pedido" o "Resumen del pedido"), ajustable sin cambiar el comportamiento observable.
- Ancho exacto (`max-w-lg` vs. `max-w-2xl`) del modal de confirmación, a definir en implementación según cuántos ítems entren legibles sin scroll en escritorio.
- Si el badge de color de "Bajos de stock" debe mostrar la cantidad sugerida dentro del badge (ej. badge con el número) o sólo acompañar el texto existente sin duplicar información; no bloqueante, ajustable en implementación.
- Copy exacto del `aria-label` de la lupa y del placeholder del campo de búsqueda de datos incompletos (sugerido "Buscar producto…"), ajustable sin cambiar el comportamiento observable.
- Si el combobox de producto debe mostrar además el SKU u otro dato distintivo del producto en cada resultado (como ya hace el buscador del POS con `sku`), o sólo el nombre; a definir en implementación según qué datos ya expone `Product`.
