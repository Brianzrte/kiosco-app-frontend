# Requirement Context: Productos pesables (peso y precio real cobrado)

## Objective

Hoy todo producto se vende por unidades enteras a un precio fijo. Para
productos que se venden a granel (fiambre, verdura, etc.) el kiosco necesita
poder cobrar en base al peso pesado en el mostrador, y además poder registrar
que el precio efectivamente cobrado no siempre coincide con el que el sistema
calculó (el cliente pagó $140 cuando el sistema calculó $150 para 1,5 kg a
$100/kg). El problema de negocio es de **contabilidad real**: que las ventas,
el cierre de caja y los reportes reflejen lo que efectivamente entró a la
caja, no un cálculo teórico, sin perder el dato de cuál fue el cálculo
teórico (se conserva tachado como evidencia de la diferencia).

## Current behavior

- `Product` no distingue tipos de producto: sólo tiene `id, sku, barcode,
  name, category_id, price, cost, active, created_at, updated_at`
  (`src/lib/types.ts:119-130`, reflejo de
  `../backend/internal/catalog/domain/product.go:11-22`).
- El carrito del POS trabaja con `CartLine = { product, quantity: number }`
  y siempre incrementa/decrementa de a 1 unidad entera: escaneo repetido
  (`src/components/pos/PosView.tsx:240-256`), botones +/- del carrito
  (`PosView.tsx:262-268, 321-360`), y el `POST /sales/{id}/items` manda
  `{ product_id, quantity }` como entero (`PosView.tsx:450`).
- El dominio de ventas del backend define `SaleItem.Quantity` como `int`
  (`../backend/internal/sales/domain/sale_item.go:8-30`); no existe ningún
  campo de "precio real" ni una noción de "precio calculado vs. precio
  cobrado".
- El detalle de venta (`src/components/sales/SaleDetail.tsx:142-214`) muestra
  únicamente `quantity`, `unit_price` y `subtotal`; no hay ningún control ni
  visual para un precio alternativo.
- El stock (`src/lib/types.ts:146-151`, `Stock.quantity: number`) es entero y
  el POS cap-ea la cantidad del carrito contra ese entero
  (`PosView.tsx:154-166, 240-268`).
- Ningún spec de `openspec/specs/` (`ui-catalog`, `ui-pos`) ni ningún archivo
  `.go` del backend menciona peso, kilogramos, `unit_type` o un precio
  distinto del calculado — verificado con `rg` sobre ambos árboles, cero
  coincidencias.
- El change abierto `add-frontend-automatic-product-sku` (sin commitear)
  sólo toca el bloque SKU/barcode de `ProductForm.tsx`; no toca
  `category_id`, `price` ni la estructura general del formulario. No hay
  conflicto de contenido, pero **el mismo archivo se va a tocar dos veces**
  si ambos changes avanzan en paralelo — coordinar el orden de merge.

## Desired behavior

- **Alta/edición de producto**: el formulario exige elegir explícitamente
  `unit_type` (`unitario` | `pesable`), sin default vacío/nullable.
  - WHEN se crea o edita un producto y se elige `unitario`
    THEN el formulario se comporta exactamente como hoy (SKU, barcode,
    categoría, `price`, `cost`).
  - WHEN se elige `pesable`
    THEN el formulario reemplaza/oculta el campo `price` de venta unitaria
    por un campo `price_per_kg` (precio por kilogramo), como string decimal.
- **Productos existentes**: todos migran con `unit_type = "unitario"` por
  defecto; no cambia su comportamiento.
