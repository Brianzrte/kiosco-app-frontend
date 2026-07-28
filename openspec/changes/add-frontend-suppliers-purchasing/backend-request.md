# Pedido a backend: proveedores, compras, pagos, planificación y recepción atómica

Fecha: 2026-07-28.

## Contexto

El frontend requiere gestionar proveedores, planificar pedidos revisables, conciliar pagos y reflejar la entrega real en Inventory. Hoy sólo consume `GET /suppliers` y `GET /purchase-orders` desde `/reports/purchases`. El router del working tree ya contiene lectura/creación de suppliers y purchase orders, y el change abierto `add-multi-role-and-receiving` agrega detalle, edición de ítems y recepción con método de pago; su presencia no prueba despliegue.

El contrato vigente de recepción afirma explícitamente que recibir no actualiza stock. Este change requiere sustituir esa conducta por una operación atómica.

## Evidencia verificada

- `../backend/internal/bootstrap/router.go:154-170`: `GET/POST /suppliers`, `GET/POST /purchase-orders`, detalle, recepción e ítems, repartidos por roles.
- `../backend/openspec/changes/add-suppliers-purchases/specs/purchasing/spec.md`: Supplier sólo tiene alta/listado; PurchaseOrder se crea/lista/recibe sin stock.
- `../backend/openspec/changes/add-multi-role-and-receiving/specs/purchasing/spec.md`: recepción con `cash | transfer | account`, pero sin movimiento de stock.

## Estado actual

| Necesidad frontend | Estado verificado |
|---|---|
| Listar/crear proveedor | existe en working tree |
| Editar/desactivar proveedor | no existe en router |
| Relación producto–proveedor | no existe en router ni specs |
| Pedido manual | existe en working tree |
| Sugerencia de reposición | no existe |
| Pago, asignación y saldo | no existe |
| Reporte agregado por proveedor | no existe |
| Recepción con stock atómico | contradice contrato actual |

## Contrato mínimo solicitado

### 1. Gestión de proveedores y asociaciones

Se necesita completar la administración de proveedores con edición y desactivación lógica, y exponer relaciones producto–proveedor múltiples con proveedor preferido. El backend define los campos de contacto/datos de compra y garantiza integridad: un proveedor inactivo no puede participar en pedidos nuevos y los pedidos históricos siguen resolviendo su nombre.

El contrato debe ofrecer operaciones verificables para leer, crear, cambiar y desactivar proveedores, y para consultar/modificar las asociaciones de un producto. Respuestas incluyen `id`, `name`, `active`, relación de producto/proveedor y preferido; los errores de duplicado, estado inválido y relación inválida devuelven `{ message }` y status apropiado. Acceso: Admin e Inventory.

### 2. Sugerencias de reposición revisables

Se necesita una lectura de sugerencias y una forma de convertir una sugerencia revisada en pedido pendiente. La sugerencia se calcula sólo en backend con stock actual, ventas, frecuencia de reposición y asociaciones producto–proveedor; por ítem debe devolver producto, proveedor propuesto, cantidad propuesta y una razón o un indicador de datos insuficientes. No se crea un pedido sin una escritura explícita del usuario.

El backend define fórmula, horizonte de ventas, stock de seguridad, tratamiento de faltantes y los paths concretos. Acceso: Admin e Inventory. Errores y datos insuficientes deben devolver `{ message }` o razones por ítem, sin cantidades inventadas por frontend.

### 3. Pagos a proveedor y conciliación

Se necesita registrar pagos con fecha, monto decimal, medio de pago y una o varias asignaciones a pedidos `RECEIVED`. El backend debe validar monto positivo, pedido elegible, suma de asignaciones y que no se exceda el saldo; guardar auditoría; devolver asignaciones y saldos por pedido/proveedor. Los montos viajan como strings decimales y errores como `{ message }`.

Definir paths, métodos, enum de medios, permisos y respuestas. Admin debe poder operar y leer; confirmar expresamente si Inventory también puede registrar pagos. Un `409` o `422` debe distinguir conflicto concurrente de pago y validación de saldo según corresponda.

### 4. Reporte agregado por proveedor

Se necesita un endpoint Admin-only, filtrable por `from`, `to` y proveedor opcional, que devuelva agregados del período: inversión, cantidad de pedidos, entregas completas/incompletas y productos no entregados. El backend calcula todas las métricas; el frontend no las deriva de `GET /purchase-orders` paginado. Los días de rango son `YYYY-MM-DD`; montos, strings decimales.

### 5. Recepción atómica con Inventory

Extender la recepción de pedido pendiente para recibir método de pago y cantidades realmente entregadas por ítem. En una única transacción debe validar estado y cantidades, persistir recepción y diferencias auditables, cerrar el pedido, actualizar stock por las cantidades recibidas y crear los movimientos correspondientes. Si una validación o actualización falla, no debe persistirse ni la recepción ni un movimiento parcial. Un pedido ya recibido responde `409`.

Los ítems no entregados conservan motivo y siguen visibles; los adicionales ya previstos por el change relacionado mantienen su tratamiento de catálogo o texto libre. Definir cómo se comporta un ítem sin stock inicial y el identificador/referencia de los movimientos. Acceso: Admin, Inventory y Receiving.

## Compatibilidad y rollout

1. Desplegar primero `add-multi-role-and-receiving` y confirmar roles múltiples/`receiving` y las rutas existentes contra una instancia.
2. Desplegar migraciones y contratos de proveedores, relaciones, pagos, planificación, reporte y recepción atómica.
3. Verificar autorización, shape, nullabilidad, mensajes y transacción real antes de habilitar el frontend.
4. Comunicar el cambio operativo: una recepción confirmada ya carga stock; no se repite el ajuste manual para esas unidades.

## Criterio de desbloqueo frontend

Una instancia accesible devuelve los contratos acordados, rechaza los permisos y estados inválidos con status/mensaje verificables y demuestra que una recepción exitosa crea movimientos y actualiza stock, mientras un fallo no cambia ni pedido ni stock.
