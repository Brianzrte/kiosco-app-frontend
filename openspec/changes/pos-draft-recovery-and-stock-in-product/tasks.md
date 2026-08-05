## 0. Prerrequisitos y coordinación backend (bloqueante)

- [ ] 0.1 Confirmar contra una instancia backend real que el endpoint de
      descarte de draft elimina o invalida la venta (deja de aparecer en
      `GET /sales?status=draft` y de poder confirmarse); backend real.
      Bloquea toda tarea de la sección 1.
- [ ] 0.2 Confirmar contra una instancia backend real que el descarte
      rechaza una venta ya confirmada o de otro cajero con un status y
      mensaje verificables (no un `500` genérico); backend real. Bloquea
      1.3.
- [ ] 0.3 Confirmar contra una instancia backend real la forma exacta del
      campo `stock` en `productResponse` (`GET /products`,
      `GET /products/{id}`, `GET /products/barcode/{barcode}`) y su
      comportamiento para un producto `pesable` (ausente/`null`); backend
      real. Bloquea toda tarea de la sección 2.
- [ ] 0.4 Definir en una revisión de diseño (no bloqueante para 0.1–0.3) la
      superficie exacta de "drafts pendientes al entrar al POS" (modal,
      banner, badge) una vez que 0.1 esté verificado; documentar la decisión
      antes de escribir las tareas de la sección 3. Si no se decide antes de
      implementar el resto del change, la sección 3 queda pendiente sin
      bloquear las secciones 1 y 2.

## 1. Descartar una venta en curso (bloqueada por 0.1–0.2)

- [ ] 1.1 Agregar la acción "Descartar venta" (botón secundario, visible
      cuando existe un `sale.id` para el carrito en curso) en
      `src/components/pos/PosView.tsx`, con un diálogo de confirmación sobre
      el `Dialog` existente (mismo patrón que `ClearCartDialog.tsx`).
      Verificado por inspección de código: el diálogo nombra la acción
      claramente y no se dispara sin confirmación.
- [ ] 1.2 Confirmar el descarte: llamar al endpoint verificado en 0.1, y en
      éxito vaciar `cart`/`payment`/`splitPayments`/`cashReceived`, limpiar
      `sessionStorage` (mismo criterio que "Vaciar carrito") y devolver el
      foco al campo de escaneo. Verificado por prueba manual contra backend
      real: descartar una venta con ítems y pago cargados la elimina, y
      recargar la pestaña no la restaura.
- [ ] 1.3 Manejar el rechazo del backend (0.2): mostrar el mensaje `{
      message }` tal como llega y conservar el carrito local intacto, sin
      asumir que el descarte tuvo éxito. Verificado por prueba manual: forzar
      un rechazo (por ejemplo, descartar una venta ya confirmada desde otra
      sesión) y confirmar que el carrito no se vacía.
- [ ] 1.4 Prueba manual de foco: cancelar el diálogo (botón, Esc, backdrop)
      devuelve el foco al botón que lo abrió; confirmar el descarte devuelve
      el foco al campo de escaneo — mismo criterio que `ClearCartDialog`.

## 2. Stock embebido en la respuesta de producto (bloqueada por 0.3)

- [ ] 2.1 Actualizar `src/lib/types.ts` (`Product.stock`, forma según 0.3);
      inspección de tipos y `npm run build`.
- [ ] 2.2 Ajustar `availableStock`/`addToCart` en `PosView.tsx` para usar
      `product.stock` cuando esté presente en la respuesta ya resuelta
      (barcode o búsqueda), poblando `stockByProduct` directamente sin
      disparar `GET /inventory/stock/{product_id}`; si el campo viene
      ausente, conservar el fallback a la llamada separada actual.
      Verificado por prueba manual contra backend real: escanear un
      producto `unitario` nuevo no dispara `GET /inventory/stock/...` cuando
      la respuesta trae `stock`; el tope se aplica igual que hoy.
- [ ] 2.3 Confirmar por inspección que ningún `pesable` consulta ni usa el
      campo `stock` — sigue sin chequeo de stock, sin cambios respecto del
      requirement vigente "Weighable products are not checked against
      stock".
- [ ] 2.4 Prueba manual: turno con productos ya cacheados en
      `stockByProduct` de una sesión anterior (si aplica) y productos nuevos
      con/sin `stock` embebido, confirmando que el tope de stock se comporta
      igual en todos los casos, sólo cambia si hubo o no una segunda
      llamada de red.

## 3. Drafts pendientes al entrar al POS (bloqueada por 0.1 y 0.4; sin bloquear 1 y 2)

- [ ] 3.1 Si 0.4 ya definió la superficie exacta, implementar la
      consulta a `GET /sales?status=draft` al montar `PosView.tsx` y la
      presentación decidida (modal/banner/badge) listando cada draft propio
      con acción de descartar (reusa 1.2) o retomar.
- [ ] 3.2 Implementar "retomar": recuperar el `sale.id` del draft elegido
      (y sus ítems/pago ya registrados, vía `GET /sales/{id}`) y continuar
      el flujo de confirmación normal sobre esa venta existente, sin crear
      una venta nueva. Verificado por prueba manual contra backend real: un
      draft con ítems ya cargados se retoma sin duplicar esos ítems.
- [ ] 3.3 Si 0.4 no se resolvió antes de llegar a esta sección, dejar la
      sección 3 explícitamente pendiente y sin implementar ningún
      comportamiento aproximado; no bloquea el cierre de las secciones 1 y
      2, que son independientes.

## 4. Verificación y entrega

- [ ] 4.1 Ejecutar `npm run lint` y `npm test`; corregir fallos vinculados a
      este change.
- [ ] 4.2 Ejecutar `npm run build` por los cambios de tipos.
- [ ] 4.3 Prueba manual integral contra backend real de las secciones 1 y 2
      (y 3 si se implementó), en desktop y mobile, sin regresión sobre
      `ui-pos` vigente.
- [ ] 4.4 Con decisión explícita del usuario, sincronizar el delta de spec
      sobre `ui-pos` y archivar el change después de implementación y
      verificación completas (de las secciones que efectivamente se hayan
      implementado).
