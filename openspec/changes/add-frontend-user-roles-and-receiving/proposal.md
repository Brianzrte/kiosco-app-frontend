# Proposal: add-frontend-user-roles-and-receiving

## Why

La pantalla de usuarios es hoy de una sola dirección: se da de alta y se desactiva, nada más. Una fila de la tabla no se puede clickear, así que corregir un teléfono mal cargado o cambiar lo que una persona puede hacer no tiene camino en la UI. Y el rol es una decisión que se toma una vez, en el alta, para siempre.

Eso choca con cómo trabaja un kiosco de 1 a 5 personas: la misma persona cobra en la caja, recibe al proveedor a la mañana y carga la mercadería. Con un rol único hay que elegir entre un cajero que no puede tocar stock ni ver un pedido, o un `inventory` que además edita el catálogo y los precios. El backend cierra ese hueco en `add-multi-role-and-receiving` (roles múltiples por usuario + un rol `receiving` acotado a stock y recepción, sin escritura en catálogo); falta la UI que lo opere.

Falta además la pantalla de la recepción en sí: ver el pedido, confirmar lo que efectivamente entró, y dejar registrado lo que cambió respecto de lo pedido.

## What Changes

### Usuarios

- La fila del listado pasa a ser clickeable y lleva a `/users/[id]`: detalle del usuario con datos de perfil, roles, estado y fecha de alta.
- Edición de datos de perfil (nombre, apellido, teléfono, dirección) desde el detalle. Username y contraseña siguen sin editarse: el backend no lo expone y no se inventa.
- **Asignación de roles múltiples**: un usuario tiene uno o más roles y se editan desde el detalle. La UI impide guardar un conjunto vacío y advierte antes de quitarle el rol Admin al propio usuario de la sesión.
- El listado muestra los roles como badges, no como texto único.
- Se suma el rol **Recepción** (`receiving`) al vocabulario de la UI, con su descripción: carga stock y recibe pedidos, no toca el catálogo.

### Gating por rol

- **BREAKING (interno)**: `Role` deja de ser un valor y pasa a ser un conjunto. `requireRole()`, `NAV_ITEMS`, `homeFor()` y la sesión pasan a razonar por intersección de roles. La cookie de sesión guarda `roles`.

### Recepción de pedidos a proveedores

- Nueva sección `/receiving` (roles Recepción y Admin): listado de pedidos a proveedores, pendientes primero, con proveedor, fecha y total. Es **sólo lectura sobre el pedido**: no se crean pedidos ni proveedores desde acá.
- Nuevo `/receiving/[id]`: detalle del pedido con sus ítems y las acciones de la recepción.
- **Confirmar recepción**: elige método de pago (efectivo, transferencia, cuenta corriente) y confirma. La pantalla muestra qué queda registrado —usuario, fecha y hora— antes de confirmar, y el pedido pasa a Recibido.
- **Agregar producto fuera del pedido**: buscando en el catálogo por nombre o código, o —si el producto no existe— cargando una descripción en texto libre. Un ítem de texto libre se muestra marcado como pendiente de alta por un Admin, en la pantalla y en el detalle del pedido.
- **Quitar un ítem del pedido**: siempre con motivo obligatorio, con el mismo tratamiento que la anulación de un ítem en una venta. El ítem removido queda visible, tachado y con su motivo, no desaparece.

### Historial de ventas del cajero

- Para un usuario cuyo permiso sobre ventas viene del rol `cashier` (y no de Admin), `/sales` queda acotado al día en curso: sin selector de rango y con la fecha del día visible, en lugar de un rango que el backend va a recortar igual.

## Capabilities

### New Capabilities

- `ui-receiving`: listado y detalle de pedidos a proveedores para recepción, confirmación con método de pago, alta de ítem fuera del pedido (catálogo o texto libre) y baja de ítem con motivo.

### Modified Capabilities

- `ui-users`: detalle y edición de usuario, y asignación de múltiples roles.
- `ui-foundation`: `Role-gated navigation shell` pasa de un rol por sesión a un conjunto de roles, y suma la sección de recepción.
- `ui-sales`: el historial acotado al día en curso cuando el acceso proviene del rol `cashier`.
- `ui-auth`: la sesión persiste `roles` en lugar de `role`.

## Impact

- **Nuevos**: `src/app/(app)/users/[id]/page.tsx`, `src/app/(app)/receiving/page.tsx`, `src/app/(app)/receiving/[id]/page.tsx`, `src/components/users/UserDetailView.tsx`, `src/components/users/RolesField.tsx`, `src/components/receiving/ReceivingListView.tsx`, `src/components/receiving/ReceivingDetailView.tsx`, `src/lib/receiving.ts` + `receiving.test.ts`.
- **Modificados**: `src/lib/types.ts`, `src/lib/roles.ts`, `src/lib/nav.ts`, `src/app/api/session/route.ts`, `src/components/users/UsersView.tsx`, `src/components/sales/*` (historial del cajero).
- **Depende por completo de `add-multi-role-and-receiving` (backend)**, que introduce los roles múltiples, el rol `receiving`, `GET /purchase-orders/{id}`, la recepción con método de pago y la edición de ítems. Ninguno de esos endpoints existe hoy: se documentan en `backend-request.md` y **no se mockean**.
- **Depende de `add-frontend-users` y `add-frontend-sales-v15`** (ambos casi cerrados), que aportan los specs `ui-users` y `ui-sales` que este cambio modifica.
- **Fuera de alcance**: crear pedidos o proveedores desde el frontend (sigue sin UI de gestión de compras), cambiar username o contraseña de un usuario, reactivar usuarios, y dar de alta el producto no catalogado desde la pantalla de recepción — eso lo hace el Admin desde Productos.
