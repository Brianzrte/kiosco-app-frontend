## 0. Prerrequisito bloqueante — backend desplegado

- [x] 0.1 Verificar en instancia real los endpoints de fondo, sus roles
      `admin|cashier`, el scope de sesión y los shapes de `backend-request.md`.
- [x] 0.2 Verificar POST/PUT de cierre sin `from`, respuesta con intervalo,
      importes y `state`, más `422` sin turno y `409` sellado.
- [x] 0.3 Verificar reporte diario con fecha operativa y `opening_fund`
      nullable, incluido un turno transnoche. Bloquea la integración funcional.

## 1. Tipos y helpers

- [x] 1.1 Agregar `CashierOpeningFund` con `operator_id`, `declared_by`,
      `confirmed_at` y estado; extender `CashClosing` con estado provisional/
      sealed y el item diario con `opening_fund` nullable.
- [x] 1.2 Agregar sólo helpers puros necesarios para labels de estado de
      fondo/cierre, con tests Vitest; reusar `isCountedCash` para montos.

## 2. Admin — declaración de fondo

- [x] 2.1 En `CashClosingStatusReportView`, cargar usuarios Admin y filtrar
      activos con rol `admin` o `cashier`; ofrecer selector “Operador”, fecha
      y monto, incluido el propio Admin.
- [x] 2.2 Enviar el POST vía `api<CashierOpeningFund>()`; pending evita doble
      submit, éxito muestra toast y recarga el reporte, error backend queda
      inline sin perder valores.
- [x] 2.3 No precargar ni inferir fondos existentes. Un `409` de confirmado
      queda inline y no se trata como guardado.

## 3. Shell — fondo y turno

- [x] 3.1 Extraer un banner no modal para Admin y Cashier que consulte sólo
      `/cashier-opening-funds/current`; mostrarlo únicamente con `declared`.
- [x] 3.2 Confirmar con POST por id, manejar pending/error inline, actualizar
      el estado local y no bloquear ventas ni capturar foco.
- [x] 3.3 Extender la entrada de estado/cierre a cualquier operador (`admin`
      o `cashier`) sin afectar `inventory`/`receiving`.

## 4. Cierre flexible

- [x] 4.1 Reemplazar el rango local y `/sales/summary` en
      `CashierShiftClosingModal` por estado del cierre propio y un body
      `{ to, counted_cash, notes? }` sin `from`.
- [x] 4.2 Confirmar el contado sin mostrar esperado/diferencia locales; tras
      POST/PUT renderizar los valores e intervalo derivados del backend.
- [x] 4.3 Permitir corregir sólo un `provisional`; un `sealed` queda lectura.
      `422` y `409` muestran el mensaje backend sin afectar POS.
- [x] 4.4 Mostrar el fondo inicial confirmado del turno como referencia en el
      cierre, separado del efectivo esperado que calcula el backend, sin
      sumarlo ni recalcularlo en el cliente.

## 5. Reporte diario

- [x] 5.1 Renderizar `opening_fund` separado del badge de conciliación, con
      texto accesible, en cards móviles y tabla desktop.
- [x] 5.2 Mantener las fechas como fechas operativas recibidas; no reagrupar
      ventas ni derivar importes en cliente.

## 6. Verificación

- [x] 6.1 Ejecutar tests focalizados, `npm run lint`, `npm test` y
      `npm run build`.
- [x] 6.2 Revisar teclado, foco, errores, estados, 320/360/768 px y el flujo
      real admin/cashier, incluido turno transnoche, contra backend desplegado.
- [x] 6.3 Aplicar revisión UX/UI pre-merge. No archivar ni sincronizar este
      change sin una ejecución explícita del rol de cierre.

## Evidence

- 1.1–5.2: implementación revisada y `npm test`, `npm run lint` y
  `npm run build` exitosos el 2026-08-04.
- Backend observado en `localhost:8080`: GET fondo actual devuelve 200 para
  Admin y Cashier; reporte diario devuelve 200 para Admin, 403 para Cashier e
  incluye `opening_fund`; POST de cierre sin `from` llega al caso de uso y
  devuelve 422 por no haber turno activo. Quedan pendientes los flujos que
  requieren crear y confirmar un fondo de prueba.
- 0.1–0.3 y 6.2–6.3: verificación manual completa confirmada explícitamente
  por el usuario el 2026-08-04, incluidos fondo, confirmación, corrección,
  sellado, turno transnoche, teclado, foco y viewports requeridos.
