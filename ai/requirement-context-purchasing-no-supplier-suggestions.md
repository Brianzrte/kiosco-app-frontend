# Requirement Context: Sugerencias de reposición en dos secciones y asociación inline producto-proveedor

> **Documento A — sin bloqueo de backend, listo para `openspec-writer`.**
> Cubre la parte de "sugerencias filtradas" que **no** depende de ampliar
> ningún contrato (mostrar dos secciones cuando no hay proveedor
> seleccionado) y el punto 3 completo (asociación inline producto-proveedor
> desde la creación del pedido). La parte de "acotar sugerencias al
> proveedor seleccionado considerando cualquier asociación" y el punto
> "pedido sin proveedor" quedan en el documento hermano
> `ai/requirement-context-purchasing-no-supplier.md` (Documento B), bloqueado
> por backend. Ambos documentos comparten el mismo terreno de UI
> (`PurchaseOrderForm.tsx`) y **deberían implementarse coordinadamente** para
> no pisarse, pero no comparten dependencia de backend.

## Objective

Sobre `/purchasing/new` (`PurchaseOrderForm.tsx`):

1. Cuando el usuario **no** eligió proveedor, separar la sección de
   sugerencias de reposición en dos: productos realmente bajos de stock
   (`suggested_quantity > 0`) y productos con datos de planificación
   incompletos (`suggested_quantity` nulo), en vez de la lista única actual
   que mezcla ambos casos bajo el mismo texto "Revisar datos".
2. Permitir asociar, desde la creación del pedido, un producto elegido al
   proveedor seleccionado cuando esa asociación todavía no existe —
   cualquier asociación, no sólo la preferida — sin salir del formulario.

## Current behavior

`PurchaseOrderForm.tsx` (`src/components/purchasing/PurchaseOrderForm.tsx`):

- Las sugerencias vienen de `GET /purchase-orders/suggestions` (línea 37) y
  se muestran todas en una sola lista (líneas 149–172): cada `suggestion`
  con su `explanation`, y si tiene `suggested_quantity` un botón "Usar N"; si
  no, el texto "Revisar datos". No hay separación entre "bajo de stock real"
  y "dato incompleto".
- No existe ningún mecanismo de asociación producto-proveedor desde este
  formulario. La única pantalla que asocia productos y proveedores es
  `ProductSuppliersPanel.tsx` (`src/components/products/ProductSuppliersPanel.tsx`),
  montada desde la ficha de producto, no desde la creación de un pedido.
  Usa `GET /products/{id}/suppliers` para leer las asociaciones vigentes y
  `PUT /products/{id}/suppliers` con la lista completa reconstruida (líneas
  144–177): el endpoint reemplaza todas las asociaciones del producto, no
  agrega una sola. El alta nueva se agrega con `preferred: false` por
  defecto (línea 107–118, `addSupplier`).

Backend real (evidencia ya verificada en el análisis previo, se repite lo
mínimo relevante):

- `GET /purchase-orders/suggestions` no acepta parámetros
  (`../backend/internal/purchasing/application/list_replenishment_suggestions.go:15`).
  Su consulta SQL incluye tanto productos con `suggested_quantity > 0` como
  productos con `suggested_quantity` nulo por falta de proveedor preferido o
  de frecuencia configurada
  (`../backend/internal/purchasing/infrastructure/postgres_replenishment_suggestions.go:52`).
  El frontend ya recibe ambos casos distinguibles por `suggested_quantity ===
  null` vs. `> 0`: separar la sección **no requiere ningún cambio de
  backend**, es *display shaping* puro sobre una respuesta ya completa.
- `GET`/`PUT /products/{id}/suppliers` (`../backend/internal/bootstrap/router.go:53-54`)
  devuelven/reciben la lista completa de asociaciones de un producto, con
  `supplier_id`, `preferred` y `replenishment_frequency_days` nullable
  (`../backend/internal/purchasing/transport/http/dto.go:23-37`). Esta lista
  **sí incluye asociaciones no preferidas**, a diferencia del campo
  `supplier_id` que trae cada sugerencia de reposición (que sólo informa el
  preferido). Por eso, para saber si un producto ya está asociado al
  proveedor seleccionado del pedido — cualquier asociación, no sólo la
  preferida — hay que consultar este endpoint, no el campo de la sugerencia.

