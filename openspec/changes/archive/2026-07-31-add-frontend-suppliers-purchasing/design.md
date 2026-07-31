## Context

`/reports/purchases` hoy es una consulta de sólo lectura para Admin. En paralelo, `/receiving` lista pedidos para recibir y `/suppliers` administra proveedores; son entradas independientes para el mismo circuito operativo. El backend ya incorporó roles múltiples, `receiving` y la recepción que mueve stock; este change agrega la superficie frontend que los consume.

Este cambio extiende ese circuito con gestión y planificación para Admin/Inventory, manteniendo a Recepción como rol operativo acotado. El frontend no calcula reposición, totales, estado de pago, cumplimiento ni movimientos: el backend conserva esas reglas y devuelve valores decimales como strings.

## Goals / Non-Goals

**Goals:**

- Gestionar proveedores sin borrar historial y asociarlos a productos con un proveedor preferido.
- Permitir pedidos manuales y revisar sugerencias generadas por backend antes de crear un pedido.
- Registrar el único pago total pendiente de un pedido recibido y mostrar su estado devuelto por backend.
- Hacer que la recepción refleje la entrega real y actualice stock de forma transaccional.
- Concentrar el trabajo diario de compras y recepción en una sola entrada, sin esconder pedidos pendientes detrás de una pantalla de administración de proveedores.
- Ofrecer pantallas diferenciadas para crear pedidos, consultar su historial y administrar proveedores.
- Ofrecer un reporte agregado y de sólo lectura para evaluar compras y cumplimiento por proveedor.

**Non-Goals:**

- Portal, login o permisos para proveedores externos.
- Pedidos irrevocables creados automáticamente sin revisión humana.
- Alta automática de productos de texto libre desde recepción.
- Recalcular en el cliente reposición, totales, estado de pago, métricas de reporte o movimientos de stock.
- Cambiar POS, pagos de ventas, CSV, notificaciones, offline o tema oscuro.
- Agregar búsqueda textual global de pedidos: el backend no expone ese filtro. Los filtros de pedidos se limitan a proveedor, rango de fechas y los estados admitidos por el contrato real.

## User flow

1. Un usuario con Admin, Inventory o Receiving entra a `/purchasing` y ve primero los pedidos pendientes; la lista ocupa cuatro quintos del ancho en escritorio.
2. El panel lateral ocupa un quinto: Admin e Inventory ven **Crear pedido**, **Historial de pedidos** y **Lista de proveedores**; Receiving sólo ve las acciones de lectura/recepción que su contrato permite.
3. Admin o Inventory crea, edita o desactiva un proveedor y vincula productos; el historial se conserva.
4. El mismo rol crea un pedido manual o abre una sugerencia del backend, revisa sus ítems y crea un pedido pendiente.
5. Cualquier rol autorizado abre un pedido desde pendientes o historial. Recepción registra faltantes con motivo o ítems adicionales y declara las cantidades realmente entregadas.
6. Al confirmar, el backend cierra el pedido y aplica los movimientos de entrada de stock en una sola transacción; la UI relee el pedido y muestra éxito.
7. El historial muestra tabla paginada con proveedor, estado, fecha, quién recibió y costo. Al abrir el detalle, cada ítem expone las cantidades y las marcas devueltas por backend: recibido, diferencia con motivo, agregado de texto libre pendiente de alta o eliminado con motivo.
8. Admin o Cashier registra el único pago total de un pedido recibido a cuenta corriente.
9. Admin consulta por rango el reporte agregado por proveedor.

## UI states

- **Loading:** listados, detalle, sugerencias y reporte usan estados de carga; botones de escritura quedan pendientes para impedir duplicados.
- **Empty:** proveedores invita a crear el primero; pedidos invita a limpiar filtros o crear uno; sugerencias explica si no hay reposición o faltan datos; reporte explica que no hubo compras en el período.
- **Error:** `ApiError.message` se muestra tal cual y hay reintento; los diálogos y formularios preservan valores y muestran el error inline.
- **Success:** toast con el mismo nombre de la acción y recarga desde backend después de cada mutación.

## Decisions

### 1. Hub canónico de compras y recepción, con rutas de tarea separadas

`/purchasing` es la única entrada de navegación para Admin, Inventory y Receiving. Reemplaza las entradas de `/receiving` y `/suppliers`; esas rutas heredadas redirigen a la pantalla equivalente para evitar dos superficies con datos contradictorios. El hub muestra sólo pedidos `PENDING` y contiene una grilla de cinco columnas: la lista operativa usa cuatro y el panel de acciones una. En móvil se apila, con los pendientes primero y las acciones después.

