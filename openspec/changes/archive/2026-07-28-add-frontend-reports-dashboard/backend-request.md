# Pedido a backend: reportes de detalle, valorización de inventario y módulo de proveedores

> Este archivo es un **prompt para la sesión de backend** (skill `go-backend`). Pegar tal cual o adaptar. Generado desde el frontend porque el refactor de `/reports` a dashboard + subpáginas necesita estos datos y hoy no existen.

## Contexto

`/reports` pasa a ser un dashboard con cuatro reportes de detalle detrás. El dashboard (resumen, evolución diaria, comparación contra período anterior, top 3 productos) se construye con lo que ya existe. Los cuatro pedidos de abajo son lo que falta.

Revisé el código, no sólo los specs. Estado actual:
- `GET /api/v1/reports/sales/summary` acepta `group_by=total|day|payment_method`. Con `day` devuelve `{date, total_sales, total_amount}` y nada más; con `payment_method` agrega sobre **todo el rango**, no por día.
- `GET /api/v1/reports/sales` lista ventas individuales con `cashier` y `payments[]`, paginadas — sirve para el detalle, no para un reporte agrupado.
- `GET /api/v1/reports/sales/by-product` da cantidad e ingresos **sólo de productos con ventas**.
- `GET /api/v1/inventory/stock` (`stockListItemResponse`) devuelve `sku`, `name`, `quantity`, `minimum_quantity` — **no** `price` ni `cost`. El costo vive en `GET /products`.
- No existe ningún endpoint de valorización de inventario.
- No existe ningún dominio de proveedores/compras: ni tabla, ni migración, ni ruta, ni spec.
- `internal/sales/domain/sale.go` define sólo `PaymentCash = "CASH"` y `PaymentCard = "CARD"`.

## Pedido 1: ventas por día con desglose por medio de pago y cajero

El reporte de ventas necesita, por cada día del rango: total facturado, cuánto en efectivo, cuánto en tarjeta, cuánto en transferencia, y el cajero.

**Propuesta:** extender `GET /api/v1/reports/sales/summary?group_by=day` para que cada fila de `days` incluya el desglose por método, o bien un endpoint nuevo si mezclar ambas agrupaciones ensucia el caso de uso existente:

```json
{
  "total_sales": 42,
  "total_amount": "158340.00",
  "days": [
    {
      "date": "2026-07-27",
      "total_sales": 12,
      "total_amount": "45300.00",
      "by_payment_method": [
        { "method": "CASH",     "total_amount": "30000.00" },
        { "method": "CARD",     "total_amount": "15300.00" },
        { "method": "TRANSFER", "total_amount": "0.00" }
      ],
      "cashiers": [{ "cashier_id": "…", "cashier_name": "brian" }]
    }
  ]
}
```

Notas:
- El agrupamiento por día debe seguir usando `America/Argentina/Buenos_Aires` como ya hace `postgres_report_queries.go:162`. El frontend no reagrupa ni convierte zonas.
- Sobre `cashiers`: un día puede tener más de un cajero. Si el criterio de negocio es "un renglón por día y cajero" en vez de "un renglón por día con la lista de cajeros", esa forma también sirve y probablemente sea más útil — decidilo del lado del backend y avisá cuál queda, que el frontend se adapta.
- Un método sin ventas ese día debería venir en `"0.00"` en vez de omitirse, para que las columnas del reporte queden alineadas. Si preferís omitirlo, el frontend rellena con cero, pero avisá cuál es el criterio.

## Pedido 2: `TRANSFER` como tercer método de pago

Hoy el dominio sólo tiene `CASH` y `CARD`. El kiosco cobra por transferencia y necesita saber cuánto entró por esa vía, cosa que hoy es imposible porque el cajero no puede registrarla.

- Agregar `PaymentTransfer PaymentMethod = "TRANSFER"` y aceptarlo en `PUT /api/v1/sales/{id}/payment` con las mismas reglas que los otros dos.
- **Impacta el POS**, no sólo el reporte: el cajero tiene que poder elegirlo al cobrar. Del lado del frontend eso se coordina con el change `add-frontend-sales-payments`, que todavía no está implementado.
- Las ventas históricas no se tocan: siguen con el método que tengan.