## Desired behavior

1. **Sugerencias en dos secciones (sin proveedor seleccionado)**
   - WHEN el usuario abre `/purchasing/new` sin elegir proveedor THEN la
     sección de sugerencias se divide en dos bloques: "Bajos de stock"
     (`suggested_quantity > 0`, con su botón "Usar N" como hoy) y "Datos de
     planificación incompletos" (`suggested_quantity` nulo, con su
     `explanation` visible, sin acción de "usar" automática).
   - WHEN alguno de los dos bloques está vacío THEN ese bloque muestra su
     propio texto de vacío en vez de desaparecer sin explicación (ver
     `## Copy and feedback`).
   - Esta sección no cambia cuando el usuario **sí** elige un proveedor: el
     comportamiento de la lista de sugerencias con proveedor seleccionado es
     responsabilidad del Documento B (bloqueado por backend); hasta que ese
     change se implemente, la lista con proveedor seleccionado sigue
     mostrando las mismas dos secciones sin acotar por proveedor.

2. **Asociación inline producto-proveedor**
   - WHEN hay un proveedor seleccionado para el pedido y el usuario elige,
     en un ítem, un producto que **no tiene ninguna asociación activa**
     (preferida o no) con ese proveedor THEN el ítem muestra un warning
     inline: *"El producto seleccionado no está asociado a este proveedor,
     ¿desea asociarlo?"* junto a un botón *"Asociar producto al
     proveedor"*.
   - WHEN el producto elegido **sí** tiene una asociación activa con el
     proveedor seleccionado (preferida o no) THEN no se muestra ningún
     warning.
   - WHEN el usuario hace click en "Asociar producto al proveedor" THEN el
     frontend relee las asociaciones vigentes del producto
     (`GET /products/{id}/suppliers`), agrega la relación con el proveedor
     seleccionado (`preferred: false`, sin `replenishment_frequency_days`) y
     reenvía la lista completa (`PUT /products/{id}/suppliers`),
     preservando las asociaciones existentes.
   - WHEN la asociación se confirma THEN el warning de ese ítem desaparece,
     un toast de éxito lo confirma, y el pedido en curso (otros ítems ya
     cargados, cantidades, costos) no se pierde ni se recarga la página.
   - WHEN falla el alta de la asociación THEN el warning permanece, se
     muestra el mensaje de `ApiError` bajo ese ítem, y el resto del
     formulario no se invalida.
   - WHEN no hay ningún proveedor seleccionado para el pedido THEN no se
     evalúa ni se muestra ningún warning de asociación (no hay proveedor
     contra el cual comparar).

## Primary actor

Admin e Inventory: los mismos roles ya gateados para crear pedidos
(`creationWrapped`, `../backend/internal/bootstrap/router.go:183`) y para
mutar asociaciones producto-proveedor (`productSuppliersWithAuth`, líneas
53–54). Ningún actor nuevo.

## Roles and permissions

Sin cambios: `POST /purchase-orders` y `PUT /products/{id}/suppliers` son
Admin/Inventory-only en el backend; la UI ya replica ese gate en
`/purchasing/new`. No se duplica ninguna regla de permisos nueva.

## Main user flow

1. Admin o Inventory abre `/purchasing/new`.
2. Si no eligió proveedor, ve las sugerencias separadas en "Bajos de stock"
   y "Datos de planificación incompletos"; usa "Usar N" en las primeras para
   agregarlas como ítem.
3. Si eligió un proveedor y agrega o cambia el producto de un ítem, y ese
   producto no tiene ninguna asociación con el proveedor elegido, ve el
   warning y puede asociarlo con un click sin perder lo ya cargado en el
   formulario.