Las tareas de distinta densidad no se mezclan en una misma vista: `/purchasing/new` carga un pedido, `/purchasing/history` muestra el historial en tabla paginada y `/purchasing/suppliers` administra proveedores. El detalle de pedido es compartido; desde un pendiente habilita recepción y desde el historial expone la auditoría de ítems. Esta decisión preserva velocidad de recepción y evita que una lista potencialmente grande de proveedores compita con los pedidos pendientes.

### 2. Proveedor es entidad; `receiving` es el rol operativo interno

No habrá cuenta ni navegación para un proveedor externo. El rol `receiving` de `add-frontend-user-roles-and-receiving` puede recibir y registrar diferencias, mientras Admin/Inventory gestionan proveedores y crean pedidos. Esto evita abrir autenticación, autorización y soporte de un portal no pedido.

### 3. Baja lógica de proveedor y relaciones múltiples por producto

Desactivar conserva pedidos y reportes históricos y evita elegir al proveedor en pedidos nuevos. Un producto puede tener varios proveedores y un preferido; elegir uno solo impediría alternativas de abastecimiento. La forma exacta de los datos de compra y la invariante de un único preferido la garantiza el backend.

### 4. Sugerencias de reposición son borradores revisables de backend

El backend usa stock actual, ventas, frecuencia y relación producto–proveedor para entregar una sugerencia explicable. La UI permite revisarla y convertirla en pedido, pero no ejecuta la fórmula ni crea pedidos automáticos. Así se conserva el control humano y se evita usar listas paginadas para calcular negocio.

### 5. Un pago total por pedido devuelto por backend

Cada pedido admite a lo sumo un pago total. Recibir con efectivo o transferencia lo registra en la misma transacción; recibir a cuenta corriente deja el pedido pendiente. Admin o Cashier puede registrar después el único pago total, con monto decimal y método efectivo o transferencia. El backend valida estado, monto y unicidad; la UI no calcula saldos ni distribuye pagos entre pedidos.

### 6. Recepción transaccional con stock

La recepción declara cantidades efectivamente entregadas, mantiene visibles los faltantes removidos con motivo y admite ítems adicionales. La confirmación debe pedir al backend una transacción que cierre el pedido, actualice stock y cree movimientos, o no persista nada. Se reemplaza explícitamente la decisión del change relacionado de recibir sin tocar stock.

### 7. Navegación y permisos son UX; backend es autoridad

Las páginas usan `requireRole()` y `NAV_ITEMS` para no exponer acciones inalcanzables. Admin, Inventory y Receiving pueden abrir el hub, consultar pedidos y usar la recepción según el backend; sólo Admin e Inventory ven Crear pedido, sugerencias y Lista de proveedores. El historial es una consulta disponible a los tres roles que el backend autoriza. Admin accede al reporte. Cajero no recibe navegación de compras, pero puede abrir directamente el detalle de un pedido para consultar y registrar el pago autorizado cuando corresponda. Las acciones de pago se muestran a Admin y Cashier sólo dentro de un pedido recibido a cuenta corriente. Un `403` se muestra como acceso denegado; nunca se usa el gate de UI como seguridad.

### 8. Filtros limitados al contrato y estados de ítem trazables

Pendientes aplica `status=PENDING` y permite acotar por proveedor y rango de fechas. Historial permite proveedor, rango y selector de estado `Todos`, `Pendiente` o `Recibido`; el backend actual rechaza otros valores de `status`, por lo que no se ofrece un filtro `Cancelado`. No se implementa búsqueda textual global ni filtrado local sobre una página como sustituto de una consulta de servidor.

El historial usa las columnas proveedor, estado, fecha, recibido por y costo. El detalle no inventa un campo de estado: muestra las cantidades solicitada y recibida, el motivo de no entrega cuando exista, `Pendiente de alta` para un ítem de texto libre y `Eliminado` con su motivo para un ítem removido. Esto satisface la inspección de agregados y rechazos con la auditoría que el backend realmente devuelve.

## Accessibility

Inputs y selects conservan etiquetas; badges incluyen texto; estados no se comunican sólo con color. En el hub, los controles del panel lateral son botones/enlaces nativos y no se renderizan si el rol no los autoriza. Las filas accionables se activan con Enter, diálogos nativos conservan foco y Escape los cierra si no hay escritura en curso. Al cerrar un diálogo el foco vuelve al disparador; tras una escritura que cambia la vista, vuelve a la acción contextual o encabezado actualizado. El contador de resultados de cada filtro se anuncia con `aria-live="polite"`.

## Keyboard and focus behavior

