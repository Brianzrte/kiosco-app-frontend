## 0. Prerrequisitos y coordinación backend (bloqueante)

- [ ] 0.1 Confirmar contra una instancia backend real que existe una operación
      atómica (endpoint nuevo o `POST /sales` ampliado) que recibe ítems +
      pago y crea/registra/confirma la venta en una única transacción; backend
      real. Bloquea toda tarea de las secciones 1 y 2.
- [ ] 0.2 Confirmar contra una instancia backend real que ningún registro
      parcial (venta, ítem o pago) persiste cuando esa operación falla en
      cualquier paso interno (forzar un fallo de negocio, p. ej. stock
      insuficiente, y verificar que no queda ningún `draft` huérfano); backend
      real. Bloquea toda tarea de la sección 1.
- [ ] 0.3 Confirmar la forma exacta de la respuesta de éxito contra backend
      real y compararla con el `Sale` actual (`src/lib/types.ts`); si difiere,
      documentar el diff exacto antes de tocar tipos. Bloquea 1.1.
- [ ] 0.4 Confirmar contra backend real que el error de stock insuficiente
      dentro de la operación atómica permite identificar la línea/producto
      afectado (mismo criterio que `ui-pos`, "Blocked reason names the
      affected line"); backend real. Bloquea 1.4.
- [ ] 0.5 Confirmar con backend si los 4 endpoints actuales
      (`POST /sales`, `POST /sales/{id}/items`, `PUT /sales/{id}/payment`,
      `POST /sales/{id}/confirm`) quedan deprecados o conviven con la
      operación nueva; documentar la respuesta en `design.md` antes de
      implementar 1.2. Bloquea 1.2.

## 1. Implementación (bloqueada por sección 0)

- [ ] 1.1 Actualizar `src/lib/types.ts` (`Sale` u otro tipo, según 0.3) si la
      respuesta de la operación atómica difiere del `Sale` actual; inspección
      de tipos y `npm run build`.
- [ ] 1.2 Reescribir `src/lib/posSaleSubmission.ts`: reemplazar la
      orquestación de 4 llamadas (`createSale`/`addSaleItem`/
      `setSalePayment`/`confirmSale`) por una única función que arma el
      payload (ítems + pago) y hace una sola llamada a la operación atómica;
      quitar la guarda `existingSaleId`/`onSaleCreated` de retención de
      `sale.id` entre reintentos, que deja de aplicar (Decisión 2 de
      `design.md`). Verificado por `src/lib/posSaleSubmission.test.ts`
      reescrito (entorno `node`): payload correcto para carrito mixto
      unitario/pesable con precio real editado; un reintento tras fallo hace
      una llamada nueva idéntica, sin ningún estado retenido del intento
      anterior.
- [ ] 1.3 Actualizar `confirmSale()` en `src/components/pos/PosView.tsx` para
      usar la función simplificada de 1.2; conservar sin cambios el manejo de
      `pending`/`pendingImmediate`, el tratamiento de error
      (`role="alert"`, "Volver"/"Reintentar" por `error.kind`), el panel
      "Venta confirmada" y el rastro persistente de última venta
      (`improve-pos-checkout-flow`, Decisión 20). Verificado por inspección
      de código: ningún otro comportamiento de `confirmSale()` cambia más
      allá de la llamada de red subyacente.
- [ ] 1.4 Si 0.4 confirma que el error de stock insuficiente incluye
      identificación de línea, propagar esa información al mensaje mostrado
      en `CheckoutStatus` (mismo patrón que el bloqueo de peso/stock ya
      existente, sin inventar una forma nueva de mensaje); si 0.4 no puede
      confirmarse con esa granularidad, dejar esta tarea explícitamente
      pendiente y documentar la limitación en vez de aproximar el
      comportamiento.

## 2. Verificación y entrega (bloqueada por sección 0)

- [ ] 2.1 Ejecutar `npm run lint` y `npm test`; corregir fallos vinculados a
      este change.
- [ ] 2.2 Ejecutar `npm run build` por los cambios de tipos.
- [ ] 2.3 Prueba manual contra backend real: confirmar una venta con
      productos unitarios y pesables, con pago simple y con pago dividido; un
      reintento tras un fallo forzado no deja ningún draft huérfano
      verificable vía `GET /sales?status=draft`.
- [ ] 2.4 Prueba manual de foco y teclado: `F9` sigue confirmando, el foco
      tras éxito o error sigue el mismo comportamiento ya normativo, sin
      regresión respecto de `improve-pos-checkout-flow`.
- [ ] 2.5 Con decisión explícita del usuario, sincronizar el delta de spec
      sobre `ui-pos` y archivar el change después de implementación y
      verificación completas.