4. Completa cantidad y costo unitario de cada ítem y envía el pedido; el
   flujo de creación en sí (`POST /purchase-orders` con `supplier_id`
   obligatorio) no cambia en este documento.

## UI states

- **Loading**: la sección de sugerencias ya maneja `!suggestions` con
  "Cargando sugerencias…"; al dividir en dos bloques, ese estado de carga
  es único y previo a la partición (no hay dos fetches). El chequeo de
  asociación por ítem (`GET /products/{id}/suppliers` al elegir producto)
  necesita su propio estado de carga breve por ítem (p. ej. no mostrar ni
  warning ni ausencia de warning hasta resolver la consulta, para no
  parpadear un warning falso).
- **Empty**: cada bloque de sugerencias tiene su propio vacío ("No hay
  productos bajos de stock en este momento." / "No hay productos con datos
  de planificación incompletos."), en vez de un único vacío para toda la
  sección.
- **Error**: si falla `GET /products/{id}/suppliers` al chequear la
  asociación de un ítem, se muestra un error inline acotado a ese ítem (no
  se bloquea el resto del formulario); tiene reintento. El alta de
  asociación (`PUT`) usa el mismo patrón de error inline ya descripto en
  `Desired behavior`.
- **Success**: toast "Proveedor asociado al producto" (o equivalente, ver
  `Copy and feedback`) al confirmar el alta inline; el pedido no se creó
  todavía en este punto, así que no hay redirección.

## Keyboard and focus behavior

El warning y su botón son controles nativos operables por teclado,
integrados al orden de tabulación del ítem donde aparecen (mismo `grid` de
ítem existente). Al confirmar la asociación, el foco permanece en el botón
del ítem (que pasa a estar deshabilitado u oculto tras el éxito) para que el
usuario siga completando cantidad y costo sin saltos de foco inesperados;
esto es un criterio de diseño razonado sobre el patrón existente, no una
cita textual de un requisito previo.

## Responsive behavior

Sin requisitos nuevos: el warning y el botón deben caber en el layout de
ítem existente (`grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_10rem_auto]` en
desktop, una columna en mobile) sin overflow horizontal. Las dos secciones
de sugerencias siguen el mismo contenedor con scroll vertical acotado
(`max-h-64 overflow-y-auto`) que ya usa la lista única hoy.

## Accessibility

El warning no se comunica sólo con color: lleva texto explícito (dado
literal por el requerimiento) y, si usa un token de warning del sistema de
diseño, mantiene texto visible además del tono. El botón "Asociar producto
al proveedor" es un control nativo con label visible, no un ícono solo. Los
dos bloques de sugerencias llevan encabezado de texto (`h3`/`p`), no sólo
una separación visual.

## Copy and feedback

- Encabezados de sección de sugerencias: **"Bajos de stock"** y **"Datos de
  planificación incompletos"** (nombres sugeridos, ajustables en
  `design.md`; no hay texto dado por el usuario para estos títulos).
- Vacío de "Bajos de stock": **"No hay productos bajos de stock en este
  momento."**
- Vacío de "Datos de planificación incompletos": **"No hay productos con
  datos de planificación incompletos."**
- Warning de asociación (texto literal dado por el requerimiento): **"El
  producto seleccionado no está asociado a este proveedor, ¿desea
  asociarlo?"**
- Botón (texto literal dado por el requerimiento): **"Asociar producto al
  proveedor"**
- Toast de éxito de la asociación: sugerido **"Proveedor asociado al
  producto"**, consistente con "Proveedores del producto actualizados" ya
  usado en `ProductSuppliersPanel.tsx`; ajustable en `design.md`, no
  bloqueante.

## Backend dependencies

Ninguna. Ambas partes de este documento consumen exclusivamente contratos ya
desplegados y verificados:

- `GET /purchase-orders/suggestions` — ya devuelve `suggested_quantity`
  nulo o positivo; la separación en dos secciones es *display shaping* en el
  cliente, no un cálculo de negocio nuevo.
