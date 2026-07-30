# Pedido a backend: ventas por categoría, unidades compradas y comparación de ventas por producto

> Fecha: 2026-07-30. El frontend verificó `../backend/internal/reporting/transport/http/routes.go`,
> `handler.go`, `dto.go` y `postgres_report_queries.go` contra una instancia real
> del repositorio backend. Los tres puntos de abajo no existen hoy en ningún
> endpoint de `/api/v1/reports/`.

## Necesidad

El dueño pidió, en un solo Requirement Context aprobado, ver qué categorías
generan más ventas y una vista de rentabilidad (ingresos, egresos, margen
bruto, unidades vendidas y compradas, y productos con crecimiento reciente de
ventas). Tres piezas de eso no tienen soporte de backend hoy. El resto
(ingresos, egresos en dinero, margen bruto derivado, unidades vendidas,
productos sin venta) se construye con endpoints ya existentes y no se pide
nada más para esa parte.

## Estado actual verificado

- `routes.go` registra `GET /api/v1/reports/sales/by-product`, que agrupa por
  producto y sólo acepta `category_id` como filtro de un producto puntual —
  no existe ninguna ruta que agrupe por categoría.
- `GET /api/v1/reports/purchases/by-supplier` (`handler.go:50-58`) devuelve
  `investment`, `purchase_order_count`, `complete_delivery_count`,
  `incomplete_delivery_count`, `undelivered_products` — ningún campo de
  unidades.
- No existe ninguna ruta ni caso de uso que compare la cantidad vendida de un
  producto entre dos ventanas de tiempo.
- Los tres puntos son necesarios porque el cálculo cruza reglas de negocio
  (agregación por categoría, definición de "unidad comprada", umbral de
  calificación de un producto como "revelación") que le corresponden al
  backend; el frontend no las puede componer a partir de datos ya paginados
  sin duplicar lógica de negocio en el cliente.

## Contrato mínimo solicitado

### 1. Ventas por categoría

**`GET /api/v1/reports/sales/by-category?from=YYYY-MM-DD&to=YYYY-MM-DD`**

- Rol: admin (mismo `RequireRole(admin)` que el resto de `/api/v1/reports/`).
- `from`/`to` obligatorios, mismo formato y semántica de rango que
  `sales/by-product` y `sales/by-cashier`.
- `200`, mismo envoltorio con clave nombrada que ya usan `sales/by-cashier`
  (`{"cashiers": [...]}`) y `sales/by-product` (`{"products": [...]}`) —
  se propone `categories` por consistencia, no un array desnudo:

```json
{
  "categories": [
    {
      "category_id": "uuid",
      "category_name": "Bebidas",
      "total_quantity": 42,
      "total_revenue": "12500.00"
    }
  ]
}
```

- Sólo categorías con al menos una venta confirmada en el rango aparecen en
  la respuesta (mismo criterio que `sales/by-product`, que no lista productos
  sin venta).
- `category_id`/`category_name` no nullable — la categoría es obligatoria en
  el modelo de producto (`../backend/internal/catalog/transport/http/dto.go:41`).
- `total_revenue` como string decimal, mismo formato que el resto del
  reporting.
- Errores: `400` para rango ausente o inválido, `401`/`403` heredados del
  middleware del subtree.

### 2. Unidades compradas en `purchases/by-supplier`

Agregar un campo a la respuesta existente de
**`GET /api/v1/reports/purchases/by-supplier?from=&to=&supplier_id=`**
(sin cambiar ningún campo actual):

```json
{
  "investment": "45000.00",
  "purchase_order_count": 12,
  "complete_delivery_count": 10,
  "incomplete_delivery_count": 2,
  "undelivered_products": [],
  "total_quantity_purchased": 340
}
```

- `total_quantity_purchased` (nombre propuesto, no acordado): total de
  unidades pedidas a proveedores en el rango, con el mismo criterio de qué
  pedidos cuentan que ya aplica `investment`/`purchase_order_count` — backend
  define si incluye pedidos cancelados o no recibidos; el frontend no fija
  esa regla.