- **POS — agregar un pesable al carrito**:
  - WHEN se escanea o selecciona un producto `pesable`
    THEN la UI reemplaza el control de "cantidad" por un control de "peso"
    (kilogramos, hasta 3 decimales) y no incrementa nada hasta que se
    ingrese un peso.
  - WHEN se ingresa un peso válido (> 0, hasta 3 decimales)
    THEN el sistema calcula el precio de la línea como
    `peso × price_per_kg`, redondeado a 2 decimales (centavo), y lo muestra
    junto a un botón (lápiz) para editar el precio real.
  - WHEN se abre el editor de precio real (lápiz) y se ingresa un monto
    THEN ese monto reemplaza al calculado como el precio efectivo de esa
    línea para todo cálculo posterior de esa venta (total, balance de pago),
    y el precio calculado se conserva como dato histórico de la línea.
  - Esta edición **sólo está disponible mientras la venta no fue
    confirmada** (antes de `POST /sales/{id}/confirm`); una vez confirmada,
    la línea es inmutable como cualquier otra hoy.
  - No hay validación de stock para pesables: `PosView` no consulta ni
    cap-ea contra `GET /inventory/stock/{product_id}` para estos productos.
- **Historial de venta (`SaleDetail`)**:
  - WHEN una línea tuvo un precio real distinto del calculado
    THEN se muestra el precio calculado tachado en rojo, y a su lado el
    precio real cobrado (el que efectivamente cuenta como `subtotal` de la
    línea y participa del total de la venta).
  - WHEN no hubo edición de precio real (pesable sin corrección, o
    unitario)
    THEN se muestra sólo el precio vigente, sin tachado, igual que hoy.
- **Cierre de caja, reportes y devoluciones**: usan el precio real (cuando
  existe) como si fuera el `subtotal`/`unit_price` de la línea; el precio
  calculado nunca entra en ningún agregado, sólo se conserva como dato
  visual histórico.

## Primary actor

`cashier` (alta de la venta, edición del precio real en su propia venta del
día antes de confirmar) y `admin` (además, cualquier venta del día antes de
confirmar, igual que hoy en `Returns`/`Sales`). `inventory`/`admin` dan de
alta y editan productos, sin cambios respecto del rol actual de `ui-catalog`.

## Roles and permissions

- El alta/edición de `unit_type` y `price_per_kg` se gatea igual que hoy el
  resto de `ProductForm`: roles `inventory`, `admin`.
