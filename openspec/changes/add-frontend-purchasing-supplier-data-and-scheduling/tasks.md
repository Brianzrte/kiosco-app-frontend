# Tasks

> Ninguna tarea de este change se ejecuta antes de completar la sección 0.
> El change está bloqueado por backend: ver `backend-request.md`.

## 0. Prerrequisitos bloqueantes

- [ ] 0.1 Verificar contra una **instancia real** del backend que el bloque A está
      desplegado: `GET /api/v1/purchase-orders/{id}` devuelve `quantity` y
      `received_quantity` como string decimal. Evidencia: respuesta HTTP real
      pegada en el PR. *(backend real)*
- [ ] 0.2 Confirmar por escrito la **escala decimal** que el backend acepta para
      `quantity` y `received_quantity`, y registrarla en `design.md` → D5.
      Sin este dato no se implementa la validación de cantidad. *(backend real)*
- [ ] 0.3 Verificar que `GET /api/v1/suppliers/{id}` responde `200` con los campos
      de contacto y `404` para un id inexistente. *(backend real)*
- [ ] 0.4 Verificar que `GET /api/v1/purchase-orders` devuelve `expected_at` en el
      list item y respeta `expected_from` / `expected_to`, y confirmar el formato
      esperado de esos filtros y de `expected_at`. *(backend real)*
- [ ] 0.5 Confirmar la decisión de producto del bloque D (ampliar
      `receivingWrapped` vs. endpoint acotado) y verificar con un usuario con rol
      `cashier` real que `GET /api/v1/purchase-orders/{id}` devuelve `200` y que
      una recepción se confirma. Si se eligió la alternativa acotada, actualizar
      antes `design.md`, el delta spec y estas tareas. *(backend real)*
- [ ] 0.6 Verificar que `redesign-frontend-purchasing-section` está implementado y
      sus specs sincronizadas, incluida la fusión de `ui-receiving` en
      `ui-suppliers-purchasing`. Si los nombres de las requirements cambiaron,
      rebasear el delta de este change antes de seguir. *(inspección)*
- [ ] 0.7 Re-bajar el markup vigente del proyecto Claude Design
      `1669eca0-5224-4459-8b68-524eb6c00266` con DesignSync `get_file`
      (`PurchasingHub.dc.html`, `SupplierDetail.dc.html`,
      `NewPurchaseOrder.dc.html`) y resolver los cuatro valores no-token listados
      en `design.md` → D9 contra los tokens de `src/app/globals.css`. Evidencia:
      lista de token elegido por cada valor. *(inspección)*

## 1. Tipos

- [ ] 1.1 Extender `Supplier` en `src/lib/types.ts` con `phone`, `address`,
      `visit_frequency_days`, `visit_notes` y `notes` nullables, con la forma
      exacta verificada en 0.3. *(inspección + `npm run build`)*
- [ ] 1.2 Agregar `expected_at: string | null` a `PurchaseOrder` y a
      `PurchaseOrderListItem`. *(inspección + `npm run build`)*
- [ ] 1.3 Cambiar `quantity` y `received_quantity` de `PurchaseOrderItem` de
      `number` a `string`, y corregir todos los puntos de uso que el compilador
      señale. Evidencia: `npm run build` sin errores. *(inspección)*

## 2. Helpers puros (`src/lib/`) con tests en `node`

- [ ] 2.1 Extender `buildPurchaseOrdersQuery` en `src/lib/purchasing.ts` con
      `expected_from` / `expected_to` en el formato confirmado en 0.4.
      *(test automatizado en `purchasing.test.ts`)*
- [ ] 2.2 Agregar una función pura que, dada la lista de pedidos pendientes y un
      `now` inyectable, clasifique cada pedido en `hoy`, `esta semana`,
      `atrasado` o `sin fecha objetivo`, usando `todayISO()` y
      `BUSINESS_TIME_ZONE` de `src/lib/salesSummary.ts` y comparando días
      calendario. *(test automatizado: borde de medianoche, pedido sin fecha,
      pedido vencido, límite de los 7 días)*
