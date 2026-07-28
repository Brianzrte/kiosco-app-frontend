## Context

`/reports/purchases` hoy es una consulta de sólo lectura para Admin: lista pedidos por proveedor y período, pero no permite gestionar proveedores, pedidos, pagos ni stock. El change abierto `add-frontend-user-roles-and-receiving` agrega la superficie de recepción, roles múltiples y `receiving`, pero sus decisiones actuales indican que recibir no mueve stock y no crea proveedores ni pedidos.

Este cambio extiende ese circuito con gestión y planificación para Admin/Inventory, manteniendo a Recepción como rol operativo acotado. El frontend no calcula reposición, totales, saldos, cumplimiento ni movimientos: el backend conserva esas reglas y devuelve valores decimales como strings.

## Goals / Non-Goals

**Goals:**

- Gestionar proveedores sin borrar historial y asociarlos a productos con un proveedor preferido.
- Permitir pedidos manuales y revisar sugerencias generadas por backend antes de crear un pedido.
- Registrar pagos conciliables contra una o varias órdenes y mostrar el saldo devuelto por backend.
- Hacer que la recepción refleje la entrega real y actualice stock de forma transaccional.
- Ofrecer un reporte agregado y de sólo lectura para evaluar compras y cumplimiento por proveedor.

**Non-Goals:**

- Portal, login o permisos para proveedores externos.
- Pedidos irrevocables creados automáticamente sin revisión humana.
- Alta automática de productos de texto libre desde recepción.
- Recalcular en el cliente reposición, totales, saldos, métricas de reporte o movimientos de stock.
- Cambiar POS, pagos de ventas, CSV, notificaciones, offline o tema oscuro.

## User flow

1. Admin o Inventory crea, edita o desactiva un proveedor y vincula productos; el historial se conserva.
2. El mismo rol crea un pedido manual o abre una sugerencia del backend, revisa sus ítems y crea un pedido pendiente.
3. Recepción abre el pedido pendiente, registra faltantes con motivo o ítems adicionales y declara las cantidades realmente entregadas.
4. Al confirmar, el backend cierra el pedido y aplica los movimientos de entrada de stock en una sola transacción; la UI relee el pedido y muestra éxito.
5. Un usuario autorizado registra pagos contra pedidos recibidos y revisa el saldo resultante.
6. Admin consulta por rango el reporte agregado por proveedor.

## UI states

- **Loading:** listados, detalle, sugerencias y reporte usan estados de carga; botones de escritura quedan pendientes para impedir duplicados.
- **Empty:** proveedores invita a crear el primero; pedidos invita a limpiar filtros o crear uno; sugerencias explica si no hay reposición o faltan datos; reporte explica que no hubo compras en el período.
- **Error:** `ApiError.message` se muestra tal cual y hay reintento; los diálogos y formularios preservan valores y muestran el error inline.
- **Success:** toast con el mismo nombre de la acción y recarga desde backend después de cada mutación.

## Decisions

### 1. Proveedor es entidad; `receiving` es el rol operativo interno

No habrá cuenta ni navegación para un proveedor externo. El rol `receiving` de `add-frontend-user-roles-and-receiving` puede recibir y registrar diferencias, mientras Admin/Inventory gestionan proveedores y crean pedidos. Esto evita abrir autenticación, autorización y soporte de un portal no pedido.

### 2. Baja lógica de proveedor y relaciones múltiples por producto

Desactivar conserva pedidos y reportes históricos y evita elegir al proveedor en pedidos nuevos. Un producto puede tener varios proveedores y un preferido; elegir uno solo impediría alternativas de abastecimiento. La forma exacta de los datos de compra y la invariante de un único preferido la garantiza el backend.

### 3. Sugerencias de reposición son borradores revisables de backend

El backend usa stock actual, ventas, frecuencia y relación producto–proveedor para entregar una sugerencia explicable. La UI permite revisarla y convertirla en pedido, pero no ejecuta la fórmula ni crea pedidos automáticos. Así se conserva el control humano y se evita usar listas paginadas para calcular negocio.

### 4. Pagos independientes y saldo devuelto por backend

Un pago guarda monto decimal, fecha y medio, y puede asociarse a una o varias órdenes recibidas. El backend valida asociaciones y saldos y devuelve el saldo resultante. El método de pago registrado al recibir no reemplaza estos movimientos contables: puede expresar pago al contado o cuenta corriente, pero no resuelve pagos parciales posteriores.

### 5. Recepción transaccional con stock

La recepción declara cantidades efectivamente entregadas, mantiene visibles los faltantes removidos con motivo y admite ítems adicionales. La confirmación debe pedir al backend una transacción que cierre el pedido, actualice stock y cree movimientos, o no persista nada. Se reemplaza explícitamente la decisión del change relacionado de recibir sin tocar stock.