- La edición del precio real de una línea de venta usa **el mismo scope que
  ya fuerza el backend en `/sales` hoy**: un `cashier` sólo opera sobre sus
  propias ventas del día, `admin` sobre todas — sin agregar un scope nuevo
  ni replicarlo del lado del cliente (`ai/context/module-map.md` §Sales:
  "El scope por cajero lo fuerza el backend; la UI no filtra por su
  cuenta"). El gate a nivel UI es sólo "la venta no está confirmada
  todavía"; quién puede tocar esa venta lo decide el backend igual que hoy.
- No hay una restricción nueva de "sólo se puede editar una vez": no fue
  preguntado como bloqueante porque el flujo ocurre siempre antes de
  confirmar, dentro de la misma sesión de armado del carrito; queda como
  no bloqueante si el diseño concreto necesita permitir reeditar el precio
  real varias veces antes de confirmar.

## Main user flow

1. El cajero escanea o busca un producto `pesable`.
2. En vez de agregarse con cantidad 1, la línea pide el peso (kg, hasta 3
   decimales).
3. El cajero ingresa el peso pesado en la balanza; el sistema calcula el
   precio de la línea (`peso × price_per_kg`, redondeado a 2 decimales) y lo
   muestra en el carrito.
4. Si el cliente pagó un monto distinto, el cajero toca el botón lápiz junto
   al precio calculado, ingresa el precio real cobrado; la línea pasa a
   mostrar ese monto como el vigente para el total de la venta.
5. El cajero sigue armando el carrito (puede mezclar unitarios y pesables),
   compone el pago y confirma la venta con el flujo existente
   (`POST /sales`, `POST /sales/{id}/items`, `PUT /sales/{id}/payment`,
   `POST /sales/{id}/confirm`).
6. En el historial (`/sales/[id]`), la línea pesable con precio corregido
   muestra el calculado tachado en rojo y el real al lado.

## UI states

- **Loading**: igual que hoy en `ProductForm` (carga de categorías) y en
  `PosView` (nada nuevo); el cálculo de precio por peso es síncrono en el
  cliente, sin loading propio.
- **Empty**: si el peso está vacío o es `0`, no hay línea calculada — el
  control de peso se muestra vacío, sin agregar la línea al carrito hasta
  que haya un valor > 0.
- **Error**: peso inválido (negativo, no numérico, más de 3 decimales) se
  rechaza inline en el propio control, sin llamar al backend — mismo patrón
  de validación de cliente "evitar llamadas obviamente inválidas" que ya usa
  el repo (`ai/context/backend-coordination.md`). Un error del backend al
  confirmar la venta (p.ej. rechazo de pago) se muestra igual que hoy
  (`ui-pos` §"Atomic sale confirmation").
- **Success**: el precio real editado se refleja de inmediato en el total
  del carrito, sin toast propio (es edición local previa a confirmar, igual
  que cualquier otro cambio de cantidad hoy); la confirmación de venta sigue
  mostrando "Venta confirmada" como hoy.

## Keyboard and focus behavior

El POS es el camino crítico de teclado (`ui-pos` §"Scan-first sale screen").
El foco debe seguir volviendo al input de escaneo después de cada acción,
incluida la edición del precio real: abrir el editor de precio (lápiz) es la
única interrupción deliberada de ese foco, y al confirmar/cancelar esa
edición el foco debe volver al input de escaneo, igual que al cerrar
cualquier diálogo hoy (`ai/roles/requirement-analyst.md`: "dónde arranca el
foco... qué pasa al abrir y cerrar un diálogo"). El detalle exacto de tabbing
dentro del editor de precio (Enter confirma, Escape cancela) es diseño, no
bloqueante.

## Responsive behavior

Debe seguir siendo operable en ancho de móvil: el control de peso y el botón
lápiz no pueden depender de hover ni de espacio horizontal amplio (mismo
criterio que ya aplica al resto del carrito de `PosView`). No hay una
pantalla nueva, es una extensión de una ya responsive.

## Accessibility expectations

- El precio tachado en rojo **no puede ser el único canal**: debe llevar
  además un `<s>`/`line-through` semántico y idealmente un texto o `aria-label`
  que diga "precio calculado, reemplazado por precio real" — el color solo
  no comunica la diferencia (regla general del repo, `ai/context/ui-system.md`).
- El botón lápiz necesita label accesible (no sólo el ícono).
- Foco visible en el control de peso y en el editor de precio real, igual
  que el resto de inputs del kit.

## Copy and feedback

- Nombres de campo: "Peso" (reemplaza a "Cantidad" cuando el producto es
  pesable), en kilogramos. "Precio por kilo" en el formulario de producto.
  Los textos exactos (placeholder, unidad "kg" visible, texto del botón
  lápiz) son diseño, no bloqueante.
- El copy de error de peso inválido y el de confirmación de precio real
  editado quedan para `design.md` — no bloqueante, ya que la mecánica está
  resuelta.

## Backend dependencies

Este change **no se puede implementar sin backend nuevo**. Nada de esto
existe hoy (verificado contra `../backend/internal/catalog/domain/product.go`,
`../backend/internal/sales/domain/sale_item.go` y
`../backend/internal/bootstrap/router.go`):

1. `Product` necesita un campo `unit_type` (`unitario` | `pesable`) y,
   cuando es pesable, un campo `price_per_kg` (decimal string) separado de
   `price`. Afecta `POST /products` y `PUT /products/{id}`.
2. `SaleItem` necesita poder representar una línea por peso: una cantidad
   decimal (kg, 3 decimales) en vez de sólo `Quantity int`, o un campo
   paralelo específico para peso — la forma exacta la define el backend.
3. `SaleItem` necesita un campo para el precio calculado (histórico) y un
   campo para el precio real efectivo, con el precio real reemplazando al
   calculado en el `subtotal` que participa de todo agregado. Esto se
   escribe en el mismo payload de creación de la línea (`POST
   /sales/{id}/items`), nunca después de confirmar — no hace falta un
   endpoint de edición retroactiva.
4. Ningún endpoint de inventory necesita cambios: los pesables no llevan
   control de stock, por decisión explícita del usuario.

Esto se documenta como dependencia de backend, **no se inventa el contrato
exacto**: el detalle de nombres de campo, shape de request/response y
mensajes de error queda para un `backend-request.md` cuando se escriba el
change, con estas 7 decisiones ya resueltas como insumo.

## API contract

**Existentes, sin cambios de forma para `unit_type = "unitario"`:**
`GET /api/v1/products`, `POST /api/v1/products`, `PUT /api/v1/products/{id}`,
`GET /api/v1/categories`, `POST /api/v1/sales`, `POST /api/v1/sales/{id}/items`,
`PUT /api/v1/sales/{id}/payment`, `POST /api/v1/sales/{id}/confirm`,
`GET /api/v1/sales/{id}`.

**Faltantes — requieren `backend-request.md`:**
- `POST /api/v1/products` y `PUT /api/v1/products/{id}`: aceptar
  `unit_type` (obligatorio) y `price_per_kg` (obligatorio cuando
  `unit_type = "pesable"`).
- `POST /api/v1/sales/{id}/items`: aceptar una línea por peso (cantidad
  decimal en kg) y, opcionalmente en el mismo payload, un precio real que
  reemplace al calculado.
- `GET /api/v1/sales/{id}`: la línea (`SaleItem`) debe devolver tanto el
  precio calculado histórico como el precio real efectivo, para que
  `SaleDetail` pueda mostrar el tachado.
- Reportes y cierre de caja (`GET /reports/...`, `GET
  /sales/summary`/`today-summary`) no cambian de contrato desde la
  perspectiva del frontend: siguen devolviendo agregados ya calculados por
  el backend; el backend es quien debe usar el precio real en esos
  agregados.

## Data types

- `Product` (nuevo shape, pendiente de confirmar con backend):
  agrega `unit_type: "unitario" | "pesable"` (no nullable) y
  `price_per_kg: string | null` (string decimal, sólo presente cuando
  `unit_type = "pesable"`; el campo `price` deja de usarse para pesables).
- `SaleItem`/línea de venta (nuevo shape, pendiente de confirmar con
  backend): agrega un campo de peso (decimal string, 3 decimales) cuando
  corresponde a un producto pesable, y dos precios: el calculado
  (histórico) y el real/efectivo — ambos strings decimales, nunca `number`
  ni `float` (regla de `lib/money.ts` y `ai/context/api-contract.md`).
- `Stock`/`StockListItem`: sin cambios — los pesables no generan filas de
  stock.

## Error behavior

- Peso inválido: validado en cliente antes de llamar al backend (mismo
  criterio que "evitar llamadas obviamente inválidas" del repo), sin
  necesidad de un mensaje del backend.
- Rechazo del backend al crear/confirmar una venta con una línea pesable
  (p.ej. `price_per_kg` ausente, peso fuera de rango que el backend valide):
  se muestra el `{ message }` tal como llega, sin traducir ni reinterpretar
  — mismo patrón que el resto de `ui-pos` (`ApiError`, `src/lib/api.ts`).
- Conflicto de unicidad al dar de alta un producto pesable sin
  `price_per_kg`: se trata como cualquier error de validación de
  `ProductForm` hoy (mensaje del backend debajo del campo).

## Edge cases

- Producto pesable sin `price_per_kg` cargado (dato inconsistente o
  migración incompleta): el POS no debe permitir agregarlo sin un precio
  por kilo válido.
- Peso ingresado en `0` o vacío: la línea no se agrega al carrito (no hay
  "línea fantasma" a precio 0).
- Mezcla de productos unitarios y pesables en el mismo carrito: cada línea
  se comporta según su propio `unit_type`; el total sigue siendo la suma
  decimal-segura de todas las líneas (calculado o real, según corresponda).
- Edición de precio real que resulta en un monto negativo o absurdamente
  alto: queda para el backend validar (no se replica un rango arbitrario en
  el cliente); el frontend sólo evita valores obviamente inválidos (vacío,
  no numérico, negativo).
- Devolución de una línea pesable con precio real editado: la devolución
  usa el precio real (regla general de la decisión 5), sin recalcular nada
  en el cliente — mismo patrón que hoy en `lib/returns.ts`
  (`computeAvailability`, `computeNetTotal` ya trabajan sobre `unit_price`
  tal como viene del backend).
- Producto existente sin `unit_type` en la respuesta (mientras el backend
  no haya migrado): debe tratarse como `unitario` — comportamiento por
  defecto explícito, no un estado de error.

## Affected routes

- `/products/new`, `/products/[id]` (formulario de alta/edición).
- `/` (POS, `src/app/(app)/page.tsx`).
- `/sales/[id]` (detalle de venta).

Ninguna ruta nueva. No hay impacto en `NAV_ITEMS` ni en `homeFor`
(`lib/nav.ts`).

## Affected components

- `src/components/products/ProductForm.tsx`: agregar selector de
  `unit_type` y el campo condicional `price_per_kg`. **Coordinar con el
  change abierto `add-frontend-automatic-product-sku`**, que ya está
  modificando este mismo archivo (bloque SKU) sin commitear.
- `src/components/products/ProductDetail.tsx` (probable, para mostrar el
  tipo y precio por kilo del producto) — a confirmar alcance en `design.md`.
- `src/components/pos/PosView.tsx`: reemplazar el control de cantidad por
  peso cuando el producto es pesable, agregar el editor de precio real
  (lápiz) por línea, ajustar el cálculo del total para usar el precio real
  cuando exista.
- `src/components/sales/SaleDetail.tsx`: mostrar precio calculado tachado +
  precio real, cuando difieren.

## Affected libraries

- `src/lib/types.ts`: extender `Product` y la línea de venta con los campos
  nuevos (pendientes de confirmar shape con el backend).
- `src/lib/money.ts`: el cálculo `peso × price_per_kg` con redondeo a 2
  decimales en modo decimal-seguro (no float) es lógica pura, testeable —
  no puede vivir en `PosView.tsx` directamente. Candidato a una función
  nueva en `lib/money.ts` o un módulo dedicado (p.ej. `lib/weightPricing.ts`),
  con su propio test, siguiendo el patrón de `toCents`/`fromCents`.
- `src/lib/returns.ts`: revisar si `computeAvailability`/`computeNetTotal`
  necesitan ajuste para líneas con precio real editado — probablemente no,
  porque ya operan sobre `unit_price`/`subtotal` tal como vienen del
  backend, pero se verifica cuando el shape esté definido.

## Necesidad de tests

- El cálculo de precio por peso (peso × precio por kilo, redondeo a
  centavo) es puro y debe tener test en `lib/*.test.ts` (entorno node),
  siguiendo el patrón de `src/lib/productSku.test.ts` recién agregado.
- La decisión de qué precio "gana" (real vs. calculado) para el total del
  carrito es lógica pura, testeable.
- El resto (edición de UI, foco, tachado visual) queda como verificación
  manual — no hay tests de componente en este repo
  (`ai/context/testing.md`).

## Deployment considerations

- Este change depende de un despliegue de backend previo: no se puede
  implementar el frontend hasta que exista el contrato de `unit_type`,
  `price_per_kg` y precio real/calculado en `SaleItem`. La sección 0 de
  `tasks.md` debe incluir el prerrequisito explícito de verificar ese
  despliegue contra una instancia real, no contra el código
  (`ai/context/backend-coordination.md`).
- Migración de datos existentes: todo producto sin `unit_type` se trata
  como `unitario` — si el backend no migra el dato en la base, el frontend
  debe tratar la ausencia del campo como `unitario` (ver Edge cases), pero
  esto es una muleta temporal, no el estado final esperado.
- Mientras el backend no soporte esto, `ProductForm` sigue funcionando
  exactamente igual que hoy (ningún regressive change para productos
  unitarios).

## Out of scope

- Edición del precio real **después** de confirmada la venta (decisión 1):
  explícitamente afuera. Si en el futuro se necesita corregir una venta ya
  cerrada, es un change aparte con su propia política de auditoría.
- Control de stock/inventario para productos pesables (decisión 4):
  afuera. Los pesables no descuentan stock ni se validan contra
  `GET /inventory/stock/{product_id}`.
- Reutilizar el campo `price` para pesables (decisión 3): afuera, se usa
  `price_per_kg` como campo separado.
- Cualquier unidad de peso distinta de kilogramos (gramos como unidad
  principal, libras, etc.): no fue pedido, se asume kilogramos con 3
  decimales como unidad única.
- Reportes nuevos o modificados específicos para pesables (p.ej. "ventas
  por kilo"): no fue pedido; los reportes existentes simplemente reciben
  agregados ya corregidos del backend.
- Un límite de cuántas veces se puede reeditar el precio real antes de
  confirmar: no fue pedido, no se restringe.

## Decisions made

1. **Edición del precio real**: sólo antes de confirmar la venta, viaja en
   el mismo payload de creación/edición de línea. No hay endpoint de
   edición retroactiva de venta confirmada.
2. **Permisos**: mismo scope que ya fuerza el backend en ventas/devoluciones
   hoy (cajero: propias del día; admin: todas). No se agrega un scope
   nuevo ni se replica en el cliente.
3. **Precio por kg**: campo nuevo `price_per_kg`, separado de `price`.
4. **Stock**: los pesables no llevan control de stock; el POS no valida
   disponibilidad para ellos; no se toca el dominio de inventory.
5. **Precio efectivo**: el precio real reemplaza al calculado en todo
   cálculo posterior (total de venta, cierre de caja, reportes,
   devoluciones); el calculado queda sólo como dato histórico tachado.
6. **Precisión decimal**: peso con 3 decimales (kg/gramos), precio
   calculado redondeado a 2 decimales (centavo), siempre string decimal,
   nunca float.
7. **Default y migración**: productos existentes migran como `unitario`
   por defecto; `unit_type` es obligatorio y explícito en el
   formulario de alta/edición (sin default vacío/nullable).

## Remaining non-blocking questions

- Copy exacto de labels, placeholders y mensajes de error (queda para
  `design.md`).
- Si se permite reeditar el precio real más de una vez antes de confirmar
  la venta, o si el editor se "cierra" tras la primera corrección.
- Si `ProductDetail.tsx` necesita mostrar explícitamente el tipo de
  producto y el precio por kilo, o alcanza con el listado/formulario.
- Nombre exacto de los campos nuevos en el contrato del backend (el
  `backend-request.md` propone `unit_type`/`price_per_kg` como referencia,
  pero el backend puede nombrar distinto).
- Si el editor de precio real permite volver al precio calculado
  (deshacer la corrección) o sólo permite avanzar hacia un nuevo valor.
- Orden de merge entre este change y `add-frontend-automatic-product-sku`
  sobre `ProductForm.tsx` (ambos tocan el mismo archivo).

## Evidence consulted

- `openspec/specs/ui-catalog/spec.md`
- `openspec/specs/ui-pos/spec.md`
- `ai/context/module-map.md`
- `ai/context/backend-coordination.md`
- `src/lib/types.ts` (líneas 119-166)
- `src/components/products/ProductForm.tsx` (íntegro, incluido el diff sin
  commitear del change `add-frontend-automatic-product-sku`)
- `src/components/pos/PosView.tsx` (líneas 76, 154-268, 321-360, 450)
- `src/components/sales/SaleDetail.tsx` (líneas 142-214)
- `src/lib/money.ts` (funciones exportadas)
- `src/lib/api.ts` (`ApiError`, manejo de status)
- `src/lib/returns.ts` (funciones exportadas)
- `../backend/internal/catalog/domain/product.go`
- `../backend/internal/sales/domain/sale_item.go`
- `../backend/internal/bootstrap/router.go`
- Búsquedas `rg` sobre `openspec/specs/`, `openspec/changes/` y todo
  `../backend` (`--glob '*.go'`) para `weight|pesable|peso|unit_type|
  kilogram|by_weight|per_kg`: sin resultados en ningún caso.
- `openspec/changes/add-frontend-automatic-product-sku/tasks.md` (estado
  del change en curso, para descartar conflicto de contenido)

---

Listo para escribir el change cuando el usuario lo decida.
