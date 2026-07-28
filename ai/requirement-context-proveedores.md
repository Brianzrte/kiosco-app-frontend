# Requirement Context: proveedores, compras y abastecimiento

## Objective

Permitir que el kiosco administre sus proveedores, planifique y emita pedidos de compra, reciba la mercadería con diferencias auditables, actualice el inventario de forma confiable y controle pagos y desempeño por proveedor. El objetivo operativo es evitar faltantes, excesos, diferencias entre lo pedido y lo entregado, y saldos no conciliados.

## Current behavior

- La única superficie vigente sobre compras es `/reports/purchases`, restringida a Admin por `requireRole(["admin"])` (`src/app/(app)/reports/purchases/page.tsx`).
- Esa pantalla consume `GET /suppliers` y `GET /purchase-orders`, filtra por proveedor y rango, pagina, y muestra fecha, proveedor, total, estado y recepción; es de sólo lectura (`src/components/reports/PurchasesReportView.tsx`).
- No existe ruta ni UI vigente para crear, editar o desactivar proveedores, crear pedidos, asociar productos a proveedores, registrar pagos contables o sugerir reposición (`ai/context/product-scope.md`).
- El change abierto `add-frontend-user-roles-and-receiving` define `/receiving` y `/receiving/[id]` para consultar y recibir pedidos, agregar ítems no previstos y remover ítems con motivo. Sus tareas están pendientes y no describen gestión de proveedores ni creación de pedidos (`openspec/changes/add-frontend-user-roles-and-receiving/{proposal.md,specs/ui-receiving/spec.md,tasks.md}`).
- El frontend vigente aún usa un rol escalar `admin | cashier | inventory` (`src/lib/types.ts`, `src/lib/session.ts`, `src/lib/roles.ts`); el change abierto ya propone roles múltiples y el rol `receiving`, no un rol `provider`.

## Desired behavior

- WHEN un usuario autorizado crea, edita o desactiva un proveedor THEN el proveedor queda disponible o deja de estar disponible para nuevos pedidos sin borrar su historial.
- WHEN un producto se vincula con uno o más proveedores THEN la relación identifica un proveedor preferido y los datos de compra que el backend defina, sin eliminar compras históricas.
- WHEN un usuario autorizado crea o revisa un pedido THEN puede seleccionar proveedor, agregar productos catalogados, ajustar cantidades y costos, y ver el total calculado por el backend.
- WHEN el backend genera una sugerencia de abastecimiento THEN considera stock actual, volumen de ventas, frecuencia de reposición y la relación producto–proveedor; el usuario revisa el borrador antes de crear el pedido.
- WHEN se registra un pago THEN se guarda fecha, monto decimal, medio de pago y una o más órdenes asociadas, y el backend devuelve el saldo resultante para conciliación.
- WHEN se recibe un pedido pendiente THEN el operador confirma las cantidades realmente entregadas; los ítems faltantes permanecen auditables con un motivo y los ítems adicionales pueden ser catalogados o descriptos en texto libre.
- WHEN la recepción se confirma THEN el backend, en una misma operación, actualiza el stock con las cantidades recibidas, crea los movimientos de inventario correspondientes y cierra el pedido. Un fallo no deja stock ni pedido parcialmente actualizados.
- WHEN un ítem de texto libre fue recibido THEN queda señalado como pendiente de alta en Catálogo por un Admin; la recepción no crea el producto automáticamente.
- WHEN se consulta un reporte por proveedor THEN el backend entrega para el rango elegido inversión, cantidad de pedidos, entregas completas/incompletas y productos no entregados; la UI no recompone esas métricas desde listados paginados.

## Primary actor

Admin e Inventory para administrar proveedores, asociaciones, pedidos, planificación, pagos y reportes. Recepción para consultar y ejecutar la recepción física, incluido el registro de diferencias, una vez implementado el rol `receiving` y los roles múltiples.

## Roles and permissions

- `admin`: acceso completo a proveedores, asociaciones producto–proveedor, pedidos, pagos, planificación, recepción y reportes.
- `inventory`: alta/edición/desactivación de proveedores, asociaciones, creación y revisión de pedidos y sugerencias de abastecimiento. El backend debe decidir y exponer explícitamente si también registra pagos.
- `receiving`: reutiliza el rol interno existente en el change abierto; puede leer pedidos y recibirlos, agregar o quitar ítems durante la entrega, pero no crea proveedores, pedidos ni productos.
- `cashier`: sin acceso a proveedores, pedidos, pagos ni reportes de compras.
- No se crea un rol externo `provider`: “proveedor” es una entidad comercial, no un usuario autenticado.

La UI debe gatear con `requireRole()` y `NAV_ITEMS`; el backend mantiene la autoridad sobre cada endpoint y cualquier scope de datos.

