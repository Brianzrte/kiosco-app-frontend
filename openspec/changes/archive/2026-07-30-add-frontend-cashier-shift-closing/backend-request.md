# Pedido a backend: cierre de caja del cajero (resumen escoped + persistencia)

> **Resuelto — 2026-07-30.** Implementado y archivado en backend como
> `2026-07-30-add-cashier-shift-closings` (commit `8ee044b`). El efectivo
> esperado se recalcula exclusivamente en el servidor; el request real no
> acepta `expected_cash`.

> Este archivo es un **prompt para la sesión de backend** (skill `go-backend`). Pegar tal cual o adaptar. Generado desde el frontend porque el cajero necesita cerrar su turno dejando un registro, y hoy no existe ni el dato agregado que necesita ni ningún lugar donde guardarlo.

## Contexto

El frontend quiere darle al Cashier, al final de su turno, un modal que:
1. Muestre el efectivo esperado: suma de pagos en efectivo de sus propias ventas confirmadas en el rango del turno (por defecto, el día actual).
2. Le permita ingresar el efectivo contado físicamente y vea la diferencia.
3. Al confirmar, **guarde un registro** del cierre (cajero, rango, esperado, contado, diferencia, fecha/hora) para poder reportarlo después.

Ya existe un endpoint de agregación por método de pago (`GET /reports/sales/summary?group_by=payment_method`, agregado para `add-frontend-cash-closing`), pero es **admin-only** — todo `/reports/*` lo es por diseño (`CLAUDE.md` §5: "Every `/reports/*` endpoint is Admin-only"). Un cajero no puede llamarlo. Tampoco existe ningún concepto de "cierre de caja"/turno/sesión en ningún dominio, migración ni ruta — confirmado leyendo `internal/reporting`, `internal/sales`, `internal/identity`.

## Pedido 1: resumen de efectivo escoped al cajero autenticado

Un endpoint fuera de `/reports/*` (que es admin-only), en el dominio operativo de `sales`, auto-scoped al cajero que llama — mismo patrón de scoping ya usado en `GET /sales` (`CLAUDE.md`: "cashier forced server-side to their own cashier_id").

**Propuesta:** `GET /api/v1/sales/summary?from=2026-07-27&to=2026-07-27`

- Cashier: se auto-scoped a sus propias ventas confirmadas, ignorando cualquier `cashier_id` que se envíe (igual que `GET /sales`).
- Admin: sin restricción (opcional, no es el caso de uso principal de este pedido, pero mantiene el mismo patrón que el resto de `sales`).

**Response propuesta:**
```json
{
  "total_sales": 12,
  "total_amount": "45300.00",
  "total_cash": "30000.00",
  "total_card": "15300.00"
}
```

Notas:
- Sólo ventas `CONFIRMED` en el rango (`confirmed_at`), igual criterio que `/reports/*`.
- `total_cash`/`total_card` son la suma de `payments.amount` por método, no el total de la venta completa (una venta con pago dividido contribuye a ambos).
- Si resulta más natural extender `GET /reports/sales/summary` con acceso condicional para Cashier (auto-scoped) en vez de un endpoint nuevo, cualquiera de las dos formas sirve — pero ojo que eso rompería la garantía actual de "`/reports/*` es siempre Admin-only", así que el endpoint nuevo bajo `/sales` es la opción por defecto sugerida.

## Pedido 2: persistir el cierre de caja

No existe hoy ningún dominio de "cierre de caja". Se pide uno mínimo:

**`POST /api/v1/cash-closings`**

Request:
```json
{
  "from": "2026-07-27T08:00:00Z",
  "to": "2026-07-27T18:00:00Z",
  "expected_cash": "30000.00",
  "counted_cash": "29800.00",
  "notes": "opcional"
}
```

- `expected_cash` idealmente la recalcula el backend a partir del rango (no confía en lo que mande el cliente) y lo persiste junto con lo que el cliente mandó, para detectar inconsistencias; a discreción del backend.
- El backend calcula y persiste `difference = counted_cash - expected_cash`.
- El registro queda asociado al `cashier_id` autenticado y a un timestamp de creación (`closed_at`).
- Rol: Cashier (crea el suyo). Sin restricción de unicidad pedida (un cajero podría cerrar más de una vez el mismo día); si el negocio quiere limitarlo, es decisión de backend.

Response propuesta: `201` con el registro creado, incluyendo `id`.

**`GET /api/v1/cash-closings`** (Admin, paginado, para un futuro reporte — no se pide UI para esto en este change, sólo que el dato quede persistido y sea consultable a futuro) y **`GET /api/v1/cash-closings/{id}`**.

## Fuera de alcance de este pedido

- No pedimos bloquear ventas mientras no se haya cerrado caja, ni un concepto de "turno" o "sesión de caja" que el POS consulte — el cierre es sólo un registro, no afecta el flujo de venta.
- No pedimos desglose por denominación de billetes (arqueo físico detallado) — sólo un monto total contado.
- No pedimos la UI de reporte de cierres pasados — sólo que el endpoint de lectura exista para que un change futuro la construya.

## Checklist de verificación sugerida

- [x] `GET /sales/summary?from=...&to=...` responde `200` a un Cashier con sus propios totales, ignorando cualquier `cashier_id` enviado
- [x] Un Cashier sin ventas confirmadas en el rango recibe ceros, no error
- [x] `POST /cash-closings` persiste el registro con `difference` calculado por el backend y devuelve `201` + `id`
- [x] `GET /cash-closings`/`GET /cash-closings/{id}` responden sólo a Admin (`403` para otros roles salvo, si se decide, que el propio cajero vea los suyos)