- `GET`/`PUT /products/{id}/suppliers` — ya soportan lectura y reemplazo
  completo de asociaciones, incluidas las no preferidas.

## API contract

Sin endpoints nuevos ni modificados. Reutilizados tal cual:

- `GET /purchase-orders/suggestions` → `ReplenishmentSuggestionsList`
  (`src/lib/types.ts:192-194`).
- `GET /products/{id}/suppliers` → `ProductSuppliersList`
  (`src/lib/types.ts:184`).
- `PUT /products/{id}/suppliers` con body `{ suppliers: [{ supplier_id,
  preferred, replenishment_frequency_days? }] }` → `ProductSuppliersList`.

## Data types

Ningún tipo nuevo. `ReplenishmentSuggestion` (`src/lib/types.ts:185-191`) y
`ProductSupplier`/`ProductSuppliersList` (líneas 178-184) ya tienen los
campos necesarios (`suggested_quantity` nullable, `supplier_id`,
`preferred`).

## Error behavior

Sin cambios de patrón general: `ApiError.message` se muestra inline, sin
asumir éxito. Ver `UI states` para el alcance acotado por ítem del error de
chequeo/alta de asociación.

## Edge cases

- Producto sin ninguna asociación de proveedor en absoluto (nunca asociado a
  nadie): el warning aplica igual y el alta crea la primera asociación del
  producto.
- Producto ya asociado al proveedor seleccionado pero no como preferido: no
  dispara el warning, porque el chequeo usa la lista completa de
  asociaciones (`GET /products/{id}/suppliers`), no el campo `supplier_id`
  (preferido) de la sugerencia.
- Usuario cambia el producto de un ítem varias veces antes de enviar: cada
  cambio dispara su propio chequeo de asociación; no debe quedar un warning
  obsoleto de un producto ya reemplazado en ese ítem.
- Todas las sugerencias caen en un solo bloque (todas bajas de stock, o
  todas con datos incompletos): el bloque vacío complementario muestra su
  propio texto de vacío, no desaparece sin explicación.
- Ítem agregado por sugerencia y luego el usuario asocia el producto al
  proveedor: el ítem ya cargado no se ve afectado, sólo desaparece el
  warning para selecciones futuras de ese producto en otros ítems.

## Affected routes

`src/app/(app)/purchasing/new/page.tsx` (sin cambio de gate). Ninguna ruta
nueva.

## Affected components

- `src/components/purchasing/PurchaseOrderForm.tsx`: separar sugerencias en
  dos bloques y agregar el warning + alta de asociación inline por ítem.

## Affected libraries

- Función pura para partir un array de `ReplenishmentSuggestion` en
  `{ lowStock, incompleteData }` según `suggested_quantity`, testeable sin
  React → candidata a `src/lib/purchasing.ts` (ya existe
  `src/lib/purchasing.test.ts` para este dominio, se le suman casos).
- Función pura para decidir si una lista de `ProductSupplier` ya incluye una
  relación con un `supplierId` dado (`hasSupplierAssociation`), y otra para
  construir el payload de `PUT` agregando una nueva relación sin romper las
  existentes (`appendSupplierAssociation`) → mismas candidatas a
  `src/lib/purchasing.ts`, reutilizables potencialmente desde
  `ProductSuppliersPanel.tsx` en una refactorización posterior (fuera de
  alcance de este documento, pero se señala la duplicación evitable).

## Testing implications

- Testeable en `lib/*.test.ts` (entorno node): la función de partición de
  sugerencias (casos: todas bajas de stock, todas incompletas, mezcla,
  vacío) y las funciones de asociación (`hasSupplierAssociation`,
  `appendSupplierAssociation`, con casos de lista vacía, ya asociado
  preferido, ya asociado no preferido, no asociado).
- Verificación manual: el warning y el alta inline contra backend real (no
  hay tests de componente en este repo), los estados de carga/error por
  ítem, y los dos bloques de sugerencias con sus vacíos.