- Cambio aditivo: no se quita, renombra ni cambia de tipo ningún campo
  existente; una respuesta vieja (sin el campo) sigue siendo válida para
  cualquier consumidor que no lo lea todavía.

### 3. Comparación de ventas por producto entre dos ventanas

**`GET /api/v1/reports/sales/by-product/growth?from=YYYY-MM-DD&to=YYYY-MM-DD&window_days=14`**

- Rol: admin.
- `window_days` opcional, default propuesto `14`. Ventana reciente: los
  últimos `window_days` días terminando en `to` (o en el día actual, a
  definir por backend). Ventana anterior: los `window_days` días
  inmediatamente anteriores, misma longitud.
- `200`, mismo criterio de envoltorio con clave nombrada que el resto del
  reporting (`{"products": [...]}`, no un array desnudo):

```json
{
  "products": [
    {
      "product_id": "uuid",
      "product_name": "Gaseosa 1.5L",
      "recent_quantity": 30,
      "previous_quantity": 12,
      "growth_percent": 150.0
    },
    {
      "product_id": "uuid2",
      "product_name": "Alfajor",
      "recent_quantity": 8,
      "previous_quantity": 0,
      "growth_percent": null
    }
  ]
}
```

- `growth_percent` es `null` cuando `previous_quantity = 0`, nunca infinito
  ni `NaN` — mismo tratamiento que ya usa el frontend para el caso
  `previous_empty` de `comparePeriods` (`src/lib/reports.ts:111-121`), que
  este pedido espera reflejar del lado del backend en vez de recalcularlo en
  el cliente a partir de dos totales.
- Reglas de calificación (umbral mínimo de unidades vendidas y antigüedad
  mínima del producto en catálogo para aparecer en el ranking) quedan a
  definir por backend junto con el dueño; el frontend no las prescribe. Se
  documentan como pregunta abierta, no como parte del contrato mínimo.
- Errores: `400` para rango o `window_days` inválido, `401`/`403` heredados.

## Impacto en el frontend

- Sin el punto 1: la sección "Categorías más vendidas" del dashboard de
  `/reports` no se implementa; la tarea correspondiente queda bloqueada en
  `tasks.md`.
- Sin el punto 2: el tile "Unidades compradas" de `/reports/profitability` no
  se implementa; el resto de la página (ingresos, egresos en dinero, margen
  bruto, unidades vendidas) no depende de este punto y se implementa igual.
- Sin el punto 3: la sección "Producto revelación" de `/reports/profitability`
  se muestra como bloque deshabilitado con el motivo, sin fetch ni datos,
  según especifica `specs/ui-reports-detail/spec.md` de este change.

## Compatibilidad y despliegue

- Los tres puntos son aditivos: ningún endpoint ni campo existente cambia de
  forma incompatible. Un frontend viejo sigue funcionando contra un backend
  que agregue estos campos/endpoints.
- No hay orden de despliegue entre los tres puntos — son independientes entre
  sí y cada uno desbloquea sólo la pieza de frontend que depende de él.
- El frontend no consume ninguno de los tres hasta verificar, contra una
  instancia real, que el endpoint o campo está desplegado y devuelve el shape
  documentado arriba.

## Criterio de desbloqueo

- Punto 1: endpoint desplegado y verificado devolviendo el shape documentado
  contra datos reales de al menos dos categorías con ventas.
- Punto 2: campo desplegado y verificado en `purchases/by-supplier` con al
  menos un pedido recibido en el rango de prueba.
- Punto 3: endpoint desplegado, shape verificado, y backend + dueño acuerdan
  las reglas de umbral y antigüedad — sin esa definición, el frontend no
  puede decidir qué mostrar como "califica" aunque el endpoint ya responda.

## Fuera de alcance

- No se pide ningún endpoint de gastos operativos generales (alquiler,
  sueldos, servicios).
- No se pide una serie diaria para compras ni para el crecimiento por
  producto — los tres puntos son totales o comparaciones de rango completo.
- No se pide cambiar `GET /api/v1/reports/products?sort=worst_selling`, que
  ya cubre "productos sin venta" sin desarrollo adicional.
