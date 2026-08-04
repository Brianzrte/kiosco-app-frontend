## Why

El kiosco compra en paquetes cerrados (una caja de 12 sobres de café) pero vende
buena parte de esa mercadería por unidad suelta, a un precio unitario con margen
propio. Hoy el catálogo obliga a elegir un único modo de venta por producto
(`unit_type` es `unitario` **o** `pesable`, sin ninguna noción de relación entre
productos ni de "unidades por paquete"), así que el kiosquero termina cargando
dos productos sueltos a mano, con nombres inventados, costos calculados de
memoria y ningún vínculo entre ellos. Este change resuelve la primera mitad del
problema: que el catálogo pueda representar "este producto también se vende por
unidad" como un dato del producto, con su precio unitario derivado, en un solo
alta.

## What Changes

- El formulario de alta de producto (`unitario` únicamente) suma un checkbox
  "Este producto también se vende por unidad". Al marcarlo se despliegan tres
  campos: **unidades por paquete**, **margen extra por unidad (%)** y
  **precio de venta por unidad**.
- El precio de venta por unidad se autocalcula como
  `(precio del paquete ÷ unidades por paquete) × (1 + margen extra ÷ 100)`,
  queda editable con override, y muestra su base de cálculo como texto de ayuda
  asociado al campo.
- El cálculo del precio unitario y su inverso (derivar el margen extra desde un
  precio editado a mano) se agregan como funciones puras y testeadas en
  `src/lib/products.ts`, junto a las que ya existen.
- Al guardar, el backend crea **dos** productos: el paquete y un producto
  derivado llamado `{nombre} (unidad)`, sin barcode, vinculado al padre, con
  costo derivado (`costo del paquete ÷ unidades por paquete`) que el usuario
  nunca ingresa. El popup de éxito pasa a nombrar los dos productos creados con
  sus SKU, conservando sus dos acciones actuales ("Inicializar stock" / "Ahora
  no").
- El alta se bloquea cuando el nombre del paquete o el nombre derivado colisiona
  con un producto existente (activo o inactivo): aviso inline que nombra el
  producto en conflicto y linkea a su detalle, con el guardado deshabilitado
  hasta que el nombre cambie — mismo patrón que el aviso de barcode duplicado
  ya vigente.
- El listado de productos y el detalle distinguen el producto derivado de uno
  normal, con un badge de texto y un link al producto padre.
- El producto derivado no se edita a mano: su nombre, su costo y su precio los
  deriva el backend desde el padre. Su detalle es de sólo lectura salvo la
  desactivación/reactivación.
- En la edición del paquete, el checkbox sigue disponible: desmarcarlo desactiva
  el producto derivado conservando su historial (soft delete reversible);
  volver a marcarlo reactiva ese mismo registro en vez de crear uno nuevo.
- La edición muestra dos advertencias con texto: editar **unidades por paquete**
  afecta las conversiones futuras y no modifica el stock actual; editar el
  **precio del paquete** recalcula el precio por unidad desde el margen extra
  persistido, pisando cualquier override manual previo.
- La desactivación del paquete queda acoplada de forma **unidireccional**: el
  diálogo de confirmación avisa que el producto por unidad también se desactiva.
  Desactivar el producto por unidad no toca al paquete.
- Un producto `pesable` no puede marcarse como vendible por unidad: el checkbox
  sólo existe para `unitario`.
- **BREAKING (backend)**: este change depende de un contrato que el backend no
  expone hoy —relación padre-hijo en `Product`, `units_per_package`, margen
  extra persistido, costo y precio del hijo derivados, regla de redondeo,
  desactivación acoplada y validación de nombre duplicado— y además cambia la
  forma de respuestas existentes (`GET /products`, `GET /products/{id}`) y el
  efecto de `POST /products`, `PUT /products/{id}` y
  `POST /products/{id}/deactivate`. Ver `backend-request.md`. No es
  implementable hasta que ese contrato exista **y esté desplegado**.

Fuera de alcance de este change (continúa en los changes siguientes, ver
`design.md` → Migration Plan):

- Stock de dos niveles (paquetes cerrados + unidades sueltas), diálogo de
  inicialización con dos cantidades, ajuste por nivel y el tipo de movimiento
  nuevo de la apertura automática de paquete → **change de inventario**
  (`ui-inventory`).
- Disponibilidad de dos niveles en el POS, bloqueo de venta sin stock y
  migración de la búsqueda por nombre a un endpoint server-side → **change de
  POS** (`ui-pos`).

Fuera de alcance del feature completo: consolidación de paquete y unidad en
reportes (van como líneas separadas, sin cambio en `ui-reports`,
`ui-cash-closing` ni `ui-sales`); vender por unidad un producto `pesable`; más
de un nivel de empaque (caja → paquete → unidad); edición manual del nombre del
producto derivado; cualquier cambio en el flujo de escaneo por barcode.

## Capabilities

### New Capabilities

Ninguna. Este change extiende una capability existente; no introduce una
pantalla, una ruta ni un dominio nuevo.

### Modified Capabilities

- `ui-catalog`:
  - `Create product`: checkbox de venta por unidad, tres campos derivados,
    bloqueo por nombre en colisión y popup de éxito con dos productos.
  - `Edit product`: checkbox en edición con su semántica de
    desactivación/reactivación del derivado, advertencias de recálculo, y
    detalle de sólo lectura para el producto derivado.
  - `Deactivate product`: acoplamiento unidireccional padre→hijo y su aviso en
    el diálogo de confirmación.
  - `Product list`: visibilidad y marcado del producto derivado.

## Impact

- `src/lib/types.ts`: extender `Product` con la relación padre-hijo, las
  unidades por paquete, el margen extra persistido y el precio unitario. La
  forma exacta la define el backend (ver `backend-request.md`); no se declara
  por adelantado.
- `src/lib/products.ts`: dos funciones puras nuevas —precio unitario desde
  precio de paquete + unidades + margen extra, y el inverso— más sus tests en
  `src/lib/products.test.ts`. Conviven con `computeSalePriceFromCost`,
  `computePercentFromPrices`, `computeMarginAmount` y
  `roundPriceToSuggestedAmount`, ya implementadas por el change abierto
  `add-frontend-product-cost-margin-auto-price`.
- `src/components/products/ProductForm.tsx`: checkbox, bloque de tres campos,
  aviso de nombre en colisión, advertencias de edición y popup de éxito con dos
  productos. Este archivo ya fue modificado por
  `add-frontend-product-cost-margin-auto-price` (bloque de costo/% /margen); hay
  que coordinar el orden de merge.
- `src/components/products/ProductsView.tsx`: badge del producto derivado en la
  tabla de escritorio y en las tarjetas móviles.
- `src/components/products/ProductDetail.tsx`: badge, link al producto
  relacionado, detalle de sólo lectura para el derivado y aviso de acoplamiento
  en el diálogo de desactivación.
- Sin rutas nuevas, sin entradas nuevas en `NAV_ITEMS`, sin cambios en
  `homeFor`, sin roles nuevos y sin dependencias nuevas.
- Backend: dependencia dura de contrato **y de despliegue**, documentada en
  `backend-request.md`. Sin ella, ninguna tarea de las secciones 1 en adelante
  puede ejecutarse.
