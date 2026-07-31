## Why

Hoy, crear un producto o cerrar una venta no ofrece ningún camino directo
hacia la carga de stock del producto involucrado: después de crear un
producto queda sin stock inicializado hasta que alguien lo busque a mano en
Inventario, y después de una venta no hay ningún puente hacia esa pantalla.
En un kiosco de 1 a 5 personas, ese salto manual se posterga o se olvida, y el
stock queda desactualizado. El dueño pide, con carácter urgente, un atajo de
un clic en el momento en que el contexto (qué producto) ya está resuelto por
la propia acción que la persona acaba de completar.

## What Changes

- Alta de producto (`ProductForm`, sólo creación): al crear un producto con
  éxito, en vez de redirigir directo a `/products`, se muestra un popup de
  éxito con el nombre y SKU efectivo del producto creado y dos acciones:
  **"Inicializar stock"**, que navega a Inventario con ese producto
  preseleccionado y su panel de inicialización de stock ya abierto, y
  **"Ahora no"**, que cierra el popup y vuelve al formulario de alta en
  blanco para seguir cargando productos. La edición de producto no cambia.
- POS (confirmación de venta): al panel de "Venta confirmada" existente
  (`PosView`, ya no-modal y con auto-cierre) se le agregan las mismas dos
  acciones. **"Inicializar stock"** navega a Inventario preseleccionando el
  producto de la última línea agregada al carrito de esa venta. **"Ahora
  no"** reemplaza al botón "Nueva venta" actual con el mismo comportamiento
  (cerrar y quedar listo para la próxima venta); el enlace "Ver detalle" se
  conserva sin cambios. El botón "Inicializar stock" sólo se muestra a un
  rol que además tenga acceso a Inventario (ver Impact); un cajero sin ese
  acceso ve el panel sin ese botón, igual que hoy.
- Inventario (`InventoryView`/`/inventory`): se agrega soporte para un
  parámetro de URL `product_id` que, al cargar la página, resuelve ese
  producto puntual (sin depender de que aparezca en la página actual de la
  lista paginada) y abre directamente su diálogo "Gestionar stock" — en modo
  inicialización si no tiene stock, o en modo ajuste si ya lo tiene.
- Alta de producto (`ProductForm`, sólo creación): se reordena el
  formulario para que **"Código de barras" sea el primer campo**, con foco
  inicial (en reemplazo de "Nombre"), habilitando el flujo de escanear
  primero con un lector físico. Al confirmarse ese campo con `Enter` (el
  gesto que emite un lector de código de barras tras escanear), el frontend
  consulta `GET /api/v1/products/barcode/{barcode}` — el mismo endpoint que
  ya usa POS — antes de que la persona siga completando el resto del
  formulario. Si no existe ningún producto con ese código, no pasa nada
  visible y se sigue completando el alta con normalidad. Si ya existe un
  producto con ese código (activo o inactivo), se muestra una advertencia
  inline con su nombre y SKU, un enlace directo a su ficha (`/products/{id}`)
  para editarlo en vez de duplicarlo, y el envío del formulario queda
  bloqueado mientras esa advertencia siga vigente para el valor actual del
  campo. El formulario de edición no cambia: conserva el orden y el
  comportamiento de campos que tiene hoy.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-catalog`: el requirement "Create product" cambia su comportamiento de
  éxito (ya no redirige automáticamente a `/products`; muestra el popup de
  éxito descripto arriba) y su forma (código de barras primero, con
  validación en tiempo real contra `GET /api/v1/products/barcode/{barcode}`
  antes del envío). Ambos cambios son exclusivos de la rama de creación; la
  edición de producto no cambia.
- `ui-pos`: el requirement "Atomic sale confirmation" se extiende — el panel
  de confirmación existente gana las dos acciones ("Inicializar stock" /
  "Ahora no" en reemplazo de "Nueva venta") sin alterar su comportamiento no
  bloqueante ni el foco del input de escaneo, que sigue intacto.
- `ui-inventory`: el requirement "Stock view per product" se extiende para
  soportar apertura directa por `product_id` desde otra pantalla, sin
  cambiar el resto del comportamiento de la vista.

## Impact

- `src/components/products/ProductForm.tsx`: reemplaza el `toast` + redirect
  de creación exitosa por el nuevo popup; la rama de edición no cambia.
- `src/components/pos/PosView.tsx`: agrega las dos acciones al panel
  `confirmedSale` existente; agrega el estado necesario para conocer el
  producto de la última línea vendida.
- `src/app/(app)/page.tsx`: pasa el rol de la sesión a `PosView` (hoy no lo
  recibe) para poder decidir si mostrar "Inicializar stock".
- `src/components/inventory/InventoryView.tsx` y
  `src/app/(app)/inventory/page.tsx`: agregan lectura de `?product_id=` desde
  la URL para preseleccionar y abrir el diálogo de stock de ese producto al
  cargar la página.
- No hay cambios de contrato con el backend: reutiliza `GET /products/{id}`,
  `GET /api/v1/inventory/stock/{product_id}`, `POST /api/v1/inventory/stock`
  y `GET /api/v1/products/barcode/{barcode}` (este último ya consumido hoy
  por `PosView`), todos ya desplegados y en uso por este mismo frontend.
