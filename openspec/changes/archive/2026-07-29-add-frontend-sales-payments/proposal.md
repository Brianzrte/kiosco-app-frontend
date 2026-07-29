# Proposal: add-frontend-sales-payments

## Why

Hoy el cliente que paga parte en efectivo y parte con tarjeta no se puede registrar. El cajero elige un método, la venta queda imputada por el total completo al método equivocado, y cualquier reporte por método de pago hereda el error sin señal de que algo falló.

`add-sales-split-payment` reemplaza el método único por una colección de pagos. El backend lo describe como **el cambio de contrato más disruptivo de toda la fase V1.5**, y es el único que toca la ruta crítica de venta: `payment_method` desaparece de las respuestas y el body de `PUT /sales/{id}/payment` cambia de forma.

## What Changes

- **Reemplazar la selección de método único por un compositor de pagos** en el POS: uno o más pagos, cada uno con método y monto.
- **Preservar el camino rápido.** La abrumadora mayoría de las ventas se paga con un solo método. Elegir "Efectivo" o "Tarjeta" sigue siendo un solo toque que imputa el total completo; dividir es una acción opcional que sólo aparece si se la busca.
- **Mostrar el faltante o el sobrante en vivo.** El backend exige igualdad exacta contra el total y rechaza la confirmación con `422` si no cierra. Esa aritmética debe resolverse en pantalla antes de confirmar, no en el error.
- **Mostrar el vuelto sin persistirlo.** El backend no guarda el efectivo entregado; es aritmética de mostrador que la UI puede mostrar.
- **Actualizar la presentación del método de pago** en el listado de ventas y en los reportes: donde había un valor único ahora hay un desglose.
- **Revalidar la confirmación**: si el cajero cambia ítems después de registrar pagos, los pagos dejan de cerrar y hay que resolverlo antes de confirmar.
- **Sumar transferencia como tercer método de pago del POS.** El backend ya implementó `TRANSFER` de forma completa (dominio, migración, tests de integración) en el change backend `add-reports-detail-inventory-valuation`; el POS es el único eslabón que faltaba. Elegir Transferencia sigue siendo un solo toque que imputa el total completo, igual que Efectivo y Tarjeta, y se distingue con un color celeste dedicado en el selector de pago. Transferencia **no** participa del compositor de pago dividido: el split sigue limitado a efectivo/tarjeta.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-pos`: `Single payment method per sale` se reemplaza por `Payment composition`, que admite uno o más pagos y exige que sumen el total, y ahora reconoce cash, card o transfer como métodos de un solo toque. `Atomic sale confirmation` incorpora el nuevo modo de fallo.
- `ui-sales`: la presentación del método pasa a desglose y reconoce transferencia.
- `ui-reports`: ídem, donde se muestre método de pago.
- `ui-cash-closing`: las tarjetas de resumen del día y la herramienta de cierre de caja en `/sales` incorporan Transferencia como tercer desglose, junto a Efectivo y Tarjeta.

## Impact

- Modificados: `src/components/pos/PosView.tsx` (cambio sustancial), `src/components/sales/SalesView.tsx`, `src/components/sales/SaleDetail.tsx`, `src/components/reports/ReportsView.tsx`, `src/lib/types.ts`, `src/lib/money.ts`, `src/lib/paymentComposition.ts`, `src/lib/salesSummary.ts`, `src/app/globals.css` (token `--color-payment-transfer`).
- **Depende de `add-sales-split-payment` (backend) y exige despliegue simultáneo.** No hay compatibilidad hacia atrás posible: el body cambia de forma y el campo de respuesta desaparece.
- El backend ofrece una capa de compatibilidad temporal opcional (aceptar el body viejo traduciéndolo a un pago único). **Ver la recomendación en `design.md`.**
- **`TRANSFER` como método de venta ya está implementado en el backend** (change `add-reports-detail-inventory-valuation`, dominio + migración `021_add_transfer_payment_method` + tests de integración en verde). No requiere `backend-request.md` nuevo — sólo confirmar que ese código está desplegado en el ambiente real que sirve a este frontend antes de habilitar la opción en producción (ver `design.md` y `tasks.md`, sección 9).
- `src/components/reports/SalesReportView.tsx` (capability `ui-reports-detail`) ya soporta `TRANSFER` sin cambios de código; deja de mostrar siempre `$0,00` en esa columna una vez que existan ventas reales por transferencia.

## Riesgo de redondeo señalado por el backend

`add-sales-split-payment/design.md` dice: *"La igualdad exacta puede rechazar confirmaciones por diferencias de redondeo — sólo si algún cliente calcula montos con floats. El riesgo está en el frontend, no en el backend."*

Es un señalamiento correcto y directo hacia nosotros. El frontend ya usa aritmética decimal para el total del carrito (`ui-pos`, requirement `Cart editing`), pero **el reparto de un total entre dos montos es aritmética nueva** y es exactamente donde aparece el centavo perdido. Se aborda explícitamente en el diseño.