## Deployment considerations

Ninguna. No hay cambios de backend ni de despliegue coordinado: se
implementa y se libera como cualquier cambio de frontend puro contra
contratos ya verificados.

## Out of scope

- Acotar la lista de sugerencias al proveedor seleccionado (cualquier
  asociación, preferida o no): queda en el Documento B
  (`ai/requirement-context-purchasing-no-supplier.md`), bloqueado por
  backend.
- Pedido sin proveedor (punto 1 original): queda en el Documento B.
- Marcar como preferida la asociación creada desde el warning inline: se
  reutiliza el patrón existente de `preferred: false`; cambiar el
  preferido sigue siendo tarea exclusiva de `ProductSuppliersPanel.tsx`.
- Cualquier cambio a `POST /purchase-orders/{id}/receive`, pagos o reporte
  por proveedor.
- Recalcular en el cliente la fórmula de reposición o `suggested_quantity`:
  sigue viniendo íntegro del backend.

## Decisions made

- Las sugerencias sin proveedor seleccionado se dividen en dos secciones
  ("Bajos de stock" / "Datos de planificación incompletos") en vez de
  ocultar los ítems de datos incompletos.
- El chequeo de si un producto está asociado al proveedor seleccionado usa
  la lista completa de asociaciones (`GET /products/{id}/suppliers`), no el
  `supplier_id` (preferido) que trae cada sugerencia — así el warning es
  correcto incluso cuando la asociación existente no es la preferida.
- El alta de asociación inline reutiliza el patrón de
  `ProductSuppliersPanel.tsx`: relee todas las asociaciones vigentes, agrega
  la nueva con `preferred: false` y sin `replenishment_frequency_days`, y
  reenvía la lista completa. No se ofrece elegir "preferido" desde el
  warning.
- El warning de asociación sólo se evalúa cuando el pedido tiene un
  proveedor seleccionado; si no hay proveedor, no se evalúa ninguna
  asociación (alineado con que "pedido sin proveedor" es un documento
  aparte).
- Acotar las sugerencias visibles al proveedor seleccionado queda
  explícitamente fuera de este documento y se traslada íntegro al Documento
  B, porque requiere ampliar un contrato de backend.

## Remaining non-blocking questions

- Copy exacto de los encabezados y vacíos de las dos secciones de
  sugerencias (sugeridos arriba, ajustables en `design.md`).
- Copy exacto del toast de éxito de la asociación inline (sugerido
  "Proveedor asociado al producto").
- Si conviene extraer `hasSupplierAssociation`/`appendSupplierAssociation`
  para que también los use `ProductSuppliersPanel.tsx` (hoy duplica la
  misma idea inline) — no bloqueante, es una decisión de refactor menor
  para `design.md`.

## Evidence consulted

- `ai/roles/requirement-analyst.md`, `ai/skills/analyze-frontend-requirement/SKILL.md`.
- `ai/context/module-map.md`.
- `openspec/changes/add-frontend-suppliers-purchasing/proposal.md`,
  `design.md`, `backend-request.md`, `tasks.md`,
  `specs/ui-suppliers-purchasing/spec.md`.
- `src/components/purchasing/PurchaseOrderForm.tsx`.
- `src/components/products/ProductSuppliersPanel.tsx`.
- `src/lib/types.ts` (`Supplier`, `SuppliersList`, `ProductSupplier`,
  `ProductSuppliersList`, `ReplenishmentSuggestion`,
  `ReplenishmentSuggestionsList`).
- Backend (`../backend`): `internal/bootstrap/router.go` (gates de rol);
  `internal/purchasing/transport/http/dto.go` (`productSupplierRequest`,
  `replaceProductSuppliersRequest`);
  `internal/purchasing/application/list_replenishment_suggestions.go`;
  `internal/purchasing/infrastructure/postgres_replenishment_suggestions.go`.

---

Listo para escribir el change cuando el usuario lo decida. Sin preguntas
bloqueantes pendientes.
