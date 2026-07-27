# Tasks: add-frontend-inventory-v15

> Trabajo visual según la skill `frontend-design` (`CLAUDE.md` §1).
> **Despliegue acoplado**: este change + `add-inventory-v15` + `add-reporting-v15` (backend) van en el mismo release, junto con `add-frontend-reports-v15`.

## 0. Prerrequisitos

- [x] 0.1 `GET /inventory/stock` **no** devuelve una marca de stock bajo por fila (confirmado leyendo `stockListItemResponse` en `../backend/internal/inventory/transport/http/dto.go`). Se resolvió con el fallback que el propio `design.md` prevé: `low_stock_only=true` como consulta separada (ver `lib/inventory.ts#isRowLow`), nunca reimplementando la fórmula del backend en el cliente
- [x] 0.2 Confirmado: `GET /inventory/movements` está desplegado (`../backend/internal/inventory/transport/http/routes.go`) y `GET /reports/stock/history` ya no existe en el backend — el consumo viejo en `ReportsView.tsx` estaba roto en producción (404) antes de este change

## 1. Eliminar la regla de negocio del cliente

- [x] 1.1 Borrado el cálculo `quantity <= minimum_quantity` de `InventoryView.tsx`
- [x] 1.2 Reemplazado por membresía en el resultado de `low_stock_only=true` (`isRowLow` en `lib/inventory.ts`), que usa el operador `<` del backend porque nunca se evalúa en el cliente
- [x] 1.3 `minimum_quantity = 0` nunca marca stock bajo: la query `low_stock_only=true` del backend ya excluye esos productos (regla `minimum_quantity > 0 AND quantity < minimum_quantity`), y el cliente sólo lee esa membresía

## 2. Paginación

- [x] 2.1 Barridos todos los usos de `offset` contra `/inventory/stock` — cero coincidencias (`grep offset` en `components/inventory` y `lib/inventory.ts`); `buildStockQuery`/`buildMovementsQuery` sólo emiten `page`
- [ ] 2.2 Probar que la paginación avanza contra un backend real — no ejercitado en este entorno (sin credenciales de sesión disponibles); verificado por lectura de código y por `lib/inventory.test.ts`

## 3. Tres estados de stock

- [x] 3.1 Distinguidos con texto: "Sin inicializar" (badge neutral), cantidad simple (en cero, sin mínimo activo) y "Stock bajo" (badge warning + mínimo mostrado)
- [x] 3.2 Acción correcta por estado: "Inicializar" cuando `!initialized`, "Ajustar" en los otros dos

## 4. Mínimo por producto

- [x] 4.1 Pestaña "Mínimo" en el diálogo de stock, separada de "Ajustar"
- [x] 4.2 `PATCH /inventory/stock/{product_id}/minimum` con entero no negativo, sin campo de motivo
- [x] 4.3 Texto explícito: "0 desactiva la alerta"
- [x] 4.4 Negativos y no-enteros bloqueados client-side con mensaje a nivel de campo antes de enviar
- [x] 4.5 Mensaje del backend mostrado ante error; el valor previo no se pierde (no se limpia el input al fallar)

## 5. Vista de stock bajo

- [x] 5.1 Toggle "Todos" / "Stock bajo" que cambia la query a `low_stock_only=true` — filtro delegado al backend
- [x] 5.2 Filtro por categoría (`category_id`), ahora soportado por el backend
- [x] 5.3 Estado vacío de "Stock bajo" explica que puede deberse a mínimos sin configurar, con la ruta para configurarlos

## 6. Historial de movimientos

- [x] 6.1 Nueva sección en `/inventory` sobre `GET /inventory/movements`
- [x] 6.2 Acceso desde la fila del producto ("Historial") con `product_id` ya filtrado
- [x] 6.3 Transición `previa → nueva` mostrada junto al delta, no sólo el delta
- [x] 6.4 Nombre de usuario (`performed_by_username`) mostrado por movimiento
- [x] 6.5 Filtros de producto, tipo (`SALE`/`ADJUSTMENT_IN`/`ADJUSTMENT_OUT`/`RETURN`, lista cerrada) y rango de fechas
- [x] 6.6 Paginación por `page`
- [x] 6.7 Retirado el consumo de `/reports/stock/history` de `ReportsView.tsx` — corrige una llamada que ya devolvía 404 en producción

## 7. Verificación

- [x] 7.1 `grep` confirma que ningún archivo del frontend compara cantidad contra mínimo
- [ ] 7.2 Probar con umbrales sin configurar contra un backend real — no ejercitado (sin credenciales de sesión); el estado vacío ya distingue el caso por texto
- [ ] 7.3 Probar el historial con los cuatro tipos de movimiento contra datos reales — no ejercitado en este entorno
- [x] 7.4 Orden de despliegue: verificado directamente en `../backend` que `add-inventory-v15` y `add-reporting-v15` ya están desplegados (rutas, `group_by`, `by-cashier`, `by-product` presentes; `/reports/stock/history` ausente) — este frontend cierra el ciclo

## Verificación técnica realizada en este entorno

- `npx tsc --noEmit` — sin errores
- `npx eslint .` — sin errores nuevos (1 warning preexistente en `PosView.tsx`, no tocado por este change)
- `npm run build` — build de producción exitoso, `/inventory` compila como ruta dinámica
- `npx vitest run` — 22 tests, todos pasan (`lib/inventory.test.ts` nuevo cubre `buildStockQuery`, `buildMovementsQuery`, `computeTotalPages`, `isRowLow`)
