# Tasks: add-frontend-sales-payments

> Trabajo visual según la skill `frontend-design` (`CLAUDE.md` §1).
> **DESPLIEGUE SIMULTÁNEO OBLIGATORIO** con `add-sales-split-payment` de backend. No hay orden seguro: un frontend viejo contra un backend nuevo no puede confirmar ninguna venta.

## 0. Prerrequisitos

- [x] 0.1 Coordinar ventana de despliegue simultáneo con el backend — confirmada por el usuario (29 jul 2026)
- [x] 0.2 Confirmar la decisión de **no** implementar la capa de compatibilidad temporal del body viejo — decisión explícita en `design.md`; inspección de `PosView` confirma que sólo se envía `payments` (29 jul 2026)
- [x] 0.3 Confirmar contra el ambiente real que sirve a este frontend que `add-reports-detail-inventory-valuation` (backend) está desplegado — código de dominio `PaymentTransfer` + migración `021_add_transfer_payment_method` sobre `sale_payments.method` — antes de habilitar Transferencia en producción (backend real; ver sección 9) — confirmada por el usuario (29 jul 2026)

## 1. Aritmética

- [x] 1.1 Extender `lib/money.ts` con la resta decimal usada para derivar el resto — `subtractMoney()` opera sobre centavos
- [x] 1.2 Implementar la regla de reparto: el cajero escribe un monto, el resto sale por resta; nunca división ni reparto proporcional — `composeSplitPayment()` deja el segundo pago como resto exacto
- [x] 1.3 Tests con totales de reparto incómodo (0.01, 0.05, 33.33, 73.49): los pagos deben sumar exacto siempre — cubierto en `money.test.ts`
- [x] 1.4 Verificar que no exista `parseFloat` en ningún camino de monto — `rg -n 'parseFloat' src` sin resultados

## 2. Camino rápido (no debe cambiar)

- [x] 2.1 Elegir efectivo, tarjeta o transferencia sigue siendo un solo toque que imputa el total completo — Chrome DevTools: cada radio habilita “Pago cerrado” sin pedir importe (29 jul 2026)
- [x] 2.2 Verificar que el cajero no vea montos, sumas ni controles nuevos en la venta de método único — validada por el usuario; “Calcular vuelto” queda aceptado como acción opcional fuera del camino obligatorio (29 jul 2026)
- [x] 2.3 Medir que la cantidad de acciones para una venta de método único sea idéntica a la actual — comparación con `HEAD`: seleccionar método y confirmar, dos acciones en ambos casos (29 jul 2026)

## 3. División de pago

- [x] 3.1 Acción de dividir visible desde el área de pago, sin menú — botón `Dividir pago` en el panel de cobro
- [x] 3.2 Compositor con método y monto por línea; el último absorbe el resto — primer importe editable y segundo derivado con `composeSplitPayment()`
- [x] 3.3 `PUT /sales/{id}/payment` con la lista completa (reemplaza, no acumula) — `PosView` envía el `paymentPayload` completo

## 4. Balance en vivo

- [x] 4.1 Mostrar permanentemente la diferencia contra el total: falta / sobra / cierra — `getPaymentBalance()` cubre los tres estados; `PosView` los muestra en vivo
- [x] 4.2 Deshabilitar confirmar mientras no cierre — `PosView` requiere saldo exacto e importes positivos/válidos antes de habilitar la confirmación
- [x] 4.3 Recalcular y hacer visible la diferencia **al cambiar los ítems**, no al confirmar — Chrome DevTools: cambio de cantidad actualiza el balance en pantalla (29 jul 2026)
- [x] 4.4 Reimputación automática del pago único ante cambio de total — Chrome DevTools: Efectivo mantiene “Pago cerrado” al pasar de $1.800 a $3.600 (29 jul 2026)
- [x] 4.5 Con pago dividido, exigir resolución manual — Chrome DevTools: al cambiar el total, conserva los importes, muestra “Sobra $1.800,00” y deshabilita confirmar (29 jul 2026)

## 5. Vuelto

- [x] 5.1 Campo local de efectivo entregado, sólo para mostrar el vuelto — `Calcular vuelto` opcional en POS; Chrome DevTools verificó el cálculo local y foco en el campo (29 jul 2026)
- [x] 5.2 Verificar que no se envíe al backend ni altere el monto imputado — inspección: `confirmSale()` envía exclusivamente `paymentPayload`; Chrome DevTools: $2.000 entregados conserva “Pago cerrado” sobre $1.800 imputados (29 jul 2026)

## 6. Confirmación

- [x] 6.1 Ante `422` por pagos que no cierran, reabrir la composición conservando los montos escritos — Chrome DevTools: respuesta 422 simulada en confirmación final conserva el compositor y los importes $900/$900 (29 jul 2026)
- [x] 6.2 Mantener el comportamiento existente ante fallo de red: no asumir éxito — Chrome DevTools: falla de red simulada conserva carrito/compositor y muestra el estado desconocido (29 jul 2026)

## 7. Desglose en listados

- [x] 7.1 Un pago → método solo; dos o más → cada método con su monto — `SaleDetail` condiciona el importe a `sale.payments.length > 1`
- [x] 7.2 No usar etiqueta "Mixto" — inspección: no hay ocurrencias en las superficies de ventas (29 jul 2026)
- [x] 7.3 Barrer y eliminar toda lectura del campo `payment_method` deprecado — inspección: las ventas consumen `payments`; las ocurrencias restantes son agregaciones de reportes o compras, no el campo de venta deprecado (29 jul 2026)
- [x] 7.4 Actualizar la columna de medio de pago en `ReportsView.tsx` — la superficie vigente es `SalesReportView.tsx`; incluye la columna Transferencia derivada de `by_payment_method` (inspección + Chrome DevTools, 29 jul 2026)

