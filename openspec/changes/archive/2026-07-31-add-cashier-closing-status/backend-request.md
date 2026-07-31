# Pedido a backend: estado diario y reporte de conciliación de caja

> Fecha: 2026-07-30. El frontend verificó `POST /cash-closings`,
> `GET /sales/summary` y las lecturas Admin de cierres en
> `../backend/internal/bootstrap/router.go`. Ninguno expone hoy un estado
> derivado por cajero/día ni permite al Cashier consultar su último cierre.

## Necesidad

Un cierre es inmutable y puede repetirse. Como las ventas continúan después de
un cierre, el frontend necesita saber si las ventas confirmadas posteriores
requieren otro corte. Administración necesita ver el mismo estado por cajero y
día de negocio, incluidos los días con ventas sin cierre.

## Estado actual verificado

- `GET /sales/summary` es Cashier-only y devuelve sólo totales del rango.
- `POST /cash-closings` es Cashier-only y crea un cierre por intervalo.
- `GET /cash-closings` es Admin-only y lista registros existentes, sin filas
  para días sin cierre ni clasificación de cobertura.
- El backend ya es la autoridad de ventas confirmadas, intervalos, dinero
  decimal y zona horaria de negocio.

## Contrato mínimo solicitado

### Estado propio de Cashier

**`GET /api/v1/cash-closings/current-status?date=YYYY-MM-DD`**

- Rol: Cashier; auto-scoped al usuario autenticado.
- `date` es obligatorio y se interpreta en la zona horaria de negocio.
- `200` devuelve una clasificación de negocio y datos suficientes para mostrar
  el último cierre sin que el cliente compare timestamps o sume ventas:

```json
{
  "business_date": "2026-07-30",
  "status": "IN_PROGRESS",
  "latest_closing": null,
  "sales_after_latest_closing": 3,
  "cash_after_latest_closing": "8100.00"
}
```

- Estados solicitados: `IN_PROGRESS` (día actual con actividad y sin cierre
  vigente), `CLOSED` (último cierre cubre las ventas hasta su cutoff),
  `REQUIRES_UPDATE` (hay ventas posteriores), `UNCLOSED` (día histórico con
  actividad y sin cierre) e `NO_ACTIVITY`.
- Cuando exista, `latest_closing` incluye el mismo shape de `GET
  /cash-closings/{id}`: `id`, `cashier_id`, `from`, `to`, `expected_cash`,
  `counted_cash`, `difference`, `notes` nullable y `closed_at`.
- `400` para fecha ausente o inválida; `401` sin sesión; `403` sin rol Cashier.

### Reporte diario de Administración

**`GET /api/v1/cash-closings/daily-status?from=YYYY-MM-DD&to=YYYY-MM-DD`**

- Rol: Admin solamente.
- Rango inclusivo de días de negocio; `from` y `to` obligatorios.
- `200` devuelve filas paginadas por día/cajero con estado distinto de
  `NO_ACTIVITY` y los datos necesarios para conciliación:

```json
{
  "items": [
    {
      "business_date": "2026-07-30",
      "cashier_id": "uuid",
      "cashier_username": "cajero1",
      "status": "REQUIRES_UPDATE",
      "total_sales": 3,
      "total_amount": "8100.00",
      "expected_cash": "8100.00",
      "counted_cash": "8000.00",
      "difference": "-100.00",
      "sales_after_latest_closing": 1,
      "cash_after_latest_closing": "1200.00",
      "latest_closing": { "id": "uuid", "closed_at": "2026-07-30T18:00:00Z" }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

- Los importes son strings decimales y los campos del último cierre pueden ser
  `null` cuando no existe. `400` para rango inválido; `401` sin sesión; `403`
  para rol distinto de Admin.

## Reglas que el backend debe decidir y aplicar

- Qué cierre prevalece ante registros solapados y cómo determina que cubre
  ventas de un día.
- Cómo clasifica el día actual frente a un día histórico y cómo trata ventas
  sólo con tarjeta o transferencia.
- Qué ventas pertenecen al cálculo según `confirmed_at` y los límites de día
  de negocio.

El frontend no prescribe la implementación ni replica esas reglas.

## Compatibilidad y rollout

Los endpoints son aditivos: no cambian `POST /cash-closings`, `GET
/sales/summary` ni las lecturas existentes. Desplegar backend antes que
frontend; el frontend no implementará el indicador ni el reporte hasta recibir
`200` con los shapes y roles verificados contra una instancia real.

## Criterio de desbloqueo

El backend entrega rutas registradas, tests de estados mixtos y autorización,
contratos documentados y una instancia desplegada donde Cashier/Admin reciban
los `200`, `400`, `401` y `403` indicados.

## Fuera de alcance

- Bloquear o reabrir ventas.
- Sesiones formales de caja, apertura o traspaso de turno.
- Editar o borrar cierres.
- Alertas automáticas, impresión de comprobantes o exportación.
