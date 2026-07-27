# Pedido a backend: agregación de ventas por método de pago

> Este archivo es un **prompt para la sesión de backend** (skill `go-backend`, módulo `internal/reporting`). Pegar tal cual o adaptar. Generado desde el frontend porque `/sales` necesita este dato y hoy no existe ningún endpoint que lo dé.

## Contexto

El frontend quiere mostrar, en la pantalla operativa de ventas (`/sales`, admin-only):
1. Cards de resumen del día: cantidad de ventas confirmadas, total facturado, total en efectivo, total en tarjeta.
2. Una herramienta de "cierre de caja": el mismo desglose sobre un rango de fechas elegido por el operador.

Revisé `internal/reporting` a fondo y confirmé que **no existe agregación por método de pago en ningún endpoint**:

- `GET /api/v1/reports/sales/summary` (`internal/reporting/application/sales_summary.go`) sólo acepta `group_by=total|day` — cualquier otro valor devuelve `422`. Agrupa por fecha, no por método.
- `GET /api/v1/reports/sales` acepta `payment_method` como **filtro** exacto (`internal/reporting/transport/http/handler.go`), no como agrupador: filtra filas de una lista paginada, no suma nada.
- `GET /api/v1/reports/sales/by-cashier` y `/by-product` agrupan por cajero y por producto respectivamente, no por método de pago.
- "Cierre de caja"/arqueo no existe como concepto en ningún dominio, migración ni ruta del backend.

El modelo de pagos ya soporta esto: `Payment{ID, Method, Amount}` (`internal/sales/domain/payment.go`), una venta puede tener varios pagos, y `payments[]` ya viaja en las respuestas de `sales` y `reporting`. Sólo falta la agregación.

## Pedido: `group_by=payment_method` en `GET /api/v1/reports/sales/summary`

Extender el `group_by` existente (hoy `total|day`) con un tercer valor, siguiendo el mismo patrón que ya usa el endpoint (mismo caso de uso, misma validación, mismos parámetros `from`/`to`).

**Request:** `GET /api/v1/reports/sales/summary?from=2026-07-27&to=2026-07-27&group_by=payment_method`

**Response propuesta:**
```json
{
  "total_sales": 42,
  "total_amount": "158340.00",
  "by_payment_method": [
    { "method": "CASH", "sale_count": 30, "total_amount": "98000.00" },
    { "method": "CARD", "sale_count": 12, "total_amount": "60340.00" }
  ]
}
```

Notas:
- `sale_count` por método cuenta **ventas** que incluyen un pago de ese método, no pagos individuales — una venta con pago dividido (efectivo + tarjeta) contaría en ambos grupos si eso es correcto para el negocio; si no lo es, aclarar el criterio en la respuesta del backend antes de que el frontend lo consuma, porque la suma de `sale_count` por método podría no coincidir con `total_sales`.
- `total_amount` por método es la suma de `payments.amount` con ese método, no el total de la venta completa.
- Admin-only, como el resto de `reports/*`.
- Si conviene más un endpoint separado (`GET /reports/sales/by-payment-method`, mismo estilo que `by-cashier`) en vez de un tercer `group_by`, cualquiera de las dos formas sirve — el frontend se adapta al contrato que resulte más natural del lado del backend.

## Fuera de alcance de este pedido

- No pedimos un dominio de "cierre de caja"/turno/sesión de caja — el backend no lo tiene y no hace falta para lo que el frontend necesita mostrar. La agregación por rango de fechas ya cubre el caso de uso.
- No pedimos `cash_tendered` (efectivo entregado en mano) — ya quedó descartado en `add-sales-split-payment` por no estar pedido; sigue sin estarlo.
- No pedimos filtro por cajero en esta agregación todavía; si hace falta un cierre de caja por persona, es un pedido posterior.

## Checklist de verificación sugerida

- [ ] `GET /reports/sales/summary?group_by=payment_method&from=...&to=...` responde `200` con el desglose
- [ ] La suma de `total_amount` por método coincide con `total_amount` general cuando no hay pagos divididos
- [ ] Rango sin ventas confirmadas devuelve ceros, no `404` ni error
- [ ] Caller no-admin recibe `403`
