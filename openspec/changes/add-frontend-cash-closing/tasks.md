# Tasks: add-frontend-cash-closing

## 0. Prerrequisito

- [x] 0.1 Confirmado que no existía agregación por método de pago en ningún endpoint de backend — ver investigación en `design.md`
- [x] 0.2 Backend desplegado: `group_by=payment_method` en `GET /reports/sales/summary`, exactamente como se pidió en `backend-request.md` (`internal/reporting/application/sales_summary.go`, `by_payment_method: [{method, sale_count, total_amount}]`)

## 1. Tipos

- [x] 1.1 Tipos en `lib/salesSummary.ts`: `PaymentMethodBreakdown`, `SalesSummaryByPaymentMethod`, ajustados al contrato real desplegado (no al propuesto — coinciden)

## 2. Cards de resumen del día

- [x] 2.1 Sección `DailySummaryCards` en `/sales`, mismo lenguaje visual que `/reports` (`Card`, tokens de `CLAUDE.md` §4)
- [x] 2.2 Cuatro valores: ventas hoy, total facturado, efectivo, tarjeta
- [x] 2.3 Estados de carga y error explícitos e independientes del listado (`useLoad` propio, no comparte fetch con la tabla)
- [x] 2.4 Verificado: una sola request a `/reports/sales/summary?group_by=payment_method`, nunca se suman ventas individuales en el cliente

## 3. Herramienta de cierre de caja

- [x] 3.1 Sección `CashClosingTool`, toggle "Cierre de caja" / "Cerrar" en el header, rango con default "hoy"
- [x] 3.2 Mismo desglose que las cards para el rango elegido, con tabla por método
- [x] 3.3 Verificado: cambiar el rango sólo dispara un `GET`; ninguna acción de "cerrar caja" existe — no hay forma de bloquear una venta desde acá

## 4. Verificación

- [x] 4.1 Sólo Admin llega a `/sales` (guard existente en `app/(app)/sales/page.tsx`, sin cambios); cards y cierre de caja viven dentro de esa misma pantalla
- [x] 4.2 Probado en navegador contra datos reales: cards y cierre de caja muestran cifras consistentes entre sí (efectivo + tarjeta = total facturado)
- [x] 4.3 El total de cards viene de `/reports/sales/summary`, que sólo cuenta confirmadas (mismo endpoint que ya usa `ReportsView`) — nunca incluye drafts

## 5. Bug encontrado y corregido durante la implementación (fuera del alcance original)

El backend agregó paginación real a `/users`, `/categories` y ya la tenía en `/sales`/`/inventory/stock` con el parámetro `page` (no `offset`). Esto rompió, en producción, cuatro pantallas que no estaban en el alcance de este change pero bloqueaban probarlo:

- [x] 5.1 `SalesView.tsx` y `UsersView.tsx` pedían `/users` esperando un array plano; el backend ahora devuelve `{ users, total }`. Corregido con `limit=100` (cubre el tamaño de kiosco) hasta que exista paginación real en esas pantallas (`add-frontend-users`, sección 7)
- [x] 5.2 `CategoriesView.tsx`, `ProductsView.tsx`, `ProductForm.tsx` e `InventoryView.tsx` pedían `/categories` esperando un array plano; el backend ahora devuelve `{ categories, total }`. Mismo fix con `limit=100`
- [x] 5.3 **Bug reportado en vivo por el usuario**: el botón "Siguiente" de `/sales` no avanzaba — `SalesView.tsx` mandaba `offset` a `GET /sales`, pero ese endpoint (como `/inventory/stock`) usa `page`/`limit` (paquete `pagination` del backend) y `offset` se ignora en silencio, devolviendo siempre la página 1. Migrado a `page`, con `computeTotalPages` extraído a `lib/pagination.ts` (compartido con `lib/inventory.ts`). Verificado en navegador: página 2 muestra ventas distintas a la página 1

## Verificación técnica

- `npx tsc --noEmit` — sin errores
- `npx eslint .` — sin errores nuevos (1 warning preexistente en `PosView.tsx`)
- `npx vitest run` — 26 tests, todos pasan (`lib/salesSummary.test.ts` nuevo)
- `npm run build` — build de producción exitoso
- Probado en navegador contra backend real (`admin`/`admin`, seed de desarrollo): cards, cierre de caja con rango editable, y paginación de `/sales` funcionando; sin errores de consola en `/sales`, `/categories`, `/products`, `/inventory`, `/users`
