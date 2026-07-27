# Tasks: add-frontend-sales-payments

> Trabajo visual según la skill `frontend-design` (`CLAUDE.md` §1).
> **DESPLIEGUE SIMULTÁNEO OBLIGATORIO** con `add-sales-split-payment` de backend. No hay orden seguro: un frontend viejo contra un backend nuevo no puede confirmar ninguna venta.

## 0. Prerrequisitos

- [ ] 0.1 Coordinar ventana de despliegue simultáneo con el backend
- [ ] 0.2 Confirmar la decisión de **no** implementar la capa de compatibilidad temporal del body viejo

## 1. Aritmética

- [ ] 1.1 Extender `lib/money.ts` con la resta decimal usada para derivar el resto
- [ ] 1.2 Implementar la regla de reparto: el cajero escribe un monto, el resto sale por resta; nunca división ni reparto proporcional
- [ ] 1.3 Tests con totales de reparto incómodo (0.01, 0.05, 33.33, 73.49): los pagos deben sumar exacto siempre
- [ ] 1.4 Verificar que no exista `parseFloat` en ningún camino de monto

## 2. Camino rápido (no debe cambiar)

- [ ] 2.1 Elegir efectivo o tarjeta sigue siendo un solo toque que imputa el total completo
- [ ] 2.2 Verificar que el cajero no vea montos, sumas ni controles nuevos en la venta de método único
- [ ] 2.3 Medir que la cantidad de acciones para una venta de método único sea idéntica a la actual

## 3. División de pago

- [ ] 3.1 Acción de dividir visible desde el área de pago, sin menú
- [ ] 3.2 Compositor con método y monto por línea; el último absorbe el resto
- [ ] 3.3 `PUT /sales/{id}/payment` con la lista completa (reemplaza, no acumula)

## 4. Balance en vivo

- [ ] 4.1 Mostrar permanentemente la diferencia contra el total: falta / sobra / cierra
- [ ] 4.2 Deshabilitar confirmar mientras no cierre
- [ ] 4.3 Recalcular y hacer visible la diferencia **al cambiar los ítems**, no al confirmar
- [ ] 4.4 Reimputación automática del pago único ante cambio de total
- [ ] 4.5 Con pago dividido, exigir resolución manual

## 5. Vuelto

- [ ] 5.1 Campo local de efectivo entregado, sólo para mostrar el vuelto
- [ ] 5.2 Verificar que no se envíe al backend ni altere el monto imputado

## 6. Confirmación

- [ ] 6.1 Ante `422` por pagos que no cierran, reabrir la composición conservando los montos escritos
- [ ] 6.2 Mantener el comportamiento existente ante fallo de red: no asumir éxito

## 7. Desglose en listados

- [ ] 7.1 Un pago → método solo; dos o más → cada método con su monto
- [ ] 7.2 No usar etiqueta "Mixto"
- [ ] 7.3 Barrer y eliminar toda lectura del campo `payment_method` deprecado
- [ ] 7.4 Actualizar la columna de medio de pago en `ReportsView.tsx`

## 8. Verificación

- [ ] 8.1 Probar en producción, inmediatamente después del despliegue, una venta de método único y una dividida
- [ ] 8.2 Probar ventas históricas migradas: deben mostrar su pago único sin error
- [ ] 8.3 Verificar el flujo completo por teclado sin perder el foco del escaneo
