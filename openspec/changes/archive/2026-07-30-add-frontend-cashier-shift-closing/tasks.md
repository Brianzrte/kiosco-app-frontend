# Tasks: add-frontend-cashier-shift-closing

## 0. Prerrequisito (bloqueante)

- [x] 0.1 Backend expone `GET /sales/summary` (o equivalente) escoped al cajero autenticado, sin pasar por `/reports/*` — ver `backend-request.md`
- [x] 0.2 Backend expone `POST /cash-closings` para persistir el cierre, con `difference` calculado server-side — ver `backend-request.md`

## 1. Tipos y API (una vez desbloqueado)

- [x] 1.1 Tipos en `src/lib/types.ts`: `CashierShiftSummary` (`total_sales`, `total_amount`, `total_cash`, `total_card`), `CashClosing` (request/response de `POST /cash-closings`)
- [x] 1.2 Llamadas via `api<T>()` existente, sin wrapper nuevo (mismo patrón que el resto del código)

## 2. Modal de cierre de caja

- [x] 2.1 Trigger "Cerrar caja" en `src/components/shell/Nav.tsx`, visible sólo para `role === "cashier"`, junto a "Cerrar sesión"
- [x] 2.2 `Dialog` que al abrir dispara `GET /sales/summary?from=<hoy>&to=<hoy>` (via `useLoad`), muestra estado de carga/error explícito
- [x] 2.3 Input controlado para efectivo contado (mismo manejo de decimales que `src/lib/money.ts`, nunca floats)
- [x] 2.4 Diferencia calculada y mostrada en cuanto el resumen cargó y el cajero ingresó un monto
- [x] 2.5 Paso de confirmación explícito antes de guardar (mismo patrón que `ProductDetail.tsx` deactivate: botón Cancelar/Confirmar dentro del mismo `Dialog` o un segundo paso)
- [x] 2.6 `POST /cash-closings` al confirmar; botón deshabilitado mientras pendiente (`Button pending`); toast de éxito/error con el mensaje real del backend
- [x] 2.7 Verificado: cerrar caja no afecta el POS — el usuario confirmó una venta posterior al cierre el 2026-07-30.

## 3. Verificación

- [x] 3.1 Sólo Cashier ve el trigger; Admin e Inventory Manager no
- [x] 3.2 Copy en español, acorde a `CLAUDE.md` §7 (loading/empty/error explícitos, mensajes de backend surfaced tal cual)
- [x] 3.3 Probado en navegador contra backend real una vez los endpoints existan — confirmado por usuario el 2026-07-30.
