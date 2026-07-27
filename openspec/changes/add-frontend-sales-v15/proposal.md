# Proposal: add-frontend-sales-v15

## Why

Una venta confirmada hoy sólo se identifica por UUID. Un cliente que vuelve con un ticket no tiene número que dictar, y el cajero no tiene forma de reencontrar la venta que acaba de hacer. `add-sales-v15` agrega `sale_number`, un entero secuencial legible asignado al confirmar, y `GET /api/v1/sales`, el listado **operativo** de ventas — el único que puede devolver drafts, hoy completamente invisibles.

Un draft abandonado a mitad de turno no aparece en ningún lado: ni en el POS (que arranca en blanco), ni en los reportes (que sólo ven confirmadas). Ocupa base y nadie puede encontrarlo.

## What Changes

- **Mostrar `sale_number`** en la confirmación de venta, que es donde el cajero lo necesita para dictarlo o escribirlo en el ticket. Es la razón de ser del campo.
- **Tratar `sale_number` como opcional.** Las ventas confirmadas antes de la migración quedan sin número deliberadamente, y el backend no hace backfill. Una UI que asuma que siempre está presente rompe con datos históricos.
- **Nueva pantalla `/sales`** (Admin): listado operativo con filtros por estado, cajero, rango de fechas y número de venta. Es el único lugar donde se ven los drafts.
- **Nueva pantalla `/sales/[id]`**: detalle de una venta con sus ítems y pagos completos, alcanzable haciendo clic en una fila del listado. Ninguna pantalla actual (ni este change tal como estaba, ni `add-frontend-sales-returns`) la teseaba explícitamente, aunque `add-frontend-sales-returns` ya asume que existe como punto de entrada de la devolución — se agrega acá porque el detalle de venta es útil por sí mismo, con o sin devoluciones.
- Mantener la frontera con Reportes: `/sales` es operativo y muestra drafts; `/reports/sales` sigue siendo el histórico analítico de confirmadas.

## Capabilities

### New Capabilities

- `ui-sales`: listado operativo de ventas con filtros, incluidos drafts, exclusivo de Admin.

### Modified Capabilities

- `ui-pos`: `Atomic sale confirmation` incorpora la presentación del número de venta al confirmar.
- `ui-foundation`: la navegación suma la sección de ventas para Admin.

## Impact

- Nuevos: `src/app/(app)/sales/page.tsx`, `src/app/(app)/sales/[id]/page.tsx`, `src/components/sales/SalesView.tsx`, `src/components/sales/SaleDetail.tsx`.
- Modificados: `src/components/pos/PosView.tsx`, `src/lib/nav.ts`, `src/lib/types.ts`.
- **Depende de `add-sales-v15` (backend).** Aditivo: `sale_number` es un campo nuevo, `GET /sales` y `GET /sales/{id}` son rutas ya desplegadas (confirmado en `../backend/internal/sales/transport/http/routes.go`). No rompe nada existente.
- Se beneficia de `add-frontend-users`: sin él, el filtro por cajero muestra identificadores en vez de nombres.
- Es prerrequisito de `add-frontend-sales-returns`: esa acción de devolución cuelga de `/sales/[id]`, que este change deja de estar sin tasear.

## El historial del Cajero: decidido, y requiere ampliar el backend

`CLAUDE.md` §2 le promete al Cajero *"POS (new sale), sales history"*, y el backend hoy se lo niega en tres lugares: `GET /sales` es Admin (`04-sales.md` UC-08: *"Cashiers do not have access to the list endpoint"*), todo `/reports/*` es Admin, y `add-sales-v15/tasks.md:45` tiene un test explícito de que un `cashier` sobre `GET /api/v1/sales` recibe `403`.

**Decisión: el Cajero puede ver su historial, restringido a sus propias ventas.** Es exactamente la ampliación que el backend planteó como pregunta abierta ("*si en la práctica un cajero necesita reencontrar su última venta, el requirement debería ampliarse*").

**Esto no lo puede resolver el frontend.** El alcance tiene que aplicarlo el backend: permitir el rol `cashier` en `GET /api/v1/sales` forzando del lado del servidor que sólo devuelva las ventas de quien llama, ignorando cualquier `cashier_id` que venga en la query. Filtrar del lado del cliente sobre una respuesta que trae todas las ventas no es una restricción de acceso — es una restricción de dibujo, y el dato viaja igual.

Por eso este change implementa **sólo la parte de Admin**, que es lo que el backend ya especificó. El historial del Cajero queda especificado en `ui-sales` pero marcado como dependiente de esa ampliación, y no se implementa hasta que exista. Mientras tanto, `CLAUDE.md` §2 sigue prometiendo algo que el sistema no da.

Cambio de alcance necesario en backend, para que quede escrito:

- `GET /api/v1/sales` acepta rol `cashier`, con alcance forzado a `cashier_id = usuario de la sesión`.
- El filtro `cashier_id` se ignora (o se rechaza) cuando quien llama es `cashier`.
- Los drafts propios deberían ser visibles: es el caso de uso de "retomar lo que dejé a medias".
