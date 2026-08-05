# Tasks

> Ninguna tarea de este change se ejecuta antes de completar la sección 0.
> El change está bloqueado por backend: ver `backend-request.md`.

## 0. Prerrequisitos bloqueantes

- [x] 0.1 Verificar contra una **instancia real** del backend que el bloque A está
      desplegado: `GET /api/v1/purchase-orders/{id}` devuelve `quantity` y
      `received_quantity` como string decimal. Evidencia: respuesta HTTP real
      200 (2026-08-04): `{"quantity":"10.000","received_quantity":"0.000"}`.
      **[be]**
- [x] 0.2 Confirmar por escrito la **escala decimal** que el backend acepta para
      `quantity` y `received_quantity`, y registrarla en `design.md` → D5.
      Sin este dato no se implementa la validación de cantidad. **[be]** — la
      instancia real aceptó y devolvió `"0.001"` al crear un pedido (2026-08-04).
- [x] 0.3 Verificar que `GET /api/v1/suppliers/{id}` responde `200` con los campos
      de contacto y `404` para un id inexistente. **[be]** — 200 con
      `phone`, `address`, `visit_frequency_days`, `visit_notes` y `notes`; 404
      para `00000000-0000-0000-0000-000000000000` (2026-08-04).
- [x] 0.4 Verificar que `GET /api/v1/purchase-orders` devuelve `expected_at` en el
      list item y respeta `expected_from` / `expected_to`, y confirmar el formato
      esperado de esos filtros y de `expected_at`. **[be]** — filtros como días
      `YYYY-MM-DD`; un pedido con `expected_at:"2026-08-05T12:00:00-03:00"`
      apareció con `expected_from=2026-08-05&expected_to=2026-08-06` (2026-08-04).
- [x] 0.5 Confirmar la decisión de producto del bloque D (ampliar
      `receivingWrapped` vs. endpoint acotado) y verificar con un usuario con rol
      `cashier` real que `GET /api/v1/purchase-orders/{id}` devuelve `200` y que
      una recepción se confirma. Si se eligió la alternativa acotada, actualizar
      antes `design.md`, el delta spec y estas tareas. **[be]** — el backend
      amplió `receivingWrapped` a `cashier`; el 2026-08-04 `cajero1` obtuvo 200
      y confirmó el pedido `5c97e3a7-c320-4e06-b4ce-8df4ac56cd03` con
      `received_quantity:"0.001"`, que respondió `RECEIVED`.
- [x] 0.6 Verificar que `redesign-frontend-purchasing-section` está implementado y
      sus specs sincronizadas, incluida la fusión de `ui-receiving` en
      `ui-suppliers-purchasing`. Si los nombres de las requirements cambiaron,
      rebasear el delta de este change antes de seguir. **[insp]** — el change
      está archivado y `openspec/specs/ui-receiving/` no existe; la spec vigente
      es `ui-suppliers-purchasing`.
- [x] 0.7 Re-bajar el markup vigente del proyecto Claude Design
      `1669eca0-5224-4459-8b68-524eb6c00266` con DesignSync `get_file`
      (`PurchasingHub.dc.html`, `SupplierDetail.dc.html`,
      `NewPurchaseOrder.dc.html`) y resolver los cuatro valores no-token listados
      en `design.md` → D9 contra los tokens de `src/app/globals.css`. Evidencia:
      lista de token elegido por cada valor. **[insp]** — el usuario confirmó que
      los tres mockups archivados son vigentes (2026-08-04). D9 fija:
      `#fca5a5 → error/40`; textos de estado → los tokens `*-strong`; badge
      Preferido → `warning/10`, `warning-strong`, `warning/40`; y
      `#e5e2ee → surface-2`.

## 1. Tipos

- [x] 1.1 Extender `Supplier` en `src/lib/types.ts` con `phone`, `address`,
      `visit_frequency_days`, `visit_notes` y `notes` nullables, con la forma
      exacta verificada en 0.3. *(inspección + `npm run build`)*
- [x] 1.2 Agregar `expected_at: string | null` a `PurchaseOrder` y a
      `PurchaseOrderListItem`. *(inspección + `npm run build`)*
- [x] 1.3 Cambiar `quantity` y `received_quantity` de `PurchaseOrderItem` de
      `number` a `string`, y corregir todos los puntos de uso que el compilador
      señale. Evidencia: `npm run build` sin errores. *(inspección)*

## 2. Helpers puros (`src/lib/`) con tests en `node`

- [x] 2.1 Extender `buildPurchaseOrdersQuery` en `src/lib/purchasing.ts` con
      `expected_from` / `expected_to` en el formato confirmado en 0.4.
      *(test automatizado en `purchasing.test.ts`)* **[auto]**
- [x] 2.2 Agregar una función pura que, dada la lista de pedidos pendientes y un
      `now` inyectable, clasifique cada pedido en `hoy`, `esta semana`,
      `atrasado` o `sin fecha objetivo`, usando `todayISO()` y
      `BUSINESS_TIME_ZONE` de `src/lib/salesSummary.ts` y comparando días
      calendario. *(test automatizado: borde de medianoche, pedido sin fecha,
      pedido vencido, límite de los 7 días)* **[auto]**
