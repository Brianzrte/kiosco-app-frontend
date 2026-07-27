## Context

`add-frontend-cash-closing` (ya implementado) le da al Admin una vista de sólo lectura del desglose de ventas por método de pago, vía `GET /reports/sales/summary?group_by=payment_method`. Ese change dejó explícitamente fuera de alcance dos cosas que este change sí pide:

1. Registrar efectivo contado (`cash_tendered`) para arqueo físico — descartado en su momento porque "el backend explícitamente no lo pide todavía".
2. Cualquier acción de cierre que persista un registro — no existe concepto de turno/sesión de caja en el dominio.

Investigación de backend (leyendo código, no sólo specs):
- `internal/reporting/*` expone sólo `GET`, y todo `/reports/*` es admin-only por diseño (`CLAUDE.md` §5, confirmado también en `design.md` de `add-frontend-cash-closing`). Un cajero no puede llamarlo (`403`).
- `GET /api/v1/sales` (operativo, no reporting) sí es accesible a Cashier, pero está auto-scoped a `cashier_id` y es un **listado paginado de ventas individuales**, sin agregación por método de pago.
- No existe ningún dominio, tabla, migración ni ruta de "cierre de caja", "turno" o "sesión de caja" en el backend — confirmado en `add-frontend-cash-closing/design.md` y re-confirmado acá: nada cambió desde entonces.

## Goals / Non-Goals

**Goals:**
- Darle al cajero una forma de cerrar su turno: ver el efectivo esperado, ingresar el efectivo contado, ver la diferencia, confirmar.
- Persistir cada cierre confirmado como un registro consultable después (para un futuro reporte de cierres de caja, probablemente Admin-only, fuera de alcance de este change).

**Non-Goals:**
- Bloquear ventas mientras la caja está "abierta" o después de un cierre — no hay concepto de sesión de caja en el dominio, y el POS sigue funcionando siempre (mismo principio que `add-frontend-cash-closing`).
- Reportar los cierres ya guardados (listado, filtros, exportación) — este change sólo cubre crear el registro desde el modal del cajero. Un change posterior puede cubrir la vista de reporte, una vez el endpoint de lectura exista.
- Cierre por múltiples cajeros simultáneos en la misma sesión de caja — el dominio actual es por cajero individual (`cashier_id`), no por punto de venta físico compartido.

## Decisions

**El efectivo esperado no se calcula sumando `payments[]` en el cliente.**
Mismo criterio que `add-frontend-cash-closing/design.md`: sumar ventas confirmadas de `GET /sales` en el cliente exige paginar sin límite fijo o arriesgarse a un total mudo si el cajero superó el límite pedido. Es la clase de regla de negocio que sólo el backend puede calcular con certeza. Se pide un endpoint de agregación escoped al cajero autenticado (no admin-only, a diferencia de `/reports/*`).

**El cierre se persiste vía un endpoint de escritura nuevo, no reutilizando `/reports/*`.**
Reporting es explícitamente de sólo lectura (`CLAUDE.md`: "Reporting SHALL expose only GET endpoints"). Un cierre de caja es una mutación con su propio registro (cajero, rango, efectivo esperado, efectivo contado, diferencia, fecha/hora) — necesita un dominio propio, análogo a cómo `sales` o `inventory` tienen sus propios endpoints de escritura.

**El modal exige un paso de confirmación explícito antes de guardar.**
Igual que el patrón ya usado en `ProductDetail.tsx` para desactivar un producto (`Dialog` con botones Cancelar/Confirmar) — una vez guardado el cierre, no se puede deshacer desde la UI, así que la confirmación es obligatoria antes del `POST`.

**El modal vive en `Nav.tsx`, no en `PosView.tsx`.**
El cierre de caja es una acción de fin de turno, conceptualmente más cercana a "Cerrar sesión" (que ya vive en el header) que a la operación de venta en sí. Vivir en `Nav.tsx` también lo hace disponible sin importar en qué pantalla esté el cajero cuando decide cerrar.

## Risks / Trade-offs

- **El change queda sin fecha mientras no existan los dos endpoints pedidos** → Aceptado, mismo patrón que `add-frontend-cash-closing` mientras estuvo bloqueado.
- **Si el backend modela "cierre de caja" con más campos de los pedidos acá** (ej. denominaciones de billetes, múltiples cajeros por turno) → El pedido en `backend-request.md` es deliberadamente mínimo; se ajusta el frontend al contrato real una vez exista, como ya pasó con `group_by=payment_method` en el change anterior.
- **Un cajero podría cerrar caja más de una vez el mismo día** → No se pide ninguna restricción de unicidad; se deja como decisión de backend/negocio si hace falta limitarlo, no se anticipa en el pedido.

## Migration Plan

Bloqueado. No hay plan de despliegue hasta que:
1. El pedido en `backend-request.md` se implemente y despliegue en `../backend`.
2. Se retome este change para `tasks.md`.

## Open Questions

- ¿El endpoint de resumen escoped al cajero debería vivir bajo `/sales/summary` (mismo dominio que `GET /sales`, evitando el prefijo `/reports` que es admin-only) o como un tercer lugar? Se propone `/sales/summary` en `backend-request.md` por consistencia con el resto de endpoints operativos de `sales`.
- ¿El registro de cierre debería incluir método de pago desglosado (efectivo + tarjeta) o sólo efectivo, ya que la diferencia contable física sólo aplica a billetes? Se pide sólo efectivo en `backend-request.md`, alineado con la respuesta ya dada por el usuario (el modal captura únicamente efectivo contado).
