# Proposal: add-frontend-sales-returns

## Why

Un cliente devuelve un producto y hoy el sistema no puede registrarlo. La única salida es un ajuste manual de stock con un motivo escrito a mano: reingresa la mercadería pero pierde el vínculo con la venta, así que nadie puede responder después qué se devolvió de qué venta ni cuánto dinero se reintegró.

`add-sales-returns` agrega la devolución como entidad propia que referencia una venta confirmada, con devoluciones parciales por ítem, reintegro automático de stock y motivo obligatorio. Hoy restringido a `admin` en el backend.

**Ampliación de alcance decidida en esta sesión**: el Cajero también necesita poder dar de baja un producto de una venta, justificando el motivo — es el caso de "cobré mal, me di cuenta al toque". El backend documenta las devoluciones como *"el vector de fraude más obvio del sistema"* y las restringe a Admin por eso mismo, así que abrirlas a Cajero sin límites reabriría ese vector. La decisión de producto es acotar el permiso: **el Cajero sólo puede dar de baja productos de ventas que él mismo confirmó, y sólo el mismo día**. Cualquier otra venta (ajena, o propia de un día anterior) sigue siendo exclusiva de Admin. Ver `backend-request.md`.

## What Changes

- **Nueva pantalla de devolución** desde el detalle de una venta confirmada: elegir qué ítems y qué cantidad se devuelven, con motivo obligatorio.
- **Límite acumulado visible.** Se puede devolver hasta lo vendido menos lo ya devuelto en devoluciones anteriores de la misma venta. La cantidad disponible por ítem se muestra antes de elegir.
- **Historial de devoluciones** de una venta, desde su detalle.
- **Dejar explícito que el sistema no devuelve dinero.** Registra cuánto valía lo devuelto; no ejecuta ni concilia ninguna operación de pago.
- La venta original no cambia: ni ítems, ni total, ni estado. La devolución es un hecho nuevo que la referencia.
- **Acceso por rol y alcance, no sólo por rol.** Admin ve la acción en cualquier venta. Cajero la ve únicamente en sus propias ventas confirmadas el mismo día — nunca en ventas ajenas ni en ventas de días anteriores, aunque sean propias. El backend es quien aplica el alcance; el frontend no lo recalcula ni lo compensa mostrando/ocultando con datos que ya viajaron.
- **Historial del Cajero, acotado al día**: el Cajero ve su propio historial de ventas del día en `/sales` (no el historial completo), que es donde encuentra la venta sobre la que quiere dar de baja un producto.

## Capabilities

### New Capabilities

- `ui-returns`: registro de devolución parcial y consulta del historial de devoluciones de una venta. Admin sin restricción; Cajero acotado a sus propias ventas confirmadas el mismo día.

### Modified Capabilities

Ninguna a nivel de `openspec/specs/`: `ui-sales` (de `add-frontend-sales-v15`) todavía no está sincronizada a la carpeta de specs del repo. El historial del Cajero acotado al día se documenta en `ui-returns` como parte del camino de entrada a la devolución, y también actualiza la sección "5b. Historial del Cajero" de `add-frontend-sales-v15/tasks.md`.

## Impact

- Nuevos: `src/components/returns/ReturnForm.tsx`, `src/components/returns/ReturnHistory.tsx`.
- Modificados: `src/app/(app)/sales/[id]/page.tsx` y `src/components/sales/SaleDetail.tsx` (de `add-frontend-sales-v15`), `src/lib/types.ts`, `src/lib/nav.ts` (sección de ventas visible para Cajero), `openspec/changes/add-frontend-sales-v15/tasks.md` (sección 5b).
- **Depende de `add-sales-returns` (backend).** Aditivo: no rompe contratos existentes.
- **Depende de una ampliación de backend que hoy no existe**: `GET /api/v1/sales` y `POST/GET /api/v1/sales/{id}/returns` aceptando rol `cashier` con alcance forzado en servidor. Ver `backend-request.md` — bloqueante para la parte de Cajero de este change; la parte de Admin no depende de esto y puede implementarse ya.
- **Depende de `add-frontend-sales-v15` (frontend, sección "3b. Detalle de venta").** Sin esa página, no hay dónde colgar la acción de devolución.
- Se beneficia de `add-frontend-inventory-v15`: sin él, los movimientos de tipo `RETURN` que la devolución genera no son consultables desde ninguna pantalla.

## Dos advertencias que la UI tiene que cargar

El design del backend es explícito en ambas y las dos son responsabilidad del frontend comunicarlas:

1. **"`total_amount` sugiere un reintegro que el sistema no ejecuta. Debe quedar claro también en el frontend."** Mostrar un monto junto a una acción llamada "devolución" hace que cualquiera asuma que el dinero se devolvió. No se devolvió: alguien lo tiene que entregar en el mostrador.

2. **Una devolución registrada por error no se puede anular.** Se evaluó implementar la anulación: el backend **no ofrece el servicio** — `add-sales-returns` expone sólo alta, listado por venta y detalle. No hay endpoint, ni estado, ni tabla que la soporte, y el backend la mantiene como su pregunta abierta más importante. Queda desestimada; construirla en el frontend significaría inventar el modelo de la anulación. La UI tiene que decir que no hay vuelta atrás antes de confirmar, no después.
