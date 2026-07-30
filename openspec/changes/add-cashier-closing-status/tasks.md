## 0. Prerrequisitos de backend (bloqueantes)

- [x] 0.1 Backend expone y despliega `GET /cash-closings/current-status?date=YYYY-MM-DD` para Cashier con los estados y shape de `backend-request.md` — evidencia: router y DTO `../backend/internal/sales/transport/http/`; `cajero1` recibió `200` desde `localhost:8082` el 2026-07-30.
- [x] 0.2 Backend expone y despliega `GET /cash-closings/daily-status?from=...&to=...` para Admin con filas por cajero/día — evidencia: router y DTO `../backend/internal/sales/transport/http/`; Admin recibió filas paginadas con campos anulables desde `localhost:8082` el 2026-07-30.
- [x] 0.3 Backend define y prueba la precedencia de cierres solapados, ventas posteriores y días sin actividad — evidencia: `go test ./internal/sales/application/...` pasó; `cash_closing_status_test.go` cubre días sin actividad, en curso, sin cerrar, cierre registrado, ventas posteriores y desempate de cierres; la instancia devolvió `CLOSED` e `IN_PROGRESS` en respuestas reales.

## 1. Tipos y lógica pura

- [x] 1.1 Agregar tipos centrales para estado de conciliación, cierre resumido y filas diarias, incluyendo nullabilidad del último cierre — evidencia: `CashClosingStatus` y `DailyCashClosingStatusItem` en `src/lib/types.ts`; `npm run build` pasó.
- [x] 1.2 Extraer a `src/lib/` los labels, tonos y reglas de presentación que no sean reglas de negocio; cubrirlos con `*.test.ts` — evidencia: helpers de presentación en `src/lib/cashClosing.ts`; `src/lib/cashClosing.test.ts` pasó.

## 2. Estado en el encabezado del cajero

- [x] 2.1 Consumir el estado propio mediante `api<T>()` y un fetcher estable, sin calcular cobertura ni consultar listas de ventas — evidencia: `CashierReconciliationIndicator` usa `api<CashClosingStatus>()` y `useCallback`; endpoint verificado contra backend real.
- [ ] 2.2 Reemplazar el trigger de cierre por un indicador textual accesible de estado y mantener una vía explícita hacia el flujo de registrar cierre — prueba manual.
- [ ] 2.3 Refrescar el indicador después de registrar un cierre y después de una venta confirmada sin mover el foco del escáner — prueba manual en POS.
- [ ] 2.4 Resolver carga, error recuperable, éxito y pending sin bloquear el POS ni reintentar automáticamente — inspección y prueba manual.
- [ ] 2.5 Verificar teclado, retorno de foco, móvil y que el estado no dependa sólo de color — prueba manual.

## 3. Reporte administrativo diario

- [ ] 3.1 Crear una ruta Admin-only para el reporte de conciliación y agregar su acceso dentro de Reportes sin mostrarlo a Cashier ni Inventory — inspección y prueba manual de roles.
- [ ] 3.2 Renderizar la tabla por cajero/día con estado, ventas, efectivo esperado, contado, diferencia y hora del último cierre — prueba manual.
- [ ] 3.3 Implementar filtros de rango, loading, vacío y error con recuperación, usando los primitives y tokens existentes — prueba manual.
- [ ] 3.4 Verificar tabla responsive, encabezados semánticos, cifras tabulares y copy en español — prueba manual.

## 4. Verificación

- [x] 4.1 Ejecutar tests focalizados de lógica pura, `npm run lint`, `npm test` y `npm run build` — evidencia: `cashClosing.test.ts` (5 tests), `npm test` (124 tests) y build pasaron; lint sin errores, con un warning preexistente en `PosView.tsx`.
- [ ] 4.2 Probar contra backend real los estados En curso, Cierre registrado, Pendiente de actualizar, Sin cerrar y Sin actividad, incluidos `401` y `403`.
- [ ] 4.3 Probar que registrar un cierre o confirmar una venta no bloquea ni degrada el flujo POS.
- [ ] 4.4 Sincronizar specs y archivar sólo con decisión explícita posterior del usuario.