### 6. Navegación y permisos son UX; backend es autoridad

Las páginas usan `requireRole()` y `NAV_ITEMS` para no exponer acciones inalcanzables. Admin accede al reporte. Las acciones de proveedor/pedido se muestran a Admin e Inventory; las de pago se gatearán al conjunto que confirme backend. Recepción no crea proveedores ni pedidos. Un `403` se muestra como acceso denegado; nunca se usa el gate de UI como seguridad.

## Accessibility

Inputs y selects conservan etiquetas; badges incluyen texto; estados no se comunican sólo con color. Filas accionables se activan con Enter, diálogos nativos conservan foco y Escape los cierra si no hay escritura en curso. Al cerrar un diálogo el foco vuelve al disparador; tras una escritura que cambia la vista, vuelve a la acción contextual o encabezado actualizado.

## Keyboard and focus behavior

Tab sigue el orden visual. Enter abre filas de proveedor/pedido y activa acciones. Los diálogos de crear, editar, quitar ítem, pago y recepción reciben el foco en el primer control obligatorio; sus confirmaciones están deshabilitadas mientras faltan campos requeridos o hay una petición en vuelo. La confirmación de recepción y la baja de ítem requieren una acción explícita, operable sin mouse.

## Responsive behavior

Filtros y acciones se apilan en móvil. Las tablas de proveedores, pedidos, pagos y reportes permanecen consultables mediante las primitives de tabla con desplazamiento horizontal accesible o composición de tarjetas; proveedor, estado, total, saldo y acción primaria no quedan ocultos.

## API contract

El frontend consume exclusivamente `api<T>()` y paths sin `/api/v1`. Ya aparecen en el router del working tree `GET/POST /suppliers`, `GET/POST /purchase-orders` y, en el backend change abierto, detalle, edición de ítems y recepción. Su despliegue se verifica antes de consumirlos.

Los contratos de edición/desactivación, asociaciones, sugerencias, pagos, reporte y recepción transaccional están pendientes y se solicitan en `backend-request.md`. Dinero viaja como string decimal; rangos como `YYYY-MM-DD`; agregados y saldos vienen del backend.

## Error handling

Un `401` redirige al login mediante `api()`. Un `403` mantiene la página con estado de acceso denegado. Validaciones y conflictos del backend se muestran inline tal como llegan. Ante timeout, conflicto de recepción o fallo de escritura, no se asume éxito: se relee el pedido o entidad cuando corresponda.

## Backend coordination

La implementación queda bloqueada hasta que el backend despliegue los contratos solicitados y el prerrequisito `add-multi-role-and-receiving` esté disponible. La recepción transaccional necesita coordinación con Inventory para impedir movimientos duplicados si coexistiera la carga manual.

## Risks / Trade-offs

- [Contrato backend aún no desplegado] → no se construyen llamadas ni mocks antes de verificar instancia y shapes reales.
- [Recepción y ajuste manual pueden duplicar stock] → la recepción es la única operación que crea movimientos de compra y se documenta la transición operativa.
- [Datos insuficientes para reposición] → backend devuelve razón por producto o sugerencia vacía; la UI no inventa cantidades.
- [Pago aplicado a saldo equivocado] → backend valida órdenes recibidas, montos y saldo en una transacción.
- [Proveedor desactivado requerido por historial] → sigue visible en consultas históricas, pero no seleccionable para pedidos nuevos.

## Migration Plan

1. Backend implementa y despliega el change de roles/receiving y los contratos de este `backend-request.md`; se valida contra una instancia real.
2. Backend migra proveedores, asociaciones, pagos y recepción atómica preservando pedidos históricos.
3. Frontend implementa las rutas y navegación contra esos contratos verificados.
4. Se comunica que la recepción actualiza stock; los operadores no repiten la carga manual para esos ítems.

## Rollback

Si el frontend se revierte, el backend debe mantener las rutas de lectura existentes. Las nuevas rutas de proveedores, pagos y sugerencias no son llamadas por el frontend previo. Si se revierte una recepción ya confirmada, no se revierte stock desde la UI: requiere una corrección explícita definida por backend para preservar auditoría.

## Open Questions

- Qué campos de contacto o fiscales expone Supplier.
- Qué datos por relación producto–proveedor y política precisa de safety stock/frecuencia define backend.
- Si `inventory` recibe autorización para registrar pagos; hasta confirmarlo, la UI no expone esa acción a dicho rol.
- Medio de pago y reglas de conciliación exactas que exponga backend.
