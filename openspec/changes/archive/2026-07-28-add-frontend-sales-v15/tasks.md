# Tasks: add-frontend-sales-v15

## 0. Prerrequisito

- [x] 0.1 Verificado: `GET /api/v1/sales` y `GET /api/v1/sales/{id}` están desplegados; las confirmaciones nuevas devuelven `sale_number`

## 1. Tipos

- [x] 1.1 `sale_number` tipado `number | null | undefined` en `Sale`/`OperationalSale` (`lib/types.ts`) — corregido durante esta sesión: el backend usa `omitempty`, así que un draft **omite la clave** en vez de mandar `null`; el chequeo en UI es `== null`, no `=== null`
- [x] 1.2 Tipo del listado operativo (`OperationalSalesList`) con `status`, `created_at`, `confirmed_at`, `cashier_id`, `total`; agregado `Sale.items: SaleItem[]` para el detalle

## 2. Número de venta en el POS

- [x] 2.1 Número mostrado junto a "Venta confirmada", `text-3xl font-bold`, `select-text`
- [x] 2.2 Visible hasta que arranca la venta siguiente (`setConfirmedSale(null)` al iniciar el próximo carrito)
- [x] 2.3 Verificado: el foco vuelve al input de escaneo (`refocus()`) tras confirmar, nunca al número
- [x] 2.4 Se omite limpiamente cuando `saleNumber === null`
- [x] 2.5 Encadenado real probado en sesiones previas de este proyecto (no re-verificado en esta sesión, sin cambios en esa ruta)

## 3. Listado operativo

- [x] 3.1 Ruta `/sales` con guard de Admin
- [x] 3.2 Sección agregada a `lib/nav.ts` sólo para Admin
- [x] 3.3 Tabla con filtros de estado, cajero y rango de fechas, más paginación; default confirmadas
- [x] 3.4 Insignia con texto (`SaleStatusBadge`) para draft vs confirmada
- [x] 3.5 Verificado: las cards de resumen y el cierre de caja usan `/reports/sales/summary`, que sólo cuenta confirmadas — ningún agregado suma drafts
- [x] 3.6 Columna de fecha rotulada "CONFIRMADA" o "CREADA" según el estado activo
- [x] 3.7 **Bug encontrado y corregido en esta sesión**: el guion para número ausente no aparecía — mostraba `#undefined` porque el backend omite la clave (no manda `null`) y el código comparaba con `=== null`. Corregido a `== null` en `SalesView.tsx` y `SaleDetail.tsx`. Verificado en navegador con drafts reales

## 3b. Detalle de venta

- [x] 3b.1 Ruta `/sales/[id]` (`app/(app)/sales/[id]/page.tsx`), sobre `GET /api/v1/sales/{id}`, guard `["admin", "cashier"]` — sin admin-only, porque el backend ya scopea por dueño para cashier en este endpoint específico (a diferencia del listado, que sigue bloqueado por 5b)
- [x] 3b.2 Filas de `SalesTable` (mobile y desktop) accionables: clic y `Enter`/`Espacio` navegan a `/sales/{id}`, con foco visible (`focus-visible:bg-surface-2`)
- [x] 3b.3 Ítems (producto, cantidad, precio unitario, subtotal) y pagos (método, monto) completos, incluidos pagos divididos del mismo método
- [x] 3b.4 Estado, número (o "Venta sin número") y fecha según el estado (confirmada/creada)
- [x] 3b.5 Verificado por lectura de código: `SaleDetail.tsx` no tiene ningún control de mutación — sólo lectura
- [ ] 3b.6 Probado el camino Admin→ajena en este entorno; **no probado** el caso Cajero→venta ajena por falta de una segunda sesión de cajero en este entorno de pruebas. El guard de ruta permite `cashier`; el rechazo de una venta ajena depende enteramente del backend (`GetSale`), sin chequeo de propiedad en el cliente — pendiente de verificación con dos sesiones reales

## 4. Búsqueda por número

- [x] 4.1 Campo de búsqueda exacta, visualmente separado de los filtros de rango (formulario propio)
- [x] 4.2 `searchByNumber` limpia estado, cajero y rango antes de buscar
- [x] 4.3 Estado vacío con mensaje explícito cuando no hay coincidencia

## 5. Filtro por cajero

- [x] 5.1 Selector de cajero con `username` (ya funciona porque `add-frontend-users` está desplegado)
- [x] 5.2 N/A: el filtro ya se puede mostrar con nombres, no aplica omitirlo

## 5b. Historial del Cajero, acotado al día

> Implementado en la sesión de `add-frontend-sales-returns` (sección 7), junto con la devolución acotada de Cajero — ambas dependían del mismo pedido de ampliación de backend, consolidado en `add-frontend-sales-returns/backend-request.md`. Decisión de producto: el default de fecha para el Cajero es "hoy", no el historial completo — ver `ui-sales` spec, requirement "Cashier sees only their own sales, defaulting to today".

- [x] 5b.1 Ampliación de backend desplegada y verificada (`GET /sales` acepta `cashier`, alcance forzado a `cashier_id` = usuario de la sesión, confirmado con `curl` ignorando un `cashier_id` de otro usuario en la query). El código estaba en `../backend` sin commitear ni reconstruido en el contenedor corriendo; se reconstruyó en esta sesión. La reconstrucción destapó un bug real no relacionado (falta `tzdata` en la imagen base para el nuevo cálculo de día de negocio), corregido en `../backend/Dockerfile` — ver detalle en `add-frontend-sales-returns/tasks.md` sección 0.3
- [ ] 5b.2 **No probado.** No se verificó explícitamente que los drafts propios del Cajero queden visibles en `/sales` con `status=draft` — sólo se probó el filtro por defecto "Confirmadas"
- [x] 5b.3 Sección de ventas habilitada en `lib/nav.ts` para Cajero, con filtro de fecha por defecto en "hoy" — probado, `cajero1` ve "Historial" en la navegación y los campos Desde/Hasta llegan precargados con la fecha del día
- [x] 5b.4 Filtro por cajero omitido para ese rol — probado, ni el selector ni la columna "Cajero" aparecen en la tabla para `cajero1`
- [x] 5b.5 Verificado con `curl`: pasando `cashier_id` de otro usuario en la query como `cajero1`, el backend lo ignora y sólo devuelve las ventas del cajero autenticado
- [x] 5b.6 `CLAUDE.md` §2, §3 y §5 actualizados

## 6. Verificación

- [x] 6.1 Probado con datos históricos/drafts sin número: muestran "—" (lista) y "Venta sin número" (detalle), nunca `#0` ni `#null` ni `#undefined`
- [x] 6.2 Ningún texto insinúa numeración continua
- [ ] 6.3 Probado sólo como Admin en este entorno (sin credenciales de cashier/inventory distintas disponibles); guard de código revisado para los tres roles

## Verificación técnica

- `npx tsc --noEmit` — sin errores
- `npx eslint .` — sin errores nuevos (1 warning preexistente en `PosView.tsx`)
- `npx vitest run` — 26 tests, todos pasan
- `npm run build` — build de producción exitoso, `/sales/[id]` aparece como ruta dinámica
- Probado en navegador contra backend real: navegación por clic desde la lista, venta confirmada con ítems/pagos, venta borrador sin número con pagos divididos, botón "Volver al historial", sin errores de consola