- [x] 2.3 Agregar un helper puro que devuelva la unidad de cantidad
      (`kg` / `un`) a partir del `unit_type` del producto, con caída a unidades
      para un ítem de texto libre. *(test automatizado)* **[auto]**
- [x] 2.4 Agregar validación pura de cantidad decimal contra la escala confirmada
      en 0.2, siguiendo el patrón de `isValidWeight` en `src/lib/weightPricing.ts`.
      *(test automatizado: cero, negativo, decimales de más, string vacío)* **[auto]**
- [x] 2.5 Reescribir la aritmética de `summarizePurchaseOrderDraft` para operar
      con enteros escalados sobre la cantidad decimal, sin `float`. Evidencia:
      test que compara subtotales con cantidades fraccionarias.
      *(test automatizado)* **[auto]** — `1.250 × 10.00 = 12.50`.
- [x] 2.6 Quitar `Number(input.quantity)` de `buildAddedItemPayload` en
      `src/lib/receiving.ts`: la cantidad se envía como string decimal.
      *(test automatizado en `receiving.test.ts` + inspección de que no queda
      ninguna conversión numérica de cantidad)* **[auto]**

## 3. Ficha de proveedor (bloque B)

- [x] 3.1 Crear la ruta `/purchasing/suppliers/[id]` con `page.tsx` delgado y
      `requireRole(["admin", "inventory"])`. *(inspección + `npm run build`)*
- [x] 3.2 Implementar la vista de la ficha con las tres cards del diseño
      (contacto, productos asociados, teaser de pedidos) componiendo el UI kit y
      sólo tokens del design system. *(prueba manual)*
- [x] 3.3 Implementar los estados de la ficha: skeleton por card, vacío por card,
      error por card con reintento, error de la carga principal sin datos
      parciales, y `404` con vuelta a la lista. *(prueba manual)*
- [x] 3.4 Aplicar el copy que distingue "Frecuencia de visita" (proveedor) de la
      columna "Reposición" (asociación producto–proveedor), y mostrar "Sin
      definir" en cada valor ausente. *(prueba manual + inspección)*
- [x] 3.5 Enlazar la fila de la lista de proveedores a la ficha, activable con
      pointer y con Enter, con foco visible. *(prueba manual)*
- [x] 3.6 Sumar los campos de contacto al alta y a la edición de proveedor,
      enviando sólo lo ingresado y relevendo el dato autoritativo tras el éxito.
      *(prueba manual + inspección del payload)*
- [x] 3.7 Implementar `Desactivar` desde la ficha, con diálogo, foco inicial en
      cancelar y retorno de foco al trigger. *(prueba manual)*
- [x] 3.8 Mover "Datos de planificación incompletos" desde `/purchasing/new`
      (`ReplenishmentSuggestionsPanel.tsx`) a la card "Productos asociados" de la
      ficha (ver `design.md` → D2): `Asociar producto` abre
      `AssociateProductPopover.tsx`, un popover anclado al botón (mismo patrón
      que `Editar precio real` en `CartLines.tsx`: `motion/react`, cierra con
      Escape, foco vuelve al trigger) con buscador siempre visible y listado
      global de productos sin proveedor preferido activo. No depende de backend
      bloqueado. *(`tsc --noEmit`, `eslint` y
      `vitest run src/lib/purchasing.test.ts` limpios; verificación visual en
      navegador pendiente — el entorno bloqueó levantar el dev server esta
      sesión)*
- [x] 3.9 Asociar directamente desde el popover (ver `design.md` → D2, intento
      3): cada fila tiene un botón `+` que, al tocarlo, lee
      `GET /products/{id}/suppliers` fresco, agrega este proveedor con
      `preferred: false` si todavía no estaba, y hace un único
      `PUT /products/{id}/suppliers`. Estados por fila, independientes entre
      sí: spinner inmediato mientras la request está en vuelo, ícono de check
      al confirmar (releyendo "Productos asociados" y mostrando un toast), y
      mensaje de error inline con el botón disponible para reintentar si
      falla. No edita ni quita asociaciones existentes — sólo agrega, y sigue
      sin depender de backend bloqueado. *(`tsc --noEmit`, `eslint` y
      `vitest run src/lib/purchasing.test.ts` limpios; verificación visual en
      navegador pendiente — el entorno bloqueó levantar el dev server esta
      sesión)*

## 4. Fecha objetivo y jerarquía del hub (bloque C)

- [x] 4.1 Agregar el campo `Fecha objetivo` al formulario de nuevo pedido, junto a
      `Fecha de creación`, con ayuda inline y el tratamiento visual del diseño
      resuelto en tokens. *(prueba manual)*
- [x] 4.2 Enviar `expected_at` en la creación cuando esté completo y omitirlo
      cuando esté vacío. *(inspección del payload + prueba manual)*
- [x] 4.3 Mostrar el aviso inline no bloqueante cuando la fecha objetivo es
      anterior a la fecha de creación, y mostrar inline el mensaje del backend si
      la rechaza, conservando el borrador. *(prueba manual)*