## Main user flow

1. Admin o Inventory crea/actualiza un proveedor o lo desactiva.
2. Admin o Inventory asocia productos a uno o más proveedores y marca el preferido cuando corresponda.
3. Admin o Inventory abre una sugerencia de abastecimiento, la revisa y ajusta antes de crear un pedido pendiente; también puede crear un pedido manual.
4. El rol Recepción abre el pedido pendiente, registra ítems adicionales o faltantes con motivo y confirma la recepción.
5. El backend cierra el pedido y actualiza stock y movimientos de forma atómica; la UI vuelve a leer el pedido y el inventario.
6. Admin o Inventory registra uno o más pagos contra pedidos recibidos y consulta saldo y conciliación.
7. Admin consulta el reporte agregado de compras y desempeño por proveedor para un período.

## UI states

- **Loading:** cada listado, detalle, sugerencia, reporte y diálogo de escritura muestra carga y evita acciones duplicadas.
- **Empty:** proveedores: explica que aún no hay proveedores e invita a crear uno; pedidos: explica que no hay coincidencias e invita a limpiar filtros o crear un pedido según permiso; sugerencias: explica que no hay reposición necesaria o que faltan datos de planificación; reportes: explica que no hay compras en el período.
- **Error:** muestra el `message` del backend y ofrece reintentar; en formularios y diálogos el error queda inline, se preservan los valores ingresados y no se asume éxito.
- **Success:** altas, cambios, bajas lógicas, creación de pedido, registro de pago y recepción muestran confirmación visible; luego se relee la entidad o el listado desde el backend.

## Keyboard and focus behavior

- Tab recorre controles en orden visual; Enter activa filas accionables y botones; Escape cierra diálogos no enviados.
- Al abrir un diálogo, el foco entra al primer campo o control requerido; al cerrarlo vuelve al disparador.
- Tras crear o editar un proveedor, el foco vuelve a la fila o acción que lo abrió; tras una recepción o pago exitoso, vuelve a la acción contextual o al encabezado actualizado del pedido.
- Las confirmaciones destructivas o irreversibles (desactivar proveedor, remover ítem, confirmar recepción) son operables sin mouse y requieren confirmación explícita.

## Responsive behavior

En móvil, filtros y acciones se apilan sin ocultar el proveedor, estado, total, saldo ni acción primaria. Las tablas de pedidos, pagos y reportes deben mantener lectura mediante tarjetas o desplazamiento horizontal accesible; no se exige que todas las columnas estén visibles simultáneamente.

## Accessibility expectations

Foco visible; etiquetas asociadas a todos los campos; estado y errores comunicados en texto además de color; badges con nombre de estado; diálogos con foco gestionado; razones de ítems no entregados disponibles en texto; y respeto de `prefers-reduced-motion` según el sistema UI vigente.

## Copy and feedback

Copy en español rioplatense. Acciones: “Crear proveedor”, “Guardar cambios”, “Desactivar proveedor”, “Crear pedido”, “Revisar sugerencia”, “Registrar pago”, “Confirmar recepción”, “Agregar ítem” y “Quitar ítem”. La confirmación de recepción debe indicar que actualiza stock, crea movimientos y cierra el pedido; la eliminación de línea debe hablar de “quitar del pedido” y solicitar “Motivo de no entrega”.

## Backend dependencies

Existe en el router del working tree del backend: `GET/POST /suppliers`, `GET/POST /purchase-orders`, y las rutas de detalle, recepción y edición de ítems del change abierto `add-multi-role-and-receiving`. Que estén en el working tree no prueba despliegue.

Faltan o requieren ampliar el contrato de backend:

- edición y desactivación de proveedor;
- asociaciones producto–proveedor, incluido proveedor preferido y datos de compra;
- sugerencias de reposición y creación revisable de borradores basadas en la política decidida por backend;
- pagos a proveedores, asociación de uno o varios pagos con órdenes, saldos y conciliación;
- reporte agregado de desempeño por proveedor;
- recepción atómica que actualice stock y movimientos, sustituyendo la decisión vigente de que recibir no toca stock;
- definición de permisos de pagos para `inventory`.

Estas dependencias son bloqueantes para implementación y requieren `backend-request.md` en el change futuro.

## API contract

### Verificado en el router/backend actual (requiere confirmar despliegue)

- `GET /suppliers` y `POST /suppliers`.
- `GET /purchase-orders` y `POST /purchase-orders`.
- `GET /purchase-orders/{id}`, `POST /purchase-orders/{id}/items`, `DELETE /purchase-orders/{id}/items/{item_id}` y `POST /purchase-orders/{id}/receive` aparecen en el change backend abierto `add-multi-role-and-receiving`.
- `GET /purchase-orders/uncatalogued-items` aparece para Admin en ese mismo change.