## Pedido 3: reporte de productos con stock, costo, precio y margen

Una fila por producto del catálogo, con lo vendido en el rango **y** los que no vendieron nada:

**Propuesta:** `GET /api/v1/reports/products?from=…&to=…&sort=best_selling|worst_selling&limit=&page=`

```json
{
  "items": [
    {
      "product_id": "…",
      "product_name": "Coca-Cola 500ml",
      "quantity_sold": 6,
      "stock": 24,
      "cost": "800.00",
      "price": "1800.00",
      "margin": "6000.00"
    }
  ],
  "total": 137
}
```

Notas:
- `margin` = ingresos del producto en el rango − (`cost` × `quantity_sold`), calculado por el backend. El frontend no hace aritmética de dinero sobre esto.
- **`worst_selling` tiene que incluir los productos con `quantity_sold = 0`**: son justamente los que el operador busca. Por eso la consulta debe partir del catálogo con `LEFT JOIN` a las ventas, no de `sale_items`.
- `cost` y `price` son los actuales del catálogo. Si preferís usar el costo del momento de la venta para el margen (más correcto contablemente, pero requiere snapshot de costo en `sale_items`, que hoy no existe), decidilo y avisá — el frontend muestra lo que devuelvas.
- Admin-only, como el resto de `/reports/*`.

## Pedido 4: valorización de inventario

Cuánto capital hay inmovilizado en stock.

**Propuesta:** `GET /api/v1/inventory/valuation`

```json
{
  "total_cost": "1450000.00",
  "total_sale_value": "2980000.00",
  "product_count": 137
}
```

Notas:
- `total_cost` = Σ (`cost` × `quantity`) sobre todo el inventario; `total_sale_value` = Σ (`price` × `quantity`). Calculado por el backend: sumar esto en el cliente exigiría paginar todo el stock y hacer aritmética de dinero sobre el resultado.
- **Pregunta abierta para backend**: ¿se cuentan sólo productos activos, o también los desactivados con stock remanente? El operador va a leer este número como "capital inmovilizado", así que la respuesta correcta probablemente sea incluir ambos discriminados. Decidilo y documentalo en la respuesta.
- Rol: Admin (y probablemente Inventory Manager, dado que vive bajo `/inventory` — a tu criterio).

## Pedido 5: módulo de proveedores y compras

Esto es un módulo nuevo completo, no un endpoint. `CLAUDE.md` lista proveedores como fuera del alcance del MVP, así que esto es una ampliación de alcance consciente, no un olvido.

El frontend necesita, para el reporte de compras: los pedidos realizados a proveedores con **fecha, valor del pedido, si fue recibido, y quién lo recibió**, filtrables por semana, por mes y por proveedor.

Eso implica como mínimo: entidad proveedor, entidad pedido de compra con sus ítems, un estado de recepción con el usuario que la registró, y el endpoint de listado con esos filtros. Cómo se modela el dominio (¿el pedido descuenta o incrementa stock al recibirse? ¿se integra con `stock_movements`?) es decisión del backend — el frontend sólo consume el listado.

**No hace falta que esto se resuelva junto con los pedidos 1–4.** El frontend muestra la card de compras deshabilitada hasta que exista; los otros tres reportes no dependen de éste.

## Checklist de verificación sugerida

- [ ] `summary?group_by=day` (o el endpoint que resulte) devuelve, por día, el desglose por método y el/los cajero(s)
- [ ] Un día sin ventas de un método devuelve ese método en cero (o se documenta que se omite)
- [ ] `TRANSFER` se acepta en `PUT /sales/{id}/payment` y aparece en los desgloses
- [ ] `GET /reports/products?sort=worst_selling` incluye productos con cero ventas en el rango
- [ ] `margin` viene calculado y coincide con ingresos − costo × cantidad
- [ ] `GET /inventory/valuation` devuelve ambos totales sobre todo el inventario, no sobre una página
- [ ] Inventario vacío devuelve ceros, no `404` ni error
- [ ] Caller no-admin recibe `403` en todos los `/reports/*`
