## Why

El cajero termina su turno sin ninguna forma de dejar constancia de cuánto efectivo contó en caja frente a lo que el sistema dice que debería haber. Hoy la única herramienta relacionada (`add-frontend-cash-closing`) es de sólo lectura, exclusiva de Admin, y su propio diseño descarta explícitamente registrar efectivo contado. Lo que se pide ahora es distinto: un cierre de caja que el propio cajero ejecuta al final de su turno — cuenta el efectivo físico, el sistema muestra la diferencia contra lo esperado, confirma, y **queda un registro persistente** para poder armar un reporte de cierres más adelante.

## What Changes

- **Modal "Cierre de caja"**, accesible para el rol Cashier desde `Nav.tsx` (junto a "Cerrar sesión") o desde `PosView`.
- El modal muestra el efectivo esperado (ventas confirmadas en efectivo del cajero en el rango del turno, calculado por el backend — nunca sumado en el cliente, mismo criterio ya establecido en `add-frontend-cash-closing/design.md`), permite ingresar el efectivo contado, calcula la diferencia, y exige una confirmación explícita antes de guardar.
- El cierre confirmado **se persiste** en el backend como un registro nuevo (no existe hoy ningún dominio de "cierre de caja"/turno) para que después se pueda listar/reportar.
- **Bloqueado por backend.** No existe ni el endpoint de agregación escoped al cajero (los de `/reports/*` son admin-only) ni ningún concepto de "cierre de caja" para persistir. Ver `backend-request.md`. Este change documenta el requirement y el pedido; no se implementa hasta que ambos existan.

## Capabilities

### New Capabilities

- `ui-cashier-shift-closing`: modal de cierre de caja para el rol Cashier, con confirmación y persistencia del registro.

### Modified Capabilities

Ninguna. No toca `ui-cash-closing` (esa capability sigue siendo la herramienta de sólo lectura de Admin) ni `ui-sales`.

## Impact

- Nuevos (cuando se desbloquee): `src/components/shell/CashierShiftClosingModal.tsx` (o similar), trigger en `src/components/shell/Nav.tsx` visible sólo para `role === "cashier"`.
- **Depende de dos capacidades de backend que hoy no existen.** Ver `backend-request.md`: (1) un resumen de ventas en efectivo escoped al cajero autenticado, sin pasar por `/reports/*` (admin-only); (2) un endpoint de escritura para persistir el cierre con el efectivo contado y la diferencia.
- No reutiliza `GET /reports/sales/summary?group_by=payment_method` de `add-frontend-cash-closing`: ese endpoint es admin-only y no está scoped a un cajero individual.
