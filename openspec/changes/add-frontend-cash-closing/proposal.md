## Why

El Admin abre `/sales` (el historial operativo) y no tiene forma de responder, sin hacer la cuenta a mano, "¿cuánto vendimos hoy y en qué medio de pago?". Es la pregunta que se hace al cerrar el turno, y hoy exige sumar filas de una tabla paginada de a 20. El pago dividido (`payments[]`) ya está en producción — cada venta puede tener uno o más pagos por método — pero ningún endpoint agrega esos montos por método para un rango de fechas.

## What Changes

- **Cards de resumen del día** en `/sales`: cantidad de ventas confirmadas, total facturado, total en efectivo, total en tarjeta — mismo lenguaje visual que las cards de `/reports`.
- **Herramienta de cierre de caja**: el mismo resumen sobre un rango elegido (por defecto el día), pensado para el momento de cerrar el turno, no sólo como dato ambiental de la lista.
- **Bloqueado por backend.** Ninguno de los dos puede construirse hoy: no existe agregación por método de pago en ningún endpoint, y "cierre de caja" no existe como concepto en el backend (ver `backend-request.md`). Este change documenta el requirement y el pedido; no se implementa hasta que el endpoint exista.

## Capabilities

### New Capabilities

- `ui-cash-closing`: resumen de ventas del día y cierre de caja por método de pago en la pantalla de ventas operativa, exclusivo de Admin.

### Modified Capabilities

Ninguna a nivel de `openspec/specs/`: `ui-sales` (de `add-frontend-sales-v15`) todavía no está sincronizada a la carpeta de specs del repo, así que no hay contra qué escribir un delta. Este change agrega `ui-cash-closing` como capability propia que vive dentro de la misma pantalla `/sales`; si `add-frontend-sales-v15` se archiva antes que este change se implemente, conviene revisar si conviene fusionar ambas specs en ese momento.

## Impact

- Nuevos (cuando se desbloquee): `src/components/sales/CashClosingSummary.tsx` o sección equivalente dentro de `src/components/sales/SalesView.tsx`.
- **Depende de un endpoint de backend que hoy no existe.** Ver `backend-request.md` en este mismo change para el pedido concreto: agregación de `total_sales`/`total_amount` por método de pago (`CASH`/`CARD`) sobre un rango `from`/`to`.
- **Depende de `add-frontend-sales-v15`** (la pantalla `/sales` donde viven las cards) y transitivamente de `add-sales-split-payment` (backend, ya desplegado — el modelo `payments[]` es lo que hace posible la agregación una vez que el backend la exponga).
- No depende de `add-frontend-sales-payments`: ese change frontend cubre el compositor de pagos en el POS; este change consume el resultado (`payments[]`) desde el lado de reporting/operativo, sin tocar el flujo de cobro.