- [x] 4.4 Mostrar la fecha objetivo en el detalle y en el historial del pedido, y
      su ausencia como texto explícito. *(prueba manual)*
- [x] 4.5 Implementar el bloque "Qué llega hoy" con filas grandes, botón `Recibir`
      que navega al detalle, contador de pedidos y atrasados como texto, y badge
      `Atrasado` con texto además del tono de borde. *(prueba manual)*
- [x] 4.6 Implementar el bloque "Esta semana" como tabla densa sin CTA por fila,
      con la fila entera activable por pointer y por Enter. *(prueba manual)*
- [x] 4.7 Implementar el enlace "Ver todos los pedidos pendientes (N)" con el
      `total` de la consulta de pendientes sin filtro de fecha objetivo, para que
      los pedidos sin `expected_at` sigan siendo alcanzables. *(prueba manual)*
- [x] 4.8 Implementar los tres vacíos distintos del hub (sin pedidos para hoy, sin
      pedidos esta semana, sin pendientes en absoluto) y el error persistente con
      reintento y mensaje del backend. *(prueba manual)*

## 5. Cantidades con unidad (bloque A)

- [x] 5.1 Aplicar el sufijo de unidad dentro del input de cantidad en el
      formulario de nuevo pedido, con la unidad también en el nombre accesible del
      campo y fuera del valor enviado. *(prueba manual + inspección)*
- [x] 5.2 Aplicar lo mismo en la resolución de línea al recibir, sin alterar el
      orden de tabulación cantidad → motivo. *(prueba manual)*
- [x] 5.3 Aplicar lo mismo en el alta de ítem no pedido, tratando el modo de texto
      libre como unitario. *(prueba manual)*
- [x] 5.4 Verificar por inspección que ninguna cantidad se convierte a `float`, ni
      con `Number()`, ni con `parseFloat`, ni con aritmética directa sobre el
      string, en views ni en helpers. *(inspección)*
- [ ] 5.5 Marcar en `design.md` → D4 el resultado de la validación del sufijo de
      unidad con Claude Design, cuando ocurra. No bloquea el contrato de datos.
      *(inspección)*

## 6. Roles y navegación (bloque D)

- [x] 6.1 Agregar `cashier` a la entrada `/purchasing` de `src/lib/nav.ts`.
      *(test automatizado en `nav.test.ts`)*
- [x] 6.2 Alinear el gate de `/purchasing` y el de
      `src/app/(app)/purchasing/[id]/page.tsx` con los roles que el backend acepta
      después de 0.5. *(inspección + `npm run build`)*
- [x] 6.3 Verificar que `cashier` **no** figura en los gates de `/purchasing/new`,
      `/purchasing/suppliers` ni `/purchasing/suppliers/[id]`. *(inspección)*
- [x] 6.4 Verificar con un usuario `cashier` real que el hub carga, que `Crear
      pedido` y `Lista de proveedores` no se renderizan, que el detalle abre sin
      `403` y que una recepción se confirma. *(prueba manual + backend real)*
- [x] 6.5 Verificar que un `403` de cualquier otra superficie conserva la sesión y
      muestra falta de permiso, y que un `401` sigue redirigiendo a login.
      *(prueba manual)*

## 7. Responsive y accesibilidad

- [x] 7.1 Verificar el hub a 320 px: filas apiladas, `Recibir` a ancho completo con
      al menos 44 px de alto, "Esta semana" colapsada en tarjetas, sin scroll
      horizontal de página. *(prueba manual)*
- [x] 7.2 Verificar la ficha de proveedor a 320 px: contacto en una columna, tabla
      de productos colapsada, teaser sin desborde. *(prueba manual)*
- [x] 7.3 Verificar que los inputs de cantidad con sufijo no desbordan a 320 px y
      conservan ancho útil. *(prueba manual)*
- [x] 7.4 Verificar el recorrido completo por teclado de la ficha y del hub: orden
      de tabulación, foco visible, activación con Enter, retorno de foco de cada
      diálogo. *(prueba manual)*
- [x] 7.5 Verificar con lector de pantalla que `Atrasado`, `Preferido`,
      `Pendiente de alta` y la unidad de cada campo de cantidad se anuncian como
      texto y no dependen del color. *(prueba manual)*

## 8. Validaciones

- [x] 8.1 `npm run lint` sin errores.
- [x] 8.2 `npm test` en verde, incluidas las suites nuevas de `purchasing`,
      `receiving` y `nav`.
- [x] 8.3 `npm run build` sin errores (el change toca tipos y `page.tsx`).
- [x] 8.4 Revisión UX/UI del resultado contra el mockup re-bajado en 0.7, con la
      regla de traducción a tokens: ningún hex nuevo en el diff. *(inspección)*

## 9. Cierre — requiere decisión explícita del usuario

- [ ] 9.1 Sincronizar la spec `ui-suppliers-purchasing` con los deltas de este
      change. **No ejecutar sin pedido explícito del usuario.**
- [ ] 9.2 Archivar el change. **No ejecutar sin pedido explícito del usuario.**