### Faltantes; no se inventa su forma

- operaciones para editar/desactivar proveedores;
- operaciones para listar, crear y modificar asociaciones producto–proveedor;
- endpoint de sugerencias de reposición y acción para convertir una sugerencia aprobada en pedido;
- operaciones para registrar/listar pagos a proveedor, asociarlos a órdenes y consultar saldos;
- reporte agregado por proveedor con inversión, pedidos, cumplimiento e ítems no entregados;
- extensión de recepción que acepte cantidades efectivamente recibidas y aplique los movimientos de stock de forma transaccional.

Los cuerpos, respuestas, paginación, errores y roles exactos de los endpoints faltantes se definen por el backend antes de implementar frontend.

## Data types

Se incorporarán en `src/lib/types.ts`, contra el contrato real:

- `Supplier` con identidad, nombre, estado y campos de contacto si el backend los define.
- relación producto–proveedor con producto, proveedor, indicador preferido y datos de compra que exponga el backend.
- cabecera y detalle de pedido, ítems activos/removidos/no catalogados, cantidades solicitadas y recibidas, costos y totales decimales como `string`.
- sugerencia de reposición y sus razones/datos de entrada devueltos por backend.
- pago a proveedor, asociaciones a pedidos, monto decimal como `string`, fecha, medio y saldo.
- reporte agregado por proveedor.

El rol de UI será `receiving` dentro del modelo de roles múltiples ya propuesto; no se agrega `provider`.

## Error behavior

`api<T>()` muestra el `{ message }` del backend sin reescribirlo. `401` redirige al login; `403` deja la pantalla y muestra estado de acceso denegado. Errores de validación (campos requeridos, producto/proveedor inactivo, relación duplicada, monto inválido, saldo excedido, pedido ya recibido o stock insuficiente) deben llegar como mensaje del backend e indicarse junto a la acción que falló. Ante error o timeout de recepción, pago o creación, la UI no asume éxito: relee la entidad cuando sea seguro hacerlo.

## Edge cases

- proveedor desactivado con historial: visible en reportes y pedidos históricos, no elegible para nuevos pedidos;
- producto con varios proveedores o sin proveedor preferido;
- producto sin historial suficiente, sin frecuencia de reposición o sin stock: la sugerencia muestra la causa devuelta por backend;
- sugerencia vacía o con proveedor inactivo;
- pedido sin ítems, ítem de cantidad cero, costo cero si el backend lo permite, o producto desactivado;
- entrega parcial, ítem no entregado con motivo obligatorio, ítem adicional catalogado y no catalogado;
- recepción concurrente o pedido ya recibido: conflicto y recarga del estado real;
- pago parcial, varios pagos para un pedido, un pago asociado a varias órdenes, saldo cero y saldo pendiente;
- pago que excede el saldo o intenta asociarse a pedido no recibido: rechazo del backend;
- primera carga sin compras, rango sin datos, permiso parcial y datos nullable;
- stock insuficiente o error al actualizar stock durante recepción: no se cierra el pedido ni se persiste un movimiento parcial.

## Affected routes

- Nueva gestión de proveedores: `/suppliers` y, si el flujo lo requiere, `/suppliers/[id]`.
- Nueva gestión de pedidos: `/purchase-orders` y `/purchase-orders/[id]`.
- Nueva revisión de abastecimiento, dentro de pedidos o en una ruta dedicada decidida en el diseño.
- Nueva consulta de pagos/saldos, dentro del proveedor o pedido, o en ruta dedicada decidida en el diseño.
- `/receiving` y `/receiving/[id]`: se modifica el change abierto para que la recepción actualice stock atómicamente.
- `/reports/purchases`: se amplía para el reporte agregado por proveedor.
- Navegación: nuevas entradas para roles autorizados en `NAV_ITEMS`; recepción permanece accesible a `receiving` y `admin` según el change existente.

## Affected components

Nuevas views de proveedores, asociaciones producto–proveedor, listado/detalle/creación de pedidos, revisión de sugerencias, pagos/saldos y reporte de proveedores. Se modificarán `PurchasesReportView` y las views de recepción propuestas en `add-frontend-user-roles-and-receiving`. También se modificarán páginas con `requireRole()` y la navegación cuando se incorporen las rutas.

## Affected libraries