- [ ] 2.3 Agregar un helper puro que devuelva la unidad de cantidad
      (`kg` / `un`) a partir del `unit_type` del producto, con caída a unidades
      para un ítem de texto libre. *(test automatizado)*
- [ ] 2.4 Agregar validación pura de cantidad decimal contra la escala confirmada
      en 0.2, siguiendo el patrón de `isValidWeight` en `src/lib/weightPricing.ts`.
      *(test automatizado: cero, negativo, decimales de más, string vacío)*
- [ ] 2.5 Reescribir la aritmética de `summarizePurchaseOrderDraft` para operar
      con enteros escalados sobre la cantidad decimal, sin `float`. Evidencia:
      test que compara subtotales con cantidades fraccionarias.
      *(test automatizado)*
- [ ] 2.6 Quitar `Number(input.quantity)` de `buildAddedItemPayload` en
      `src/lib/receiving.ts`: la cantidad se envía como string decimal.
      *(test automatizado en `receiving.test.ts` + inspección de que no queda
      ninguna conversión numérica de cantidad)*

## 3. Ficha de proveedor (bloque B)

- [ ] 3.1 Crear la ruta `/purchasing/suppliers/[id]` con `page.tsx` delgado y
      `requireRole(["admin", "inventory"])`. *(inspección + `npm run build`)*
- [ ] 3.2 Implementar la vista de la ficha con las tres cards del diseño
      (contacto, productos asociados, teaser de pedidos) componiendo el UI kit y
      sólo tokens del design system. *(prueba manual)*
- [ ] 3.3 Implementar los estados de la ficha: skeleton por card, vacío por card,
      error por card con reintento, error de la carga principal sin datos
      parciales, y `404` con vuelta a la lista. *(prueba manual)*
- [ ] 3.4 Aplicar el copy que distingue "Frecuencia de visita" (proveedor) de la
      columna "Reposición" (asociación producto–proveedor), y mostrar "Sin
      definir" en cada valor ausente. *(prueba manual + inspección)*
- [ ] 3.5 Enlazar la fila de la lista de proveedores a la ficha, activable con
      pointer y con Enter, con foco visible. *(prueba manual)*
- [ ] 3.6 Sumar los campos de contacto al alta y a la edición de proveedor,
      enviando sólo lo ingresado y relevendo el dato autoritativo tras el éxito.
      *(prueba manual + inspección del payload)*
- [ ] 3.7 Implementar `Desactivar` desde la ficha, con diálogo, foco inicial en
      cancelar y retorno de foco al trigger. *(prueba manual)*

## 4. Fecha objetivo y jerarquía del hub (bloque C)

- [ ] 4.1 Agregar el campo `Fecha objetivo` al formulario de nuevo pedido, junto a
      `Fecha de creación`, con ayuda inline y el tratamiento visual del diseño
      resuelto en tokens. *(prueba manual)*
- [ ] 4.2 Enviar `expected_at` en la creación cuando esté completo y omitirlo
      cuando esté vacío. *(inspección del payload + prueba manual)*
- [ ] 4.3 Mostrar el aviso inline no bloqueante cuando la fecha objetivo es
      anterior a la fecha de creación, y mostrar inline el mensaje del backend si
      la rechaza, conservando el borrador. *(prueba manual)*
- [ ] 4.4 Mostrar la fecha objetivo en el detalle y en el historial del pedido, y
      su ausencia como texto explícito. *(prueba manual)*
- [ ] 4.5 Implementar el bloque "Qué llega hoy" con filas grandes, botón `Recibir`
      que navega al detalle, contador de pedidos y atrasados como texto, y badge
      `Atrasado` con texto además del tono de borde. *(prueba manual)*
- [ ] 4.6 Implementar el bloque "Esta semana" como tabla densa sin CTA por fila,
      con la fila entera activable por pointer y por Enter. *(prueba manual)*
- [ ] 4.7 Implementar el enlace "Ver todos los pedidos pendientes (N)" con el
      `total` de la consulta de pendientes sin filtro de fecha objetivo, para que
      los pedidos sin `expected_at` sigan siendo alcanzables. *(prueba manual)*
