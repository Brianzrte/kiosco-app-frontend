# Pedido a backend: reportes de categoría, resultado y movimientos de dinero

**Frontend change:** `add-frontend-reports-categories-and-profitability`
**Actualizado:** 2026-08-07
**Estado:** el centro `/reports/profitability` no se implementa ni mockea hasta
que el resumen de resultado se despliegue y se verifique contra una instancia
real.

## Necesidad

La dueña necesita distinguir tres preguntas que hoy se confunden:

1. ¿Cuánto vendió y cuál fue el costo de esa mercadería vendida?
2. ¿Cuánto dejó la operación después de gastos operativos?
3. ¿Qué dinero salió para comprar stock, pagar gastos y realizar retiros
   personales?

`GET /reports/purchases/by-supplier` es un reporte de compras, no una fuente
válida de margen: la compra sucede al incorporar stock, mientras que el costo
de ventas sucede al venderlo. El frontend no puede resolver esa diferencia ni
deduplicar pagos de pedido y egresos por su cuenta.

## Estado actual verificado

Evidencia de reporting consultada el 2026-07-30:

- Existe `GET /api/v1/reports/sales/summary` para ingresos y
  `GET /api/v1/reports/sales/by-product`, pero ninguno expone costo histórico
  de los productos efectivamente vendidos.
- Existe `GET /api/v1/reports/purchases/by-supplier` con `investment` y
  conteos de pedidos; no entrega un resultado de negocio ni distingue compra
  de stock de gasto operativo.
- No existe `GET /api/v1/reports/sales/by-category` ni comparación de ventas
  por producto entre ventanas.
- El backend vigente no contiene el dominio Egresos. El change
  `add-frontend-expenses-and-payroll` solicita `expenses/summary`, pero ese
  agregado incluye `PURCHASE`; no puede consumirse directamente como gasto
  operativo porque duplicaría compras de stock.
- El change `add-frontend-purchasing-optional-supplier` solicita pedidos sin
  proveedor; el resumen debe incluirlos con la misma clasificación que una
  compra con proveedor, sin perder trazabilidad.

## Contrato mínimo solicitado

### 1. Ventas por categoría

**`GET /api/v1/reports/sales/by-category?from=YYYY-MM-DD&to=YYYY-MM-DD`**

- Rol: `admin`; fechas obligatorias y misma semántica de rango que los reportes
  de venta actuales.
- `200`:

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

- Sólo incluye categorías con ventas confirmadas; orden descendente por
  `total_revenue`; valores monetarios como string decimal.
- Errores: `400` para rango ausente/inválido; `401`/`403` del middleware.

### 2. Resumen de rentabilidad y movimientos

**`GET /api/v1/reports/profitability?from=YYYY-MM-DD&to=YYYY-MM-DD`**

- Rol: `admin`; `from` y `to` obligatorios, `YYYY-MM-DD`, misma semántica de
  días de negocio que el resto de reporting.
- Debe ser una única fotografía coherente del rango y devolver todos los
  importes como strings decimales. Shape mínimo:

```json
{
  "revenue": "100000.00",
  "cost_of_goods_sold": "55000.00",
  "gross_margin": "45000.00",
  "operating_expenses": "12000.00",
  "operating_result": "33000.00",
  "stock_purchases": "60000.00",
  "owner_draws": "5000.00",
  "expenses_by_type": [
    { "type": "OPERATING", "label": "Gastos operativos", "amount": "8000.00" },
    { "type": "PAYROLL", "label": "Sueldos", "amount": "4000.00" }
  ],
  "expenses_by_payment_method": [
    { "payment_method": "CASH_REGISTER", "label": "Efectivo de caja", "amount": "3000.00" }
  ]
}
```

Reglas de negocio que debe aplicar backend y devolver ya resueltas:

- `revenue`: ventas confirmadas del rango.
- `cost_of_goods_sold`: costo histórico de las unidades efectivamente vendidas
  en el rango. No es el total de pedidos ni el valor de stock actual.
- `gross_margin = revenue − cost_of_goods_sold`.
- `operating_expenses`: sólo egresos que backend clasifique como gasto de la
  operación. No incluye compras de stock ni `OWNER_DRAW`.
- `operating_result = gross_margin − operating_expenses`.
- `stock_purchases`: salidas/altas de stock por pedidos pagados y compras
  directas que backend decida incluir, con proveedor o sin proveedor. Es una
  lectura de caja/inventario y no se descuenta otra vez de margen o resultado.
- `owner_draws`: suma de `OWNER_DRAW` activos; no integra ningún total de
  gastos ni resultado.
- Un mismo hecho económico debe tener una referencia de origen única y debe
  aparecer una sola vez en cada dimensión pertinente. Un pago de pedido que
  además origine un egreso de compra no puede sumar dos veces a
  `stock_purchases` ni filtrarse a `operating_expenses`.
- Los egresos anulados aportan cero. La regla de inclusión temporal de pagos,
  compras directas y egresos debe ser consistente y documentada por backend.

El backend puede agregar campos, pero no debe dejar al frontend inferir costo,
resultado ni la deduplicación. Si todavía no puede calcular una cifra, debe
responder un error verificable o posponer el endpoint completo; no se acepta
un `0` que parezca dato real.

Errores: `400` para rango inválido, `401`/`403` del middleware y `500` con el
envelope `{ message }` si la consistencia del resumen no puede garantizarse.

### 3. Crecimiento de ventas por producto

**`GET /api/v1/reports/sales/by-product/growth?from=YYYY-MM-DD&to=YYYY-MM-DD&window_days=14`**

- Rol: `admin`; respuesta `{ "products": [...] }` con `product_id`,
  `product_name`, `recent_quantity`, `previous_quantity` y `growth_percent`.
- `growth_percent` es `null` cuando `previous_quantity` es cero; nunca
  infinito/NaN.
- Backend y dueña definen umbral mínimo y antigüedad del catálogo para que un
  producto califique. El frontend no los inventa.
- Errores: `400` para rango/ventana inválidos y `401`/`403` heredados.

## Compatibilidad y despliegue

1. Backend despliega y verifica primero Egresos, su `expenses/summary`, el
   costo histórico de venta y la clasificación/deduplicación de compras.
2. Luego despliega `reports/profitability` junto con los tests de identidades
   anteriores y casos de pedido con y sin proveedor, compra directa, sueldo,
   gasto operativo, retiro y anulación.
3. Frontend verifica el endpoint contra una instancia real antes de consumirlo.
   Un frontend viejo no conoce el endpoint nuevo; no hay incompatibilidad.
4. Los endpoints de categoría y crecimiento son independientes y desbloquean
   sólo sus regiones respectivas.

## Criterio de desbloqueo frontend

- `reports/profitability` responde para un período con actividad y sus totales
  cumplen las identidades declaradas, con todos los importes como strings.
- Un caso real de compra de stock, gasto operativo y retiro muestra cada hecho
  en su región, sin duplicar la compra ni descontar el retiro del resultado.
- La misma verificación incluye un pedido sin proveedor si esa ampliación de
  Purchasing ya está desplegada.
- Categorías y producto revelación se verifican de manera independiente según
  sus contratos anteriores.

## Fuera de alcance

- Balance contable, impuestos, amortización, cuentas por pagar y conciliación
  bancaria.
- Configuración de política de costo o reclasificación manual desde frontend.
- Series diarias de gastos/compras y exportación contable.
