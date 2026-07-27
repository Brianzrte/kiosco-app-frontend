## Context

`/sales` (de `add-frontend-sales-v15`) es el historial operativo de ventas, exclusivo de Admin. El pago ya es una colección (`payments: [{method, amount}]` — `add-sales-split-payment`, backend ya desplegado): una venta puede tener uno o más pagos, incluso del mismo método. Ese modelo es lo que vuelve posible sumar "cuánto entró en efectivo" y "cuánto en tarjeta", pero **ningún endpoint hace esa suma hoy**.

Investigación de backend confirmada leyendo código, no documentación:
- `GET /api/v1/reports/sales/summary` (`internal/reporting/application/sales_summary.go:47-53`) valida `group_by` contra `total|day` únicamente y rechaza cualquier otro valor con `422`. No agrupa por método de pago.
- `GET /api/v1/reports/sales` acepta `payment_method` como **filtro** exacto (`internal/reporting/transport/http/handler.go:49`), no como agrupador: filtra filas, no suma nada.
- No existe `GET /api/v1/sales` (el endpoint operativo, no reporting) con ningún tipo de agregación — es un listado paginado de ventas individuales.
- "Cierre de caja"/arqueo no aparece en ningún dominio, migración, ruta ni spec del backend. La única mención es una nota descartada en `openspec/changes/archive/.../add-sales-split-payment/design.md`: *"si más adelante se quiere registrar el efectivo entregado para arqueo de caja... hoy no está pedido."*

## Goals / Non-Goals

**Goals:**
- Responder "cuánto vendimos hoy, y en qué medio" sin sumar filas a mano.
- Dar una herramienta de cierre de turno que use el mismo dato, sobre un rango elegido.
- No inventar la agregación en el cliente: sumar `payments[]` de una lista paginada de 20 en 20 da un total mudo (sólo de la página visible) o exige traer todas las ventas del día sin paginar, que es exactamente el tipo de "regla de negocio recalculada en el cliente" que `CLAUDE.md` §1 prohíbe y que ya causó el defecto que corrigió `add-frontend-inventory-v15`.

**Non-Goals:**
- Registrar efectivo entregado/`cash_tendered` para arqueo físico de billetes — el backend explícitamente no lo pide todavía.
- Cualquier acción de cierre que bloquee al cajero (ej. "no dejar vender hasta cerrar caja"): no hay concepto de turno ni sesión de caja en el dominio actual, sólo sesiones de autenticación.
- Reconciliación contable o exportación: fuera del MVP.

## Decisions

**No se calcula la agregación en el cliente bajo ninguna circunstancia.**
La alternativa obvia — pedir todas las ventas confirmadas del día vía `GET /sales?status=confirmed&from=...&to=...&limit=1000` y sumar `payments[]` en el navegador — se descarta explícitamente. Es la misma clase de error que `quantity <= minimum_quantity` en Inventory: una regla de agregación que sólo el backend puede calcular con certeza (y que además ignora paginación, así que sería silenciosamente incorrecta apenas hubiera más ventas que el límite pedido). Este change no se implementa hasta que el backend exponga el total ya agregado.

**Cards y cierre de caja son la misma consulta con distinto rango, no dos features.**
Las cards muestran el rango "hoy" fijo; el cierre de caja permite elegir el rango (por defecto también "hoy", pero editable para cubrir un turno que cruza medianoche o un cierre atrasado). Un solo componente de resumen, parametrizado por rango, evita mantener dos consultas que deberían coincidir.

**El pedido a backend se documenta como endpoint de reporting, no como endpoint nuevo de "cierre de caja".**
No existe un dominio de "caja" ni "turno" en el backend — inventar uno en el pedido sería pedir más de lo que este change necesita. Lo mínimo que resuelve ambas features es una agregación por método de pago sobre un rango de fechas, que encaja naturalmente como una extensión de `internal/reporting` (mismo patrón que `by-cashier` y `by-product`). Ver `backend-request.md`.

## Risks / Trade-offs

- **El change queda sin fecha mientras no exista el endpoint** → Aceptado. Es preferible a construir la agregación en el cliente y tener que revertirla después.
- **Si se agrega `cash_tendered` más adelante, el diseño de "cierre de caja" puede quedar corto** (sólo compara contra lo vendido, no contra lo contado físicamente) → Fuera de alcance por decisión explícita del backend; se revisita si cambia.
- **Un rango de cierre de caja mal elegido (ej. sin filtrar por cajero) mezcla turnos de varias personas** → El backend ya sabe filtrar por `cashier_id` en otros endpoints de reporting; si el pedido se resuelve, se pide el mismo filtro opcional acá.

## Migration Plan

Bloqueado. No hay plan de despliegue hasta que:
1. El pedido en `backend-request.md` se implemente y despliegue en `../backend`.
2. Se retome este change para tasks.md.

Sin backend, la especificación en `specs/ui-cash-closing/spec.md` queda documentada y sin implementar — mismo patrón que `add-frontend-users` sección "Perfil editable" y `add-frontend-sales-v15` sección "5b. Historial del Cajero".

## Open Questions

- ¿El endpoint debería filtrar por `cashier_id`, para que un cierre de caja sea por persona y no por todo el kiosco (que suele tener un único punto de cobro pero podría tener más de un cajero por turno)? Depende de cómo el backend modele "turno" — hoy no existe ese concepto.
- ¿Un método de pago sin ninguna venta en el rango se muestra en $0, o se omite? Decisión de presentación, no bloqueante — se resuelve al implementar.
- ¿Hace falta desglosar por más de dos métodos si el backend agrega uno nuevo (ej. transferencia como método distinto de tarjeta)? Hoy el dominio sólo tiene `CASH`/`CARD` (`internal/sales/domain/payment.go`); si cambia, este change se actualiza, no se anticipa.