- [ ] 4.8 Implementar los tres vacíos distintos del hub (sin pedidos para hoy, sin
      pedidos esta semana, sin pendientes en absoluto) y el error persistente con
      reintento y mensaje del backend. *(prueba manual)*

## 5. Cantidades con unidad (bloque A)

- [ ] 5.1 Aplicar el sufijo de unidad dentro del input de cantidad en el
      formulario de nuevo pedido, con la unidad también en el nombre accesible del
      campo y fuera del valor enviado. *(prueba manual + inspección)*
- [ ] 5.2 Aplicar lo mismo en la resolución de línea al recibir, sin alterar el
      orden de tabulación cantidad → motivo. *(prueba manual)*
- [ ] 5.3 Aplicar lo mismo en el alta de ítem no pedido, tratando el modo de texto
      libre como unitario. *(prueba manual)*
- [ ] 5.4 Verificar por inspección que ninguna cantidad se convierte a `float`, ni
      con `Number()`, ni con `parseFloat`, ni con aritmética directa sobre el
      string, en views ni en helpers. *(inspección)*
- [ ] 5.5 Marcar en `design.md` → D4 el resultado de la validación del sufijo de
      unidad con Claude Design, cuando ocurra. No bloquea el contrato de datos.
      *(inspección)*

## 6. Roles y navegación (bloque D)

- [ ] 6.1 Agregar `cashier` a la entrada `/purchasing` de `src/lib/nav.ts`.
      *(test automatizado en `nav.test.ts`)*
- [ ] 6.2 Alinear el gate de `/purchasing` y el de
      `src/app/(app)/purchasing/[id]/page.tsx` con los roles que el backend acepta
      después de 0.5. *(inspección + `npm run build`)*
- [ ] 6.3 Verificar que `cashier` **no** figura en los gates de `/purchasing/new`,
      `/purchasing/suppliers` ni `/purchasing/suppliers/[id]`. *(inspección)*
- [ ] 6.4 Verificar con un usuario `cashier` real que el hub carga, que `Crear
      pedido` y `Lista de proveedores` no se renderizan, que el detalle abre sin
      `403` y que una recepción se confirma. *(prueba manual + backend real)*
- [ ] 6.5 Verificar que un `403` de cualquier otra superficie conserva la sesión y
      muestra falta de permiso, y que un `401` sigue redirigiendo a login.
      *(prueba manual)*

## 7. Responsive y accesibilidad

- [ ] 7.1 Verificar el hub a 320 px: filas apiladas, `Recibir` a ancho completo con
      al menos 44 px de alto, "Esta semana" colapsada en tarjetas, sin scroll
      horizontal de página. *(prueba manual)*
- [ ] 7.2 Verificar la ficha de proveedor a 320 px: contacto en una columna, tabla
      de productos colapsada, teaser sin desborde. *(prueba manual)*
- [ ] 7.3 Verificar que los inputs de cantidad con sufijo no desbordan a 320 px y
      conservan ancho útil. *(prueba manual)*
- [ ] 7.4 Verificar el recorrido completo por teclado de la ficha y del hub: orden
      de tabulación, foco visible, activación con Enter, retorno de foco de cada
      diálogo. *(prueba manual)*
- [ ] 7.5 Verificar con lector de pantalla que `Atrasado`, `Preferido`,
      `Pendiente de alta` y la unidad de cada campo de cantidad se anuncian como
      texto y no dependen del color. *(prueba manual)*

## 8. Validaciones

- [ ] 8.1 `npm run lint` sin errores.
- [ ] 8.2 `npm test` en verde, incluidas las suites nuevas de `purchasing`,
      `receiving` y `nav`.
- [ ] 8.3 `npm run build` sin errores (el change toca tipos y `page.tsx`).
- [ ] 8.4 Revisión UX/UI del resultado contra el mockup re-bajado en 0.7, con la
      regla de traducción a tokens: ningún hex nuevo en el diff. *(inspección)*

## 9. Cierre — requiere decisión explícita del usuario

- [ ] 9.1 Sincronizar la spec `ui-suppliers-purchasing` con los deltas de este
      change. **No ejecutar sin pedido explícito del usuario.**
- [ ] 9.2 Archivar el change. **No ejecutar sin pedido explícito del usuario.**