## 8. Verificación

- [x] 8.1 Probar en producción, inmediatamente después del despliegue, una venta de método único y una dividida — validada por el usuario (29 jul 2026)
- [x] 8.2 Probar ventas históricas migradas: deben mostrar su pago único sin error — validada por el usuario (29 jul 2026)
- [x] 8.3 Verificar el flujo completo por teclado sin perder el foco del escaneo — validado manualmente por el usuario (29 jul 2026)

## 9. Transferencia como tercer método de pago

- [x] 9.1 `lib/paymentComposition.ts`: extender el tipo `SplitPaymentMethod` de `"CASH" | "CARD"` a `"CASH" | "CARD" | "TRANSFER"`; documentar en el propio archivo que `otherMethod()`/`composeSplitPayment()` siguen sin conocer `"TRANSFER"` a propósito, porque el split queda limitado a `CASH`/`CARD` (inspección de código)
- [x] 9.2 `lib/salesSummary.ts`: extender `PAYMENT_METHODS` de `["CASH", "CARD"]` a `["CASH", "CARD", "TRANSFER"]`
- [x] 9.3 Actualizar `salesSummary.test.ts`: el caso "ignores unknown methods instead of throwing" pasa a probar que una fila `TRANSFER` **sí** se cuenta (cambio de expectativa, no sólo una adición); agregar/ajustar el caso de "defaults every known method to zero" para incluir `TRANSFER` — prueba automatizada (`npm test`, environment `node`)
- [x] 9.4 `src/app/globals.css`: agregar el token `--color-payment-transfer: #b5dbee` (OKLCH 0.871 0.048 230) junto a `--color-payment-cash`/`--color-payment-card`, en la misma banda de luminosidad/croma; actualizar el comentario de "POS payment accents" para reflejar que el método anticipado ya está resuelto
- [x] 9.5 `PosView.tsx`: agregar `TRANSFER: "Transferencia"` a `PAYMENT_LABELS` y una entrada equivalente en `PAYMENT_SELECTED_STYLES` usando `--color-payment-transfer`; extender el selector de método de pago a la tercera opción, conservando el patrón de un solo toque (sin pedir monto)
- [x] 9.6 `PosView.tsx`: ocultar o deshabilitar la acción "Dividir pago" cuando el método elegido es Transferencia, de modo que `otherMethod("TRANSFER")` nunca se invoque — inspección de código + prueba manual, validada por el usuario (29 jul 2026)
- [x] 9.7 `PosView.tsx`: ajustar la grilla del selector de método de pago para tres opciones, verificando legibilidad en el ancho mínimo de POS ya soportado — prueba manual, responsive (Chrome DevTools, 1024×768; 29 jul 2026)
- [x] 9.8 `SaleDetail.tsx`: agregar `TRANSFER: "Transferencia"` al diccionario local de labels del desglose de pagos
- [x] 9.9 `SalesView.tsx`: agregar `TRANSFER: "Transferencia"` al diccionario `paymentMethodLabels`; agregar la tarjeta "Transferencia" en `SummaryCards` (`byMethod.TRANSFER.totalAmount`) y la fila "Transferencia" en la tabla de `CashClosingTool` (extender el array `["CASH", "CARD"]` a `["CASH", "CARD", "TRANSFER"]`)
- [x] 9.10 `paymentComposition.test.ts`: agregar un caso que cubra `TRANSFER` como método único de un pago (sin split) — prueba automatizada
- [x] 9.11 Inspección de código: `rg -n 'parseFloat' src` sigue sin resultados después de los cambios anteriores
- [x] 9.12 Prueba manual: el botón Transferencia se ve, se selecciona por teclado (tabulación dentro del `<fieldset>` de radios) y por mouse, en el selector de tres opciones — validada por el usuario (29 jul 2026)
- [x] 9.13 Prueba manual contra backend real desplegado: completar una venta de punta a punta pagada por Transferencia (`POST /sales` → `PUT /sales/{id}/payment` con `{ method: "TRANSFER", amount }` → `POST /sales/{id}/confirm`), y verificar que no se ofrece "Dividir pago" mientras Transferencia está seleccionado — validada por el usuario (29 jul 2026)
- [x] 9.14 Prueba manual: `SaleDetail.tsx` muestra "Transferencia" (no el string crudo `TRANSFER`) para una venta con ese método, incluida una venta de datos de siembra (`cmd/seed/sales_history.go`) si el ambiente de prueba los tiene cargados — Chrome DevTools: venta #1344 muestra “Transferencia” (29 jul 2026)
- [x] 9.15 Prueba manual: las tarjetas de resumen y la tabla de cierre de caja en `/sales` incluyen el monto de Transferencia, incluido el caso de cero ventas por transferencia en el rango — Chrome DevTools: tarjetas $1.135,00 y cierre 10 ventas / $1.135,00 (29 jul 2026)
- [x] 9.16 Prueba manual: `/reports/sales` deja de mostrar siempre `$0,00` en la columna Transferencia una vez que existan ventas reales por ese método (sin cambio de código en `SalesReportView.tsx`) — Chrome DevTools: resumen $403.770,00 y filas diarias no nulas (29 jul 2026)
- [x] 9.17 `npm run lint`
- [x] 9.18 `npm test`
- [x] 9.19 `npm run build` (cambio de tipos en `lib/paymentComposition.ts` y `lib/salesSummary.ts`)
