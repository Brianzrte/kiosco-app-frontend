## Why

El kiosco sólo puede consultar compras históricas: no puede administrar proveedores, preparar pedidos de forma asistida, conciliar pagos ni reflejar automáticamente en stock lo que entregó un proveedor. Esto obliga a llevar decisiones y diferencias fuera del sistema, con riesgo de faltantes, sobrestock y saldos incorrectos.

## What Changes

- Agregar gestión de proveedores con alta, edición, desactivación y preservación de historial, además de asociaciones producto–proveedor con uno preferido.
- Agregar gestión de pedidos de compra: creación manual, sugerencias de reposición revisables, detalle y ajustes antes de recibir.
- Agregar pagos a proveedores con monto, fecha, medio, asociación a una o varias órdenes y saldo para conciliación.
- Modificar la recepción para que confirme cantidades reales, preserve motivos de faltantes e ítems no catalogados, y actualice stock y movimientos de forma atómica al cerrar el pedido.
- Ampliar el reporte de compras con desempeño agregado por proveedor: inversión, pedidos, entregas completas/incompletas e ítems no entregados.
- Agregar las entradas de navegación y gates de rol correspondientes. El rol interno es `receiving`; no se crea un portal ni un rol externo de proveedor.

## Capabilities

### New Capabilities

- `ui-suppliers-purchasing`: administración de proveedores, relaciones producto–proveedor, pedidos manuales y sugeridos, pagos y saldos.

### Modified Capabilities

- `ui-foundation`: navegación con las nuevas secciones de proveedores y pedidos para los roles autorizados.
- `ui-receiving`: la recepción pasa a confirmar las cantidades reales y a cerrar el pedido con stock y movimientos actualizados por el backend.
- `ui-reports`: el reporte de compras incorpora métricas agregadas de desempeño por proveedor.

## Impact

- Nuevas rutas y vistas para proveedores, pedidos, sugerencias y pagos; modificación de `/receiving`, `/reports/purchases`, `NAV_ITEMS`, gates y tipos de transporte.
- Depende de `add-frontend-user-roles-and-receiving` para roles múltiples, `receiving` y la superficie de recepción.
- Requiere backend para CRUD ampliado de proveedores, asociaciones producto–proveedor, planificación, pagos, reporting y recepción atómica con Inventory. No se implementa ni mockea ninguna parte bloqueada antes de verificar su despliegue.
- No agrega dependencias.