- `src/lib/types.ts`: nuevos shapes de proveedores, asociaciones, pedidos, pagos, sugerencias y reporte.
- `src/lib/nav.ts`, `src/lib/roles.ts` y sesión: sólo mediante el prerrequisito de roles múltiples del change abierto, para admitir `receiving`.
- Nuevos módulos `lib/` para construir query strings, ordenar/presentar filas y validar campos puramente de UI. No contendrán cálculo de reposición, totales, saldos, cumplimiento ni movimientos de stock: esas reglas pertenecen al backend.
- `lib/money.ts` seguirá formateando los montos decimales que devuelva el backend; nunca se usarán floats.

## Affected capabilities

- Nueva capability frontend de gestión de proveedores y pedidos de compra.
- Modificación de `ui-receiving` (delta abierto) para recepción atómica con stock.
- Modificación de `ui-reports` para el reporte por proveedor.
- Modificación de `ui-foundation`, `ui-auth` y `ui-users` sólo si se implementa el prerrequisito ya abierto de roles múltiples y `receiving`.

## Testing implications

- Tests de `lib/*.test.ts` para query builders, orden de pedidos, display shaping y validaciones puramente locales.
- No se testean algoritmos de reposición, saldos, totales ni actualizaciones de stock en el frontend: se verifican en backend.
- Verificación manual: estados loading/empty/error/success, teclado y foco, móvil, gates de roles, flujos de recepción con diferencias, recarga tras escrituras y mensajes de backend.
- Para cada implementación: `npm run lint`, `npm test` y `npm run build` al tocar tipos, páginas o route handlers.

## Deployment considerations

Primero debe desplegarse y verificarse el backend con contratos completos y migraciones para proveedores, asociaciones, pagos, planificación y recepción atómica. El frontend no consumirá rutas que sólo existan en el working tree. La migración a roles múltiples/`receiving` invalida sesiones existentes según el diseño del change abierto; se coordina antes de exponer la navegación. La recepción atómica de stock requiere una transición explícita desde el flujo actual de carga manual para no duplicar inventario.

## Out of scope

- Portal o login para proveedores externos.
- Creación automática e irrevocable de pedidos sin revisión humana.
- Alta automática de un producto de texto libre en Catálogo.
- Cálculo de reglas de abastecimiento, totales, saldos o métricas en el navegador.
- Cambios al POS, ventas o sus métodos de pago.
- Exportación CSV, notificaciones u operación offline.

## Decisions made

- El “rol proveedor” se resuelve como el rol interno existente/propuesto `receiving`; no se crea un rol de proveedor externo.
- Los proveedores se desactivan en lugar de borrarse físicamente, preservando historial.
- Un producto puede asociarse a varios proveedores y tiene proveedor preferido.
- El reporte por proveedor incluye inversión, cantidad de pedidos, entregas completas/incompletas y productos no entregados por período.
- La reposición se genera como borrador revisable por una persona; nunca como pedido automático final.
- Los pagos son operaciones contables independientes, con monto, fecha, medio y asociación a una o varias órdenes.
- La confirmación de recepción actualiza stock y movimientos de forma atómica y cierra el pedido.

## Remaining non-blocking questions

- Campos de contacto de proveedor y si se requiere condición fiscal.
- Datos por asociación producto–proveedor (por ejemplo, costo de referencia, plazo o frecuencia configurada) y la política precisa de reposición/safety stock: los define backend en el diseño del change.
- Si `inventory` puede registrar pagos o si esa operación queda sólo en `admin`.
- Ubicación exacta en navegación de sugerencias y pagos, y si son subpantallas o paneles de detalle.
- Medio de pago y reglas de conciliación exactas que admita el backend.

## Evidence consulted

- `AGENTS.md`.
- `ai/roles/requirement-analyst.md`.
- `ai/skills/analyze-frontend-requirement/SKILL.md`.
- `ai/README.md`, `ai/context/module-map.md`, `ai/context/product-scope.md`, `ai/context/api-contract.md`, `ai/context/roles-and-navigation.md`, `ai/context/backend-coordination.md`.
- `openspec/specs/ui-reports/spec.md`.
- `openspec/changes/add-frontend-reports-dashboard/{proposal.md,design.md}`.
- `openspec/changes/add-frontend-user-roles-and-receiving/{proposal.md,design.md,backend-request.md,tasks.md,specs/ui-receiving/spec.md}`.
- `src/app/(app)/reports/purchases/page.tsx`, `src/components/reports/PurchasesReportView.tsx`, `src/lib/types.ts`, `src/lib/nav.ts`, `src/lib/roles.ts`, `src/lib/session.ts`.
- `../backend/internal/bootstrap/router.go`.
- `../backend/openspec/changes/add-suppliers-purchases/{proposal.md,design.md,specs/purchasing/spec.md}`.
- `../backend/openspec/changes/add-multi-role-and-receiving/{proposal.md,design.md,specs/purchasing/spec.md,specs/identity/spec.md,specs/inventory/spec.md}`.
