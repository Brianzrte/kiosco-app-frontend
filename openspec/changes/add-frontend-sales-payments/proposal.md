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

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `ui-pos`: `Single payment method per sale` se reemplaza por `Payment composition`, que admite uno o más pagos y exige que sumen el total. `Atomic sale confirmation` incorpora el nuevo modo de fallo.
- `ui-sales`: la presentación del método pasa a desglose.
- `ui-reports`: ídem, donde se muestre método de pago.

## Impact

- Modificados: `src/components/pos/PosView.tsx` (cambio sustancial), `src/components/sales/SalesView.tsx`, `src/components/reports/ReportsView.tsx`, `src/lib/types.ts`, `src/lib/money.ts`.
- **Depende de `add-sales-split-payment` (backend) y exige despliegue simultáneo.** No hay compatibilidad hacia atrás posible: el body cambia de forma y el campo de respuesta desaparece.
- El backend ofrece una capa de compatibilidad temporal opcional (aceptar el body viejo traduciéndolo a un pago único). **Ver la recomendación en `design.md`.**

## Riesgo de redondeo señalado por el backend

`add-sales-split-payment/design.md` dice: *"La igualdad exacta puede rechazar confirmaciones por diferencias de redondeo — sólo si algún cliente calcula montos con floats. El riesgo está en el frontend, no en el backend."*

Es un señalamiento correcto y directo hacia nosotros. El frontend ya usa aritmética decimal para el total del carrito (`ui-pos`, requirement `Cart editing`), pero **el reparto de un total entre dos montos es aritmética nueva** y es exactamente donde aparece el centavo perdido. Se aborda explícitamente en el diseño.