Tab sigue el orden visual. Enter abre filas de proveedor/pedido y activa acciones. Los diálogos de crear, editar, quitar ítem, pago y recepción reciben el foco en el primer control obligatorio; sus confirmaciones están deshabilitadas mientras faltan campos requeridos o hay una petición en vuelo. La confirmación de recepción y la baja de ítem requieren una acción explícita, operable sin mouse.

## Responsive behavior

En escritorio desde `lg`, el hub usa una grilla 4/5–1/5, con la lista de pendientes como región dominante y el panel de acciones visible sin superponerse. Por debajo de ese ancho y en móvil, la grilla se apila, primero la lista y luego el panel, y ambos conservan targets de al menos 36 px. Las tablas de historial, proveedores, pagos y reportes permanecen consultables mediante las primitives de tabla con desplazamiento horizontal accesible o composición de tarjetas; proveedor, estado, fecha, recibido por, costo y acción primaria no quedan ocultos. La lista grande de proveedores permanece en un contenedor vertical desplazable, no crece sin límite la página.

## API contract

El frontend consume exclusivamente `api<T>()` y paths sin `/api/v1`. El backend implementa `GET/POST /suppliers`, `PUT /suppliers/{id}`, `PATCH /suppliers/{id}/deactivate`, `GET/PUT /products/{id}/suppliers`, `GET/POST /purchase-orders`, `GET /purchase-orders/suggestions`, detalle, edición de ítems y recepción. `GET /purchase-orders` acepta `supplier_id`, `from`, `to`, `status`, `page` y `limit`; el contrato desplegado acepta `PENDING` y `RECEIVED` como valores de `status`. La fila devuelve proveedor, fecha, total, estado, recepción y usuario receptor; el detalle devuelve cantidades y las marcas de auditoría de cada ítem. El pago pendiente usa `POST /purchase-orders/{id}/payment` con `amount` decimal y `payment_method` `cash` o `transfer`, sólo para Admin y Cashier. El reporte Admin-only usa `GET /reports/purchases/by-supplier` con `from`, `to` y `supplier_id` opcional. Su despliegue se verifica antes de consumirlos.

Dinero viaja como string decimal; fechas de pedidos y timestamps usan RFC3339 y rangos de reporte `YYYY-MM-DD`. Los agregados, totales y estado de pago vienen del backend.

## Error handling

Un `401` redirige al login mediante `api()`. Un `403` mantiene la página con estado de acceso denegado. Validaciones y conflictos del backend se muestran inline tal como llegan. Ante timeout, conflicto de recepción o fallo de escritura, no se asume éxito: se relee el pedido o entidad cuando corresponda.

## Backend coordination

La implementación queda bloqueada sólo hasta verificar estos contratos contra una instancia desplegada. La recepción transaccional necesita coordinación con Inventory para impedir movimientos duplicados si coexistiera la carga manual.

## Risks / Trade-offs

- [Contrato backend aún no verificado contra instancia] → no se construyen llamadas ni mocks antes de verificar instancia y shapes reales.
- [Recepción y ajuste manual pueden duplicar stock] → la recepción es la única operación que crea movimientos de compra y se documenta la transición operativa.
- [Datos insuficientes para reposición] → backend devuelve razón por producto o sugerencia vacía; la UI no inventa cantidades.
- [Pago duplicado o parcial] → backend permite un único pago total por pedido y valida estado, monto y unicidad en una transacción.
- [Proveedor desactivado requerido por historial] → sigue visible en consultas históricas, pero no seleccionable para pedidos nuevos.

## Migration Plan

1. Backend despliega los contratos implementados; se valida contra una instancia real.
2. Frontend implementa `/purchasing` y sus pantallas de tarea contra esos contratos verificados, luego redirige `/receiving` y `/suppliers` para no mantener dos entradas operativas.
3. Se comunica que la recepción actualiza stock; los operadores no repiten la carga manual para esos ítems.

## Rollback

Si el frontend se revierte, el backend debe mantener las rutas de lectura existentes. Las nuevas rutas de proveedores, pagos y sugerencias no son llamadas por el frontend previo. Si se revierte una recepción ya confirmada, no se revierte stock desde la UI: requiere una corrección explícita definida por backend para preservar auditoría.

## Open Questions

Ninguna. La ruta canónica, los roles, los filtros disponibles y los campos de auditoría se fijaron contra el backend implementado.

## Resolved contract details

- Supplier expone sólo `id`, `name` y `active`.
- La asociación expone `replenishment_frequency_days` nullable y el proveedor preferido; la fórmula de reposición queda enteramente en backend.
- Inventory no registra pagos; Admin y Cashier registran un único pago total con efectivo o transferencia.
